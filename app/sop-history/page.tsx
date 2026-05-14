'use client';

import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, collection, query, where, orderBy, getDocs } from 'firebase/firestore';
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
      if (user) {
        loadHistory(user.uid);
      } else {
        setLoading(false);
      }
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
      const querySnapshot = await getDocs(q);
      const gens: Generation[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        gens.push({
          id: doc.id,
          university: data.university,
          content: data.content,
          createdAt: data.createdAt?.toDate() || new Date(),
        });
      });

      setGenerations(gens);
      if (gens.length > 0) setSelected(gens[0]);
    } catch (error) {
      console.error('Error loading history:', error);
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
      <div className="max-w-6xl mx-auto">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-100 rounded w-48" />
          <div className="h-4 bg-gray-100 rounded w-72" />
          <div className="h-96 bg-gray-100 rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">SOP History</h1>
          <p className="text-gray-500 text-sm mt-1">
            {generations.length} SOP{generations.length !== 1 ? 's' : ''} generated
          </p>
        </div>
        <Link href="/sop-generator">
          <button className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition">
            + Generate New SOP
          </button>
        </Link>
      </div>

      {generations.length === 0 ? (
        <div className="text-center py-24 bg-white border border-gray-100 rounded-2xl">
          <div className="text-5xl mb-4">📝</div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">No SOPs yet</h2>
          <p className="text-gray-500 text-sm mb-6">Generate your first SOP to see it here.</p>
          <Link href="/sop-generator">
            <button className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition">
              Generate SOP
            </button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-6">

          {/* Left — list */}
          <div className="col-span-1 space-y-2">
            {generations.map((gen) => (
              <div
                key={gen.id}
                onClick={() => setSelected(gen)}
                className={`cursor-pointer rounded-xl p-4 border transition ${
                  selected?.id === gen.id
                    ? 'bg-blue-50 border-blue-300'
                    : 'bg-white border-gray-100 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">📝</span>
                  <span className="text-xs font-semibold bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">SOP</span>
                </div>
                <p className="text-sm font-semibold text-gray-800 truncate">{gen.university}</p>
                <p className="text-xs text-gray-400 mt-1">
                  {new Date(gen.created_at).toLocaleDateString('en-US', {
                    month: 'short', day: 'numeric', year: 'numeric'
                  })}
                </p>
              </div>
            ))}
          </div>

          {/* Right — viewer */}
          {selected && (
            <div className="col-span-2 bg-white border border-gray-100 rounded-2xl shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">{selected.university}</h2>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {new Date(selected.created_at).toLocaleDateString('en-US', {
                      weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
                    })}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleCopy}
                    className="text-sm font-medium border border-gray-200 hover:bg-gray-50 px-3 py-1.5 rounded-lg transition"
                  >
                    {copied ? '✅ Copied!' : '📋 Copy'}
                  </button>
                  <button
                    onClick={handleDownload}
                    className="text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg transition"
                  >
                    ⬇️ Download
                  </button>
                </div>
              </div>

              <div className="border-t border-gray-100 pt-4 prose max-w-none whitespace-pre-wrap text-gray-800 text-sm leading-relaxed max-h-[60vh] overflow-y-auto">
                {selected.content}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}