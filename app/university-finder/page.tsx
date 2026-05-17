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
  High:   { badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30', dot: 'bg-emerald-400' },
  Medium: { badge: 'bg-amber-500/20 text-amber-300 border-amber-500/30',       dot: 'bg-amber-400'   },
  Low:    { badge: 'bg-red-500/20 text-red-300 border-red-500/30',             dot: 'bg-red-400'     },
};

const inputCls = `w-full bg-[#0f1117] border border-white/10 text-white placeholder-slate-600
  px-3.5 py-2.5 rounded-xl text-sm focus:outline-none focus:border-indigo-500 focus:ring-1
  focus:ring-indigo-500 transition`;
const labelCls = `block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5`;
const hintCls  = `text-[11px] text-slate-600 mt-1`;

export default function Universities() {
  const [filters, setFilters] = useState({
    degree: '', country: '', budget: '', ielts: '', gpa: '', intake: 'Any', ranking: 'Any',
  });
  const [results, setResults] = useState<University[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [searched, setSearched] = useState(false);
  const [sort, setSort]         = useState('default');

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSelect = (key: string, value: string) => setFilters({ ...filters, [key]: value });

  const search = async () => {
    if (!filters.degree || !filters.country) { setError('Please enter at least a Degree and Country.'); return; }
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

  const sorted     = sortResults(results, sort);
  const highCount  = results.filter(r => r.admissionChance === 'High').length;
  const medCount   = results.filter(r => r.admissionChance === 'Medium').length;
  const lowCount   = results.filter(r => r.admissionChance === 'Low').length;

  return (
    <div className="min-h-screen bg-[#0f1117]">
      <div className="max-w-4xl mx-auto px-4 py-6 md:py-8">

        {/* Header */}
        <div className="mb-7">
          <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">University Finder</h1>
          <p className="text-slate-400 text-sm mt-1">
            Search real universities based on your profile, budget, and preferences.
          </p>
        </div>

        {/* Filter card */}
        <div className="rounded-2xl bg-[#1a1d27] border border-white/5 p-5 md:p-6 mb-5">
          <h2 className="text-white font-semibold text-xs uppercase tracking-widest mb-5">Search Filters</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">

            <div>
              <label className={labelCls}>Field / Degree <span className="text-red-400">*</span></label>
              <input name="degree" value={filters.degree} onChange={handleChange}
                placeholder="e.g. Computer Science, MBA, Law" className={inputCls} />
              <p className={hintCls}>Your intended field of study</p>
            </div>

            <div>
              <label className={labelCls}>Country <span className="text-red-400">*</span></label>
              <input name="country" value={filters.country} onChange={handleChange}
                placeholder='e.g. Germany, Canada, or Any' className={inputCls} />
              <p className={hintCls}>Preferred country or "Any"</p>
            </div>

            <div>
              <label className={labelCls}>Monthly Budget (USD)</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-sm">$</span>
                <input name="budget" value={filters.budget} onChange={handleChange}
                  placeholder="e.g. 1000"
                  className={`${inputCls} pl-8`} />
              </div>
              <p className={hintCls}>Leave blank to see all options</p>
            </div>

            <div>
              <label className={labelCls}>IELTS Score</label>
              <input name="ielts" value={filters.ielts} onChange={handleChange}
                placeholder='e.g. 7.0  or  No IELTS' className={inputCls} />
              <p className={hintCls}>Type "No IELTS" if not taken</p>
            </div>

            <div>
              <label className={labelCls}>GPA / Academic Score</label>
              <input name="gpa" value={filters.gpa} onChange={handleChange}
                placeholder="e.g. 3.5 / 4.0 or 75%" className={inputCls} />
              <p className={hintCls}>Helps estimate admission chance</p>
            </div>

            {/* Intake */}
            <div>
              <label className={labelCls}>Intake Season</label>
              <div className="flex flex-wrap gap-1.5">
                {INTAKE_OPTIONS.map(opt => (
                  <button key={opt} onClick={() => handleSelect('intake', opt)}
                    className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition ${
                      filters.intake === opt
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-white/5 text-slate-400 border-white/10 hover:border-white/20 hover:text-slate-200'
                    }`}>
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
                  <button key={opt} onClick={() => handleSelect('ranking', opt)}
                    className={`text-xs px-4 py-1.5 rounded-lg border font-medium transition ${
                      filters.ranking === opt
                        ? 'bg-indigo-600 text-white border-indigo-600'
                        : 'bg-white/5 text-slate-400 border-white/10 hover:border-white/20 hover:text-slate-200'
                    }`}>
                    {opt}
                  </button>
                ))}
              </div>
              <p className={hintCls}>Filter by global university ranking</p>
            </div>

          </div>

          {error && (
            <div className="mt-4 flex items-start gap-2 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-xl px-4 py-3">
              <span>⚠️</span> {error}
            </div>
          )}

          <button onClick={search} disabled={loading}
            className="mt-5 w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed
              text-white font-bold py-3.5 rounded-xl transition flex items-center justify-center gap-2 text-sm">
            {loading ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                </svg>
                Searching universities…
              </>
            ) : '🔍 Find Universities'}
          </button>
        </div>

        {/* Empty state */}
        {searched && results.length === 0 && (
          <div className="text-center py-16 rounded-2xl bg-[#1a1d27] border border-white/5">
            <p className="text-4xl mb-3">🎓</p>
            <p className="text-slate-300 font-medium">No universities found.</p>
            <p className="text-slate-500 text-sm mt-1">Try adjusting your filters or broadening your country.</p>
          </div>
        )}

        {/* Results */}
        {results.length > 0 && (
          <div>
            {/* Summary bar */}
            <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
              <div className="flex items-center gap-3 flex-wrap">
                <p className="text-slate-400 text-sm">
                  <span className="text-white font-bold">{results.length}</span> universities found
                </p>
                <div className="flex items-center gap-1.5">
                  {highCount > 0 && (
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      {highCount} High
                    </span>
                  )}
                  {medCount > 0 && (
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      {medCount} Medium
                    </span>
                  )}
                  {lowCount > 0 && (
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/30">
                      {lowCount} Low
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 font-medium">Sort:</span>
                <select value={sort} onChange={e => setSort(e.target.value)}
                  className="text-xs bg-[#1a1d27] border border-white/10 text-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-indigo-500 transition">
                  {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            </div>

            {/* Cards */}
            <div className="space-y-3">
              {sorted.map((uni, i) => {
                const cfg = chanceCfg[uni.admissionChance] ?? chanceCfg.Medium;
                return (
                  <div key={i} className="rounded-2xl bg-[#1a1d27] border border-white/5 hover:border-white/10 p-5 transition">
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-0.5">
                          <h3 className="font-bold text-white text-base">{uni.name}</h3>
                          <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${cfg.badge}`}>
                            <span className={`inline-block w-1.5 h-1.5 rounded-full ${cfg.dot} mr-1`} />
                            {uni.admissionChance} Chance
                          </span>
                        </div>
                        <p className="text-sm text-slate-500">📍 {uni.city}, {uni.country}</p>
                      </div>
                      {uni.website && uni.website !== 'N/A' && (
                        <a href={uni.website.startsWith('http') ? uni.website : `https://${uni.website}`}
                          target="_blank" rel="noopener noreferrer"
                          className="shrink-0 text-xs font-semibold text-indigo-400 hover:text-indigo-300 border border-indigo-500/20 hover:border-indigo-500/40 px-3 py-1.5 rounded-lg transition bg-indigo-500/5">
                          Visit →
                        </a>
                      )}
                    </div>

                    <div className="grid grid-cols-3 gap-2 mb-3">
                      {[
                        { label: 'Tuition',        value: uni.tuition        },
                        { label: 'Language',        value: uni.language       },
                        { label: 'IELTS Required',  value: uni.ieltsRequired  },
                      ].map(({ label, value }) => (
                        <div key={label} className="bg-[#0f1117] border border-white/5 rounded-xl px-3 py-2.5">
                          <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">{label}</p>
                          <p className="text-sm font-semibold text-slate-200">{value}</p>
                        </div>
                      ))}
                    </div>

                    {uni.programs?.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {uni.programs.map((p, j) => (
                          <span key={j} className="text-xs bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 px-2.5 py-1 rounded-full">
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
