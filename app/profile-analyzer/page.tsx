'use client';

import { useState } from 'react';
import { incrementStat } from '@/lib/stats';
import { auth } from '@/lib/firebase';
import Link from 'next/link';

type University = {
  name: string;
  country: string;
  match: number;
  requirement_cgpa: string;
  tuition: string;
  ielts_required: string;
  verdict: 'Safe' | 'Target' | 'Reach';
};

type Improvement = {
  action: string;
  impact: 'High' | 'Medium' | 'Low';
  timeline: string;
};

type Country = {
  name: string;
  why: string;
  avg_cost: string;
  ielts_needed: string;
};

type AnalysisResult = {
  overall_score: number;
  verdict: string;
  strengths: string[];
  weaknesses: string[];
  universities: University[];
  improvements: Improvement[];
  countries: Country[];
};

const verdictConfig = {
  Safe:   { color: 'bg-emerald-100 text-emerald-700 border-emerald-300', dot: 'bg-emerald-500' },
  Target: { color: 'bg-blue-100 text-blue-700 border-blue-300',          dot: 'bg-blue-500' },
  Reach:  { color: 'bg-amber-100 text-amber-700 border-amber-300',       dot: 'bg-amber-500' },
};

const impactConfig = {
  High:   'bg-red-100 text-red-700',
  Medium: 'bg-amber-100 text-amber-700',
  Low:    'bg-gray-100 text-gray-600',
};

function ScoreRing({ score }: { score: number }) {
  const color = score >= 70 ? '#10b981' : score >= 45 ? '#3b82f6' : '#f59e0b';
  const r = 54;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;

  return (
    <div className="relative w-36 h-36 mx-auto">
      <svg viewBox="0 0 120 120" className="w-36 h-36 -rotate-90">
        <circle cx="60" cy="60" r={r} fill="none" stroke="#f1f5f9" strokeWidth="10" />
        <circle cx="60" cy="60" r={r} fill="none" stroke={color} strokeWidth="10"
          strokeDasharray={`${dash} ${circ - dash}`} strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 1s ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold text-gray-900">{score}</span>
        <span className="text-xs text-gray-500">/ 100</span>
      </div>
    </div>
  );
}

function UpgradeBanner() {
  return (
    <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-5 text-white mb-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="font-bold text-base">You've reached your free analysis limit 🚀</p>
          <p className="text-blue-100 text-sm mt-1">
            Upgrade to Pro for unlimited profile analyses, SOP generation, university searches, and AI chat.
          </p>
          <ul className="mt-2 space-y-1">
            {['Unlimited Profile Analyses', 'Unlimited SOP Generations', 'Unlimited AI Chat'].map(f => (
              <li key={f} className="text-xs text-blue-100 flex items-center gap-1.5">
                <span className="text-white">✓</span> {f}
              </li>
            ))}
          </ul>
        </div>
        <Link
          href="/checkout"
          className="shrink-0 bg-white text-blue-600 hover:bg-blue-50 font-bold text-sm px-5 py-3 rounded-xl transition whitespace-nowrap"
        >
          Upgrade to Pro →
        </Link>
      </div>
    </div>
  );
}

