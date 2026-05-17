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

const DEGREE_OPTIONS = ["High School", "Bachelor's (BS)", "Master's (MS)", "PhD", "Postdoc"];
const COUNTRY_OPTIONS = [
  'USA', 'UK', 'Canada', 'Australia', 'Germany', 'France', 'Netherlands',
  'Sweden', 'Norway', 'Switzerland', 'Japan', 'South Korea', 'China', 'UAE', 'Any Country',
];
const FIELD_OPTIONS = [
  'Computer Science', 'Engineering', 'Business / MBA', 'Medicine', 'Law',
  'Arts & Humanities', 'Social Sciences', 'Natural Sciences', 'Education', 'Agriculture', 'Other',
];
const FINANCIAL_OPTIONS = ['Yes, I have financial need', 'No financial need', 'Prefer not to say'];

const typeCfg: Record<string, { badge: string }> = {
  'Full Funded': { badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
  'Partial':     { badge: 'bg-blue-500/20 text-blue-300 border-blue-500/30'         },
  'Merit-Based': { badge: 'bg-violet-500/20 text-violet-300 border-violet-500/30'   },
  'Need-Based':  { badge: 'bg-amber-500/20 text-amber-300 border-amber-500/30'      },
};

const selectCls = `w-full bg-[#0f1117] border border-white/10 text-white px-3.5 py-2.5 rounded-xl
  text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition`;
const inputCls  = `w-full bg-[#0f1117] border border-white/10 text-white placeholder-slate-600
  px-3.5 py-2.5 rounded-xl text-sm focus:outline-none focus:border-indigo-500 focus:ring-1
  focus:ring-indigo-500 transition`;
const labelCls  = `block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5`;
const hintCls   = `text-[11px] text-slate-600 mt-1`;

export default function ScholarshipFinder() {
  const [isLoggedIn, setIsLoggedIn]       = useState(false);
  const [checkingAuth, setCheckingAuth]   = useState(true);
  const [loading, setLoading]             = useState(false);
  const [results, setResults]             = useState<Scholarship[]>([]);
  const [error, setError]                 = useState('');
  const [limitReached, setLimitReached]   = useState(false);
  const [searched, setSearched]           = useState(false);

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

  // Auth gate
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-[#0f1117] flex items-center justify-center px-4">
        <div className="max-w-md w-full rounded-2xl bg-[#1a1d27] border border-white/5 p-10 text-center">
          <p className="text-5xl mb-4">🔒</p>
          <h2 className="text-xl font-bold text-white mb-2">Sign In Required</h2>
          <p className="text-slate-400 text-sm mb-6">Create a free account to find scholarships tailored to your profile.</p>
          <div className="flex gap-3 justify-center">
            <Link href="/signup" className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition">
              Create Account
            </Link>
            <Link href="/login" className="bg-white/5 border border-white/10 hover:bg-white/10 text-slate-300 px-5 py-2.5 rounded-xl text-sm font-semibold transition">
              Sign In
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f1117]">
      <div className="max-w-3xl mx-auto px-4 py-6 md:py-8">

        {/* Header */}
        <div className="mb-7">
          <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">Scholarship Finder</h1>
          <p className="text-slate-400 text-sm mt-1">
            Fill in your profile and we'll search real scholarships matched to your background.
          </p>
        </div>

        {/* Upgrade banner */}
        {limitReached && (
          <div className="bg-gradient-to-r from-indigo-600 to-violet-600 rounded-2xl p-5 mb-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-bold text-white">You've used all free searches 🚀</p>
                <p className="text-indigo-200 text-sm mt-1">Upgrade to Pro for unlimited scholarship searches and all features.</p>
              </div>
              <Link href="/checkout"
                className="shrink-0 bg-white text-indigo-600 hover:bg-indigo-50 font-bold text-sm px-5 py-2.5 rounded-xl transition">
                Upgrade →
              </Link>
            </div>
          </div>
        )}

        {/* Form */}
        <div className="rounded-2xl bg-[#1a1d27] border border-white/5 p-5 md:p-6 mb-5">
          <h2 className="text-white font-semibold text-xs uppercase tracking-widest mb-5">Your Profile</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">

            <div>
              <label className={labelCls}>Country of Study <span className="text-red-400">*</span></label>
              <select value={countryOfStudy} onChange={e => setCountryOfStudy(e.target.value)} className={selectCls}>
                <option value="">Select country</option>
                {COUNTRY_OPTIONS.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>

            <div>
              <label className={labelCls}>Country of Origin</label>
              <input value={countryOfOrigin} onChange={e => setCountryOfOrigin(e.target.value)}
                placeholder="e.g. Pakistan" className={inputCls} />
              <p className={hintCls}>Where you're from</p>
            </div>

            <div>
              <label className={labelCls}>Degree Level <span className="text-red-400">*</span></label>
              <select value={degree} onChange={e => setDegree(e.target.value)} className={selectCls}>
                <option value="">Select degree</option>
                {DEGREE_OPTIONS.map(d => <option key={d}>{d}</option>)}
              </select>
            </div>

            <div>
              <label className={labelCls}>Field of Study <span className="text-red-400">*</span></label>
              <select value={field} onChange={e => setField(e.target.value)} className={selectCls}>
                <option value="">Select field</option>
                {FIELD_OPTIONS.map(f => <option key={f}>{f}</option>)}
              </select>
            </div>

            <div>
              <label className={labelCls}>GPA / Academic Score</label>
              <input value={gpa} onChange={e => setGpa(e.target.value)}
                placeholder="e.g. 3.5 / 4.0 or 85%" className={inputCls} />
              <p className={hintCls}>Helps match scholarship eligibility</p>
            </div>

            <div>
              <label className={labelCls}>IELTS Score</label>
              <input value={ielts} onChange={e => setIelts(e.target.value)}
                placeholder="e.g. 6.5 (or leave blank)" className={inputCls} />
              <p className={hintCls}>Leave blank if not taken</p>
            </div>

            <div className="sm:col-span-2">
              <label className={labelCls}>Financial Need</label>
              <div className="flex flex-wrap gap-2">
                {FINANCIAL_OPTIONS.map(opt => (
                  <button key={opt} onClick={() => setFinancialNeed(financialNeed === opt ? '' : opt)}
                    className={`text-xs px-4 py-2 rounded-full border font-medium transition ${
                      financialNeed === opt
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-white/5 text-slate-400 border-white/10 hover:border-white/20 hover:text-slate-200'
                    }`}>
                    {opt}
                  </button>
                ))}
              </div>
            </div>

          </div>

          {error && (
            <div className="mt-4 flex items-start gap-2 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-xl px-4 py-3">
              <span>⚠️</span> {error}
            </div>
          )}

          <button onClick={search} disabled={loading || !canSearch || limitReached}
            className="mt-5 w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed
              text-white font-bold py-3.5 rounded-xl transition flex items-center justify-center gap-2 text-sm">
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
            <p className="text-center text-[11px] text-slate-600 mt-2">
              Select Country of Study, Degree Level, and Field of Study to search.
            </p>
          )}
        </div>

        {/* Empty state */}
        {searched && results.length === 0 && (
          <div className="text-center py-16 rounded-2xl bg-[#1a1d27] border border-white/5">
            <p className="text-4xl mb-3">🔍</p>
            <p className="text-slate-300 font-medium">No scholarships found for your profile.</p>
            <p className="text-slate-500 text-sm mt-1">Try adjusting your filters or broadening your country preference.</p>
          </div>
        )}

        {/* Results */}
        {results.length > 0 && (
          <div className="space-y-3 mt-2 mb-8">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-white font-bold text-base">
                {results.length} Scholarships Found
              </h2>
              <span className="text-xs text-slate-500">Sorted by relevance</span>
            </div>

            {results.map((s, i) => {
              const cfg = typeCfg[s.type] || typeCfg['Merit-Based'];
              return (
                <div key={i} className="rounded-2xl bg-[#1a1d27] border border-white/5 hover:border-white/10 p-5 transition">

                  {/* Top row */}
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="min-w-0">
                      <h3 className="font-bold text-white text-base leading-snug">{s.name}</h3>
                      <p className="text-sm text-slate-400 mt-0.5">{s.provider} · {s.country}</p>
                    </div>
                    <span className={`shrink-0 text-xs font-bold px-3 py-1 rounded-full border ${cfg.badge}`}>
                      {s.type}
                    </span>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
                    {[
                      { label: 'Amount',   value: s.amount   },
                      { label: 'Deadline', value: s.deadline },
                      { label: 'Coverage', value: s.coverage },
                    ].map(({ label, value }) => (
                      <div key={label} className="bg-[#0f1117] border border-white/5 rounded-xl px-3 py-2.5">
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">{label}</p>
                        <p className="text-sm font-bold text-slate-200">{value}</p>
                      </div>
                    ))}
                  </div>

                  {/* Eligibility */}
                  <p className="text-xs text-slate-400 mb-3 leading-relaxed">
                    <span className="font-semibold text-slate-300">Eligibility:</span> {s.eligibility}
                  </p>

                  {s.link && s.link !== '#' && (
                    <a href={s.link} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition">
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
