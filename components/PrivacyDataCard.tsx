// components/PrivacyDataCard.tsx
// "Privacy & your data": lets a signed-in student download or delete their own
// data and delete their account. Shown on the Profile page.
'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  deleteUser,
} from 'firebase/auth';
import {
  collection,
  query,
  where,
  getDocs,
  getDoc,
  deleteDoc,
  doc,
  writeBatch,
} from 'firebase/firestore';
import { PROFILE_COLLECTION, deleteAcademicProfile, clearProfileCache } from '@/lib/userProfile';

const T = {
  border: '#E1F5EE', teal: '#1D9E75', tealDark: '#085041', muted: '#888780',
  text: '#2C2C2A', red: '#B91C1C', redBg: '#FEF2F2', redBorder: '#FECACA',
  fontBase: "'Nunito', sans-serif", fontHead: "'Bricolage Grotesque', sans-serif",
};

type Msg = { kind: 'ok' | 'error'; text: string } | null;

// Deletes every document in "generations" that belongs to this user.
async function deleteHistory(uid: string): Promise<number> {
  const snap = await getDocs(query(collection(db, 'generations'), where('user_id', '==', uid)));
  let batch = writeBatch(db);
  let inBatch = 0;
  for (const d of snap.docs) {
    batch.delete(d.ref);
    inBatch += 1;
    if (inBatch === 400) {
      await batch.commit();
      batch = writeBatch(db);
      inBatch = 0;
    }
  }
  if (inBatch > 0) await batch.commit();
  return snap.size;
}

async function deleteFeedback(uid: string) {
  await deleteDoc(doc(db, 'feedbacks', uid)).catch(() => undefined);
}

function clearLocalData() {
  try {
    Object.keys(localStorage)
      .filter((k) => k.toLowerCase().startsWith('uniquest'))
      .forEach((k) => localStorage.removeItem(k));
  } catch {
    /* storage may be blocked */
  }
}

// Turns Firestore Timestamps into ISO strings when exporting
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const jsonReplacer = (_k: string, v: any) =>
  v && typeof v === 'object' && typeof v.toDate === 'function' ? v.toDate().toISOString() : v;

