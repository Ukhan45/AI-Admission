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

  /* ── Shared input / label styles — UniQuest theme ── */
  const inputCls = `w-full bg-white border border-gray-200 text-gray-800 placeholder-gray-300
    px-4 py-3 rounded-xl text-sm focus:outline-none focus:border-[#2d9e7a] focus:ring-2
    focus:ring-[#2d9e7a]/10 transition mt-1.5`;
  const labelCls = `block text-[11px] font-bold text-[#2d9e7a] uppercase tracking-widest`;

  return (
    <div className="min-h-screen bg-[#f5f5f0]" style={{ fontFamily: "'Segoe UI', system-ui, sans-serif" }}>

      {/* ── Page Header — matches UniQuest "YOUR DASHBOARD" header style ── */}
      <div className="bg-white border-b border-gray-100 px-6 py-5">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            {/* Pill badge — matches "YOUR DASHBOARD" / "AI Tools" badge */}
            <span className="inline-flex items-center gap-1.5 bg-[#f0faf6] border border-[#b6e8d4] text-[#2d9e7a] text-[11px] font-semibold uppercase tracking-widest px-3 py-1 rounded-full mb-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#f5a623] inline-block"></span>
              AI Tools
            </span>
            <h1 className="text-2xl font-bold text-gray-900">SOP Generator</h1>
            <p className="text-sm text-gray-400 mt-0.5">
              Create a compelling Statement of Purpose for your university application.
            </p>
          </div>
          {creditsRemaining !== null && !showUpgrade && (
            <div className="shrink-0 flex items-center gap-1.5 bg-[#fff8ed] border border-[#f5a623]/30 text-[#c47d0a] text-xs font-bold px-4 py-2 rounded-full">
              ✨ {creditsRemaining} generation{creditsRemaining !== 1 ? 's' : ''} left
            </div>
          )}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-6 space-y-5">

        {/* Success message */}
        {successMessage && (
          <div className="flex items-center justify-between gap-4 bg-[#f0faf6] border border-[#b6e8d4] text-[#1a7a5e] text-sm rounded-xl px-5 py-3.5 shadow-sm">
            <div className="flex items-center gap-2 font-medium"><span>✅</span> {successMessage}</div>
            <button onClick={() => setSuccessMessage('')} className="text-[#2d9e7a] hover:text-[#1a7a5e] transition text-xs font-bold">
              Dismiss
            </button>
          </div>
        )}

        {/* ── Form Card — matches UniQuest white card with border ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

          {/* Card header — matches "Step" header style in UniQuest */}
          <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-[#2d9e7a] uppercase tracking-widest">Step 1</p>
              <h2 className="text-lg font-bold text-gray-900 mt-0.5">Your Details</h2>
            </div>
          </div>

          <div className="p-6">
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
                  <p className="text-[11px] text-gray-400 mt-1.5 ml-1">The degree you have already completed</p>
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
                  <p className="text-[11px] text-gray-400 mt-1.5 ml-1">The program you are applying to</p>
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
              <div className="mt-4 flex items-start gap-2 bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3">
                <span>⚠️</span> {error}
              </div>
            )}

            {/* Upgrade banner — matches UniQuest "Unlock Pro" dark green card style */}
            {showUpgrade && (
              <div className="mt-4 rounded-xl border border-[#1a7a5e]/20 bg-[#1a3d2e] p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-bold text-white text-sm flex items-center gap-1.5">
                      <span>⚡</span> You've used all your free generations
                    </p>
                    <p className="text-[#7ecfac] text-xs mt-0.5">Upgrade to Pro — PKR 800/month for unlimited SOPs and all features</p>
                  </div>
                  <Link href="/checkout"
                    className="shrink-0 bg-[#f5a623] hover:bg-[#e0951a] text-white text-sm font-bold px-5 py-2.5 rounded-xl transition shadow-sm whitespace-nowrap">
                    Upgrade →
                  </Link>
                </div>
              </div>
            )}

            {/* Generate button — matches UniQuest primary green CTA */}
            <button
              onClick={generateSop}
              disabled={loading || showUpgrade || !requiredFilled}
              className="mt-5 w-full bg-[#2d9e7a] hover:bg-[#1a7a5e] disabled:opacity-40 disabled:cursor-not-allowed
                text-white font-bold py-3.5 rounded-xl transition flex items-center justify-center gap-2 text-sm shadow-sm">
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
              <p className="text-center text-[11px] text-gray-400 mt-2">
                Fill in all required fields (*) to generate
              </p>
            )}
          </div>
        </div>

        {/* ── Result Card ── */}
        {result && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

            {/* Card header */}
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-[#2d9e7a] uppercase tracking-widest">Step 2</p>
                <h2 className="text-lg font-bold text-gray-900 mt-0.5">Generated Statement of Purpose</h2>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={handleCopy}
                  className="flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-lg border transition
                    bg-gray-50 border-gray-200 text-gray-600 hover:border-[#2d9e7a]/40 hover:text-[#2d9e7a] hover:bg-[#f0faf6]">
                  {copied ? '✅ Copied!' : '📋 Copy'}
                </button>
                <Link href="/sop-history"
                  className="text-xs font-bold px-4 py-2 rounded-lg border bg-[#f0faf6] border-[#b6e8d4] text-[#2d9e7a] hover:bg-[#e0f5ec] transition">
                  View History →
                </Link>
              </div>
            </div>

            {/* SOP text */}
            <div className="p-6">
              <div className="bg-[#f9f9f7] border border-gray-100 rounded-xl p-6">
                <p className="text-gray-700 text-sm leading-8 whitespace-pre-wrap">
                  {result}
                </p>
              </div>

              <div className="mt-4 flex items-center justify-between">
                <p className="text-xs text-gray-400">
                  Review and personalise before submitting to your university.
                </p>
                <button onClick={handleCopy}
                  className="text-xs font-bold text-[#2d9e7a] hover:text-[#1a7a5e] transition">
                  {copied ? 'Copied ✅' : 'Copy to clipboard →'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Info cards row — matches UniQuest stat/feature card style ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { icon: '📝', title: 'Tailored Content',   desc: 'Each SOP is uniquely generated based on your academic background and goals.', border: 'border-[#b6e8d4]' },
            { icon: '⚡', title: 'Instant Generation', desc: 'Get a complete, professional SOP in seconds using advanced AI.',               border: 'border-purple-200' },
            { icon: '✏️', title: 'Fully Editable',    desc: 'Copy and customize the output before submitting to your university.',          border: 'border-[#f5a623]/30' },
          ].map((item) => (
            <div key={item.title}
              className={`bg-white rounded-2xl border shadow-sm p-5 flex flex-col items-start gap-3 ${item.border}`}>
              {/* Circle icon — matches UniQuest icon circle style */}
              <div className="w-12 h-12 rounded-full bg-[#f0faf6] border border-[#b6e8d4] flex items-center justify-center text-2xl">
                {item.icon}
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900">{item.title}</h3>
                <p className="text-xs text-gray-400 mt-1 leading-5">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
