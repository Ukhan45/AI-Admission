"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  Timestamp,
} from "firebase/firestore";
import FeedbackForm from "@/components/FeedbackForm";

interface Feedback {
  id: string;
  displayName: string;
  role: string;
  message: string;
  rating: number;
  createdAt: Timestamp | null;
}

const RATING_EMOJI: Record<number, string> = {
  1: "😞", 2: "😐", 3: "🙂", 4: "😄", 5: "🤩",
};

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="star-row" aria-label={`${rating} out of 5`}>
      {[1, 2, 3, 4, 5].map((s) => (
        <span key={s} className={s <= rating ? "star filled" : "star"}>
          ★
        </span>
      ))}
    </div>
  );
}

function TestimonialCard({ fb }: { fb: Feedback }) {
  return (
    <div className="t-card">
      <div className="t-top">
        <div className="t-avatar">
          {fb.displayName.charAt(0).toUpperCase()}
        </div>
        <div className="t-meta">
          <span className="t-name">{fb.displayName}</span>
          {fb.role && <span className="t-role">{fb.role}</span>}
        </div>
        <span className="t-emoji">{RATING_EMOJI[fb.rating] ?? "🙂"}</span>
      </div>
      <StarRating rating={fb.rating} />
      <p className="t-message">"{fb.message}"</p>
    </div>
  );
}

