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

    // Increment usage
    await userDocRef.update({ scholarship_searches_used: FieldValue.increment(1) });

    return { allowed: true, userId };
  } catch (error) {
    console.error('Auth error in scholarship finder:', error);
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

    const response = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.25,
      max_tokens: 2200,
    });

    const raw = response.choices?.[0]?.message?.content?.trim() || '[]';

    // Robust JSON extraction
    let cleaned = raw;
    const jsonMatch = raw.match(/\[\s*\{[\s\S]*\}\s*\]/);
    if (jsonMatch) {
      cleaned = jsonMatch[0];
    } else {
      cleaned = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();
    }

    let scholarships = [];
    try {
      scholarships = JSON.parse(cleaned);
    } catch (parseErr) {
      console.error('Failed to parse scholarships JSON:', raw, parseErr);
      return Response.json({ scholarships: [] });
    }

    // Format links and types
    scholarships = scholarships.map((s: any) => ({
      ...s,
      type: ['Full Funded', 'Partial', 'Merit-Based', 'Need-Based'].includes(s.type) ? s.type : 'Full Funded',
      link: (s.link || '').replace(/^https?:\/\//i, '').replace(/\/$/, ''),
    }));

    return Response.json({ scholarships });
  } catch (error) {
    console.error('Scholarship finder route error:', error);
    return Response.json({ error: 'Search failed. Please try again.' }, { status: 500 });
  }
}
