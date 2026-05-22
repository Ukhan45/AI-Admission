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

/* ── UniQuest verdict colours ── */
const verdictConfig = {
  Safe:   { badge: 'bg-[#f0faf6] text-[#1a7a5e] border-[#b6e8d4]',   bar: 'bg-[#2d9e7a]' },
  Target: { badge: 'bg-[#fff8ed] text-[#c47d0a] border-[#f5a623]/30', bar: 'bg-[#f5a623]' },
  Reach:  { badge: 'bg-purple-50 text-purple-600 border-purple-200',   bar: 'bg-purple-400' },
};

const impactConfig = {
  High:   'bg-red-50 text-red-500 border border-red-200',
  Medium: 'bg-[#fff8ed] text-[#c47d0a] border border-[#f5a623]/30',
  Low:    'bg-gray-100 text-gray-500 border border-gray-200',
};

function ScoreRing({ score }: { score: number }) {
  const color = score >= 70 ? '#2d9e7a' : score >= 45 ? '#f5a623' : '#ef4444';
  const r = 54;
  const circ = 2 * Math.PI * r;
  const dash = (score / 100) * circ;
  return (
    <div className="relative w-36 h-36 mx-auto">
      <svg viewBox="0 0 120 120" className="w-36 h-36 -rotate-90">
        <circle cx="60" cy="60" r={r} fill="none" stroke="#f0f0ee" strokeWidth="10" />
        <circle cx="60" cy="60" r={r} fill="none" stroke={color} strokeWidth="10"
          strokeDasharray={`${dash} ${circ - dash}`} strokeLinecap="round"
          style={{ transition: 'stroke-dasharray 1s ease' }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold text-gray-900">{score}</span>
        <span className="text-xs text-gray-400">/ 100</span>
      </div>
    </div>
  );
}

const inputCls = `w-full bg-white border border-gray-200 text-gray-800 placeholder-gray-300
  px-3.5 py-2.5 rounded-xl text-sm focus:outline-none focus:border-[#2d9e7a] focus:ring-2
  focus:ring-[#2d9e7a]/10 transition`;
const labelCls = `block text-[11px] font-bold text-[#2d9e7a] uppercase tracking-widest mb-1.5`;
const hintCls  = `text-[11px] text-gray-400 mt-1`;

export default function ProfileAnalyzer() {
  const [form, setForm] = useState({
    cgpa: '', degree: '', ielts: '', budget: '', country: '', field: '', level: 'MS', matric: '', inter: '',
  });
  const [result, setResult]             = useState<AnalysisResult | null>(null);
  const [error, setError]               = useState('');
  const [loading, setLoading]           = useState(false);
  const [limitReached, setLimitReached] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError('');
  };

  const analyze = async () => {
    const missing = form.level === 'MS'
      ? !form.cgpa || !form.degree || !form.budget || !form.country
      : !form.matric || !form.inter || !form.degree || !form.budget || !form.country;
    if (missing) { setError('Please fill in all required fields.'); return; }

    setLoading(true); setError(''); setResult(null);
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) { setError('You must be logged in.'); return; }

      const res = await fetch('/api/analyzer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(form),
      });
      const data = await res.json();

      if (res.status === 402) { setLimitReached(true); return; }
      if (!res.ok) { setError(data.error || 'Analysis failed. Please try again.'); return; }

      setResult(data.result);
      incrementStat('profilesAnalyzed');
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f5f0]" style={{ fontFamily: "'Segoe UI', system-ui, sans-serif" }}>

      {/* ── Page Header ── */}
      <div className="bg-white border-b border-gray-100 px-6 py-5">
        <div className="max-w-5xl mx-auto">
          <span className="inline-flex items-center gap-1.5 bg-[#f0faf6] border border-[#b6e8d4] text-[#2d9e7a] text-[11px] font-semibold uppercase tracking-widest px-3 py-1 rounded-full mb-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[#f5a623] inline-block"></span>
            Admissions Tools
          </span>
          <h1 className="text-2xl font-bold text-gray-900">Profile Analyzer</h1>
          <p className="text-sm text-gray-400 mt-0.5">Get a personalized competitiveness score, university matches, and improvement roadmap.</p>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-6">

        {/* ── Upgrade banner — UniQuest dark green "Unlock Pro" style ── */}
        {limitReached && (
          <div className="bg-[#1a3d2e] rounded-2xl p-5 mb-6 border border-[#1a7a5e]/20">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-bold text-white flex items-center gap-1.5">
                  <span>⚡</span> You've reached your free analysis limit
                </p>
                <p className="text-[#7ecfac] text-sm mt-1">Upgrade to Pro for unlimited analyses and all features.</p>
                <ul className="mt-2 space-y-1">
                  {['Unlimited Profile Analyses', 'Unlimited SOP Generations', 'Unlimited AI Chat'].map(f => (
                    <li key={f} className="text-xs text-[#7ecfac] flex items-center gap-1.5">
                      <span className="text-[#2d9e7a]">✓</span> {f}
                    </li>
                  ))}
                </ul>
              </div>
              <Link href="/checkout"
                className="shrink-0 bg-[#f5a623] hover:bg-[#e0951a] text-white font-bold text-sm px-5 py-2.5 rounded-xl transition whitespace-nowrap">
                Upgrade →
              </Link>
            </div>
          </div>
        )}

        {/* ── Form Card ── */}
        {!limitReached && (
          <div className="rounded-2xl bg-white border border-gray-100 shadow-sm overflow-hidden mb-6">

            {/* Card header */}
            <div className="px-6 py-4 border-b border-gray-100">
              <p className="text-[11px] font-bold text-[#2d9e7a] uppercase tracking-widest">Step 1</p>
              <h2 className="text-lg font-bold text-gray-900 mt-0.5">Your Academic Profile</h2>
            </div>

            <div className="p-5 md:p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">

                <div>
                  <label className={labelCls}>Applying For</label>
                  <select name="level" value={form.level} onChange={handleChange} className={inputCls}>
                    <option value="MS">MS (Masters)</option>
                    <option value="BS">BS (Undergraduate)</option>
                  </select>
                  <p className={hintCls}>Select whether you're applying for BS or MS</p>
                </div>

                {form.level === 'MS' ? (
                  <div>
                    <label className={labelCls}>CGPA <span className="text-red-400">*</span></label>
                    <input name="cgpa" value={form.cgpa} onChange={handleChange} placeholder="e.g. 3.8" className={inputCls} />
                    <p className={hintCls}>Out of 4.0 scale</p>
                  </div>
                ) : (
                  <>
                    <div>
                      <label className={labelCls}>Matric % <span className="text-red-400">*</span></label>
                      <input name="matric" value={form.matric} onChange={handleChange} placeholder="e.g. 85" className={inputCls} />
                      <p className={hintCls}>Percentage (0–100)</p>
                    </div>
                    <div>
                      <label className={labelCls}>Intermediate % <span className="text-red-400">*</span></label>
                      <input name="inter" value={form.inter} onChange={handleChange} placeholder="e.g. 80" className={inputCls} />
                      <p className={hintCls}>Percentage (0–100)</p>
                    </div>
                  </>
                )}

                <div>
                  <label className={labelCls}>Degree <span className="text-red-400">*</span></label>
                  <input name="degree" value={form.degree} onChange={handleChange}
                    placeholder={form.level === 'MS' ? 'e.g. BS Software Engineering' : 'e.g. Pre-Engineering'}
                    className={inputCls} />
                  <p className={hintCls}>Your completed degree</p>
                </div>

                <div>
                  <label className={labelCls}>Field of Interest</label>
                  <input name="field" value={form.field} onChange={handleChange}
                    placeholder="e.g. Cyber Security, AI" className={inputCls} />
                  <p className={hintCls}>What you want to study</p>
                </div>

                <div>
                  <label className={labelCls}>IELTS Score</label>
                  <input name="ielts" value={form.ielts} onChange={handleChange}
                    placeholder="e.g. 7.0 (leave blank if not taken)" className={inputCls} />
                  <p className={hintCls}>Leave blank if not taken</p>
                </div>

                <div>
                  <label className={labelCls}>Monthly Budget (USD) <span className="text-red-400">*</span></label>
                  <input name="budget" value={form.budget} onChange={handleChange}
                    placeholder="e.g. 1000" className={inputCls} />
                  <p className={hintCls}>Amount in USD per month</p>
                </div>

                <div>
                  <label className={labelCls}>Preferred Country <span className="text-red-400">*</span></label>
                  <input name="country" value={form.country} onChange={handleChange}
                    placeholder="e.g. Germany or Any" className={inputCls} />
                  <p className={hintCls}>Type "Any" for global results</p>
                </div>
              </div>

              {error && (
                <div className="mt-4 flex items-start gap-2 bg-red-50 border border-red-200 text-red-500 text-sm rounded-xl px-4 py-3">
                  <span>⚠️</span> {error}
                </div>
              )}

              {/* Analyze button — UniQuest primary green CTA */}
              <button onClick={analyze} disabled={loading}
                className="mt-5 w-full bg-[#2d9e7a] hover:bg-[#1a7a5e] disabled:opacity-40 disabled:cursor-not-allowed
                  text-white font-bold py-3.5 rounded-xl transition flex items-center justify-center gap-2 text-sm shadow-sm">
                {loading ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                    </svg>
                    Analyzing your profile…
                  </>
                ) : '🔍 Analyze My Profile'}
              </button>
            </div>
          </div>
        )}

        {/* ── Results ── */}
        {result && (
          <div className="space-y-4">

            {/* Score + Verdict */}
            <div className="rounded-2xl bg-white border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100">
                <p className="text-[11px] font-bold text-[#2d9e7a] uppercase tracking-widest">Step 2</p>
                <h2 className="text-lg font-bold text-gray-900 mt-0.5">Analysis Result</h2>
              </div>
              <div className="p-5 md:p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                  <div className="text-center">
                    <p className="text-gray-400 text-xs uppercase tracking-widest mb-4">Competitiveness Score</p>
                    <ScoreRing score={result.overall_score} />
                  </div>
                  <div className="space-y-4">
                    <p className="text-gray-600 text-sm leading-relaxed italic border-l-2 border-[#2d9e7a] pl-3">
                      "{result.verdict}"
                    </p>
                    <div>
                      <p className="text-[11px] font-bold text-[#2d9e7a] uppercase tracking-widest mb-2">Strengths</p>
                      <ul className="space-y-1.5">
                        {result.strengths.map((s, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                            <span className="text-[#2d9e7a] mt-0.5 shrink-0">✓</span> {s}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <p className="text-[11px] font-bold text-red-400 uppercase tracking-widest mb-2">Weaknesses</p>
                      <ul className="space-y-1.5">
                        {result.weaknesses.map((w, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                            <span className="text-red-400 mt-0.5 shrink-0">✗</span> {w}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Universities */}
            <div className="rounded-2xl bg-white border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100">
                <p className="text-[11px] font-bold text-[#2d9e7a] uppercase tracking-widest">Matches</p>
                <h2 className="text-lg font-bold text-gray-900 mt-0.5">🏛️ University Matches</h2>
              </div>
              <div className="p-5 md:p-6 space-y-3">
                {result.universities.map((uni, i) => {
                  const vc = verdictConfig[uni.verdict] ?? verdictConfig.Target;
                  return (
                    <div key={i} className="bg-[#f9f9f7] border border-gray-100 rounded-xl p-4 hover:border-[#b6e8d4] transition">
                      <div className="flex items-start justify-between mb-2 gap-3">
                        <div>
                          <p className="font-semibold text-gray-900 text-sm">{uni.name}</p>
                          <p className="text-xs text-gray-400">{uni.country}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-sm font-bold text-gray-900 tabular-nums">{uni.match}%</span>
                          <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${vc.badge}`}>
                            {uni.verdict}
                          </span>
                        </div>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mb-3">
                        <div className={`h-full rounded-full ${vc.bar}`}
                          style={{ width: `${uni.match}%`, transition: 'width 1s ease' }} />
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-xs text-gray-400">
                        <span>Min CGPA: <strong className="text-gray-700">{uni.requirement_cgpa}</strong></span>
                        <span>Tuition: <strong className="text-gray-700">{uni.tuition}</strong></span>
                        <span>IELTS: <strong className="text-gray-700">{uni.ielts_required}</strong></span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Countries */}
            <div className="rounded-2xl bg-white border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100">
                <p className="text-[11px] font-bold text-[#2d9e7a] uppercase tracking-widest">Destinations</p>
                <h2 className="text-lg font-bold text-gray-900 mt-0.5">🌍 Recommended Countries</h2>
              </div>
              <div className="p-5 md:p-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {result.countries.map((c, i) => (
                    <div key={i} className="bg-[#f9f9f7] border border-gray-100 rounded-xl p-4 hover:border-[#b6e8d4] transition">
                      <p className="font-bold text-gray-900 text-sm mb-1">{c.name}</p>
                      <p className="text-xs text-gray-500 mb-3 leading-relaxed">{c.why}</p>
                      <div className="flex gap-3 text-xs text-gray-400">
                        <span>💰 {c.avg_cost}</span>
                        <span>🌍 IELTS: {c.ielts_needed}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Improvements */}
            <div className="rounded-2xl bg-white border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100">
                <p className="text-[11px] font-bold text-[#2d9e7a] uppercase tracking-widest">Next Steps</p>
                <h2 className="text-lg font-bold text-gray-900 mt-0.5">🚀 Improvement Roadmap</h2>
              </div>
              <div className="p-5 md:p-6 space-y-3">
                {result.improvements.map((item, i) => (
                  <div key={i} className="flex items-start gap-4 bg-[#f9f9f7] border border-gray-100 rounded-xl p-4 hover:border-[#b6e8d4] transition">
                    <div className="w-7 h-7 rounded-full bg-[#f0faf6] border border-[#b6e8d4] text-[#2d9e7a] flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">
                      {i + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-700">{item.action}</p>
                      <p className="text-xs text-gray-400 mt-1">⏱ {item.timeline}</p>
                    </div>
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full shrink-0 ${impactConfig[item.impact]}`}>
                      {item.impact}
                    </span>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
