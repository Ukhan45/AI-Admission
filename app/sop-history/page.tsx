'use client';

import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import Link from 'next/link';

type Generation = {
  id: string;
  university: string;
  content: string;
  createdAt: Date;
};

export default function SopHistory() {
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [selected, setSelected] = useState<Generation | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) loadHistory(user.uid);
      else setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const loadHistory = async (userId: string) => {
    try {
      const q = query(
        collection(db, 'generations'),
        where('user_id', '==', userId),
        where('type', '==', 'sop'),
        orderBy('createdAt', 'desc')
      );
      const snap = await getDocs(q);
      const gens: Generation[] = [];
      snap.forEach((doc) => {
        const d = doc.data();
        gens.push({ id: doc.id, university: d.university, content: d.content, createdAt: d.createdAt?.toDate() || new Date() });
      });
      setGenerations(gens);
      if (gens.length > 0) setSelected(gens[0]);
    } catch (e) {
      console.error('Error loading history:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!selected) return;
    navigator.clipboard.writeText(selected.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!selected) return;
    const blob = new Blob([selected.content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SOP_${selected.university.replace(/\s+/g, '_')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f5f5f0] px-4 py-8" style={{ fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
        <div className="max-w-6xl mx-auto space-y-4 animate-pulse">
          <div className="h-8 bg-gray-200 rounded-xl w-48" />
          <div className="h-4 bg-gray-200 rounded-xl w-64" />
          <div className="h-96 bg-gray-200 rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f5f0]" style={{ fontFamily: "'Segoe UI', system-ui, sans-serif" }}>

      {/* ── Page Header — UniQuest style ── */}
      <div className="bg-white border-b border-gray-100 px-6 py-5">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          <div>
            {/* Pill badge — matches "YOUR DASHBOARD" / "ACCOUNT" badge */}
            <span className="inline-flex items-center gap-1.5 bg-[#f0faf6] border border-[#b6e8d4] text-[#2d9e7a] text-[11px] font-semibold uppercase tracking-widest px-3 py-1 rounded-full mb-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#f5a623] inline-block"></span>
              AI Tools
            </span>
            <h1 className="text-2xl font-bold text-gray-900">SOP History</h1>
            <p className="text-sm text-gray-400 mt-0.5">Review and download your previously generated statements of purpose.</p>
          </div>
          <Link href="/sop-generator"
            className="bg-[#2d9e7a] hover:bg-[#1a7a5e] text-white text-sm font-bold px-4 py-2.5 rounded-lg transition shadow-sm">
            + New SOP
          </Link>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-6 md:py-8">

        {/* Empty state */}
        {generations.length === 0 ? (
          <div className="rounded-2xl bg-white border border-gray-100 text-center py-24 px-6 shadow-sm">
            <div className="w-16 h-16 rounded-full bg-[#f0faf6] border border-[#b6e8d4] flex items-center justify-center text-3xl mx-auto mb-4">
              📝
            </div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">No SOPs yet</h2>
            <p className="text-gray-400 text-sm mb-6">Generate your first SOP to see it here.</p>
            <Link href="/sop-generator"
              className="inline-block bg-[#2d9e7a] hover:bg-[#1a7a5e] text-white text-sm font-bold px-5 py-2.5 rounded-xl transition">
              Generate SOP →
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

            {/* Left — list */}
            <div className="md:col-span-1 space-y-2">
              {generations.map((gen) => (
                <div key={gen.id} onClick={() => setSelected(gen)}
                  className={`cursor-pointer rounded-xl p-4 border transition group ${
                    selected?.id === gen.id
                      ? 'bg-[#f0faf6] border-[#b6e8d4]'
                      : 'bg-white border-gray-100 hover:border-[#b6e8d4]/60'
                  }`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-[#2d9e7a]/10 text-[#2d9e7a]">
                      SOP
                    </span>
                    <span className="text-[10px] text-gray-400">
                      {new Date(gen.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>
                  <p className={`text-sm font-semibold truncate ${selected?.id === gen.id ? 'text-gray-900' : 'text-gray-700'}`}>
                    {gen.university}
                  </p>
                  <p className="text-[11px] text-gray-400 mt-1.5 line-clamp-2">
                    {gen.content.slice(0, 80)}…
                  </p>
                </div>
              ))}
            </div>

            {/* Right — viewer */}
            {selected && (
              <div className="md:col-span-2 rounded-2xl bg-white border border-gray-100 shadow-sm overflow-hidden flex flex-col">

                {/* Viewer header — matches UniQuest card header style */}
                <div className="px-6 py-4 border-b border-gray-100 flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-bold text-[#2d9e7a] uppercase tracking-widest">Statement of Purpose</p>
                    <h2 className="text-gray-900 font-bold text-base mt-0.5">{selected.university}</h2>
                    <p className="text-gray-400 text-xs mt-0.5">
                      {new Date(selected.createdAt).toLocaleDateString('en-US', {
                        weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
                      })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={handleCopy}
                      className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border
                        border-gray-200 text-gray-600 bg-white hover:border-[#2d9e7a]/40 hover:text-[#2d9e7a] hover:bg-[#f0faf6] transition">
                      {copied ? '✅ Copied!' : '📋 Copy'}
                    </button>
                    <button onClick={handleDownload}
                      className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg
                        bg-[#2d9e7a] hover:bg-[#1a7a5e] text-white transition">
                      ⬇️ Download
                    </button>
                  </div>
                </div>

                {/* SOP content */}
                <div className="flex-1 p-5 md:p-6">
                  <div className="bg-[#f9f9f7] border border-gray-100 rounded-xl p-5 overflow-y-auto max-h-[62vh]">
                    <p className="text-gray-700 text-sm leading-8 whitespace-pre-wrap font-light">
                      {selected.content}
                    </p>
                  </div>
                  <p className="text-[11px] text-gray-400 mt-3 text-right">
                    Review and personalise before submitting to your university.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
