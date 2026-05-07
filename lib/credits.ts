// lib/credits.ts
import { createClient } from '@supabase/supabase-js'

export async function checkAndDeductCredit(userId: string) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY! // service role — bypasses RLS
  )

  // Get user's current plan + usage
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('plan, credits_used, credits_limit')
    .eq('id', userId)
    .single()

  if (error || !profile) {
    return { allowed: false, reason: 'Profile not found' }
  }

  // Check if limit reached
  if (profile.credits_used >= profile.credits_limit) {
    return {
      allowed: false,
      reason: 'limit_reached',
      plan: profile.plan,
      credits_used: profile.credits_used,
      credits_limit: profile.credits_limit,
    }
  }

  // Deduct credit
  await supabase
    .from('profiles')
    .update({ credits_used: profile.credits_used + 1 })
    .eq('id', userId)

  return {
    allowed: true,
    credits_remaining: profile.credits_limit - profile.credits_used - 1,
  }
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
  )

  await supabase.from('generations').insert({
    user_id: userId,
    type,
    content,
    university,
  })
}