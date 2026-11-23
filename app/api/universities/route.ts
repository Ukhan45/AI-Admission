import Groq from 'groq-sdk';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(req: Request) {
  try {
    const { degree, country, budget, ielts, gpa, intake, ranking, level } = await req.json();

    if (!degree || !country) {
      return Response.json({ error: 'Missing required fields: field/degree and country are required.' }, { status: 400 });
    }

    const cleanDegree = degree.trim();
    const cleanCountry = country.trim();
    const studyLevel = (level || 'MS').toString().toUpperCase() === 'BS' ? 'BS' : (level || 'MS').toString().toUpperCase() === 'PHD' ? 'PHD' : 'MS';
    const levelFullName = studyLevel === 'BS' ? "Bachelor's (Undergraduate - BS/BSc/BA/BEng)" : studyLevel === 'PHD' ? "Doctorate (PhD/DPhil)" : "Master's (Postgraduate - MS/MSc/MA/MBA)";
    const cleanBudget = budget ? `$${budget}/month` : 'Not constrained';
    const cleanIelts = ielts?.trim() || 'Not provided / English proficiency certificate';
    const cleanGpa = gpa?.trim() || 'Not specified';
    const cleanIntake = intake && intake !== 'Any' ? intake : 'Next upcoming intake (Fall/Spring)';
    const cleanRanking = ranking && ranking !== 'Any' ? ranking : 'Any recognized accredited institution';

    const systemPrompt = `You are a world-class international university admissions counselor with comprehensive, authoritative knowledge of global higher education institutions, accreditation, tuition structures, intake cycles, and admission selectivity standards.
Your mission is to return REAL, currently accredited, highly accurate university recommendations matching the student's exact profile and EXACT study level.

CRITICAL LEVEL-SPECIFIC COMPLIANCE (BS vs MS):
- TARGET STUDY LEVEL: ${levelFullName}
- If the student is applying for BS (Undergraduate):
  * EVERY recommended university MUST offer English-friendly or relevant ${studyLevel} Bachelor's degrees in ${cleanDegree}.
  * List undergraduate program names (e.g. "BSc in Computer Science", "BEng Software Engineering", "Bachelor of Business Administration").
  * Evaluate admission chance based on high school credentials (GPA/percentage ${cleanGpa}) and language score (${cleanIelts}).
  * For Germany BS: Note if the student needs a 1-year Studienkolleg (for 12-year secondary education systems) or direct entrance.
  * DO NOT return Master's or postgraduate programs.
- If the student is applying for MS (Postgraduate):
  * EVERY recommended university MUST offer graduate ${studyLevel} Master's degrees in ${cleanDegree}.
  * List graduate program names (e.g. "MSc in Computer Science", "Master of Engineering", "MBA").
  * Evaluate admission chance based on undergraduate CGPA (${cleanGpa}) and language score (${cleanIelts}).
  * DO NOT return Bachelor's programs.

CRITICAL ACCURACY GUIDELINES:
1. REAL UNIVERSITIES & WEBSITES ONLY:
   - Never invent universities. Use exact official university names and their verified root domain website (e.g., "tum.de", "ethz.ch", "utoronto.ca", "ox.ac.uk", "ubc.ca", "kth.se", "polimi.it", "uni-heidelberg.de", "tudelft.nl", "monash.edu").
2. ACCURATE TUITION RULES:
   - Germany: Public universities have NO tuition fees (€0/year) for both BS and MS (except state of Baden-Württemberg: €1,500/semester for non-EU, and recently TUM). Semester ticket is ~€250–€350/sem.
   - Italy: Public universities tuition is typically €900–€3,500/year (often €0 with regional DSU scholarships for both BS and MS).
   - France: Public universities standard non-EU fees are ~€2,770/year for Bachelor's and ~€3,770/year for Master's.
   - Norway: Public universities non-EU tuition is ~NOK 130,000–220,000/year.
   - Sweden: Non-EU tuition is approximately SEK 90,000–180,000/year.
   - UK / USA / Canada / Australia: Tuition is typically $15,000–$45,000/year.
3. RIGOROUS ADMISSION CHANCE CALCULATION:
   - Categorize the 6 universities into an honest portfolio:
     * 2 "High" (Safe options where student's credentials comfortably meet/exceed requirements)
     * 2 "Medium" (Target options where student matches average accepted cohort)
     * 2 "Low" (Reach/Ambitious options with higher prestige or selective entry)`;

    const userPrompt = `Generate a JSON array of exactly 6 real accredited universities for this student:

STUDENT PROFILE:
- TARGET STUDY LEVEL: ${studyLevel} (${levelFullName})
- Field of Study: ${cleanDegree}
- Preferred Country: ${cleanCountry}
- Target Intake: ${cleanIntake}
- Global Ranking Filter: ${cleanRanking}
- Student GPA / Academic Score: ${cleanGpa}
- Student IELTS / English Score: ${cleanIelts}
- Monthly Budget (Living + Tuition): ${cleanBudget}

IMPORTANT: All recommended programs must strictly be for ${studyLevel} (${studyLevel === 'BS' ? 'Undergraduate Bachelor\'s' : 'Graduate Master\'s'}).

Return ONLY a valid JSON array in this exact schema, with no markdown code blocks, no preamble, and no explanation:
[
  {
    "name": "Full Official University Name",
    "country": "Country",
    "city": "City",
    "tuition": "Accurate tuition string (e.g. '€0 (Tuition Free - €300/sem fee)' or '$16,000/year')",
    "language": "English / German / Bilingual",
    "ieltsRequired": "e.g. 6.5 or Not Required",
    "programs": ["Specific ${studyLevel} Program 1", "Specific ${studyLevel} Program 2"],
    "admissionChance": "High" | "Medium" | "Low",
    "website": "official-domain.edu"
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

    let universities = [];
    try {
      universities = JSON.parse(cleaned);
    } catch (parseErr) {
      console.error('Failed to parse universities JSON:', raw, parseErr);
      return Response.json({ error: 'Failed to parse university recommendations. Please retry.' }, { status: 500 });
    }

    // Ensure admissionChance conforms to 'High' | 'Medium' | 'Low'
    universities = universities.map((u: any) => ({
      ...u,
      admissionChance: ['High', 'Medium', 'Low'].includes(u.admissionChance) ? u.admissionChance : 'Medium',
      website: (u.website || '').replace(/^https?:\/\//i, '').replace(/\/$/, ''),
    }));

    return Response.json({ universities });
  } catch (error) {
    console.error('Universities API error:', error);
    return Response.json({ error: 'Failed to fetch universities. Please try again.' }, { status: 500 });
  }
}
