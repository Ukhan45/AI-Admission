'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { getStats, type Stats } from '@/lib/stats';

const FREE_LIMITS = { sop: 3, analyzer: 2, chat: 10 };

type ProfileRecord = {
  plan: string;
  sop_used: number;
  analyzer_used: number;
  chat_used: number;
};

type Generation = {
  id: string;
  type: string;
  university: string | null;
  created_at: string;
};

function formatLastActive(iso: string) {
  if (!iso) return 'No activity yet';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function profileScore(stats: Stats) {
  let score = 0;
  if (stats.sopsGenerated > 0)        score += 30;
  if (stats.universitiesSearched > 0) score += 25;
  if (stats.profilesAnalyzed > 0)     score += 30;
  if (stats.chatMessages > 2)         score += 15;
  return score;
}

function LimitBar({ label, emoji, used, limit, isPro }: {
  label: string; emoji: string; used: number; limit: number; isPro: boolean;
}) {
  const pct      = isPro ? 0 : Math.min((used / limit) * 100, 100);
  const left     = limit - used;
  const exhausted = !isPro && left <= 0;
  const warn      = !isPro && pct >= 70 && !exhausted;

  return (
    <div className="bg-[#0f1117] border border-white/5 rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-slate-300 flex items-center gap-2 font-medium">
          <span>{emoji}</span>{label}
        </span>
        <span className={`text-xs font-bold tabular-nums ${exhausted ? 'text-red-400' : isPro ? 'text-emerald-400' : 'text-slate-300'}`}>
          {isPro ? '∞ Unlimited' : `${used} / ${limit}`}
        </span>
      </div>
      {!isPro && (
        <>
          <div className="h-1.5 bg-white/5 rounded-full overflow-hidden mb-1.5">
            <div className={`h-full rounded-full transition-all duration-700 ${exhausted ? 'bg-red-500' : warn ? 'bg-amber-400' : 'bg-indigo-500'}`}
              style={{ width: `${pct}%` }} />
          </div>
          <p className={`text-[11px] ${exhausted ? 'text-red-400 font-semibold' : 'text-slate-600'}`}>
            {exhausted ? '⚠️ Limit reached — upgrade to continue' : `${left} remaining`}
          </p>
        </>
      )}
      {isPro && <p className="text-[11px] text-slate-600">Unlimited access on Pro</p>}
    </div>
  );
}

function RadialProgress({ score }: { score: number }) {
  const r    = 54;
  const circ = 2 * Math.PI * r;
  const off  = circ - (score / 100) * circ;
  return (
    <svg width="130" height="130" viewBox="0 0 140 140">
      <circle cx="70" cy="70" r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="10" />
      <circle cx="70" cy="70" r={r} fill="none" stroke="white" strokeWidth="10"
        strokeDasharray={circ} strokeDashoffset={off} strokeLinecap="round"
        transform="rotate(-90 70 70)" style={{ transition: 'stroke-dashoffset 1s ease' }} />
      <text x="70" y="65" textAnchor="middle" fill="white" fontSize="26" fontWeight="800">{score}</text>
      <text x="70" y="82" textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize="11">/ 100</text>
    </svg>
  );
}

export default function ProfilePage() {
  const [stats, setStats]     = useState<Stats>({ sopsGenerated: 0, universitiesSearched: 0, profilesAnalyzed: 0, chatMessages: 0, lastActive: '' });
  const [profile, setProfile] = useState<ProfileRecord | null>(null);
  const [recent, setRecent]   = useState<Generation[]>([]);
  const [email, setEmail]     = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    setStats(getStats());
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) { setEmail(user.email ?? null); loadProfile(user.uid); }
      else setLoading(false);
    });
    return () => unsub();
  }, []);

  const loadProfile = async (userId: string) => {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) {
        const d = userDoc.data();
        setProfile({ plan: d.plan, sop_used: d.sop_used ?? 0, analyzer_used: d.analyzer_used ?? 0, chat_used: d.chat_used ?? 0 });
      }
      const q = query(collection(db, 'generations'), where('user_id', '==', userId), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      const gens: Generation[] = [];
      snap.forEach((doc) => {
        if (gens.length < 5) {
          const d = doc.data();
          gens.push({ id: doc.id, type: d.type, university: d.university || null, created_at: d.createdAt?.toDate?.()?.toISOString() || new Date().toISOString() });
        }
      });
      setRecent(gens);
    } catch { setError('Unable to load profile. Please refresh.'); }
    finally  { setLoading(false); }
  };

  const score      = profileScore(stats);
  const isPro      = profile?.plan === 'pro';
  const lastActive = stats.lastActive ? formatLastActive(stats.lastActive) : 'No activity yet';

  const genTypeLabel = (t: string) =>
    t === 'sop' ? 'SOP Generation' : t === 'cv' ? 'CV Generation' : t === 'lor' ? 'LOR Generation' : 'Generation';

  return (
    <div className="min-h-screen bg-[#0f1117]">
      <div className="max-w-5xl mx-auto px-4 py-6 md:py-8">

        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-7">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">Profile</h1>
            <p className="text-slate-400 text-sm mt-1">Your account, plan limits, and activity in one place.</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {!isPro && (
              <Link href="/checkout"
                className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold px-4 py-2.5 rounded-xl transition">
                Upgrade to Pro →
              </Link>
            )}
            <Link href="/dashboard"
              className="bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 text-sm font-semibold px-4 py-2.5 rounded-xl transition">
              Dashboard
            </Link>
          </div>
        </div>

        {loading ? (
          <div className="rounded-2xl bg-[#1a1d27] border border-white/5 p-10 text-center text-slate-500 animate-pulse">
            Loading profile…
          </div>
        ) : !email ? (
          <div className="rounded-2xl bg-[#1a1d27] border border-white/5 p-10 text-center">
            <p className="text-lg font-semibold text-white mb-2">Please sign in to view your profile.</p>
            <p className="text-slate-400 text-sm mb-6">You need to be logged in to manage your account.</p>
            <div className="flex justify-center gap-3">
              <Link href="/login" className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold px-5 py-2.5 rounded-xl transition">Sign In</Link>
              <Link href="/signup" className="bg-white/5 border border-white/10 text-slate-300 text-sm font-semibold px-5 py-2.5 rounded-xl transition hover:bg-white/10">Sign Up</Link>
            </div>
          </div>
        ) : (
          <div className="space-y-4">

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-xl px-4 py-3">
                {error}
              </div>
            )}

            {/* Top row — Account + Score */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

              {/* Account card */}
              <div className="md:col-span-2 rounded-2xl bg-[#1a1d27] border border-white/5 p-5">
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-4">Account</p>
                <div className="flex items-center gap-4 mb-5">
                  <div className="w-14 h-14 rounded-2xl bg-indigo-500/20 border border-indigo-500/20 flex items-center justify-center text-2xl font-bold text-indigo-300 shrink-0">
                    {email.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-white font-semibold text-sm truncate">{email}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${isPro ? 'bg-violet-500/20 text-violet-300' : 'bg-white/10 text-slate-400'}`}>
                        {isPro ? '⚡ Pro Plan' : 'Free Plan'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-[#0f1117] border border-white/5 rounded-xl p-4">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Plan Status</p>
                    <p className="text-white font-semibold text-sm">{isPro ? 'Pro — Unlimited' : 'Free Plan'}</p>
                    <p className="text-slate-500 text-xs mt-1">{isPro ? 'Full access to all tools.' : 'Limited monthly usage.'}</p>
                  </div>
                  <div className="bg-[#0f1117] border border-white/5 rounded-xl p-4">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Last Active</p>
                    <p className="text-white font-semibold text-sm">{lastActive}</p>
                    <p className="text-slate-500 text-xs mt-1">Based on tool usage.</p>
                  </div>
                </div>
              </div>

              {/* Score card */}
              <div className="rounded-2xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800 p-5 flex flex-col items-center justify-center text-center relative overflow-hidden">
                <div className="absolute inset-0 opacity-20"
                  style={{ backgroundImage: 'radial-gradient(circle at 80% 20%, #a78bfa 0%, transparent 60%)' }} />
                <p className="text-[11px] font-bold text-indigo-200 uppercase tracking-widest mb-3 relative z-10">Profile Score</p>
                <div className="relative z-10">
                  <RadialProgress score={score} />
                </div>
                <p className="text-indigo-200 text-xs mt-3 relative z-10 leading-relaxed">
                  {score === 0  && 'Use tools to build your score'}
                  {score > 0  && score < 50  && 'Good start! Keep exploring'}
                  {score >= 50 && score < 85 && 'Great progress! Keep going 🚀'}
                  {score >= 85 && 'Excellent — strong profile ✅'}
                </p>
              </div>
            </div>

            {/* Middle row — Limits + Activity */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

              {/* Feature limits */}
              <div className="rounded-2xl bg-[#1a1d27] border border-white/5 p-5">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Feature Limits</p>
                  {!isPro && (
                    <Link href="/checkout" className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition">
                      Upgrade →
                    </Link>
                  )}
                </div>
                <div className="space-y-3">
                  <LimitBar label="SOP Generations"  emoji="📝" used={profile?.sop_used ?? 0}      limit={FREE_LIMITS.sop}      isPro={isPro} />
                  <LimitBar label="Profile Analyses"  emoji="📊" used={profile?.analyzer_used ?? 0} limit={FREE_LIMITS.analyzer} isPro={isPro} />
                  <LimitBar label="AI Chat Messages"  emoji="💬" used={profile?.chat_used ?? 0}     limit={FREE_LIMITS.chat}     isPro={isPro} />
                </div>
                {!isPro && (
                  <Link href="/checkout"
                    className="mt-4 block w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-sm font-bold py-2.5 rounded-xl text-center transition">
                    🚀 Upgrade — Unlock Everything
                  </Link>
                )}
              </div>

              {/* Recent Activity */}
              <div className="rounded-2xl bg-[#1a1d27] border border-white/5 p-5">
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-4">Recent Activity</p>
                {recent.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-3xl mb-2">📄</p>
                    <p className="text-slate-400 text-sm">No activity yet.</p>
                    <Link href="/sop-generator" className="text-indigo-400 text-xs mt-1 hover:text-indigo-300 transition inline-block">
                      Generate your first SOP →
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {recent.map((item) => (
                      <div key={item.id} className="bg-[#0f1117] border border-white/5 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-slate-200 text-sm font-medium">{genTypeLabel(item.type)}</p>
                          <p className="text-slate-500 text-xs truncate mt-0.5">{item.university ?? 'No university specified'}</p>
                        </div>
                        <span className="text-[10px] text-slate-600 shrink-0">
                          {new Date(item.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Quick links */}
            <div className="rounded-2xl bg-[#1a1d27] border border-white/5 p-5">
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-4">Quick Links</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: '📝 Generate SOP',      href: '/sop-generator'     },
                  { label: '📊 Analyze Profile',   href: '/profile-analyzer'  },
                  { label: '🏛️ Find Universities',  href: '/university-finder' },
                  { label: '💬 AI Chat',            href: '/chatbot'           },
                ].map(({ label, href }) => (
                  <Link key={href} href={href}
                    className="bg-[#0f1117] border border-white/5 hover:border-white/15 text-slate-300 hover:text-white text-sm font-medium px-4 py-3 rounded-xl transition text-center">
                    {label}
                  </Link>
                ))}
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}
