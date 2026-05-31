'use client';

import { useState, useRef, useEffect } from 'react';
import { incrementStat } from '@/lib/stats';
import { auth } from '@/lib/firebase';
import Link from 'next/link';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const TOPIC_CHIPS = [
  { label: '🎓 University Selection', prompt: 'How do I choose the right university for my field?' },
  { label: '📝 SOP Tips',             prompt: 'Give me tips for writing a strong Statement of Purpose.' },
  { label: '💰 Scholarships',         prompt: 'What scholarships are available for international students?' },
  { label: '🌍 Visa Process',         prompt: 'What is the student visa process for studying abroad?' },
  { label: '📊 IELTS / TOEFL',        prompt: 'What IELTS score do I need for top universities?' },
  { label: '📅 Application Timeline', prompt: 'What is the typical application timeline for Fall intake?' },
];

const STARTER_QUESTIONS = [
  'What GPA do I need for universities in Germany?',
  'How do I get a scholarship for Canada?',
  'Can I study in the UK without IELTS?',
  'What documents are needed for a student visa?',
];

function formatTime(date: Date) {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

const INITIAL_MESSAGE: Message = {
  role: 'assistant',
  content: "Hi! I'm your AI Admissions Assistant. I can help you with university selection, SOPs, scholarships, visa processes, and more.\n\nWhat would you like to know? 🎓",
  timestamp: new Date(),
};

function UpgradeBanner() {
  return (
    <div className="mt-4 rounded-3xl bg-gradient-to-r from-[#0c8f6f] to-[#28b487] p-5 text-white shadow-lg">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-lg font-bold">🚀 Upgrade to Pro</p>
          <p className="text-sm text-emerald-100 mt-1">
            Unlock unlimited AI chats, premium university insights, SOP generation, and more.
          </p>
        </div>
        <Link
          href="/checkout"
          className="bg-white text-[#0c8f6f] font-semibold px-5 py-3 rounded-2xl hover:scale-105 transition text-center whitespace-nowrap"
        >
          Upgrade — PKR 800/mo
        </Link>
      </div>
    </div>
  );
}

export default function Chatbot() {
  const [messages, setMessages]     = useState<Message[]>([INITIAL_MESSAGE]);
  const [input, setInput]           = useState('');
  const [loading, setLoading]       = useState(false);
  const [limitReached, setLimitReached] = useState(false);

  const bottomRef   = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 120) + 'px';
  }, [input]);

  const send = async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || loading || limitReached) return;

    const userMsg: Message = { role: 'user', content, timestamp: new Date() };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setInput('');
    setLoading(true);

    try {
      const token = await auth.currentUser?.getIdToken();

      if (!token) {
        setMessages([...updated, {
          role: 'assistant',
          content: 'You must be logged in to use the chat. Please log in and try again.',
          timestamp: new Date(),
        }]);
        return;
      }

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          messages: updated.map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      const data = await res.json();

      if (res.status === 402 && data.error === 'limit_reached') {
        setLimitReached(true);
        setMessages([...updated, {
          role: 'assistant',
          content: "You've reached your free message limit. Upgrade to Pro to continue chatting 🚀",
          timestamp: new Date(),
        }]);
        return;
      }

      if (!res.ok) throw new Error('Failed');

      setMessages([...updated, {
        role: 'assistant',
        content: data.reply,
        timestamp: new Date(),
      }]);

      incrementStat('chatMessages');
    } catch {
      setMessages([...updated, {
        role: 'assistant',
        content: 'Sorry, something went wrong. Please try again.',
        timestamp: new Date(),
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const clearChat = () => {
    setMessages([{ ...INITIAL_MESSAGE, timestamp: new Date() }]);
    setInput('');
    setLimitReached(false);
  };

  const showStarters = messages.length === 1;

  return (
    <div className="min-h-screen bg-[#f5f7f2] p-4 sm:p-6">
      <div className="max-w-6xl mx-auto">

        {/* ── HEADER ── */}
        <div className="mb-6">
          <div className="inline-flex items-center gap-2 bg-[#dff1e8] px-4 py-2 rounded-full text-[#0c8f6f] text-sm font-semibold mb-4">
            ✨ AI ASSISTANT
          </div>

          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              {/* Responsive heading: text-3xl on mobile, text-5xl on desktop */}
              <h1 className="text-3xl sm:text-5xl font-bold text-[#063b36]">
                AI Chat Assistant
              </h1>
              <p className="text-[#6b7280] mt-3 text-base sm:text-lg">
                Get AI-powered guidance for admissions, SOPs, scholarships, visas, and universities.
              </p>
            </div>

            {messages.length > 1 && (
              <button
                onClick={clearChat}
                className="bg-white border border-[#d7e7de] hover:border-[#0c8f6f] text-[#063b36] px-4 py-2 sm:px-5 sm:py-3 rounded-2xl transition font-medium shadow-sm text-sm sm:text-base"
              >
                🗑 New Chat
              </button>
            )}
          </div>
        </div>

        {/* ── TOPIC CHIPS ── */}
        <div className="flex flex-wrap gap-2 sm:gap-3 mb-6">
          {TOPIC_CHIPS.map((chip) => (
            <button
              key={chip.label}
              onClick={() => send(chip.prompt)}
              disabled={loading || limitReached}
              className="bg-white border border-[#d7e7de] hover:bg-[#0c8f6f] hover:text-white hover:border-[#0c8f6f] px-3 py-2 sm:px-4 rounded-2xl text-xs sm:text-sm font-medium transition-all duration-200 shadow-sm disabled:opacity-40"
            >
              {chip.label}
            </button>
          ))}
        </div>

        {/* ── CHAT CONTAINER ── */}
        <div className="bg-white rounded-[24px] sm:rounded-[32px] border border-[#e5eee9] shadow-sm overflow-hidden">

          {/* Chat header */}
          <div className="border-b border-[#eef2ef] px-4 sm:px-6 py-4 sm:py-5 flex items-center justify-between">
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-[#063b36]">Admissions AI</h2>
              <p className="text-xs sm:text-sm text-[#6b7280] mt-1">Ask anything about studying abroad</p>
            </div>
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-r from-[#0c8f6f] to-[#28b487] flex items-center justify-center text-white font-bold shadow-lg text-sm">
              AI
            </div>
          </div>

          {/* Messages */}
          <div className="h-[60vh] sm:h-[65vh] overflow-y-auto px-4 sm:px-6 py-6 space-y-5 bg-[#fbfcfb]">

            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] sm:max-w-[80%] ${msg.role === 'user' ? 'items-end' : 'items-start'} flex flex-col`}>
                  <div className={`px-4 sm:px-5 py-3 sm:py-4 rounded-3xl text-sm leading-relaxed shadow-sm whitespace-pre-wrap ${
                    msg.role === 'user'
                      ? 'bg-gradient-to-r from-[#0c8f6f] to-[#28b487] text-white rounded-br-md'
                      : 'bg-white border border-[#e5eee9] text-[#063b36] rounded-bl-md'
                  }`}>
                    {msg.content}
                  </div>
                  <span className="text-[11px] text-gray-400 mt-1 px-2">{formatTime(msg.timestamp)}</span>
                </div>
              </div>
            ))}

            {/* Starter questions */}
            {showStarters && (
              <div className="pt-4">
                <p className="text-sm text-[#6b7280] mb-4 font-medium">Suggested Questions</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {STARTER_QUESTIONS.map((q) => (
                    <button
                      key={q}
                      onClick={() => send(q)}
                      disabled={loading}
                      className="text-left bg-white border border-[#d7e7de] hover:border-[#0c8f6f] hover:bg-[#f2fbf8] rounded-2xl p-4 transition shadow-sm"
                    >
                      <p className="text-[#063b36] text-sm font-medium">{q}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Loading dots */}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-white border border-[#e5eee9] px-5 py-4 rounded-3xl rounded-bl-md shadow-sm flex gap-2">
                  <span className="w-2.5 h-2.5 bg-[#0c8f6f] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2.5 h-2.5 bg-[#0c8f6f] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2.5 h-2.5 bg-[#0c8f6f] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input area */}
          {!limitReached && (
            <div className="border-t border-[#eef2ef] bg-white p-4 sm:p-5">
              <div className="flex items-end gap-2 sm:gap-3">
                <div className="flex-1">
                  <textarea
                    ref={textareaRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKey}
                    placeholder="Ask about universities, scholarships, SOPs..."
                    disabled={loading}
                    rows={1}
                    maxLength={1000}
                    className="w-full bg-[#f7faf8] border border-[#d7e7de] focus:border-[#0c8f6f] focus:ring-4 focus:ring-[#0c8f6f]/10 rounded-2xl px-4 sm:px-5 py-3 sm:py-4 text-sm outline-none resize-none overflow-hidden transition"
                  />
                </div>
                <button
                  onClick={() => send()}
                  disabled={loading || !input.trim()}
                  className="bg-gradient-to-r from-[#0c8f6f] to-[#28b487] hover:scale-105 text-white px-5 sm:px-7 py-3 sm:py-4 rounded-2xl font-semibold shadow-lg transition disabled:opacity-50 text-sm sm:text-base whitespace-nowrap"
                >
                  Send
                </button>
              </div>

              <div className="flex justify-between mt-3 px-1">
                <p className="text-xs text-[#9ca3af] hidden sm:block">
                  Press Enter to send • Shift + Enter for new line
                </p>
                <p className="text-xs text-[#9ca3af] sm:hidden">Enter to send</p>
                <p className={`text-xs ${input.length > 900 ? 'text-red-400' : 'text-[#9ca3af]'}`}>
                  {input.length}/1000
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Upgrade banner */}
        {limitReached && <UpgradeBanner />}
      </div>
    </div>
  );
}
