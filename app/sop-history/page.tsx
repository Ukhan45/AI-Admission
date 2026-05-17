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
      <div className="min-h-screen bg-[#0f1117] px-4 py-8">
        <div className="max-w-6xl mx-auto space-y-4 animate-pulse">
          <div className="h-8 bg-white/5 rounded-xl w-48" />
          <div className="h-4 bg-white/5 rounded-xl w-64" />
          <div className="h-96 bg-white/5 rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f1117]">
      <div className="max-w-6xl mx-auto px-4 py-6 md:py-8">

        {/* Header */}
        <div className="flex items-start justify-between mb-7">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">SOP History</h1>
            <p className="text-slate-400 text-sm mt-1">
              {generations.length} SOP{generations.length !== 1 ? 's' : ''} generated
            </p>
          </div>
          <Link href="/sop-generator"
            className="shrink-0 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold px-4 py-2.5 rounded-xl transition">
            + New SOP
          </Link>
        </div>

        {/* Empty state */}
        {generations.length === 0 ? (
          <div className="rounded-2xl bg-[#1a1d27] border border-white/5 text-center py-24 px-6">
            <p className="text-5xl mb-4">📝</p>
            <h2 className="text-lg font-semibold text-white mb-2">No SOPs yet</h2>
            <p className="text-slate-400 text-sm mb-6">Generate your first SOP to see it here.</p>
            <Link href="/sop-generator"
              className="inline-block bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold px-5 py-2.5 rounded-xl transition">
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
                      ? 'bg-indigo-500/10 border-indigo-500/40'
                      : 'bg-[#1a1d27] border-white/5 hover:border-white/15'
                  }`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300">
                      SOP
                    </span>
                    <span className="text-[10px] text-slate-500">
                      {new Date(gen.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>
                  <p className={`text-sm font-semibold truncate ${selected?.id === gen.id ? 'text-white' : 'text-slate-300'}`}>
                    {gen.university}
                  </p>
                  <p className="text-[11px] text-slate-600 mt-1.5 line-clamp-2">
                    {gen.content.slice(0, 80)}…
                  </p>
                </div>
              ))}
            </div>

            {/* Right — viewer */}
            {selected && (
              <div className="md:col-span-2 rounded-2xl bg-[#1a1d27] border border-white/5 p-5 md:p-6 flex flex-col">

                {/* Viewer header */}
                <div className="flex items-start justify-between gap-4 mb-5">
                  <div>
                    <h2 className="text-white font-bold text-base">{selected.university}</h2>
                    <p className="text-slate-500 text-xs mt-0.5">
                      {new Date(selected.createdAt).toLocaleDateString('en-US', {
                        weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
                      })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={handleCopy}
                      className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border
                        bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 hover:text-white transition">
                      {copied ? '✅ Copied!' : '📋 Copy'}
                    </button>
                    <button onClick={handleDownload}
                      className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg
                        bg-indigo-600 hover:bg-indigo-500 text-white transition">
                      ⬇️ Download
                    </button>
                  </div>
                </div>

                {/* Divider */}
                <div className="border-t border-white/5 mb-5" />

                {/* SOP content */}
                <div className="flex-1 bg-[#0f1117] border border-white/5 rounded-xl p-5 overflow-y-auto max-h-[62vh]">
                  <p className="text-slate-300 text-sm leading-8 whitespace-pre-wrap font-light">
                    {selected.content}
                  </p>
                </div>

                {/* Footer hint */}
                <p className="text-[11px] text-slate-600 mt-3 text-right">
                  Review and personalise before submitting to your university.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
