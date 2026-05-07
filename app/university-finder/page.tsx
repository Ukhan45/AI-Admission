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

export default function Universities() {
  const [filters, setFilters] = useState({
    degree: '',
    country: '',
    budget: '',
    ielts: '',
  });
  const [results, setResults] = useState<University[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searched, setSearched] = useState(false);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
    setError('');
  };

  const search = async () => {
    if (!filters.degree || !filters.country) {
      setError('Please enter at least a Degree and Country.');
      return;
    }
    setLoading(true);
    setError('');
    setResults([]);
    setSearched(false);

    try {
      const res = await fetch('/api/universities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(filters),
      });

      if (!res.ok) throw new Error('Failed to fetch universities');
      const data = await res.json();
      setResults(data.universities || []);
      setSearched(true);
      incrementStat('universitiesSearched');
    } catch (err) {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const badgeColor = (chance: string) => {
    if (chance === 'High')   return 'bg-emerald-100 text-emerald-800 border-emerald-300';
    if (chance === 'Medium') return 'bg-amber-100 text-amber-800 border-amber-300';
    return 'bg-red-100 text-red-800 border-red-300';
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">University Finder</h1>
        <p className="text-gray-500 mt-1 text-sm">
          Search real universities based on your profile, budget, and preferences.
        </p>
      </div>

      {/* Filter Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
        <div className="grid grid-cols-2 gap-5">

          {/* Degree */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Field / Degree <span className="text-red-400">*</span>
            </label>
            <input
              name="degree"
              value={filters.degree}
              onChange={handleChange}
              placeholder="e.g. Computer Science, MBA, Law"
              className="border border-gray-200 bg-slate-50 px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
            />
            <span className="text-[11px] text-gray-400">Your intended field of study</span>
          </div>

          {/* Country */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Country <span className="text-red-400">*</span>
            </label>
            <input
              name="country"
              value={filters.country}
              onChange={handleChange}
              placeholder='e.g. Germany, Canada, or Any'
              className="border border-gray-200 bg-slate-50 px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
            />
            <span className="text-[11px] text-gray-400">Preferred country or "Any"</span>
          </div>

          {/* Budget */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Monthly Budget (USD)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
              <input
                name="budget"
                value={filters.budget}
                onChange={handleChange}
                placeholder="e.g. 1000"
                className="w-full border border-gray-200 bg-slate-50 pl-7 pr-3 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              />
            </div>
            <span className="text-[11px] text-gray-400">Leave blank to see all options</span>
          </div>

          {/* IELTS */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              IELTS Score
            </label>
            <input
              name="ielts"
              value={filters.ielts}
              onChange={handleChange}
              placeholder='e.g. 7.0  or  No IELTS'
              className="border border-gray-200 bg-slate-50 px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
            />
            <span className="text-[11px] text-gray-400">Type "No IELTS" if not taken</span>
          </div>

          {/* Error */}
          {error && (
            <div className="col-span-2 flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
              <span>⚠️</span> {error}
            </div>
          )}

          {/* Button */}
          <button
            type="button"
            onClick={search}
            disabled={loading}
            className="col-span-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
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
      </div>

      {/* Results */}
      {searched && results.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <p className="text-4xl mb-3">🎓</p>
          <p className="text-sm">No universities found for your criteria. Try adjusting your filters.</p>
        </div>
      )}

      {results.length > 0 && (
        <div>
          <p className="text-sm text-gray-500 mb-4">
            Found <span className="font-semibold text-gray-800">{results.length}</span> universities matching your profile
          </p>
          <div className="grid gap-4">
            {results.map((uni, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 hover:shadow-md transition">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-gray-900 text-base">{uni.name}</h3>
                      <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${badgeColor(uni.admissionChance)}`}>
                        {uni.admissionChance} Chance
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mt-0.5">📍 {uni.city}, {uni.country}</p>
                  </div>
                  {uni.website && uni.website !== 'N/A' && (
                    <a
                      href={uni.website.startsWith('http') ? uni.website : `https://${uni.website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 text-xs text-blue-600 hover:text-blue-800 border border-blue-200 hover:border-blue-400 px-3 py-1.5 rounded-lg transition"
                    >
                      Visit →
                    </a>
                  )}
                </div>

                <div className="mt-4 grid grid-cols-3 gap-3">
                  <div className="bg-slate-50 rounded-lg px-3 py-2">
                    <p className="text-[10px] text-gray-400 uppercase font-semibold tracking-wide">Tuition</p>
                    <p className="text-sm font-semibold text-gray-800 mt-0.5">{uni.tuition}</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg px-3 py-2">
                    <p className="text-[10px] text-gray-400 uppercase font-semibold tracking-wide">Language</p>
                    <p className="text-sm font-semibold text-gray-800 mt-0.5">{uni.language}</p>
                  </div>
                  <div className="bg-slate-50 rounded-lg px-3 py-2">
                    <p className="text-[10px] text-gray-400 uppercase font-semibold tracking-wide">IELTS Required</p>
                    <p className="text-sm font-semibold text-gray-800 mt-0.5">{uni.ieltsRequired}</p>
                  </div>
                </div>

                {uni.programs?.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {uni.programs.map((p, j) => (
                      <span key={j} className="text-xs bg-blue-50 text-blue-700 border border-blue-100 px-2.5 py-1 rounded-full">
                        {p}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}