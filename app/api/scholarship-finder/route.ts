import Groq from 'groq-sdk';
import { getAuth } from 'firebase-admin/auth';
import { adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const FREE_SEARCH_LIMIT = 3;

async function getUserAndCheckCredits(token: string) {
  try {
    const decodedToken = await getAuth().verifyIdToken(token);
    const userId = decodedToken.uid;

    const userDocRef = adminDb.collection('users').doc(userId);
    const userDoc = await userDocRef.get();

    if (!userDoc.exists) {
      return { allowed: false, reason: 'profile_not_found', userId };
    }

    const userData = userDoc.data();
    const isPro = userData?.plan === 'pro';
    const searchUsed: number = userData?.scholarship_searches_used ?? 0;
    const limit = isPro ? 999999 : FREE_SEARCH_LIMIT;

    if (searchUsed >= limit) {
      return { allowed: false, reason: 'limit_reached', plan: userData?.plan, userId };
    }

    // Increment usage
    await userDocRef.update({ scholarship_searches_used: FieldValue.increment(1) });

    return { allowed: true, plan: userData?.plan, userId };
  } catch (error) {
    console.error('Auth error:', error);
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

    const credit = await getUserAndCheckCredits(token);
    if (!credit.allowed) {
      return Response.json({
        error: credit.reason === 'limit_reached' ? 'limit_reached' : 'unauthorized',
        plan: credit.plan,
      }, { status: credit.reason === 'limit_reached' ? 402 : 401 });
    }

    const { countryOfStudy, countryOfOrigin, degree, field, gpa, ielts, financialNeed } = await req.json();

    const prompt = `You are a scholarship research expert. Search and return REAL, currently available scholarships for a student with the following profile:

- Country of Study: ${countryOfStudy}
- Country of Origin: ${countryOfOrigin || 'Not specified'}
- Degree Level: ${degree}
- Field of Study: ${field}
- GPA / Academic Score: ${gpa || 'Not specified'}
- IELTS Score: ${ielts || 'Not specified'}
- Financial Need: ${financialNeed || 'Not specified'}

Return a JSON array of 6-8 real scholarships. Each scholarship must be a real, well-known scholarship program. Use this exact JSON format with no extra text, no markdown, no backticks:

[
  {
    "name": "Scholarship Name",
    "provider": "Organization or University Name",
    "country": "Country",
    "amount": "Amount in USD or full funded",
    "deadline": "Approximate deadline (e.g. December 2025 or Rolling)",
    "eligibility": "Brief eligibility requirements in 1-2 sentences",
    "coverage": "Tuition only / Full funded / Stipend included / Partial",
    "link": "Official URL of the scholarship",
    "type": "Full Funded or Partial or Merit-Based or Need-Based"
  }
]

Only return the JSON array. No other text.`;

    const response = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 2000,
    });

    const raw = response.choices[0].message.content ?? '[]';

    // Strip any accidental markdown fences
    const cleaned = raw.replace(/```json|```/g, '').trim();

    let scholarships = [];
    try {
      scholarships = JSON.parse(cleaned);
    } catch {
      console.error('Failed to parse scholarships JSON:', cleaned);
      return Response.json({ scholarships: [] });
    }

    return Response.json({ scholarships });
  } catch (error) {
    console.error('Scholarship finder error:', error);
    return Response.json({ error: 'Search failed. Please try again.' }, { status: 500 });
  }
}