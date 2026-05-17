'use client';

import { useEffect, useState } from 'react';
import { incrementStat } from '@/lib/stats';
import { auth } from '@/lib/firebase';
import Link from 'next/link';

export default function SopGenerator() {
  const [form, setForm] = useState({
    name: '', degree: '', cgpa: '', university: '', field: '', goals: '', achievements: '',
  });
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [creditsRemaining, setCreditsRemaining] = useState<number | null>(null);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError('');
  };

  useEffect(() => {
    if (!successMessage) return;
    const t = window.setTimeout(() => setSuccessMessage(''), 5000);
    return () => window.clearTimeout(t);
  }, [successMessage]);

  const requiredFilled = form.name && form.degree && form.cgpa && form.university && form.field;

  const generateSop = async () => {
    if (!requiredFilled) { setError('Please fill in all required fields.'); return; }
    setLoading(true); setError(''); setSuccessMessage(''); setResult(''); setShowUpgrade(false);

    try {
      const user = auth.currentUser;
      if (!user) { setError('You must be logged in to generate a SOP.'); return; }
      const token = await user.getIdToken();

      const res = await fetch('/api/sop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.error === 'limit_reached') { setShowUpgrade(true); setError(data.message); }
        else setError(data?.error || 'Failed to generate your SOP. Please try again.');
      } else {
        setResult(data.result);
        setCreditsRemaining(data.credits_remaining);
        setSuccessMessage('Your SOP has been generated successfully!');
        incrementStat('sopsGenerated');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const inputCls = `w-full bg-[#0f1117] border border-white/10 text-white placeholder-slate-600
    px-3.5 py-2.5 rounded-xl text-sm focus:outline-none focus:border-indigo-500 focus:ring-1
    focus:ring-indigo-500 transition mt-1.5`;

  const labelCls = `block text-[11px] font-bold text-slate-400 uppercase tracking-widest`;

  return (
    <div className="min-h-screen bg-[#0f1117]">
      <div className="max-w-4xl mx-auto px-4 py-6 md:py-8">

        {/* Header */}
        <div className="mb-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">SOP Generator</h1>
              <p className="text-slate-400 text-sm mt-1">
                Create a compelling Statement of Purpose for your university application.
              </p>
            </div>
            {creditsRemaining !== null && !showUpgrade && (
              <div className="shrink-0 flex items-center gap-1.5 bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold px-3 py-1.5 rounded-full">
                ✨ {creditsRemaining} generation{creditsRemaining !== 1 ? 's' : ''} left
              </div>
            )}
          </div>

          {successMessage && (
            <div className="mt-4 flex items-center justify-between gap-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-sm rounded-xl px-4 py-3">
              <div className="flex items-center gap-2"><span>✅</span> {successMessage}</div>
              <button onClick={() => setSuccessMessage('')} className="text-emerald-400 hover:text-emerald-200 transition text-xs font-semibold">
                Dismiss
              </button>
            </div>
          )}
        </div>

        {/* Form card */}
        <div className="rounded-2xl bg-[#1a1d27] border border-white/5 p-5 md:p-6 mb-5">
          <h2 className="text-white font-semibold text-xs uppercase tracking-widest mb-5">Your Details</h2>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Left col */}
            <div className="space-y-4">
              <div>
                <label className={labelCls}>Full Name <span className="text-red-400">*</span></label>
                <input name="name" value={form.name} onChange={handleChange}
                  placeholder="e.g. Aisha Khan" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Completed Degree <span className="text-red-400">*</span></label>
                <input name="degree" value={form.degree} onChange={handleChange}
                  placeholder="e.g. BS Computer Science" className={inputCls} />
                <p className="text-[11px] text-slate-600 mt-1">The degree you have already completed</p>
              </div>
              <div>
                <label className={labelCls}>CGPA <span className="text-red-400">*</span></label>
                <input name="cgpa" value={form.cgpa} onChange={handleChange}
                  placeholder="e.g. 3.8 / 4.0" className={inputCls} />
              </div>
            </div>

            {/* Right col */}
            <div className="space-y-4">
              <div>
                <label className={labelCls}>Target University <span className="text-red-400">*</span></label>
                <input name="university" value={form.university} onChange={handleChange}
                  placeholder="e.g. ETH Zurich" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Field of Study <span className="text-red-400">*</span></label>
                <input name="field" value={form.field} onChange={handleChange}
                  placeholder="e.g. Artificial Intelligence" className={inputCls} />
                <p className="text-[11px] text-slate-600 mt-1">The program you are applying to</p>
              </div>
            </div>
          </div>

          {/* Textareas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mt-5">
            <div>
              <label className={labelCls}>Career Goals</label>
              <textarea name="goals" value={form.goals} onChange={handleChange} rows={5}
                placeholder="Describe your future goals and why you want this program."
                className={`${inputCls} resize-none`} />
            </div>
            <div>
              <label className={labelCls}>Achievements / Projects</label>
              <textarea name="achievements" value={form.achievements} onChange={handleChange} rows={5}
                placeholder="List your relevant achievements, awards, or projects."
                className={`${inputCls} resize-none`} />
            </div>
          </div>

          {/* Error */}
          {error && !showUpgrade && (
            <div className="mt-4 flex items-start gap-2 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-xl px-4 py-3">
              <span>⚠️</span> {error}
            </div>
          )}

          {/* Upgrade banner */}
          {showUpgrade && (
            <div className="mt-4 bg-gradient-to-r from-indigo-600 to-violet-600 rounded-xl p-4 flex items-center justify-between gap-4">
              <div>
                <p className="font-bold text-white text-sm">You've used all your free generations 🚀</p>
                <p className="text-indigo-200 text-xs mt-0.5">
                  Upgrade to Pro — PKR 800/month for unlimited SOPs and all features
                </p>
              </div>
              <Link href="/checkout"
                className="shrink-0 bg-white text-indigo-600 hover:bg-indigo-50 text-sm font-bold px-4 py-2 rounded-lg transition">
                Upgrade →
              </Link>
            </div>
          )}

          {/* Generate button */}
          <button onClick={generateSop} disabled={loading || showUpgrade || !requiredFilled}
            className="mt-5 w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed
              text-white font-bold py-3.5 rounded-xl transition flex items-center justify-center gap-2 text-sm">
            {loading ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                </svg>
                Generating your SOP…
              </>
            ) : '✨ Generate SOP'}
          </button>

          {!requiredFilled && !loading && (
            <p className="text-center text-[11px] text-slate-600 mt-2">
              Fill in all required fields (*) to generate
            </p>
          )}
        </div>

        {/* Result */}
        {result && (
          <div className="rounded-2xl bg-[#1a1d27] border border-white/5 p-5 md:p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-white font-semibold text-xs uppercase tracking-widest">
                Generated Statement of Purpose
              </h2>
              <div className="flex items-center gap-2">
                <button onClick={handleCopy}
                  className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border transition
                    bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 hover:text-white">
                  {copied ? '✅ Copied!' : '📋 Copy'}
                </button>
                <Link href="/sop-history"
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg border bg-indigo-500/10 border-indigo-500/20 text-indigo-300 hover:bg-indigo-500/20 transition">
                  View History →
                </Link>
              </div>
            </div>

            {/* SOP text */}
            <div className="bg-[#0f1117] border border-white/5 rounded-xl p-5">
              <p className="text-slate-300 text-sm leading-8 whitespace-pre-wrap font-light">
                {result}
              </p>
            </div>

            <div className="mt-4 flex items-center justify-between">
              <p className="text-xs text-slate-600">
                Review and personalise before submitting to your university.
              </p>
              <button onClick={handleCopy}
                className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition">
                {copied ? 'Copied ✅' : 'Copy to clipboard →'}
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
