'use client';

import { useState, useEffect, useRef } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import Link from 'next/link';
import { useAcademicProfile, rememberProfile } from '@/lib/userProfile';
import {
  type Level,
  DOC_LABELS,
  ACADEMIC_DOCS,
  VISA_DOCS,
  CORE_DOCS,
  LEVEL_INFO,
  GUIDE_LAST_REVIEWED,
  plainLabel,
  legalisationAdvice,
  buildRoadmap,
} from '@/lib/pakistanVerification';

interface DocResult {
  document: string;
  status:
    | 'OK'
    | 'Update Needed'
    | 'Missing'
    | 'Attestation Required'
    | 'Apostille Required';
  message: string;
  action: string;
}

const ALL_KEYS = [
  'transcript', 'matric_marksheet', 'matric_certificate',
  'intermediate_marksheet', 'intermediate_certificate', 'degree', 'cv', 'sop',
  'lor1', 'lor2', 'lor3', 'ielts', 'portfolio', 'experience', 'passport',
  'visa_form', 'acceptance_letter', 'financial_proof', 'health_insurance',
  'accommodation_proof', 'police_clearance', 'medical_certificate',
  'birth_certificate', 'visa_fee',
];

const emptyFiles = () =>
  Object.fromEntries(ALL_KEYS.map((k) => [k, null])) as { [key: string]: File | null };

const statusConfig = {
  OK: { icon: '✅', cls: 'bg-emerald-50 border-emerald-200 text-emerald-800' },
  'Update Needed': { icon: '⚠️', cls: 'bg-amber-50 border-amber-200 text-amber-800' },
  Missing: { icon: '❌', cls: 'bg-red-50 border-red-200 text-red-800' },
  'Attestation Required': { icon: '🔏', cls: 'bg-blue-50 border-blue-200 text-blue-800' },
  'Apostille Required': { icon: '📜', cls: 'bg-violet-50 border-violet-200 text-violet-800' },
} as const;

const inputCls =
  'w-full bg-[#f7faf8] border border-[#d7e7de] rounded-2xl px-5 py-4 outline-none focus:border-[#0c8f6f] focus:ring-4 focus:ring-[#0c8f6f]/10 transition';

type Snapshot = {
  level: Level;
  country: string;
  uploaded: string[];
};