export default function PrivacyDataCard() {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [msg, setMsg] = useState<Msg>(null);
  const [password, setPassword] = useState('');
  const [typed, setTyped] = useState('');

  const run = async (key: string, fn: (uid: string) => Promise<string>) => {
    const user = auth.currentUser;
    if (!user) {
      setMsg({ kind: 'error', text: 'Please sign in again.' });
      return;
    }
    setBusy(key);
    setMsg(null);
    try {
      const text = await fn(user.uid);
      setMsg({ kind: 'ok', text });
    } catch (e) {
      console.error(e);
      setMsg({ kind: 'error', text: 'Something went wrong. Please try again.' });
    } finally {
      setBusy(null);
      setConfirming(null);
    }
  };

  // ── Download ──────────────────────────────────────────────────────────────
  const download = () =>
    run('download', async (uid) => {
      const user = auth.currentUser!;
      const [userDoc, profileDoc, gens, fb] = await Promise.all([
        getDoc(doc(db, 'users', uid)),
        getDoc(doc(db, PROFILE_COLLECTION, uid)),
        getDocs(query(collection(db, 'generations'), where('user_id', '==', uid))),
        getDoc(doc(db, 'feedbacks', uid)).catch(() => null),
      ]);
      const data = {
        exportedAt: new Date().toISOString(),
        account: { email: user.email, name: user.displayName },
        accountRecord: userDoc.exists() ? userDoc.data() : null,
        savedAcademicProfile: profileDoc.exists() ? profileDoc.data() : null,
        generatedDocuments: gens.docs.map((d) => ({ id: d.id, ...d.data() })),
        feedback: fb && fb.exists() ? fb.data() : null,
      };
      const blob = new Blob([JSON.stringify(data, jsonReplacer, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'uniquest-my-data.json';
      a.click();
      URL.revokeObjectURL(url);
      return 'Your data was downloaded as uniquest-my-data.json.';
    });

  // ── Delete pieces ─────────────────────────────────────────────────────────
  const delProfile = () =>
    run('profile', async (uid) => {
      await deleteAcademicProfile(uid);
      return 'Your saved academic profile was deleted.';
    });

  const delHistory = () =>
    run('history', async (uid) => {
      const n = await deleteHistory(uid);
      return n === 1 ? '1 saved document was deleted.' : `${n} saved documents were deleted.`;
    });

  const delFeedback = () =>
    run('feedback', async (uid) => {
      await deleteFeedback(uid);
      return 'Your feedback was deleted.';
    });

  // ── Delete account ────────────────────────────────────────────────────────
  const delAccount = async () => {
    const user = auth.currentUser;
    if (!user || !user.email) {
      setMsg({ kind: 'error', text: 'Please sign in again.' });
      return;
    }
    if (typed.trim().toUpperCase() !== 'DELETE') {
      setMsg({ kind: 'error', text: 'Type DELETE to confirm.' });
      return;
    }
    if (!password) {
      setMsg({ kind: 'error', text: 'Enter your password to confirm it is you.' });
      return;
    }

    setBusy('account');
    setMsg(null);
    try {
      // Firebase needs a recent login before deleting an account
      await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, password));

      const uid = user.uid;
      await deleteHistory(uid);
      await deleteAcademicProfile(uid).catch(() => undefined);
      await deleteFeedback(uid);
      await deleteDoc(doc(db, 'users', uid)).catch(() => undefined);
      clearProfileCache();
      clearLocalData();
      await deleteUser(user);

      router.push('/');
    } catch (e) {
      const code = (e as { code?: string })?.code ?? '';
      if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
        setMsg({ kind: 'error', text: 'That password is not correct.' });
      } else if (code === 'auth/too-many-requests') {
        setMsg({ kind: 'error', text: 'Too many attempts. Please wait a few minutes and try again.' });
      } else {
        console.error(e);
        setMsg({
          kind: 'error',
          text: 'We could not finish deleting your account. Please try again, or email us and we will delete it for you.',
        });
      }
      setBusy(null);
    }
  };

  // ── UI helpers ────────────────────────────────────────────────────────────
  const row = (
    key: string,
    title: string,
    desc: string,
    action: () => void,
    label: string,
    danger = false
  ) => (
    <div
      key={key}
      style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        gap: 14, flexWrap: 'wrap', padding: '14px 0', borderTop: `1px solid ${T.border}`,
      }}
    >
      <div style={{ flex: '1 1 260px', minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: T.text }}>{title}</p>
        <p style={{ margin: '3px 0 0', fontSize: 12, color: T.muted, fontWeight: 600, lineHeight: 1.5 }}>{desc}</p>
      </div>
      {confirming === key ? (
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            onClick={action}
            disabled={busy !== null}
            style={{
              background: danger ? T.red : T.teal, color: '#fff', border: 'none', borderRadius: 12,
              padding: '9px 16px', fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: T.fontBase,
            }}
          >
            {busy === key ? 'Working…' : 'Yes, continue'}
          </button>
          <button
            type="button"
            onClick={() => setConfirming(null)}
            disabled={busy !== null}
            style={{
              background: '#fff', color: T.text, border: `1.5px solid ${T.border}`, borderRadius: 12,
              padding: '9px 14px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: T.fontBase,
            }}
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => {
            setMsg(null);
            if (key === 'download') action();
            else setConfirming(key);
          }}
          disabled={busy !== null}
          style={{
            background: '#fff', color: danger ? T.red : T.teal,
            border: `1.5px solid ${danger ? T.redBorder : T.border}`, borderRadius: 12,
            padding: '9px 16px', fontSize: 13, fontWeight: 800,
            cursor: busy ? 'not-allowed' : 'pointer', fontFamily: T.fontBase,
          }}
        >
          {busy === key ? 'Working…' : label}
        </button>
      )}
    </div>
  );

  return (
    <div
      id="privacy-data"
      style={{
        background: '#fff', borderRadius: 20, border: `1.5px solid ${T.border}`,
        boxShadow: '0 2px 16px rgba(29,158,117,0.06)', overflow: 'hidden', fontFamily: T.fontBase,
      }}
    >
      <div style={{ padding: '18px 24px', borderBottom: `1.5px solid ${T.border}` }}>
        <p style={{ fontSize: 11, fontWeight: 800, color: T.teal, textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 3px' }}>
          You are in control
        </p>
        <h3 style={{ fontSize: 17, fontWeight: 800, color: T.tealDark, fontFamily: T.fontHead, margin: 0 }}>
          Privacy &amp; your data
        </h3>
        <p style={{ fontSize: 12, color: T.muted, margin: '6px 0 0', fontWeight: 600, lineHeight: 1.6 }}>
          Only you can see your saved profile and history. Your uploaded PDFs are not saved by
          UniQuest AI. Read how we handle data in our{' '}
          <Link href="/privacy" style={{ color: T.teal, fontWeight: 800 }}>Privacy Policy</Link>.
        </p>
        <p style={{ fontSize: 12, color: '#7A5A00', margin: '8px 0 0', fontWeight: 700, lineHeight: 1.6 }}>
          Beta tip: when testing, use sample documents or hide sensitive details such as CNIC and
          passport numbers.
        </p>
      </div>

      <div style={{ padding: '4px 24px 20px' }}>
        {row('download', 'Download my data', 'Get a copy of your account details, saved profile, saved documents and feedback as a JSON file.', download, 'Download')}
        {row('profile', 'Delete my saved profile', 'Removes the academic and work details saved for pre-filling the tools.', delProfile, 'Delete profile', true)}
        {row('history', 'Delete my document history', 'Permanently removes every SOP, CV and letter saved in your history.', delHistory, 'Delete history', true)}
        {row('feedback', 'Delete my feedback', 'Removes the feedback you submitted, including any published review.', delFeedback, 'Delete feedback', true)}

        {/* Delete account */}
        <div style={{ borderTop: `1px solid ${T.border}`, paddingTop: 14 }}>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: T.red }}>Delete my account</p>
          <p style={{ margin: '3px 0 10px', fontSize: 12, color: T.muted, fontWeight: 600, lineHeight: 1.5 }}>
            Permanently deletes your login, saved profile, document history and feedback. This
            cannot be undone.
          </p>

          {confirming === 'account' ? (
            <div style={{ background: T.redBg, border: `1px solid ${T.redBorder}`, borderRadius: 14, padding: 14, display: 'grid', gap: 10, maxWidth: 420 }}>
              <label style={{ fontSize: 12, fontWeight: 800, color: T.red }}>
                Type DELETE to confirm
                <input
                  value={typed}
                  onChange={(e) => setTyped(e.target.value)}
                  autoComplete="off"
                  style={{ display: 'block', width: '100%', boxSizing: 'border-box', marginTop: 6, padding: '9px 12px', borderRadius: 10, border: `1.5px solid ${T.redBorder}`, fontSize: 14, fontFamily: T.fontBase }}
                />
              </label>
              <label style={{ fontSize: 12, fontWeight: 800, color: T.red }}>
                Your password
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  style={{ display: 'block', width: '100%', boxSizing: 'border-box', marginTop: 6, padding: '9px 12px', borderRadius: 10, border: `1.5px solid ${T.redBorder}`, fontSize: 14, fontFamily: T.fontBase }}
                />
              </label>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  onClick={delAccount}
                  disabled={busy !== null}
                  style={{ background: T.red, color: '#fff', border: 'none', borderRadius: 12, padding: '9px 16px', fontSize: 13, fontWeight: 800, cursor: busy ? 'not-allowed' : 'pointer', fontFamily: T.fontBase }}
                >
                  {busy === 'account' ? 'Deleting…' : 'Delete my account'}
                </button>
                <button
                  type="button"
                  onClick={() => { setConfirming(null); setTyped(''); setPassword(''); }}
                  disabled={busy !== null}
                  style={{ background: '#fff', color: T.text, border: `1.5px solid ${T.border}`, borderRadius: 12, padding: '9px 14px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: T.fontBase }}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => { setMsg(null); setConfirming('account'); }}
              disabled={busy !== null}
              style={{ background: '#fff', color: T.red, border: `1.5px solid ${T.redBorder}`, borderRadius: 12, padding: '9px 16px', fontSize: 13, fontWeight: 800, cursor: 'pointer', fontFamily: T.fontBase }}
            >
              Delete account…
            </button>
          )}
        </div>

        {msg && (
          <p
            role={msg.kind === 'error' ? 'alert' : 'status'}
            style={{
              margin: '16px 0 0', padding: '10px 14px', borderRadius: 12, fontSize: 13, fontWeight: 700,
              background: msg.kind === 'ok' ? '#F0FAF6' : T.redBg,
              border: `1px solid ${msg.kind === 'ok' ? '#B6E8D4' : T.redBorder}`,
              color: msg.kind === 'ok' ? '#0F6E56' : T.red,
            }}
          >
            {msg.text}
          </p>
        )}
      </div>
    </div>
  );
}