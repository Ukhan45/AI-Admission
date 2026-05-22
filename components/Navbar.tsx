'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navLinks = [
  { href: '/',                  label: 'Home' },
  { href: '/sop-generator',     label: 'SOP' },
  { href: '/profile-analyzer',  label: 'Analyzer' },
  { href: '/university-finder', label: 'Universities' },
  { href: '/chatbot',           label: 'Chat' },
];

export default function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="bg-white border-b border-gray-100 shadow-sm px-4 py-3">
      <div className="mx-auto max-w-7xl flex items-center justify-between">

        {/* Logo / Brand */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-orange-500 flex items-center justify-center text-white font-bold text-sm shrink-0">
            U
          </div>
          <h1 className="font-bold text-lg text-gray-900">AI Admission</h1>
        </div>

        {/* Nav Links */}
        <div className="flex items-center gap-1">
          {navLinks.map(({ href, label }) => {
            const isActive = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                  isActive
                    ? 'bg-orange-500 text-white shadow-sm'
                    : 'text-gray-600 hover:bg-orange-50 hover:text-orange-600'
                }`}
              >
                {label}
              </Link>
            );
          })}
        </div>

      </div>
    </nav>
  );
}
