// components/SavedProfileNotice.tsx
'use client';

import Link from 'next/link';

export default function SavedProfileNotice({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: 8, marginBottom: 16,
        background: '#F0FAF6', border: '1.5px solid #B6E8D4', color: '#0F6E56',
        borderRadius: 14, padding: '10px 16px', fontSize: 13, fontWeight: 600,
      }}
    >
      <span>✅ Filled in from your saved profile. Anything you change here is saved when you run this tool.</span>
      <Link href="/profile" style={{ color: '#1D9E75', fontWeight: 800, textDecoration: 'none' }}>
        Edit profile →
      </Link>
    </div>
  );
}