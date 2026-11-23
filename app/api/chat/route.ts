import Groq from 'groq-sdk';
import { getAuth } from 'firebase-admin/auth';
import { adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Model can be changed from Vercel env vars (GROQ_MODEL) without touching code.
const MODEL = process.env.GROQ_MODEL ?? 'openai/gpt-oss-120b';

// Only verifies the user. Usage is counted later, after a successful reply.
async function verifyUser(token: string) {
  try {
    const decodedToken = await getAuth().verifyIdToken(token);
    const userId = decodedToken.uid;

    const userDoc = await adminDb.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      return { allowed: false as const, reason: 'profile_not_found' };
    }

    return { allowed: true as const, userId };
  } catch (error: any) {
    console.error('Auth error in chat:', error);
    return { allowed: false as const, reason: 'unauthorized' };
  }
}

async function trackUsage(userId: string) {
  try {
    await adminDb.collection('users').doc(userId).update({
      chat_used: FieldValue.increment(1),
    });
  } catch (error) {
    // Never fail the request just because the counter could not be updated.
    console.error('Failed to track chat usage:', error);
  }
}

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return Response.json({ error: 'unauthorized' }, { status: 401 });
    }

    const user = await verifyUser(token);
    if (!user.allowed) {
      return Response.json({ error: 'unauthorized' }, { status: 401 });
    }

    const { messages } = await req.json();

    if (!Array.isArray(messages) || messages.length === 0) {
      return Response.json({ error: 'No messages provided.' }, { status: 400 });
    }

    const systemPrompt = `You are the lead AI Admissions Counselor and Study Abroad Consultant for international students.
You provide authoritative, highly accurate, and practical guidance across:
- University selection (Safe, Target, Reach portfolio strategy)
- Realistic tuition and living expenses (e.g. Germany public universities charging €0 tuition with ~€250-350/sem contribution, Italy regional DSU scholarships, France differentiated fees, etc.)
- Scholarship programs (DAAD, Chevening, Fulbright, Eiffel Excellence, Erasmus Mundus, Türkiye Bursları, Stipendium Hungaricum)
- Mandatory visa and embassy requirements (German blocked accounts, Canadian PAL/GIC, UK CAS, US I-20 and SEVIS)
- Standardized exams (IELTS, TOEFL, GRE, Duolingo, Medium of Instruction exemptions)
- SOP and recommendation letter writing strategies

Always be concise, professional, encouraging, and rigorously factual. Use clear markdown formatting, bullet points, and actionable next steps.`;

    // gpt-oss is a reasoning model: reasoning tokens count toward max_tokens,
    // so the limit is higher and reasoning_effort is kept low.
    const response = await groq.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        ...messages.map((m: any) => ({ role: m.role, content: m.content })),
      ],
      temperature: 0.5,
      max_tokens: 4000,
      reasoning_effort: 'low',
    } as any);

    const reply = response.choices?.[0]?.message?.content?.trim();
    if (!reply) {
      return Response.json({ error: 'Chat failed. Please try again.' }, { status: 500 });
    }

    // Count usage only after a successful reply
    await trackUsage(user.userId);

    return Response.json({ reply });
  } catch (error) {
    console.error('Chat API error:', error);
    return Response.json({ error: 'Chat failed. Please try again.' }, { status: 500 });
  }
}