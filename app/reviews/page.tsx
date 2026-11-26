"use client";

import { useEffect, useMemo, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, query, where, limit, getDocs, Timestamp } from "firebase/firestore";
import Link from "next/link";

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
    <div style={{ display: "flex", gap: 2 }} aria-label={`${rating} out of 5`}>
      {[1, 2, 3, 4, 5].map((s) => (
        <span key={s} style={{ fontSize: 13, color: s <= rating ? "#f59e0b" : "#E1F5EE" }}>★</span>
      ))}
    </div>
  );
}

function SkeletonCard() {
  return (
    <div style={{
      background: "#fff", border: "1.5px solid #E1F5EE", borderRadius: 20,
      padding: 28, display: "flex", flexDirection: "column", gap: 12,
    }}>
      {[44, 14, 14, 14, 14, 14].map((h, i) => (
        <div key={i} style={{
          height: h, width: i === 0 ? 44 : `${[60, 40, 80, 90, 70][i - 1]}%`,
          borderRadius: i === 0 ? "50%" : 8,
          background: "linear-gradient(90deg, #f0fdf8 25%, #e8f5f0 50%, #f0fdf8 75%)",
          backgroundSize: "200% 100%",
          animation: "shimmer 1.5s infinite",
        }} />
      ))}
    </div>
  );
}