export default function DocumentChecker() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  const [level, setLevel] = useState<Level | ''>('');
  const [country, setCountry] = useState('');
  const [university, setUniversity] = useState('');
  const [degree, setDegree] = useState('');

  const [files, setFiles] = useState<{ [key: string]: File | null }>(emptyFiles);
  const [mergedPages, setMergedPages] = useState<{ [key: string]: boolean }>({});
  const [attestationProvided, setAttestationProvided] = useState<{ [key: string]: boolean }>({});

  const [results, setResults] = useState<DocResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [aiError, setAiError] = useState('');
  const [submitted, setSubmitted] = useState<Snapshot | null>(null);

  // Pre-fill level and country from the user's saved profile
  const { profile } = useAcademicProfile();
  const applied = useRef(false);
  useEffect(() => {
    if (!profile || applied.current) return;
    applied.current = true;
    if (profile.targetLevel === "Bachelor's") setLevel((l) => l || 'BS');
    else if (profile.targetLevel === "Master's") setLevel((l) => l || 'MS');
    const pc = profile.preferredCountry;
    if (pc && !/^any/i.test(pc)) setCountry((c) => c || pc);
  }, [profile]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setIsLoggedIn(!!user);
      setCheckingAuth(false);
    });
    return () => unsubscribe();
  }, []);

  const handleFile = (name: string, file: File | null) => {
    setFiles((prev) => ({ ...prev, [name]: file }));
    if (!file) {
      setMergedPages((prev) => ({ ...prev, [name]: false }));
      setAttestationProvided((prev) => ({ ...prev, [name]: false }));
    }
  };

  const handleMergedPageToggle = (name: string) =>
    setMergedPages((prev) => ({ ...prev, [name]: !prev[name] }));

  const handleAttestationToggle = (name: string) =>
    setAttestationProvided((prev) => ({ ...prev, [name]: !prev[name] }));

  const uploadedKeys = () =>
    Object.entries(files).filter(([, f]) => f !== null).map(([k]) => k);

  const checkDocuments = async () => {
    if (!level) {
      setError("Please choose whether you are applying for a Bachelor's (BS) or a Master's (MS) degree.");
      return;
    }
    if (!country.trim() || !university.trim() || !degree.trim()) {
      setError('Please fill in Country, University, and Degree.');
      return;
    }

    const uploadedDocs = uploadedKeys().map((name) => ({
      name,
      label: plainLabel(name),
      fileName: files[name]?.name || '',
      merged: mergedPages[name] || false,
      attested: attestationProvided[name] || false,
    }));

    if (uploadedDocs.length === 0) {
      setError('Please upload at least one document.');
      return;
    }

    const token = await auth.currentUser?.getIdToken();
    if (!token) {
      setError('Your session has expired. Please sign in again.');
      return;
    }

    const uploaded = uploadedDocs.map((d) => d.name);
    const missingCore = CORE_DOCS[level]
      .filter((k) => !uploaded.includes(k))
      .map((k) => plainLabel(k));

    setLoading(true);
    setError('');
    setAiError('');
    setResults([]);
    // The verification roadmap does not need the AI, so show it immediately
    setSubmitted({ level, country: country.trim(), uploaded });
    setTimeout(() => {
      document.getElementById('results')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);

    try {
      const res = await fetch('/api/document-checker', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          level,
          country: country.trim(),
          university: university.trim(),
          degree: degree.trim(),
          documents: uploadedDocs,
          missingCore,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (res.status === 401) {
        throw new Error('Your session has expired. Please sign in again.');
      }
      if (!res.ok) {
        throw new Error(data?.error || 'Failed to check documents');
      }

      setResults(data.results || []);

      // Remember level and country for next time
      rememberProfile({
        targetLevel: level === 'BS' ? "Bachelor's" : "Master's",
        preferredCountry: country.trim(),
      });
    } catch (e) {
      setAiError(
        e instanceof Error && e.message
          ? e.message
          : 'The AI review could not be completed. Your verification roadmap is shown below.'
      );
    } finally {
      setLoading(false);
    }
  };

  if (checkingAuth) return null;

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-[#f5f7f2] flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-[32px] border border-[#e5eee9] p-10 shadow-sm text-center">
          <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-r from-[#0c8f6f] to-[#28b487] flex items-center justify-center text-4xl shadow-lg mb-6">
            🔒
          </div>

          <h2 className="text-3xl font-bold text-[#063b36] mb-3">Sign In Required</h2>

          <p className="text-[#6b7280] text-sm leading-relaxed mb-8">
            Create a free account to access AI-powered document analysis and visa guidance.
          </p>

          <div className="flex gap-3">
            <Link
              href="/signup"
              className="flex-1 bg-gradient-to-r from-[#0c8f6f] to-[#28b487] text-white py-3 rounded-2xl font-semibold shadow-lg hover:scale-105 transition"
            >
              Create Account
            </Link>

            <Link
              href="/login"
              className="flex-1 border border-[#d7e7de] bg-white text-[#063b36] py-3 rounded-2xl font-semibold hover:border-[#0c8f6f] transition"
            >
              Sign In
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ── One upload card ───────────────────────────────────────────────────────
  const renderDocCard = (key: string) => (
    <div
      key={key}
      className={`rounded-3xl border-2 border-dashed p-5 transition-all ${
        files[key]
          ? 'border-[#28b487] bg-[#effaf6]'
          : 'border-[#d7e7de] bg-[#fbfcfb] hover:border-[#0c8f6f]'
      }`}
    >
      <label className="cursor-pointer block">
        <p className="text-sm font-semibold text-[#063b36] mb-2">{DOC_LABELS[key]}</p>
        <p className="text-xs text-[#6b7280] mb-4">PDF format only</p>

        {files[key] ? (
          <div className="bg-white rounded-2xl px-4 py-3 border border-[#d7e7de]">
            <p className="text-sm text-[#0c8f6f] font-semibold truncate">✅ {files[key]!.name}</p>
          </div>
        ) : (
          <div className="bg-[#dff1e8] text-[#0c8f6f] rounded-2xl py-3 text-center text-sm font-semibold">
            Upload PDF
          </div>
        )}

        <input
          type="file"
          accept=".pdf"
          className="hidden"
          onChange={(e) => handleFile(key, e.target.files?.[0] || null)}
        />
      </label>

      {files[key] && (
        <>
          <div className="space-y-3 mt-4">
            <label className="flex items-start gap-3 text-xs text-[#6b7280] cursor-pointer">
              <input
                type="checkbox"
                checked={mergedPages[key] || false}
                onChange={() => handleMergedPageToggle(key)}
                className="mt-0.5"
              />
              Includes front &amp; back pages
            </label>

            <label className="flex items-start gap-3 text-xs text-[#6b7280] cursor-pointer">
              <input
                type="checkbox"
                checked={attestationProvided[key] || false}
                onChange={() => handleAttestationToggle(key)}
                className="mt-0.5"
              />
              Includes attestation stamps
            </label>
          </div>

          <button
            type="button"
            onClick={() => handleFile(key, null)}
            className="text-xs text-red-500 mt-4 hover:text-red-700"
          >
            Remove File
          </button>
        </>
      )}
    </div>
  );

  const academicKeys = level ? ACADEMIC_DOCS[level] : [];
  const coreKeys = level ? CORE_DOCS[level] : [];
  const coreUploaded = coreKeys.filter((k) => files[k]).length;

  // ── Results data ──────────────────────────────────────────────────────────
  const roadmap = submitted ? buildRoadmap(submitted.level, submitted.uploaded) : null;
  const advice = submitted ? legalisationAdvice(submitted.country) : null;

  const adviceCls =
    advice?.mode === 'apostille'
      ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
      : advice?.mode === 'embassy'
      ? 'bg-amber-50 border-amber-200 text-amber-900'
      : 'bg-blue-50 border-blue-200 text-blue-900';
  const adviceIcon = advice?.mode === 'apostille' ? '📜' : advice?.mode === 'embassy' ? '🏛️' : '🔎';

  const counts = results.reduce(
    (acc, r) => {
      if (r.status === 'OK') acc.ok += 1;
      else if (r.status === 'Missing') acc.missing += 1;
      else acc.attention += 1;
      return acc;
    },
    { ok: 0, attention: 0, missing: 0 }
  );

  return (
    <div className="min-h-screen bg-[#f5f7f2] p-6">
      <div className="max-w-7xl mx-auto">

        {/* HEADER */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 bg-[#dff1e8] px-4 py-2 rounded-full text-[#0c8f6f] text-sm font-semibold mb-4">
            📑 DOCUMENT ANALYZER
          </div>

          <h1 className="text-5xl font-bold text-[#063b36]">UniQuest Document Checker</h1>

          <p className="text-[#6b7280] mt-4 text-lg max-w-3xl leading-relaxed">
            Upload admission and visa documents to get AI-powered verification, attestation
            checks, and a step-by-step guide to verifying each document in Pakistan.
          </p>
        </div>

        {/* APPLICATION DETAILS */}
        <div className="bg-white rounded-[32px] border border-[#e5eee9] shadow-sm p-8 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-[#dff1e8] flex items-center justify-center text-2xl">
              🎯
            </div>

            <div>
              <h2 className="text-2xl font-bold text-[#063b36]">Application Details</h2>
              <p className="text-[#6b7280] text-sm mt-1">Enter your target university information</p>
            </div>
          </div>

          <div className="mb-6">
            <label className="text-sm font-semibold text-[#063b36] block mb-2">
              I am applying for *
            </label>

            <div className="grid sm:grid-cols-2 gap-4">
              {(
                [
                  ['BS', "Bachelor's (BS)", '🎓', 'After Intermediate / A-Levels'],
                  ['MS', "Master's (MS)", '📚', "After a Bachelor's degree"],
                ] as const
              ).map(([val, title, icon, sub]) => (
                <button
                  type="button"
                  key={val}
                  onClick={() => {
                    setLevel(val);
                    setError('');
                  }}
                  className={`text-left rounded-2xl border-2 px-5 py-4 transition ${
                    level === val
                      ? 'border-[#0c8f6f] bg-[#effaf6]'
                      : 'border-[#d7e7de] bg-[#f7faf8] hover:border-[#0c8f6f]'
                  }`}
                >
                  <span className="text-2xl mr-2">{icon}</span>
                  <span className="font-bold text-[#063b36]">{title}</span>
                  <span className="block text-xs text-[#6b7280] mt-1">{sub}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-5">
            <div>
              <label className="text-sm font-semibold text-[#063b36] block mb-2">
                Target Country *
              </label>
              <input
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                placeholder="Germany"
                className={inputCls}
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-[#063b36] block mb-2">
                University *
              </label>
              <input
                value={university}
                onChange={(e) => setUniversity(e.target.value)}
                placeholder="TU Munich"
                className={inputCls}
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-[#063b36] block mb-2">Degree *</label>
              <input
                value={degree}
                onChange={(e) => setDegree(e.target.value)}
                placeholder="BS Computer Science"
                className={inputCls}
              />
            </div>
          </div>
        </div>

        {/* ADMISSION DOCS */}
        <div className="bg-white rounded-[32px] border border-[#e5eee9] shadow-sm p-8 mb-6">
          <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-[#dff1e8] flex items-center justify-center text-2xl">
                🎓
              </div>

              <div>
                <h2 className="text-2xl font-bold text-[#063b36]">Admission Documents</h2>
                <p className="text-[#6b7280] text-sm mt-1">
                  Upload all academic documents in PDF format
                </p>
              </div>
            </div>

            {level && (
              <span className="text-xs font-bold text-[#0c8f6f] bg-[#dff1e8] px-4 py-2 rounded-full">
                {coreUploaded} of {coreKeys.length} core documents added
              </span>
            )}
          </div>

          {level ? (
            <div className="grid md:grid-cols-3 gap-5">{academicKeys.map(renderDocCard)}</div>
          ) : (
            <div className="rounded-2xl bg-[#f7faf8] border border-dashed border-[#d7e7de] px-6 py-10 text-center text-sm text-[#6b7280]">
              Choose <b className="text-[#063b36]">Bachelor&apos;s (BS)</b> or{' '}
              <b className="text-[#063b36]">Master&apos;s (MS)</b> above to see the documents you
              need.
            </div>
          )}
        </div>

        {/* VISA DOCS */}
        {level && (
          <div className="bg-white rounded-[32px] border border-[#e5eee9] shadow-sm p-8 mb-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-[#dff1e8] flex items-center justify-center text-2xl">
                🛂
              </div>

              <div>
                <h2 className="text-2xl font-bold text-[#063b36]">Visa Documents (optional)</h2>
                <p className="text-[#6b7280] text-sm mt-1">
                  Add these too if you are already preparing your visa application
                </p>
              </div>
            </div>

            <div className="grid md:grid-cols-3 gap-5">{VISA_DOCS.map(renderDocCard)}</div>
          </div>
        )}

        {/* SUBMIT */}
        <div className="bg-white rounded-[32px] border border-[#e5eee9] shadow-sm p-8 mb-8">
          {error && (
            <div
              role="alert"
              className="mb-5 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-sm font-semibold px-5 py-3"
            >
              {error}
            </div>
          )}

          <button
            type="button"
            onClick={checkDocuments}
            disabled={loading}
            className="w-full bg-gradient-to-r from-[#0c8f6f] to-[#28b487] text-white py-4 rounded-2xl text-lg font-bold shadow-lg hover:scale-[1.01] transition disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            {loading ? 'Checking your documents…' : '🔍 Check My Documents'}
          </button>

          <p className="text-xs text-[#6b7280] text-center mt-4 leading-relaxed">
            Your PDF files stay on your device. We only use the document names and the options
            you tick (merged pages, attestation stamps) to prepare your checklist.
          </p>
        </div>

        {/* RESULTS */}
        {submitted && roadmap && advice && (
          <div id="results" className="space-y-6 scroll-mt-6">

            {/* Level headline */}
            <div className="rounded-[32px] bg-gradient-to-r from-[#0c8f6f] to-[#28b487] text-white p-8 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-widest opacity-80 mb-2">
                Your verification plan · {LEVEL_INFO[submitted.level].title}
              </p>
              <p className="text-lg font-semibold leading-relaxed">
                {LEVEL_INFO[submitted.level].headline}
              </p>
            </div>

            {/* Apostille vs embassy */}
            <div className={`rounded-[28px] border p-6 ${adviceCls}`}>
              <p className="font-bold text-lg mb-2">
                {adviceIcon} {advice.title}
              </p>
              <p className="text-sm leading-relaxed">{advice.detail}</p>
            </div>

            {/* Missing core documents */}
            {roadmap.coreMissing.length > 0 && (
              <div className="rounded-[28px] border border-red-200 bg-red-50 p-6">
                <p className="font-bold text-red-800 mb-2">
                  ❌ Core documents not added yet ({roadmap.coreMissing.length})
                </p>
                <p className="text-sm text-red-800 mb-3">
                  Most {LEVEL_INFO[submitted.level].title} programs expect these. Check your
                  university&apos;s list, then add them:
                </p>
                <div className="flex flex-wrap gap-2">
                  {roadmap.coreMissing.map((k) => (
                    <span
                      key={k}
                      className="bg-white border border-red-200 text-red-800 text-xs font-semibold px-3 py-1.5 rounded-full"
                    >
                      {DOC_LABELS[k]}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Roadmap */}
            <div className="bg-white rounded-[32px] border border-[#e5eee9] shadow-sm p-8">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 rounded-2xl bg-[#dff1e8] flex items-center justify-center text-2xl">
                  🗺️
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-[#063b36]">
                    Where &amp; how to verify your documents
                  </h2>
                  <p className="text-[#6b7280] text-sm mt-1">
                    Follow the steps in order: each authority checks the one before it.
                  </p>
                </div>
              </div>

              <div className="space-y-6 mt-6">
                {roadmap.groups.map(({ chain, docs }) => (
                  <div key={chain.id} className="rounded-3xl border border-[#e5eee9] bg-[#fbfcfb] p-6">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-2xl">{chain.icon}</span>
                      <h3 className="text-lg font-bold text-[#063b36]">{chain.title}</h3>
                    </div>

                    <div className="flex flex-wrap gap-2 mb-5">
                      {docs.map((d) => (
                        <span
                          key={d.key}
                          className={`text-xs font-semibold px-3 py-1.5 rounded-full border ${
                            d.uploaded
                              ? 'bg-[#effaf6] border-[#28b487] text-[#0c8f6f]'
                              : 'bg-white border-[#d7e7de] text-[#6b7280]'
                          }`}
                        >
                          {d.uploaded ? '✅' : '⬜'} {plainLabel(d.key)}
                        </span>
                      ))}
                    </div>

                    <ol className="space-y-4">
                      {chain.steps.map((step, i) => (
                        <li key={i} className="flex gap-4">
                          <div className="w-8 h-8 shrink-0 rounded-full bg-[#0c8f6f] text-white text-sm font-bold flex items-center justify-center">
                            {i + 1}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-[#063b36] text-sm">
                              {step.authority}
                              {step.optional && (
                                <span className="ml-2 text-[10px] font-bold uppercase tracking-wide bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                                  only if required
                                </span>
                              )}
                            </p>
                            <p className="text-sm text-[#4b5563] leading-relaxed mt-1">
                              {step.action}
                            </p>
                            {step.links && (
                              <div className="flex flex-wrap gap-2 mt-2">
                                {step.links.map((l) => (
                                  <a
                                    key={l.url}
                                    href={l.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs font-semibold text-[#0c8f6f] border border-[#d7e7de] bg-white px-3 py-1.5 rounded-full hover:border-[#0c8f6f] transition"
                                  >
                                    {l.label} ↗
                                  </a>
                                ))}
                              </div>
                            )}
                          </div>
                        </li>
                      ))}
                    </ol>

                    <div className="mt-5 rounded-2xl bg-white border border-[#e5eee9] p-4">
                      <p className="text-xs font-bold text-[#063b36] mb-2">💡 Good to know</p>
                      <ul className="space-y-1.5">
                        {chain.tips.map((t) => (
                          <li key={t} className="text-xs text-[#4b5563] leading-relaxed">
                            • {t}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}

                {roadmap.prepare.length > 0 && (
                  <div className="rounded-3xl border border-[#e5eee9] bg-[#fbfcfb] p-6">
                    <h3 className="text-lg font-bold text-[#063b36] mb-1">
                      📎 Documents with no government attestation
                    </h3>
                    <p className="text-xs text-[#6b7280] mb-4">
                      These need correct preparation, not a stamp from IBCC, HEC or MOFA.
                    </p>
                    <ul className="space-y-3">
                      {roadmap.prepare.map(({ key, tip }) => (
                        <li key={key} className="text-sm">
                          <span className="font-semibold text-[#063b36]">{DOC_LABELS[key]}</span>
                          <span className="text-[#4b5563]"> — {tip}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <div className="mt-6 rounded-2xl bg-amber-50 border border-amber-200 p-4 text-xs text-amber-900 leading-relaxed">
                <p className="font-bold mb-1">⚠️ Use official channels only</p>
                Apply directly through the IBCC, HEC and MOFA portals, or a legitimate service.
                Fake apostille stickers and stamps have been seized in Pakistan, and a forged
                document can get your application rejected or your visa refused. Rules, fees and
                portals change: this guide was last reviewed in {GUIDE_LAST_REVIEWED}, so always
                confirm on the official websites and with your university and embassy.
              </div>
            </div>

            {/* AI review */}
            <div className="bg-white rounded-[32px] border border-[#e5eee9] shadow-sm p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-[#dff1e8] flex items-center justify-center text-2xl">
                  🤖
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-[#063b36]">AI document review</h2>
                  <p className="text-[#6b7280] text-sm mt-1">
                    For {university || 'your university'}, {submitted.country}
                  </p>
                </div>
              </div>

              {loading && (
                <div className="rounded-2xl bg-[#f7faf8] border border-[#e5eee9] py-10 text-center text-sm font-semibold text-[#6b7280]">
                  Reviewing your documents… this can take up to a minute.
                </div>
              )}

              {!loading && aiError && (
                <div className="rounded-2xl bg-red-50 border border-red-200 text-red-800 text-sm font-semibold px-5 py-4">
                  {aiError}
                  <button
                    type="button"
                    onClick={checkDocuments}
                    className="ml-3 underline font-bold"
                  >
                    Try again
                  </button>
                </div>
              )}

              {!loading && !aiError && results.length > 0 && (
                <>
                  <div className="flex flex-wrap gap-3 mb-6">
                    <span className="text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 px-4 py-2 rounded-full">
                      ✅ {counts.ok} OK
                    </span>
                    <span className="text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200 px-4 py-2 rounded-full">
                      ⚠️ {counts.attention} need attention
                    </span>
                    <span className="text-xs font-bold bg-red-50 text-red-800 border border-red-200 px-4 py-2 rounded-full">
                      ❌ {counts.missing} missing
                    </span>
                  </div>

                  <div className="space-y-4">
                    {results.map((r, i) => {
                      const cfg = statusConfig[r.status] ?? statusConfig['Update Needed'];
                      return (
                        <div key={`${r.document}-${i}`} className={`rounded-2xl border p-5 ${cfg.cls}`}>
                          <p className="font-bold">
                            {cfg.icon} {r.document}
                            <span className="ml-2 text-xs font-semibold opacity-80">
                              · {r.status}
                            </span>
                          </p>
                          <p className="text-sm mt-2 leading-relaxed">{r.message}</p>
                          {r.action && (
                            <p className="text-sm mt-3 leading-relaxed">
                              <b>What to do:</b> {r.action}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}