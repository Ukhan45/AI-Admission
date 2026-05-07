'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Home, FileText, BarChart, Globe, MessageCircle, LogOut, FolderCheck, History } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserEmail(session?.user?.email ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserEmail(session?.user?.email ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const navItems = [
    { href: '/dashboard',         label: 'Dashboard',        icon: Home },
    { href: '/sop-generator',     label: 'SOP Generator',    icon: FileText },
    { href: '/sop-history',       label: 'SOP History',      icon: History },  // ✅ added
    { href: '/profile-analyzer',  label: 'Profile Analyzer', icon: BarChart },
    { href: '/university-finder', label: 'Universities',      icon: Globe },
    { href: '/chatbot',           label: 'AI Chat',           icon: MessageCircle },
    { href: '/document-checker',  label: 'Document Checker',  icon: FolderCheck },
  ];

  if (pathname === '/login' || pathname === '/signup') return null;

  return (
    <div className="w-64 h-screen bg-gray-900 text-white p-5 fixed flex flex-col">
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
}