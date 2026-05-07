'use client';

import Link from 'next/link';

export default function Navbar() {
  return (
    <nav className="bg-blue-600 p-4 text-white flex justify-between">
      <h1 className="font-bold text-lg">AI Admission</h1>
      <div className="space-x-4">
        <Link href="/">Home</Link>
        <Link href="/sop-generator">SOP</Link>
        <Link href="/profile-analyzer">Analyzer</Link>
        <Link href="/university-finder">Universities</Link>
        <Link href="/chatbot">Chat</Link>
      </div>
    </nav>
  );
}