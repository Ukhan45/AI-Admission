// lib/pakistanVerification.ts
// Curated guide: where and how a Pakistani applicant verifies each document
// (Board, IBCC, HEC, NADRA, MOFA, embassy). Pure data + helpers, no UI.
//
// Facts below were last reviewed in November 2026. Procedures and fees change,
// so the UI always tells the user to confirm on the official portals.

export type Level = 'BS' | 'MS';

export const GUIDE_LAST_REVIEWED = 'November 2026';

export type GuideLink = { label: string; url: string };

export type ChainStep = {
  authority: string;   // who
  action: string;      // what to do there
  optional?: boolean;  // only needed in some cases
  links?: GuideLink[];
};

export type Chain = {
  id: string;
  title: string;
  icon: string;
  docKeys: string[];   // documents this chain applies to
  steps: ChainStep[];
  tips: string[];
};

// ── Official links ───────────────────────────────────────────────────────────
const L = {
  ibccPortal: { label: 'IBCC attestation portal', url: 'https://attest.ibcc.edu.pk/' },
  ibccRules:  { label: 'IBCC attestation rules', url: 'https://ibcc.edu.pk/attestation/rules-for-attestation/' },
  hec:        { label: 'HEC Degree Attestation System', url: 'https://www.hec.gov.pk/english/services/students/DAS' },
  mofa:       { label: 'MOFA attestation / apostille', url: 'https://mofa.gov.pk' },
  hcch:       { label: 'Apostille member list (HCCH)', url: 'https://www.hcch.net/en/instruments/conventions/status-table/?cid=41' },
  nadra:      { label: 'NADRA', url: 'https://www.nadra.gov.pk' },
};

// Shared steps used by several chains
const MOFA_STEP: ChainStep = {
  authority: 'MOFA (Ministry of Foreign Affairs)',
  action:
    'Register on the MOFA online attestation portal (digital system live since 12 October 2026) and upload your IBCC/HEC-attested document. After your documents are approved, book your appointment, pay the fee online and receive your e-Certificate by email. Choose "Apostille" if your destination accepts it (see the notice above), otherwise choose ordinary attestation. Apostille is Rs 3,000 per educational document; ordinary attestation only needs a small revenue-stamp fee (fees as published in November 2026, confirm on the portal).',
  links: [L.mofa, L.hcch],
};

const EMBASSY_STEP: ChainStep = {
  authority: 'Destination embassy in Islamabad',
  action:
    'Only if your destination does NOT accept apostille (a non-member country, or a country that objected to Pakistan joining the Apostille Convention). After ordinary MOFA attestation, submit the document to that country\'s embassy or consulate for legalisation. Check its website for fees, appointments and accepted documents.',
  optional: true,
};

