// app/dashboard/page.tsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { getStats, type Stats } from '@/lib/stats';
import OnboardingTour from '@/components/OnboardingTour';

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

type Profile = { sop_used: number; analyzer_used: number; chat_used: number; consultantNotes?: string; };
type Generation = { id: string; type: string; university: string; created_at: string };

function RadialProgress({ score }: { score: number }) {
  const r = 54, circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  return (
    <svg width="140" height="140" viewBox="0 0 140 140">
      <circle cx="70" cy="70" r={r} fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="10" />
      <circle cx="70" cy="70" r={r} fill="none" stroke="white" strokeWidth="10"
        strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
        transform="rotate(-90 70 70)"
        style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(.4,0,.2,1)' }} />
      <text x="70" y="66" textAnchor="middle" fill="white" fontSize="28" fontWeight="800">{score}</text>
      <text x="70" y="84" textAnchor="middle" fill="rgba(255,255,255,0.65)" fontSize="11">out of 100</text>
    </svg>
  );
}

function UsageCount({ label, emoji, used }: {
  label: string; emoji: string; used: number;
}) {
  return (
    <div className="flex items-center justify-between">
      <span style={{ fontSize: 13, color: '#5F5E5A', display: 'flex', alignItems: 'center', gap: 7, fontFamily: 'Nunito, sans-serif', fontWeight: 600 }}>
        <span>{emoji}</span>{label}
      </span>
      <span style={{ fontSize: 12, fontWeight: 800, fontFamily: 'Nunito, sans-serif', color: '#1D9E75' }}>
        {used} used
      </span>
    </div>
  );
}

function Card({ children, style, className }: { children: React.ReactNode; style?: React.CSSProperties; className?: string }) {
  return (
    <div className={className} style={{ background: '#fff', borderRadius: 20, border: '1.5px solid #E1F5EE', boxShadow: '0 2px 16px rgba(29,158,117,0.06)', overflow: 'hidden', ...style }}>
      {children}
    </div>
  );
}

