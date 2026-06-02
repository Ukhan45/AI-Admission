'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { getStats, type Stats } from '@/lib/stats';

const FREE_LIMITS = { sop: 3, analyzer: 2, chat: 10 };

type ProfileRecord = { plan: string; sop_used: number; analyzer_used: number; chat_used: number };
type Generation    = { id: string; type: string; university: string | null; created_at: string };

const T = {
  bg:         '#FFFBF5',
  border:     '#E1F5EE',
  teal:       '#1D9E75',
  tealDark:   '#085041',
  tealDeep:   '#04342C',
  tealLight:  '#E1F5EE',
  amber:      '#EF9F27',
  amberLight: '#FAEEDA',
  muted:      '#888780',
  text:       '#2C2C2A',
  textSub:    '#5F5E5A',
  fontBase:   "'Nunito', sans-serif",
  fontHead:   "'Bricolage Grotesque', sans-serif",
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

function RadialProgress({ score }: { score: number }) {
  const r = 54, circ = 2 * Math.PI * r;
  const off = circ - (score / 100) * circ;
  return (
    <svg width="130" height="130" viewBox="0 0 140 140">
      <circle cx="70" cy="70" r={r} fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="10" />
      <circle cx="70" cy="70" r={r} fill="none" stroke="white" strokeWidth="10"
        strokeDasharray={circ} strokeDashoffset={off} strokeLinecap="round"
        transform="rotate(-90 70 70)" style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(.4,0,.2,1)' }} />
      <text x="70" y="65" textAnchor="middle" fill="white" fontSize="26" fontWeight="800">{score}</text>
      <text x="70" y="82" textAnchor="middle" fill="rgba(255,255,255,0.6)" fontSize="11">out of 100</text>
    </svg>
  );
}

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ background: '#fff', borderRadius: 22, border: `1.5px solid ${T.border}`, boxShadow: '0 2px 16px rgba(29,158,117,0.06)', overflow: 'hidden', ...style }}>
      {children}
    </div>
  );
}

