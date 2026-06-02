"use client";

import { useState } from "react";
import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";

const EMOJI_RATINGS = [
  { emoji: "😞", label: "Poor",    value: 1 },
  { emoji: "😐", label: "Okay",    value: 2 },
  { emoji: "🙂", label: "Good",    value: 3 },
  { emoji: "😄", label: "Great",   value: 4 },
  { emoji: "🤩", label: "Amazing", value: 5 },
];

interface Props {
  lightMode?: boolean;
}

export default function FeedbackForm({ lightMode = false }: Props) {
  const [name,    setName]    = useState("");
  const [role,    setRole]    = useState("");
  const [message, setMessage] = useState("");
  const [rating,  setRating]  = useState<number | null>(null);
  const [hovered, setHovered] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error,   setError]   = useState("");

  const c = lightMode ? {
    label:       '#5F5E5A',
    input_bg:    '#F5FDFB',
    input_border:'#E1F5EE',
    input_text:  '#085041',
    input_focus_border: '#1D9E75',
    input_focus_bg: 'rgba(29,158,117,0.04)',
    placeholder: '#B4B2A9',
    emoji_bg:    '#F5FDFB',
    emoji_border:'#E1F5EE',
    emoji_active_bg:    'rgba(29,158,117,0.1)',
    emoji_active_border:'#1D9E75',
    emoji_active_label: '#085041',
    btn_gradient:'linear-gradient(135deg, #1D9E75, #085041)',
    btn_shadow:  '0 4px 24px rgba(29,158,117,0.3)',
    btn_shadow_hover: '0 8px 32px rgba(29,158,117,0.45)',
    error_bg:    'rgba(239,68,68,0.06)',
    error_border:'rgba(239,68,68,0.2)',
    error_text:  '#dc2626',
    privacy:     '#B4B2A9',
    success_bg:  '#F5FDFB',
    success_border:'#E1F5EE',
    success_h:   '#085041',
    success_p:   '#5a7ec4',
    sec_btn_bg:  'rgba(29,158,117,0.08)',
    sec_btn_color:'#1D9E75',
    sec_btn_border:'rgba(29,158,117,0.25)',
  } : {
    label:       '#94a3b8',
    input_bg:    'rgba(255,255,255,0.04)',
    input_border:'rgba(255,255,255,0.08)',
    input_text:  '#f1f5f9',
    input_focus_border: 'rgba(99,102,241,0.5)',
    input_focus_bg: 'rgba(99,102,241,0.05)',
    placeholder: '#334155',
    emoji_bg:    'rgba(255,255,255,0.04)',
    emoji_border:'rgba(255,255,255,0.08)',
    emoji_active_bg:    'rgba(99,102,241,0.18)',
    emoji_active_border:'#6366f1',
    emoji_active_label: '#818cf8',
    btn_gradient:'linear-gradient(135deg, #6366f1, #8b5cf6)',
    btn_shadow:  '0 4px 24px rgba(99,102,241,0.3)',
    btn_shadow_hover: '0 8px 32px rgba(99,102,241,0.45)',
    error_bg:    'rgba(248,113,113,0.08)',
    error_border:'rgba(248,113,113,0.2)',
    error_text:  '#f87171',
    privacy:     '#475569',
    success_bg:  '#0f172a',
    success_border:'rgba(99,102,241,0.2)',
    success_h:   '#f1f5f9',
    success_p:   '#94a3b8',
    sec_btn_bg:  'rgba(99,102,241,0.12)',
    sec_btn_color:'#818cf8',
    sec_btn_border:'rgba(99,102,241,0.3)',
  };

  const activeRating = hovered ?? rating;

  const handleSubmit = async () => {
    if (!name.trim() || !message.trim() || !rating) {
      setError("Please fill in your name, feedback, and select a rating.");
      return;
    }
    if (message.trim().length < 20) {
      setError("Please write at least 20 characters of feedback.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await addDoc(collection(db, "feedbacks"), {
        name:      name.trim(),
        role:      role.trim() || "UniQuest User",
        message:   message.trim(),
        rating,
        approved:  false,
        createdAt: serverTimestamp(),
      });
      setSubmitted(true);
    } catch (err) {
      console.error(err);
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div style={{
        textAlign: 'center',
        padding: '48px 32px',
        background: c.success_bg,
        border: `1px solid ${c.success_border}`,
        borderRadius: 20,
      }}>
        <div style={{ fontSize: 52, marginBottom: 16 }}>🎉</div>
        <h3 style={{ fontSize: 22, fontWeight: 800, color: c.success_h, margin: '0 0 10px' }}>
          Thank you for your feedback!
        </h3>
        <p style={{ color: c.success_p, margin: '0 0 28px', fontSize: 15 }}>
          Your review helps other Pakistani students find UniQuest AI.
        </p>
        <button
          onClick={() => { setSubmitted(false); setName(""); setRole(""); setMessage(""); setRating(null); }}
          style={{
            background: c.sec_btn_bg,
            color: c.sec_btn_color,
            border: `1.5px solid ${c.sec_btn_border}`,
            borderRadius: 12,
            padding: '12px 28px',
            fontSize: 15,
            fontWeight: 700,
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          Submit Another
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22, fontFamily: "'Nunito', sans-serif" }}>

      {/* Rating */}
      <div>
        <label style={{ display: 'block', fontSize: 12, fontWeight: 800, color: c.label, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 12 }}>
          Your Overall Experience
        </label>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {EMOJI_RATINGS.map((r) => {
            const isActive = activeRating === r.value;
            const isDimmed = activeRating !== null && !isActive;
            return (
              <button
                key={r.value}
                type="button"
                onMouseEnter={() => setHovered(r.value)}
                onMouseLeave={() => setHovered(null)}
                onClick={() => setRating(r.value)}
                style={{
                  flex: 1, minWidth: 64,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                  background: isActive ? c.emoji_active_bg : c.emoji_bg,
                  border: `2px solid ${isActive ? c.emoji_active_border : c.emoji_border}`,
                  borderRadius: 14,
                  padding: '12px 8px',
                  cursor: 'pointer',
                  opacity: isDimmed ? 0.35 : 1,
                  transform: isActive ? 'translateY(-3px)' : 'none',
                  transition: 'all 0.18s ease',
                }}
              >
                <span style={{ fontSize: 26, lineHeight: 1 }}>{r.emoji}</span>
                <span style={{
                  fontSize: 10, fontWeight: 800,
                  color: isActive ? c.emoji_active_label : c.label,
                  textTransform: 'uppercase', letterSpacing: '0.05em',
                }}>
                  {r.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Name & Role */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {[
          { id: 'fb-name', label: 'Your Name *',          placeholder: 'e.g. Ahmed Khan',    value: name,    set: setName,    max: 60  },
          { id: 'fb-role', label: 'Your Role / University', placeholder: 'e.g. CS Student, NUST', value: role, set: setRole, max: 80 },
        ].map((f) => (
          <div key={f.id} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <label htmlFor={f.id} style={{ fontSize: 12, fontWeight: 800, color: c.label, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
              {f.label}
            </label>
            <input
              id={f.id}
              type="text"
              placeholder={f.placeholder}
              value={f.value}
              maxLength={f.max}
              onChange={(e) => f.set(e.target.value)}
              onFocus={(e) => { e.currentTarget.style.borderColor = c.input_focus_border; e.currentTarget.style.background = c.input_focus_bg; }}
              onBlur={(e)  => { e.currentTarget.style.borderColor = c.input_border;       e.currentTarget.style.background = c.input_bg; }}
              style={{
                background: c.input_bg,
                border: `1.5px solid ${c.input_border}`,
                borderRadius: 12,
                padding: '11px 14px',
                color: c.input_text,
                fontSize: 14,
                fontFamily: 'inherit',
                outline: 'none',
                transition: 'border-color 0.2s, background 0.2s',
              }}
            />
          </div>
        ))}
      </div>

      {/* Message */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <label htmlFor="fb-message" style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 800, color: c.label, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
          Your Feedback *
          <span style={{ fontWeight: 400, fontSize: 12, textTransform: 'none', letterSpacing: 0 }}>{message.length}/500</span>
        </label>
        <textarea
          id="fb-message"
          placeholder="Tell us how UniQuest AI helped your study abroad journey..."
          value={message}
          rows={4}
          onChange={(e) => setMessage(e.target.value.slice(0, 500))}
          onFocus={(e) => { e.currentTarget.style.borderColor = c.input_focus_border; e.currentTarget.style.background = c.input_focus_bg; }}
          onBlur={(e)  => { e.currentTarget.style.borderColor = c.input_border;       e.currentTarget.style.background = c.input_bg; }}
          style={{
            background: c.input_bg,
            border: `1.5px solid ${c.input_border}`,
            borderRadius: 12,
            padding: '11px 14px',
            color: c.input_text,
            fontSize: 14,
            fontFamily: 'inherit',
            outline: 'none',
            resize: 'vertical',
            transition: 'border-color 0.2s, background 0.2s',
          }}
        />
      </div>

      {/* Error */}
      {error && (
        <p style={{
          color: c.error_text, fontSize: 13, margin: 0,
          padding: '10px 14px',
          background: c.error_bg,
          border: `1px solid ${c.error_border}`,
          borderRadius: 10,
        }}>
          ⚠️ {error}
        </p>
      )}

      {/* Submit */}
      <button
        type="button"
        onClick={handleSubmit}
        disabled={loading}
        style={{
          background: c.btn_gradient,
          color: '#fff',
          border: 'none',
          borderRadius: 14,
          padding: '15px 32px',
          fontSize: 16,
          fontWeight: 800,
          cursor: loading ? 'not-allowed' : 'pointer',
          opacity: loading ? 0.7 : 1,
          fontFamily: 'inherit',
          boxShadow: c.btn_shadow,
          transition: 'all 0.2s',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
        }}
        onMouseEnter={(e) => { if (!loading) e.currentTarget.style.boxShadow = c.btn_shadow_hover; }}
        onMouseLeave={(e) => { e.currentTarget.style.boxShadow = c.btn_shadow; }}
      >
        {loading
          ? <span style={{ width: 20, height: 20, border: '2.5px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.7s linear infinite' }} />
          : '✨ Submit Feedback'
        }
      </button>

      <p style={{ textAlign: 'center', fontSize: 12, color: c.privacy, margin: 0 }}>
        🔒 Your review is moderated before going live. No spam, ever.
      </p>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
