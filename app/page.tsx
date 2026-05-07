'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getStats, type Stats } from '@/lib/stats';

const quickActions = [
  { label: 'Generate SOP',      href: '/sop-generator',      emoji: '📝', color: 'bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-700' },
  { label: 'Analyze Profile',   href: '/profile-analyzer',   emoji: '📊', color: 'bg-emerald-50 hover:bg-emerald-100 border-emerald-200 text-emerald-700' },
  { label: 'Find Universities', href: '/university-finder',  emoji: '🏛️', color: 'bg-amber-50 hover:bg-amber-100 border-amber-200 text-amber-700' },
  { label: 'AI Chat',           href: '/chatbot',            emoji: '💬', color: 'bg-violet-50 hover:bg-violet-100 border-violet-200 text-violet-700' },
];

function profileScore(stats: Stats) {
  let score = 0;
  if (stats.sopsGenerated > 0)         score += 30;
  if (stats.universitiesSearched > 0)  score += 25;
  if (stats.profilesAnalyzed > 0)      score += 30;
  if (stats.chatMessages > 2)          score += 15;
  return score;
}

function formatLastActive(iso: string) {
  if (!iso) return 'No activity yet';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)   return 'Just now';
  if (mins < 60)  return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)   return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function Dashboard() {
  const [stats, setStats] = useState<Stats>({
    sopsGenerated: 0,
    universitiesSearched: 0,
    profilesAnalyzed: 0,
    chatMessages: 0,
    lastActive: '',
  });

  useEffect(() => {
    setStats(getStats());
  }, []);

  const score = profileScore(stats);
  const totalActions = stats.sopsGenerated + stats.universitiesSearched + stats.profilesAnalyzed + stats.chatMessages;

  const statCards = [
    {
      label: 'SOPs Generated',
      value: stats.sopsGenerated,
      icon: '📝',
      bg: 'bg-blue-50',
      border: 'border-blue-100',
      text: 'text-blue-700',
      hint: 'Go to SOP Generator →',
      href: '/sop-generator',
    },
    {
      label: 'University Searches',
      value: stats.universitiesSearched,
      icon: '🏛️',
      bg: 'bg-amber-50',
      border: 'border-amber-100',
      text: 'text-amber-700',
      hint: 'Find Universities →',
      href: '/university-finder',
    },
    {
      label: 'Profiles Analyzed',
      value: stats.profilesAnalyzed,
      icon: '📊',
      bg: 'bg-emerald-50',
      border: 'border-emerald-100',
      text: 'text-emerald-700',
      hint: 'Analyze Profile →',
      href: '/profile-analyzer',
    },
    {
      label: 'Chat Messages',
      value: stats.chatMessages,
      icon: '💬',
      bg: 'bg-violet-50',
      border: 'border-violet-100',
      text: 'text-violet-700',
      hint: 'Open AI Chat →',
      href: '/chatbot',
    },
  ];

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">
          Track your admissions journey · Last active: <span className="font-medium text-gray-700">{formatLastActive(stats.lastActive)}</span>
        </p>
      </div>

      {/* Profile Score Banner */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-500 rounded-2xl p-6 mb-6 text-white shadow-md">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-blue-100 text-sm font-medium uppercase tracking-wide">Profile Completion</p>
            <p className="text-5xl font-bold mt-1">{score}<span className="text-2xl font-normal text-blue-200">%</span></p>
            <p className="text-blue-100 text-sm mt-2">
              {score === 0 && 'Start using the tools below to build your score'}
              {score > 0 && score < 50 && 'Good start! Try more tools to improve your score'}
              {score >= 50 && score < 85 && 'Great progress! Keep going 🚀'}
              {score >= 85 && 'Excellent! Your profile is well rounded ✅'}
            </p>
          </div>
          <div className="relative w-24 h-24">
            <svg viewBox="0 0 36 36" className="w-24 h-24 -rotate-90">
              <circle cx="18" cy="18" r="15.9" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="3" />
              <circle
                cx="18" cy="18" r="15.9" fill="none"
                stroke="white" strokeWidth="3"
                strokeDasharray={`${score} ${100 - score}`}
                strokeLinecap="round"
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-white font-bold text-lg">{score}%</span>
          </div>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {statCards.map((card) => (
          <Link href={card.href} key={card.label}>
            <div className={`${card.bg} border ${card.border} rounded-xl p-5 hover:shadow-md transition cursor-pointer`}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{card.label}</p>
                  <p className={`text-4xl font-bold mt-2 ${card.text}`}>{card.value}</p>
                </div>
                <span className="text-3xl">{card.icon}</span>
              </div>
              <p className={`text-xs mt-3 font-medium ${card.text}`}>{card.hint}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Activity Summary + Quick Actions */}
      <div className="grid grid-cols-2 gap-4">

        {/* Activity */}
        <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-5">
          <h2 className="font-semibold text-gray-800 mb-4">Activity Summary</h2>
          {totalActions === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">No activity yet. Start exploring the tools!</p>
          ) : (
            <div className="space-y-3">
              {[
                { label: 'SOPs Generated',       value: stats.sopsGenerated,        max: Math.max(stats.sopsGenerated, 10),        color: 'bg-blue-500' },
                { label: 'University Searches',  value: stats.universitiesSearched, max: Math.max(stats.universitiesSearched, 10), color: 'bg-amber-500' },
                { label: 'Profiles Analyzed',    value: stats.profilesAnalyzed,     max: Math.max(stats.profilesAnalyzed, 10),     color: 'bg-emerald-500' },
                { label: 'Chat Messages',        value: stats.chatMessages,         max: Math.max(stats.chatMessages, 10),         color: 'bg-violet-500' },
              ].map((item) => (
                <div key={item.label}>
                  <div className="flex justify-between text-xs text-gray-600 mb-1">
                    <span>{item.label}</span>
                    <span className="font-semibold">{item.value}</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${item.color} rounded-full transition-all duration-700`}
                      style={{ width: `${Math.min((item.value / item.max) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="bg-white border border-gray-100 rounded-xl shadow-sm p-5">
          <h2 className="font-semibold text-gray-800 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-2">
            {quickActions.map((action) => (
              <Link href={action.href} key={action.label}>
                <div className={`border rounded-xl px-3 py-3 text-center text-sm font-medium transition cursor-pointer ${action.color}`}>
                  <div className="text-2xl mb-1">{action.emoji}</div>
                  {action.label}
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}