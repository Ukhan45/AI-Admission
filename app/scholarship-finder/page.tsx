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

const DEGREE_OPTIONS = ['High School', 'Bachelor\'s (BS)', 'Master\'s (MS)', 'PhD', 'Postdoc'];
const COUNTRY_OPTIONS = [
  'USA', 'UK', 'Canada', 'Australia', 'Germany', 'France', 'Netherlands',
  'Sweden', 'Norway', 'Switzerland', 'Japan', 'South Korea', 'China', 'UAE', 'Any Country',
];
const FIELD_OPTIONS = [
  'Computer Science', 'Engineering', 'Business / MBA', 'Medicine', 'Law',
  'Arts & Humanities', 'Social Sciences', 'Natural Sciences', 'Education', 'Agriculture', 'Other',
];
const FINANCIAL_OPTIONS = ['Yes, I have financial need', 'No, I do not have financial need', 'Prefer not to say'];

const typeConfig: Record<string, { color: string; bg: string }> = {
  'Full Funded':  { color: 'text-emerald-700', bg: 'bg-emerald-100' },
  'Partial':      { color: 'text-blue-700',    bg: 'bg-blue-100'    },
  'Merit-Based':  { color: 'text-violet-700',  bg: 'bg-violet-100'  },
  'Need-Based':   { color: 'text-amber-700',   bg: 'bg-amber-100'   },
};

function UpgradeBanner() {
  return (
    <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-5 text-white mb-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-bold text-base">You've used all free searches 🚀</p>
          <p className="text-blue-100 text-sm mt-1">Upgrade to Pro for unlimited scholarship searches and all premium features.</p>
        </div>
        <Link href="/checkout"
          className="shrink-0 bg-white text-blue-600 hover:bg-blue-50 font-bold text-sm px-5 py-2.5 rounded-xl transition">
          Upgrade →
        </Link>
      </div>
    </div>
  );
}

