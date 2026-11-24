// lib/documentAnalysis.ts
// Shared by the browser and the API routes.
//  1. Types + a defensive normaliser for what the AI "reads" from a document.
//  2. A deterministic rules engine that compares what was found against what the
//     Pakistani verification chain requires (Board → IBCC / HEC → MOFA → embassy).
//
// The AI only reports what is visible on the pages. Whether a document is
// "good" or "needs work" is decided here, in code, so results are consistent.

import {
  type Level,
  type LegalisationAdvice,
  DOC_LABELS,
  plainLabel,
} from '@/lib/pakistanVerification';

// ── Types ────────────────────────────────────────────────────────────────────
export type Mark = { found: boolean; evidence: string | null };
export type MofaMark = Mark & { kind: 'apostille' | 'attestation' | null };

export type Extraction = {
  readable: boolean;
  documentType: string | null;
  matchesSlot: boolean;
  holderName: string | null;
  fatherName: string | null;
  issuer: string | null;
  program: string | null;
  year: string | null;        // date / session / year of issue
  result: string | null;      // grade, CGPA, percentage, band score
  expiryDate: string | null;
  marks: {
    boardVerification: Mark;
    universityVerification: Mark;
    ibcc: Mark;
    hec: Mark;
    mofa: MofaMark;
    embassy: Mark;
    signatureOrSeal: Mark;
  };
  issues: string[];
};

export type CheckStatus = 'pass' | 'warn' | 'fail' | 'info';
export type Check = { label: string; status: CheckStatus; detail: string };

export type Finding = {
  key: string;
  label: string;
  state: 'good' | 'attention' | 'problem';
  extraction: Extraction | null;
  checks: Check[];
  next: string[];
};

