'use client';

import { useState } from 'react';
import { incrementStat } from '@/lib/stats';
import { createBrowserClient } from '@supabase/ssr';

export default function SopGenerator() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [form, setForm] = useState({
    name: '',
    degree: '',
    cgpa: '',
    university: '',
    field: '',
    goals: '',
    achievements: '',
  });
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [creditsRemaining, setCreditsRemaining] = useState<number | null>(null);
  const [showUpgrade, setShowUpgrade] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError('');
  };

  const generateSop = async () => {
    if (!form.name || !form.degree || !form.cgpa || !form.university || !form.field) {
      setError('Please fill in all required fields.');
      return;
    }

    setLoading(true);
    setError('');
    setResult('');
    setShowUpgrade(false);

    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        setError('You must be logged in to generate a SOP.');
        return;
      }

      const res = await fetch('/api/sop', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
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
        incrementStat('sopsGenerated');
      }
    } catch (err: any) {
      setError(err?.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">SOP Generator</h1>
        <p className="text-gray-500 text-sm mt-1">
          Create a strong Statement of Purpose for your international university application.
        </p>
        {creditsRemaining !== null && (
          <div className="mt-2 inline-flex items-center gap-1.5 bg-blue-50 border border-blue-200 text-blue-700 text-xs font-medium px-3 py-1 rounded-full">
            ✨ {creditsRemaining} generation{creditsRemaining !== 1 ? 's' : ''} remaining
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Full Name</label>
              <input
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="e.g. Aisha Khan"
                className="w-full border border-gray-200 bg-slate-50 px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition mt-1"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Completed Degree
              </label>
              <input
                name="degree"
                value={form.degree}
                onChange={handleChange}
                placeholder="e.g. BS Computer Science"
                className="w-full border border-gray-200 bg-slate-50 px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition mt-1"
              />
              <p className="text-[11px] text-gray-400 mt-1">The degree you have already completed</p>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">CGPA</label>
              <input
                name="cgpa"
                value={form.cgpa}
                onChange={handleChange}
                placeholder="e.g. 3.8 / 4.0"
                className="w-full border border-gray-200 bg-slate-50 px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition mt-1"
              />
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Target University</label>
              <input
                name="university"
                value={form.university}
                onChange={handleChange}
                placeholder="e.g. ETH Zurich"
                className="w-full border border-gray-200 bg-slate-50 px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition mt-1"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Applying For (Field of Study)
              </label>
              <input
                name="field"
                value={form.field}
                onChange={handleChange}
                placeholder="e.g. Artificial Intelligence"
                className="w-full border border-gray-200 bg-slate-50 px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition mt-1"
              />
              <p className="text-[11px] text-gray-400 mt-1">The program you are applying to</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 mt-4">
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Career Goals</label>
            <textarea
              name="goals"
              value={form.goals}
              onChange={handleChange}
              rows={4}
              placeholder="Describe your future goals and why you want this program."
              className="w-full border border-gray-200 bg-slate-50 px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition mt-1"
            />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Achievements / Projects</label>
            <textarea
              name="achievements"
              value={form.achievements}
              onChange={handleChange}
              rows={4}
              placeholder="List your relevant achievements, awards, or projects."
              className="w-full border border-gray-200 bg-slate-50 px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition mt-1"
            />
          </div>
        </div>

        {error && (
          <div className="mt-4 flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
            <span>⚠️</span> {error}
          </div>
        )}

        {/* ✅ Fixed upgrade banner — single Pro plan only */}
        {showUpgrade && (
          <div className="mt-4 bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl p-4 flex items-center justify-between">
            <div>
              <p className="font-bold text-white text-sm">You've used all your free generations 🚀</p>
              <p className="text-blue-100 text-xs mt-0.5">
                Upgrade to Pro — PKR 800/month for unlimited SOP generations and all features
              </p>
            </div>
            <button
              onClick={() => window.location.href = '/checkout'}
              className="ml-4 bg-white text-blue-600 hover:bg-blue-50 text-sm font-bold px-4 py-2 rounded-lg transition whitespace-nowrap"
            >
              Upgrade to Pro →
            </button>
          </div>
        )}

        <button
          onClick={generateSop}
          disabled={loading || showUpgrade}
          className="mt-6 w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
              </svg>
              Generating SOP…
            </>
          ) : 'Generate SOP'}
        </button>
      </div>

      {result && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Generated Statement of Purpose</h2>
          <div className="prose max-w-none whitespace-pre-wrap text-gray-800">{result}</div>
        </div>
      )}
    </div>
  );
}
