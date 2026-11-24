'use client';

import { useState, useEffect, useRef } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import Link from 'next/link';
import { useAcademicProfile, rememberProfile } from '@/lib/userProfile';
import { readPdf } from '@/lib/pdfReader';
import {
  type Extraction,
  type Finding,
  type CheckStatus,
  evaluateAll,
  describeForReview,
} from '@/lib/documentAnalysis';
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

type DocState = {
  stage: 'queued' | 'reading' | 'analysing' | 'done' | 'failed';
  pages?: number;
  error?: string;
  service?: boolean; // true when OUR reader failed, not the user's file
  extraction?: Extraction;
};

class ServiceError extends Error {}

const checkIcon: Record<CheckStatus, string> = { pass: '✅', warn: '⚠️', fail: '❌', info: 'ℹ️' };
const stateStyle = {
  good: { box: 'border-emerald-200 bg-emerald-50/60', badge: 'bg-emerald-100 text-emerald-800', text: '✅ Looks good' },
  attention: { box: 'border-amber-200 bg-amber-50/60', badge: 'bg-amber-100 text-amber-800', text: '⚠️ Needs attention' },
  problem: { box: 'border-red-200 bg-red-50/60', badge: 'bg-red-100 text-red-800', text: '❌ Problem found' },
  unchecked: { box: 'border-slate-200 bg-slate-50', badge: 'bg-slate-200 text-slate-700', text: '⏸️ Could not be checked' },
} as const;
const stageText: Record<DocState['stage'], string> = {
  queued: 'Waiting…',
  reading: 'Opening the PDF…',
  analysing: 'Reading stamps and details…',
  done: 'Done',
  failed: 'Failed',
};

