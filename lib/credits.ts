// lib/credits.ts
import { createClient } from '@supabase/supabase-js';

type Feature = 'sop' | 'analyzer' | 'chat';

const FREE_LIMITS: Record<Feature, number> = {
  sop:      3,
  analyzer: 2,
  chat:     10,
};

const USED_COL: Record<Feature, string> = {
  sop:      'sop_used',
  analyzer: 'analyzer_used',
  chat:     'chat_used',
};

export async function checkAndDeductCredit(userId: string, feature: Feature = 'sop') {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const usedCol = USED_COL[feature];

  // ✅ Select * to avoid TypeScript template string inference error
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error || !profile) {
    return { allowed: false, reason: 'Profile not found' };
  }

  // ✅ Cast profile to any to allow dynamic key access
  const profileData = profile as any;
  const isPro = profileData.plan === 'pro';
  const used: number = profileData[usedCol] ?? 0;
  const limit = isPro ? 999999 : FREE_LIMITS[feature];

  if (used >= limit) {
    return {
      allowed: false,
      reason: 'limit_reached',
      plan: profileData.plan,
      used,
      limit,
    };
  }

  await supabase
    .from('profiles')
    .update({ [usedCol]: used + 1 })
    .eq('id', userId);

  return {
    allowed: true,
    credits_remaining: limit - used - 1,
  };
}

export async function saveGeneration(
  userId: string,
  type: 'sop' | 'cv' | 'lor',
  content: string,
  university?: string
) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  await supabase.from('generations').insert({
    user_id: userId,
    type,
    content,
    university,
  });
}