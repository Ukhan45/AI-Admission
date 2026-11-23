import Groq from 'groq-sdk';

type DocumentUpload = {
  name: string;
  fileName?: string;
  merged?: boolean;
  attested?: boolean;
};

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Model can be changed from Vercel env vars (GROQ_MODEL) without touching code.
const MODEL = process.env.GROQ_MODEL ?? 'openai/gpt-oss-120b';

export async function POST(req: Request) {
  try {
    const { country, university, degree, documents } = await req.json();

    if (!country || !university || !degree) {
      return Response.json({ error: 'Missing required parameters: country, university, and degree.' }, { status: 400 });
    }

    const documentDescriptions = ((documents || []) as DocumentUpload[])
      .map((doc) => {
        const mergedText = doc.merged ? ' (merged front/back scan)' : '';
        const attestedText = doc.attested ? ' (authenticated with official attestation/apostille stamps)' : '';
        const fileNameText = doc.fileName ? ` - ${doc.fileName}` : '';
        return `${doc.name}${mergedText}${attestedText}${fileNameText}`;
      })
      .join(', ');

    const systemPrompt = `You are a certified international credential evaluator and senior consular document verification specialist with 16+ years of expertise.
You have comprehensive knowledge of the exact document legalizations, apostilles, translations, and embassy requirements for international students applying to higher education in ${country} at ${university}.

SPECIFIC COUNTRY COMPLIANCE RULES:
- GERMANY:
  * APS Certificate is mandatory for applicants with degrees from India, China, or Vietnam before visa or university enrollment.
  * Secondary school and degrees require verification (e.g. IBCC/HEC/Notary/MOFA depending on source country).
  * Uni-assist VPD (Vorprüfungsdokumentation) required for most public universities.
  * Proof of financial resources: Blocked Account (€11,904) or official declaration of commitment (Verpflichtungserklärung).
- ITALY:
  * CIMEA Statement of Comparability and Verification, or formal Declaration of Value (Dichiarazione di Valore - DOV) from the Italian Embassy.
  * Universitaly pre-enrollment summary.
- FRANCE:
  * Etudes en France (EEF) procedure and Campus France interview certificate.
  * Certified French translations by a sworn translator for non-French documents.
- UNITED KINGDOM:
  * Tuberculosis (TB) clearance certificate from an approved clinic for designated countries.
  * Valid Confirmation of Acceptance for Studies (CAS) from a licensed student sponsor.
  * ATAS (Academic Technology Approval Scheme) clearance certificate for specific sensitive STEM subjects.
- CANADA:
  * Provincial Attestation Letter (PAL) under recent IRCC regulations.
  * Guaranteed Investment Certificate (GIC) from an eligible Canadian financial institution.
- UNITED STATES:
  * Form I-20 issued by the SEVP-certified institution.
  * SEVIS I-901 fee payment receipt and DS-160 confirmation barcode.

DOCUMENT EVALUATION INSTRUCTIONS:
1. For every uploaded document, assess whether it is complete, needs update, or requires specific attestation/apostille.
2. If a critical mandatory document for ${country} / ${university} is absent from their uploaded list, explicitly mark it as "Missing".
3. Provide actionable, precise instructions on how to obtain or verify each document.
4. Return ONLY a valid JSON array matching the exact schema.`;

    const userPrompt = `A student is applying to ${university} in ${country} for a ${degree} program.

DOCUMENTS SUBMITTED BY STUDENT:
${documentDescriptions || 'No documents submitted yet.'}

Return ONLY a valid JSON array matching this exact schema:
[
  {
    "document": "Document Title",
    "status": "OK" | "Update Needed" | "Missing" | "Attestation Required" | "Apostille Required",
    "message": "Specific legal/admissions explanation for ${country} and ${university}",
    "action": "Exact step-by-step action the applicant must take"
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
      temperature: 0.2,
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

    let results: any[] = [];
    try {
      const parsed = JSON.parse(cleaned);
      results = Array.isArray(parsed) ? parsed : [];
    } catch (parseErr) {
      console.error('Failed to parse document checker results:', raw, parseErr);
      return Response.json({ error: 'Failed to parse document verification results. Please retry.' }, { status: 500 });
    }

    return Response.json({ results });
  } catch (error) {
    console.error('Document checker API error:', error);
    return Response.json({ error: 'Document verification analysis failed. Please try again.' }, { status: 500 });
  }
}