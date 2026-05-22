'use client';

import { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import Link from 'next/link';

interface Scholarship {
  name: string;
  provider: string;
  country: string;
  amount: string;
  deadline: string;
  eligibility: string;
  link: string;
  coverage: string;
  type: 'Full Funded' | 'Partial' | 'Merit-Based' | 'Need-Based';
}

const DEGREE_OPTIONS   = ["High School", "Bachelor's (BS)", "Master's (MS)", "PhD", "Postdoc"];
const COUNTRY_OPTIONS  = [
  'USA', 'UK', 'Canada', 'Australia', 'Germany', 'France', 'Netherlands',
  'Sweden', 'Norway', 'Switzerland', 'Japan', 'South Korea', 'China', 'UAE', 'Any Country',
];
const FIELD_OPTIONS    = [
  'Computer Science', 'Engineering', 'Business / MBA', 'Medicine', 'Law',
  'Arts & Humanities', 'Social Sciences', 'Natural Sciences', 'Education', 'Agriculture', 'Other',
];
const FINANCIAL_OPTIONS = ['Yes, I have financial need', 'No financial need', 'Prefer not to say'];

// UniQuest AI theme: light-mode badge styles
const typeCfg: Record<string, { badge: string; dot: string }> = {
  'Full Funded': { badge: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
  'Partial':     { badge: 'bg-orange-50 text-orange-700 border-orange-200',   dot: 'bg-orange-500'  },
  'Merit-Based': { badge: 'bg-violet-50 text-violet-700 border-violet-200',   dot: 'bg-violet-500'  },
  'Need-Based':  { badge: 'bg-amber-50 text-amber-700 border-amber-200',      dot: 'bg-amber-500'   },
};

const selectCls = `w-full bg-white border border-gray-200 text-gray-800 px-3.5 py-2.5 rounded-xl
  text-sm focus:outline-none focus:border-[#2ecc71] focus:ring-2 focus:ring-[#2ecc71]/20 transition`;
const inputCls  = `w-full bg-white border border-gray-200 text-gray-800 placeholder-gray-400
  px-3.5 py-2.5 rounded-xl text-sm focus:outline-none focus:border-[#2ecc71] focus:ring-2
  focus:ring-[#2ecc71]/20 transition`;
const labelCls  = `block text-[11px] font-bold uppercase tracking-widest mb-1.5` ;
const hintCls   = `text-[11px] text-gray-400 mt-1`;

export default function ScholarshipFinder() {
  const [isLoggedIn, setIsLoggedIn]     = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [loading, setLoading]           = useState(false);
  const [results, setResults]           = useState<Scholarship[]>([]);
  const [error, setError]               = useState('');
  const [limitReached, setLimitReached] = useState(false);
  const [searched, setSearched]         = useState(false);

  const [countryOfStudy, setCountryOfStudy]   = useState('');
  const [countryOfOrigin, setCountryOfOrigin] = useState('');
  const [degree, setDegree]                   = useState('');
  const [field, setField]                     = useState('');
  const [gpa, setGpa]                         = useState('');
  const [ielts, setIelts]                     = useState('');
  const [financialNeed, setFinancialNeed]     = useState('');

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setIsLoggedIn(!!user);
      setCheckingAuth(false);
    });
    return () => unsub();
  }, []);

  const canSearch = countryOfStudy && degree && field;

  const search = async () => {
    if (!canSearch) { setError('Please fill in Country of Study, Degree, and Field of Study.'); return; }
    setLoading(true); setError(''); setResults([]); setSearched(false);
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) { setError('Please log in to search scholarships.'); return; }
      const res = await fetch('/api/scholarship-finder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ countryOfStudy, countryOfOrigin, degree, field, gpa, ielts, financialNeed }),
      });
      const data = await res.json();
      if (res.status === 402) { setLimitReached(true); return; }
      if (res.status === 401) { setError('Session expired. Please log in again.'); return; }
      if (!res.ok) throw new Error('Search failed');
      setResults(data.scholarships || []);
      setSearched(true);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (checkingAuth) return null;

  // ── Auth gate ──────────────────────────────────────────────────────────────
  if (!isLoggedIn) {
    return (
      <div
        className="min-h-screen flex items-center justify-center px-4"
        style={{ background: '#f7f8f3', fontFamily: "'Segoe UI', system-ui, sans-serif" }}
      >
        <div
          className="max-w-md w-full rounded-2xl bg-white border border-gray-100 p-10 text-center"
          style={{ boxShadow: '0 1px 6px rgba(0,0,0,0.07)' }}
        >
          <p className="text-5xl mb-4">🔒</p>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Sign In Required</h2>
          <p className="text-gray-400 text-sm mb-6">
            Create a free account to find scholarships tailored to your profile.
          </p>
          <div className="flex gap-3 justify-center">
            <Link
              href="/signup"
              className="text-white font-bold text-sm px-5 py-2.5 rounded-xl transition"
              style={{ background: '#1a5c38' }}
            >
              Create Account
            </Link>
            <Link
              href="/login"
              className="border border-gray-200 text-gray-600 hover:border-gray-300 font-semibold text-sm px-5 py-2.5 rounded-xl transition"
            >
              Sign In
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ── Main page ──────────────────────────────────────────────────────────────
  return (
    <div
      className="min-h-screen"
      style={{ background: '#f7f8f3', fontFamily: "'Segoe UI', system-ui, sans-serif" }}
    >
      {/* Page header */}
      <div className="bg-white border-b border-gray-100 px-6 py-5">
        <div className="max-w-5xl mx-auto">
          <span
            className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest
              px-3 py-1 rounded-full border mb-3"
            style={{ background: '#f0faf4', borderColor: '#b6e8ca', color: '#1a5c38' }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#f5a623] inline-block" />
            AI Tools
          </span>
          <h1 className="text-2xl font-bold text-gray-900">Scholarship Finder</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            Fill in your profile and we'll search real scholarships matched to your background.
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-6">

        {/* Upgrade banner */}
        {limitReached && (
          <div
            className="rounded-2xl p-5 mb-6"
            style={{ background: 'linear-gradient(135deg, #1a5c38 0%, #2ecc71 100%)' }}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-bold text-white">You've used all free searches 🚀</p>
                <p className="text-white/70 text-sm mt-1">
                  Upgrade to Pro for unlimited scholarship searches and all features.
                </p>
              </div>
              <Link
                href="/checkout"
                className="shrink-0 bg-white font-bold text-sm px-5 py-2.5 rounded-xl transition hover:bg-gray-50"
                style={{ color: '#1a5c38' }}
              >
                Upgrade →
              </Link>
            </div>
          </div>
        )}

        {/* Form card */}
        <div
          className="rounded-2xl bg-white border border-gray-100 p-5 md:p-6 mb-5"
          style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}
        >
          <h2
            className="text-[11px] font-bold uppercase tracking-widest mb-5"
            style={{ color: '#1a5c38' }}
          >
            Your Profile
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">

            {/* Country of Study */}
            <div>
              <label className={labelCls} style={{ color: '#1a5c38' }}>
                Country of Study <span className="text-red-400">*</span>
              </label>
              <select value={countryOfStudy} onChange={e => setCountryOfStudy(e.target.value)} className={selectCls}>
                <option value="">Select country</option>
                {COUNTRY_OPTIONS.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>

            {/* Country of Origin */}
            <div>
              <label className={labelCls} style={{ color: '#1a5c38' }}>Country of Origin</label>
              <input
                value={countryOfOrigin}
                onChange={e => setCountryOfOrigin(e.target.value)}
                placeholder="e.g. Pakistan"
                className={inputCls}
              />
              <p className={hintCls}>Where you're from</p>
            </div>

            {/* Degree */}
            <div>
              <label className={labelCls} style={{ color: '#1a5c38' }}>
                Degree Level <span className="text-red-400">*</span>
              </label>
              <select value={degree} onChange={e => setDegree(e.target.value)} className={selectCls}>
                <option value="">Select degree</option>
                {DEGREE_OPTIONS.map(d => <option key={d}>{d}</option>)}
              </select>
            </div>

            {/* Field */}
            <div>
              <label className={labelCls} style={{ color: '#1a5c38' }}>
                Field of Study <span className="text-red-400">*</span>
              </label>
              <select value={field} onChange={e => setField(e.target.value)} className={selectCls}>
                <option value="">Select field</option>
                {FIELD_OPTIONS.map(f => <option key={f}>{f}</option>)}
              </select>
            </div>

            {/* GPA */}
            <div>
              <label className={labelCls} style={{ color: '#1a5c38' }}>GPA / Academic Score</label>
              <input
                value={gpa}
                onChange={e => setGpa(e.target.value)}
                placeholder="e.g. 3.5 / 4.0 or 85%"
                className={inputCls}
              />
              <p className={hintCls}>Helps match scholarship eligibility</p>
            </div>

            {/* IELTS */}
            <div>
              <label className={labelCls} style={{ color: '#1a5c38' }}>IELTS Score</label>
              <input
                value={ielts}
                onChange={e => setIelts(e.target.value)}
                placeholder="e.g. 6.5 (or leave blank)"
                className={inputCls}
              />
              <p className={hintCls}>Leave blank if not taken</p>
            </div>

            {/* Financial Need */}
            <div className="sm:col-span-2">
              <label className={labelCls} style={{ color: '#1a5c38' }}>Financial Need</label>
              <div className="flex flex-wrap gap-2">
                {FINANCIAL_OPTIONS.map(opt => (
                  <button
                    key={opt}
                    onClick={() => setFinancialNeed(financialNeed === opt ? '' : opt)}
                    className="text-xs px-4 py-2 rounded-full border font-medium transition"
                    style={
                      financialNeed === opt
                        ? { background: '#1a5c38', color: '#fff', borderColor: '#1a5c38' }
                        : { background: '#fff', color: '#374151', borderColor: '#e5e7eb' }
                    }
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>

          </div>

          {/* Error */}
          {error && (
            <div className="mt-4 flex items-start gap-2 bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3">
              <span>⚠️</span> {error}
            </div>
          )}

          {/* CTA */}
          <button
            onClick={search}
            disabled={loading || !canSearch || limitReached}
            className="mt-5 w-full text-white font-bold py-3.5 rounded-xl transition
              flex items-center justify-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: '#1a5c38' }}
            onMouseEnter={e => { if (!loading && canSearch && !limitReached) (e.currentTarget as HTMLButtonElement).style.background = '#155e32'; }}
            onMouseLeave={e => { if (!loading && canSearch && !limitReached) (e.currentTarget as HTMLButtonElement).style.background = '#1a5c38'; }}
          >
            {loading ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                Searching scholarships…
              </>
            ) : '🎓 Find Scholarships'}
          </button>

          {!canSearch && !loading && (
            <p className="text-center text-[11px] text-gray-400 mt-2">
              Select Country of Study, Degree Level, and Field of Study to search.
            </p>
          )}
        </div>

        {/* Empty state */}
        {searched && results.length === 0 && (
          <div
            className="text-center py-16 rounded-2xl bg-white border border-gray-100"
            style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}
          >
            <p className="text-4xl mb-3">🔍</p>
            <p className="text-gray-700 font-semibold">No scholarships found for your profile.</p>
            <p className="text-gray-400 text-sm mt-1">
              Try adjusting your filters or broadening your country preference.
            </p>
          </div>
        )}

        {/* Results */}
        {results.length > 0 && (
          <div className="space-y-3 mt-2 mb-8">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-gray-900 font-bold text-base">
                {results.length} Scholarships Found
              </h2>
              <span className="text-xs text-gray-400">Sorted by relevance</span>
            </div>

            {results.map((s, i) => {
              const cfg = typeCfg[s.type] ?? typeCfg['Merit-Based'];
              return (
                <div
                  key={i}
                  className="rounded-2xl bg-white border border-gray-100 p-5 transition hover:shadow-sm"
                  style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}
                >
                  {/* Top row */}
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="min-w-0">
                      <h3 className="font-bold text-gray-900 text-base leading-snug">{s.name}</h3>
                      <p className="text-sm text-gray-400 mt-0.5">{s.provider} · {s.country}</p>
                    </div>
                    <span
                      className={`shrink-0 inline-flex items-center gap-1.5 text-xs font-semibold
                        px-3 py-1 rounded-full border ${cfg.badge}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                      {s.type}
                    </span>
                  </div>

                  {/* Stats chips */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
                    {[
                      { label: 'Amount',   value: s.amount   },
                      { label: 'Deadline', value: s.deadline },
                      { label: 'Coverage', value: s.coverage },
                    ].map(({ label, value }) => (
                      <div
                        key={label}
                        className="rounded-xl px-3 py-2.5 border"
                        style={{ background: '#f7f8f3', borderColor: '#e8ede6' }}
                      >
                        <p
                          className="text-[10px] font-bold uppercase tracking-widest mb-1"
                          style={{ color: '#1a5c38' }}
                        >
                          {label}
                        </p>
                        <p className="text-sm font-semibold text-gray-800">{value}</p>
                      </div>
                    ))}
                  </div>

                  {/* Eligibility */}
                  <p className="text-xs text-gray-500 mb-3 leading-relaxed">
                    <span className="font-semibold text-gray-800">Eligibility:</span> {s.eligibility}
                  </p>

                  {s.link && s.link !== '#' && (
                    <a
                      href={s.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-semibold transition"
                      style={{ color: '#1a5c38' }}
                      onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.color = '#155e32'}
                      onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.color = '#1a5c38'}
                    >
                      Apply / Learn More →
                    </a>
                  )}
                </div>
              );
            })}
          </div>
        )}

      </div>
    </div>
  );
}
