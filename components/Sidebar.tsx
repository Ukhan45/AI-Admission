'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Home, FileText, BarChart, Globe, MessageCircle, LogOut, FolderCheck, History, User, Menu, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';

const AUTH_PAGES = ['/login', '/signup', '/forgot-password', '/reset-password'];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
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
    { href: '/dashboard',         label: 'Dashboard',        icon: Home },
    { href: '/profile',           label: 'Profile',          icon: User },
    { href: '/sop-generator',     label: 'SOP Generator',    icon: FileText },
    { href: '/sop-history',       label: 'SOP History',      icon: History },
    { href: '/profile-analyzer',  label: 'Profile Analyzer', icon: BarChart },
    { href: '/university-finder', label: 'Universities',     icon: Globe },
    { href: '/chatbot',           label: 'AI Chat',          icon: MessageCircle },
    { href: '/document-checker',  label: 'Document Checker', icon: FolderCheck },
  ];

  // Hide sidebar on auth pages
  if (AUTH_PAGES.includes(pathname)) return null;

  const sidebarContent = (
    <div className="w-64 h-screen bg-gray-900 text-white p-5 flex flex-col">
      <h1 className="text-xl font-bold mb-8">AI Admission</h1>

      <nav className="space-y-1 flex-1">
        {navItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg transition ${
              pathname === href
                ? 'bg-blue-600 text-white'
                : 'hover:bg-gray-800 text-gray-300 hover:text-white'
            }`}
          >
            <Icon size={18} /> {label}
          </Link>
        ))}
      </nav>

      <div className="border-t border-gray-700 pt-4 mt-4">
        {userEmail ? (
          <>
            <p className="text-xs text-gray-400 truncate mb-3">
              Signed in as<br />
              <span className="text-gray-200 font-medium">{userEmail}</span>
            </p>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 text-sm text-red-400 hover:text-red-300 transition w-full"
            >
              <LogOut size={16} /> Sign Out
            </button>
          </>
        ) : (
          <div className="space-y-2">
            <Link href="/login" className="block text-center text-sm bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg transition">
              Sign In
            </Link>
            <Link href="/signup" className="block text-center text-sm border border-gray-600 hover:border-gray-400 text-gray-300 py-2 rounded-lg transition">
              Sign Up
            </Link>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* ── Desktop sidebar ── */}
      <div className="hidden md:block fixed top-0 left-0 z-40 h-screen">
        {sidebarContent}
      </div>

      {/* ── Mobile top bar ── */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-gray-900 text-white flex items-center justify-between px-4 py-3">
        <h1 className="text-lg font-bold">AI Admission</h1>
        <button onClick={() => setMobileOpen(!mobileOpen)}>
          {mobileOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* ── Mobile drawer ── */}
      {mobileOpen && (
        <>
          {/* Backdrop */}
          <div
            className="md:hidden fixed inset-0 z-40 bg-black/50"
            onClick={() => setMobileOpen(false)}
          />
          {/* Drawer */}
          <div className="md:hidden fixed top-0 left-0 z-50 h-screen">
            {sidebarContent}
          </div>
        </>
      )}

      {/* ── Mobile top spacing so content isn't hidden under top bar ── */}
      <div className="md:hidden h-14" />
    </>
  );
}
