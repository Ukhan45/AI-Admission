'use client';

import { useState, type ChangeEvent } from 'react';
import { incrementStat } from '@/lib/stats';

interface University {
  name: string;
  country: string;
  city: string;
  tuition: string;
  language: string;
  ieltsRequired: string;
  programs: string[];
  admissionChance: 'High' | 'Medium' | 'Low';
  website: string;
}

const INTAKE_OPTIONS  = ['Any', 'Fall (Sep)', 'Spring (Jan)', 'Winter (Jan/Feb)', 'Summer'];
const RANKING_OPTIONS = ['Any', 'Top 100', 'Top 200', 'Top 500'];
const SORT_OPTIONS    = [
  { label: 'Default',             value: 'default'      },
  { label: 'Tuition: Low → High', value: 'tuition_asc'  },
  { label: 'Tuition: High → Low', value: 'tuition_desc' },
  { label: 'Best Chance First',   value: 'chance'        },
  { label: 'Country A → Z',       value: 'country'       },
];

const chanceOrder = { High: 0, Medium: 1, Low: 2 };

function parseTuition(t: string): number {
  const n = parseInt(t.replace(/[^0-9]/g, ''), 10);
  return isNaN(n) ? 999999 : n;
}

function sortResults(results: University[], sort: string): University[] {
  const arr = [...results];
  if (sort === 'tuition_asc')  return arr.sort((a, b) => parseTuition(a.tuition) - parseTuition(b.tuition));
  if (sort === 'tuition_desc') return arr.sort((a, b) => parseTuition(b.tuition) - parseTuition(a.tuition));
  if (sort === 'chance')       return arr.sort((a, b) => chanceOrder[a.admissionChance] - chanceOrder[b.admissionChance]);
  if (sort === 'country')      return arr.sort((a, b) => a.country.localeCompare(b.country));
  return arr;
}

const chanceCfg = {
  High:   {
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    dot:   'bg-emerald-500',
    card:  'border-l-emerald-400',
  },
  Medium: {
    badge: 'bg-amber-50 text-amber-700 border-amber-200',
    dot:   'bg-amber-500',
    card:  'border-l-amber-400',
  },
  Low: {
    badge: 'bg-red-50 text-red-600 border-red-200',
    dot:   'bg-red-500',
    card:  'border-l-red-400',
  },
};

const inputCls = `
  w-full bg-white border border-gray-200 text-gray-800 placeholder-gray-400
  px-3.5 py-2.5 rounded-xl text-sm
  focus:outline-none focus:border-[#2ecc71] focus:ring-2 focus:ring-[#2ecc71]/20
  transition
`.trim();

const labelCls = `block text-[11px] font-bold text-[#1a5c38] uppercase tracking-widest mb-1.5`;
const hintCls  = `text-[11px] text-gray-400 mt-1`;