export default function ScholarshipFinder() {
  const [isLoggedIn, setIsLoggedIn]     = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [loading, setLoading]           = useState(false);
  const [results, setResults]           = useState<Scholarship[]>([]);
  const [error, setError]               = useState('');
  const [limitReached, setLimitReached] = useState(false);
  const [searched, setSearched]         = useState(false);

  // Form state
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

    setLoading(true);
    setError('');
    setResults([]);
    setSearched(false);

    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) { setError('Please log in to search scholarships.'); return; }

      const res = await fetch('/api/scholarship-finder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
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

  if (!isLoggedIn) {
    return (
      <div className="max-w-md mx-auto mt-20 text-center">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10">
          <p className="text-5xl mb-4">🔒</p>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Sign In Required</h2>
          <p className="text-gray-500 text-sm mb-6">Create a free account to find scholarships tailored to your profile.</p>
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

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Scholarship Finder</h1>
        <p className="text-gray-500 mt-1 text-sm">
          Fill in your profile and we'll search real scholarships matched to your background.
        </p>
      </div>

      {limitReached && <UpgradeBanner />}

      {/* Form */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-5">
        <h2 className="font-semibold text-gray-800 mb-5 text-sm uppercase tracking-wide">Your Profile</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

          {/* Country of Study */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Country of Study <span className="text-red-400">*</span>
            </label>
            <select value={countryOfStudy} onChange={e => setCountryOfStudy(e.target.value)}
              className="border border-gray-200 bg-slate-50 px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition">
              <option value="">Select country</option>
              {COUNTRY_OPTIONS.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>

          {/* Country of Origin */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Country of Origin
            </label>
            <input value={countryOfOrigin} onChange={e => setCountryOfOrigin(e.target.value)}
              placeholder="e.g. Pakistan"
              className="border border-gray-200 bg-slate-50 px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition" />
          </div>

          {/* Degree Level */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Degree Level <span className="text-red-400">*</span>
            </label>
            <select value={degree} onChange={e => setDegree(e.target.value)}
              className="border border-gray-200 bg-slate-50 px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition">
              <option value="">Select degree</option>
              {DEGREE_OPTIONS.map(d => <option key={d}>{d}</option>)}
            </select>
          </div>

          {/* Field of Study */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Field of Study <span className="text-red-400">*</span>
            </label>
            <select value={field} onChange={e => setField(e.target.value)}
              className="border border-gray-200 bg-slate-50 px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition">
              <option value="">Select field</option>
              {FIELD_OPTIONS.map(f => <option key={f}>{f}</option>)}
            </select>
          </div>

          {/* GPA */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              GPA / Academic Score
            </label>
            <input value={gpa} onChange={e => setGpa(e.target.value)}
              placeholder="e.g. 3.5 / 4.0 or 85%"
              className="border border-gray-200 bg-slate-50 px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition" />
          </div>

          {/* IELTS Score */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              IELTS Score
            </label>
            <input value={ielts} onChange={e => setIelts(e.target.value)}
              placeholder="e.g. 6.5 (or leave blank)"
              className="border border-gray-200 bg-slate-50 px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition" />
          </div>

          {/* Financial Need */}
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Financial Need
            </label>
            <div className="flex flex-wrap gap-2">
              {FINANCIAL_OPTIONS.map(opt => (
                <button key={opt} onClick={() => setFinancialNeed(financialNeed === opt ? '' : opt)}
                  className={`text-xs px-4 py-2 rounded-full border transition font-medium
                    ${financialNeed === opt
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300 hover:text-blue-600'
                    }`}>
                  {opt}
                </button>
              ))}
            </div>
          </div>

        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3 mb-4">
          <span>⚠️</span> {error}
        </div>
      )}

      <button onClick={search} disabled={loading || !canSearch || limitReached}
        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3.5 rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mb-2">
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
        <p className="text-center text-xs text-gray-400 mb-6">
          Select Country of Study, Degree Level, and Field of Study to search.
        </p>
      )}

      {/* Results */}
      {searched && results.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <p className="text-4xl mb-3">🔍</p>
          <p className="font-medium text-gray-600">No scholarships found for your profile.</p>
          <p className="text-sm mt-1">Try adjusting your filters or broadening your country preference.</p>
        </div>
      )}

      {results.length > 0 && (
        <div className="space-y-4 mt-6 mb-8">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-gray-900 text-lg">
              {results.length} Scholarships Found
            </h2>
            <span className="text-xs text-gray-400">Sorted by relevance</span>
          </div>

          {results.map((s, i) => {
            const typeCfg = typeConfig[s.type] || typeConfig['Merit-Based'];
            return (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:border-blue-200 hover:shadow-md transition">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <h3 className="font-bold text-gray-900 text-base leading-snug">{s.name}</h3>
                    <p className="text-sm text-gray-500 mt-0.5">{s.provider} · {s.country}</p>
                  </div>
                  <span className={`shrink-0 text-xs font-bold px-3 py-1 rounded-full ${typeCfg.bg} ${typeCfg.color}`}>
                    {s.type}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-3">
                  <div className="bg-slate-50 rounded-xl px-3 py-2.5">
                    <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-0.5">Amount</p>
                    <p className="text-sm font-bold text-gray-800">{s.amount}</p>
                  </div>
                  <div className="bg-slate-50 rounded-xl px-3 py-2.5">
                    <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-0.5">Deadline</p>
                    <p className="text-sm font-bold text-gray-800">{s.deadline}</p>
                  </div>
                  <div className="bg-slate-50 rounded-xl px-3 py-2.5 col-span-2 sm:col-span-1">
                    <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-0.5">Coverage</p>
                    <p className="text-sm font-bold text-gray-800">{s.coverage}</p>
                  </div>
                </div>

                <p className="text-xs text-gray-500 mb-3 leading-relaxed">
                  <span className="font-semibold text-gray-700">Eligibility:</span> {s.eligibility}
                </p>

                {s.link && s.link !== '#' && (
                  <a href={s.link} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800 transition">
                    Apply / Learn More →
                  </a>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
