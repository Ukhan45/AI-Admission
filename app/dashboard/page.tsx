'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { getStats, type Stats } from '@/lib/stats';

const quickActions = [
  { label: 'Generate SOP',      href: '/sop-generator',      icon: '📝', desc: 'AI-powered SOP drafts' },
  { label: 'Analyze Profile',   href: '/profile-analyzer',   icon: '📊', desc: 'Get admission insights' },
  { label: 'Find Universities', href: '/university-finder',  icon: '🏛️', desc: 'Match to your profile' },
  { label: 'Scholarships',      href: '/scholarship-finder', icon: '🎓', desc: 'Find funding options' },
  { label: 'AI Chat',           href: '/chatbot',            icon: '💬', desc: 'Ask anything' },
  { label: 'Check Documents',   href: '/document-checker',   icon: '📂', desc: 'Verify your docs' },
];

function profileScore(stats: Stats) {
  let score = 0;
  if (stats.sopsGenerated > 0)        score += 30;
  if (stats.universitiesSearched > 0) score += 25;
  if (stats.profilesAnalyzed > 0)     score += 30;
  if (stats.chatMessages > 2)         score += 15;
  return score;
}

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

const FREE_LIMITS = { sop: 3, analyzer: 2, chat: 10 };

type Profile = {
  plan: string;
  sop_used: number;
  analyzer_used: number;
  chat_used: number;
};

type Generation = {
  id: string;
  type: string;
  university: string;
  created_at: string;
};

function RadialProgress({ score }: { score: number }) {
  const r = 54;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  return (
    <svg width="140" height="140" viewBox="0 0 140 140">
      <circle cx="70" cy="70" r={r} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="10" />
      <circle cx="70" cy="70" r={r} fill="none" stroke="white" strokeWidth="10"
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round" transform="rotate(-90 70 70)"
        style={{ transition: 'stroke-dashoffset 1s ease' }} />
      <text x="70" y="66" textAnchor="middle" fill="white" fontSize="28" fontWeight="800">{score}</text>
      <text x="70" y="84" textAnchor="middle" fill="rgba(255,255,255,0.6)" fontSize="11">out of 100</text>
    </svg>
  );
}