export default function Universities() {
  const [filters, setFilters] = useState({
    degree: '', country: '', budget: '', ielts: '', gpa: '', intake: 'Any', ranking: 'Any',
  });
  const [results,  setResults]  = useState<University[]>([]);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');
  const [searched, setSearched] = useState(false);
  const [sort,     setSort]     = useState('default');

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSelect = (key: string, value: string) =>
    setFilters({ ...filters, [key]: value });

  const search = async () => {
    if (!filters.degree || !filters.country) {
      setError('Please enter at least a Degree and Country.');
      return;
    }
    setLoading(true); setError(''); setResults([]); setSearched(false);
    try {
      const res = await fetch('/api/universities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(filters),
      });
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      setResults(data.universities || []);
      setSearched(true);
      incrementStat('universitiesSearched');
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const sorted    = sortResults(results, sort);
  const highCount = results.filter(r => r.admissionChance === 'High').length;
  const medCount  = results.filter(r => r.admissionChance === 'Medium').length;
  const lowCount  = results.filter(r => r.admissionChance === 'Low').length;

  return (
    <div
      className="min-h-screen"
      style={{
        background: '#f7f8f3',
        fontFamily: "'Segoe UI', system-ui, sans-serif",
      }}
    >
      {/* ── Page header ── */}
      <div className="bg-white border-b border-gray-100 px-4 sm:px-6 py-4 sm:py-5">
        <div className="max-w-5xl mx-auto">
          <span
            className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest
              px-3 py-1 rounded-full border mb-3"
            style={{
              background: '#f0faf4',
              borderColor: '#b6e8ca',
              color: '#1a5c38',
            }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#f5a623] inline-block" />
            University Search
          </span>

          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">University Finder</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            Search real universities based on your profile, budget, and preferences.
          </p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 sm:py-6">

        {/* ── Filter card ── */}
        <div
          className="rounded-2xl bg-white border border-gray-100 p-4 sm:p-6 mb-5"
          style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}
        >
          <h2
            className="text-[11px] font-bold uppercase tracking-widest mb-4 sm:mb-5"
            style={{ color: '#1a5c38' }}
          >
            Search Filters
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">

            {/* Degree */}
            <div>
              <label className={labelCls}>
                Field / Degree <span className="text-red-400">*</span>
              </label>
              <input
                name="degree"
                value={filters.degree}
                onChange={handleChange}
                placeholder="e.g. Computer Science, MBA, Law"
                className={inputCls}
              />
              <p className={hintCls}>Your intended field of study</p>
            </div>

            {/* Country */}
            <div>
              <label className={labelCls}>
                Country <span className="text-red-400">*</span>
              </label>
              <input
                name="country"
                value={filters.country}
                onChange={handleChange}
                placeholder='e.g. Germany, Canada, or Any'
                className={inputCls}
              />
              <p className={hintCls}>Preferred country or "Any"</p>
            </div>

            {/* Budget */}
            <div>
              <label className={labelCls}>Monthly Budget (USD)</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium pointer-events-none">
                  $
                </span>
                <input
                  name="budget"
                  value={filters.budget}
                  onChange={handleChange}
                  placeholder="e.g. 1000"
                  className={`${inputCls} pl-8`}
                  inputMode="numeric"
                />
              </div>
              <p className={hintCls}>Leave blank to see all options</p>
            </div>

            {/* IELTS */}
            <div>
              <label className={labelCls}>IELTS Score</label>
              <input
                name="ielts"
                value={filters.ielts}
                onChange={handleChange}
                placeholder='e.g. 7.0  or  No IELTS'
                className={inputCls}
                inputMode="decimal"
              />
              <p className={hintCls}>Type "No IELTS" if not taken</p>
            </div>

            {/* GPA */}
            <div>
              <label className={labelCls}>GPA / Academic Score</label>
              <input
                name="gpa"
                value={filters.gpa}
                onChange={handleChange}
                placeholder="e.g. 3.5 / 4.0 or 75%"
                className={inputCls}
                inputMode="decimal"
              />
              <p className={hintCls}>Helps estimate admission chance</p>
            </div>

            {/* Intake */}
            <div>
              <label className={labelCls}>Intake Season</label>
              <div className="flex flex-wrap gap-1.5">
                {INTAKE_OPTIONS.map(opt => (
                  <button
                    key={opt}
                    onClick={() => handleSelect('intake', opt)}
                    className="text-xs px-3 py-1.5 rounded-lg border font-medium transition"
                    style={
                      filters.intake === opt
                        ? { background: '#1a5c38', color: '#fff', borderColor: '#1a5c38' }
                        : { background: '#fff', color: '#374151', borderColor: '#e5e7eb' }
                    }
                  >
                    {opt}
                  </button>
                ))}
              </div>
              <p className={hintCls}>Preferred enrollment period</p>
            </div>

            {/* Ranking */}
            <div className="sm:col-span-2">
              <label className={labelCls}>Ranking Preference</label>
              <div className="flex flex-wrap gap-2">
                {RANKING_OPTIONS.map(opt => (
                  <button
                    key={opt}
                    onClick={() => handleSelect('ranking', opt)}
                    className="text-xs px-4 py-1.5 rounded-lg border font-medium transition"
                    style={
                      filters.ranking === opt
                        ? { background: '#1a5c38', color: '#fff', borderColor: '#1a5c38' }
                        : { background: '#fff', color: '#374151', borderColor: '#e5e7eb' }
                    }
                  >
                    {opt}
                  </button>
                ))}
              </div>
              <p className={hintCls}>Filter by global university ranking</p>
            </div>

          </div>

          {/* Error */}
          {error && (
            <div className="mt-4 flex items-start gap-2 bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3">
              <span className="shrink-0">⚠️</span> {error}
            </div>
          )}

          {/* Search button */}
          <button
            onClick={search}
            disabled={loading}
            className="mt-4 sm:mt-5 w-full text-white font-bold py-3.5 rounded-xl transition
              flex items-center justify-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: loading ? '#2ecc71' : '#1a5c38' }}
            onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLButtonElement).style.background = '#155e32'; }}
            onMouseLeave={e => { if (!loading) (e.currentTarget as HTMLButtonElement).style.background = '#1a5c38'; }}
          >
            {loading ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                Searching universities…
              </>
            ) : (
              <>🔍 Find Universities</>
            )}
          </button>
        </div>

        {/* ── Empty state ── */}
        {searched && results.length === 0 && (
          <div
            className="text-center py-16 rounded-2xl bg-white border border-gray-100"
            style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}
          >
            <p className="text-4xl mb-3">🎓</p>
            <p className="text-gray-700 font-semibold">No universities found.</p>
            <p className="text-gray-400 text-sm mt-1">
              Try adjusting your filters or broadening your country.
            </p>
          </div>
        )}

        {/* ── Results ── */}
        {results.length > 0 && (
          <div>
            {/* Summary bar */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-3">
              <div className="flex flex-wrap items-center gap-3">
                <p className="text-gray-500 text-sm">
                  <span className="text-gray-900 font-bold">{results.length}</span> universities found
                </p>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {highCount > 0 && (
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {highCount} High
                    </span>
                  )}
                  {medCount > 0 && (
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                      {medCount} Medium
                    </span>
                  )}
                  {lowCount > 0 && (
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-200">
                      {lowCount} Low
                    </span>
                  )}
                </div>
              </div>

              {/* Sort dropdown */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400 font-medium">Sort:</span>
                <select
                  value={sort}
                  onChange={e => setSort(e.target.value)}
                  className="text-xs bg-white border border-gray-200 text-gray-800 rounded-lg px-2.5 py-1.5
                    focus:outline-none focus:border-[#2ecc71] transition"
                >
                  {SORT_OPTIONS.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* University cards */}
            <div className="space-y-3">
              {sorted.map((uni, i) => {
                const cfg = chanceCfg[uni.admissionChance] ?? chanceCfg.Medium;
                return (
                  <div
                    key={i}
                    className={`rounded-2xl bg-white border border-gray-100 border-l-4 ${cfg.card} p-4 sm:p-5 transition hover:shadow-sm`}
                    style={{ boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}
                  >
                    {/* Card header */}
                    <div className="flex items-start justify-between gap-3 mb-3 sm:mb-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-0.5">
                          <h3 className="font-bold text-gray-900 text-sm sm:text-base">{uni.name}</h3>
                          <span
                            className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full border ${cfg.badge}`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot} shrink-0`} />
                            {uni.admissionChance} Chance
                          </span>
                        </div>
                        <p className="text-sm text-gray-400">📍 {uni.city}, {uni.country}</p>
                      </div>

                      {uni.website && uni.website !== 'N/A' && (
                        <a
                          href={uni.website.startsWith('http') ? uni.website : `https://${uni.website}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="shrink-0 text-xs font-semibold px-3 py-1.5 rounded-lg border transition"
                          style={{
                            color: '#1a5c38',
                            borderColor: '#b6e8ca',
                            background: '#f0faf4',
                          }}
                          onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = '#dcf5e7'; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = '#f0faf4'; }}
                        >
                          Visit →
                        </a>
                      )}
                    </div>

                    {/* Info chips — 1 col on mobile, 3 on sm+ */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-3">
                      {[
                        { label: 'Tuition',       value: uni.tuition       },
                        { label: 'Language',       value: uni.language      },
                        { label: 'IELTS Required', value: uni.ieltsRequired },
                      ].map(({ label, value }) => (
                        <div
                          key={label}
                          className="rounded-xl px-3 py-2 sm:py-2.5 border flex sm:block items-center gap-2 sm:gap-0"
                          style={{ background: '#f7f8f3', borderColor: '#e8ede6' }}
                        >
                          <p
                            className="text-[10px] font-bold uppercase tracking-widest sm:mb-1 shrink-0"
                            style={{ color: '#1a5c38' }}
                          >
                            {label}
                          </p>
                          <p className="text-sm font-semibold text-gray-800">{value}</p>
                        </div>
                      ))}
                    </div>

                    {/* Program tags */}
                    {uni.programs?.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {uni.programs.map((p, j) => (
                          <span
                            key={j}
                            className="text-xs px-2.5 py-1 rounded-full border font-medium"
                            style={{
                              background: '#f0faf4',
                              borderColor: '#b6e8ca',
                              color: '#1a5c38',
                            }}
                          >
                            {p}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
