"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { doc, getDoc, setDoc, deleteDoc, serverTimestamp } from "firebase/firestore";

const EMOJI_RATINGS = [
  { emoji: "😞", label: "Poor",    value: 1 },
  { emoji: "😐", label: "Okay",    value: 2 },
  { emoji: "🙂", label: "Good",    value: 3 },
  { emoji: "😄", label: "Great",   value: 4 },
  { emoji: "🤩", label: "Amazing", value: 5 },
];

type NameStyle = "full" | "initial" | "anonymous";

// What is shown on a published review. Only the shown name is ever stored.
function buildDisplayName(name: string, style: NameStyle): string {
  const clean = name.trim().replace(/\s+/g, " ");
  if (style === "anonymous" || !clean) return "UniQuest student";
  if (style === "full") return clean;
  const parts = clean.split(" ");
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1].charAt(0).toUpperCase()}.`;
}

interface Props {
  lightMode?: boolean;
}

export default function FeedbackForm({ lightMode = false }: Props) {
  const [uid,      setUid]      = useState<string | null>(null);
  const [authDone, setAuthDone] = useState(false);

  const [name,      setName]      = useState("");
  const [nameStyle, setNameStyle] = useState<NameStyle>("initial");
  const [role,      setRole]      = useState("");
  const [message,   setMessage]   = useState("");
  const [rating,    setRating]    = useState<number | null>(null);
  const [consent,   setConsent]   = useState(false);
  const [hovered,   setHovered]   = useState<number | null>(null);

  const [hadPrevious, setHadPrevious] = useState(false);
  const [loading,   setLoading]   = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [deleted,   setDeleted]   = useState(false);
  const [error,     setError]     = useState("");

  // Know who is signed in, and load their earlier feedback (if any)
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setUid(user ? user.uid : null);
      if (user) {
        try {
          const snap = await getDoc(doc(db, "feedbacks", user.uid));
          if (snap.exists()) {
            const d = snap.data();
            setHadPrevious(true);
            setMessage(typeof d.message === "string" ? d.message : "");
            setRole(typeof d.role === "string" ? d.role : "");
            setRating(typeof d.rating === "number" ? d.rating : null);
            setConsent(d.consentToPublish === true);
          }
        } catch {
          /* no earlier feedback, or it could not be read: start with a blank form */
        }
      }
      setAuthDone(true);
    });
    return () => unsub();
  }, []);

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
    if (!uid) {
      setError("Please sign in to share feedback.");
      return;
    }
    if (!message.trim() || !rating) {
      setError("Please choose a rating and write your feedback.");
      return;
    }
    if (message.trim().length < 20) {
      setError("Please write at least 20 characters of feedback.");
      return;
    }
    if (consent && nameStyle !== "anonymous" && !name.trim()) {
      setError("Enter the name you would like shown, or choose to appear anonymously.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      // One feedback document per user (document id = user id). It is always
      // saved as "not approved": a person on our team reviews it first, and it
      // can only be shown publicly when the author gave permission.
      await setDoc(doc(db, "feedbacks", uid), {
        userId:           uid,
        displayName:      consent ? buildDisplayName(name, nameStyle) : "UniQuest student",
        role:             role.trim().slice(0, 80),
        message:          message.trim(),
        rating,
        consentToPublish: consent,
        approved:         false,
        createdAt:        serverTimestamp(),
      });
      setHadPrevious(true);
      setSubmitted(true);
    } catch (err) {
      console.error(err);
      setError("Something went wrong. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!uid) return;
    setLoading(true);
    setError("");
    try {
      await deleteDoc(doc(db, "feedbacks", uid));
      setHadPrevious(false);
      setDeleted(true);
      setSubmitted(false);
      setMessage(""); setRole(""); setRating(null); setConsent(false); setName("");
    } catch (err) {
      console.error(err);
      setError("We could not delete your feedback. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const box: React.CSSProperties = {
    textAlign: "center",
    padding: "40px 28px",
    background: c.success_bg,
    border: `1px solid ${c.success_border}`,
    borderRadius: 20,
    fontFamily: "'Nunito', sans-serif",
  };

  if (!authDone) {
    return <div style={{ ...box, color: c.success_p, fontSize: 14 }}>Loading…</div>;
  }

  if (!uid) {
    return (
      <div style={box}>
        <div style={{ fontSize: 44, marginBottom: 12 }}>🔐</div>
        <h3 style={{ fontSize: 20, fontWeight: 800, color: c.success_h, margin: "0 0 10px" }}>
          Sign in to share feedback
        </h3>
        <p style={{ color: c.success_p, margin: "0 0 22px", fontSize: 14, lineHeight: 1.6 }}>
          We only collect feedback from signed-in testers, so every review comes from a real
          person who tried UniQuest AI.
        </p>
        <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
          <Link href="/login" style={{ background: c.btn_gradient, color: "#fff", borderRadius: 12, padding: "11px 26px", fontWeight: 800, fontSize: 14, textDecoration: "none" }}>
            Sign in
          </Link>
          <Link href="/signup" style={{ background: c.sec_btn_bg, color: c.sec_btn_color, border: `1.5px solid ${c.sec_btn_border}`, borderRadius: 12, padding: "11px 26px", fontWeight: 700, fontSize: 14, textDecoration: "none" }}>
            Create account
          </Link>
        </div>
      </div>
    );
  }

  if (deleted) {
    return (
      <div style={box}>
        <div style={{ fontSize: 44, marginBottom: 12 }}>🗑️</div>
        <h3 style={{ fontSize: 20, fontWeight: 800, color: c.success_h, margin: "0 0 10px" }}>
          Your feedback was deleted
        </h3>
        <button
          onClick={() => setDeleted(false)}
          style={{ background: c.sec_btn_bg, color: c.sec_btn_color, border: `1.5px solid ${c.sec_btn_border}`, borderRadius: 12, padding: "12px 28px", fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}
        >
          Write new feedback
        </button>
      </div>
    );
  }

  if (submitted) {
    return (
      <div style={box}>
        <div style={{ fontSize: 52, marginBottom: 16 }}>🎉</div>
        <h3 style={{ fontSize: 22, fontWeight: 800, color: c.success_h, margin: "0 0 10px" }}>
          Thank you for your feedback!
        </h3>
        <p style={{ color: c.success_p, margin: "0 0 24px", fontSize: 15, lineHeight: 1.6 }}>
          {consent
            ? "It will appear on our website only after our team reviews it. You can edit or delete it at any time."
            : "We will use it privately to improve UniQuest AI. It will not be shown publicly."}
        </p>
        <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
          <button
            onClick={() => setSubmitted(false)}
            style={{ background: c.sec_btn_bg, color: c.sec_btn_color, border: `1.5px solid ${c.sec_btn_border}`, borderRadius: 12, padding: "12px 28px", fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}
          >
            Edit my feedback
          </button>
          <button
            onClick={handleDelete}
            disabled={loading}
            style={{ background: "transparent", color: c.error_text, border: `1.5px solid ${c.error_border}`, borderRadius: 12, padding: "12px 28px", fontSize: 15, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}
          >
            Delete my feedback
          </button>
        </div>
      </div>
    );
  }

  const inputStyle: React.CSSProperties = {
    background: c.input_bg,
    border: `1.5px solid ${c.input_border}`,
    borderRadius: 12,
    padding: "11px 14px",
    color: c.input_text,
    fontSize: 14,
    fontFamily: "inherit",
    outline: "none",
    transition: "border-color 0.2s, background 0.2s",
    width: "100%",
    boxSizing: "border-box",
  };
  const focus = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    e.currentTarget.style.borderColor = c.input_focus_border;
    e.currentTarget.style.background = c.input_focus_bg;
  };
  const blur = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    e.currentTarget.style.borderColor = c.input_border;
    e.currentTarget.style.background = c.input_bg;
  };
  const labelStyle: React.CSSProperties = {
    fontSize: 12, fontWeight: 800, color: c.label, textTransform: "uppercase", letterSpacing: "0.07em",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22, fontFamily: "'Nunito', sans-serif" }}>

      {hadPrevious && (
        <p style={{ margin: 0, fontSize: 13, color: c.success_p, background: c.success_bg, border: `1px solid ${c.success_border}`, borderRadius: 12, padding: "10px 14px" }}>
          You have already sent feedback. Saving again will replace it (and it will be reviewed again).{" "}
          <button type="button" onClick={handleDelete} disabled={loading} style={{ background: "none", border: "none", padding: 0, color: c.error_text, fontWeight: 800, cursor: "pointer", fontFamily: "inherit", fontSize: 13 }}>
            Delete it
          </button>
        </p>
      )}

      {/* Rating */}
      <div>
        <label style={{ ...labelStyle, display: "block", marginBottom: 12 }}>Your Overall Experience *</label>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {EMOJI_RATINGS.map((r) => {
            const isActive = activeRating === r.value;
            const isDimmed = activeRating !== null && !isActive;
            return (
              <button
                key={r.value}
                type="button"
                aria-pressed={rating === r.value}
                onMouseEnter={() => setHovered(r.value)}
                onMouseLeave={() => setHovered(null)}
                onClick={() => setRating(r.value)}
                style={{
                  flex: 1, minWidth: 64,
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
                  background: isActive ? c.emoji_active_bg : c.emoji_bg,
                  border: `2px solid ${isActive ? c.emoji_active_border : c.emoji_border}`,
                  borderRadius: 14, padding: "12px 8px", cursor: "pointer",
                  opacity: isDimmed ? 0.35 : 1,
                  transform: isActive ? "translateY(-3px)" : "none",
                  transition: "all 0.18s ease",
                }}
              >
                <span style={{ fontSize: 26, lineHeight: 1 }}>{r.emoji}</span>
                <span style={{ fontSize: 10, fontWeight: 800, color: isActive ? c.emoji_active_label : c.label, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  {r.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Message */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <label htmlFor="fb-message" style={{ ...labelStyle, display: "flex", justifyContent: "space-between" }}>
          Your Feedback *
          <span style={{ fontWeight: 400, fontSize: 12, textTransform: "none", letterSpacing: 0 }}>{message.length}/500</span>
        </label>
        <textarea
          id="fb-message"
          placeholder="What worked well? What was confusing or wrong? What should we improve?"
          value={message}
          rows={4}
          onChange={(e) => setMessage(e.target.value.slice(0, 500))}
          onFocus={focus}
          onBlur={blur}
          style={{ ...inputStyle, resize: "vertical" }}
        />
        <p style={{ margin: 0, fontSize: 12, color: c.privacy }}>
          Please do not include phone numbers, CNIC or passport numbers, or other private details.
        </p>
      </div>

      {/* Role (optional) */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <label htmlFor="fb-role" style={labelStyle}>Your stage (optional)</label>
        <input
          id="fb-role"
          type="text"
          placeholder="e.g. Final-year BS student, preparing MS applications"
          value={role}
          maxLength={80}
          onChange={(e) => setRole(e.target.value)}
          onFocus={focus}
          onBlur={blur}
          style={inputStyle}
        />
      </div>

      {/* Permission to publish */}
      <div style={{ border: `1.5px solid ${c.input_border}`, borderRadius: 14, padding: 16, background: c.input_bg }}>
        <label style={{ display: "flex", gap: 10, alignItems: "flex-start", cursor: "pointer", fontSize: 14, color: c.input_text, fontWeight: 700, lineHeight: 1.5 }}>
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            style={{ marginTop: 3, width: 18, height: 18, flexShrink: 0 }}
          />
          <span>
            I give UniQuest AI permission to show my feedback publicly on its website after it has
            been reviewed. I can edit or delete it at any time.
          </span>
        </label>

        {consent ? (
          <div style={{ marginTop: 14, display: "grid", gap: 12 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <label htmlFor="fb-show" style={labelStyle}>How should your name appear?</label>
              <select
                id="fb-show"
                value={nameStyle}
                onChange={(e) => setNameStyle(e.target.value as NameStyle)}
                onFocus={focus}
                onBlur={blur}
                style={inputStyle}
              >
                <option value="initial">First name and last initial (Ahmed K.)</option>
                <option value="full">Full name</option>
                <option value="anonymous">Anonymous (UniQuest student)</option>
              </select>
            </div>
            {nameStyle !== "anonymous" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <label htmlFor="fb-name" style={labelStyle}>Your name *</label>
                <input
                  id="fb-name"
                  type="text"
                  placeholder="e.g. Ahmed Khan"
                  value={name}
                  maxLength={60}
                  onChange={(e) => setName(e.target.value)}
                  onFocus={focus}
                  onBlur={blur}
                  style={inputStyle}
                />
                <p style={{ margin: 0, fontSize: 12, color: c.privacy }}>
                  Will be shown as: <b>{buildDisplayName(name, nameStyle)}</b>
                </p>
              </div>
            )}
          </div>
        ) : (
          <p style={{ margin: "10px 0 0", fontSize: 12, color: c.privacy, lineHeight: 1.5 }}>
            Not ticked: your feedback stays private and is used only to improve UniQuest AI.
          </p>
        )}
      </div>

      {/* Error */}
      {error && (
        <p role="alert" style={{ color: c.error_text, fontSize: 13, margin: 0, padding: "10px 14px", background: c.error_bg, border: `1px solid ${c.error_border}`, borderRadius: 10 }}>
          ⚠️ {error}
        </p>
      )}

      {/* Submit */}
      <button
        type="button"
        onClick={handleSubmit}
        disabled={loading}
        style={{
          background: c.btn_gradient, color: "#fff", border: "none", borderRadius: 14,
          padding: "15px 32px", fontSize: 16, fontWeight: 800,
          cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1,
          fontFamily: "inherit", boxShadow: c.btn_shadow, transition: "all 0.2s",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
        }}
        onMouseEnter={(e) => { if (!loading) e.currentTarget.style.boxShadow = c.btn_shadow_hover; }}
        onMouseLeave={(e) => { e.currentTarget.style.boxShadow = c.btn_shadow; }}
      >
        {loading
          ? <span style={{ width: 20, height: 20, border: "2.5px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", display: "inline-block", animation: "spin 0.7s linear infinite" }} />
          : hadPrevious ? "✨ Save my feedback" : "✨ Submit Feedback"}
      </button>

      <p style={{ textAlign: "center", fontSize: 12, color: c.privacy, margin: 0 }}>
        🔒 Reviews are checked by our team and shown only with your permission. See our{" "}
        <Link href="/privacy" style={{ color: c.sec_btn_color, fontWeight: 700 }}>Privacy Policy</Link>.
      </p>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}