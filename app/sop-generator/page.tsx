'use client';

import { useEffect, useState, useMemo } from 'react';
import { incrementStat } from '@/lib/stats';
import { auth } from '@/lib/firebase';
import Link from 'next/link';

export default function SopGenerator() {
  const [form, setForm] = useState({
    name:             '',
    degree:           '',
    cgpa:             '',
    university:       '',
    field:            '',
    goals:            '',
    achievements:     '',
    experience:       '',
    researchInterest: '',
    whyUniversity:    '',   // NEW — most impactful optional field
  });

  const [result,           setResult]           = useState('');
  const [loading,          setLoading]          = useState(false);
  const [error,            setError]            = useState('');
  const [successMessage,   setSuccessMessage]   = useState('');
  const [creditsRemaining, setCreditsRemaining] = useState<number | null>(null);
  const [showUpgrade,      setShowUpgrade]      = useState(false);
  const [copied,           setCopied]           = useState(false);

  // Word count for generated SOP
  const wordCount = useMemo(() => {
    if (!result) return 0;
    return result.trim().split(/\s+/).filter(Boolean).length;
  }, [result]);

  const wordCountColor =
    wordCount >= 580 && wordCount <= 680 ? 'text-[#2d9e7a]' :
    wordCount > 0                        ? 'text-[#c47d0a]' :
                                           'text-gray-400';

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError('');
  };

  useEffect(() => {
    if (!successMessage) return;
    const t = window.setTimeout(() => setSuccessMessage(''), 5000);
    return () => window.clearTimeout(t);
  }, [successMessage]);

  const requiredFilled =
    form.name && form.degree && form.cgpa && form.university && form.field;

  const generateSop = async () => {
    if (!requiredFilled) { setError('Please fill in all required fields.'); return; }
    setLoading(true);
    setError('');
    setSuccessMessage('');
    setResult('');
    setShowUpgrade(false);

    try {
      const user = auth.currentUser;
      if (!user) { setError('You must be logged in to generate a SOP.'); return; }
      const token = await user.getIdToken();

      const res = await fetch('/api/sop', {
        method:  'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.error === 'limit_reached') {
          setShowUpgrade(true);
          setError(data.message);
        } else {
          setError(data?.error || 'Failed to generate your SOP. Please try again.');
        }
      } else {
        setResult(data.result);
        setCreditsRemaining(data.credits_remaining);
        setSuccessMessage('Your SOP has been generated successfully!');
        incrementStat('sopsGenerated');
        // Scroll to result smoothly
        setTimeout(() => {
          document.getElementById('sop-result')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
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

  /* ── Shared styles ─────────────────────────────────────────────────────── */
  const inputCls = `w-full bg-white border border-gray-200 text-gray-800 placeholder-gray-300
    px-4 py-3 rounded-xl text-sm focus:outline-none focus:border-[#2d9e7a] focus:ring-2
    focus:ring-[#2d9e7a]/10 transition mt-1.5`;

  const labelCls   = `block text-[11px] font-bold text-[#2d9e7a] uppercase tracking-widest`;
  const hintCls    = `text-[11px] text-gray-400 mt-1.5 ml-1 leading-4`;
  const sectionCls = `text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 mt-1`;

  return (
    <div
      className="min-h-screen bg-[#f5f5f0]"
      style={{ fontFamily: "'Segoe UI', system-ui, sans-serif" }}
    >
      {/* ── Page Header ─────────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-gray-100 px-6 py-5">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <span className="inline-flex items-center gap-1.5 bg-[#f0faf6] border border-[#b6e8d4] text-[#2d9e7a] text-[11px] font-semibold uppercase tracking-widest px-3 py-1 rounded-full mb-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#f5a623] inline-block" />
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

        {/* ── Success banner ───────────────────────────────────────────────── */}
        {successMessage && (
          <div className="flex items-center justify-between gap-4 bg-[#f0faf6] border border-[#b6e8d4] text-[#1a7a5e] text-sm rounded-xl px-5 py-3.5 shadow-sm">
            <div className="flex items-center gap-2 font-medium">
              <span>✅</span> {successMessage}
            </div>
            <button
              onClick={() => setSuccessMessage('')}
              className="text-[#2d9e7a] hover:text-[#1a7a5e] transition text-xs font-bold"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* ── Form Card ───────────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

          {/* Card header */}
          <div className="px-6 py-4 border-b border-gray-100">
            <p className="text-[11px] font-bold text-[#2d9e7a] uppercase tracking-widest">Step 1</p>
            <h2 className="text-lg font-bold text-gray-900 mt-0.5">Your Details</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              The more specific you are, the better your SOP will be. Avoid vague answers.
            </p>
          </div>

          <div className="p-6 space-y-6">

            {/* ── Section A: Core Info ─────────────────────────────────────── */}
            <div>
              <p className={sectionCls}>A — Core Information</p>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

                {/* Left */}
                <div className="space-y-4">
                  <div>
                    <label className={labelCls}>
                      Full Name <span className="text-red-400">*</span>
                    </label>
                    <input
                      name="name"
                      value={form.name}
                      onChange={handleChange}
                      placeholder="e.g. Aisha Khan"
                      className={inputCls}
                    />
                  </div>

                  <div>
                    <label className={labelCls}>
                      Completed Degree <span className="text-red-400">*</span>
                    </label>
                    <input
                      name="degree"
                      value={form.degree}
                      onChange={handleChange}
                      placeholder="e.g. BS Computer Science"
                      className={inputCls}
                    />
                    <p className={hintCls}>The degree you have already completed or are completing</p>
                  </div>

                  <div>
                    <label className={labelCls}>
                      CGPA <span className="text-red-400">*</span>
                    </label>
                    <input
                      name="cgpa"
                      value={form.cgpa}
                      onChange={handleChange}
                      placeholder="e.g. 3.8 / 4.0"
                      className={inputCls}
                    />
                  </div>
                </div>

                {/* Right */}
                <div className="space-y-4">
                  <div>
                    <label className={labelCls}>
                      Target University <span className="text-red-400">*</span>
                    </label>
                    <input
                      name="university"
                      value={form.university}
                      onChange={handleChange}
                      placeholder="e.g. ETH Zurich"
                      className={inputCls}
                    />
                    <p className={hintCls}>Full official name of the university</p>
                  </div>

                  <div>
                    <label className={labelCls}>
                      Program / Field of Study <span className="text-red-400">*</span>
                    </label>
                    <input
                      name="field"
                      value={form.field}
                      onChange={handleChange}
                      placeholder="e.g. Cyber Security"
                      className={inputCls}
                    />
                    <p className={hintCls}>The Master's program you are applying to</p>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Section B: Background ────────────────────────────────────── */}
            <div>
              <p className={sectionCls}>B — Background & Experience</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

                <div>
                  <label className={labelCls}>Key Projects & Achievements</label>
                  <textarea
                    name="achievements"
                    value={form.achievements}
                    onChange={handleChange}
                    rows={4}
                    placeholder="e.g. Built an intrusion detection system that reduced false positives by 40%. Won 1st place at university hackathon."
                    className={`${inputCls} resize-none`}
                  />
                  <p className={hintCls}>Include outcomes and results — not just what you did, but what it achieved</p>
                </div>

                <div>
                  <label className={labelCls}>Work / Internship Experience</label>
                  <textarea
                    name="experience"
                    value={form.experience}
                    onChange={handleChange}
                    rows={4}
                    placeholder="e.g. 3-month internship at a fintech startup — worked on API security testing and wrote internal documentation on OWASP vulnerabilities."
                    className={`${inputCls} resize-none`}
                  />
                  <p className={hintCls}>Even short internships help — leave blank if none</p>
                </div>
              </div>
            </div>

            {/* ── Section C: Goals & University Fit ───────────────────────── */}
            <div>
              <p className={sectionCls}>C — Goals, Interests & University Fit</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

                <div>
                  <label className={labelCls}>Career Goals</label>
                  <textarea
                    name="goals"
                    value={form.goals}
                    onChange={handleChange}
                    rows={4}
                    placeholder="e.g. I want to work as a security architect at a tech company, designing zero-trust infrastructure. Long-term I'd like to lead a product security team."
                    className={`${inputCls} resize-none`}
                  />
                  <p className={hintCls}>Be specific — vague goals produce vague SOPs</p>
                </div>

                <div>
                  <label className={labelCls}>Research / Academic Interests</label>
                  <textarea
                    name="researchInterest"
                    value={form.researchInterest}
                    onChange={handleChange}
                    rows={4}
                    placeholder="e.g. I am particularly interested in adversarial machine learning, AI-based threat detection, and privacy-preserving computation."
                    className={`${inputCls} resize-none`}
                  />
                  <p className={hintCls}>Specific topics you want to study or research in the program</p>
                </div>
              </div>

              {/* Why this university — full width, highlighted as critical */}
              <div className="mt-5">
                <div className="flex items-center justify-between mb-1">
                  <label className={labelCls}>
                    Why This University?{' '}
                    <span className="normal-case text-[#f5a623] font-bold tracking-normal ml-1">
                      ⚠ Most important field
                    </span>
                  </label>
                </div>
                <textarea
                  name="whyUniversity"
                  value={form.whyUniversity}
                  onChange={handleChange}
                  rows={4}
                  placeholder={
                    `e.g. I chose Romanian-American University because its MS Cyber Security program has a strong focus on AI-driven threat detection, which aligns with my interest in ML-based security systems. I also noticed that Prof. [Name] leads research on network intrusion detection — an area I want to explore further. The program's industry partnerships with firms like [Company] would give me practical exposure alongside my academic work.`
                  }
                  className={`${inputCls} resize-none`}
                />

                {/* Warning if left empty */}
                {!form.whyUniversity.trim() ? (
                  <div className="mt-2 flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5">
                    <span className="text-amber-500 text-sm mt-0.5">⚠️</span>
                    <div>
                      <p className="text-[11px] font-bold text-amber-700">
                        Leaving this blank is the #1 reason SOPs sound fake
                      </p>
                      <p className="text-[11px] text-amber-600 mt-0.5 leading-4">
                        Without your real reason, the AI will generate a placeholder paragraph that you{' '}
                        <span className="font-bold">must rewrite</span> before submitting. Take 2 minutes to
                        research your university — find a professor, a module name, or a research lab — and
                        paste it here. It makes the single biggest difference to your SOP quality.
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-[11px] text-[#2d9e7a] font-bold mt-1.5 ml-1">
                    ✓ Great — this will make paragraph 5 genuinely compelling
                  </p>
                )}
              </div>
            </div>

            {/* ── Quality tip ──────────────────────────────────────────────── */}
            <div className="flex items-start gap-3 bg-[#f0faf6] border border-[#b6e8d4] rounded-xl px-4 py-3.5">
              <span className="text-lg mt-0.5">💡</span>
              <div>
                <p className="text-xs font-bold text-[#1a7a5e]">Three fields that transform your SOP</p>
                <p className="text-[11px] text-[#2d9e7a] mt-0.5 leading-4">
                  <span className="font-bold">Why This University</span> is the single most impactful field — 
                  without it, paragraph 5 will be a placeholder you must rewrite manually.{' '}
                  <span className="font-bold">Projects & Achievements</span> and{' '}
                  <span className="font-bold">Career Goals</span> with specific details are next. 
                  All three are optional but skipping them means a generic SOP.
                </p>
              </div>
            </div>

            {/* ── Error ────────────────────────────────────────────────────── */}
            {error && !showUpgrade && (
              <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3">
                <span>⚠️</span> {error}
              </div>
            )}

            {/* ── Upgrade banner ───────────────────────────────────────────── */}
            {showUpgrade && (
              <div className="rounded-xl border border-[#1a7a5e]/20 bg-[#1a3d2e] p-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="font-bold text-white text-sm flex items-center gap-1.5">
                      <span>⚡</span> You've used all your free generations
                    </p>
                    <p className="text-[#7ecfac] text-xs mt-0.5">
                      Upgrade to Pro — PKR 800/month for unlimited SOPs and all features
                    </p>
                  </div>
                  <Link
                    href="/checkout"
                    className="shrink-0 bg-[#f5a623] hover:bg-[#e0951a] text-white text-sm font-bold px-5 py-2.5 rounded-xl transition shadow-sm whitespace-nowrap"
                  >
                    Upgrade →
                  </Link>
                </div>
              </div>
            )}

            {/* ── Generate button ──────────────────────────────────────────── */}
            <button
              onClick={generateSop}
              disabled={loading || showUpgrade || !requiredFilled}
              className="w-full bg-[#2d9e7a] hover:bg-[#1a7a5e] disabled:opacity-40 disabled:cursor-not-allowed
                text-white font-bold py-3.5 rounded-xl transition flex items-center justify-center gap-2 text-sm shadow-sm"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  Writing your SOP… this takes 15–20 seconds
                </>
              ) : '✨ Generate My SOP'}
            </button>

            {!requiredFilled && !loading && (
              <p className="text-center text-[11px] text-gray-400">
                Fill in all required fields (*) to generate
              </p>
            )}
          </div>
        </div>

        {/* ── Result Card ─────────────────────────────────────────────────── */}
        {result && (
          <div
            id="sop-result"
            className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
          >
            {/* Card header */}
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold text-[#2d9e7a] uppercase tracking-widest">Step 2</p>
                <h2 className="text-lg font-bold text-gray-900 mt-0.5">
                  Generated Statement of Purpose
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 text-xs font-bold px-4 py-2 rounded-lg border transition
                    bg-gray-50 border-gray-200 text-gray-600 hover:border-[#2d9e7a]/40 hover:text-[#2d9e7a] hover:bg-[#f0faf6]"
                >
                  {copied ? '✅ Copied!' : '📋 Copy'}
                </button>
                <Link
                  href="/sop-history"
                  className="text-xs font-bold px-4 py-2 rounded-lg border bg-[#f0faf6] border-[#b6e8d4] text-[#2d9e7a] hover:bg-[#e0f5ec] transition"
                >
                  View History →
                </Link>
              </div>
            </div>

            {/* SOP body */}
            <div className="p-6">
              <div className="bg-[#f9f9f7] border border-gray-100 rounded-xl p-6">
                <p className="text-gray-700 text-sm leading-8 whitespace-pre-wrap">
                  {result}
                </p>
              </div>

              {/* Footer row */}
              <div className="mt-4 flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-4">
                  {/* Word count badge */}
                  <span className={`text-xs font-bold ${wordCountColor}`}>
                    {wordCount} words
                    {wordCount >= 580 && wordCount <= 680 && ' ✓ ideal length'}
                    {wordCount > 0 && (wordCount < 580 || wordCount > 680) && ' — review length'}
                  </span>
                  <p className="text-xs text-gray-400">
                    Personalise before submitting — don't submit AI output as-is.
                  </p>
                </div>
                <button
                  onClick={handleCopy}
                  className="text-xs font-bold text-[#2d9e7a] hover:text-[#1a7a5e] transition"
                >
                  {copied ? 'Copied ✅' : 'Copy to clipboard →'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Info cards ──────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            {
              icon:   '📝',
              title:  'Tailored Content',
              desc:   'Generated from your specific background, projects, and goals — not a generic template.',
              border: 'border-[#b6e8d4]',
            },
            {
              icon:   '⚡',
              title:  'Instant Generation',
              desc:   'A complete, professional SOP in under 20 seconds using Llama 3.3 70B.',
              border: 'border-purple-200',
            },
            {
              icon:   '✏️',
              title:  'Always Personalise',
              desc:   'Add your name to specific professors or labs at your target university before submitting.',
              border: 'border-[#f5a623]/30',
            },
          ].map((item) => (
            <div
              key={item.title}
              className={`bg-white rounded-2xl border shadow-sm p-5 flex flex-col items-start gap-3 ${item.border}`}
            >
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
