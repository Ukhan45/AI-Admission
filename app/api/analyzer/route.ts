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

    const data = await req.json();

    if (!data.cgpa || !data.degree || !data.budget || !data.country) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const cgpa = parseFloat(data.cgpa);
    const budget = parseFloat(data.budget);
    const ielts = parseFloat(data.ielts) || 0;

    // ✅ Hard gate for unrealistic profiles
    if (cgpa < 2.0 || budget < 50) {
      return Response.json({
        result: {
          overall_score: cgpa < 2.0 ? 8 : 12,
          verdict: cgpa < 2.0
            ? `With a CGPA of ${cgpa}, international MS admission is not realistic at this stage. Most universities worldwide require a minimum of 2.5 CGPA. Focus on improving your academic standing first.`
            : `A monthly budget of $${budget} is not sufficient for international study anywhere in the world. Minimum realistic budget is $400–500/month even in the most affordable countries.`,
          strengths: [
            'You have identified your goal early',
            'There is still time to improve before applying',
          ],
          weaknesses: cgpa < 2.0 ? [
            `CGPA of ${cgpa} is below the minimum threshold for any accredited MS program`,
            `Most universities require minimum 2.5 CGPA — you are ${(2.5 - cgpa).toFixed(1)} points below`,
            `Budget of $${budget}/month is not viable for international study`,
          ] : [
            `Budget of $${budget}/month is far below the minimum needed ($400–500/month)`,
            'Cannot cover tuition, housing, food, or travel at this budget',
          ],
          universities: [],
          improvements: cgpa < 2.0 ? [
            { action: 'Retake failed courses or pursue a second degree to raise CGPA above 2.5', impact: 'High', timeline: '1-2 years' },
            { action: 'Consider local MS programs first which have lower CGPA requirements', impact: 'High', timeline: '6-12 months' },
            { action: 'Build strong work experience and projects to compensate for low CGPA', impact: 'Medium', timeline: '1-2 years' },
            { action: 'Take IELTS to at least have that requirement ready when CGPA improves', impact: 'Medium', timeline: '2-3 months' },
          ] : [
            { action: 'Research and apply for full scholarships that cover tuition and living costs', impact: 'High', timeline: '3-6 months' },
            { action: 'Consider part-time work alongside studies if permitted by visa', impact: 'Medium', timeline: 'Ongoing' },
          ],
          countries: [],
        },
      });
    }

    // ✅ Server-side score calculation
    let baseScore = 0;

    if (cgpa >= 3.7)      baseScore += 45;
    else if (cgpa >= 3.5) baseScore += 38;
    else if (cgpa >= 3.2) baseScore += 30;
    else if (cgpa >= 3.0) baseScore += 22;
    else if (cgpa >= 2.7) baseScore += 14;
    else if (cgpa >= 2.5) baseScore += 8;
    else                  baseScore += 3;

    if (ielts >= 7.5)      baseScore += 25;
    else if (ielts >= 7.0) baseScore += 20;
    else if (ielts >= 6.5) baseScore += 15;
    else if (ielts >= 6.0) baseScore += 10;
    else if (ielts >= 5.5) baseScore += 5;
    else                   baseScore += 0;

    if (budget >= 2000)      baseScore += 20;
    else if (budget >= 1500) baseScore += 15;
    else if (budget >= 1000) baseScore += 10;
    else if (budget >= 500)  baseScore += 5;
    else                     baseScore += 1;

    const minScore = Math.max(baseScore - 5, 0);
    const maxScore = Math.min(baseScore + 10, 100);
    const maxUniMatch = cgpa < 2.5 ? 40 : cgpa < 3.0 ? 55 : cgpa < 3.5 ? 75 : 100;

    const prompt = `
You are an expert international university admission consultant with 15+ years of experience.
Be brutally honest. Do NOT sugarcoat weak profiles.

Analyze this student profile and return a JSON response ONLY. No extra text, no markdown.

STUDENT PROFILE:
- CGPA: ${data.cgpa}/4.0
- Degree: ${data.degree}
- IELTS Score: ${data.ielts || 'Not taken'}
- Monthly Budget: $${data.budget} USD
- Preferred Country: ${data.country}
- Field of Interest: ${data.field || 'Same as degree'}

STRICT SCORING RULES:
- overall_score MUST be between ${minScore} and ${maxScore} — no exceptions
- All university match percentages MUST be below ${maxUniMatch}%
- Do NOT recommend universities whose minimum CGPA is above ${cgpa.toFixed(1)}
- If budget is below $500/month, only recommend countries where living costs are under $600/month
- Be honest — a weak profile should get a tough but constructive verdict

Return this exact JSON structure:
{
  "overall_score": <number between ${minScore} and ${maxScore}>,
  "verdict": "<honest one sentence overall assessment>",
  "strengths": ["<strength 1>", "<strength 2>", "<strength 3>"],
  "weaknesses": ["<weakness 1>", "<weakness 2>", "<weakness 3>"],
  "universities": [
    {
      "name": "<university name>",
      "country": "<country>",
      "match": <number 0-${maxUniMatch}>,
      "requirement_cgpa": "<e.g. 2.5+>",
      "tuition": "<e.g. $3,000/year>",
      "ielts_required": "<e.g. 6.0 or Not required>",
      "verdict": "<Safe | Target | Reach>"
    }
  ],
  "improvements": [
    {
      "action": "<specific actionable step>",
      "impact": "<High | Medium | Low>",
      "timeline": "<e.g. 2-3 months>"
    }
  ],
  "countries": [
    {
      "name": "<country>",
      "why": "<1 sentence why it fits this student's budget and profile>",
      "avg_cost": "<e.g. $600/month>",
      "ielts_needed": "<Yes | Sometimes | No>"
    }
  ]
}

Rules:
- Recommend exactly 5 universities realistic for THIS specific profile
- Mix Safe (2), Target (2), Reach (1) — Reach must still be somewhat realistic
- Universities must be in or near the preferred country if specified
- All fields required — never leave any field empty
- Return ONLY the JSON object, nothing else
`;

    const response = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'system',
          content: 'You are a university admission expert. Always respond with valid JSON only. Never include markdown, backticks, or any text outside the JSON object.',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.4,
      max_tokens: 2000,
    });

    const raw = response.choices[0].message.content ?? '';
    const cleaned = raw.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(cleaned);

    parsed.overall_score = Math.min(Math.max(parsed.overall_score, minScore), maxScore);
    if (parsed.universities) {
      parsed.universities = parsed.universities.map((uni: any) => ({
        ...uni,
        match: Math.min(uni.match, maxUniMatch),
      }));
    }

    return Response.json({ result: parsed });

  } catch (error) {
    console.error('Analyzer error:', error);
    return Response.json({ error: 'Analysis failed. Please try again.' }, { status: 500 });
  }
}