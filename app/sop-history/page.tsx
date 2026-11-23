'use client';

import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import Link from 'next/link';

type Generation = {
  id: string;
  type: string;
  title?: string;
  university: string;
  field?: string;
  content: string;
  createdAt: Date;
};

const TYPE_LABELS: Record<string, { label: string; badge: string }> = {
  sop: { label: 'SOP', badge: 'bg-[#2d9e7a]/10 text-[#2d9e7a] border-[#b6e8d4]' },
  lor_academic: { label: 'Academic LOR', badge: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  lor_professional: { label: 'Professional LOR', badge: 'bg-purple-50 text-purple-700 border-purple-200' },
  motivation_letter: { label: 'Motivation Letter', badge: 'bg-amber-50 text-amber-700 border-amber-200' },
  visa_letter: { label: 'Visa Cover Letter', badge: 'bg-emerald-50 text-emerald-800 border-emerald-300' },
};

export default function SopHistory() {
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [selected, setSelected] = useState<Generation | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [filterType, setFilterType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

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
        where('user_id', '==', userId)
      );
      const snap = await getDocs(q);
      const gens: Generation[] = [];
      snap.forEach((doc) => {
        const d = doc.data();
        gens.push({
          id: doc.id,
          type: d.type || 'sop',
          title: d.title,
          university: d.university || 'General Document',
          field: d.field,
          content: d.content || '',
          createdAt: d.createdAt?.toDate ? d.createdAt.toDate() : new Date(d.createdAt || Date.now()),
        });
      });

      // Sort newest first client-side
      gens.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      setGenerations(gens);
      if (gens.length > 0) setSelected(gens[0]);
    } catch (e) {
      console.error('Error loading document history:', e);
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

  const handleDownloadTxt = () => {
    if (!selected) return;
    const blob = new Blob([selected.content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(selected.title || selected.university || 'Document').replace(/[^a-zA-Z0-9_-]/g, '_')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadDoc = () => {
    if (!selected) return;
    const title = selected.title || `${selected.type.toUpperCase()} - ${selected.university}`;
    const header = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"><title>' + title + '</title><style>body{font-family:Calibri,Arial,sans-serif;font-size:12pt;line-height:1.5;margin:1in;} p{margin-bottom:12pt;}</style></head><body>';
    const body = selected.content.split('\n\n').map(p => `<p>${p.replace(/\n/g, '<br/>')}</p>`).join('');
    const footer = '</body></html>';
    const blob = new Blob([header + body + footer], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.replace(/[^a-zA-Z0-9_-]/g, '_')}.doc`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredGens = generations.filter((gen) => {
    if (filterType !== 'all' && gen.type !== filterType) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchUni = gen.university?.toLowerCase().includes(q);
      const matchTitle = gen.title?.toLowerCase().includes(q);
      const matchField = gen.field?.toLowerCase().includes(q);
      if (!matchUni && !matchTitle && !matchField) return false;
    }
    return true;
  });

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
      {/* ── Page Header ── */}
      <div className="bg-white border-b border-gray-100 px-6 py-5">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <span className="inline-flex items-center gap-1.5 bg-[#f0faf6] border border-[#b6e8d4] text-[#2d9e7a] text-[11px] font-semibold uppercase tracking-widest px-3 py-1 rounded-full mb-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#f5a623] inline-block" />
              Document Vault
            </span>
            <h1 className="text-2xl font-bold text-gray-900">Document & Letter History</h1>
            <p className="text-sm text-gray-400 mt-0.5">
              Access, search, and download your Statements of Purpose, Recommendation Letters, and Visa Plans.
            </p>
          </div>
          <Link
            href="/sop-generator"
            className="self-start sm:self-auto bg-[#1a7a5e] hover:bg-[#145d47] text-white text-sm font-bold px-5 py-2.5 rounded-xl transition shadow-sm"
          >
            + Generate New Document
          </Link>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 md:py-8 space-y-4">
        {/* Filter bar */}
        {generations.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 p-3 sm:p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { id: 'all', label: 'All Documents' },
                { id: 'sop', label: 'SOPs' },
                { id: 'lor_academic', label: 'Academic LOR' },
                { id: 'lor_professional', label: 'Professional LOR' },
                { id: 'motivation_letter', label: 'Motivation' },
                { id: 'visa_letter', label: 'Visa Plans' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setFilterType(tab.id)}
                  className={`text-xs px-3 py-1.5 rounded-lg font-bold transition border ${
                    filterType === tab.id
                      ? 'bg-[#1a7a5e] text-white border-[#1a7a5e]'
                      : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <input
              type="text"
              placeholder="Search by university or program…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="text-xs bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 w-full sm:w-64 focus:outline-none focus:border-[#2d9e7a]"
            />
          </div>
        )}

        {/* Empty state */}
        {generations.length === 0 ? (
          <div className="rounded-2xl bg-white border border-gray-100 text-center py-24 px-6 shadow-sm">
            <div className="w-16 h-16 rounded-full bg-[#f0faf6] border border-[#b6e8d4] flex items-center justify-center text-3xl mx-auto mb-4">
              📝
            </div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">No documents generated yet</h2>
            <p className="text-gray-400 text-sm mb-6">
              Generate Statements of Purpose, LORs, European Motivation Letters, or Visa Cover Letters.
            </p>
            <Link
              href="/sop-generator"
              className="inline-block bg-[#1a7a5e] hover:bg-[#145d47] text-white text-sm font-bold px-5 py-2.5 rounded-xl transition"
            >
              Generate First Document →
            </Link>
          </div>
        ) : filteredGens.length === 0 ? (
          <div className="rounded-2xl bg-white border border-gray-100 text-center py-16 px-6 shadow-sm">
            <p className="text-gray-600 text-sm">No documents found matching the selected filter.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Left — list */}
            <div className="md:col-span-1 space-y-2 max-h-[75vh] overflow-y-auto pr-1">
              {filteredGens.map((gen) => {
                const typeInfo = TYPE_LABELS[gen.type] || {
                  label: gen.type.toUpperCase(),
                  badge: 'bg-gray-100 text-gray-600 border-gray-200',
                };
                const isSelected = selected?.id === gen.id;
                return (
                  <div
                    key={gen.id}
                    onClick={() => setSelected(gen)}
                    className={`cursor-pointer rounded-xl p-4 border transition ${
                      isSelected
                        ? 'bg-[#f0faf6] border-[#b6e8d4] shadow-sm'
                        : 'bg-white border-gray-100 hover:border-[#b6e8d4]/60'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${typeInfo.badge}`}>
                        {typeInfo.label}
                      </span>
                      <span className="text-[10px] text-gray-400">
                        {new Date(gen.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                    <p className={`text-sm font-semibold truncate ${isSelected ? 'text-[#1a7a5e]' : 'text-gray-800'}`}>
                      {gen.title || gen.university}
                    </p>
                    <p className="text-[11px] text-gray-400 mt-1 line-clamp-2">
                      {gen.content.slice(0, 90)}…
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Right — viewer */}
            {selected && (
              <div className="md:col-span-2 rounded-2xl bg-white border border-gray-100 shadow-sm overflow-hidden flex flex-col">
                <div className="px-6 py-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div>
                    <span
                      className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full border mb-1 ${
                        TYPE_LABELS[selected.type]?.badge || 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {TYPE_LABELS[selected.type]?.label || selected.type.toUpperCase()}
                    </span>
                    <h2 className="text-gray-900 font-bold text-base">{selected.title || selected.university}</h2>
                    <p className="text-gray-400 text-xs mt-0.5">
                      Generated on{' '}
                      {new Date(selected.createdAt).toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                    <button
                      onClick={handleCopy}
                      className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg border border-gray-200 text-gray-700 bg-white hover:bg-gray-50 transition"
                    >
                      {copied ? '✅ Copied' : '📋 Copy'}
                    </button>
                    <button
                      onClick={handleDownloadTxt}
                      className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg border border-gray-200 text-gray-700 bg-white hover:bg-gray-50 transition"
                    >
                      💾 .txt
                    </button>
                    <button
                      onClick={handleDownloadDoc}
                      className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg bg-[#1a7a5e] hover:bg-[#145d47] text-white transition"
                    >
                      📄 .doc
                    </button>
                  </div>
                </div>

                <div className="flex-1 p-5 md:p-6">
                  <div className="bg-[#f9f9f7] border border-gray-100 rounded-xl p-5 overflow-y-auto max-h-[60vh]">
                    <p className="text-gray-800 text-sm leading-8 whitespace-pre-wrap font-sans">
                      {selected.content}
                    </p>
                  </div>
                  <p className="text-[11px] text-gray-400 mt-3 text-right">
                    Review and personalize specifics before final submission to institutions or embassies.
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
