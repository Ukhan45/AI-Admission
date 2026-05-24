// app/api/sop/route.ts
import Groq from 'groq-sdk';
import { getAuth } from 'firebase-admin/auth';
import { adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const FREE_SOP_LIMIT = 3;

const BANNED_PHRASES = [
  'I have always been passionate',
  'ever since I was young',
  'ever since childhood',
  'I am a hardworking',
  'beacon',
  'epiphany',
  'indelible mark',
  'web of complexities',
  'soar to new heights',
  'catapult my career',
  'transformative journey',
  'chain reaction',
  'insatiable curiosity',
  'launchpad',
  'unwavering determination',
  'unrelenting passion',
  'spark within me',
  'ignited my passion',
  'fueled my passion',
  'it goes without saying',
  'needless to say',
  'I am a quick learner',
];

function gradingContext(cgpa: string): string {
  const val = parseFloat(cgpa);
  if (val >= 3.7) return 'placing them in the top academic tier';
  if (val >= 3.5) return 'reflecting strong academic performance';
  if (val >= 3.0) return 'demonstrating consistent academic effort';
  return 'showing steady academic progress';
}

// Builds the paragraph 5 instruction as a plain string — no nested backticks
function buildPara5(
  whyUniversityText: string | null,
  university: string,
  field: string,
  researchText: string,
): string {
  if (whyUniversityText) {
    return (
      'The student has provided the following reason for choosing this university:\n' +
      '"' + whyUniversityText + '"\n\n' +
      'Use this as the foundation. Expand it into 4-5 natural, flowing sentences. ' +
      'Add context about how the program aligns with the student\'s research interest in "' + researchText + '" and their career goals. ' +
      'Make it feel considered and personal — like the student genuinely researched this choice. ' +
      'Do NOT invent faculty names, lab names, or specific course titles unless the student mentioned them.'
    );
  }

  return (
    'The student did NOT provide a reason for choosing ' + university + '.\n\n' +
    'CRITICAL INSTRUCTION: Do NOT invent generic praise like "your university\'s excellent reputation", ' +
    '"world-class faculty", "cutting-edge research", or "collaborative environment" — ' +
    'admissions committees see through this immediately and it damages the application.\n\n' +
    'Instead, write this paragraph as a clearly marked placeholder the student MUST personalise before submitting. ' +
    'Use this structure:\n\n' +
    '"I am drawn to ' + university + '\'s Master\'s in ' + field + ' because [STUDENT: add your specific reason here — ' +
    'e.g. a professor\'s research area, a specific module, or an industry partnership the program has]. ' +
    'The program\'s approach to ' + field + ' aligns with my interest in ' + researchText + '. ' +
    'I look forward to [STUDENT: name something specific you researched about this program] and will update this section before submission."\n\n' +
    'This paragraph must make it completely obvious to the student that it needs to be rewritten with real, researched details.'
  );
}

export async function POST(req: Request) {
  try {
    const data = await req.json();

    // Validation
    if (!data.name || !data.degree || !data.cgpa || !data.university || !data.field) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Auth
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    let userId: string;
    try {
      const decodedToken = await getAuth().verifyIdToken(token);
      userId = decodedToken.uid;
    } catch {
      return Response.json({ error: 'Invalid session' }, { status: 401 });
    }

    // Credit check
    const userDocRef = adminDb.collection('users').doc(userId);
    const userDoc = await userDocRef.get();

    if (!userDoc.exists) {
      return Response.json({ error: 'Profile not found' }, { status: 404 });
    }

    const userData = userDoc.data();
    const isPro = userData?.plan === 'pro';
    const sopUsed: number = userData?.sop_used ?? 0;
    const limit = isPro ? 999999 : FREE_SOP_LIMIT;

    if (sopUsed >= limit) {
      return Response.json({
        error: 'limit_reached',
        message: 'You have used all your free SOP generations. Please upgrade to continue.',
        plan: userData?.plan,
        used: sopUsed,
        limit,
      }, { status: 403 });
    }

    // Build context strings
    const hasGoals         = data.goals?.trim().length > 10;
    const hasAchievements  = data.achievements?.trim().length > 10;
    const hasExperience    = data.experience?.trim().length > 10;
    const hasResearch      = data.researchInterest?.trim().length > 10;
    const hasWhyUniversity = data.whyUniversity?.trim().length > 10;

    const goalsText         = hasGoals         ? data.goals.trim()            : `Work in ${data.field} in a senior or research-oriented role after graduating`;
    const achievementsText  = hasAchievements  ? data.achievements.trim()     : `Strong academic foundation with projects relevant to ${data.field}`;
    const experienceText    = hasExperience    ? data.experience.trim()       : 'No work experience provided — focus on academic and project work';
    const researchText      = hasResearch      ? data.researchInterest.trim() : `Core topics within ${data.field}`;
    const whyUniversityText = hasWhyUniversity ? data.whyUniversity.trim()    : null;

    // Build paragraph 5 instruction as a plain string (no nested backticks)
    const para5 = buildPara5(whyUniversityText, data.university, data.field, researchText);

    // Prompts
    const systemPrompt =
      'You are an elite academic writing consultant who has helped over 3,000 students gain admission to top universities across Europe, North America, and Asia. ' +
      'You specialise in writing Statements of Purpose that are deeply personal, analytically sharp, and completely free of generic filler.\n\n' +
      'Your defining skill: you make every SOP feel like it was written by a real, thoughtful human being — ' +
      'because admissions committees can instantly spot AI-generated or template-filled writing and reject it. ' +
      'Every SOP you write is different. Every opening is unique. Every sentence earns its place.';

    const userPrompt = [
      'Write a Statement of Purpose for the following student applying to a graduate program.',
      '',
      '=== STUDENT PROFILE ===',
      'Name:                ' + data.name,
      'Completed Degree:    ' + data.degree,
      'CGPA:                ' + data.cgpa + '/4.0 (' + gradingContext(data.cgpa) + ')',
      'Target University:   ' + data.university,
      'Applying For:        Masters in ' + data.field,
      'Career Goals:        ' + goalsText,
      'Projects/Achiev.:    ' + achievementsText,
      'Work Experience:     ' + experienceText,
      'Research Interest:   ' + researchText,
      'Why This University: ' + (whyUniversityText ?? 'NOT PROVIDED — see paragraph 5 instructions below'),
      '',
      '=== PARAGRAPH-BY-PARAGRAPH STRUCTURE ===',
      '',
      'PARAGRAPH 1 — THE HOOK (3-4 sentences)',
      'Do NOT open with "I have always been passionate about..." or any variation.',
      'Instead: open with a specific problem the student encountered, a moment of realisation, or an observation that changed how they thought about their field.',
      'It must be concrete, vivid, and directly tied to why they chose ' + data.field + '.',
      '',
      'PARAGRAPH 2 — ACADEMIC FOUNDATION (4-5 sentences)',
      'Describe their ' + data.degree + ' and how it prepared them for graduate study in ' + data.field + '.',
      'Name 2 realistic, specific courses relevant to both the degree and the field.',
      'Mention their CGPA of ' + data.cgpa + ' naturally — as evidence of discipline, not as a trophy.',
      'Connect specific skills or knowledge gained directly to graduate-level work.',
      '',
      'PARAGRAPH 3 — PROJECTS & ACHIEVEMENTS (5-6 sentences)',
      'Draw on: ' + achievementsText,
      'For each project or achievement: (a) describe what they did, (b) state a concrete outcome or what they learned,',
      '(c) explain how it revealed a gap or deepened their understanding.',
      'This paragraph should make the reader think: "this person has already been doing the work."',
      '',
      'PARAGRAPH 4 — EXPERIENCE & SKILLS (3-4 sentences)',
      'Draw on: ' + experienceText,
      'Describe a specific responsibility, challenge, or skill developed.',
      'End by showing why this background alone is not enough, and why graduate study is the logical next step.',
      '',
      'PARAGRAPH 5 — WHY THIS UNIVERSITY & PROGRAM (4-5 sentences)',
      'The student is applying to ' + data.university + ' for a Masters in ' + data.field + '.',
      '',
      para5,
      '',
      'PARAGRAPH 6 — FUTURE VISION (3-4 sentences)',
      'Describe a specific, believable career outcome.',
      'Goals: ' + goalsText,
      'Name an industry, a type of organisation, or a specific problem they want to work on.',
      'Show how the Masters is the bridge between where they are and where they are going.',
      '',
      'PARAGRAPH 7 — CLOSING (2-3 sentences)',
      'Confident, purposeful, and brief.',
      'No hollow phrases like "I look forward to contributing to your esteemed institution."',
      'Reaffirm their readiness, name one specific thing they bring to the program, and close with a forward-looking statement.',
      '',
      '=== STRICT RULES ===',
      '',
      'BANNED PHRASES — never use any of these:',
      BANNED_PHRASES.map((p) => '  - "' + p + '"').join('\n'),
      '',
      'TONE: First person. Confident but not arrogant. Humble but not self-deprecating. Academic but readable.',
      'VOICE: Sound like a smart, self-aware graduate applicant — not a motivational poster.',
      'LENGTH: 580-680 words exactly. Count carefully.',
      'FORMAT: Flowing prose only. No headers. No bullet points. No bold text. Seven paragraphs.',
      'OUTPUT: Return ONLY the SOP text. No preamble, no "Here is your SOP:", no closing note.',
    ].join('\n');

    // Call Groq
    const response = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: userPrompt   },
      ],
      temperature: 0.72,
      max_tokens: 1500,
      top_p: 0.88,
    });

    const result = response?.choices?.[0]?.message?.content?.trim();
    if (!result) {
      return Response.json({ error: 'AI did not return a valid response. Please try again.' }, { status: 500 });
    }

    // Persist
    await userDocRef.update({ sop_used: FieldValue.increment(1) });

    await adminDb.collection('generations').add({
      user_id:       userId,
      type:          'sop',
      content:       result,
      university:    data.university,
      field:         data.field,
      whyUniversity: data.whyUniversity ?? '',
      createdAt:     new Date(),
    });

    return Response.json({
      result,
      credits_remaining: Math.max(0, limit - sopUsed - 1),
    });

  } catch (error) {
    console.error('SOP generation error:', error);
    return Response.json({ error: 'SOP generation failed. Please try again.' }, { status: 500 });
  }
}