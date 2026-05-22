'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Home,
  FileText,
  BarChart,
  Globe,
  MessageCircle,
  LogOut,
  FolderCheck,
  History,
  User,
  Menu,
  X,
  GraduationCap
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import Image from 'next/image';

const AUTH_PAGES = ['/login', '/signup', '/forgot-password', '/reset-password'];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href =
      'https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&family=Bricolage+Grotesque:wght@500;600;700&display=swap';
    document.head.appendChild(link);

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUserEmail(user?.email ?? null);
    });

    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: Home },
    { href: '/profile', label: 'Profile', icon: User },
    { href: '/sop-generator', label: 'SOP Generator', icon: FileText },
    { href: '/sop-history', label: 'SOP History', icon: History },
    { href: '/profile-analyzer', label: 'Profile Analyzer', icon: BarChart },
    { href: '/university-finder', label: 'Universities', icon: Globe },
    { href: '/scholarship-finder', label: 'Scholarships', icon: GraduationCap },
    { href: '/chatbot', label: 'AI Chat', icon: MessageCircle },
    { href: '/document-checker', label: 'Document Checker', icon: FolderCheck }
  ];

  if (AUTH_PAGES.includes(pathname)) return null;

  const initials = userEmail ? userEmail[0].toUpperCase() : '?';

  const t = {
    bg: '#FFFBF5',
    border: '#E1F5EE',
    teal: '#1D9E75',
    tealDark: '#085041',
    tealDeep: '#04342C',
    tealLight: '#E1F5EE',
    amber: '#EF9F27',
    muted: '#888780',
    textSub: '#5F5E5A',
    fontBase: "'Nunito', sans-serif",
    fontHead: "'Bricolage Grotesque', sans-serif"
  };

  // ── LOGO ─────────────────────────────────────────────
  const Logo = () => (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        marginBottom: 28,
        padding: '0 4px'
      }}
    >
      <div
        style={{
          width: 38,
          height: 38,
          borderRadius: 12,
          overflow: 'hidden',
          flexShrink: 0,
          boxShadow: '0 4px 14px rgba(29,158,117,0.2)'
        }}
      >
        <Image
          src="/logo.png"
          alt="UniQuest AI Logo"
          width={38}
          height={38}
          style={{ objectFit: 'cover' }}
        />
      </div>

      <div>
        <p
          style={{
            fontFamily: t.fontHead,
            fontSize: 15,
            fontWeight: 700,
            color: t.tealDark,
            margin: 0,
            lineHeight: 1.2
          }}
        >
          UniQuest AI
        </p>
        <p
          style={{
            fontFamily: t.fontBase,
            fontSize: 10,
            color: t.muted,
            margin: 0
          }}
        >
          by Ariesian Tech
        </p>
      </div>
    </div>
  );

  const NavItem = ({
    href,
    label,
    icon: Icon
  }: {
    href: string;
    label: string;
    icon: React.ElementType;
  }) => {
    const isActive = pathname === href;

    return (
      <Link
        href={href}
        onClick={() => setMobileOpen(false)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 11,
          padding: '10px 13px',
          borderRadius: 14,
          marginBottom: 2,
          textDecoration: 'none',
          fontSize: 13,
          fontWeight: isActive ? 800 : 600,
          fontFamily: t.fontBase,
          background: isActive
            ? `linear-gradient(90deg, ${t.teal}, #25B888)`
            : 'transparent',
          color: isActive ? '#fff' : t.textSub
        }}
      >
        <Icon
          size={17}
          style={{ color: isActive ? '#fff' : t.muted, flexShrink: 0 }}
        />
        {label}
      </Link>
    );
  };

  const SidebarContent = () => (
    <div
      style={{
        width: 248,
        height: '100vh',
        background: t.bg,
        borderRight: `1.5px solid ${t.border}`,
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      <div style={{ padding: '22px 14px 16px', flex: 1, overflowY: 'auto' }}>
        <Logo />

        <p style={{ fontSize: 10, fontWeight: 800, color: t.muted }}>
          Navigation
        </p>

        <nav>
          {navItems.map((item) => (
            <NavItem key={item.href} {...item} />
          ))}
        </nav>
      </div>

      <div style={{ padding: 14, borderTop: `1.5px solid ${t.border}` }}>
        {userEmail ? (
          <>
            <div style={{ marginBottom: 10 }}>
              <p style={{ fontSize: 12 }}>{userEmail}</p>
            </div>

            <button onClick={handleLogout}>Sign Out</button>
          </>
        ) : (
          <div>
            <Link href="/login">Sign In</Link>
            <Link href="/signup">Sign Up</Link>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop */}
      <div className="md-sidebar-wrapper" style={{ display: 'none' }}>
        <div style={{ position: 'fixed', top: 0, left: 0, height: '100vh' }}>
          <SidebarContent />
        </div>
      </div>

      {/* Mobile Topbar */}
      <div
        className="mobile-topbar"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 50,
          display: 'flex',
          justifyContent: 'space-between',
          padding: 12,
          background: '#FFFBF5'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 10,
              overflow: 'hidden'
            }}
          >
            <Image
              src="/logo.png"
              alt="Logo"
              width={34}
              height={34}
            />
          </div>

          <span style={{ fontWeight: 700 }}>UniQuest AI</span>
        </div>

        <button onClick={() => setMobileOpen(!mobileOpen)}>
          {mobileOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <>
          <div
            onClick={() => setMobileOpen(false)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.4)'
            }}
          />
          <div style={{ position: 'fixed', top: 0, left: 0 }}>
            <SidebarContent />
          </div>
        </>
      )}

      <div className="mobile-spacer" style={{ height: 58 }} />

      <style>{`
        @media (min-width: 768px) {
          .md-sidebar-wrapper { display: block !important; }
          .mobile-topbar { display: none !important; }
          .mobile-spacer { display: none !important; }
        }
        @media (max-width: 767px) {
          .md-sidebar-wrapper { display: none !important; }
        }
      `}</style>
    </>
  );
}