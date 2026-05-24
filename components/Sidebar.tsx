// components/Sidebar.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import {
  Home, User, FileText, History, BarChart, Globe,
  GraduationCap, BookOpen, MessageCircle, FolderCheck,
  LogOut, ChevronRight, Compass,
} from 'lucide-react';

const navItems = [
  { href: '/dashboard',          label: 'Dashboard',        icon: Home          },
  { href: '/profile',            label: 'Profile',          icon: User          },
  { href: '/sop-generator',      label: 'SOP Generator',    icon: FileText      },
  { href: '/sop-history',        label: 'SOP History',      icon: History       },
  { href: '/profile-analyzer',   label: 'Profile Analyzer', icon: BarChart      },
  { href: '/university-finder',  label: 'Universities',     icon: Globe         },
  { href: '/scholarship-finder', label: 'Scholarships',     icon: GraduationCap },
  { href: '/abroad-guide',       label: 'Abroad Guide',     icon: BookOpen      },
  { href: '/chatbot',            label: 'AI Chat',          icon: MessageCircle },
  { href: '/document-checker',   label: 'Document Checker', icon: FolderCheck   },
];

const groups = [
  { label: 'Main',      items: ['/dashboard', '/profile'] },
  { label: 'AI Tools',  items: ['/sop-generator', '/sop-history', '/profile-analyzer'] },
  { label: 'Discover',  items: ['/university-finder', '/scholarship-finder', '/abroad-guide'] },
  { label: 'Assistant', items: ['/chatbot', '/document-checker'] },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut(auth);
    router.push('/login');
  };

  const handleRestartTour = () => {
    localStorage.removeItem('uniquest_tour_completed');
    window.location.reload();
  };

  return (
    <aside style={{
      width: 280,
      minHeight: '100vh',
      background: '#fff',
      borderRight: '1.5px solid #E1F5EE',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: "'Nunito', sans-serif",
      position: 'sticky',
      top: 0,
      height: '100vh',
      overflowY: 'auto',
      flexShrink: 0,
    }}>

      {/* ── Logo ── */}
      <div style={{ padding: '16px 20px', borderBottom: '1.5px solid #E1F5EE', display: 'flex', alignItems: 'center', gap: 12 }}>
        <img src="/logo.png" alt="UniQuest" style={{ height: '52px', width: 'auto', objectFit: 'contain' }} />
        <div>
          <p style={{ fontSize: 17, fontWeight: 900, color: '#1a4fa0', margin: 0, lineHeight: 1.2 }}>UniQuest AI</p>
          <p style={{ fontSize: 10, fontWeight: 700, color: '#5a7ec4', margin: 0, marginTop: 3, letterSpacing: '0.03em' }}>by Ariesian Tech</p>
        </div>
      </div>

      {/* ── Nav ── */}
      <nav style={{ flex: 1, padding: '12px 12px', display: 'flex', flexDirection: 'column', gap: 4 }}>
        {groups.map((group) => {
          const groupItems = navItems.filter(n => group.items.includes(n.href));
          return (
            <div key={group.label} style={{ marginBottom: 8 }}>
              <p style={{ fontSize: 10, fontWeight: 800, color: '#B4B2A9', textTransform: 'uppercase', letterSpacing: '0.09em', padding: '6px 8px 4px', margin: 0 }}>
                {group.label}
              </p>
              {groupItems.map((item) => {
                const Icon = item.icon;
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '9px 10px', borderRadius: 10, textDecoration: 'none',
                      marginBottom: 1,
                      background: active ? '#E1F5EE' : 'transparent',
                      color: active ? '#085041' : '#5F5E5A',
                      fontWeight: active ? 800 : 600,
                      fontSize: 13, transition: 'background 0.15s, color 0.15s',
                      position: 'relative',
                    }}
                    onMouseEnter={e => { if (!active) { e.currentTarget.style.background = '#F5FDFB'; e.currentTarget.style.color = '#085041'; } }}
                    onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#5F5E5A'; } }}
                  >
                    {active && (
                      <div style={{ position: 'absolute', left: 0, top: '20%', bottom: '20%', width: 3, borderRadius: '0 3px 3px 0', background: '#1D9E75' }} />
                    )}
                    <div style={{
                      width: 30, height: 30, borderRadius: 8,
                      background: active ? '#fff' : '#F5FDFB',
                      border: `1.5px solid ${active ? '#9FE1CB' : '#E1F5EE'}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    }}>
                      <Icon size={14} color={active ? '#1D9E75' : '#888780'} />
                    </div>
                    <span style={{ flex: 1 }}>{item.label}</span>
                    {active && <ChevronRight size={12} color="#1D9E75" />}
                  </Link>
                );
              })}
            </div>
          );
        })}

        {/* ── Help group ── */}
        <div style={{ marginBottom: 8 }}>
          <p style={{ fontSize: 10, fontWeight: 800, color: '#B4B2A9', textTransform: 'uppercase', letterSpacing: '0.09em', padding: '6px 8px 4px', margin: 0 }}>
            Help
          </p>
          <button
            onClick={handleRestartTour}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              width: '100%', padding: '9px 10px', borderRadius: 10,
              background: 'transparent', border: 'none', cursor: 'pointer',
              color: '#5F5E5A', fontSize: 13, fontWeight: 600,
              fontFamily: "'Nunito', sans-serif",
              transition: 'background 0.15s, color 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#F5FDFB'; e.currentTarget.style.color = '#085041'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#5F5E5A'; }}
          >
            <div style={{ width: 30, height: 30, borderRadius: 8, background: '#F5FDFB', border: '1.5px solid #E1F5EE', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <Compass size={14} color="#888780" />
            </div>
            Take a Tour
          </button>
        </div>
      </nav>

      {/* ── Footer ── */}
      <div style={{ padding: '12px', borderTop: '1.5px solid #E1F5EE' }}>

        {/* Sign out */}
        <button
          onClick={handleSignOut}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            width: '100%', padding: '9px 10px', borderRadius: 10,
            background: 'transparent', border: 'none', cursor: 'pointer',
            color: '#B4B2A9', fontSize: 13, fontWeight: 600,
            fontFamily: "'Nunito', sans-serif",
            transition: 'background 0.15s, color 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = '#FFF0F0'; e.currentTarget.style.color = '#E24B4A'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#B4B2A9'; }}
        >
          <div style={{ width: 30, height: 30, borderRadius: 8, background: '#FFF5F5', border: '1.5px solid #FFD9D9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <LogOut size={14} color="#E24B4A" />
          </div>
          Sign Out
        </button>

        {/* Sign In / Sign Up links — shown when not logged in */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 10 }}>
          <Link href="/login"
            style={{ fontSize: 13, fontWeight: 700, color: '#1D9E75', textDecoration: 'none' }}
            onMouseEnter={e => e.currentTarget.style.textDecoration = 'underline'}
            onMouseLeave={e => e.currentTarget.style.textDecoration = 'none'}
          >
            Sign In
          </Link>
          <span style={{ color: '#D3D1C7', fontSize: 13 }}>·</span>
          <Link href="/signup"
            style={{ fontSize: 13, fontWeight: 700, color: '#085041', textDecoration: 'none' }}
            onMouseEnter={e => e.currentTarget.style.textDecoration = 'underline'}
            onMouseLeave={e => e.currentTarget.style.textDecoration = 'none'}
          >
            Sign Up
          </Link>
        </div>

        {/* Version tag */}
        <p style={{ fontSize: 10, color: '#D3D1C7', textAlign: 'center', margin: '10px 0 0', fontWeight: 600 }}>
          UniQuest v1.0 · Built for Pakistan 🇵🇰
        </p>
      </div>
    </aside>
  );
}
