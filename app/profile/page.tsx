'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { getStats, type Stats } from '@/lib/stats';

const FREE_LIMITS = { sop: 3, analyzer: 2, chat: 10 };

const planLabels: Record<string, { label: string; color: string }> = {
  free:  { label: 'Free Plan',  color: 'bg-gray-100 text-gray-600' },
  basic: { label: 'Basic Plan', color: 'bg-blue-100 text-blue-700' },
  pro:   { label: 'Pro Plan',   color: 'bg-violet-100 text-violet-700' },
};

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
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`; 
  return `${Math.floor(hrs / 24)}d ago`;
}

function profileScore(stats: Stats) {
  let score = 0;
  if (stats.sopsGenerated > 0)         score += 30;
  if (stats.universitiesSearched > 0)  score += 25;
  if (stats.profilesAnalyzed > 0)      score += 30;
  if (stats.chatMessages > 2)          score += 15;
  return score;
}

function FeatureLimitRow({ label, emoji, used, limit, isPro }: { label: string; emoji: string; used: number; limit: number; isPro: boolean; }) {
  const percent = isPro ? 100 : Math.min((used / limit) * 100, 100);
  const left = limit - used;
  const isExhausted = !isPro && left <= 0;

  return (
    <div className="rounded-3xl border border-gray-100 bg-gray-50 p-4">
      <div className="flex items-center justify-between text-sm text-gray-700 mb-3">
        <span className="flex items-center gap-2 font-semibold">
          <span>{emoji}</span> {label}
        </span>
        <span className={`text-xs font-semibold ${isExhausted ? 'text-red-500' : 'text-gray-700'}`}>
          {isPro ? 'Unlimited' : `${used} / ${limit}`}
        </span>
      </div>

      {!isPro && (
        <>
          <div className="h-2 rounded-full bg-gray-200 overflow-hidden mb-2">
            <div
              className={`h-full rounded-full transition-all duration-700 ${
                percent >= 100 ? 'bg-red-500' : percent >= 70 ? 'bg-amber-500' : 'bg-blue-500'
              }`}
              style={{ width: `${percent}%` }}
            />
          </div>
          <p className={`text-[11px] ${isExhausted ? 'text-red-500 font-semibold' : 'text-gray-500'}`}>
            {isExhausted ? 'Limit reached — upgrade for more.' : `${left >= 0 ? left : 0} remaining`}
          </p>
        </>
      )}

      {isPro && (
        <p className="text-[11px] text-gray-400">Unlimited access on Pro.</p>
      )}
    </div>
  );
}

export default function ProfilePage() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [stats, setStats] = useState<Stats>({
    sopsGenerated: 0,
    universitiesSearched: 0,
    profilesAnalyzed: 0,
    chatMessages: 0,
    lastActive: '',
  });
  const [profile, setProfile] = useState<ProfileRecord | null>(null);
  const [recent, setRecent] = useState<Generation[]>([]);
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setStats(getStats());
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      const { data } = await supabase.auth.getSession();
      const session = data.session;
      if (!session?.user) {
        setLoading(false);
        return;
      }
      setEmail(session.user.email ?? null);

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('plan, sop_used, analyzer_used, chat_used')
        .eq('id', session.user.id)
        .single();

      if (profileError) {
        setError('Unable to load your profile details.');
      } else if (profileData) {
        setProfile(profileData as ProfileRecord);
      }

      const { data: recentData } = await supabase
        .from('generations')
        .select('id, type, university, created_at')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (recentData) {
        setRecent(recentData as Generation[]);
      }
    } catch (e) {
      setError('Unable to load profile page. Please refresh.');
    } finally {
      setLoading(false);
    }
  };

  const score = profileScore(stats);
  const isPro = profile?.plan === 'pro';
  const planInfo = planLabels[profile?.plan ?? 'free'];
  const lastActiveText = stats.lastActive ? formatLastActive(stats.lastActive) : 'No activity yet';

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Profile</h1>
          <p className="text-gray-500 mt-2 text-sm">Your account details, plan limits, and recent activity in one place.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link href="/checkout" className="inline-flex items-center rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700">
            Upgrade to Pro
          </Link>
          <Link href="/dashboard" className="inline-flex items-center rounded-2xl border border-gray-200 bg-white px-5 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50">
            Back to Dashboard
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="rounded-3xl border border-gray-200 bg-white p-10 text-center text-gray-500 shadow-sm">Loading profile details…</div>
      ) : !email ? (
        <div className="rounded-3xl border border-gray-200 bg-white p-10 text-center shadow-sm">
          <p className="text-lg font-semibold text-gray-900">Please sign in to view your profile.</p>
          <p className="mt-2 text-sm text-gray-500">You need to log in before you can manage your account and see usage details.</p>
          <div className="mt-6 flex justify-center gap-3 flex-wrap">
            <Link href="/login" className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 transition">Sign in</Link>
            <Link href="/signup" className="rounded-xl border border-gray-200 px-5 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition">Sign up</Link>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {error && (
            <div className="rounded-3xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
          )}

          <section className="grid gap-6 xl:grid-cols-[1.9fr_1.1fr]">
            <div className="rounded-3xl border border-gray-200 bg-white shadow-sm p-6">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-blue-50 text-3xl font-bold text-blue-600">
                    {email.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm uppercase tracking-[0.2em] text-gray-400">Account</p>
                    <h2 className="mt-2 text-2xl font-semibold text-gray-900">{email}</h2>
                    <p className="mt-2 text-sm text-gray-500">Manage your plan, limits, and AI admission activity.</p>
                  </div>
                </div>

                <div className="inline-flex items-center gap-3 rounded-full border border-gray-200 bg-gray-50 px-4 py-2 text-sm font-semibold text-gray-700">
                  <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
                  {planInfo.label}
                </div>
              </div>

              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <div className="rounded-3xl bg-gray-50 p-5">
                  <p className="text-xs uppercase tracking-[0.2em] text-gray-400">Plan status</p>
                  <p className="mt-3 text-lg font-semibold text-gray-900">{planInfo.label}</p>
                  <p className="mt-2 text-sm text-gray-500">{isPro ? 'Unlimited access to all tools.' : 'Free plan with monthly limits.'}</p>
                </div>
                <div className="rounded-3xl bg-gray-50 p-5">
                  <p className="text-xs uppercase tracking-[0.2em] text-gray-400">Last activity</p>
                  <p className="mt-3 text-lg font-semibold text-gray-900">{lastActiveText}</p>
                  <p className="mt-2 text-sm text-gray-500">Your recent tool usage is reflected here.</p>
                </div>
              </div>
            </div>

            <div className="rounded-3xl bg-linear-to-br from-blue-600 via-sky-600 to-cyan-500 p-6 text-white shadow-lg">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm uppercase tracking-[0.2em] text-blue-100">Profile score</p>
                  <h3 className="mt-3 text-4xl font-bold">{score}%</h3>
                  <p className="mt-3 text-sm text-blue-100">
                    {score === 0 && 'Start using the tools to raise your score.'}
                    {score > 0 && score < 50 && 'Nice start — use more features to improve.'}
                    {score >= 50 && score < 85 && 'Great progress — keep going.'}
                    {score >= 85 && 'Excellent work — your profile is strong.'}
                  </p>
                </div>
                <div className="relative h-24 w-24">
                  <svg viewBox="0 0 36 36" className="h-24 w-24 -rotate-90">
                    <circle cx="18" cy="18" r="15.9" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="3" />
                    <circle
                      cx="18" cy="18" r="15.9"
                      fill="none"
                      stroke="white"
                      strokeWidth="3"
                      strokeDasharray={`${score} ${100 - score}`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <span className="absolute inset-0 grid place-items-center text-lg font-semibold">{score}%</span>
                </div>
              </div>
            </div>
          </section>

          <section className="grid gap-6 xl:grid-cols-[1.6fr_1.4fr]">
            <div className="rounded-3xl border border-gray-200 bg-white shadow-sm p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Feature limits</h2>
                  <p className="mt-1 text-sm text-gray-500">Your current usage against monthly allowances.</p>
                </div>
                <Link href="/checkout" className="text-sm font-semibold text-blue-600 hover:text-blue-700">Upgrade plan</Link>
              </div>

              <div className="mt-6 space-y-4">
                <FeatureLimitRow label="SOP Generations" emoji="📝" used={profile?.sop_used ?? 0} limit={FREE_LIMITS.sop} isPro={isPro} />
                <FeatureLimitRow label="Profile Analyses" emoji="📊" used={profile?.analyzer_used ?? 0} limit={FREE_LIMITS.analyzer} isPro={isPro} />
                <FeatureLimitRow label="AI Chat Messages" emoji="💬" used={profile?.chat_used ?? 0} limit={FREE_LIMITS.chat} isPro={isPro} />
              </div>

              {!isPro && (
                <div className="mt-6 rounded-3xl bg-blue-50 p-4 text-sm text-blue-700">
                  <p className="font-semibold">Free plan reminder</p>
                  <p className="mt-2 text-sm text-blue-700">Upgrade to Pro to remove usage limits and keep working without interruption.</p>
                </div>
              )}
            </div>

            <div className="space-y-6">
              <div className="rounded-3xl border border-gray-200 bg-white shadow-sm p-6">
                <h2 className="text-xl font-semibold text-gray-900">Recent activity</h2>
                <p className="mt-1 text-sm text-gray-500">Your latest admissions actions.</p>

                {recent.length === 0 ? (
                  <div className="mt-6 rounded-3xl border border-dashed border-gray-200 bg-gray-50 p-6 text-center text-sm text-gray-500">
                    No recent actions yet. Use the tools below to start tracking your progress.
                  </div>
                ) : (
                  <div className="mt-6 space-y-3">
                    {recent.map((item) => (
                      <div key={item.id} className="rounded-3xl border border-gray-100 bg-gray-50 p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="text-sm font-semibold text-gray-900">{item.type === 'sop' ? 'SOP generation' : item.type === 'cv' ? 'CV generation' : item.type === 'lor' ? 'LOR generation' : 'Generation'}</p>
                            <p className="mt-1 text-sm text-gray-500">{item.university ?? 'No university specified'}</p>
                          </div>
                          <span className="text-xs uppercase text-gray-400">{new Date(item.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-3xl border border-gray-200 bg-white shadow-sm p-6">
                <h2 className="text-xl font-semibold text-gray-900">Quick links</h2>
                <div className="mt-5 grid gap-3">
                  <Link href="/sop-generator" className="rounded-2xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50">Generate SOP</Link>
                  <Link href="/profile-analyzer" className="rounded-2xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50">Analyze profile</Link>
                  <Link href="/university-finder" className="rounded-2xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50">Find universities</Link>
                  <Link href="/chatbot" className="rounded-2xl border border-gray-200 px-4 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50">Open AI chat</Link>
                </div>
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
