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
        {/* Inject padding-top BEFORE render to avoid flash */}
        <script dangerouslySetInnerHTML={{ __html: `
          document.addEventListener('DOMContentLoaded', function(){
            var el = document.getElementById('main-content');
            if (el) { el.style.paddingTop = window.innerWidth < 1024 ? '56px' : '0px'; }
          });
          window.addEventListener('resize', function(){
            var el = document.getElementById('main-content');
            if (el) { el.style.paddingTop = window.innerWidth < 1024 ? '56px' : '0px'; }
          });
        `}} />
        <div className="flex min-h-screen">
          <Sidebar />
          <main
            id="main-content"
            className="flex-1 min-h-screen overflow-x-hidden"
          >
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
