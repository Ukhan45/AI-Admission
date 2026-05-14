// app/api/sop/route.ts
import Groq from 'groq-sdk';
import { getAuth } from 'firebase-admin/auth';
import { adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const FREE_SOP_LIMIT = 3;

export async function POST(req: Request) {
  try {
    const data = await req.json();

    if (!data.name || !data.degree || !data.cgpa || !data.university || !data.field) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Verify token
    let userId: string;
    try {
      const decodedToken = await getAuth().verifyIdToken(token);
      userId = decodedToken.uid;
    } catch (error) {
      return Response.json({ error: 'Invalid session' }, { status: 401 });
    }

    // Get user profile from Firestore
    const userDocRef = adminDb.collection('users').doc(userId);
    const userDoc = await userDocRef.get();

    if (!userDoc.exists) {
      return Response.json({ error: 'Profile not found' }, { status: 404 });
    }

    const userData = userDoc.data();
    const isPro = userData?.plan === 'pro';
    const sopUsed: number = userData?.sop_used ?? 0;
    const limit = isPro ? 999999 : FREE_SOP_LIMIT;

    if (sopUsed >= limit) {
      return Response.json({
        error: 'limit_reached',
        message: 'You have used all your free SOP generations. Please upgrade to continue.',
        plan: userData?.plan,
        used: sopUsed,
        limit,
      }, { status: 403 });
    }

    const cgpaContext = parseFloat(data.cgpa) >= 3.5
      ? 'excellent academic standing'
      : parseFloat(data.cgpa) >= 3.0
      ? 'strong academic performance'
      : 'consistent academic effort';

    const prompt = `
You are Dr. Sarah Mitchell, a senior admission consultant with 15+ years of experience helping students get into top universities worldwide. You have reviewed thousands of SOPs and know exactly what admission committees at ${data.university} look for.

Write a highly personalized, emotionally compelling, and academically strong Statement of Purpose for the following student. This is NOT a generic template — every sentence must feel specific to this student's story.

═══════════════════════════════════
STUDENT PROFILE
═══════════════════════════════════
Full Name:          ${data.name}
Undergraduate:      ${data.degree}
CGPA:               ${data.cgpa}/4.0 (${cgpaContext})
Target University:  ${data.university}
Target Program:     MS/Masters in ${data.field}
Career Goals:       ${data.goals || 'To become a researcher and practitioner in this field'}
Key Achievements:   ${data.achievements || 'Strong academic foundation with relevant coursework'}

═══════════════════════════════════
WRITING GUIDELINES
═══════════════════════════════════

STRUCTURE (follow exactly):
1. HOOK OPENING (2-3 sentences)
   - Start with a specific moment, realization, or problem that sparked passion for ${data.field}
   - Must be personal and vivid — not generic phrases like "I have always been passionate about..."

2. ACADEMIC JOURNEY (1 paragraph)
   - Discuss ${data.degree} and what specifically prepared them for ${data.field}
   - Mention CGPA of ${data.cgpa} naturally — frame it as evidence of commitment
   - Highlight 1-2 specific courses, projects, or skills gained

3. ACHIEVEMENTS & EXPERIENCE (1 paragraph)
   - Expand on: ${data.achievements || 'academic projects and coursework'}
   - Show what they LEARNED from each experience, not just what they did
   - Connect each achievement directly to their readiness for graduate study

4. WHY THIS PROGRAM & UNIVERSITY (1 paragraph)
   - Be specific about ${data.university} — mention research focus, faculty reputation, or program strengths
   - Explain why this specific program is the ONLY right fit for their goals
   - Show genuine knowledge of the university

5. CAREER VISION (1 paragraph)
   - Detail exactly how an MS in ${data.field} bridges where they are to where they want to be
   - Goals: ${data.goals || 'To make meaningful contributions to the field'}
   - Be specific — industry, role, or research area

6. POWERFUL CONCLUSION (2-3 sentences)
   - Confident, forward-looking
   - Reinforce fit between student and program
   - End memorably

TONE & STYLE RULES:
- Word count: 750-900 words
- Voice: First person, confident but humble
- NO clichés: avoid "I have always been passionate", "ever since I was young", "I am a hardworking person"
- NO filler phrases: every sentence must add value
- Use active voice throughout
- Vary sentence length for rhythm

Output ONLY the SOP text. No headers, no labels, no explanations. Just the SOP itself.
`;

    const response = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: 'You are an expert admission consultant. Write SOPs that are deeply personal, specific, and compelling. Never write generic content.',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.85,
      max_tokens: 1200,
    });

    const result = response?.choices?.[0]?.message?.content;
    if (!result) return Response.json({ error: 'AI did not return a valid response' }, { status: 500 });

    // Update sop_used and create generation record
    await userDocRef.update({ sop_used: FieldValue.increment(1) });

    await adminDb.collection('generations').add({
      user_id: userId,
      type: 'sop',
      content: result,
      university: data.university,
      createdAt: new Date(),
    });

    return Response.json({
      result,
      credits_remaining: limit - sopUsed - 1,
    });

  } catch (error) {
    console.error('SOP error:', error);
    return Response.json({ error: 'SOP generation failed. Please try again.' }, { status: 500 });
  }
}