export default function ProfileAnalyzer() {
  const [form, setForm] = useState({
    cgpa: '', degree: '', ielts: '', budget: '', country: '', field: '', level: 'MS', matric: '', inter: '',
  });
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [limitReached, setLimitReached] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError('');
  };

  const analyze = async () => {
    if (form.level === 'MS') {
      if (!form.cgpa || !form.degree || !form.budget || !form.country) {
        setError('Please fill in all required fields.');
        return;
      }
    } else {
      if (!form.matric || !form.inter || !form.degree || !form.budget || !form.country) {
        setError('Please fill in all required fields.');
        return;
      }
    }
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) {
        setError('You must be logged in to analyze your profile.');
        return;
      }

      const res = await fetch('/api/analyzer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (res.status === 402 && data.error === 'limit_reached') {
        setLimitReached(true);
        return;
      }

      if (!res.ok) {
        setError(data.error || 'Analysis failed. Please try again.');
        return;
      }

      setResult(data.result);
      incrementStat('profilesAnalyzed');
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Profile Analyzer</h1>
        <p className="text-gray-500 mt-1 text-sm">
          Get a personalized competitiveness score, university matches, and improvement roadmap.
        </p>
      </div>

      {/* Upgrade banner — shown when limit reached */}
      {limitReached && <UpgradeBanner />}

      {/* Form */}
      {!limitReached && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Applying For</label>
              <select
                name="level"
                value={form.level}
                onChange={(e) => setForm({ ...form, level: e.target.value })}
                className="border border-gray-200 bg-slate-50 text-gray-900 placeholder:text-gray-400 px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              >
                <option value="MS">MS (Masters)</option>
                <option value="BS">BS (Undergraduate)</option>
              </select>
              <span className="text-[11px] text-gray-400">Select whether you're applying for BS or MS</span>
            </div>

            {/* Conditional: show CGPA for MS, percentages for BS */}
            {form.level === 'MS' ? (
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">CGPA <span className="text-red-400">*</span></label>
                <input
                  name="cgpa"
                  value={form.cgpa}
                  onChange={handleChange}
                  placeholder="e.g. 3.8"
                  className="border border-gray-200 bg-slate-50 text-gray-900 placeholder:text-gray-400 px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                />
                <span className="text-[11px] text-gray-400">Out of 4.0 scale</span>
              </div>
            ) : (
              <>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Matric Percentage <span className="text-red-400">*</span></label>
                  <input
                    name="matric"
                    value={form.matric}
                    onChange={handleChange}
                    placeholder="e.g. 85"
                    className="border border-gray-200 bg-slate-50 text-gray-900 placeholder:text-gray-400 px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                  />
                  <span className="text-[11px] text-gray-400">Percentage (0-100)</span>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Intermediate Percentage <span className="text-red-400">*</span></label>
                  <input
                    name="inter"
                    value={form.inter}
                    onChange={handleChange}
                    placeholder="e.g. 80"
                    className="border border-gray-200 bg-slate-50 text-gray-900 placeholder:text-gray-400 px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                  />
                  <span className="text-[11px] text-gray-400">Percentage (0-100)</span>
                </div>
              </>
            )}

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Degree <span className="text-red-400">*</span></label>
              <input
                name="degree"
                value={form.degree}
                onChange={handleChange}
                placeholder="e.g. BS Software Engineering"
                className="border border-gray-200 bg-slate-50 text-gray-900 placeholder:text-gray-400 px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              />
              <span className="text-[11px] text-gray-400">Your completed degree</span>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Field of Interest</label>
              <input
                name="field"
                value={form.field}
                onChange={handleChange}
                placeholder={`e.g. Cyber Security, AI`}
                className="border border-gray-200 bg-slate-50 text-gray-900 placeholder:text-gray-400 px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              />
              <span className="text-[11px] text-gray-400">{`What you want to study for ${form.level}`}</span>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">IELTS Score</label>
              <input
                name="ielts"
                value={form.ielts}
                onChange={handleChange}
                placeholder="e.g. 7.0 or No IELTS"
                className="border border-gray-200 bg-slate-50 text-gray-900 placeholder:text-gray-400 px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              />
              <span className="text-[11px] text-gray-400">Leave blank if not taken</span>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Monthly Budget ($) <span className="text-red-400">*</span></label>
              <input
                name="budget"
                value={form.budget}
                onChange={handleChange}
                placeholder="e.g. 1000"
                className="border border-gray-200 bg-slate-50 text-gray-900 placeholder:text-gray-400 px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              />
              <span className="text-[11px] text-gray-400">Amount in USD per month</span>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Preferred Country <span className="text-red-400">*</span></label>
              <input
                name="country"
                value={form.country}
                onChange={handleChange}
                placeholder="e.g. Germany or Any"
                className="border border-gray-200 bg-slate-50 text-gray-900 placeholder:text-gray-400 px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              />
              <span className="text-[11px] text-gray-400">Type Any for global results</span>
            </div>
          </div>

          {error && (
            <div className="mt-4 flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
              <span>⚠️</span> {error}
            </div>
          )}

          <button
            onClick={analyze}
            disabled={loading}
            className="mt-5 w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                </svg>
                Analyzing your profile…
              </>
            ) : '🔍 Analyze Profile'}
          </button>
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-6">
          {/* Score + Verdict */}
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6">
            <div className="grid grid-cols-2 gap-6 items-center">
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Competitiveness Score</p>
                <ScoreRing score={result.overall_score} />
              </div>
              <div>
                <p className="text-sm text-gray-700 leading-relaxed mb-4 italic">"{result.verdict}"</p>
                <div className="mb-3">
                  <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider mb-2">Strengths</p>
                  <ul className="space-y-1">
                    {result.strengths.map((s, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                        <span className="text-emerald-500 mt-0.5">✓</span> {s}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-xs font-semibold text-red-500 uppercase tracking-wider mb-2">Weaknesses</p>
                  <ul className="space-y-1">
                    {result.weaknesses.map((w, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                        <span className="text-red-400 mt-0.5">✗</span> {w}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Universities */}
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6">
            <h2 className="font-semibold text-gray-900 mb-4">🏛️ University Matches</h2>
            <div className="space-y-3">
              {result.universities.map((uni, i) => {
                const vc = verdictConfig[uni.verdict] ?? verdictConfig.Target;
                return (
                  <div key={i} className="border border-gray-100 rounded-xl p-4 hover:border-gray-200 transition">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="font-semibold text-gray-900 text-sm">{uni.name}</p>
                        <p className="text-xs text-gray-500">{uni.country}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-gray-700">{uni.match}% match</span>
                        <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${vc.color}`}>
                          {uni.verdict}
                        </span>
                      </div>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mb-3">
                      <div className={`h-full rounded-full ${vc.dot}`}
                        style={{ width: `${uni.match}%`, transition: 'width 1s ease' }} />
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs text-gray-500">
                      <span>📚 Min CGPA: <strong className="text-gray-700">{uni.requirement_cgpa}</strong></span>
                      <span>💰 Tuition: <strong className="text-gray-700">{uni.tuition}</strong></span>
                      <span>🌍 IELTS: <strong className="text-gray-700">{uni.ielts_required}</strong></span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Countries */}
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6">
            <h2 className="font-semibold text-gray-900 mb-4">🌍 Recommended Countries</h2>
            <div className="grid grid-cols-2 gap-3">
              {result.countries.map((c, i) => (
                <div key={i} className="bg-slate-50 border border-gray-100 rounded-xl p-4">
                  <p className="font-semibold text-gray-800 text-sm mb-1">{c.name}</p>
                  <p className="text-xs text-gray-500 mb-2">{c.why}</p>
                  <div className="flex gap-3 text-xs text-gray-500">
                    <span>💰 {c.avg_cost}</span>
                    <span>🌍 IELTS: {c.ielts_needed}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Improvements */}
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6">
            <h2 className="font-semibold text-gray-900 mb-4">🚀 Improvement Roadmap</h2>
            <div className="space-y-3">
              {result.improvements.map((item, i) => (
                <div key={i} className="flex items-start gap-4 p-4 bg-slate-50 rounded-xl border border-gray-100">
                  <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                    {i + 1}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-800">{item.action}</p>
                    <p className="text-xs text-gray-500 mt-0.5">⏱ {item.timeline}</p>
                  </div>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ${impactConfig[item.impact]}`}>
                    {item.impact} impact
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