export default function Testimonials() {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    async function fetchFeedbacks() {
      try {
        // Only reviews the author agreed to publish AND our team approved.
        const q = query(
          collection(db, "feedbacks"),
          where("approved", "==", true),
          where("consentToPublish", "==", true),
          limit(30)
        );
        const snap = await getDocs(q);
        const real: Feedback[] = [];
        snap.forEach((d) => {
          const x = d.data();
          if (typeof x.message !== "string" || typeof x.rating !== "number" || x.rating < 1 || x.rating > 5) return;
          real.push({
            id: d.id,
            displayName: typeof x.displayName === "string" && x.displayName ? x.displayName : "UniQuest student",
            role: typeof x.role === "string" ? x.role : "",
            message: x.message,
            rating: x.rating,
            createdAt: x.createdAt ?? null,
          });
        });
        real.sort((a, b) => (b.createdAt?.toMillis?.() ?? 0) - (a.createdAt?.toMillis?.() ?? 0));
        setFeedbacks(real.slice(0, 12));
      } catch (err) {
        console.error("Could not load feedbacks:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchFeedbacks();
  }, []);

  return (
    <section className="testimonials-section">
      {/* Header */}
      <div className="section-header">
        <span className="section-badge">Beta · Student Feedback</span>
        <h2>Help us improve UniQuest AI</h2>
        <p>
          We&apos;re currently inviting students to test our platform. Published reviews appear
          here only with the author&apos;s permission.
        </p>
      </div>

      {/* Statistics: calculated from real published reviews only */}
      {feedbacks.length > 0 && (
        <div className="stats-bar">
          <div className="stat">
            <span className="stat-num">{feedbacks.length}</span>
            <span className="stat-label">{feedbacks.length === 1 ? "Published review" : "Published reviews"}</span>
          </div>
          <div className="stat-divider" />
          <div className="stat">
            <span className="stat-num">
              {(feedbacks.reduce((sum, f) => sum + f.rating, 0) / feedbacks.length).toFixed(1)}★
            </span>
            <span className="stat-label">Average of these reviews</span>
          </div>
        </div>
      )}

      {/* Cards grid */}
      {loading ? (
        <div className="skeleton-grid">
          {[1, 2, 3].map((i) => (
            <div key={i} className="skeleton-card">
              <div className="sk sk-avatar" />
              <div className="sk sk-line w60" />
              <div className="sk sk-line w40" />
              <div className="sk sk-line w80" />
              <div className="sk sk-line w90" />
              <div className="sk sk-line w70" />
            </div>
          ))}
        </div>
      ) : feedbacks.length === 0 ? (
        <div className="empty-card">
          <p className="empty-title">No public reviews yet</p>
          <p className="empty-text">
            We are at an early beta stage and are inviting a small group of students to try
            UniQuest AI. Their feedback will appear here when they choose to share it publicly.
          </p>
        </div>
      ) : (
        <div className="cards-grid">
          {feedbacks.map((fb) => (
            <TestimonialCard key={fb.id} fb={fb} />
          ))}
        </div>
      )}

      {/* CTA to open form */}
      {!showForm && (
        <div className="cta-row">
          <p className="cta-text">Tried UniQuest AI? Tell us what you think.</p>
          <button className="btn-feedback" onClick={() => setShowForm(true)}>
            ✍️ Share feedback
          </button>
        </div>
      )}

      {/* Inline feedback form */}
      {showForm && (
        <div className="form-section">
          <FeedbackForm />
        </div>
      )}

      <style jsx>{styles}</style>
    </section>
  );
}

const styles = `
  .empty-card {
    max-width: 640px;
    margin: 0 auto 40px;
    text-align: center;
    padding: 36px 24px;
    border: 1.5px dashed #9FE1CB;
    border-radius: 20px;
    background: #fff;
  }
  .empty-title { margin: 0 0 8px; font-size: 18px; font-weight: 800; color: #085041; }
  .empty-text { margin: 0; font-size: 14px; line-height: 1.7; color: #5F5E5A; }
  .testimonials-section {
    padding: 100px 24px;
    max-width: 1200px;
    margin: 0 auto;
    font-family: 'Geist', 'Inter', sans-serif;
  }

  /* Header */
  .section-header {
    text-align: center;
    margin-bottom: 48px;
  }

  .section-badge {
    display: inline-block;
    background: rgba(99, 102, 241, 0.12);
    color: #818cf8;
    border: 1px solid rgba(99, 102, 241, 0.25);
    border-radius: 999px;
    padding: 4px 16px;
    font-size: 13px;
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    margin-bottom: 16px;
  }

  .section-header h2 {
    font-size: clamp(28px, 4vw, 42px);
    font-weight: 800;
    color: #f1f5f9;
    margin: 0 0 12px;
    line-height: 1.2;
  }

  .section-header p {
    color: #94a3b8;
    font-size: 16px;
    max-width: 520px;
    margin: 0 auto;
    line-height: 1.6;
  }

  /* Stats */
  .stats-bar {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 32px;
    background: rgba(99, 102, 241, 0.06);
    border: 1px solid rgba(99, 102, 241, 0.15);
    border-radius: 16px;
    padding: 24px 40px;
    margin-bottom: 56px;
    flex-wrap: wrap;
  }

  .stat {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
  }

  .stat-num {
    font-size: 28px;
    font-weight: 800;
    color: #818cf8;
    line-height: 1;
  }

  .stat-label {
    font-size: 13px;
    color: #64748b;
    font-weight: 500;
  }

  .stat-divider {
    width: 1px;
    height: 40px;
    background: rgba(255,255,255,0.08);
  }

  /* Cards */
  .cards-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 20px;
    margin-bottom: 56px;
  }

  .t-card {
    background: linear-gradient(135deg, rgba(15,23,42,0.9), rgba(30,41,59,0.9));
    border: 1px solid rgba(255,255,255,0.06);
    border-radius: 20px;
    padding: 28px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    transition: transform 0.2s, border-color 0.2s;
  }

  .t-card:hover {
    transform: translateY(-4px);
    border-color: rgba(99, 102, 241, 0.25);
  }

  .t-top {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .t-avatar {
    width: 44px;
    height: 44px;
    border-radius: 50%;
    background: linear-gradient(135deg, #6366f1, #8b5cf6);
    color: white;
    font-size: 18px;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .t-meta {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .t-name {
    font-size: 15px;
    font-weight: 700;
    color: #f1f5f9;
  }

  .t-role {
    font-size: 12px;
    color: #64748b;
  }

  .t-emoji {
    font-size: 24px;
  }

  .star-row { display: flex; gap: 2px; }

  .star {
    font-size: 14px;
    color: #334155;
    transition: color 0.1s;
  }

  .star.filled { color: #fbbf24; }

  .t-message {
    font-size: 14px;
    color: #94a3b8;
    line-height: 1.65;
    margin: 0;
    font-style: italic;
  }

  /* Skeleton */
  .skeleton-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 20px;
    margin-bottom: 56px;
  }

  .skeleton-card {
    background: rgba(15,23,42,0.8);
    border: 1px solid rgba(255,255,255,0.05);
    border-radius: 20px;
    padding: 28px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .sk {
    background: linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 75%);
    background-size: 200% 100%;
    animation: shimmer 1.5s infinite;
    border-radius: 8px;
  }

  .sk-avatar { width: 44px; height: 44px; border-radius: 50%; }
  .sk-line { height: 14px; }
  .w40 { width: 40%; }
  .w60 { width: 60%; }
  .w70 { width: 70%; }
  .w80 { width: 80%; }
  .w90 { width: 90%; }

  @keyframes shimmer {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }

  /* CTA Row */
  .cta-row {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-direction: column;
    gap: 16px;
    padding: 48px;
    background: rgba(99, 102, 241, 0.05);
    border: 1px dashed rgba(99, 102, 241, 0.2);
    border-radius: 20px;
  }

  .cta-text {
    font-size: 18px;
    font-weight: 600;
    color: #94a3b8;
    margin: 0;
  }

  .btn-feedback {
    background: linear-gradient(135deg, #6366f1, #8b5cf6);
    color: white;
    border: none;
    border-radius: 14px;
    padding: 14px 32px;
    font-size: 16px;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.2s;
    box-shadow: 0 4px 24px rgba(99, 102, 241, 0.3);
  }

  .btn-feedback:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 32px rgba(99, 102, 241, 0.45);
  }

  /* Form section */
  .form-section {
    margin-top: 0;
    animation: slideDown 0.3s ease;
  }

  @keyframes slideDown {
    from { opacity: 0; transform: translateY(-12px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  @media (max-width: 640px) {
    .testimonials-section { padding: 60px 16px; }
    .stats-bar { gap: 20px; padding: 20px; }
    .stat-divider { display: none; }
  }
`;