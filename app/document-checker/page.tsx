'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

interface DocResult {
  document: string;
  status: 'OK' | 'Update Needed' | 'Missing' | 'Attestation Required' | 'Apostille Required';
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
    passport: null, transcript: null, degree: null, ielts: null, cv: null,
  });
  const [results, setResults] = useState<DocResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsLoggedIn(!!session);
      setCheckingAuth(false);
    });
  }, []);

  const handleFile = (name: string, file: File | null) => {
    setFiles(prev => ({ ...prev, [name]: file }));
  };

  const checkDocuments = async () => {
    if (!country || !university || !degree) {
      setError('Please fill in Country, University, and Degree.');
      return;
    }
    const uploadedDocs = Object.entries(files)
      .filter(([, f]) => f !== null)
      .map(([name]) => name);

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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          country,
          university,
          degree,
          documents: uploadedDocs,
        }),
      });

      if (!res.ok) throw new Error('Failed to check documents');
      const data = await res.json();
      setResults(data.results || []);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const statusConfig = {
    'OK':                   { icon: '✅', cls: 'bg-emerald-50 border-emerald-200 text-emerald-800' },
    'Update Needed':        { icon: '⚠️', cls: 'bg-amber-50 border-amber-200 text-amber-800' },
    'Missing':              { icon: '❌', cls: 'bg-red-50 border-red-200 text-red-800' },
    'Attestation Required': { icon: '🔏', cls: 'bg-blue-50 border-blue-200 text-blue-800' },
    'Apostille Required':   { icon: '📜', cls: 'bg-violet-50 border-violet-200 text-violet-800' },
  };

  const docLabels: { [key: string]: string } = {
    passport: '🛂 Passport',
    transcript: '📄 Transcripts',
    degree: '🎓 Degree Certificate',
    ielts: '📝 IELTS / Language Test',
    cv: '📋 CV / Resume',
  };

  if (checkingAuth) return null;

  // Not logged in — show gate
  if (!isLoggedIn) {
    return (
      <div className="max-w-md mx-auto mt-20 text-center">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10">
          <p className="text-5xl mb-4">🔒</p>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Sign In Required</h2>
          <p className="text-gray-500 text-sm mb-6">
            The Document Checker is available for registered users only. Create a free account to access this feature.
          </p>
          <div className="flex gap-3 justify-center">
            <Link href="/signup" className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition">
              Create Account
            </Link>
            <Link href="/login" className="border border-gray-200 hover:border-gray-400 text-gray-700 px-5 py-2.5 rounded-xl text-sm font-semibold transition">
              Sign In
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Document Checker</h1>
        <p className="text-gray-500 mt-1 text-sm">
          Upload your documents and get AI guidance on what's ready, what needs updating, and what requires attestation or apostille.
        </p>
      </div>

      {/* Target Info */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-5">
        <h2 className="font-semibold text-gray-800 mb-4 text-sm uppercase tracking-wide">Application Details</h2>
        <div className="grid grid-cols-3 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Target Country <span className="text-red-400">*</span></label>
            <input value={country} onChange={e => setCountry(e.target.value)} placeholder="e.g. Germany"
              className="border border-gray-200 bg-slate-50 px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">University <span className="text-red-400">*</span></label>
            <input value={university} onChange={e => setUniversity(e.target.value)} placeholder="e.g. TU Munich"
              className="border border-gray-200 bg-slate-50 px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Your Degree <span className="text-red-400">*</span></label>
            <input value={degree} onChange={e => setDegree(e.target.value)} placeholder="e.g. BS CS"
              className="border border-gray-200 bg-slate-50 px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition" />
          </div>
        </div>
      </div>

      {/* Document Upload */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-5">
        <h2 className="font-semibold text-gray-800 mb-4 text-sm uppercase tracking-wide">Upload Documents</h2>
        <div className="grid grid-cols-2 gap-4">
          {Object.entries(docLabels).map(([key, label]) => (
            <div key={key} className={`border-2 border-dashed rounded-xl p-4 transition ${files[key] ? 'border-emerald-300 bg-emerald-50' : 'border-gray-200 hover:border-blue-300'}`}>
              <label className="cursor-pointer block">
                <p className="text-sm font-medium text-gray-700 mb-1">{label}</p>
                <p className="text-[11px] text-gray-400 mb-2">PDF, JPG, PNG accepted</p>
                {files[key] ? (
                  <p className="text-xs text-emerald-700 font-medium truncate">✅ {files[key]!.name}</p>
                ) : (
                  <p className="text-xs text-blue-500">Click to upload</p>
                )}
                <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden"
                  onChange={e => handleFile(key, e.target.files?.[0] || null)} />
              </label>
              {files[key] && (
                <button onClick={() => handleFile(key, null)} className="text-[11px] text-red-400 hover:text-red-600 mt-1">Remove</button>
              )}
            </div>
          ))}
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3 mb-4">
          <span>⚠️</span> {error}
        </div>
      )}

      <button onClick={checkDocuments} disabled={loading}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mb-6">
        {loading ? (
          <>
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
            </svg>
            Checking your documents…
          </>
        ) : '🔍 Check Documents'}
      </button>

      {/* Results */}
      {results.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-bold text-gray-900 text-lg">Document Review</h2>
          {results.map((r, i) => {
            const cfg = statusConfig[r.status] || statusConfig['OK'];
            return (
              <div key={i} className={`rounded-xl border p-4 ${cfg.cls}`}>
                <div className="flex items-center justify-between mb-1">
                  <p className="font-semibold text-sm flex items-center gap-2">
                    <span>{cfg.icon}</span> {r.document}
                  </p>
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-white bg-opacity-60 border">
                    {r.status}
                  </span>
                </div>
                <p className="text-sm mt-1">{r.message}</p>
                {r.action && (
                  <p className="text-xs mt-2 font-medium opacity-80">👉 {r.action}</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}