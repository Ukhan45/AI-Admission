import Groq from 'groq-sdk';
import { getAuth } from 'firebase-admin/auth';
import { adminDb } from '@/lib/firebase-admin';
import { normalizeExtraction } from '@/lib/documentAnalysis';

// Reading scanned pages with a vision model can take a while.
export const maxDuration = 60;

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Groq retires vision models from time to time (Llama 4 Scout was retired in
// June 2026). Change this from Vercel env vars (GROQ_VISION_MODEL) without
// touching code. It must be a model that accepts images and JSON mode.
const VISION_MODELS = [
  ...new Set(
    [process.env.GROQ_VISION_MODEL, 'qwen/qwen3.6-27b', 'qwen/qwen3.8-27b'].filter(
      (m): m is string => !!m
    )
  ),
];

// Remember which model worked, so later documents do not retry the others.
let workingModel: string | null = null;

// Different models accept different "thinking" settings, so try a few styles.
const OPTION_SETS: Record<string, unknown>[] = [
  { reasoning_effort: 'none', response_format: { type: 'json_object' } },
  { reasoning_effort: 'none' },
  { reasoning_format: 'hidden', response_format: { type: 'json_object' } },
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function errorInfo(err: any): { status: number | undefined; message: string } {
  const message =
    err?.error?.error?.message || err?.error?.message || err?.message || 'Unknown error';
  return { status: err?.status, message: String(message).replace(/\s+/g, ' ').slice(0, 220) };
}

const looksLikeModelProblem = (status: number | undefined, message: string) =>
  status === 404 ||
  /model/i.test(message) && /(not found|does not exist|decommission|deprecat|no longer|access|permission|not supported|unavailable)/i.test(message);

const MAX_IMAGES = 3;
const MAX_IMAGE_CHARS = 1_100_000;
const MAX_TEXT_CHARS = 6000;

async function verifyUser(token: string) {
  try {
    const decoded = await getAuth().verifyIdToken(token);
    const userDoc = await adminDb.collection('users').doc(decoded.uid).get();
    return userDoc.exists;
  } catch (error) {
    console.error('Auth error in document analyze:', error);
    return false;
  }
}

function buildPrompt(label: string, text: string) {
  return `You are a careful document examiner for a student-admissions service. You are looking at pages from ONE document uploaded by a Pakistani student. It was uploaded in the slot named: "${label}".

Report ONLY what is actually visible on the pages or in the extracted text. Never guess and never assume that a stamp, sticker or certificate exists. For every verification mark set "found" to true ONLY if you can really see or read it. A blank space, an unreadable logo, or a QR code with no organisation name does NOT count: use found=false. The "evidence" must be a short quote or description of what you saw (maximum 15 words).

Verification marks to look for (they can be stamps, stickers, printed certificate pages or QR certificates):
- boardVerification: a stamp, sticker or letter from the education Board (BISE, Federal Board, AKU-EB and so on) confirming the document is genuine.
- universityVerification: a verification stamp and signature from the university (Controller of Examinations or Registrar).
- ibcc: an attestation sticker, stamp or certificate from the Inter Board Committee of Chairmen (IBCC).
- hec: an attestation stamp or an e-Attestation Certificate page from the Higher Education Commission (HEC) of Pakistan.
- mofa: a stamp or certificate from the Ministry of Foreign Affairs of Pakistan. Set kind to "apostille" if it is an Apostille certificate (it says "APOSTILLE" / "Convention de La Haye du 5 octobre 1961"), or to "attestation" if it is an ordinary MOFA attestation stamp or e-certificate.
- embassy: a legalisation stamp from a foreign embassy or consulate.
- signatureOrSeal: an official signature and/or seal of the issuer of this document itself.

Other fields:
- readable: false only if the scan is too blurry, dark or cut off to read reliably.
- documentType: what this document really is, in a few words (for example "HSSC marksheet", "Bachelor degree certificate", "University transcript", "IELTS Test Report Form", "CV", "Passport").
- matchesSlot: true if documentType fits the slot "${label}", false if it is clearly a different kind of document.
- holderName: the person the document is ABOUT (the student), exactly as printed. Not the signatory or recommender.
- fatherName: as printed, or null.
- issuer: the Board, university, institution or organisation that issued it.
- program: degree title, group or subject (for example "BS Software Engineering", "Pre-Engineering").
- year: date, session or year of issue as printed.
- result: grade, CGPA, percentage or band score as printed.
- expiryDate: expiry date if the document has one (passport, for example), else null.
- issues: up to 5 short problems you can SEE (cut-off edges, blur, missing pages, incomplete transcript, handwritten corrections, torn paper). Empty array if none.

Use null for anything that is not visible. Return ONLY a JSON object in exactly this shape:
{
  "readable": true,
  "documentType": null,
  "matchesSlot": true,
  "holderName": null,
  "fatherName": null,
  "issuer": null,
  "program": null,
  "year": null,
  "result": null,
  "expiryDate": null,
  "marks": {
    "boardVerification": {"found": false, "evidence": null},
    "universityVerification": {"found": false, "evidence": null},
    "ibcc": {"found": false, "evidence": null},
    "hec": {"found": false, "evidence": null},
    "mofa": {"found": false, "evidence": null, "kind": null},
    "embassy": {"found": false, "evidence": null},
    "signatureOrSeal": {"found": false, "evidence": null}
  },
  "issues": []
}

TEXT EXTRACTED FROM THE PDF (empty or short for scanned documents; the page images are the main source):
${text ? text : '(no text layer)'}`;
}

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ') || !(await verifyUser(authHeader.substring(7)))) {
      return Response.json({ error: 'unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const label = typeof body.label === 'string' ? body.label.slice(0, 80) : '';
    const text = typeof body.text === 'string' ? body.text.slice(0, MAX_TEXT_CHARS) : '';
    const images: string[] = Array.isArray(body.images) ? body.images : [];

    if (!label) {
      return Response.json({ error: 'Missing document label.' }, { status: 400 });
    }
    if (images.length > MAX_IMAGES) {
      return Response.json({ error: `At most ${MAX_IMAGES} page images are allowed.` }, { status: 400 });
    }
    for (const img of images) {
      if (typeof img !== 'string' || !img.startsWith('data:image/jpeg;base64,') || img.length > MAX_IMAGE_CHARS) {
        return Response.json({ error: 'Invalid page image.' }, { status: 400 });
      }
    }
    if (!images.length && text.trim().length < 30) {
      return Response.json({ error: 'The document had no readable content.' }, { status: 422 });
    }

    const content = [
      { type: 'text', text: buildPrompt(label, text) },
      ...images.map((url) => ({ type: 'image_url', image_url: { url } })),
    ];

    if (!process.env.GROQ_API_KEY) {
      return Response.json({ error: 'Document analysis failed: GROQ_API_KEY is not set on the server.' }, { status: 500 });
    }

    const baseRequest = {
      messages: [{ role: 'user', content }],
      temperature: 0.1,
      max_completion_tokens: 2500,
    };

    // Try the model that worked before first, then the others.
    const order = workingModel
      ? [workingModel, ...VISION_MODELS.filter((m) => m !== workingModel)]
      : VISION_MODELS;

    let response;
    let lastError = '';

    outer: for (const model of order) {
      for (const options of OPTION_SETS) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          response = await groq.chat.completions.create({ ...baseRequest, ...options, model } as any);
          workingModel = model;
          break outer;
        } catch (err) {
          const { status, message } = errorInfo(err);
          lastError = `${model}: ${message}${status ? ` (HTTP ${status})` : ''}`;
          console.error('Document analyze: Groq call failed ->', lastError);
          if (status === 429) {
            return Response.json({ error: 'The AI service is busy. Please wait a moment and try again.' }, { status: 429 });
          }
          if (status === 401 || status === 403) break outer; // key problem: other models will not help
          if (looksLikeModelProblem(status, message)) continue outer; // try the next model
          // otherwise try the next option set on the same model
        }
      }
    }

    if (!response) {
      return Response.json(
        { error: `Document analysis failed: ${lastError || 'the AI service did not respond.'}` },
        { status: 502 }
      );
    }

    const raw = (response.choices?.[0]?.message?.content || '')
      .replace(/<think>[\s\S]*?<\/think>/gi, '')
      .trim();
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) {
      console.error('Document analyze: no JSON in model output:', raw.slice(0, 500));
      return Response.json({ error: 'The document could not be interpreted. Please try again.' }, { status: 502 });
    }

    let parsed;
    try {
      parsed = JSON.parse(match[0]);
    } catch (e) {
      console.error('Document analyze: bad JSON:', raw.slice(0, 500), e);
      return Response.json({ error: 'The document could not be interpreted. Please try again.' }, { status: 502 });
    }

    return Response.json({ extraction: normalizeExtraction(parsed) });
  } catch (error) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const status = (error as any)?.status;
    console.error('Document analyze error:', error);
    if (status === 429) {
      return Response.json({ error: 'The AI service is busy. Please wait a moment and try again.' }, { status: 429 });
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const msg = String((error as any)?.message || '').replace(/\s+/g, ' ').slice(0, 160);
    return Response.json(
      { error: `Document analysis failed${msg ? `: ${msg}` : '. Please try again.'}` },
      { status: 500 }
    );
  }
}