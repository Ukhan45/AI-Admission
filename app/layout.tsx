// app/layout.tsx
import './globals.css';
import Sidebar from '../components/Sidebar';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'UniQuest AI',
  description: 'Study Abroad AI by Ariesian Tech',
  icons: {
    icon: '/logo.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-[#f5f6fa]">
        <div className="flex min-h-screen">
          <Sidebar />
          {/*
            On mobile: pt-14 offsets the fixed top bar (56px = 3.5rem).
            On lg+: no offset needed — sidebar is sticky inline, no top bar shown.
          */}
          <main className="flex-1 min-h-screen overflow-x-hidden pt-14 lg:pt-0">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
