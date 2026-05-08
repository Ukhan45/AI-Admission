'use client';

import { useState, useRef, useEffect } from 'react';
import { incrementStat } from '@/lib/stats';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const TOPIC_CHIPS = [
  { label: '🎓 University Selection', prompt: 'How do I choose the right university for my field?' },
  { label: '📝 SOP Tips', prompt: 'Give me tips for writing a strong Statement of Purpose.' },
  { label: '💰 Scholarships', prompt: 'What scholarships are available for international students?' },
  { label: '🌍 Visa Process', prompt: 'What is the student visa process for studying abroad?' },
  { label: '📊 IELTS / TOEFL', prompt: 'What IELTS score do I need for top universities?' },
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

export default function Chatbot() {
  const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 120) + 'px';
  }, [input]);

  const send = async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || loading) return;

    const userMsg: Message = { role: 'user', content, timestamp: new Date() };
    const updated = [...messages, userMsg];
    setMessages(updated);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updated.map(m => ({ role: m.role, content: m.content })),
        }),
      });

      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
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
  };

  const showStarters = messages.length === 1;

  return (
    <div className="max-w-3xl mx-auto flex flex-col h-[calc(100vh-6rem)]">

      {/* Header */}
      <div className="mb-4 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">AI Chat Assistant</h1>
          <p className="text-gray-500 text-sm mt-1">Ask anything about admissions, universities, or study abroad.</p>
        </div>
        {messages.length > 1 && (
          <button
            onClick={clearChat}
            className="text-xs text-gray-400 hover:text-red-500 border border-gray-200 hover:border-red-200 px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 mt-1"
          >
            🗑 New Chat
          </button>
        )}
      </div>

      {/* Topic chips */}
      <div className="flex gap-2 flex-wrap mb-3">
        {TOPIC_CHIPS.map((chip) => (
          <button
            key={chip.label}
            onClick={() => send(chip.prompt)}
            disabled={loading}
            className="text-xs px-3 py-1.5 rounded-full border border-gray-200 bg-white text-gray-600 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition disabled:opacity-40"
          >
            {chip.label}
          </button>
        ))}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto bg-white border border-gray-100 rounded-2xl shadow-sm p-5 space-y-4">

        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'assistant' && (
              <div className="shrink-0 w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold">
                AI
              </div>
            )}
            <div className={`flex flex-col gap-1 max-w-[75%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
              <div
                className={`px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                  msg.role === 'user'
                    ? 'bg-blue-600 text-white rounded-br-sm'
                    : 'bg-slate-100 text-gray-800 rounded-bl-sm'
                }`}
              >
                {msg.content}
              </div>
              <span className="text-[10px] text-gray-400 px-1">
                {formatTime(msg.timestamp)}
              </span>
            </div>
            {msg.role === 'user' && (
              <div className="shrink-0 w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 text-xs font-bold">
                You
              </div>
            )}
          </div>
        ))}

        {/* Starter questions — shown only before first user message */}
        {showStarters && (
          <div className="pt-2">
            <p className="text-xs text-gray-400 font-medium mb-2 px-1">Common questions:</p>
            <div className="grid grid-cols-1 gap-2">
              {STARTER_QUESTIONS.map((q) => (
                <button
                  key={q}
                  onClick={() => send(q)}
                  disabled={loading}
                  className="text-left text-sm text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-100 px-4 py-2.5 rounded-xl transition disabled:opacity-40"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Typing indicator */}
        {loading && (
          <div className="flex gap-3 justify-start">
            <div className="shrink-0 w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold">
              AI
            </div>
            <div className="bg-slate-100 px-4 py-3 rounded-2xl rounded-bl-sm flex items-center gap-1.5">
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="mt-3">
        <div className="flex gap-2 items-end">
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Ask about universities, scholarships, SOPs…"
              disabled={loading}
              rows={1}
              maxLength={1000}
              className="w-full border border-gray-200 bg-white px-4 py-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition disabled:opacity-50 resize-none overflow-hidden"
            />
          </div>
          <button
            onClick={() => send()}
            disabled={loading || !input.trim()}
            className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-xl font-semibold text-sm transition disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
          >
            Send
          </button>
        </div>
        <div className="flex justify-between mt-1.5 px-1">
          <p className="text-[11px] text-gray-400">Press Enter to send • Shift+Enter for new line</p>
          <p className={`text-[11px] ${input.length > 900 ? 'text-red-400' : 'text-gray-400'}`}>
            {input.length}/1000
          </p>
        </div>
      </div>
    </div>
  );
}