// ── Verification chains ──────────────────────────────────────────────────────
export const CHAINS: Chain[] = [
  {
    id: 'school',
    title: 'Matric (SSC) & Intermediate (HSSC) documents',
    icon: '📘',
    docKeys: ['matric_marksheet', 'matric_certificate', 'intermediate_marksheet', 'intermediate_certificate'],
    steps: [
      {
        authority: 'Your education Board (BISE)',
        action:
          'Get your certificates and marksheets verified by the Board that issued them. For Boards connected to the IBCC portal, the verification is available online. Print it and keep it with your originals.',
      },
      {
        authority: 'IBCC (Inter Board Committee of Chairmen)',
        action:
          'Apply on the IBCC attestation portal (choose appointment, courier or express). Attest your Matric (SSC) first: to attest your Intermediate (HSSC) you must also present your SSC. IBCC has announced fully online attestation from 1 January 2027 for eligible certificates from 29 Boards, so check the portal for the method that applies on your date.',
        links: [L.ibccPortal, L.ibccRules],
      },
      MOFA_STEP,
      EMBASSY_STEP,
    ],
    tips: [
      'Your name, father\'s name and date of birth must match your CNIC / B-Form on every document.',
      'IBCC states that its online attestation does not expire, so you do not need to repeat it for each application.',
      'O/A Level students: you also need an IBCC Equivalence Certificate (IBCC can attest it), and Cambridge / British Council verification may be requested.',
    ],
  },
  {
    id: 'degree',
    title: 'Degree certificate & transcripts',
    icon: '🎓',
    docKeys: ['degree', 'transcript'],
    steps: [
      {
        authority: 'Your university (Controller of Examinations)',
        action:
          'Ask the Controller of Examinations to verify your transcript (and degree) if needed. HEC can attest a transcript before the degree is issued if the Controller has verified it. If you have not finished your studies, the transcript must clearly say so, for example "degree in progress".',
      },
      {
        authority: 'HEC (Higher Education Commission)',
        action:
          'Apply on the HEC e-Services portal (Degree Attestation System). Since 11 May 2026 it is 100% online and paperless: no office visit and no original documents. Upload your CNIC (front and back) and scans, pay Rs 3,000 per document (degree, transcript, provisional certificate or HEC equivalence letter) through 1-Link, and download your e-Attestation Certificate.',
        links: [L.hec],
      },
      MOFA_STEP,
      EMBASSY_STEP,
    ],
    tips: [
      'The name and details on your degree and transcript must exactly match your CNIC / passport, otherwise HEC will not start the process.',
      'Most universities ask for both the degree and the transcript, so attest both.',
      'Foreign qualification? Get an HEC Equivalence Certificate first; HEC attests equivalence letters too.',
    ],
  },
  {
    id: 'birth',
    title: 'Birth certificate',
    icon: '👶',
    docKeys: ['birth_certificate'],
    steps: [
      {
        authority: 'NADRA / local registrar',
        action: 'Obtain a computerised Birth Registration Certificate (or B-Form) from NADRA or your local registrar.',
        links: [L.nadra],
      },
      MOFA_STEP,
      EMBASSY_STEP,
    ],
    tips: ['If the document is in Urdu, you may need a certified English translation.'],
  },
  {
    id: 'police',
    title: 'Police clearance certificate',
    icon: '🚔',
    docKeys: ['police_clearance'],
    steps: [
      {
        authority: 'Police authority of your district / province',
        action:
          'Apply for a Police Character Certificate. Ask the issuing office whether a provincial Home Department stamp is required before MOFA.',
      },
      MOFA_STEP,
      EMBASSY_STEP,
    ],
    tips: ['Police certificates are often accepted for only a few months. Apply close to your visa appointment and check the embassy\'s rule.'],
  },
  {
    id: 'experience',
    title: 'Work experience certificate',
    icon: '💼',
    docKeys: ['experience'],
    steps: [
      {
        authority: 'Your employer',
        action:
          'Get a letter on company letterhead with your job title, main duties, joining and leaving dates, signed and stamped by HR.',
      },
      {
        authority: 'Notary Public',
        action: 'Have the letter notarised, only if the university or embassy asks for it.',
        optional: true,
      },
      { ...MOFA_STEP, authority: 'MOFA (only if requested)', optional: true },
    ],
    tips: ['Most universities accept an employer letter without government attestation. Add attestation only when they ask.'],
  },
];

// ── Documents that need no Pakistani government attestation ─────────────────
export const PREPARE_TIPS: Record<string, string> = {
  cv: 'No attestation needed. Keep it to 1–2 pages (Europass format for EU universities), up to date and consistent with your other documents.',
  sop: 'No attestation needed. Write a different Statement of Purpose for each university and keep it within the word limit.',
  lor1: 'No attestation needed. It should be on official letterhead, signed and stamped by the recommender, with their contact details.',
  lor2: 'No attestation needed. Use a different referee from your first letter, ideally a teacher or supervisor who knows your work.',
  lor3: 'No attestation needed. Only submit it if the university asks for a third letter.',
  ielts: 'No attestation needed. Upload your Test Report Form and confirm that your university accepts it and that it is still valid.',
  portfolio: 'No attestation needed. Only required for art, design and architecture programs; follow the university\'s format.',
  passport: 'No attestation needed. Use a clear colour scan of the bio page and check that it stays valid well beyond your intended stay (many embassies ask for 6+ months).',
  visa_form: 'No attestation needed. Fill it in using the embassy\'s latest form and make sure every detail matches your passport.',
  acceptance_letter: 'No attestation needed. Keep the original admission letter safe; the embassy checks it against the university.',
  financial_proof: 'No attestation needed in Pakistan, but the embassy has strict rules about the accepted proof and the amount (for example, a blocked account for Germany). Check the embassy checklist.',
  health_insurance: 'No attestation needed. The policy must meet the destination country\'s minimum cover and cover your full stay.',
  accommodation_proof: 'No attestation needed. Use a rental contract or a university housing confirmation.',
  medical_certificate: 'Not attested in Pakistan. It must be issued by a doctor or clinic approved by the destination embassy.',
  visa_fee: 'No attestation needed. Keep the payment receipt with your application.',
};

