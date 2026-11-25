// components/AIDisclaimer.tsx
// One place for every AI disclaimer on the platform, so the wording stays consistent.
'use client';

import Link from 'next/link';

type Context = 'default' | 'chat' | 'documents' | 'results';

const MAIN =
  'UniQuest AI provides AI-generated assistance for educational and informational purposes only. Its recommendations, eligibility assessments, document checklists, university matches and generated letters may contain errors or outdated information, and they are not official admission, scholarship, immigration or legal advice. Verify all requirements directly with the relevant university and official authorities before you apply or make any payment.';

const EXTRA: Record<Context, string | null> = {
  default: null,
  results:
    'Scores, matches and eligibility results are estimates. They do not predict or guarantee an admission, scholarship or visa decision.',
  chat:
    'Please do not type passwords, passport or CNIC numbers, or payment details into the chat.',
  documents:
    'Beta tip: use sample documents, or hide sensitive details (CNIC and passport numbers, addresses, phone numbers) where you can. We do not save your uploaded PDFs, but the text and page images are sent to our AI provider to run the check.',
};

type Props = {
  variant?: 'full' | 'compact';
  context?: Context;
};

export default function AIDisclaimer({ variant = 'full', context = 'default' }: Props) {
  if (variant === 'compact') {
    return (
      <p
        role="note"
        style={{
          margin: '0 0 16px',
          padding: '8px 14px',
          background: '#FFF8E6',
          border: '1px solid #F5DFA3',
          borderRadius: 12,
          fontSize: 12,
          lineHeight: 1.6,
          color: '#7A5A00',
          fontWeight: 600,
          fontFamily: "'Nunito', sans-serif",
        }}
      >
        🤖 AI-generated guidance for information only. It may contain errors or outdated details and
        is not official admission, immigration or legal advice. Verify with the university and
        official authorities.{' '}
        <Link href="/terms#ai-disclaimer" style={{ color: '#1D9E75', fontWeight: 800 }}>
          Learn more
        </Link>
      </p>
    );
  }

  const extra = EXTRA[context];

  return (
    <aside
      role="note"
      aria-label="AI disclaimer"
      style={{
        margin: '0 0 20px',
        padding: '14px 18px',
        background: '#FFF8E6',
        border: '1.5px solid #F5DFA3',
        borderRadius: 16,
        fontFamily: "'Nunito', sans-serif",
      }}
    >
      <p style={{ margin: '0 0 6px', fontSize: 12, fontWeight: 800, color: '#7A5A00', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        🤖 AI-generated assistance · Beta
      </p>
      <p style={{ margin: 0, fontSize: 13, lineHeight: 1.65, color: '#6B5200', fontWeight: 600 }}>
        {MAIN}
      </p>
      {extra && (
        <p style={{ margin: '8px 0 0', fontSize: 13, lineHeight: 1.65, color: '#6B5200', fontWeight: 600 }}>
          {extra}
        </p>
      )}
      <p style={{ margin: '8px 0 0', fontSize: 12, fontWeight: 700 }}>
        <Link href="/terms#ai-disclaimer" style={{ color: '#1D9E75' }}>Terms</Link>
        <span style={{ color: '#B4B2A9' }}> · </span>
        <Link href="/privacy" style={{ color: '#1D9E75' }}>Privacy Policy</Link>
      </p>
    </aside>
  );
}

// Short notice shown beside generated SOPs, CVs and letters.
export function DraftNotice() {
  return (
    <div
      role="note"
      style={{
        display: 'flex',
        gap: 10,
        alignItems: 'flex-start',
        margin: '0 0 14px',
        padding: '10px 14px',
        background: '#FFF8E6',
        border: '1px solid #F5DFA3',
        borderRadius: 12,
        fontSize: 13,
        lineHeight: 1.6,
        color: '#6B5200',
        fontWeight: 700,
        fontFamily: "'Nunito', sans-serif",
      }}
    >
      <span aria-hidden>⚠️</span>
      <span>
        This draft was generated with AI assistance. Review, personalize, and verify all details
        before submitting. Do not submit false or invented information.
      </span>
    </div>
  );
}