// components/OnboardingTour.tsx
// Place at: components/OnboardingTour.tsx
// Then add <OnboardingTour /> inside your dashboard layout or app/dashboard/page.tsx

'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  User, BarChart, FileText, Globe, GraduationCap,
  BookOpen, MessageCircle, X, ChevronRight, ChevronLeft, Sparkles
} from 'lucide-react';

// ── Tour steps ────────────────────────────────────────────────────────────────
const STEPS = [
  {
    id: 'welcome',
    type: 'modal', // full-screen modal, no target element
    icon: Sparkles,
    iconBg: '#e8f5ee',
    iconColor: '#1a6b45',
    title: 'Welcome to UniQuest 👋',
    subtitle: "You're in the right place",
    body: "UniQuest helps Pakistani students navigate the entire process of studying abroad — from building your profile to finding universities, generating your SOP, and applying for scholarships. Let us show you where to start.",
    cta: "Show me around",
    skip: "I'll explore myself",
  },
  {
    id: 'profile',
    type: 'spotlight',
    target: '/profile',
    icon: User,
    iconBg: '#e8f0fb',
    iconColor: '#1e3f8a',
    step: 1,
    label: 'Start Here — Build Your Profile',
    title: 'Step 1: Fill in your profile first',
    body: "Before anything else, fill in your academic profile — your degree, CGPA, test scores, and experience. Every other tool on UniQuest uses this information to give you personalised results.",
    tip: '⏱ Takes about 5 minutes. Do this before using any other feature.',
    action: { label: 'Go to Profile →', href: '/profile' },
  },
  {
    id: 'analyzer',
    type: 'spotlight',
    target: '/profile-analyzer',
    icon: BarChart,
    iconBg: '#fdf3e0',
    iconColor: '#8a5a0a',
    step: 2,
    label: 'Then — Analyze Your Profile',
    title: 'Step 2: See where you stand',
    body: "Once your profile is filled, run the Profile Analyzer. It reviews your CGPA, test scores, and experience against real admission requirements — and tells you honestly which universities are realistic for you.",
    tip: '💡 This saves you from applying to universities you have no chance at — and from underselling yourself.',
    action: { label: 'Try Profile Analyzer →', href: '/profile-analyzer' },
  },
  {
    id: 'universities',
    type: 'spotlight',
    target: '/university-finder',
    icon: Globe,
    iconBg: '#e8f5ee',
    iconColor: '#1a6b45',
    step: 3,
    label: 'Find Your Universities',
    title: 'Step 3: Find universities that match you',
    body: "Use the University Finder to search programs by country, field, tuition budget, and ranking. Filter by HEC-recognized universities so your degree is valid in Pakistan. Shortlist 5–8 to apply to.",
    tip: '🎯 Mix reach, target, and safe universities. Never apply to just one.',
    action: { label: 'Find Universities →', href: '/university-finder' },
  },
  {
    id: 'scholarships',
    type: 'spotlight',
    target: '/scholarship-finder',
    icon: GraduationCap,
    iconBg: '#eeeefb',
    iconColor: '#3a3a9e',
    step: 4,
    label: 'Find Scholarships',
    title: 'Step 4: Search for funding',
    body: "Explore scholarships available to Pakistani students — HEC, Fulbright, Erasmus, DAAD, CSC China, and many more. Filter by country, field, and funding type. Apply for scholarships at the same time as universities.",
    tip: '⚡ Scholarship deadlines are often earlier than university deadlines. Do not wait for an offer first.',
    action: { label: 'Find Scholarships →', href: '/scholarship-finder' },
  },
  {
    id: 'sop',
    type: 'spotlight',
    target: '/sop-generator',
    icon: FileText,
    iconBg: '#fdeee9',
    iconColor: '#b03a20',
    step: 5,
    label: 'Write Your SOP',
    title: 'Step 5: Generate your Statement of Purpose',
    body: "Your SOP is the most important part of your application. Use the SOP Generator to create a personalised, university-specific statement. Fill in your achievements, goals, and why you chose that university — the more specific, the better.",
    tip: '✏️ Generate a different SOP for every university you apply to. Never send the same one.',
    action: { label: 'Generate SOP →', href: '/sop-generator' },
  },
  {
    id: 'guide',
    type: 'spotlight',
    target: '/abroad-guide',
    icon: BookOpen,
    iconBg: '#e5f3f7',
    iconColor: '#1a5a6b',
    step: 6,
    label: 'Read the Full Guide',
    title: 'Step 6: Follow the complete abroad guide',
    body: "New to studying abroad? Read the Abroad Guide — a step-by-step roadmap covering IELTS, HEC Equivalence, document attestation, visa requirements, proof of funds, and your first week after arriving.",
    tip: '📖 Bookmark this — you will refer back to it throughout the process.',
    action: { label: 'Read Abroad Guide →', href: '/abroad-guide' },
  },
  {
    id: 'chat',
    type: 'spotlight',
    target: '/chatbot',
    icon: MessageCircle,
    iconBg: '#e8f5ee',
    iconColor: '#1a6b45',
    step: 7,
    label: 'Ask Anything',
    title: 'And whenever you are stuck — just ask',
    body: "The AI Chat is available 24/7 to answer any question about studying abroad — visa requirements, scholarship eligibility, IELTS prep, document attestation, or anything else. No question is too basic.",
    tip: '💬 Ask specific questions. "What documents do I need for a German student visa?" works much better than "Tell me about Germany."',
    action: { label: 'Open AI Chat →', href: '/chatbot' },
  },
  {
    id: 'done',
    type: 'modal',
    icon: Sparkles,
    iconBg: '#1a6b45',
    iconColor: '#ffffff',
    title: "You're all set! 🎉",
    subtitle: 'Your recommended first action',
    body: "Go fill in your profile now — it takes 5 minutes and unlocks personalised results across every tool on UniQuest. That is the single best first step you can take right now.",
    cta: 'Go to my Profile',
    ctaHref: '/profile',
    skip: 'Go to Dashboard',
    skipHref: '/dashboard',
  },
];