// ── Labels ───────────────────────────────────────────────────────────────────
export const DOC_LABELS: Record<string, string> = {
  transcript: '📄 Academic Transcripts',
  matric_marksheet: '📘 Matriculation Marksheet',
  matric_certificate: '📗 Matriculation Certificate',
  intermediate_marksheet: '📘 Intermediate / HSC Marksheet',
  intermediate_certificate: '📗 Intermediate / HSC Certificate',
  degree: '🎓 Degree Certificate',
  cv: '📋 CV / Resume',
  sop: '✍️ Statement of Purpose',
  lor1: '📧 Letter of Recommendation 1',
  lor2: '📧 Letter of Recommendation 2',
  lor3: '📧 Letter of Recommendation 3',
  ielts: '📝 IELTS / TOEFL Scores',
  portfolio: '🎨 Portfolio (if required)',
  experience: '💼 Work Experience Certificate',
  passport: '🛂 Passport',
  visa_form: '📋 Visa Application Form',
  acceptance_letter: '📨 University Acceptance Letter',
  financial_proof: '💰 Financial Proof',
  health_insurance: '🏥 Health Insurance',
  accommodation_proof: '🏠 Accommodation Proof',
  police_clearance: '🚔 Police Clearance Certificate',
  medical_certificate: '⚕️ Medical Certificate',
  birth_certificate: '👶 Birth Certificate',
  visa_fee: '💳 Visa Fee Payment Receipt',
};

// Label without the leading emoji (used when sending to the AI)
export const plainLabel = (key: string) =>
  (DOC_LABELS[key] ?? key).replace(/^[^\p{L}\p{N}]+/u, '').trim();

// ── What each level needs ────────────────────────────────────────────────────
export const ACADEMIC_DOCS: Record<Level, string[]> = {
  BS: [
    'matric_marksheet', 'matric_certificate',
    'intermediate_marksheet', 'intermediate_certificate',
    'ielts', 'cv', 'sop', 'lor1', 'lor2', 'portfolio', 'experience',
  ],
  MS: [
    'transcript', 'degree',
    'matric_marksheet', 'matric_certificate',
    'intermediate_marksheet', 'intermediate_certificate',
    'cv', 'sop', 'lor1', 'lor2', 'lor3', 'ielts', 'portfolio', 'experience',
  ],
};

export const VISA_DOCS = [
  'passport', 'birth_certificate', 'police_clearance', 'medical_certificate',
  'visa_form', 'acceptance_letter', 'financial_proof', 'health_insurance',
  'accommodation_proof', 'visa_fee',
];

// Core documents most programs expect at each level
export const CORE_DOCS: Record<Level, string[]> = {
  BS: ['matric_marksheet', 'matric_certificate', 'intermediate_marksheet', 'intermediate_certificate', 'ielts', 'cv', 'sop'],
  MS: ['transcript', 'degree', 'cv', 'sop', 'lor1', 'lor2', 'ielts'],
};

export const LEVEL_INFO: Record<Level, { title: string; headline: string }> = {
  BS: {
    title: "Bachelor's (BS)",
    headline:
      'For a Bachelor\'s application your Matric and Intermediate (or A-Level) documents are the core of your file. Start with your Board, then IBCC, then MOFA.',
  },
  MS: {
    title: "Master's (MS)",
    headline:
      'For a Master\'s application your Bachelor\'s degree and transcripts are the core of your file. Start with HEC, then MOFA. Matric and Intermediate documents are often requested too and go through Board → IBCC → MOFA.',
  },
};

// ── Apostille vs embassy legalisation, by destination country ───────────────
// Germany, Austria, Greece, the Netherlands, Czechia, Denmark, Finland and
// Poland objected to Pakistan joining the Apostille Convention (HCCH records),
// so apostille does not apply between Pakistan and them.
const OBJECTING = [
  'germany', 'deutschland', 'austria', 'greece', 'netherlands', 'holland',
  'czech', 'denmark', 'finland', 'poland',
];

