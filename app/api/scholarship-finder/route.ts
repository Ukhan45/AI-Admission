import Groq from 'groq-sdk';
import { getAuth } from 'firebase-admin/auth';
import { adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Model can be changed from Vercel env vars (GROQ_MODEL) without touching code.
const MODEL = process.env.GROQ_MODEL ?? 'openai/gpt-oss-120b';

// Only verifies the user. Usage is counted later, after a successful search.
async function verifyUser(token: string) {
  try {
    const decodedToken = await getAuth().verifyIdToken(token);
    const userId = decodedToken.uid;

    const userDoc = await adminDb.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      return { allowed: false as const, reason: 'profile_not_found' };
    }

    return { allowed: true as const, userId };
  } catch (error) {
    console.error('Auth error in scholarship finder:', error);
    return { allowed: false as const, reason: 'unauthorized' };
  }
}

async function trackUsage(userId: string) {
  try {
    await adminDb.collection('users').doc(userId).update({
      scholarship_searches_used: FieldValue.increment(1),
    });
  } catch (error) {
    // Never fail the request just because the counter could not be updated.
    console.error('Failed to track scholarship usage:', error);
  }
}

// Turns whatever the model returns into a safe, absolute https URL.
// Falls back to a Google search so the button never leads to a 404.
function buildLink(rawLink: unknown, name: string, provider: string): string {
  const fallback = `https://www.google.com/search?q=${encodeURIComponent(
    `${name} ${provider} scholarship official site`
  )}`;

  if (typeof rawLink !== 'string') return fallback;

  let link = rawLink.trim();
  if (!link || link === '#') return fallback;

  // Add protocol if the model returned a bare domain like "daad.de/en"
  if (!/^https?:\/\//i.test(link)) link = `https://${link}`;

  try {
    const url = new URL(link);
    // Must look like a real domain (has a dot, no spaces)
    if (!url.hostname.includes('.') || /\s/.test(link)) return fallback;
    return url.toString();
  } catch {
    return fallback;
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

    const { countryOfStudy, countryOfOrigin, degree, field, gpa, ielts, financialNeed } = await req.json();

    if (!countryOfStudy || !degree || !field) {
      return Response.json({ error: 'Missing required search parameters.' }, { status: 400 });
    }

    const systemPrompt = `You are the world's leading authority on international government, institutional, and private higher education scholarships.
Your database includes premier global funding schemes (DAAD, Chevening, Fulbright, Eiffel Excellence, Erasmus Mundus, Türkiye Bursları, Stipendium Hungaricum, Swedish Institute SISGP, Italian Regional DSU, Swiss Government Excellence, Australia Awards, MEXT, CSC, etc.).

CRITICAL ACCURACY GUIDELINES:
1. REAL VERIFIED SCHOLARSHIPS ONLY:
   - Recommend only authentic, verifiable scholarship schemes.
   - For links, provide the clean official portal domain or verified URL (e.g., 'daad.de/en', 'chevening.org', 'foreign.fulbrightonline.org', 'campusfrance.org', 'erasmus-plus.ec.europa.eu', 'turkiyeburslari.gov.tr', 'studyinhungary.hu', 'studyinsweden.se').
2. ACCURATE COVERAGE & DETAILS:
   - Identify whether each scholarship is "Full Funded" (tuition + monthly living allowance + flight/health insurance), "Partial", "Merit-Based", or "Need-Based".
   - Note Italian regional DSU / EDISU grants that grant 100% tuition waiver + €7,000–€8,500/year living stipend for students with demonstrated financial need.
   - Note Erasmus Mundus EMJMD providing €1,400/month stipend + full tuition for joint European master's degrees.
3. ACCURATE APPLICATION CYCLES:
   - Provide realistic deadlines reflecting active and upcoming application cycles (Fall/Spring intakes).
4. RETURN FORMAT:
   - Return ONLY a valid JSON array of 6-8 scholarships, with no markdown code blocks, no backticks, and no extra prose.`;

    const userPrompt = `Find 6 to 8 real, active scholarships for this student:

STUDENT PROFILE:
- Destination Country: ${countryOfStudy}
- Applicant Nationality / Origin: ${countryOfOrigin || 'International / Any'}
- Degree Level: ${degree}
- Field of Study: ${field}
- Academic Score / GPA: ${gpa || 'Not specified'}
- IELTS / English Proficiency: ${ielts || 'Not specified'}
- Financial Need Status: ${financialNeed || 'Standard'}

Return ONLY a valid JSON array matching this exact schema:
[
  {
    "name": "Full Official Scholarship Name",
    "provider": "Sponsoring Government / University / Foundation",
    "country": "Country where scholarship is tenable",
    "amount": "Accurate funding amount (e.g. 'Full Tuition + €934/month stipend + Health Insurance' or '$25,000/year')",
    "deadline": "Accurate typical deadline (e.g. 'October 31 (Annual cycle)' or 'December 15 - January 31')",
    "eligibility": "Concise 1-2 sentence real eligibility criteria (minimum GPA, eligible nationalities, work experience)",
    "coverage": "Full funded / Tuition waiver + Stipend / Partial tuition",
    "link": "official-website-domain",
    "type": "Full Funded"
  }
]`;

    // gpt-oss is a reasoning model: reasoning tokens count toward max_tokens,
    // so the limit is higher and reasoning_effort is kept low.
    const response = await groq.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.25,
      max_tokens: 6000,
      reasoning_effort: 'low',
    } as any);

    const raw = response.choices?.[0]?.message?.content?.trim() || '[]';

    // Robust JSON extraction
    let cleaned = raw;
    const jsonMatch = raw.match(/\[\s*\{[\s\S]*\}\s*\]/);
    if (jsonMatch) {
      cleaned = jsonMatch[0];
    } else {
      cleaned = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();
    }

    let scholarships: any[] = [];
    try {
      const parsed = JSON.parse(cleaned);
      scholarships = Array.isArray(parsed) ? parsed : [];
    } catch (parseErr) {
      console.error('Failed to parse scholarships JSON:', raw, parseErr);
      return Response.json({ scholarships: [] });
    }

    // Format links and types
    scholarships = scholarships.map((s: any) => ({
      ...s,
      type: ['Full Funded', 'Partial', 'Merit-Based', 'Need-Based'].includes(s.type) ? s.type : 'Full Funded',
      link: buildLink(s.link, s.name ?? '', s.provider ?? ''),
    }));

    // Count usage only after a successful search
    await trackUsage(user.userId);

    return Response.json({ scholarships });
  } catch (error) {
    console.error('Scholarship finder route error:', error);
    return Response.json({ error: 'Search failed. Please try again.' }, { status: 500 });
  }
}