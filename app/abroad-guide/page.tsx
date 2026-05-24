
'use client';

import { useState } from 'react';
import Link from 'next/link';

// ── Types ────────────────────────────────────────────────────────────────────
interface Step {
  icon: string;
  title: string;
  body: React.ReactNode;
  warn?: string;
  info?: string;
  good?: string;
}

interface Phase {
  number: string;
  title: string;
  subtitle: string;
  color: string;
  bg: string;
  steps: Step[];
}

// ── Data ─────────────────────────────────────────────────────────────────────
const PHASES: Phase[] = [
  {
    number: '1',
    title: 'Research & Decide',
    subtitle: 'Months 1–3 · The foundation of everything',
    color: '#1a6b45',
    bg: '#e8f5ee',
    steps: [
      {
        icon: '🎓',
        title: 'What degree level are you applying for?',
        body: (
          <div className="space-y-2 mt-2">
            {[
              ["Bachelor's", "Completed A-Levels or FSc. This is a 3–4 year undergraduate degree."],
              ["Master's", "Already have a bachelor's degree. Most common path for Pakistani graduates going abroad."],
              ["PhD", "Have a Master's and want to do original research. Usually comes with a university stipend."],
            ].map(([label, desc]) => (
              <div key={label} className="flex gap-3 bg-[#f5f5f0] rounded-lg px-3 py-2">
                <span className="font-bold text-[#1a6b45] text-sm w-24 shrink-0">{label}</span>
                <span className="text-sm text-gray-600">{desc}</span>
              </div>
            ))}
          </div>
        ),
      },
      {
        icon: '🎯',
        title: 'Choose your field — be specific',
        body: <p className="text-sm text-gray-600 mt-1">Vague field choices lead to bad program matches and weak applications. <span className="text-red-600 font-medium">"I want to study technology"</span> is not a program. <span className="text-[#1a6b45] font-medium">"MS Cyber Security"</span> or <span className="text-[#1a6b45] font-medium">"MSc Data Science with machine learning focus"</span> — this is the level of specificity you need before you open a single university website.</p>,
      },
      {
        icon: '🗺️',
        title: 'Choose your target country',
        body: (
          <div className="mt-2 overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-[#1a6b45] text-white">
                  {['Country','Tuition','Language','Visa','Post-Study Work'].map(h => (
                    <th key={h} className="px-2 py-2 text-left font-semibold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  ['Germany','Free (public)','German / some English','Moderate','18 months'],
                  ['UK','£15–25k/yr','English only','High for Pakistanis','2 years'],
                  ['Romania','€2–5k/yr','English programs','Low–Moderate','Limited'],
                  ['Canada','$15–35k/yr','English / French','High','3 years (PGWP)'],
                  ['China','Free (CSC scholarship)','Chinese / some English','Low','Limited'],
                  ['Hungary','€3–7k/yr','English programs','Low–Moderate','Limited'],
                  ['Turkey','Very low / Free','Turkish / some English','Low','Limited'],
                ].map((row, i) => (
                  <tr key={row[0]} className={i % 2 === 0 ? 'bg-white' : 'bg-[#f9f9f7]'}>
                    {row.map((cell, j) => (
                      <td key={j} className={`px-2 py-2 border border-gray-100 ${j === 0 ? 'font-medium text-gray-800' : 'text-gray-600'}`}>{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ),
        warn: 'Do not choose a country because YouTube made it sound easy. Check the Pakistani visa rejection rate for that embassy before committing.',
      },
      {
        icon: '🔍',
        title: 'Shortlist 5–8 universities',
        body: (
          <ul className="mt-2 space-y-1.5">
            {[
              ['Mastersportal.eu', 'Best for finding Master\'s programs across all of Europe'],
              ['UCAS.com', 'UK universities only'],
              ['University websites directly', 'Always read the specific program page, not just the homepage'],
              ['hec.gov.pk', 'ALWAYS check HEC recognized list before applying anywhere'],
            ].map(([tool, desc]) => (
              <li key={tool} className="flex gap-2 text-sm text-gray-600">
                <span className="text-[#1a6b45] mt-0.5">·</span>
                <span><span className="font-medium text-gray-800">{tool}</span> — {desc}</span>
              </li>
            ))}
          </ul>
        ),
        warn: 'ALWAYS verify the university is on the HEC recognized list at hec.gov.pk before you apply. A degree from an unrecognized university is useless for government jobs or further study in Pakistan.',
      },
    ],
  },
  {
    number: '2',
    title: 'Language & Entrance Tests',
    subtitle: 'Months 3–6 · Most students underestimate this phase',
    color: '#3a3a9e',
    bg: '#eeeefb',
    steps: [
      {
        icon: '🗣️',
        title: 'IELTS or TOEFL — non-negotiable',
        body: (
          <div className="mt-2 space-y-2">
            <p className="text-sm text-gray-600">Every English-medium university requires a standardised language test. Your bachelor's degree being in English does NOT exempt you. Universities will reject your application without a valid score.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
              {[
                ['Minimum Score', 'IELTS 6.5 overall, no band below 6.0'],
                ['Register At', 'idp.com/pakistan or britishcouncil.pk'],
                ['Cost', '~PKR 35,000–40,000 per attempt'],
                ['Valid For', '2 years from test date'],
                ['Prep Time', '2–3 months of daily practice to reach 6.5+'],
                ['First Step', 'Take a free practice test at ieltspractice.com'],
              ].map(([label, val]) => (
                <div key={label} className="bg-[#f5f5f0] rounded-lg px-3 py-2">
                  <div className="text-[10px] font-bold text-[#3a3a9e] uppercase tracking-wider">{label}</div>
                  <div className="text-sm text-gray-700 mt-0.5">{val}</div>
                </div>
              ))}
            </div>
          </div>
        ),
        warn: 'Book your IELTS at least 3 months before your earliest university application deadline. Tests get fully booked — especially in Lahore, Karachi, and Islamabad.',
      },
      {
        icon: '✏️',
        title: 'GRE — required mainly for USA',
        body: <p className="text-sm text-gray-600 mt-1">If applying to USA Master's or PhD programs, many require GRE. For Europe, it is rarely required. Always check the <span className="font-medium text-gray-800">specific program's admissions page</span> — not just the university homepage.</p>,
        info: 'Many US programs went test-optional after 2020. Always verify the current requirement on the specific program page.',
      },
      {
        icon: '📅',
        title: '8-week IELTS preparation plan',
        body: (
          <ol className="mt-2 space-y-2">
            {[
              'Week 1–2: Take a full practice test. Find your weakest band (Reading/Writing/Listening/Speaking). Focus all practice there first.',
              'Week 3–4: Daily Reading and Listening practice with timed tests. These improve fastest.',
              'Week 5–6: Focus on Writing Task 1 and Task 2. Study the band descriptors. Write at least 2 full essays per week.',
              'Week 7: Full mock tests under exam conditions. Time yourself strictly.',
              'Week 8: Light revision, Speaking practice with a partner, rest before test day.',
            ].map((step, i) => (
              <li key={i} className="flex gap-3 text-sm text-gray-600">
                <span className="w-6 h-6 rounded-full bg-[#3a3a9e] text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">{i + 1}</span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        ),
      },
    ],
  },
  {
    number: '3',
    title: 'Prepare Your Documents',
    subtitle: 'Months 5–8 · Start attestation before you apply',
    color: '#8a5a0a',
    bg: '#fdf3e0',
    steps: [
      {
        icon: '📄',
        title: 'Documents every university requires',
        body: (
          <ul className="mt-2 space-y-1.5">
            {[
              'Degree certificate — attested copy (must be officially attested, not just photocopied)',
              'Official transcripts — sealed in envelope with registrar\'s signature',
              'HEC Equivalence Certificate — apply at hec.gov.pk immediately, takes 4–8 weeks',
              'Valid IELTS or TOEFL certificate',
              'Valid Pakistani passport — minimum 18 months validity beyond your graduation date',
              'CNIC copy',
              'Passport-size photographs as per each university\'s specifications',
            ].map((item, i) => (
              <li key={i} className="flex gap-2 text-sm text-gray-600">
                <span className="text-[#8a5a0a] mt-0.5 shrink-0">☐</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        ),
        warn: 'HEC Equivalence is the most time-consuming document. Apply for it the moment you decide to study abroad — do not wait until you have an offer.',
      },
      {
        icon: '✍️',
        title: 'Documents you write — these carry the most weight',
        body: (
          <div className="mt-2 space-y-3">
            {[
              { name: 'Statement of Purpose (SOP)', desc: 'A 550–700 word essay per university explaining your background, achievements, why this university specifically, and your career goal. Never send the same SOP to every university.' },
              { name: 'Academic CV / Resume', desc: '1–2 pages. Include: education (with CGPA), relevant coursework, research projects, internships, awards, and leadership roles. Academic CVs in Europe should NOT include a photo or date of birth.' },
              { name: 'Letters of Recommendation (LORs)', desc: 'Most universities need 2–3 reference letters from professors or employers. Ask at least 4–6 weeks before the deadline. Give them your CV and SOP so they can write something specific.' },
            ].map(({ name, desc }) => (
              <div key={name} className="bg-[#f9f9f7] border border-gray-100 rounded-lg px-3 py-2.5">
                <div className="font-medium text-gray-800 text-sm">{name}</div>
                <div className="text-sm text-gray-600 mt-1">{desc}</div>
              </div>
            ))}
          </div>
        ),
      },
      {
        icon: '🔏',
        title: 'Pakistani document attestation chain — follow this order exactly',
        body: (
          <div className="mt-2 space-y-2">
            {[
              ['Step 1', 'University Registrar', 'Your university attests the document first'],
              ['Step 2', 'HEC Attestation', 'Offices in Islamabad, Lahore, or Karachi'],
              ['Step 3', 'MOFA Attestation', 'Ministry of Foreign Affairs, Islamabad'],
              ['Step 4', 'Embassy Attestation', 'Target country\'s embassy in Pakistan (required by some countries, not all)'],
            ].map(([step, label, desc]) => (
              <div key={step} className="flex gap-3 items-start">
                <div className="w-16 shrink-0 bg-[#8a5a0a] text-white text-xs font-bold rounded px-2 py-1 text-center">{step}</div>
                <div>
                  <div className="text-sm font-medium text-gray-800">{label}</div>
                  <div className="text-xs text-gray-600">{desc}</div>
                </div>
              </div>
            ))}
          </div>
        ),
        warn: 'This full chain takes 6–10 weeks. Start it before you even apply to universities. Do not wait for an offer.',
      },
    ],
  },
  {
    number: '4',
    title: 'Apply & Find Funding',
    subtitle: 'Months 6–10 · Apply to multiple — never bet on one',
    color: '#6b2d8a',
    bg: '#f3eafb',
    steps: [
      {
        icon: '📨',
        title: 'Submit your applications',
        body: (
          <div className="mt-2 space-y-2">
            <p className="text-sm text-gray-600">Apply to 5–8 universities — a mix of reach, target, and safe options. Write a personalised SOP for each. Apply to your full shortlist at the same time — do not wait for one rejection before applying to the next.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
              {[
                ['September Intake', 'European deadlines: January–March'],
                ['January Intake', 'Apply: July–September'],
                ['Rolling Admissions', 'Earlier = advantage — apply first'],
                ['Application Fees', 'Most EU unis: free. UK/US: £20–75'],
              ].map(([label, val]) => (
                <div key={label} className="bg-[#f5f5f0] rounded-lg px-3 py-2">
                  <div className="text-[10px] font-bold text-[#6b2d8a] uppercase tracking-wider">{label}</div>
                  <div className="text-sm text-gray-700 mt-0.5">{val}</div>
                </div>
              ))}
            </div>
          </div>
        ),
      },
      {
        icon: '💰',
        title: 'Major scholarships for Pakistani students',
        body: (
          <div className="mt-2 overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-[#6b2d8a] text-white">
                  {['Scholarship','Country','Covers','Deadline'].map(h => (
                    <th key={h} className="px-2 py-2 text-left font-semibold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  ['HEC Overseas','Various','Full tuition + living allowance','Feb–April'],
                  ['Fulbright (USEFP)','USA','Full tuition + stipend + airfare','May–June'],
                  ['Erasmus Mundus','EU','Full tuition + monthly stipend','Nov–Jan'],
                  ['DAAD','Germany','Tuition + stipend','Varies'],
                  ['CSC China','China','Full tuition + accommodation + stipend','Feb–March'],
                  ['Stipendium Hungaricum','Hungary','Tuition + accommodation + stipend','Jan–Feb'],
                  ['Turkish Burslari','Turkey','Full tuition + accommodation + stipend','Jan–Feb'],
                ].map((row, i) => (
                  <tr key={row[0]} className={i % 2 === 0 ? 'bg-white' : 'bg-[#f9f9f7]'}>
                    {row.map((cell, j) => (
                      <td key={j} className={`px-2 py-2 border border-gray-100 ${j === 0 ? 'font-medium text-gray-800' : 'text-gray-600'}`}>{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ),
        info: 'Apply for scholarships at the same time as university applications — many scholarship deadlines are earlier than university deadlines.',
      },
      {
        icon: '🧮',
        title: 'The real total cost — budget everything',
        body: (
          <div className="mt-2 space-y-1.5">
            {[
              ['Tuition fees', '€0/yr (Germany public) to £25,000/yr (UK)'],
              ['Accommodation', '€300–900/month — university hostel is usually cheapest'],
              ['Food & groceries', '€150–300/month if you cook your own food'],
              ['Transport', '€30–80/month with student card'],
              ['Health insurance', '€80–200/month — mandatory, cannot skip'],
              ['Phone & internet', '€15–30/month'],
              ['Initial setup', '€500–1,500 one-time (bedding, kitchen, SIM card)'],
              ['Flight tickets', 'PKR 200,000–400,000 depending on destination'],
              ['Total first year living', 'Budget minimum €8,000–15,000 on top of tuition'],
            ].map(([label, val]) => (
              <div key={label} className="flex gap-3 text-sm">
                <span className="text-gray-500 w-40 shrink-0">{label}</span>
                <span className="text-gray-700 font-medium">{val}</span>
              </div>
            ))}
          </div>
        ),
      },
    ],
  },
  {
    number: '5',
    title: 'Accept Offer & Apply for Visa',
    subtitle: 'Months 9–14 · The most critical phase — be thorough',
    color: '#b03a20',
    bg: '#fdeee9',
    steps: [
      {
        icon: '✅',
        title: 'Evaluating and accepting your offer',
        body: (
          <ul className="mt-2 space-y-1.5">
            {[
              'Start date — confirm it matches the intake you planned for',
              'Tuition amount — confirm it matches what was advertised when you applied',
              'Conditions — some offers require final results, English score, or other requirements',
              'Scholarship details — check if any university scholarship is included',
              'Deposit deadline — you usually have 4–8 weeks to confirm your place',
            ].map((item, i) => (
              <li key={i} className="flex gap-2 text-sm text-gray-600">
                <span className="text-[#b03a20] mt-0.5 shrink-0">·</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        ),
        info: 'You can hold multiple offers while waiting for scholarship decisions. Do not reject any offer until your funding is confirmed.',
      },
      {
        icon: '🛂',
        title: 'Student visa document checklist',
        body: (
          <ul className="mt-2 space-y-1.5">
            {[
              'Valid passport — minimum 18 months validity beyond your stay',
              'University offer/acceptance letter on official letterhead',
              'Proof of funds — 3–6 months of bank statements, scholarship letter, or sponsor letter',
              'Full attested academic documents (degree + transcripts from Phase 3)',
              'IELTS / TOEFL certificate',
              'Health or travel insurance for full study duration',
              'Proof of accommodation — hostel confirmation or tenancy agreement',
              'Visa application form completed at the official embassy website',
              'Visa application fee payment receipt',
              'Passport-size photographs as per embassy specifications',
              'NOC from employer (if you are currently employed)',
            ].map((item, i) => (
              <li key={i} className="flex gap-2 text-sm text-gray-600">
                <span className="text-[#b03a20] mt-0.5 shrink-0">☐</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        ),
        warn: 'Pakistani nationals face higher scrutiny. Apply 3–4 months before travel. Never provide false or misleading documents — a fraud rejection bans you permanently from that country.',
      },
      {
        icon: '🏦',
        title: 'Proof of funds — the #1 reason Pakistani visas get rejected',
        body: (
          <div className="mt-2 space-y-2">
            {[
              ['Amount required', 'Typically 12 months of living costs — exact amount varies by country'],
              ['Whose account', 'Your own or a parent\'s/sponsor\'s account with a support letter'],
              ['Statement period', '3–6 months of statements — money must have been there consistently'],
              ['What they look for', 'Stable balance over time — not a sudden large deposit made recently'],
              ['Best proof', 'A scholarship award letter is stronger than any bank statement'],
            ].map(([label, val]) => (
              <div key={label} className="flex gap-3 text-sm bg-[#f9f9f7] rounded-lg px-3 py-2">
                <span className="font-medium text-gray-800 w-36 shrink-0">{label}</span>
                <span className="text-gray-600">{val}</span>
              </div>
            ))}
          </div>
        ),
        warn: 'Do NOT borrow money and temporarily deposit it to fake a high balance. Visa officers are trained to detect this. It is fraud — results in immediate rejection and a possible ban.',
      },
    ],
  },
  {
    number: '6',
    title: 'Pre-Departure & Arrival',
    subtitle: 'Months 14–16 · Practical steps before you fly',
    color: '#1a5a6b',
    bg: '#e5f3f7',
    steps: [
      {
        icon: '🏠',
        title: 'Arrange accommodation before you arrive',
        body: (
          <div className="mt-2 space-y-2">
            <p className="text-sm text-gray-600">Book 2–3 months before your start date. Arriving without confirmed accommodation in a European city is extremely expensive and stressful.</p>
            {[
              ['University Dormitory', 'Cheapest and safest — apply immediately after accepting your offer. Places fill fast.'],
              ['Private Student Housing', 'Book via the university\'s accommodation office or Uniplaces.com / Student.com'],
              ['Shared Apartment', 'Find via Facebook groups for Pakistani/international students at your university'],
            ].map(([label, desc]) => (
              <div key={label} className="flex gap-3 bg-[#f5f5f0] rounded-lg px-3 py-2">
                <span className="font-medium text-gray-800 text-sm w-40 shrink-0">{label}</span>
                <span className="text-sm text-gray-600">{desc}</span>
              </div>
            ))}
          </div>
        ),
      },
      {
        icon: '✈️',
        title: 'Final checklist before you fly',
        body: (
          <ul className="mt-2 space-y-1.5">
            {[
              'All original documents in carry-on luggage — NEVER check in originals',
              'Attested copies in checked luggage as backup',
              'Scanned copies of every document in Google Drive and emailed to yourself',
              'University enrollment confirmation saved on phone',
              'Route from airport to accommodation planned (Google Maps)',
              'Local SIM card plan researched — many airports have kiosks on arrival',
              'Travel and health insurance activated and card printed',
              'Medications for at least 1 month — some Pakistan prescriptions are restricted abroad',
              'Power adapter for your destination country\'s socket type',
              'Emergency contacts saved: Pakistani embassy, university emergency line, family',
            ].map((item, i) => (
              <li key={i} className="flex gap-2 text-sm text-gray-600">
                <span className="text-[#1a5a6b] mt-0.5 shrink-0">☐</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        ),
      },
      {
        icon: '📋',
        title: 'Your first week after arriving — in order',
        body: (
          <ol className="mt-2 space-y-2">
            {[
              'Go to the international students office on day 1 or 2. Bring all original documents.',
              'Get your student ID and university email — you need these for everything.',
              'Open a local bank account — bring passport, student ID, enrollment letter, and proof of address.',
              'Register with local authorities if required (some EU countries mandate this within 1–2 weeks).',
              'Get a local SIM card — you need a local number for the bank and university systems.',
              'Locate nearest pharmacy, grocery store, and public transport stop.',
              'Register with the Pakistani embassy or consulate — free, takes 10 minutes, protects you in emergencies.',
              'Attend university orientation — international student sessions are extremely helpful.',
            ].map((step, i) => (
              <li key={i} className="flex gap-3 text-sm text-gray-600">
                <span className="w-6 h-6 rounded-full bg-[#1a5a6b] text-white flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">{i + 1}</span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        ),
        good: 'Register with the Pakistani embassy in your destination country within your first week. It is free, takes 10 minutes, and protects you in emergencies.',
      },
    ],
  },
];

const LINKS = [
  ['HEC Recognized Universities', 'https://www.hec.gov.pk', 'Check before applying anywhere'],
  ['HEC Equivalence Certificate', 'https://www.hec.gov.pk', 'Apply under Degree Attestation'],
  ['HEC Overseas Scholarship', 'https://www.hec.gov.pk/english/scholarshipsgrants', 'Government funded, very competitive'],
  ['IELTS Registration', 'https://www.idp.com/pakistan', 'IDP Pakistan'],
  ['British Council IELTS', 'https://www.britishcouncil.pk/exam/ielts', 'British Council Pakistan'],
  ['Find EU Master\'s Programs', 'https://www.mastersportal.eu', 'Best search tool for Europe'],
  ['UK Universities', 'https://www.ucas.com', 'All UK undergraduate and postgraduate programs'],
  ['Fulbright (USA)', 'https://www.usefp.org', 'Full funding for USA — highly prestigious'],
  ['Erasmus Mundus (EU)', 'https://erasmus-plus.ec.europa.eu', 'Fully funded EU programs'],
  ['DAAD (Germany)', 'https://www.daad.de/en', 'German scholarships — multiple types'],
  ['CSC China Scholarship', 'https://www.campuschina.org', 'Fully funded, bilateral quota for Pakistan'],
  ['Stipendium Hungaricum', 'https://stipendiumhungaricum.hu', 'Fully funded, Hungary'],
  ['Turkish Burslari', 'https://www.turkiyeburslari.gov.tr', 'Fully funded, Turkey'],
  ['Student Accommodation', 'https://www.uniplaces.com', 'Search student housing in Europe'],
  ['International Money Transfer', 'https://wise.com', 'Low-fee transfers — better than bank rates'],
  ['UK Student Visa', 'https://www.gov.uk/student-visa', 'Official UK visa application'],
  ['Free IELTS Practice', 'https://www.ieltspractice.com', 'Take a baseline test before booking'],
];

// ── Component ─────────────────────────────────────────────────────────────────
export default function AbroadGuidePage() {
  const [openPhase, setOpenPhase] = useState<number | null>(0);

  const toggle = (i: number) => setOpenPhase(openPhase === i ? null : i);

  return (
    <div className="min-h-screen bg-[#f5f5f0]" style={{ fontFamily: "'Segoe UI', system-ui, sans-serif" }}>

      {/* ── Header ── */}
      <div className="bg-[#1a6b45] px-6 py-10 text-center">
        <span className="inline-flex items-center gap-1.5 bg-white/15 border border-white/25 text-white/80 text-[11px] font-semibold uppercase tracking-widest px-3 py-1 rounded-full mb-3">
          Complete Roadmap
        </span>
        <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">How to Study Abroad from Pakistan</h1>
        <p className="text-white/70 text-sm max-w-xl mx-auto">
          For students who have never applied abroad and don't know where to start.
          A step-by-step guide from zero to landing at your university.
        </p>
      </div>

      {/* ── Start Today Banner ── */}
      <div className="bg-amber-50 border-b border-amber-200 px-6 py-4">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <span className="text-amber-600 text-xl shrink-0">⚡</span>
          <div>
            <p className="text-sm font-bold text-amber-800">Start these two things today — before anything else</p>
            <p className="text-xs text-amber-700 mt-0.5">
              (1) Apply for your <span className="font-bold">HEC Equivalence Certificate</span> at hec.gov.pk — takes 4–8 weeks, blocks everything if delayed.&nbsp;&nbsp;
              (2) <span className="font-bold">Book your IELTS test</span> at idp.com — no university admits you without it.
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">

        {/* ── Timeline ── */}
        <div>
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3">Your 15-month timeline</p>
          <div className="grid grid-cols-3 sm:grid-cols-6 rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
            {PHASES.map((phase) => (
              <button
                key={phase.number}
                onClick={() => {
                  setOpenPhase(Number(phase.number) - 1);
                  setTimeout(() => {
                    document.getElementById(`phase-${phase.number}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }, 50);
                }}
                style={{ background: phase.color }}
                className="px-2 py-3 text-center border-r border-white/20 last:border-r-0 hover:opacity-90 transition"
              >
                <div className="text-[10px] text-white/60 font-medium mb-1">{phase.subtitle.split(' ·')[0]}</div>
                <div className="text-xs font-bold text-white leading-tight">{phase.title}</div>
              </button>
            ))}
          </div>
        </div>

        {/* ── Phases ── */}
        <div className="space-y-3">
          {PHASES.map((phase, i) => (
            <div
              key={phase.number}
              id={`phase-${phase.number}`}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
            >
              {/* Phase header */}
              <button
                onClick={() => toggle(i)}
                className="w-full flex items-center gap-4 px-5 py-4 hover:bg-[#f9f9f7] transition text-left"
              >
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-xl font-bold shrink-0"
                  style={{ background: phase.bg, color: phase.color }}
                >
                  {phase.number}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-gray-900 text-base">{phase.title}</div>
                  <div className="text-xs text-gray-400 mt-0.5">{phase.subtitle}</div>
                </div>
                <span
                  className="text-gray-400 text-xl shrink-0 transition-transform duration-200"
                  style={{ transform: openPhase === i ? 'rotate(180deg)' : 'rotate(0deg)' }}
                >
                  ›
                </span>
              </button>

              {/* Phase body */}
              {openPhase === i && (
                <div className="px-5 pb-6 space-y-6 border-t border-gray-100">
                  {phase.steps.map((step, si) => (
                    <div key={si} className="pt-5">
                      <div className="flex items-start gap-3 mb-3">
                        <div
                          className="w-9 h-9 rounded-xl flex items-center justify-center text-lg shrink-0"
                          style={{ background: phase.bg }}
                        >
                          {step.icon}
                        </div>
                        <h3 className="font-bold text-gray-800 text-sm pt-1.5">{step.title}</h3>
                      </div>

                      <div className="ml-12">
                        {step.body}

                        {step.warn && (
                          <div className="mt-3 flex items-start gap-2 bg-red-50 border border-red-100 rounded-xl px-3 py-2.5">
                            <span className="text-red-500 shrink-0 text-sm mt-0.5">⚠️</span>
                            <p className="text-xs text-red-700 leading-5">{step.warn}</p>
                          </div>
                        )}
                        {step.info && (
                          <div className="mt-3 flex items-start gap-2 bg-blue-50 border border-blue-100 rounded-xl px-3 py-2.5">
                            <span className="text-blue-500 shrink-0 text-sm mt-0.5">ℹ️</span>
                            <p className="text-xs text-blue-700 leading-5">{step.info}</p>
                          </div>
                        )}
                        {step.good && (
                          <div className="mt-3 flex items-start gap-2 bg-[#e8f5ee] border border-[#b6e8d4] rounded-xl px-3 py-2.5">
                            <span className="text-[#1a6b45] shrink-0 text-sm mt-0.5">✅</span>
                            <p className="text-xs text-[#1a6b45] leading-5">{step.good}</p>
                          </div>
                        )}
                      </div>

                      {si < phase.steps.length - 1 && (
                        <div className="ml-12 mt-5 border-b border-gray-100" />
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* ── Useful Links ── */}
        <div>
          <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3">Quick Reference — Useful Websites</p>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {LINKS.map(([label, href, desc], i) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className={`flex items-center gap-4 px-5 py-3 hover:bg-[#f0faf6] transition group ${i !== 0 ? 'border-t border-gray-100' : ''}`}
              >
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-800 group-hover:text-[#1a6b45] transition">{label}</div>
                  <div className="text-xs text-gray-400">{desc}</div>
                </div>
                <div className="text-xs text-[#2d9e7a] font-medium shrink-0 opacity-0 group-hover:opacity-100 transition">
                  Visit →
                </div>
              </a>
            ))}
          </div>
        </div>

        {/* ── Closing banner ── */}
        <div className="bg-[#1a6b45] rounded-2xl p-6 text-center">
          <p className="text-white font-bold text-lg mb-1">Your journey starts with one step.</p>
          <p className="text-white/70 text-sm">Apply for HEC Equivalence today. Book your IELTS today.</p>
          <p className="text-white/50 text-xs mt-2">Everything else in this guide follows from those two actions.</p>
        </div>

      </div>
    </div>
  );
}
