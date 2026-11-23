import Groq from 'groq-sdk';
import { getAuth } from 'firebase-admin/auth';
import { adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

async function getUserAndTrackUsage(token: string) {
  try {
    const decodedToken = await getAuth().verifyIdToken(token);
    const userId = decodedToken.uid;

    const userDocRef = adminDb.collection('users').doc(userId);
    const userDoc = await userDocRef.get();

    if (!userDoc.exists) {
      return { allowed: false, reason: 'profile_not_found', userId };
    }

    await userDocRef.update({ chat_used: FieldValue.increment(1) });

    return { allowed: true, userId };
  } catch (error: any) {
    console.error('Auth error in chat:', error);
    return { allowed: false, reason: 'unauthorized' };
  }
}

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    
    if (!token) {
      return Response.json({ error: 'unauthorized' }, { status: 401 });
    }

    const user = await getUserAndTrackUsage(token);
    if (!user.allowed) {
      return Response.json({ error: 'unauthorized' }, { status: 401 });
    }

    const { messages } = await req.json();

    const systemPrompt = `You are the lead AI Admissions Counselor and Study Abroad Consultant for international students.
You provide authoritative, highly accurate, and practical guidance across:
- University selection (Safe, Target, Reach portfolio strategy)
- Realistic tuition and living expenses (e.g. Germany public universities charging €0 tuition with ~€250-350/sem contribution, Italy regional DSU scholarships, France differentiated fees, etc.)
- Scholarship programs (DAAD, Chevening, Fulbright, Eiffel Excellence, Erasmus Mundus, Türkiye Bursları, Stipendium Hungaricum)
- Mandatory visa and embassy requirements (German blocked accounts, Canadian PAL/GIC, UK CAS, US I-20 and SEVIS)
- Standardized exams (IELTS, TOEFL, GRE, Duolingo, Medium of Instruction exemptions)
- SOP and recommendation letter writing strategies

Always be concise, professional, encouraging, and rigorously factual. Use clear markdown formatting, bullet points, and actionable next steps.`;

    const response = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        ...messages.map((m: any) => ({ role: m.role, content: m.content })),
      ],
      temperature: 0.5,
      max_tokens: 1200,
    });

    return Response.json({
      reply: response.choices[0].message.content,
    });
  } catch (error) {
    console.error('Chat API error:', error);
    return Response.json({ error: 'Chat failed. Please try again.' }, { status: 500 });
  }
}
