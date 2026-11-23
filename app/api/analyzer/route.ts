import Groq from 'groq-sdk';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebase-admin';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Model can be changed from Vercel env vars (GROQ_MODEL) without touching code.
const MODEL = process.env.GROQ_MODEL ?? 'openai/gpt-oss-120b';

// Only verifies the user. Usage is counted later, after a successful analysis.
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
    console.error('Auth error in analyzer:', error);
    return { allowed: false as const, reason: 'not_authenticated' };
  }
}

async function trackUsage(userId: string) {
  try {
    await adminDb.collection('users').doc(userId).update({
      analyzer_used: FieldValue.increment(1),
    });
  } catch (error) {
    // Never fail the request just because the counter could not be updated.
    console.error('Failed to track analyzer usage:', error);
  }
}

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return Response.json({ error: 'unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const user = await verifyUser(token);
    if (!user.allowed) {
      return Response.json({ error: 'unauthorized' }, { status: 401 });
    }

    const data = await req.json();
    const level = (data.level || 'MS').toString().toUpperCase();

    if (!data.degree || !data.budget || !data.country) {
      return Response.json({ error: 'Missing required fields: degree, budget, and country are required.' }, { status: 400 });
    }

    let calculatedCgpa = 0;
    let academicSummary = '';

    if (level === 'MS') {
      if (!data.cgpa) return Response.json({ error: 'Missing CGPA for Masters evaluation' }, { status: 400 });
      calculatedCgpa = parseFloat(data.cgpa);
      academicSummary = `Undergraduate Degree: ${data.degree}, CGPA: ${calculatedCgpa.toFixed(2)}/4.0`;
    } else {
      const matric = parseFloat(data.matric);
      const inter = parseFloat(data.inter);
      if (isNaN(matric) || isNaN(inter)) {
        return Response.json({ error: 'Missing Matric/Intermediate scores for BS evaluation' }, { status: 400 });
      }
      const avgPerc = (matric + inter) / 2;
      calculatedCgpa = Math.min(Math.max((avgPerc / 100) * 4.0, 0), 4.0);
      academicSummary = `Secondary School (Matric/O-Levels): ${matric}%, Higher Secondary (Intermediate/A-Levels): ${inter}%, Normalized GPA: ${calculatedCgpa.toFixed(2)}/4.0`;
    }

    const budget = parseFloat(data.budget);
    const rawIelts = (data.ielts || '').toString().trim();
    let ieltsScore = 0;
    if (rawIelts) {
      const parsed = parseFloat(rawIelts);
      if (!isNaN(parsed)) ieltsScore = parsed;
    }

    // Baseline validation for unfeasible profiles
    if (calculatedCgpa < 1.8 || budget < 40) {
      await trackUsage(user.userId);
      return Response.json({
        result: {
          overall_score: calculatedCgpa < 1.8 ? 10 : 15,
          verdict: calculatedCgpa < 1.8
            ? `With an academic score equivalent to ${calculatedCgpa.toFixed(2)}/4.0, direct international ${level} admission is not currently viable at accredited institutions.`
            : `A monthly budget of $${budget} is significantly below international visa and living requirements worldwide.`,
          strengths: ['Identified international study ambition early', 'Room to improve foundational credentials before formal submission'],
          weaknesses: calculatedCgpa < 1.8 ? [
            `Academic standing (${calculatedCgpa.toFixed(2)}/4.0) is below global minimum accredited threshold (2.5/4.0)`,
            'High probability of visa rejection without academic remediation',
          ] : [
            `Budget ($${budget}/month) does not meet mandatory living cost proof (e.g., German blocked account requires ~$1,000/mo, UK ~$1,400/mo)`,
          ],
          universities: [],
          improvements: calculatedCgpa < 1.8 ? [
            { action: 'Retake deficient courses or complete a 1-year postgraduate diploma to elevate GPA', impact: 'High', timeline: '1 year' },
            { action: 'Consider pre-master foundation pathways or local university progression', impact: 'High', timeline: '6-12 months' },
          ] : [
            { action: 'Apply strictly for full government scholarships (DAAD, Turkiye Burslari, Stipendium Hungaricum, CSC)', impact: 'High', timeline: '4-8 months' },
          ],
          countries: [],
        },
      });
    }

    const systemPrompt = `You are a distinguished international education evaluator and senior admissions committee advisor with 18+ years of global admissions expertise.
You evaluate profiles with clinical precision, objective rigor, and authentic institutional data.

CRITICAL ASSESSMENT GUIDELINES:
1. INSTITUTIONAL ACCURACY:
   - Provide real accredited universities only.
   - For Germany: tuition at public universities is €0/year (except state of Baden-Württemberg: €1,500/sem, and TUM).
   - For Italy: public university tuition is typically €900–€3,500/year (often €0 with regional DSU grants).
   - For France: public universities ~€2,770 (BS) or ~€3,770 (MS) per year.
   - Provide realistic CGPA and IELTS benchmarks for each recommended institution.
2. UNIVERSITY PORTFOLIO DISTRIBUTION:
   - Recommend exactly 5 universities:
     - 2 "Safe" (Admission probability high: student's GPA and language credentials clearly exceed the university cutoff)
     - 2 "Target" (Admission probability competitive/solid: student's profile directly matches average admitted student profile)
     - 1 "Reach" (Ambitious: university has higher ranking or GPA/portfolio bar slightly above current student baseline, but achievable with exceptional SOP/LORs)
3. SCORING METHODOLOGY:
   - Calculate an overall competitiveness score (0–100) factoring in academic GPA (${calculatedCgpa.toFixed(2)}), English proficiency (${rawIelts || 'Not tested'}), and financial feasibility ($${budget}/mo vs target country requirements).
4. RETURN FORMAT:
   - Return strictly valid JSON with no markdown wrapping, no commentary, and no trailing commas.`;

    const userPrompt = `Evaluate this applicant profile and return valid JSON matching the exact schema:

STUDENT PROFILE:
- Target Degree Level: ${level}
- Academic Record: ${academicSummary}
- Field of Interest: ${data.field || data.degree}
- English Language Qualification: ${rawIelts || 'None / Intending to use Medium of Instruction'}
- Available Monthly Budget: $${data.budget} USD/month
- Destination Preference: ${data.country}

SCHEMA:
{
  "overall_score": <number 0-100>,
  "verdict": "<Honest, precise 1-2 sentence admissions prognosis>",
  "strengths": ["<strength 1>", "<strength 2>", "<strength 3>"],
  "weaknesses": ["<weakness 1>", "<weakness 2>", "<weakness 3>"],
  "universities": [
    {
      "name": "University Name",
      "country": "Country",
      "match": <number 0-100>,
      "requirement_cgpa": "e.g. 2.8 / 4.0",
      "tuition": "e.g. €0 (Public) or $12,000/yr",
      "ielts_required": "e.g. 6.5 or MOI Accepted",
      "verdict": "Safe" | "Target" | "Reach"
    }
  ],
  "improvements": [
    {
      "action": "<High-impact tactical action>",
      "impact": "High" | "Medium" | "Low",
      "timeline": "<e.g. 1-2 months>"
    }
  ],
  "countries": [
    {
      "name": "Country Name",
      "why": "<Strategic reason why this country matches student profile and budget>",
      "avg_cost": "<Realistic monthly living cost e.g. $850-$1,100/mo>",
      "ielts_needed": "Yes" | "Sometimes" | "No"
    }
  ]
}`;

    // gpt-oss is a reasoning model: reasoning tokens count toward max_tokens,
    // so the limit is higher and reasoning_effort is kept low.
    const response = await groq.chat.completions.create({
      model: MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.3,
      max_tokens: 6000,
      reasoning_effort: 'low',
    } as any);

    const raw = response.choices?.[0]?.message?.content?.trim() || '{}';

    // Robust JSON extraction
    let cleaned = raw;
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      cleaned = jsonMatch[0];
    } else {
      cleaned = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();
    }

    let parsed;
    try {
      parsed = JSON.parse(cleaned);
    } catch (parseErr) {
      console.error('Failed to parse analyzer response:', raw, parseErr);
      return Response.json({ error: 'Failed to parse admission analysis. Please retry.' }, { status: 500 });
    }

    // Safety checks
    parsed.overall_score = Math.min(Math.max(Number(parsed.overall_score) || 50, 5), 98);
    if (Array.isArray(parsed.universities)) {
      parsed.universities = parsed.universities.map((u: any) => ({
        ...u,
        match: Math.min(Math.max(Number(u.match) || 60, 10), 99),
        verdict: ['Safe', 'Target', 'Reach'].includes(u.verdict) ? u.verdict : 'Target',
      }));
    }

    // Count usage only after a successful analysis
    await trackUsage(user.userId);

    return Response.json({ result: parsed });
  } catch (error) {
    console.error('Analyzer route error:', error);
    return Response.json({ error: 'Admission analysis failed. Please try again.' }, { status: 500 });
  }
}