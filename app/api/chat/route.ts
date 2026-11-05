import Groq from 'groq-sdk';
import { getAuth } from 'firebase-admin/auth';
import { adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

async function getUserAndTrackUsage(token: string) {
  try {
    // Verify token with Firebase Admin SDK
    const decodedToken = await getAuth().verifyIdToken(token);
    const userId = decodedToken.uid;

    // Get user profile from Firestore
    const userDocRef = adminDb.collection('users').doc(userId);
    const userDoc = await userDocRef.get();

    if (!userDoc.exists) {
      return { allowed: false, reason: 'profile_not_found', userId };
    }

    // Increment chat usage
    await userDocRef.update({ chat_used: FieldValue.increment(1) });

    return { allowed: true, userId };
  } catch (error: any) {
    console.error('Auth error:', error);
    return { allowed: false, reason: 'unauthorized' };
  }
}

export async function POST(req: Request) {
  try {
    // Get token from Authorization header
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
