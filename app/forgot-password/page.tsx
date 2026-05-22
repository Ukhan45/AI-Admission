'use client';

import { useState } from 'react';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import Link from 'next/link';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  const handleReset = async () => {
    setError('');
    if (!email) {
      setError('Please enter your email address.');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address.');
      return;
    }

    setLoading(true);

    try {
      await sendPasswordResetEmail(auth, email);
      setSent(true);
    } catch (err: any) {
      const code = err?.code ?? '';
      if (code === 'auth/user-not-found') {
        // Don't reveal whether email exists — just show success
        setSent(true);
      } else if (code === 'auth/invalid-email') {
        setError('Please enter a valid email address.');
      } else if (code === 'auth/too-many-requests') {
        setError('Too many requests. Please wait a few minutes and try again.');
      } else {
        setError(err?.message || 'Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="min-h-screen bg-[#FFFBF5] flex items-center justify-center p-4">
        <div className="bg-white rounded-4xl shadow-[0_20px_50px_rgba(29,158,117,0.08)] border border-[#E1F5EE] p-8 w-full max-w-md text-center">
          <div className="text-5xl mb-4">📬</div>
          <h1 className="text-2xl font-bold text-[#085041] mb-2">Check your email</h1>
          <p className="text-[#5F5E5A] text-sm mb-6">
            If an account exists for{' '}
            <span className="font-semibold text-[#2C2C2A]">{email}</span>,
            we sent a password reset link. Open it and follow the instructions.
          </p>
          <p className="text-xs text-[#5F5E5A]">
            Didn&apos;t receive it? Check your spam folder or{' '}
            <button
              onClick={() => setSent(false)}
              className="text-[#1D9E75] hover:text-[#0F6E56] hover:underline"
            >
              send again
            </button>.
          </p>
          <Link href="/login" className="mt-6 inline-block text-sm text-[#1D9E75] hover:text-[#0F6E56] hover:underline">
            ← Back to sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FFFBF5] flex items-center justify-center p-4">
      <div className="bg-white rounded-4xl shadow-[0_20px_50px_rgba(29,158,117,0.08)] border border-[#E1F5EE] p-8 w-full max-w-md">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[#085041]">Forgot Password</h1>
          <p className="text-[#5F5E5A] text-sm mt-1">
            Enter your email and we&apos;ll send you a reset link.
          </p>
        </div>

        <div className="space-y-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-[#085041] uppercase tracking-wider">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(''); }}
              onKeyDown={(e) => e.key === 'Enter' && handleReset()}
              placeholder="you@email.com"
              className="border border-[#DDEDE8] bg-white px-3 py-2.5 rounded-2xl text-sm focus:outline-none focus:border-[#1D9E75] focus:ring-2 focus:ring-[#E1F5EE] transition"
            />
          </div>

          {error && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-2xl px-4 py-3">
              <span>⚠️</span> {error}
            </div>
          )}

          <button
            onClick={handleReset}
            disabled={loading}
            className="w-full bg-[#1D9E75] hover:bg-[#0F6E56] text-white font-semibold py-3 rounded-2xl transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                Sending…
              </>
            ) : (
              'Send Reset Link'
            )}
          </button>

          <p className="text-center text-sm text-[#5F5E5A]">
            Remember your password?{' '}
            <Link href="/login" className="text-[#1D9E75] hover:text-[#0F6E56] hover:underline font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