export default function ReviewsPage() {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [loading, setLoading]     = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [filter, setFilter]       = useState<number | null>(null);

  useEffect(() => {
    async function load() {
      try {
        // Only reviews whose author gave permission AND that our team approved.
        // No orderBy, so no composite index is needed; we sort in the browser.
        const q = query(
          collection(db, "feedbacks"),
          where("approved", "==", true),
          where("consentToPublish", "==", true),
          limit(100),
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
        setFeedbacks(real);
      } catch (e) {
        console.error("Could not load reviews:", e);
        setLoadError(true);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // Every number on this page is calculated from the published reviews above.
  const stats = useMemo(() => {
    const n = feedbacks.length;
    const avg = n ? feedbacks.reduce((s, f) => s + f.rating, 0) / n : 0;
    const counts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    feedbacks.forEach((f) => { counts[f.rating] += 1; });
    return { n, avg: avg.toFixed(1), counts };
  }, [feedbacks]);

  const displayed = filter ? feedbacks.filter((f) => f.rating === filter) : feedbacks;

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #f0fdf8 0%, #e8f5f0 50%, #f0f9ff 100%)",
      fontFamily: "'Nunito', sans-serif",
      padding: "48px 24px 80px",
    }}>
      <style>{`
        @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        .review-card { transition: transform 0.2s, box-shadow 0.2s; }
        .review-card:hover { transform: translateY(-4px); box-shadow: 0 8px 32px rgba(29,158,117,0.12) !important; }
        .filter-btn { transition: all 0.15s; }
        .filter-btn:hover { background: rgba(29,158,117,0.12) !important; }
      `}</style>

      <div style={{ maxWidth: 1100, margin: "0 auto" }}>

        <Link href="/dashboard" style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          color: "#1D9E75", fontWeight: 700, fontSize: 14,
          textDecoration: "none", marginBottom: 32,
        }}>
          ← Back to Dashboard
        </Link>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{
            display: "inline-block",
            background: "rgba(29,158,117,0.1)", color: "#1D9E75",
            border: "1px solid rgba(29,158,117,0.25)",
            borderRadius: 999, padding: "4px 16px",
            fontSize: 12, fontWeight: 800, letterSpacing: "0.07em",
            textTransform: "uppercase", marginBottom: 16,
          }}>
            Beta · Student Feedback
          </div>
          <h1 style={{
            fontSize: "clamp(28px, 5vw, 44px)", fontWeight: 900,
            color: "#085041", margin: "0 0 12px", lineHeight: 1.2,
          }}>
            Help us improve UniQuest AI
          </h1>
          <p style={{ color: "#5a7ec4", fontSize: 16, maxWidth: 560, margin: "0 auto", lineHeight: 1.6, fontWeight: 600 }}>
            We&apos;re currently inviting students to test our platform. Reviews appear here only
            when the author gave permission and our team has reviewed them.
          </p>
        </div>

        {/* Real statistics: only shown once real reviews exist */}
        {!loading && stats.n > 0 && (
          <div style={{ marginBottom: 36 }}>
            <div style={{
              display: "flex", justifyContent: "center", gap: 40, flexWrap: "wrap",
              background: "#fff", border: "1.5px solid #E1F5EE", borderRadius: 20,
              padding: "22px 40px",
              boxShadow: "0 2px 16px rgba(29,158,117,0.06)",
            }}>
              {[
                { num: String(stats.n), label: stats.n === 1 ? "Published review" : "Published reviews" },
                { num: `${stats.avg}★`, label: "Average of these reviews" },
              ].map((s) => (
                <div key={s.label} style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 26, fontWeight: 900, color: "#1D9E75" }}>{s.num}</div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#9a9890", textTransform: "uppercase", letterSpacing: "0.06em" }}>{s.label}</div>
                </div>
              ))}
            </div>
            <p style={{ textAlign: "center", fontSize: 12, color: "#9a9890", fontWeight: 600, margin: "10px 0 0" }}>
              Early feedback from a small group of testers. These figures are calculated only from
              the reviews shown on this page.
            </p>
          </div>
        )}

        {/* Filter by stars: only when there is something to filter */}
        {!loading && stats.n > 0 && (
          <div style={{ display: "flex", justifyContent: "center", gap: 10, flexWrap: "wrap", marginBottom: 32 }}>
            {[null, 5, 4, 3, 2, 1].map((v) => (
              <button
                key={v ?? "all"}
                className="filter-btn"
                onClick={() => setFilter(v)}
                style={{
                  padding: "8px 18px", borderRadius: 999, fontSize: 13, fontWeight: 700,
                  cursor: "pointer", border: "1.5px solid", fontFamily: "inherit",
                  background: filter === v ? "#1D9E75" : "#fff",
                  color: filter === v ? "#fff" : "#5F5E5A",
                  borderColor: filter === v ? "#1D9E75" : "#E1F5EE",
                }}
              >
                {v === null ? `All reviews (${stats.n})` : `${"★".repeat(v)} (${stats.counts[v]})`}
              </button>
            ))}
          </div>
        )}

        {/* Cards */}
        {loading ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 20 }}>
            {[1, 2, 3].map((i) => <SkeletonCard key={i} />)}
          </div>
        ) : loadError ? (
          <div style={{ textAlign: "center", padding: "48px 24px", background: "#fff", border: "1.5px solid #E1F5EE", borderRadius: 20, marginBottom: 40, color: "#5F5E5A", fontWeight: 600 }}>
            Reviews could not be loaded right now. Please try again later.
          </div>
        ) : stats.n === 0 ? (
          <div style={{ textAlign: "center", padding: "48px 24px", background: "#fff", border: "1.5px solid #E1F5EE", borderRadius: 20, marginBottom: 40 }}>
            <div style={{ fontSize: 40, marginBottom: 10 }}>🌱</div>
            <h2 style={{ fontSize: 20, fontWeight: 900, color: "#085041", margin: "0 0 8px" }}>
              No public reviews yet
            </h2>
            <p style={{ color: "#5F5E5A", fontWeight: 600, fontSize: 14, lineHeight: 1.7, maxWidth: 520, margin: "0 auto" }}>
              We are at an early beta stage and are inviting a small group of students to try
              UniQuest AI. When testers choose to share their feedback publicly and we have
              reviewed it, it will appear here. We never publish invented reviews.
            </p>
          </div>
        ) : displayed.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: "#9a9890", fontSize: 16, fontWeight: 600 }}>
            No reviews with this rating yet.
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 20, marginBottom: 56 }}>
            {displayed.map((fb) => (
              <div
                key={fb.id}
                className="review-card"
                style={{
                  background: "#fff", border: "1.5px solid #E1F5EE",
                  borderRadius: 20, padding: 28,
                  display: "flex", flexDirection: "column", gap: 12,
                  boxShadow: "0 2px 12px rgba(29,158,117,0.05)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: "50%",
                    background: "linear-gradient(135deg, #1D9E75, #085041)",
                    color: "#fff", fontSize: 18, fontWeight: 800,
                    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                  }}>
                    {fb.displayName.charAt(0).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 800, color: "#085041" }}>{fb.displayName}</div>
                    {fb.role && <div style={{ fontSize: 12, color: "#9a9890", fontWeight: 600 }}>{fb.role}</div>}
                  </div>
                  <span style={{ fontSize: 22 }}>{RATING_EMOJI[fb.rating] ?? "🙂"}</span>
                </div>
                <StarRating rating={fb.rating} />
                <p style={{ fontSize: 14, color: "#5F5E5A", lineHeight: 1.65, margin: 0, fontStyle: "italic", overflowWrap: "anywhere" }}>
                  &ldquo;{fb.message}&rdquo;
                </p>
              </div>
            ))}
          </div>
        )}

        {/* CTA */}
        <div style={{
          textAlign: "center",
          background: "#fff", border: "1.5px dashed #9FE1CB",
          borderRadius: 20, padding: "40px 24px",
        }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>✍️</div>
          <h3 style={{ fontSize: 20, fontWeight: 900, color: "#085041", margin: "0 0 8px" }}>
            Tested UniQuest AI? Tell us what you think
          </h3>
          <p style={{ color: "#5a7ec4", fontWeight: 600, fontSize: 14, margin: "0 0 24px" }}>
            Honest feedback, including what did not work, helps us fix the biggest problems first.
          </p>
          <Link href="/feedback" style={{
            display: "inline-block",
            background: "linear-gradient(135deg, #1D9E75, #085041)",
            color: "#fff", textDecoration: "none",
            borderRadius: 14, padding: "14px 36px",
            fontSize: 16, fontWeight: 800,
            boxShadow: "0 4px 24px rgba(29,158,117,0.3)",
          }}>
            Share feedback →
          </Link>
        </div>

      </div>
    </div>
  );
}