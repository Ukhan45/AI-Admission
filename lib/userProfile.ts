// lib/userProfile.ts
// Saves each user's academic / work profile in Firestore so they never have
// to type it again. One document per user:  academic_profiles/{uid}
'use client';

import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { deleteDoc, doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

export const PROFILE_COLLECTION = 'academic_profiles';

// All values are plain strings so they map directly onto form inputs.
export type AcademicProfile = {
  fullName?: string;
  currentDegree?: string;     // e.g. "BS Software Engineering"
  cgpa?: string;
  matric?: string;
  inter?: string;
  ielts?: string;
  workExperience?: string;
  achievements?: string;
  careerGoals?: string;
  researchInterest?: string;
  targetLevel?: string;       // "Bachelor's" | "Master's" | "PhD"
  fieldOfInterest?: string;   // e.g. "Computer Science"
  preferredCountry?: string;
  budget?: string;
  intake?: string;
  ranking?: string;
  homeCountry?: string;
  financialNeed?: string;
  fundingSource?: string;
  homeCountryTies?: string;
};

export type ProfileKey = keyof AcademicProfile;

export const PROFILE_KEYS: ProfileKey[] = [
  'fullName', 'currentDegree', 'cgpa', 'matric', 'inter', 'ielts',
  'workExperience', 'achievements', 'careerGoals', 'researchInterest',
  'targetLevel', 'fieldOfInterest', 'preferredCountry', 'budget',
  'intake', 'ranking', 'homeCountry', 'financialNeed',
  'fundingSource', 'homeCountryTies',
];

// Small in-memory cache so moving between tools doesn't re-read Firestore.
let cache: { uid: string; profile: AcademicProfile } | null = null;

export function clearProfileCache() {
  cache = null;
}

function pick(data: Record<string, unknown>): AcademicProfile {
  const out: AcademicProfile = {};
  for (const key of PROFILE_KEYS) {
    const v = data[key];
    if (typeof v === 'string') out[key] = v;
  }
  return out;
}

function clean(data: Partial<AcademicProfile>, keepEmpty: boolean) {
  const out: AcademicProfile = {};
  for (const key of PROFILE_KEYS) {
    const v = data[key];
    if (typeof v !== 'string') continue;
    const t = v.trim();
    if (t || keepEmpty) out[key] = t;
  }
  return out;
}

export async function loadAcademicProfile(uid: string): Promise<AcademicProfile> {
  if (cache && cache.uid === uid) return cache.profile;
  const snap = await getDoc(doc(db, PROFILE_COLLECTION, uid));
  const profile = snap.exists() ? pick(snap.data()) : {};
  cache = { uid, profile };
  return profile;
}

// Merge-saves. By default blank values are ignored so a tool can never wipe
// saved data by accident. The Profile page passes keepEmpty so a user can
// deliberately clear a field.
export async function saveAcademicProfile(
  uid: string,
  data: Partial<AcademicProfile>,
  opts?: { keepEmpty?: boolean },
): Promise<void> {
  const fields = clean(data, !!opts?.keepEmpty);
  if (Object.keys(fields).length === 0) return;
  await setDoc(
    doc(db, PROFILE_COLLECTION, uid),
    { ...fields, updatedAt: serverTimestamp() },
    { merge: true },
  );
  const previous = cache && cache.uid === uid ? cache.profile : {};
  cache = { uid, profile: { ...previous, ...fields } };
}

export async function deleteAcademicProfile(uid: string): Promise<void> {
  await deleteDoc(doc(db, PROFILE_COLLECTION, uid));
  if (cache?.uid === uid) clearProfileCache();
}

// Fire-and-forget save used by the tools after a successful run.
// Never throws, so a Firestore problem can't break the tool itself.
export function rememberProfile(data: Partial<AcademicProfile>) {
  const uid = auth.currentUser?.uid;
  if (!uid) return;
  saveAcademicProfile(uid, data).catch((e) =>
    console.warn('Could not save profile:', e),
  );
}

// Copies saved values into a form, but only into fields the user hasn't typed in.
export function fillEmpty<T extends Record<string, string>>(
  current: T,
  incoming: Partial<Record<keyof T, string | undefined>>,
): T {
  const next = { ...current };
  for (const key of Object.keys(incoming) as (keyof T)[]) {
    const v = incoming[key];
    if (v && !next[key]) next[key] = v as T[keyof T];
  }
  return next;
}

// Loads the signed-in user's saved profile.
export function useAcademicProfile() {
  const [profile, setProfile] = useState<AcademicProfile | null>(null);
  const [uid, setUid] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        if (!cancelled) { setUid(null); setProfile(null); setLoading(false); }
        return;
      }
      if (!cancelled) { setUid(user.uid); setDisplayName(user.displayName ?? ''); }
      try {
        const p = await loadAcademicProfile(user.uid);
        if (!cancelled) setProfile(p);
      } catch (e) {
        console.warn('Could not load profile:', e);
        if (!cancelled) setProfile({});
      } finally {
        if (!cancelled) setLoading(false);
      }
    });
    return () => { cancelled = true; unsub(); };
  }, []);

  return { profile, uid, displayName, loading };
}