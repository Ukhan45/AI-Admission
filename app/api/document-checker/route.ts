import Groq from 'groq-sdk';
import { getAuth } from 'firebase-admin/auth';
import { adminDb } from '@/lib/firebase-admin';

type DocumentUpload = {
  name: string;
  label?: string;
  // What our system actually read from the uploaded file (see lib/documentAnalysis.ts)
  evidence?: string;
};

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Model can be changed from Vercel env vars (GROQ_MODEL) without touching code.
const MODEL = process.env.GROQ_MODEL ?? 'openai/gpt-oss-120b';

// Only verifies the user is signed in and has a profile.
async function verifyUser(token: string) {
  try {
    const decoded = await getAuth().verifyIdToken(token);
    const userDoc = await adminDb.collection('users').doc(decoded.uid).get();
    return userDoc.exists;
  } catch (error) {
    console.error('Auth error in document checker:', error);
    return false;
  }
}

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return Response.json({ error: 'unauthorized' }, { status: 401 });
    }
    if (!(await verifyUser(authHeader.substring(7)))) {
      return Response.json({ error: 'unauthorized' }, { status: 401 });
    }

    const { country, university, degree, level, documents, missingCore } = await req.json();

    if (!country || !university || !degree) {
      return Response.json(
        { error: 'Missing required parameters: country, university, and degree.' },
        { status: 400 }
      );
    }

    const levelKey = String(level || '').toUpperCase() === 'BS' ? 'BS' : 'MS';
    const levelName = levelKey === 'BS' ? "Bachelor's (BS)" : "Master's (MS)";

    const documentDescriptions = ((documents || []) as DocumentUpload[])
      .map((doc) => {
        const title = doc.label || doc.name;
        const evidence = typeof doc.evidence === 'string' ? doc.evidence.slice(0, 700) : '';
        return `- ${evidence || `${title}: submitted, but nothing could be read from it.`}`;
      })
      .join('\n');

    const missingText =
      Array.isArray(missingCore) && missingCore.length
        ? (missingCore as string[]).join('; ')
        : 'none';

    const levelRules =
      levelKey === 'BS'
        ? `LEVEL: BACHELOR'S (BS). The core of the file is the Matric (SSC) and Intermediate (HSSC) or A-Level documents, plus language proof (IELTS/TOEFL), CV and Statement of Purpose. A university degree or transcript is NOT expected unless the applicant is transferring, so never mark those "Missing". One or two recommendation letters are usually enough.`
        : `LEVEL: MASTER'S (MS). The core of the file is the Bachelor's degree certificate and all semester transcripts, plus CV, Statement of Purpose, two or three recommendation letters and language proof. Matric and Intermediate documents are often requested as well but are not always core.`;

    const systemPrompt = `You are a certified international credential evaluator and senior consular document verification specialist with 16+ years of expertise.
You know the document legalisation, apostille, translation and embassy requirements for international students applying to higher education in ${country} at ${university}. The applicant is a PAKISTANI student holding Pakistani documents.

${levelRules}

PAKISTAN VERIFICATION RULES (current as of November 2026, use exactly these):
- Matric (SSC) and Intermediate (HSSC) certificates and marksheets: issuing Board verification, then IBCC attestation (SSC before HSSC), then MOFA, then embassy legalisation only if the destination requires it. IBCC is moving to fully online attestation from 1 January 2027.
- Degree certificates, transcripts, provisional certificates: university Controller of Examinations verification where needed, then HEC e-Attestation (fully online and paperless since 11 May 2026, Rs 3,000 per document), then MOFA, then embassy legalisation only if required. Names on the documents must exactly match the CNIC/passport.
- MOFA: Pakistan is a member of the Hague Apostille Convention since 9 March 2023. MOFA's digital attestation system has run since 12 October 2026. Use Apostille for destinations that are members. Germany, Austria, Greece, the Netherlands, Czechia, Denmark, Finland and Poland objected to Pakistan's accession, so apostille does NOT apply for them: ordinary MOFA attestation followed by legalisation at that country's embassy is needed. Non-member destinations also need ordinary MOFA attestation plus embassy legalisation.
- Birth certificate: NADRA, then MOFA. Police clearance: issuing police authority, then MOFA. Experience letter: employer letterhead, optionally notarised, MOFA only if the university or embassy asks.
- CV, SOP, recommendation letters, IELTS/TOEFL reports, passport copies, visa form, insurance and similar documents need no Pakistani government attestation.
- Never invent other authorities, fees or procedures. When unsure, tell the applicant to confirm with the university or embassy.

SPECIFIC COUNTRY COMPLIANCE RULES:
- GERMANY:
  * Uni-assist VPD (Vorprüfungsdokumentation) is required by many public universities; some universities assess applications directly.
  * Proof of financial resources: Blocked Account or an official declaration of commitment (Verpflichtungserklärung). Confirm the current amount with the German embassy.
  * Apostille does not apply between Pakistan and Germany (see above).
- ITALY:
  * CIMEA Statement of Comparability and Verification, or a Declaration of Value from the Italian Embassy.
  * Universitaly pre-enrollment summary.
- FRANCE:
  * Etudes en France (EEF) procedure and Campus France interview certificate.
  * Certified French translations by a sworn translator for non-French documents.
- UNITED KINGDOM:
  * Tuberculosis (TB) clearance certificate from an approved clinic for designated countries (this includes Pakistan).
  * Valid Confirmation of Acceptance for Studies (CAS) from a licensed student sponsor.
  * ATAS clearance for specific sensitive STEM subjects.
- CANADA:
  * Provincial Attestation Letter (PAL) where applicable under current IRCC rules.
  * Guaranteed Investment Certificate (GIC) from an eligible Canadian financial institution.
- UNITED STATES:
  * Form I-20 issued by the SEVP-certified institution.
  * SEVIS I-901 fee payment receipt and DS-160 confirmation barcode.

EVIDENCE RULES (very important):
- Each submitted document below is followed by what our system actually READ from the uploaded file: the marks that were FOUND and the marks that were NOT found. Treat this as the truth.
- NEVER claim that a stamp, attestation, apostille or certificate exists unless it is listed under "Marks FOUND". NEVER say a document is "OK" or "already attested" if the needed marks are under "Marks NOT found".
- If a document's marks are missing, say exactly which authority is next in the chain, and do not repeat steps that were already found.
- Your job is the university- and country-specific review: what ${university} and ${country} additionally require (translations, uni-assist, CIMEA, APS, financial proof and so on) that these documents do not yet cover.

DOCUMENT EVALUATION INSTRUCTIONS:
1. Give one result for every document the applicant submitted. Assess whether it is complete, needs an update, or needs attestation/apostille. If a document that needs the Pakistani chain above is reported with no attestation stamps, use "Attestation Required" (or "Apostille Required" when the destination accepts apostille) and name the exact authorities in order.
2. Add one result with status "Missing" for each core document that is not submitted (they are listed by the user message). Do not mark documents "Missing" that are not core for this level.
3. Keep messages specific to ${country} and ${university}. Keep each "action" short, concrete and ordered.
4. Return ONLY a valid JSON array matching the exact schema. No markdown, no commentary.`;

    const userPrompt = `A Pakistani student is applying to ${university} in ${country} for a ${levelName} program: ${degree}.

DOCUMENTS SUBMITTED BY STUDENT (with what was read from each file):
${documentDescriptions || 'No documents submitted yet.'}

CORE DOCUMENTS NOT YET SUBMITTED:
${missingText}

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
      cleaned = raw
        .replace(/^```json\s*/i, '')
        .replace(/^```\s*/i, '')
        .replace(/\s*```$/i, '')
        .trim();
    }

    let results: any[] = [];
    try {
      const parsed = JSON.parse(cleaned);
      results = Array.isArray(parsed) ? parsed : [];
    } catch (parseErr) {
      console.error('Failed to parse document checker results:', raw, parseErr);
      return Response.json(
        { error: 'Failed to parse document verification results. Please retry.' },
        { status: 500 }
      );
    }

    return Response.json({ results });
  } catch (error) {
    console.error('Document checker API error:', error);
    return Response.json(
      { error: 'Document verification analysis failed. Please try again.' },
      { status: 500 }
    );
  }
}