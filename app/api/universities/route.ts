import Groq from 'groq-sdk';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(req: Request) {
  try {
    const { degree, country, budget, ielts } = await req.json();

    if (!degree || !country) {
      return new Response('Missing required fields', { status: 400 });
    }

    const prompt = `You are a university admissions expert. Return a JSON array of 6 real universities matching this student profile:

Field of Study: ${degree}
Preferred Country: ${country}
Monthly Budget: ${budget ? '$' + budget : 'Not specified'}
IELTS Score: ${ielts || 'Not provided'}

Return ONLY a valid JSON array (no markdown, no explanation) in this exact format:
[
  {
    "name": "Full University Name",
    "country": "Country",
    "city": "City",
    "tuition": "$X,XXX/year",
    "language": "English / German / etc",
    "ieltsRequired": "6.5 or Not Required",
    "programs": ["Program 1", "Program 2"],
    "admissionChance": "High" or "Medium" or "Low",
    "website": "university.edu"
  }
]

Base admission chance on the budget and IELTS provided. Return exactly 6 universities. Only return the JSON array.`;

    const response = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
    });

    const raw = response.choices[0].message.content || '[]';

    // Strip markdown fences if present
    const cleaned = raw.replace(/```json|```/g, '').trim();
    const universities = JSON.parse(cleaned);

    return Response.json({ universities });
  } catch (error) {
    console.error('Universities error:', error);
    return new Response('Failed to fetch universities', { status: 500 });
  }
}