export default function DocumentChecker() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  const [level, setLevel] = useState<Level | ''>('');
  const [country, setCountry] = useState('');
  const [university, setUniversity] = useState('');
  const [degree, setDegree] = useState('');

  const [files, setFiles] = useState<{ [key: string]: File | null }>(emptyFiles);
  const [docStates, setDocStates] = useState<Record<string, DocState>>({});

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
    if (file && !(file.type === 'application/pdf' || /\.pdf$/i.test(file.name))) {
      setError('Please upload PDF files only.');
      return;
    }
    setError('');
    setFiles((prev) => ({ ...prev, [name]: file }));
  };

  const uploadedKeys = () =>
    Object.entries(files).filter(([, f]) => f !== null).map(([k]) => k);

  // Sends one document's pages to the AI reader (retries once if the service is busy)
  const analyseDocument = async (
    token: string,
    key: string,
    read: { text: string; images: string[] }
  ): Promise<Extraction> => {
    for (let attempt = 0; attempt < 2; attempt++) {
      const res = await fetch('/api/document-checker/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ label: plainLabel(key), text: read.text, images: read.images }),
      });
      const data = await res.json().catch(() => ({}));

      if (res.status === 401) throw new Error('Your session has expired. Please sign in again.');
      if (res.status === 429 && attempt === 0) {
        await new Promise((r) => setTimeout(r, 4000));
        continue;
      }
      // 422 means the file itself had nothing readable; everything else is our service
      if (res.status === 422) throw new Error(data?.error || 'The document had no readable content.');
      if (!res.ok) throw new ServiceError(data?.error || 'Could not analyse this document.');
      return data.extraction as Extraction;
    }
    throw new ServiceError('The AI service is busy. Please try again in a minute.');
  };

  const checkDocuments = async () => {
    if (!level) {
      setError("Please choose whether you are applying for a Bachelor's (BS) or a Master's (MS) degree.");
      return;
    }
    if (!country.trim() || !university.trim() || !degree.trim()) {
      setError('Please fill in Country, University, and Degree.');
      return;
    }

    const uploaded = uploadedKeys();
    if (uploaded.length === 0) {
      setError('Please upload at least one document.');
      return;
    }

    const token = await auth.currentUser?.getIdToken();
    if (!token) {
      setError('Your session has expired. Please sign in again.');
      return;
    }

    const missingCore = CORE_DOCS[level]
      .filter((k) => !uploaded.includes(k))
      .map((k) => plainLabel(k));

    setLoading(true);
    setError('');
    setAiError('');
    setResults([]);
    setDocStates(Object.fromEntries(uploaded.map((k) => [k, { stage: 'queued' as const }])));
    // The verification roadmap does not need the AI, so show it immediately
    setSubmitted({ level, country: country.trim(), uploaded });
    setTimeout(() => {
      document.getElementById('results')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);

    // 1) Read every document, one at a time
    const extractions: Record<string, Extraction | undefined> = {};
    const failures: Record<string, string | undefined> = {};
    const serviceFailed: Record<string, boolean | undefined> = {};
    let serviceStreak = 0;
    let serviceMessage = '';

    for (const key of uploaded) {
      if (serviceStreak >= 2) {
        // Our reader is down: do not hammer it with every remaining document
        failures[key] = serviceMessage;
        serviceFailed[key] = true;
        setDocStates((s) => ({ ...s, [key]: { stage: 'failed', error: serviceMessage, service: true } }));
        continue;
      }
      try {
        setDocStates((s) => ({ ...s, [key]: { stage: 'reading' } }));
        const read = await readPdf(files[key] as File);
        setDocStates((s) => ({ ...s, [key]: { stage: 'analysing', pages: read.pages } }));
        const extraction = await analyseDocument(token, key, read);
        extractions[key] = extraction;
        serviceStreak = 0;
        setDocStates((s) => ({ ...s, [key]: { stage: 'done', pages: read.pages, extraction } }));
      } catch (e) {
        const msg = e instanceof Error && e.message ? e.message : 'Could not read this document.';
        const isService = e instanceof ServiceError;
        failures[key] = msg;
        if (isService) {
          serviceFailed[key] = true;
          serviceStreak += 1;
          serviceMessage = msg;
        } else {
          serviceStreak = 0;
        }
        setDocStates((s) => ({ ...s, [key]: { stage: 'failed', error: msg, service: isService } }));
        if (/session has expired/i.test(msg)) {
          setAiError(msg);
          setLoading(false);
          return;
        }
      }
    }

    // If our reader was down, stop here: a country review with no findings would mislead
    if (serviceStreak >= 2) {
      setAiError(
        `The document reader is unavailable right now, so your documents could not be checked. ${serviceMessage} Your verification roadmap is still shown below. Please try again in a few minutes.`
      );
      setLoading(false);
      return;
    }

    // 2) University / country specific review, based on what was really found
    try {
      const findings = evaluateAll({
        level,
        legal: legalisationAdvice(country),
        uploaded,
        extractions,
        failures,
        serviceFailed,
        profileName: profile?.fullName,
      });

      const res = await fetch('/api/document-checker', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          level,
          country: country.trim(),
          university: university.trim(),
          degree: degree.trim(),
          documents: findings.map((f) => ({
            name: f.key,
            label: f.label,
            evidence: describeForReview(f),
          })),
          missingCore,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (res.status === 401) throw new Error('Your session has expired. Please sign in again.');
      if (!res.ok) throw new Error(data?.error || 'Failed to complete the university review');

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
          : 'The university-specific review could not be completed. Your document report and verification roadmap are shown above and below.'
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
        <button
          type="button"
          onClick={() => handleFile(key, null)}
          className="text-xs text-red-500 mt-4 hover:text-red-700"
        >
          Remove File
        </button>
      )}
    </div>
  );

  const academicKeys = level ? ACADEMIC_DOCS[level] : [];
  const coreKeys = level ? CORE_DOCS[level] : [];
  const coreUploaded = coreKeys.filter((k) => files[k]).length;

  // ── Results data ──────────────────────────────────────────────────────────
  const roadmap = submitted ? buildRoadmap(submitted.level, submitted.uploaded) : null;
  const advice = submitted ? legalisationAdvice(submitted.country) : null;

  const extractionsNow: Record<string, Extraction | undefined> = {};
  const failuresNow: Record<string, string | undefined> = {};
  const serviceNow: Record<string, boolean | undefined> = {};
  if (submitted) {
    for (const k of submitted.uploaded) {
      const s = docStates[k];
      if (s?.extraction) extractionsNow[k] = s.extraction;
      if (s?.stage === 'failed') {
        failuresNow[k] = s.error;
        serviceNow[k] = s.service;
      }
    }
  }
  const finishedKeys = submitted
    ? submitted.uploaded.filter((k) => docStates[k]?.stage === 'done' || docStates[k]?.stage === 'failed')
    : [];
  const findings: Finding[] =
    submitted && advice
      ? evaluateAll({
          level: submitted.level,
          legal: advice,
          uploaded: finishedKeys,
          extractions: extractionsNow,
          failures: failuresNow,
          serviceFailed: serviceNow,
          profileName: profile?.fullName,
        })
      : [];
  const findingCounts = findings.reduce(
    (acc, f) => {
      acc[f.state] += 1;
      return acc;
    },
    { good: 0, attention: 0, problem: 0, unchecked: 0 }
  );

  const renderFinding = (f: Finding) => {
    const st = stateStyle[f.state];
    const ex = f.extraction;
    const pages = docStates[f.key]?.pages;
    const facts: [string, string | null | undefined][] = ex
      ? [
          ['Name', ex.holderName],
          ['Issued by', ex.issuer],
          ['Program', ex.program],
          ['Date', ex.year],
          ['Result', ex.result],
          ['Pages read', pages ? String(pages) : null],
        ]
      : [];

    return (
      <div key={f.key} className={`rounded-3xl border p-6 ${st.box}`}>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <h3 className="text-lg font-bold text-[#063b36]">{DOC_LABELS[f.key] ?? f.label}</h3>
          <span className={`text-xs font-bold px-3 py-1.5 rounded-full ${st.badge}`}>{st.text}</span>
        </div>

        {facts.some(([, v]) => v) && (
          <div className="flex flex-wrap gap-2 mt-3">
            {facts
              .filter(([, v]) => v)
              .map(([k, v]) => (
                <span
                  key={k}
                  className="text-xs bg-white border border-[#e5eee9] text-[#4b5563] px-3 py-1.5 rounded-full"
                >
                  <b className="text-[#063b36]">{k}:</b> {v}
                </span>
              ))}
          </div>
        )}

        <ul className="mt-4 space-y-2">
          {f.checks.map((c, i) => (
            <li key={`${c.label}-${i}`} className="flex gap-3 text-sm">
              <span className="shrink-0">{checkIcon[c.status]}</span>
              <span className="text-[#4b5563] leading-relaxed">
                <b className="text-[#063b36]">{c.label}:</b> {c.detail}
              </span>
            </li>
          ))}
        </ul>

        {f.next.length > 0 && (
          <div className="mt-4 rounded-2xl bg-white border border-[#e5eee9] p-4">
            <p className="text-xs font-bold text-[#063b36] mb-2">👉 What to do next</p>
            <ol className="space-y-1.5 list-decimal list-inside">
              {f.next.map((n) => (
                <li key={n} className="text-xs text-[#4b5563] leading-relaxed">
                  {n}
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>
    );
  };

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
            We read each PDF to check names, stamps and attestations. Pages are sent securely to
            our AI reader only for this check and are not saved by UniQuest. Tip: put your
            IBCC / HEC / MOFA e-certificate pages in the same PDF as the document, so we can see them.
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

            {/* What we found in the uploaded files */}
            <div className="bg-white rounded-[32px] border border-[#e5eee9] shadow-sm p-8">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 rounded-2xl bg-[#dff1e8] flex items-center justify-center text-2xl">
                  🔬
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-[#063b36]">Your uploaded documents, checked</h2>
                  <p className="text-[#6b7280] text-sm mt-1">
                    We read each PDF and looked for the Board, IBCC, HEC and MOFA marks.
                  </p>
                </div>
              </div>

              {findings.length > 0 && (
                <div className="flex flex-wrap gap-3 my-5">
                  <span className="text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 px-4 py-2 rounded-full">
                    ✅ {findingCounts.good} look good
                  </span>
                  <span className="text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200 px-4 py-2 rounded-full">
                    ⚠️ {findingCounts.attention} need attention
                  </span>
                  <span className="text-xs font-bold bg-red-50 text-red-800 border border-red-200 px-4 py-2 rounded-full">
                    ❌ {findingCounts.problem} with problems
                  </span>
                  {findingCounts.unchecked > 0 && (
                    <span className="text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200 px-4 py-2 rounded-full">
                      ⏸️ {findingCounts.unchecked} not checked
                    </span>
                  )}
                </div>
              )}

              {aiError && findingCounts.unchecked > 0 && (
                <div className="mb-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-sm px-5 py-4 leading-relaxed">
                  {aiError}
                </div>
              )}

              <div className="space-y-4 mt-4">
                {submitted.uploaded.map((key) => {
                  const state = docStates[key];
                  const finding = findings.find((f) => f.key === key);
                  if (finding) return renderFinding(finding);
                  return (
                    <div
                      key={key}
                      className="rounded-3xl border border-[#e5eee9] bg-[#fbfcfb] p-6 flex items-center justify-between gap-3"
                    >
                      <span className="font-bold text-[#063b36]">{DOC_LABELS[key]}</span>
                      <span className="text-xs font-semibold text-[#6b7280] animate-pulse">
                        ⏳ {stageText[state?.stage ?? 'queued']}
                      </span>
                    </div>
                  );
                })}
              </div>

              <p className="mt-5 text-xs text-[#6b7280] leading-relaxed">
                An AI reads your scans, so a faint or partly hidden stamp can be missed. If we say a
                mark is missing but you do have it, upload a clearer, full-page scan with the
                attestation pages in the same PDF. Only IBCC, HEC and MOFA can officially confirm
                that a document is genuine.
              </p>
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
                  <h2 className="text-2xl font-bold text-[#063b36]">University &amp; country review</h2>
                  <p className="text-[#6b7280] text-sm mt-1">
                    For {university || 'your university'}, {submitted.country}
                  </p>
                </div>
              </div>

              {loading && (
                <div className="rounded-2xl bg-[#f7faf8] border border-[#e5eee9] py-10 text-center text-sm font-semibold text-[#6b7280]">
                  {findings.length < submitted.uploaded.length
                    ? 'Reading your documents first…'
                    : 'Preparing the university and country review…'}
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