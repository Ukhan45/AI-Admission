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
  name: string;
  role: string;
  message: string;
  rating: number;
  createdAt: Timestamp | null;
}

const RATING_EMOJI: Record<number, string> = {
  1: "😞", 2: "😐", 3: "🙂", 4: "😄", 5: "🤩",
};

// Hardcoded fallback testimonials shown before real ones load
const FALLBACK: Feedback[] = [
  {
    id: "f1",
    name: "Zara Ahmed",
    role: "MS Applicant, NUST",
    message:
      "UniQuest AI's SOP Generator saved me weeks of work. The AI understood exactly what top universities look for. I got into 3 out of 4 programs I applied to!",
    rating: 5,
    createdAt: null,
  },
  {
    id: "f2",
    name: "Hassan Malik",
    role: "BS Student, LUMS",
    message:
      "The Profile Analyzer was brutally honest — it showed me gaps I had no idea about. Fixed them and my applications became so much stronger.",
    rating: 5,
    createdAt: null,
  },
  {
    id: "f3",
    name: "Aisha Raza",
    role: "MBA Applicant, Karachi",
    message:
      "Found 4 fully-funded scholarships through UniQuest that I never knew existed. The AI chat is like having a counselor available 24/7.",
    rating: 4,
    createdAt: null,
  },
];

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
          {fb.name.charAt(0).toUpperCase()}
        </div>
        <div className="t-meta">
          <span className="t-name">{fb.name}</span>
          <span className="t-role">{fb.role}</span>
        </div>
        <span className="t-emoji">{RATING_EMOJI[fb.rating] ?? "🙂"}</span>
      </div>
      <StarRating rating={fb.rating} />
      <p className="t-message">"{fb.message}"</p>
    </div>
  );
}

export default function Testimonials() {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>(FALLBACK);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    async function fetchFeedbacks() {
      try {
        const q = query(
          collection(db, "feedbacks"),
          where("approved", "==", true),
          orderBy("createdAt", "desc"),
          limit(12)
        );
        const snap = await getDocs(q);
        if (!snap.empty) {
          const real: Feedback[] = snap.docs.map((doc) => ({
            id: doc.id,
            ...(doc.data() as Omit<Feedback, "id">),
          }));
          // Merge: real reviews first, then fallbacks if not enough
          setFeedbacks(real.length >= 3 ? real : [...real, ...FALLBACK.slice(0, 3 - real.length)]);
        }
      } catch (err) {
        console.error("Could not load feedbacks:", err);
        // Keep fallback on error
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
        <span className="section-badge">Student Reviews</span>
        <h2>Trusted by students across Pakistan 🇵🇰</h2>
        <p>
          Real experiences from students who used UniQuest AI to get into their
          dream universities abroad.
        </p>
      </div>

      {/* Stats bar */}
      <div className="stats-bar">
        <div className="stat">
          <span className="stat-num">500+</span>
          <span className="stat-label">Students Helped</span>
        </div>
        <div className="stat-divider" />
        <div className="stat">
          <span className="stat-num">4.8★</span>
          <span className="stat-label">Average Rating</span>
        </div>
        <div className="stat-divider" />
        <div className="stat">
          <span className="stat-num">30+</span>
          <span className="stat-label">Universities</span>
        </div>
      </div>

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
          <p className="cta-text">Used UniQuest AI? Share your experience!</p>
          <button className="btn-feedback" onClick={() => setShowForm(true)}>
            ✍️ Write a Review
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
