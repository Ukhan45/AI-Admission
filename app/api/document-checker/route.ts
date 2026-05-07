import Groq from 'groq-sdk';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export async function POST(req: Request) {
  try {
    const { country, university, degree, documents } = await req.json();

    const prompt = `You are an international admissions document expert. A student is applying to ${university} in ${country} for a ${degree} program.

They have uploaded these documents: ${documents.join(', ')}.

For each document, assess its status based on ${country}'s requirements for international students applying to ${university}.

Return ONLY a valid JSON array (no markdown, no explanation):
[
  {
    "document": "Document Name",
    "status": "OK" | "Update Needed" | "Missing" | "Attestation Required" | "Apostille Required",
    "message": "Specific explanation about this document for ${country}/${university}",
    "action": "Specific action the student should take"
  }
]

Also include any MISSING critical documents not in their list.
Consider ${country}-specific requirements: apostille, HEC attestation, embassy attestation, notarization, translation requirements, expiry dates etc.
Return only the JSON array.`;

    const response = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2,
    });

    const raw = response.choices[0].message.content || '[]';
    const cleaned = raw.replace(/```json|```/g, '').trim();
    const results = JSON.parse(cleaned);

    return Response.json({ results });
  } catch (error) {
    console.error('Document checker error:', error);
    return new Response('Failed to check documents', { status: 500 });
  }
}