function LimitBar({ label, emoji, used, limit, isPro }: {
  label: string; emoji: string; used: number; limit: number; isPro: boolean;
}) {
  const pct = isPro ? 0 : Math.min((used / limit) * 100, 100);
  const left = limit - used;
  const exhausted = !isPro && left <= 0;
  const warn = !isPro && pct >= 70 && !exhausted;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-sm text-slate-300 flex items-center gap-2">
          <span>{emoji}</span>{label}
        </span>
        <span className={`text-xs font-bold tabular-nums ${exhausted ? 'text-red-400' : isPro ? 'text-emerald-400' : 'text-slate-200'}`}>
          {isPro ? '∞' : `${used} / ${limit}`}
        </span>
      </div>
      {!isPro && (
        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all duration-700 ${exhausted ? 'bg-red-500' : warn ? 'bg-amber-400' : 'bg-indigo-400'}`}
            style={{ width: `${pct}%` }} />
        </div>
      )}
      {!isPro && (
        <p className={`text-[11px] ${exhausted ? 'text-red-400' : 'text-slate-500'}`}>
          {exhausted ? '⚠️ Limit reached' : `${left} remaining`}
        </p>
      )}
    </div>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats>({
    sopsGenerated: 0, universitiesSearched: 0, profilesAnalyzed: 0, chatMessages: 0, lastActive: '',
  });
  const [profile, setProfile] = useState<Profile | null>(null);
  const [recentGenerations, setRecentGenerations] = useState<Generation[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setStats(getStats());
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) loadFirestoreData(user.uid);
    });
    return () => unsub();
  }, []);

  const loadFirestoreData = async (userId: string) => {
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
          gens.push({ id: doc.id, type: d.type, university: d.university, created_at: d.createdAt?.toDate?.()?.toISOString() || new Date().toISOString() });
        }
      });
      setRecentGenerations(gens);
    } catch (e) { console.error(e); }
  };

  const score = profileScore(stats);
  const isPro = profile?.plan === 'pro';
  const totalActions = stats.sopsGenerated + stats.universitiesSearched + stats.profilesAnalyzed + stats.chatMessages;

  const statCards = [
    { label: 'SOPs',         value: stats.sopsGenerated,        icon: '📝', href: '/sop-generator',     accent: '#6366f1' },
    { label: 'Uni Searches', value: stats.universitiesSearched, icon: '🏛️', href: '/university-finder',  accent: '#f59e0b' },
    { label: 'Analyses',     value: stats.profilesAnalyzed,     icon: '📊', href: '/profile-analyzer',   accent: '#10b981' },
    { label: 'AI Messages',  value: stats.chatMessages,         icon: '💬', href: '/chatbot',             accent: '#8b5cf6' },
  ];

  return (
    <div className="min-h-screen bg-[#0f1117]">
      <div className="max-w-5xl mx-auto px-4 py-6 md:py-8 space-y-5">

        {/* ── Header ── */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">Dashboard</h1>
            <p className="text-slate-400 text-sm mt-1">
              Last active: <span className="text-slate-300 font-medium">{formatLastActive(stats.lastActive)}</span>
            </p>
          </div>
          {profile && !isPro && (
            <Link href="/checkout"
              className="shrink-0 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold px-4 py-2 rounded-xl transition">
              Upgrade to Pro →
            </Link>
          )}
        </div>

        {/* ── Top row: Score + Plan ── */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">

          {/* Profile score */}
          <div className="md:col-span-2 relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800 p-6 flex items-center gap-5">
            <div className="absolute inset-0 opacity-20"
              style={{ backgroundImage: 'radial-gradient(circle at 80% 20%, #a78bfa 0%, transparent 60%)' }} />
            <RadialProgress score={score} />
            <div className="relative z-10">
              <p className="text-indigo-200 text-xs font-semibold uppercase tracking-widest mb-1">Profile Score</p>
              <p className="text-white text-sm leading-relaxed">
                {score === 0 && 'Start using tools to build your score'}
                {score > 0 && score < 50 && 'Good start! Keep exploring'}
                {score >= 50 && score < 85 && 'Great progress! Keep going 🚀'}
                {score >= 85 && 'Excellent profile! Well rounded ✅'}
              </p>
            </div>
          </div>

          {/* Plan & limits */}
          <div className="md:col-span-3 rounded-2xl bg-[#1a1d27] border border-white/5 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-white text-sm font-semibold">Your Plan</span>
                <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${isPro ? 'bg-violet-500/20 text-violet-300' : 'bg-white/10 text-slate-300'}`}>
                  {isPro ? '⚡ Pro' : 'Free'}
                </span>
              </div>
            </div>
            {profile && (
              <div className="space-y-3">
                <LimitBar label="SOP Generations"  emoji="📝" used={profile.sop_used}      limit={FREE_LIMITS.sop}      isPro={isPro} />
                <LimitBar label="Profile Analyses" emoji="📊" used={profile.analyzer_used} limit={FREE_LIMITS.analyzer} isPro={isPro} />
                <LimitBar label="AI Chat Messages" emoji="💬" used={profile.chat_used}     limit={FREE_LIMITS.chat}     isPro={isPro} />
              </div>
            )}
            {!isPro && (
              <Link href="/checkout"
                className="block w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-sm font-bold py-2.5 rounded-xl text-center transition">
                🚀 Upgrade — Unlock Everything
              </Link>
            )}
          </div>
        </div>

        {/* ── Stat cards ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {statCards.map((c) => (
            <Link href={c.href} key={c.label}>
              <div className="group rounded-2xl bg-[#1a1d27] border border-white/5 hover:border-white/15 p-4 transition cursor-pointer h-full">
                <div className="flex items-start justify-between mb-3">
                  <span className="text-2xl">{c.icon}</span>
                  <svg className="w-4 h-4 text-slate-600 group-hover:text-slate-400 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
                <p className="text-3xl font-bold text-white tabular-nums">{c.value}</p>
                <p className="text-xs text-slate-500 mt-1 font-medium">{c.label}</p>
              </div>
            </Link>
          ))}
        </div>

        {/* ── Quick Actions ── */}
        <div className="rounded-2xl bg-[#1a1d27] border border-white/5 p-5">
          <h2 className="text-white font-semibold text-sm mb-4 uppercase tracking-widest">Quick Actions</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            {quickActions.map((a) => (
              <Link href={a.href} key={a.label}>
                <div className="group rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/15 p-3 text-center transition cursor-pointer">
                  <div className="text-2xl mb-2">{a.icon}</div>
                  <p className="text-white text-xs font-semibold leading-tight">{a.label}</p>
                  <p className="text-slate-500 text-[10px] mt-0.5 hidden md:block">{a.desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* ── Activity + Recent ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* Activity */}
          <div className="rounded-2xl bg-[#1a1d27] border border-white/5 p-5">
            <h2 className="text-white font-semibold text-sm mb-4 uppercase tracking-widest">Activity</h2>
            {totalActions === 0 ? (
              <div className="text-center py-8">
                <p className="text-4xl mb-2">🌱</p>
                <p className="text-slate-400 text-sm">No activity yet.</p>
                <p className="text-slate-600 text-xs mt-1">Start exploring the tools!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {[
                  { label: 'SOPs Generated',      value: stats.sopsGenerated,        max: Math.max(stats.sopsGenerated, 5),        color: 'bg-indigo-500' },
                  { label: 'University Searches', value: stats.universitiesSearched, max: Math.max(stats.universitiesSearched, 5), color: 'bg-amber-500' },
                  { label: 'Profiles Analyzed',   value: stats.profilesAnalyzed,     max: Math.max(stats.profilesAnalyzed, 5),     color: 'bg-emerald-500' },
                  { label: 'Chat Messages',       value: stats.chatMessages,         max: Math.max(stats.chatMessages, 10),        color: 'bg-violet-500' },
                ].map((item) => (
                  <div key={item.label}>
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="text-slate-400">{item.label}</span>
                      <span className="text-white font-bold tabular-nums">{item.value}</span>
                    </div>
                    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div className={`h-full ${item.color} rounded-full transition-all duration-700`}
                        style={{ width: `${Math.min((item.value / item.max) * 100, 100)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Generations */}
          <div className="rounded-2xl bg-[#1a1d27] border border-white/5 p-5">
            <h2 className="text-white font-semibold text-sm mb-4 uppercase tracking-widest">Recent Generations</h2>
            {recentGenerations.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-4xl mb-2">📄</p>
                <p className="text-slate-400 text-sm">No generations yet.</p>
                <Link href="/sop-generator" className="text-indigo-400 text-xs mt-1 hover:text-indigo-300 transition inline-block">
                  Generate your first SOP →
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {recentGenerations.map((gen) => (
                  <div key={gen.id} className="flex items-center justify-between py-2.5 border-b border-white/5 last:border-0">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-lg shrink-0">{gen.type === 'sop' ? '📝' : gen.type === 'cv' ? '📄' : '✉️'}</span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-200 truncate">
                          {gen.type.toUpperCase()} — {gen.university || 'N/A'}
                        </p>
                        <p className="text-xs text-slate-500">
                          {new Date(gen.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] bg-white/5 text-slate-400 px-2 py-1 rounded-lg font-medium shrink-0 ml-2 border border-white/5">
                      {gen.type.toUpperCase()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