const STORAGE_KEY = 'uniquest_tour_completed';

// ── Progress dots ──────────────────────────────────────────────────────────────
function Dots({ total, current }: { total: number; current: number }) {
  return (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className="rounded-full transition-all duration-300"
          style={{
            width: i === current ? 20 : 6,
            height: 6,
            background: i === current ? '#2d9e7a' : '#d1d5db',
          }}
        />
      ))}
    </div>
  );
}

// ── Step badge ─────────────────────────────────────────────────────────────────
function StepBadge({ step, total }: { step: number; total: number }) {
  return (
    <span className="inline-flex items-center gap-1 bg-[#f0faf6] border border-[#b6e8d4] text-[#1a7a5e] text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full">
      Step {step} of {total}
    </span>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function OnboardingTour() {
  const router = useRouter();
  const [visible, setVisible] = useState(false);
  const [current, setCurrent] = useState(0);
  const [animating, setAnimating] = useState(false);

  const spotlightSteps = STEPS.filter(s => s.type === 'spotlight');
  const totalSpotlight = spotlightSteps.length;

  useEffect(() => {
    const done = localStorage.getItem(STORAGE_KEY);
    if (!done) {
      // Small delay so page renders first
      const t = setTimeout(() => setVisible(true), 800);
      return () => clearTimeout(t);
    }
  }, []);

  const completeTour = () => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setVisible(false);
  };

  const goTo = (index: number) => {
    if (animating) return;
    setAnimating(true);
    setTimeout(() => {
      setCurrent(index);
      setAnimating(false);
    }, 150);
  };

  const next = () => {
    if (current < STEPS.length - 1) goTo(current + 1);
  };

  const prev = () => {
    if (current > 0) goTo(current - 1);
  };

  const handleCta = (href?: string) => {
    completeTour();
    if (href) router.push(href);
  };

  if (!visible) return null;

  const step = STEPS[current];
  const isFirst = current === 0;
  const isLast = current === STEPS.length - 1;
  const isModal = step.type === 'modal';
  const spotlightIndex = spotlightSteps.findIndex(s => s.id === step.id);

  const Icon = step.icon;

  return (
    <>
      {/* ── Backdrop ── */}
      <div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
        style={{ transition: 'opacity 0.2s' }}
        onClick={() => { if (isModal) completeTour(); }}
      />

      {/* ── Card ── */}
      <div
        className="fixed z-50 pointer-events-none"
        style={{
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          className="pointer-events-auto w-full mx-4"
          style={{
            maxWidth: isModal ? 480 : 420,
            opacity: animating ? 0 : 1,
            transform: animating ? 'translateY(8px)' : 'translateY(0)',
            transition: 'opacity 0.15s, transform 0.15s',
          }}
        >
          <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">

            {/* ── Card top color bar ── */}
            <div
              className="h-1.5 w-full"
              style={{
                background: `linear-gradient(to right, #2d9e7a ${((current + 1) / STEPS.length) * 100}%, #e5e7eb ${((current + 1) / STEPS.length) * 100}%)`,
                transition: 'background 0.3s',
              }}
            />

            {/* ── Card header ── */}
            <div className="flex items-start justify-between px-5 pt-5 pb-0">
              <div className="flex items-center gap-3">
                {/* Icon */}
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: step.iconBg }}
                >
                  <Icon size={20} color={step.iconColor} />
                </div>
                {/* Step badge for spotlight steps */}
                {!isModal && typeof step.step === 'number' && (
                  <StepBadge step={step.step} total={totalSpotlight} />
                )}
              </div>
              {/* Close */}
              <button
                onClick={completeTour}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition shrink-0"
              >
                <X size={16} />
              </button>
            </div>

            {/* ── Card body ── */}
            <div className="px-5 py-4">
              {isModal && step.subtitle && (
                <p className="text-[11px] font-bold text-[#2d9e7a] uppercase tracking-widest mb-1">{step.subtitle}</p>
              )}
              {!isModal && step.label && (
                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1">{step.label}</p>
              )}
              <h2 className="text-lg font-bold text-gray-900 mb-2 leading-snug">{step.title}</h2>
              <p className="text-sm text-gray-600 leading-6">{step.body}</p>

              {/* Tip box */}
              {'tip' in step && step.tip && (
                <div className="mt-3 bg-[#f0faf6] border border-[#b6e8d4] rounded-xl px-3 py-2.5">
                  <p className="text-xs text-[#1a7a5e] leading-5">{step.tip}</p>
                </div>
              )}

              {/* Spotlight action button */}
              {'action' in step && step.action && (
                <button
                  onClick={() => {
                    completeTour();
                    router.push(step.action!.href);
                  }}
                  className="mt-4 w-full flex items-center justify-center gap-2 bg-[#2d9e7a] hover:bg-[#1a7a5e] text-white font-bold py-2.5 rounded-xl transition text-sm"
                >
                  {step.action.label}
                  <ChevronRight size={14} />
                </button>
              )}

              {/* Modal CTA buttons */}
              {isModal && step.cta && (
                <div className="mt-4 flex flex-col gap-2">
                  <button
                    onClick={() => {
                      if (isLast) {
                        handleCta(step.ctaHref);
                      } else {
                        next();
                      }
                    }}
                    className="w-full flex items-center justify-center gap-2 bg-[#2d9e7a] hover:bg-[#1a7a5e] text-white font-bold py-3 rounded-xl transition text-sm"
                  >
                    {step.cta}
                    {!isLast && <ChevronRight size={14} />}
                  </button>
                  {step.skip && (
                    <button
                      onClick={() => {
                        if (isLast && step.skipHref) {
                          handleCta(step.skipHref);
                        } else {
                          completeTour();
                        }
                      }}
                      className="w-full text-sm text-gray-400 hover:text-gray-600 py-2 transition"
                    >
                      {step.skip}
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* ── Card footer — navigation ── */}
            {!isModal && (
              <div className="flex items-center justify-between px-5 pb-5 pt-1">
                <button
                  onClick={prev}
                  disabled={isFirst}
                  className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed transition"
                >
                  <ChevronLeft size={15} /> Back
                </button>

                <Dots total={STEPS.length} current={current} />

                {isLast ? (
                  <button
                    onClick={completeTour}
                    className="text-sm font-bold text-[#2d9e7a] hover:text-[#1a7a5e] transition"
                  >
                    Finish
                  </button>
                ) : (
                  <button
                    onClick={next}
                    className="flex items-center gap-1 text-sm font-bold text-[#2d9e7a] hover:text-[#1a7a5e] transition"
                  >
                    Next <ChevronRight size={15} />
                  </button>
                )}
              </div>
            )}

          </div>

          {/* ── Skip tour link below card ── */}
          {!isModal && (
            <div className="text-center mt-3">
              <button
                onClick={completeTour}
                className="text-xs text-white/60 hover:text-white transition"
              >
                Skip tour
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
