// components/AcademicProfileCard.tsx
// Editable academic / work profile, saved to Firestore (academic_profiles/{uid}).
// Rendered on the Profile page. Every tool reads from this same saved profile.
'use client';

import { useEffect, useState } from 'react';
import {
  useAcademicProfile, saveAcademicProfile, PROFILE_KEYS,
  type AcademicProfile,
} from '@/lib/userProfile';

const T = {
  border: '#E1F5EE', teal: '#1D9E75', tealDark: '#085041', tealLight: '#E1F5EE',
  muted: '#888780', text: '#2C2C2A', fontBase: "'Nunito', sans-serif",
  fontHead: "'Bricolage Grotesque', sans-serif",
};

const LEVELS  = ["Bachelor's", "Master's", 'PhD'];
const INTAKES = ['Any', 'Fall (Sep)', 'Spring (Jan)', 'Winter (Jan/Feb)', 'Summer'];
const RANKS   = ['Any', 'Top 100', 'Top 200', 'Top 500'];
const NEEDS   = ['Yes, I have financial need', 'No financial need', 'Prefer not to say'];

type FormState = Record<keyof AcademicProfile, string>;
const emptyForm = (): FormState =>
  Object.fromEntries(PROFILE_KEYS.map((k) => [k, ''])) as FormState;

const inputStyle: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box', background: '#fff',
  border: `1.5px solid ${T.border}`, borderRadius: 12, padding: '10px 12px',
  fontSize: 14, color: T.text, fontFamily: T.fontBase, outline: 'none',
};
const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 11, fontWeight: 800, color: T.teal,
  textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6,
};
const grid: React.CSSProperties = {
  display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16,
};

export default function AcademicProfileCard() {
  const { profile, uid, displayName, loading } = useAcademicProfile();
  const [form, setForm] = useState<FormState>(emptyForm);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<'idle' | 'saved' | 'error'>('idle');

  // Load the saved profile into the form once (don't clobber typing afterwards).
  useEffect(() => {
    if (!profile) return;
    setForm((f) => {
      const next = { ...emptyForm(), ...profile } as FormState;
      if (!next.fullName && displayName) next.fullName = displayName;
      return dirty ? f : next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, displayName]);

  const set = (key: keyof FormState, value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
    setDirty(true);
    setStatus('idle');
  };

  const save = async () => {
    if (!uid) return;
    setSaving(true);
    setStatus('idle');
    try {
      await saveAcademicProfile(uid, form, { keepEmpty: true });
      setDirty(false);
      setStatus('saved');
    } catch (e) {
      console.error(e);
      setStatus('error');
    } finally {
      setSaving(false);
    }
  };

  const text = (key: keyof FormState, label: string, placeholder: string) => (
    <div>
      <label style={labelStyle}>{label}</label>
      <input style={inputStyle} value={form[key]} placeholder={placeholder}
        onChange={(e) => set(key, e.target.value)} />
    </div>
  );
  const area = (key: keyof FormState, label: string, placeholder: string) => (
    <div style={{ gridColumn: '1 / -1' }}>
      <label style={labelStyle}>{label}</label>
      <textarea style={{ ...inputStyle, minHeight: 84, resize: 'vertical' }}
        value={form[key]} placeholder={placeholder}
        onChange={(e) => set(key, e.target.value)} />
    </div>
  );
  const select = (key: keyof FormState, label: string, options: string[]) => (
    <div>
      <label style={labelStyle}>{label}</label>
      <select style={inputStyle} value={form[key]} onChange={(e) => set(key, e.target.value)}>
        <option value="">Not set</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
  const heading = (t: string) => (
    <p style={{ gridColumn: '1 / -1', margin: '8px 0 -4px', fontSize: 12, fontWeight: 800, color: T.tealDark, fontFamily: T.fontHead }}>{t}</p>
  );

  if (!loading && !uid) return null;

  return (
    <div style={{ background: '#fff', borderRadius: 20, border: `1.5px solid ${T.border}`, boxShadow: '0 2px 16px rgba(29,158,117,0.06)', overflow: 'hidden', fontFamily: T.fontBase }}>
      <div style={{ padding: '18px 24px', borderBottom: `1.5px solid ${T.border}` }}>
        <p style={{ fontSize: 11, fontWeight: 800, color: T.teal, textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 3px' }}>Saved once, used everywhere</p>
        <h3 style={{ fontSize: 17, fontWeight: 800, color: T.tealDark, fontFamily: T.fontHead, margin: 0 }}>Academic &amp; Work Profile</h3>
        <p style={{ fontSize: 12, color: T.muted, margin: '6px 0 0', fontWeight: 600 }}>
          Fill this in once. Profile Analyzer, University Finder, Scholarship Finder and the SOP Generator will use it automatically. Update it any time your details change.
        </p>
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: T.muted, fontSize: 14, fontWeight: 600 }}>Loading your saved profile…</div>
      ) : (
        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={grid}>
            {heading('Education & test scores')}
            {text('fullName', 'Full name', 'e.g. Aisha Khan')}
            {text('currentDegree', 'Current / last degree', 'e.g. BS Software Engineering')}
            {text('cgpa', 'CGPA / Academic score', 'e.g. 3.6 / 4.0 or 85%')}
            {text('matric', 'Matric %', 'e.g. 85')}
            {text('inter', 'Intermediate %', 'e.g. 80')}
            {text('ielts', 'IELTS score', 'e.g. 7.0')}

            {heading('What you are applying for')}
            {select('targetLevel', 'Applying for', LEVELS)}
            {text('fieldOfInterest', 'Field of interest', 'e.g. Computer Science, AI')}
            {text('preferredCountry', 'Preferred country', 'e.g. Germany')}
            {text('budget', 'Monthly budget (USD)', 'e.g. 1000')}
            {select('intake', 'Intake season', INTAKES)}
            {select('ranking', 'Ranking preference', RANKS)}
            {text('homeCountry', 'Home country / city', 'e.g. Lahore, Pakistan')}
            {select('financialNeed', 'Financial need', NEEDS)}

            {heading('Work experience & goals')}
            {area('workExperience', 'Work experience', 'e.g. 6-month software engineering internship at …')}
            {area('achievements', 'Achievements / projects', 'e.g. Final-year project, publications, awards')}
            {area('careerGoals', 'Career goals', 'e.g. Become a cloud security engineer')}
            {area('researchInterest', 'Research / academic interests', 'e.g. Distributed systems, machine learning')}

            {heading('Visa details (optional)')}
            {text('fundingSource', 'Funding source', 'e.g. Family savings + blocked account')}
            {text('homeCountryTies', 'Ties to home country', 'e.g. Family business, job offer on return')}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
            <button onClick={save} disabled={saving || !dirty}
              style={{
                background: saving || !dirty ? '#9FE1CB' : T.teal, color: '#fff', border: 'none',
                borderRadius: 14, padding: '11px 26px', fontSize: 14, fontWeight: 800,
                cursor: saving || !dirty ? 'not-allowed' : 'pointer', fontFamily: T.fontBase,
              }}>
              {saving ? 'Saving…' : 'Save profile'}
            </button>
            {dirty && status === 'idle' && <span style={{ fontSize: 12, color: '#854F0B', fontWeight: 700 }}>You have unsaved changes</span>}
            {status === 'saved' && <span style={{ fontSize: 12, color: T.teal, fontWeight: 800 }}>✓ Profile saved</span>}
            {status === 'error' && <span style={{ fontSize: 12, color: '#B91C1C', fontWeight: 700 }}>Could not save. Please try again.</span>}
          </div>
        </div>
      )}
    </div>
  );
}