function CardHeader({ label, title, right }: { label: string; title: string; right?: React.ReactNode }) {
  return (
    <div style={{ padding: '18px 24px', borderBottom: '1.5px solid #E1F5EE', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <div>
        <p style={{ fontSize: 11, fontWeight: 800, color: '#1D9E75', textTransform: 'uppercase', letterSpacing: '0.07em', fontFamily: 'Nunito, sans-serif', marginBottom: 3 }}>{label}</p>
        <h3 style={{ fontSize: 17, fontWeight: 800, color: '#085041', fontFamily: "'Bricolage Grotesque', sans-serif", margin: 0 }}>{title}</h3>
      </div>
      {right}
    </div>
  );
}



export default function Dashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats>({ sopsGenerated: 0, universitiesSearched: 0, profilesAnalyzed: 0, chatMessages: 0, lastActive: '' });
  const [profile, setProfile] = useState<Profile | null>(null);
  const [recentGenerations, setRecentGenerations] = useState<Generation[]>([]);

  useEffect(() => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&family=Bricolage+Grotesque:wght@500;600;700&display=swap';
    document.head.appendChild(link);
    setStats(getStats());
    const unsub = onAuthStateChanged(auth, (user) => { if (user) loadFirestoreData(user.uid); });
    return () => unsub();
  }, []);

  const loadFirestoreData = async (userId: string) => {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      if (userDoc.exists()) {
        const d = userDoc.data();
        if (d.role === 'consultant') {
          router.push('/consultant');
          return;
        }
        if (d.role === 'admin') {
          router.push('/admin');
          return;
        }
        setProfile({ sop_used: d.sop_used ?? 0, analyzer_used: d.analyzer_used ?? 0, chat_used: d.chat_used ?? 0, consultantNotes: d.consultantNotes });
      }
      const q = query(collection(db, 'generations'), where('user_id', '==', userId), orderBy('createdAt', 'desc'));
      const snap = await getDocs(q);
      const gens: Generation[] = [];
      snap.forEach((d) => { if (gens.length < 5) { const x = d.data(); gens.push({ id: d.id, type: x.type, university: x.university, created_at: x.createdAt?.toDate?.()?.toISOString() || new Date().toISOString() }); } });
      setRecentGenerations(gens);
    } catch (e) { console.error(e); }
  };

  const score = profileScore(stats);
  const totalActions = stats.sopsGenerated + stats.universitiesSearched + stats.profilesAnalyzed + stats.chatMessages;

  const statCards = [
    { label: 'SOPs Generated',  value: stats.sopsGenerated,        icon: '📝', href: '/sop-generator',    bg: '#E1F5EE', accent: '#1D9E75',  border: '#9FE1CB' },
    { label: 'Uni Searches',    value: stats.universitiesSearched, icon: '🏛️', href: '/university-finder', bg: '#EEEDFE', accent: '#534AB7',  border: '#AFA9EC' },
    { label: 'Analyses Done',   value: stats.profilesAnalyzed,     icon: '📊', href: '/profile-analyzer',  bg: '#E1F5EE', accent: '#085041',  border: '#5DCAA5' },
    { label: 'AI Messages',     value: stats.chatMessages,         icon: '💬', href: '/chatbot',            bg: '#FAEEDA', accent: '#854F0B',  border: '#FAC775' },
  ];

  const base: React.CSSProperties = { fontFamily: "'Nunito', sans-serif" };

  return (
    <>
      <OnboardingTour />

      <div style={{ minHeight: '100vh', background: '#FFFBF5', ...base }}>

        {/* ── PAGE HEADER ── */}
        <div style={{ background: '#fff', borderBottom: '1.5px solid #E1F5EE', padding: '20px 20px' }}>
          <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#E1F5EE', borderRadius: 50, padding: '4px 12px', marginBottom: 8 }}>
                <span style={{ color: '#EF9F27', fontSize: 16, lineHeight: 1 }}>◉</span>
                <span style={{ fontSize: 12, fontWeight: 800, color: '#0F6E56', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Your Dashboard</span>
              </div>
              <h1 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 24, fontWeight: 700, color: '#085041', margin: 0, lineHeight: 1.2 }}>
                Welcome back 👋
              </h1>
              <p style={{ fontSize: 13, color: '#888780', marginTop: 4, fontWeight: 600 }}>
                Last active: <span style={{ color: '#1D9E75' }}>{formatLastActive(stats.lastActive)}</span>
              </p>
            </div>
          </div>
        </div>

        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '20px 16px', display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* ── STAT CARDS ── */}
          {/* 2 cols on mobile, 4 cols on desktop */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }} className="stat-grid">
            {statCards.map((c) => (
              <Link href={c.href} key={c.label} style={{ textDecoration: 'none' }}>
                <div style={{ background: '#fff', borderRadius: 20, border: `1.5px solid ${c.border}`, padding: 18, cursor: 'pointer', transition: 'transform 0.18s, box-shadow 0.18s', boxShadow: '0 2px 12px rgba(29,158,117,0.06)' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-4px)'; (e.currentTarget as HTMLDivElement).style.boxShadow = `0 10px 28px rgba(29,158,117,0.13)`; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)'; (e.currentTarget as HTMLDivElement).style.boxShadow = '0 2px 12px rgba(29,158,117,0.06)'; }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                    <div style={{ width: 44, height: 44, borderRadius: '50%', background: c.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>{c.icon}</div>
                    <svg width="14" height="14" fill="none" stroke={c.accent} viewBox="0 0 24 24" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                  </div>
                  <p style={{ fontSize: 28, fontWeight: 900, color: '#085041', margin: 0, fontFamily: "'Bricolage Grotesque', sans-serif" }}>{c.value}</p>
                  <p style={{ fontSize: 12, color: '#888780', marginTop: 4, fontWeight: 600 }}>{c.label}</p>
                </div>
              </Link>
            ))}
          </div>

          {/* ── PROFILE SCORE + PLAN ── */}
          {/* Stacks to single column on mobile */}
          <div className="score-plan-grid" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16 }}>
            <div style={{ borderRadius: 20, overflow: 'hidden', position: 'relative', minHeight: 220, background: 'linear-gradient(145deg, #04342C 0%, #085041 50%, #1D9E75 100%)' }}>
              <div style={{ position: 'absolute', top: -40, right: -40, width: 160, height: 160, borderRadius: '50%', background: 'rgba(239,159,39,0.15)' }} />
              <div style={{ position: 'absolute', bottom: -30, left: -30, width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
              <div style={{ position: 'absolute', top: 18, left: 18 }}>
                <span style={{ background: '#EF9F27', color: '#412402', fontSize: 10, fontWeight: 800, padding: '4px 12px', borderRadius: 50, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Profile Score</span>
              </div>
              <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '24px 24px', paddingTop: 56, textAlign: 'center' }}>
                <RadialProgress score={score} />
                <p style={{ color: '#9FE1CB', fontSize: 13, fontWeight: 600, marginTop: 12, lineHeight: 1.5 }}>
                  {score === 0 && 'Start using tools to build your score'}
                  {score > 0 && score < 50 && 'Good start! Keep exploring 👍'}
                  {score >= 50 && score < 85 && 'Great progress! Keep going 🚀'}
                  {score >= 85 && 'Excellent profile! Well rounded ✅'}
                </p>
              </div>
            </div>

            <Card>
              <CardHeader
                label="Free access"
                title="Unlimited Usage"
                right={
                  <span style={{ fontSize: 12, fontWeight: 800, padding: '6px 14px', borderRadius: 50, background: '#E1F5EE', color: '#0F6E56', border: '1.5px solid #9FE1CB' }}>
                    Free · Unlimited
                  </span>
                }
              />
              <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>
                {profile && (
                  <>
                    <UsageCount label="SOP Generations"  emoji="📝" used={profile.sop_used} />
                    <UsageCount label="Profile Analyses" emoji="📊" used={profile.analyzer_used} />
                    <UsageCount label="AI Chat Messages" emoji="💬" used={profile.chat_used} />
                  </>
                )}
              </div>
            </Card>
          </div>

          {/* ── QUICK ACTIONS ── */}
          <Card>
            <CardHeader label="Explore Tools" title="Quick Actions" />
            <div style={{ padding: 20 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }} className="actions-grid">
                {quickActions.map((a) => (
                  <Link href={a.href} key={a.label} style={{ textDecoration: 'none' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 8, cursor: 'pointer' }}
                      onMouseEnter={e => { const ic = (e.currentTarget as HTMLDivElement).querySelector('.qa-icon') as HTMLDivElement; if (ic) { ic.style.borderColor = '#1D9E75'; ic.style.background = '#E1F5EE'; ic.style.transform = 'translateY(-3px)'; } }}
                      onMouseLeave={e => { const ic = (e.currentTarget as HTMLDivElement).querySelector('.qa-icon') as HTMLDivElement; if (ic) { ic.style.borderColor = '#9FE1CB'; ic.style.background = '#F5FDFB'; ic.style.transform = 'translateY(0)'; } }}
                    >
                      <div className="qa-icon" style={{ width: 56, height: 56, borderRadius: '50%', background: '#F5FDFB', border: '2px solid #9FE1CB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, transition: 'all 0.18s' }}>
                        {a.icon}
                      </div>
                      <div>
                        <p style={{ fontSize: 12, fontWeight: 700, color: '#085041', margin: 0 }}>{a.label}</p>
                        <p style={{ fontSize: 10, color: '#888780', marginTop: 2 }}>{a.desc}</p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </Card>

          {/* ── CONSULTANT FEEDBACK ── */}
          {profile?.consultantNotes && (
            <Card>
              <CardHeader label="From your Consultant" title="Consultant Feedback" right={<span className="text-xl">💬</span>} />
              <div style={{ padding: 24 }}>
                <div style={{ padding: 16, background: '#FFF9EC', border: '1px solid #FDE9A2', borderRadius: 12 }}>
                  <p style={{ color: '#854F0B', fontSize: 14, fontWeight: 600, whiteSpace: 'pre-wrap', margin: 0 }}>
                    {profile.consultantNotes}
                  </p>
                </div>
              </div>
            </Card>
          )}

          {/* ── ACTIVITY + RECENT GENERATIONS ── */}
          {/* Stacks to single column on mobile */}
          <div className="activity-grid" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16 }}>
            <Card>
              <CardHeader label="Stats" title="Your Activity" />
              <div style={{ padding: 24 }}>
                {totalActions === 0 ? (
                  <div style={{ textAlign: 'center', padding: '32px 0' }}>
                    <div style={{ width: 60, height: 60, borderRadius: '50%', background: '#E1F5EE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, margin: '0 auto 12px' }}>🌱</div>
                    <p style={{ color: '#5F5E5A', fontSize: 14, fontWeight: 600 }}>No activity yet</p>
                    <p style={{ color: '#B4B2A9', fontSize: 12, marginTop: 4 }}>Start exploring the tools!</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                    {[
                      { label: 'SOPs Generated',      value: stats.sopsGenerated,        max: Math.max(stats.sopsGenerated, 5),        color: '#1D9E75' },
                      { label: 'University Searches', value: stats.universitiesSearched, max: Math.max(stats.universitiesSearched, 5), color: '#534AB7' },
                      { label: 'Profiles Analyzed',   value: stats.profilesAnalyzed,     max: Math.max(stats.profilesAnalyzed, 5),     color: '#085041' },
                      { label: 'Chat Messages',       value: stats.chatMessages,         max: Math.max(stats.chatMessages, 10),        color: '#EF9F27' },
                    ].map((item) => (
                      <div key={item.label}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                          <span style={{ fontSize: 13, color: '#5F5E5A', fontWeight: 600 }}>{item.label}</span>
                          <span style={{ fontSize: 13, color: '#085041', fontWeight: 800 }}>{item.value}</span>
                        </div>
                        <div style={{ height: 7, background: '#E1F5EE', borderRadius: 999, overflow: 'hidden' }}>
                          <div style={{ height: '100%', borderRadius: 999, width: `${Math.min((item.value / item.max) * 100, 100)}%`, background: item.color, transition: 'width 0.8s cubic-bezier(.4,0,.2,1)' }} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Card>

            <Card>
              <CardHeader label="History" title="Recent Generations" right={
                <Link href="/sop-history" style={{ fontSize: 12, color: '#1D9E75', fontWeight: 700, textDecoration: 'none' }}>View All →</Link>
              } />
              <div>
                {recentGenerations.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px 24px' }}>
                    <div style={{ width: 60, height: 60, borderRadius: '50%', background: '#E1F5EE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, margin: '0 auto 12px' }}>📄</div>
                    <p style={{ color: '#5F5E5A', fontSize: 14, fontWeight: 600 }}>No generations yet</p>
                    <Link href="/sop-generator" style={{ fontSize: 12, fontWeight: 700, color: '#1D9E75', textDecoration: 'none', display: 'inline-block', marginTop: 8 }}>Generate your first SOP →</Link>
                  </div>
                ) : (
                  recentGenerations.map((gen) => (
                    <div key={gen.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px', borderBottom: '1px solid #F0EDE6', transition: 'background 0.15s' }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#FFFBF5')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <div style={{ width: 40, height: 40, borderRadius: 12, background: '#E1F5EE', border: '1.5px solid #9FE1CB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
                        {gen.type === 'sop' ? '📝' : gen.type === 'cv' ? '📄' : '✉️'}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 13, fontWeight: 700, color: '#085041', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{gen.type.toUpperCase()} — {gen.university || 'N/A'}</p>
                        <p style={{ fontSize: 11, color: '#888780', marginTop: 3 }}>{new Date(gen.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 800, padding: '4px 10px', borderRadius: 50, background: '#E1F5EE', color: '#0F6E56', border: '1.5px solid #9FE1CB', flexShrink: 0 }}>
                        {gen.type.toUpperCase()}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>



        </div>
      </div>

      <style>{`
        @media (min-width: 640px) {
          .stat-grid { grid-template-columns: repeat(4, 1fr) !important; }
          .score-plan-grid { grid-template-columns: 2fr 3fr !important; }
          .actions-grid { grid-template-columns: repeat(6, 1fr) !important; }
          .activity-grid { grid-template-columns: 1fr 1fr !important; }
          .upgrade-inner { flex-direction: row !important; align-items: center !important; justify-content: space-between !important; padding: 28px 32px !important; }
        }
      `}</style>
    </>
  );
}