// Common destinations that are Apostille Convention members and did not object
const APOSTILLE_OK = [
  'united states', 'usa', 'u.s.', 'america', 'united kingdom', 'uk', 'england',
  'scotland', 'wales', 'britain', 'canada', 'australia', 'new zealand', 'france',
  'italy', 'spain', 'portugal', 'sweden', 'norway', 'switzerland', 'ireland',
  'belgium', 'luxembourg', 'hungary', 'turkey', 'türkiye', 'turkiye', 'china',
  'japan', 'south korea', 'korea', 'russia', 'saudi', 'cyprus', 'malta',
  'lithuania', 'latvia', 'estonia', 'romania', 'slovakia', 'slovenia',
  'croatia', 'bulgaria',
];

export type LegalisationAdvice = {
  mode: 'apostille' | 'embassy' | 'check';
  title: string;
  detail: string;
};

export function legalisationAdvice(countryInput: string): LegalisationAdvice {
  const country = countryInput.trim();
  const c = country.toLowerCase();

  if (OBJECTING.some((n) => c.includes(n))) {
    return {
      mode: 'embassy',
      title: `Apostille does not apply between Pakistan and ${country}`,
      detail:
        `${country} objected to Pakistan joining the Apostille Convention, so a MOFA apostille is not valid there. Use ordinary MOFA attestation and then, if required, legalisation by the ${country} embassy in Islamabad. MOFA's new online portal has been reported to handle some of these countries inconsistently, so confirm the current process with MOFA and the embassy before you apply. Also ask your university whether certified copies are enough when you apply and when attested documents are needed.`,
    };
  }

  if (APOSTILLE_OK.some((n) => c.includes(n))) {
    return {
      mode: 'apostille',
      title: `Apostille is accepted for ${country}`,
      detail:
        `Pakistan has been a member of the Apostille Convention since 9 March 2023 and ${country} is a member, so after IBCC / HEC attestation you can choose "Apostille" at MOFA. Embassy legalisation is normally not needed. Always confirm with your university or embassy.`,
    };
  }

  return {
    mode: 'check',
    title: `Check whether ${country || 'your destination'} accepts apostille`,
    detail:
      `Look up ${country || 'your destination'} in the Apostille member list. If it is a member and did not object to Pakistan, choose "Apostille" at MOFA. If not, choose ordinary attestation at MOFA and then legalise at that country's embassy. Confirm the final requirement with the embassy.`,
  };
}

// ── Roadmap builder ──────────────────────────────────────────────────────────
export type RoadmapGroup = {
  chain: Chain;
  docs: { key: string; uploaded: boolean }[];
};

export type RoadmapResult = {
  groups: RoadmapGroup[];
  prepare: { key: string; tip: string }[];  // uploaded docs with no attestation
  coreMissing: string[];                    // core document keys not uploaded
};

export function buildRoadmap(level: Level, uploaded: string[]): RoadmapResult {
  const inScope = new Set([...ACADEMIC_DOCS[level], ...VISA_DOCS]);
  const core = CORE_DOCS[level];
  const uploadedSet = new Set(uploaded);

  const groups: RoadmapGroup[] = [];
  for (const chain of CHAINS) {
    const docs = chain.docKeys
      .filter((k) => inScope.has(k))
      .map((k) => ({ key: k, uploaded: uploadedSet.has(k) }));
    const relevant = docs.some((d) => d.uploaded) || docs.some((d) => core.includes(d.key));
    if (docs.length && relevant) groups.push({ chain, docs });
  }

  // Put the chain that matters most for this level first
  const firstId = level === 'BS' ? 'school' : 'degree';
  groups.sort((a, b) => (a.chain.id === firstId ? -1 : b.chain.id === firstId ? 1 : 0));

  const chained = new Set(CHAINS.flatMap((c) => c.docKeys));
  const prepare = uploaded
    .filter((k) => !chained.has(k) && PREPARE_TIPS[k])
    .map((k) => ({ key: k, tip: PREPARE_TIPS[k] }));

  return {
    groups,
    prepare,
    coreMissing: core.filter((k) => !uploadedSet.has(k)),
  };
}