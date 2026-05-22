'use client';

import { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import Link from 'next/link';

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

export default function DocumentChecker() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  const [country, setCountry] = useState('');
  const [university, setUniversity] = useState('');
  const [degree, setDegree] = useState('');

  const [files, setFiles] = useState<{ [key: string]: File | null }>({
    transcript: null,
    matric_marksheet: null,
    matric_certificate: null,
    intermediate_marksheet: null,
    intermediate_certificate: null,
    degree: null,
    cv: null,
    sop: null,
    lor1: null,
    lor2: null,
    lor3: null,
    ielts: null,
    portfolio: null,
    experience: null,
    passport: null,
    visa_form: null,
    acceptance_letter: null,
    financial_proof: null,
    health_insurance: null,
    accommodation_proof: null,
    police_clearance: null,
    medical_certificate: null,
    birth_certificate: null,
    visa_fee: null,
  });

  const [mergedPages, setMergedPages] = useState<{
    [key: string]: boolean;
  }>({});

  const [attestationProvided, setAttestationProvided] = useState<{
    [key: string]: boolean;
  }>({});

  const [results, setResults] = useState<DocResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setIsLoggedIn(!!user);
      setCheckingAuth(false);
    });

    return () => unsubscribe();
  }, []);

  const handleFile = (name: string, file: File | null) => {
    setFiles((prev) => ({
      ...prev,
      [name]: file,
    }));

    if (!file) {
      setMergedPages((prev) => ({
        ...prev,
        [name]: false,
      }));

      setAttestationProvided((prev) => ({
        ...prev,
        [name]: false,
      }));
    }
  };

  const handleMergedPageToggle = (name: string) => {
    setMergedPages((prev) => ({
      ...prev,
      [name]: !prev[name],
    }));
  };

  const handleAttestationToggle = (name: string) => {
    setAttestationProvided((prev) => ({
      ...prev,
      [name]: !prev[name],
    }));
  };

  const checkDocuments = async () => {
    if (!country || !university || !degree) {
      setError(
        'Please fill in Country, University, and Degree.'
      );
      return;
    }

    const uploadedDocs = Object.entries(files)
      .filter(([, f]) => f !== null)
      .map(([name, file]) => ({
        name,
        fileName: file?.name || '',
        merged: mergedPages[name] || false,
        attested: attestationProvided[name] || false,
      }));

    if (uploadedDocs.length === 0) {
      setError('Please upload at least one document.');
      return;
    }

    setLoading(true);
    setError('');
    setResults([]);

    try {
      const res = await fetch('/api/document-checker', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          country,
          university,
          degree,
          documents: uploadedDocs,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to check documents');
      }

      const data = await res.json();

      setResults(data.results || []);
    } catch {
      setError(
        'Something went wrong. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const statusConfig = {
    OK: {
      icon: '✅',
      cls: 'bg-emerald-50 border-emerald-200 text-emerald-800',
    },
    'Update Needed': {
      icon: '⚠️',
      cls: 'bg-amber-50 border-amber-200 text-amber-800',
    },
    Missing: {
      icon: '❌',
      cls: 'bg-red-50 border-red-200 text-red-800',
    },
    'Attestation Required': {
      icon: '🔏',
      cls: 'bg-blue-50 border-blue-200 text-blue-800',
    },
    'Apostille Required': {
      icon: '📜',
      cls: 'bg-violet-50 border-violet-200 text-violet-800',
    },
  };

  const docLabels: { [key: string]: string } = {
    transcript: '📄 Academic Transcripts',
    matric_marksheet: '📘 Matriculation Marksheet',
    matric_certificate: '📗 Matriculation Certificate',
    intermediate_marksheet:
      '📘 Intermediate / HSC Marksheet',
    intermediate_certificate:
      '📗 Intermediate / HSC Certificate',
    degree: '🎓 Degree Certificate',
    cv: '📋 CV / Resume',
    sop: '✍️ Statement of Purpose',
    lor1: '📧 Letter of Recommendation 1',
    lor2: '📧 Letter of Recommendation 2',
    lor3: '📧 Letter of Recommendation 3',
    ielts: '📝 IELTS / TOEFL Scores',
    portfolio: '📄 Resume',
    experience:
      '💼 Work Experience Certificate',
    passport: '🛂 Passport',
    visa_form: '📋 Visa Application Form',
    acceptance_letter:
      '📨 University Acceptance Letter',
    financial_proof: '💰 Financial Proof',
    health_insurance: '🏥 Health Insurance',
    accommodation_proof: '🏠 Accommodation Proof',
    police_clearance:
      '🚔 Police Clearance Certificate',
    medical_certificate:
      '⚕️ Medical Certificate',
    birth_certificate: '👶 Birth Certificate',
    visa_fee: '💳 Visa Fee Payment Receipt',
  };

  if (checkingAuth) return null;

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-[#f5f7f2] flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white rounded-[32px] border border-[#e5eee9] p-10 shadow-sm text-center">
          <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-r from-[#0c8f6f] to-[#28b487] flex items-center justify-center text-4xl shadow-lg mb-6">
            🔒
          </div>

          <h2 className="text-3xl font-bold text-[#063b36] mb-3">
            Sign In Required
          </h2>

          <p className="text-[#6b7280] text-sm leading-relaxed mb-8">
            Create a free account to access AI-powered
            document analysis and visa guidance.
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

  return (
    <div className="min-h-screen bg-[#f5f7f2] p-6">
      <div className="max-w-7xl mx-auto">

        {/* HEADER */}
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 bg-[#dff1e8] px-4 py-2 rounded-full text-[#0c8f6f] text-sm font-semibold mb-4">
            📑 DOCUMENT ANALYZER
          </div>

          <h1 className="text-5xl font-bold text-[#063b36]">
            UniQuest Document Checker
          </h1>

          <p className="text-[#6b7280] mt-4 text-lg max-w-3xl leading-relaxed">
            Upload admission and visa documents to get
            AI-powered verification, attestation checks,
            and application guidance.
          </p>
        </div>

        {/* APPLICATION DETAILS */}
        <div className="bg-white rounded-[32px] border border-[#e5eee9] shadow-sm p-8 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-[#dff1e8] flex items-center justify-center text-2xl">
              🎯
            </div>

            <div>
              <h2 className="text-2xl font-bold text-[#063b36]">
                Application Details
              </h2>

              <p className="text-[#6b7280] text-sm mt-1">
                Enter your target university information
              </p>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-5">
            <div>
              <label className="text-sm font-semibold text-[#063b36] block mb-2">
                Target Country *
              </label>

              <input
                value={country}
                onChange={(e) =>
                  setCountry(e.target.value)
                }
                placeholder="Germany"
                className="w-full bg-[#f7faf8] border border-[#d7e7de] rounded-2xl px-5 py-4 outline-none focus:border-[#0c8f6f] focus:ring-4 focus:ring-[#0c8f6f]/10 transition"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-[#063b36] block mb-2">
                University *
              </label>

              <input
                value={university}
                onChange={(e) =>
                  setUniversity(e.target.value)
                }
                placeholder="TU Munich"
                className="w-full bg-[#f7faf8] border border-[#d7e7de] rounded-2xl px-5 py-4 outline-none focus:border-[#0c8f6f] focus:ring-4 focus:ring-[#0c8f6f]/10 transition"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-[#063b36] block mb-2">
                Degree *
              </label>

              <input
                value={degree}
                onChange={(e) =>
                  setDegree(e.target.value)
                }
                placeholder="BS Computer Science"
                className="w-full bg-[#f7faf8] border border-[#d7e7de] rounded-2xl px-5 py-4 outline-none focus:border-[#0c8f6f] focus:ring-4 focus:ring-[#0c8f6f]/10 transition"
              />
            </div>
          </div>
        </div>

        {/* ADMISSION DOCS */}
        <div className="bg-white rounded-[32px] border border-[#e5eee9] shadow-sm p-8 mb-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-[#dff1e8] flex items-center justify-center text-2xl">
              🎓
            </div>

            <div>
              <h2 className="text-2xl font-bold text-[#063b36]">
                Admission Documents
              </h2>

              <p className="text-[#6b7280] text-sm mt-1">
                Upload all academic documents in PDF format
              </p>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-5">
            {[
              'transcript',
              'matric_marksheet',
              'matric_certificate',
              'intermediate_marksheet',
              'intermediate_certificate',
              'degree',
              'cv',
              'sop',
              'lor1',
              'lor2',
              'lor3',
              'ielts',
              'portfolio',
              'experience',
            ].map((key) => (
              <div
                key={key}
                className={`rounded-3xl border-2 border-dashed p-5 transition-all ${
                  files[key]
                    ? 'border-[#28b487] bg-[#effaf6]'
                    : 'border-[#d7e7de] bg-[#fbfcfb] hover:border-[#0c8f6f]'
                }`}
              >
                <label className="cursor-pointer block">
                  <p className="text-sm font-semibold text-[#063b36] mb-2">
                    {docLabels[key]}
                  </p>

                  <p className="text-xs text-[#6b7280] mb-4">
                    PDF format only
                  </p>

                  {files[key] ? (
                    <>
                      <div className="bg-white rounded-2xl px-4 py-3 border border-[#d7e7de]">
                        <p className="text-sm text-[#0c8f6f] font-semibold truncate">
                          ✅ {files[key]!.name}
                        </p>
                      </div>

                      <div className="space-y-3 mt-4">
                        <label className="flex items-start gap-3 text-xs text-[#6b7280]">
                          <input
                            type="checkbox"
                            checked={
                              mergedPages[key] || false
                            }
                            onChange={() =>
                              handleMergedPageToggle(key)
                            }
                            className="mt-0.5"
                          />

                          Includes front & back pages
                        </label>

                        <label className="flex items-start gap-3 text-xs text-[#6b7280]">
                          <input
                            type="checkbox"
                            checked={
                              attestationProvided[key] ||
                              false
                            }
                            onChange={() =>
                              handleAttestationToggle(key)
                            }
                            className="mt-0.5"
                          />

                          Includes attestation stamps
                        </label>
                      </div>
                    </>
                  ) : (
                    <div className="bg-[#dff1e8] text-[#0c8f6f] rounded-2xl py-3 text-center text-sm font-semibold">
                      Upload PDF
                    </div>
                  )}

                  <input
                    type="file"
                    accept=".pdf"
                    className="hidden"
                    onChange={(e) =>
                      handleFile(
                        key,
                        e.target.files?.[0] || null
                      )
                    }
                  />
                </label>

                {files[key] && (
                  <button
                    onClick={() =>
                      handleFile(key, null)
                    }
                    className="text-xs text-red-500 mt-4 hover:text-red-700"
                  >
                    Remove File
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}