function CardHeader({ label, title, right }: { label: string; title?: string; right?: React.ReactNode }) {
  return (
    <div style={{ padding: '18px 24px', borderBottom: `1.5px solid ${T.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <div>
        <p style={{ fontFamily: T.fontBase, fontSize: 11, fontWeight: 800, color: T.teal, textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 3px' }}>{label}</p>
        {title && <h3 style={{ fontFamily: T.fontHead, fontSize: 17, fontWeight: 700, color: T.tealDark, margin: 0 }}>{title}</h3>}
      </div>
      {right}
    </div>
  );
}

function LimitBar({ label, emoji, used, limit, isPro }: {
  label: string; emoji: string; used: number; limit: number; isPro: boolean;
}) {
  const pct       = isPro ? 0 : Math.min((used / limit) * 100, 100);
  const left      = limit - used;
  const exhausted = !isPro && left <= 0;
  const warn      = !isPro && pct >= 70 && !exhausted;
  return (
    <div style={{ background: T.tealLight, border: `1.5px solid #C0EDDE`, borderRadius: 14, padding: '14px 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontFamily: T.fontBase, fontSize: 13, fontWeight: 600, color: T.textSub, display: 'flex', alignItems: 'center', gap: 7 }}>
          <span>{emoji}</span>{label}
        </span>
        <span style={{ fontSize: 12, fontWeight: 800, fontFamily: T.fontBase, color: exhausted ? '#E24B4A' : isPro ? T.teal : T.tealDark }}>
          {isPro ? '∞ Unlimited' : `${used} / ${limit}`}
        </span>
      </div>
      {!isPro && (
        <>
          <div style={{ height: 7, background: 'rgba(255,255,255,0.6)', borderRadius: 999, overflow: 'hidden', marginBottom: 6 }}>
            <div style={{ height: '100%', borderRadius: 999, width: `${pct}%`, background: exhausted ? '#E24B4A' : warn ? T.amber : T.teal, transition: 'width 0.8s cubic-bezier(.4,0,.2,1)' }} />
          </div>
          <p style={{ fontSize: 11, color: exhausted ? '#E24B4A' : T.muted, fontFamily: T.fontBase }}>
            {exhausted ? '⚠️ Limit reached — upgrade to continue' : `${left} remaining`}
          </p>
        </>
      )}
      {isPro && <p style={{ fontSize: 11, color: T.muted, fontFamily: T.fontBase }}>Unlimited access on Pro</p>}
    </div>
  );
}

export default function ProfilePage() {
  const [stats,   setStats]   = useState<Stats>({ sopsGenerated: 0, universitiesSearched: 0, profilesAnalyzed: 0, chatMessages: 0, lastActive: '' });
  const [profile, setProfile] = useState<ProfileRecord | null>(null);
  const [recent,  setRecent]  = useState<Generation[]>([]);
  const [email,   setEmail]   = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&family=Bricolage+Grotesque:wght@500;600;700&display=swap';
    document.head.appendChild(link);
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

  const s: React.CSSProperties = { fontFamily: T.fontBase };

  return (
    <div style={{ minHeight: '100vh', background: T.bg, ...s }}>

      {/* ── PAGE HEADER ── */}
      <div style={{ background: '#fff', borderBottom: `1.5px solid ${T.border}`, padding: '20px 16px' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: T.tealLight, borderRadius: 50, padding: '4px 12px', marginBottom: 8 }}>
              <span style={{ color: T.amber, fontSize: 14 }}>◉</span>
              <span style={{ fontSize: 11, fontWeight: 800, color: T.teal, letterSpacing: '0.07em', textTransform: 'uppercase' }}>Account</span>
            </div>
            <h1 style={{ fontFamily: T.fontHead, fontSize: 24, fontWeight: 700, color: T.tealDark, margin: '0 0 4px' }}>My Profile</h1>
            <p style={{ fontSize: 13, color: T.muted, fontWeight: 600, margin: 0 }}>Your account, plan limits, and activity in one place.</p>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            {!isPro && (
              <Link href="/checkout" style={{ background: T.teal, color: '#fff', fontWeight: 800, fontSize: 14, padding: '10px 20px', borderRadius: 50, textDecoration: 'none', boxShadow: '0 4px 14px rgba(29,158,117,0.25)', transition: 'background 0.15s', whiteSpace: 'nowrap' }}
                onMouseEnter={e => (e.currentTarget.style.background = '#0F6E56')}
                onMouseLeave={e => (e.currentTarget.style.background = T.teal)}
              >Upgrade to Pro →</Link>
            )}
            <Link href="/dashboard" style={{ border: `1.5px solid ${T.border}`, color: T.textSub, fontWeight: 700, fontSize: 14, padding: '10px 18px', borderRadius: 50, textDecoration: 'none', background: '#fff', transition: 'border-color 0.15s, color 0.15s', whiteSpace: 'nowrap' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#9FE1CB'; e.currentTarget.style.color = T.teal; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.color = T.textSub; }}
            >Dashboard</Link>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* ── LOADING ── */}
        {loading && (
          <Card>
            <div style={{ padding: 48, textAlign: 'center', color: T.muted, fontSize: 14, fontWeight: 600 }}>Loading profile…</div>
          </Card>
        )}

        {/* ── NOT SIGNED IN ── */}
        {!loading && !email && (
          <Card>
            <div style={{ padding: '56px 24px', textAlign: 'center' }}>
              <div style={{ width: 72, height: 72, borderRadius: '50%', background: T.tealLight, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, margin: '0 auto 16px' }}>👤</div>
              <h2 style={{ fontFamily: T.fontHead, fontSize: 22, fontWeight: 700, color: T.tealDark, margin: '0 0 8px' }}>Please sign in to view your profile</h2>
              <p style={{ fontSize: 14, color: T.muted, marginBottom: 28 }}>You need to be logged in to manage your account.</p>
              <div style={{ display: 'flex', justifyContent: 'center', gap: 12 }}>
                <Link href="/login" style={{ background: T.teal, color: '#fff', fontWeight: 800, fontSize: 14, padding: '11px 24px', borderRadius: 14, textDecoration: 'none', boxShadow: '0 4px 14px rgba(29,158,117,0.2)' }}>Sign In</Link>
                <Link href="/signup" style={{ border: `1.5px solid ${T.border}`, color: T.textSub, fontWeight: 700, fontSize: 14, padding: '11px 22px', borderRadius: 14, textDecoration: 'none' }}>Sign Up</Link>
              </div>
            </div>
          </Card>
        )}

        {/* ── MAIN CONTENT ── */}
        {!loading && email && (
          <>
            {error && (
              <div style={{ background: '#FEF2F2', border: '1.5px solid #F7C1C1', color: '#B91C1C', fontSize: 13, fontWeight: 600, borderRadius: 14, padding: '12px 18px', display: 'flex', alignItems: 'center', gap: 8 }}>
                ⚠️ {error}
              </div>
            )}

            {/* ── ROW 1: Account info + Profile Score ── */}
            {/* Stacks on mobile, side-by-side on sm+ */}
            <div className="profile-row1" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 18 }}>

              {/* Account card */}
              <Card>
                <CardHeader label="Account Info" />
                <div style={{ padding: 24 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
                    <div style={{ width: 62, height: 62, borderRadius: 18, flexShrink: 0, background: `linear-gradient(135deg, ${T.tealDark}, ${T.teal})`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 24, fontWeight: 800, fontFamily: T.fontHead, boxShadow: '0 4px 16px rgba(29,158,117,0.25)' }}>
                      {email.charAt(0).toUpperCase()}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontFamily: T.fontHead, fontSize: 15, fontWeight: 700, color: T.tealDark, margin: '0 0 6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{email}</p>
                      <span style={{ display: 'inline-flex', alignItems: 'center', fontSize: 11, fontWeight: 800, padding: '4px 12px', borderRadius: 50, background: isPro ? T.tealLight : '#F1EFE8', color: isPro ? T.teal : T.muted, border: `1.5px solid ${isPro ? '#9FE1CB' : '#D3D1C7'}` }}>
                        {isPro ? '⚡ Pro Plan' : 'Free Plan'}
                      </span>
                    </div>
                  </div>
                  {/* Info grid — 1 col on mobile, 2 col on sm+ */}
                  <div className="info-grid" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12 }}>
                    {[
                      { label: 'Plan Status', value: isPro ? 'Pro — Unlimited' : 'Free Plan', sub: isPro ? 'Full access to all tools.' : 'Limited monthly usage.' },
                      { label: 'Last Active',  value: lastActive, sub: 'Based on tool usage.' },
                    ].map(({ label, value, sub }) => (
                      <div key={label} style={{ background: T.tealLight, border: `1.5px solid #C0EDDE`, borderRadius: 14, padding: 16 }}>
                        <p style={{ fontSize: 10, fontWeight: 800, color: T.teal, textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 6px' }}>{label}</p>
                        <p style={{ fontFamily: T.fontHead, fontSize: 14, fontWeight: 700, color: T.tealDark, margin: '0 0 4px' }}>{value}</p>
                        <p style={{ fontSize: 11, color: T.muted, margin: 0 }}>{sub}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>

              {/* Profile Score card */}
              <div style={{ borderRadius: 22, overflow: 'hidden', position: 'relative', minHeight: 220, background: `linear-gradient(145deg, ${T.tealDeep} 0%, ${T.tealDark} 50%, ${T.teal} 100%)`, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
                <div style={{ position: 'absolute', top: -30, right: -30, width: 130, height: 130, borderRadius: '50%', background: 'rgba(239,159,39,0.15)' }} />
                <div style={{ position: 'absolute', bottom: -20, left: -20, width: 90, height: 90, borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
                <div style={{ position: 'absolute', top: 16, left: 16 }}>
                  <span style={{ background: T.amber, color: '#412402', fontSize: 10, fontWeight: 800, padding: '4px 12px', borderRadius: 50, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Profile Score</span>
                </div>
                <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '56px 20px 24px' }}>
                  <RadialProgress score={score} />
                  <p style={{ color: '#9FE1CB', fontSize: 13, fontWeight: 600, marginTop: 12, lineHeight: 1.5 }}>
                    {score === 0  && 'Use tools to build your score'}
                    {score > 0  && score < 50  && 'Good start! Keep exploring 👍'}
                    {score >= 50 && score < 85 && 'Great progress! Keep going 🚀'}
                    {score >= 85 && 'Excellent — strong profile ✅'}
                  </p>
                </div>
              </div>
            </div>

            {/* ── ROW 2: Feature Limits + Recent Activity ── */}
            {/* Stacks on mobile, side-by-side on sm+ */}
            <div className="profile-row2" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 18 }}>

              {/* Feature Limits */}
              <Card>
                <CardHeader label="Usage" title="Feature Limits"
                  right={!isPro && (
                    <Link href="/checkout" style={{ fontSize: 12, fontWeight: 800, color: T.teal, textDecoration: 'none' }}>Upgrade →</Link>
                  )}
                />
                <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <LimitBar label="SOP Generations"  emoji="📝" used={profile?.sop_used ?? 0}      limit={FREE_LIMITS.sop}      isPro={isPro} />
                  <LimitBar label="Profile Analyses" emoji="📊" used={profile?.analyzer_used ?? 0} limit={FREE_LIMITS.analyzer} isPro={isPro} />
                  <LimitBar label="AI Chat Messages" emoji="💬" used={profile?.chat_used ?? 0}     limit={FREE_LIMITS.chat}     isPro={isPro} />
                  {!isPro && (
                    <Link href="/checkout" style={{ display: 'block', textAlign: 'center', padding: '13px', borderRadius: 14, background: T.teal, color: '#fff', fontWeight: 800, fontSize: 14, textDecoration: 'none', boxShadow: '0 4px 14px rgba(29,158,117,0.2)', marginTop: 4, transition: 'background 0.15s' }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#0F6E56')}
                      onMouseLeave={e => (e.currentTarget.style.background = T.teal)}
                    >🚀 Upgrade — Unlock Everything</Link>
                  )}
                </div>
              </Card>

              {/* Recent Activity */}
              <Card>
                <CardHeader label="History" title="Recent Activity" />
                {recent.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '48px 24px' }}>
                    <div style={{ width: 56, height: 56, borderRadius: '50%', background: T.tealLight, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, margin: '0 auto 12px' }}>📄</div>
                    <p style={{ fontSize: 14, fontWeight: 600, color: T.textSub, margin: '0 0 8px' }}>No activity yet</p>
                    <Link href="/sop-generator" style={{ fontSize: 12, fontWeight: 700, color: T.teal, textDecoration: 'none' }}>Generate your first SOP →</Link>
                  </div>
                ) : (
                  <div>
                    {recent.map((item) => (
                      <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px', borderBottom: `1px solid ${T.border}`, transition: 'background 0.15s' }}
                        onMouseEnter={e => (e.currentTarget.style.background = T.bg)}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      >
                        <div style={{ width: 42, height: 42, borderRadius: 13, background: T.tealLight, border: `1.5px solid #9FE1CB`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 19, flexShrink: 0 }}>
                          {item.type === 'sop' ? '📝' : item.type === 'cv' ? '📄' : '✉️'}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontFamily: T.fontHead, fontSize: 13, fontWeight: 700, color: T.tealDark, margin: '0 0 3px' }}>{genTypeLabel(item.type)}</p>
                          <p style={{ fontSize: 11, color: T.muted, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.university ?? 'No university specified'}</p>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                          <span style={{ fontSize: 10, fontWeight: 800, padding: '3px 10px', borderRadius: 50, background: T.tealLight, color: T.teal, border: `1.5px solid #9FE1CB` }}>
                            {item.type.toUpperCase()}
                          </span>
                          <span style={{ fontSize: 10, color: T.muted }}>
                            {new Date(item.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>

            {/* ── ROW 3: Quick Links ── */}
            {/* 2 cols on mobile, 4 cols on sm+ */}
            <Card>
              <CardHeader label="Explore" title="Quick Links" />
              <div style={{ padding: 20 }}>
                <div className="quicklinks-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
                  {[
                    { label: 'Generate SOP',      icon: '📝', href: '/sop-generator'    },
                    { label: 'Analyze Profile',   icon: '📊', href: '/profile-analyzer' },
                    { label: 'Find Universities', icon: '🏛️', href: '/university-finder' },
                    { label: 'AI Chat',           icon: '💬', href: '/chatbot'          },
                  ].map(({ label, icon, href }) => (
                    <Link key={href} href={href} style={{ textDecoration: 'none' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 10, cursor: 'pointer' }}
                        onMouseEnter={e => { const ic = (e.currentTarget as HTMLDivElement).querySelector('.ql-icon') as HTMLDivElement; if (ic) { ic.style.borderColor = T.teal; ic.style.background = T.tealLight; ic.style.transform = 'translateY(-3px)'; } }}
                        onMouseLeave={e => { const ic = (e.currentTarget as HTMLDivElement).querySelector('.ql-icon') as HTMLDivElement; if (ic) { ic.style.borderColor = '#9FE1CB'; ic.style.background = '#F5FDFB'; ic.style.transform = 'translateY(0)'; } }}
                      >
                        <div className="ql-icon" style={{ width: 56, height: 56, borderRadius: '50%', background: '#F5FDFB', border: `2px solid #9FE1CB`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, transition: 'all 0.18s' }}>{icon}</div>
                        <p style={{ fontSize: 13, fontWeight: 700, color: T.tealDark, margin: 0 }}>{label}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </Card>

            {/* ── UPGRADE BANNER ── */}
            {!isPro && (
              <div style={{ borderRadius: 22, overflow: 'hidden', position: 'relative', background: `linear-gradient(120deg, ${T.tealDeep} 0%, ${T.tealDark} 55%, ${T.teal} 100%)` }}>
                <div style={{ position: 'absolute', top: -50, right: -50, width: 200, height: 200, borderRadius: '50%', background: 'rgba(239,159,39,0.18)' }} />
                <div style={{ position: 'absolute', bottom: -30, left: '40%', width: 130, height: 130, borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
                {/* Stacks on mobile, row on sm+ */}
                <div className="upgrade-inner" style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', gap: 16, padding: '24px 20px' }}>
                  <div>
                    <div style={{ display: 'inline-block', background: T.amber, color: '#412402', fontSize: 10, fontWeight: 800, padding: '4px 12px', borderRadius: 50, marginBottom: 10, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Unlock Full Access</div>
                    <h3 style={{ fontFamily: T.fontHead, fontSize: 20, fontWeight: 700, color: '#fff', margin: '0 0 6px', lineHeight: 1.2 }}>Upgrade to Pro — PKR 800/month</h3>
                    <p style={{ fontSize: 13, color: '#9FE1CB', fontWeight: 600, margin: 0 }}>Unlimited SOPs, analyses, AI chat & more. 7-day free trial.</p>
                  </div>
                  <Link href="/checkout" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: T.amber, color: '#412402', fontWeight: 800, fontSize: 14, padding: '13px 28px', borderRadius: 14, textDecoration: 'none', boxShadow: '0 4px 18px rgba(239,159,39,0.35)', whiteSpace: 'nowrap', alignSelf: 'flex-start', transition: 'background 0.15s' }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#BA7517'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = T.amber; }}
                  >Upgrade Now →</Link>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <style>{`
        @media (min-width: 640px) {
          .profile-row1 { grid-template-columns: 2fr 1fr !important; }
          .profile-row2 { grid-template-columns: 1fr 1fr !important; }
          .info-grid    { grid-template-columns: 1fr 1fr !important; }
          .quicklinks-grid { grid-template-columns: repeat(4, 1fr) !important; }
          .upgrade-inner {
            flex-direction: row !important;
            align-items: center !important;
            justify-content: space-between !important;
            padding: 28px 32px !important;
          }
        }
      `}</style>
    </div>
  );
}