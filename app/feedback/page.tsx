import FeedbackForm from '@/components/FeedbackForm';

export default function FeedbackPage() {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #f0fdf8 0%, #e8f5f0 50%, #f0f9ff 100%)',
      fontFamily: "'Nunito', sans-serif",
      padding: '48px 24px',
    }}>
      <div style={{ maxWidth: 680, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{
            display: 'inline-block',
            background: 'rgba(29, 158, 117, 0.1)',
            color: '#1D9E75',
            border: '1px solid rgba(29, 158, 117, 0.25)',
            borderRadius: 999,
            padding: '4px 16px',
            fontSize: 12,
            fontWeight: 800,
            letterSpacing: '0.07em',
            textTransform: 'uppercase' as const,
            marginBottom: 16,
          }}>
            Share Your Experience
          </div>
          <h1 style={{
            fontSize: 'clamp(24px, 4vw, 36px)',
            fontWeight: 900,
            color: '#085041',
            margin: '0 0 12px',
            lineHeight: 1.2,
          }}>
            How has UniQuest AI helped you? 🎓
          </h1>
          <p style={{
            color: '#5a7ec4',
            fontSize: 15,
            maxWidth: 460,
            margin: '0 auto',
            lineHeight: 1.6,
            fontWeight: 600,
          }}>
            Your story inspires thousands of students across Pakistan to take the first step towards studying abroad.
          </p>
        </div>

        {/* Stats */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: 32,
          flexWrap: 'wrap',
          background: '#fff',
          border: '1.5px solid #E1F5EE',
          borderRadius: 16,
          padding: '20px 32px',
          marginBottom: 32,
          boxShadow: '0 2px 16px rgba(29,158,117,0.06)',
        }}>
          {[
            { num: '500+', label: 'Students Helped' },
            { num: '4.8★', label: 'Average Rating' },
            { num: '30+',  label: 'Universities'    },
          ].map((s, i) => (
            <div key={i} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 24, fontWeight: 900, color: '#1D9E75' }}>{s.num}</div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#B4B2A9', textTransform: 'uppercase' as const, letterSpacing: '0.06em' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Form card — light themed */}
        <div style={{
          background: '#fff',
          border: '1.5px solid #E1F5EE',
          borderRadius: 24,
          padding: '40px',
          boxShadow: '0 4px 32px rgba(29,158,117,0.08)',
        }}>
          <FeedbackForm lightMode />
        </div>

        <p style={{
          textAlign: 'center',
          fontSize: 12,
          color: '#B4B2A9',
          fontWeight: 600,
          marginTop: 20,
        }}>
          🔒 Reviews are moderated before going live · UniQuest AI by Ariesian Tech 🇵🇰
        </p>
      </div>
    </div>
  );
}