// ── Normaliser (never trust raw model output) ────────────────────────────────
const str = (v: unknown, max = 160): string | null => {
  if (typeof v !== 'string') return null;
  const t = v.replace(/\s+/g, ' ').trim();
  if (!t || /^(null|none|n\/a|unknown|not (found|visible|present))$/i.test(t)) return null;
  return t.slice(0, max);
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mark = (v: any): Mark => ({
  found: v?.found === true,
  evidence: v?.found === true ? str(v?.evidence, 140) : null,
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function normalizeExtraction(raw: any): Extraction {
  const m = raw?.marks ?? {};
  const mofa = mark(m.mofa);
  const kindRaw = String(m?.mofa?.kind ?? '').toLowerCase();
  const kind: MofaMark['kind'] = !mofa.found
    ? null
    : kindRaw.includes('apostille')
    ? 'apostille'
    : kindRaw.includes('attest')
    ? 'attestation'
    : null;

  return {
    readable: raw?.readable !== false,
    documentType: str(raw?.documentType),
    matchesSlot: raw?.matchesSlot !== false,
    holderName: str(raw?.holderName, 80),
    fatherName: str(raw?.fatherName, 80),
    issuer: str(raw?.issuer),
    program: str(raw?.program),
    year: str(raw?.year, 40),
    result: str(raw?.result, 60),
    expiryDate: str(raw?.expiryDate, 40),
    marks: {
      boardVerification: mark(m.boardVerification),
      universityVerification: mark(m.universityVerification),
      ibcc: mark(m.ibcc),
      hec: mark(m.hec),
      mofa: { ...mofa, kind },
      embassy: mark(m.embassy),
      signatureOrSeal: mark(m.signatureOrSeal),
    },
    issues: Array.isArray(raw?.issues)
      ? raw.issues.map((i: unknown) => str(i, 140)).filter((i: string | null): i is string => !!i).slice(0, 5)
      : [],
  };
}

// ── Name comparison ──────────────────────────────────────────────────────────
const HONORIFICS = new Set(['mr', 'mrs', 'ms', 'miss', 'dr', 'prof', 'sir', 'syed', 'late']);

function tokens(name: string): string[] {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z\s]/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 1 && !HONORIFICS.has(t));
}

function sameName(a: string, b: string): boolean {
  const ta = tokens(a);
  const tb = tokens(b);
  if (!ta.length || !tb.length) return true; // nothing to compare
  const setB = new Set(tb);
  const inter = ta.filter((t) => setB.has(t)).length;
  const min = Math.min(ta.length, tb.length);
  if (min === 1) return inter === 1;
  return inter >= 2 && inter / min >= 0.75;
}

// Picks the name most documents agree on (or the saved profile name).
function referenceName(names: string[], profileName?: string): string | null {
  if (profileName && tokens(profileName).length >= 2) return profileName;
  if (names.length < 2) return null;
  let best = names[0];
  let bestScore = -1;
  for (const n of names) {
    const score = names.filter((o) => sameName(n, o)).length;
    if (score > bestScore) {
      best = n;
      bestScore = score;
    }
  }
  return best;
}

// ── Date helpers ─────────────────────────────────────────────────────────────
function parseLooseDate(s: string | null): Date | null {
  if (!s) return null;
  const t = Date.parse(s);
  if (!Number.isNaN(t)) return new Date(t);
  const y = s.match(/(19|20)\d{2}/);
  return y ? new Date(Number(y[0]), 6, 1) : null;
}

const monthsBetween = (a: Date, b: Date) =>
  (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth());

// ── Required verification chain per document ────────────────────────────────
type Stage = 'board' | 'ibcc' | 'hec' | 'mofa' | 'embassy';

const SCHOOL = ['matric_marksheet', 'matric_certificate', 'intermediate_marksheet', 'intermediate_certificate'];
const DEGREE = ['degree', 'transcript'];
const VISA_CHAIN = ['birth_certificate', 'police_clearance'];

function requiredStages(key: string, legal: LegalisationAdvice): Stage[] {
  let stages: Stage[] = [];
  if (SCHOOL.includes(key)) stages = ['board', 'ibcc', 'mofa'];
  else if (DEGREE.includes(key)) stages = ['hec', 'mofa'];
  else if (VISA_CHAIN.includes(key)) stages = ['mofa'];
  if (stages.length && legal.mode === 'embassy') stages.push('embassy');
  return stages;
}

const NEXT_STEP: Record<Stage, (legal: LegalisationAdvice) => string> = {
  board: () => 'Get this document verified by the education Board that issued it, then attest it with IBCC.',
  ibcc: () =>
    'Apply for IBCC attestation on attest.ibcc.edu.pk (attest your Matric before your Intermediate), then add the attested page or QR certificate to this PDF.',
  hec: () =>
    'Apply for HEC e-Attestation on the HEC e-Services portal (Rs 3,000 per document), then add the e-Attestation Certificate page to this PDF.',
  mofa: (legal) =>
    legal.mode === 'embassy'
      ? 'Get ordinary MOFA attestation on the MOFA online attestation portal (apostille is not valid for this country), then add the e-Certificate to this PDF.'
      : 'Get the MOFA Apostille on the MOFA online attestation portal, then add the e-Certificate to this PDF.',
  embassy: () =>
    'After MOFA attestation, take the document to the destination country\'s embassy in Islamabad for legalisation.',
};

// ── Evaluate every uploaded document ────────────────────────────────────────
export type EvalInput = {
  level: Level;
  legal: LegalisationAdvice;
  uploaded: string[];
  extractions: Record<string, Extraction | undefined>;
  failures: Record<string, string | undefined>; // key -> reason it could not be read
  profileName?: string;
  now?: Date;
};

export function evaluateAll(input: EvalInput): Finding[] {
  const { legal, uploaded, extractions, failures, profileName } = input;
  const now = input.now ?? new Date();

  // Cross-document identity checks
  const named = uploaded.filter((k) => extractions[k]?.holderName);
  const names = named.map((k) => extractions[k]!.holderName as string);
  const refName = referenceName(names, profileName);

  const fathered = uploaded.filter((k) => extractions[k]?.fatherName);
  const fathers = fathered.map((k) => extractions[k]!.fatherName as string);
  const refFather = referenceName(fathers);

  return uploaded.map((key): Finding => {
    const label = plainLabel(key);
    const ex = extractions[key] ?? null;
    const checks: Check[] = [];
    const next: string[] = [];

    // Could not be read at all
    if (!ex) {
      return {
        key,
        label,
        state: 'problem',
        extraction: null,
        checks: [
          {
            label: 'Reading the file',
            status: 'fail',
            detail: failures[key] || 'We could not read this file. Upload a clearer or smaller PDF.',
          },
        ],
        next: ['Re-upload this document as a clear PDF (scan at 200 dpi or higher, all pages in one file).'],
      };
    }

    // 1. Readability
    if (!ex.readable) {
      checks.push({
        label: 'Readable',
        status: 'fail',
        detail: 'The scan is too blurry or dark to read reliably.',
      });
      next.push('Re-scan this document in good light, flat, with all edges visible, and upload it again.');
    }

    // 2. Right document in the right slot
    if (!ex.matchesSlot) {
      checks.push({
        label: 'Correct document',
        status: 'fail',
        detail: `This looks like "${ex.documentType ?? 'a different document'}", not "${label}".`,
      });
      next.push(`Upload the correct file in the "${label}" box.`);
    } else if (ex.documentType) {
      checks.push({ label: 'Correct document', status: 'pass', detail: `Recognised as: ${ex.documentType}.` });
    }

    // 3. Identity
    if (ex.holderName && refName) {
      if (sameName(ex.holderName, refName)) {
        checks.push({ label: 'Name', status: 'pass', detail: `Name on the document: ${ex.holderName}.` });
      } else {
        checks.push({
          label: 'Name',
          status: 'fail',
          detail: `The name here ("${ex.holderName}") does not match "${refName}" on your other documents.`,
        });
        next.push(
          'Names must be identical on every document and your CNIC / passport. Ask the Board or university to correct it before attesting.'
        );
      }
    } else if (ex.holderName) {
      checks.push({ label: 'Name', status: 'info', detail: `Name on the document: ${ex.holderName}.` });
    }

    if (ex.fatherName && refFather && !sameName(ex.fatherName, refFather)) {
      checks.push({
        label: "Father's name",
        status: 'warn',
        detail: `Father's name here ("${ex.fatherName}") differs from "${refFather}" on other documents.`,
      });
    }

    // 4. Verification chain
    const stages = requiredStages(key, legal);
    const m = ex.marks;

    for (const stage of stages) {
      if (stage === 'board') {
        if (m.boardVerification.found) {
          checks.push({ label: 'Board verification', status: 'pass', detail: m.boardVerification.evidence || 'Board verification found.' });
        } else if (m.ibcc.found) {
          checks.push({ label: 'Board verification', status: 'info', detail: 'Not visible, but IBCC attestation means the Board already verified it.' });
        } else {
          checks.push({ label: 'Board verification', status: 'fail', detail: 'No Board verification found.' });
          next.push(NEXT_STEP.board(legal));
        }
      }

      if (stage === 'ibcc') {
        if (m.ibcc.found) {
          checks.push({ label: 'IBCC attestation', status: 'pass', detail: m.ibcc.evidence || 'IBCC attestation found.' });
        } else {
          checks.push({ label: 'IBCC attestation', status: 'fail', detail: 'No IBCC attestation found.' });
          next.push(NEXT_STEP.ibcc(legal));
        }
      }

      if (stage === 'hec') {
        if (m.hec.found) {
          checks.push({ label: 'HEC attestation', status: 'pass', detail: m.hec.evidence || 'HEC attestation found.' });
        } else {
          checks.push({ label: 'HEC attestation', status: 'fail', detail: 'No HEC attestation found.' });
          next.push(NEXT_STEP.hec(legal));
        }
      }

      if (stage === 'mofa') {
        if (!m.mofa.found) {
          const earlierMissing =
            (SCHOOL.includes(key) && !m.ibcc.found) || (DEGREE.includes(key) && !m.hec.found);
          const needed = VISA_CHAIN.includes(key) ? 'warn' : 'fail';
          checks.push({
            label: legal.mode === 'embassy' ? 'MOFA attestation' : 'MOFA apostille / attestation',
            status: needed,
            detail: earlierMissing
              ? 'Not found yet. MOFA only accepts documents that are already IBCC / HEC attested.'
              : 'No MOFA apostille or attestation found.',
          });
          if (!earlierMissing) next.push(NEXT_STEP.mofa(legal));
        } else if (legal.mode === 'embassy' && m.mofa.kind === 'apostille') {
          checks.push({
            label: 'MOFA apostille',
            status: 'fail',
            detail: `An apostille was found, but it is not valid for ${legalCountry(legal)}. This country needs ordinary MOFA attestation plus embassy legalisation.`,
          });
          next.push(NEXT_STEP.mofa(legal));
        } else if (legal.mode === 'apostille' && m.mofa.kind === 'attestation') {
          checks.push({
            label: 'MOFA attestation',
            status: 'warn',
            detail: 'Ordinary MOFA attestation found, but an apostille is what this country accepts.',
          });
          next.push(NEXT_STEP.mofa(legal));
        } else {
          checks.push({
            label: m.mofa.kind === 'apostille' ? 'MOFA apostille' : 'MOFA attestation',
            status: 'pass',
            detail: m.mofa.evidence || 'MOFA apostille / attestation found.',
          });
        }
      }

      if (stage === 'embassy') {
        if (m.embassy.found) {
          checks.push({ label: 'Embassy legalisation', status: 'pass', detail: m.embassy.evidence || 'Embassy legalisation found.' });
        } else {
          checks.push({
            label: 'Embassy legalisation',
            status: 'warn',
            detail: 'Not found. Needed for this country unless your university or embassy says otherwise.',
          });
          next.push(NEXT_STEP.embassy(legal));
        }
      }
    }

    // 5. Document-specific checks
    if (key === 'experience' && m.mofa.found) {
      checks.push({ label: 'MOFA attestation', status: 'pass', detail: m.mofa.evidence || 'MOFA stamp found.' });
    }

    if (['lor1', 'lor2', 'lor3', 'experience', 'acceptance_letter'].includes(key)) {
      checks.push(
        m.signatureOrSeal.found
          ? { label: 'Signature / official stamp', status: 'pass', detail: m.signatureOrSeal.evidence || 'Signature or stamp found.' }
          : {
              label: 'Signature / official stamp',
              status: 'warn',
              detail: 'No signature or official stamp found. This letter should be signed and, ideally, stamped on letterhead.',
            }
      );
      if (!m.signatureOrSeal.found) next.push('Get this letter signed and stamped on official letterhead, then re-scan it.');
    }

    if (key === 'ielts') {
      if (ex.result) checks.push({ label: 'Score', status: 'info', detail: `Result found: ${ex.result}.` });
      const issued = parseLooseDate(ex.year);
      if (issued && monthsBetween(issued, now) > 24) {
        checks.push({ label: 'Validity', status: 'warn', detail: 'This result looks more than two years old. Most universities do not accept older results.' });
        next.push('Check whether your university accepts this test date, or book a new test.');
      }
    }

    if (key === 'passport') {
      const expiry = parseLooseDate(ex.expiryDate);
      if (expiry) {
        const left = monthsBetween(now, expiry);
        if (left < 0) {
          checks.push({ label: 'Validity', status: 'fail', detail: 'This passport appears to have expired.' });
          next.push('Renew your passport before applying.');
        } else if (left < 12) {
          checks.push({ label: 'Validity', status: 'warn', detail: `This passport expires in about ${left} month(s). Many embassies need 6+ months beyond your stay.` });
          next.push('Consider renewing your passport before your visa application.');
        } else {
          checks.push({ label: 'Validity', status: 'pass', detail: `Valid until ${ex.expiryDate}.` });
        }
      }
    }

    if (key === 'police_clearance') {
      const issued = parseLooseDate(ex.year);
      if (issued && monthsBetween(issued, now) > 6) {
        checks.push({ label: 'Freshness', status: 'warn', detail: 'Issued more than six months ago. Embassies often accept police certificates for only a few months.' });
        next.push('Check the embassy\'s validity rule and apply for a new certificate if needed.');
      }
    }

    if (DEGREE.includes(key) && key === 'transcript') {
      if (ex.issues.some((i) => /incomplete|in progress|provisional/i.test(i))) {
        checks.push({ label: 'Completeness', status: 'warn', detail: 'This transcript looks incomplete or marked "in progress". HEC attests it, but the status must be written on it.' });
      }
    }

    // 6. Problems the reader noticed
    for (const issue of ex.issues.slice(0, 3)) {
      checks.push({ label: 'Noticed', status: 'warn', detail: issue });
    }

    // 7. Summary of what the document contains
    if (!checks.length) {
      checks.push({ label: 'Reading the file', status: 'pass', detail: 'The document was read successfully.' });
    }

    const state: Finding['state'] = checks.some((c) => c.status === 'fail')
      ? 'problem'
      : checks.some((c) => c.status === 'warn')
      ? 'attention'
      : 'good';

    return { key, label, state, extraction: ex, checks, next: [...new Set(next)] };
  });
}

function legalCountry(legal: LegalisationAdvice): string {
  const m = legal.title.match(/between Pakistan and (.+)$/);
  return m ? m[1] : 'this country';
}

// ── Plain-text evidence summary, passed to the country-specific AI review ───
export function describeForReview(f: Finding): string {
  const ex = f.extraction;
  if (!ex) return `${f.label}: could not be read (${f.checks[0]?.detail ?? 'unreadable'}).`;
  const found: string[] = [];
  const notFound: string[] = [];
  const pairs: [string, boolean][] = [
    ['Board verification', ex.marks.boardVerification.found],
    ['IBCC attestation', ex.marks.ibcc.found],
    ['HEC attestation', ex.marks.hec.found],
    [`MOFA ${ex.marks.mofa.kind ?? 'stamp'}`, ex.marks.mofa.found],
    ['Embassy legalisation', ex.marks.embassy.found],
  ];
  for (const [name, ok] of pairs) (ok ? found : notFound).push(name);
  const bits = [
    ex.documentType && `type: ${ex.documentType}`,
    ex.holderName && `holder: ${ex.holderName}`,
    ex.issuer && `issuer: ${ex.issuer}`,
    ex.program && `program: ${ex.program}`,
    ex.year && `date: ${ex.year}`,
    ex.result && `result: ${ex.result}`,
  ].filter(Boolean);
  return `${f.label} — ${bits.join('; ') || 'details not visible'}. Marks FOUND: ${found.join(', ') || 'none'}. Marks NOT found: ${notFound.join(', ') || 'none'}. Rules-check state: ${f.state}.`;
}

export { DOC_LABELS };