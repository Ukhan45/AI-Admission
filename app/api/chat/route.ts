import Groq from 'groq-sdk';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

async function getUserAndCheckCredits() {
  const cookieStore = await cookies();

  const supabaseAuth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll() {},
      },
    }
  );

  const { data: { session } } = await supabaseAuth.auth.getSession();
  if (!session) return { allowed: false, reason: 'not_authenticated' };

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: profile } = await supabase
    .from('profiles')
    .select('plan, credits_used, credits_limit')
    .eq('id', session.user.id)
    .single();

  if (!profile) return { allowed: false, reason: 'profile_not_found' };
  if (profile.credits_used >= profile.credits_limit) {
    return { allowed: false, reason: 'limit_reached', plan: profile.plan };
  }

  // Deduct credit
  await supabase
    .from('profiles')
    .update({ credits_used: profile.credits_used + 1 })
    .eq('id', session.user.id);

  return { allowed: true, plan: profile.plan };
}

export async function POST(req: Request) {
  try {
    // ✅ Credit check
    const credit = await getUserAndCheckCredits();
    if (!credit.allowed) {
      return Response.json({
        error: credit.reason === 'limit_reached' ? 'limit_reached' : 'unauthorized',
        plan: credit.plan,
      }, { status: credit.reason === 'limit_reached' ? 402 : 401 });
    }

    const { messages } = await req.json();

    const response = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: `You are an expert AI Admissions Assistant for international students. 
You help with: university recommendations, admission requirements, SOP writing tips, 
scholarship information, visa processes, IELTS/TOEFL guidance, and study abroad advice.
Be concise, friendly, and specific. Format lists clearly when needed.`,
        },
        ...messages.map((m: any) => ({ role: m.role, content: m.content })),
      ],
      temperature: 0.7,
      max_tokens: 1000,
    });

    return Response.json({
      reply: response.choices[0].message.content,
    });
  } catch (error) {
    console.error('Chat error:', error);
    return new Response('Chat failed. Please try again.', { status: 500 });
  }
}