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
            Beta · Help us improve
          </div>
          <h1 style={{
            fontSize: 'clamp(24px, 4vw, 36px)',
            fontWeight: 900,
            color: '#085041',
            margin: '0 0 12px',
            lineHeight: 1.2,
          }}>
            Help us improve UniQuest AI 🎓
          </h1>
          <p style={{
            color: '#5a7ec4',
            fontSize: 15,
            maxWidth: 460,
            margin: '0 auto',
            lineHeight: 1.6,
            fontWeight: 600,
          }}>
            We&apos;re currently inviting students to test our platform. Tell us what works, what is confusing, and what is missing, so we can fix the most important problems first.
          </p>
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
          🔒 Feedback is shown publicly only with your permission and after review · UniQuest AI by Ariesian Tech 🇵🇰
        </p>
      </div>
    </div>
  );
}