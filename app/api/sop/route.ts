// app/api/sop/route.ts
import Groq from 'groq-sdk';
import { getAuth } from 'firebase-admin/auth';
import { adminDb } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

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
  'delve into',
  'tapestry of',
  'testament to',
  'plethora of',
  'in today\'s fast-paced world',
];

function gradingContext(cgpa: string): string {
  const val = parseFloat(cgpa);
  if (isNaN(val)) return 'demonstrating consistent academic dedication';
  if (val >= 3.7) return 'placing them in the top academic tier (top 5-10% of cohort)';
  if (val >= 3.5) return 'reflecting strong upper-division academic performance';
  if (val >= 3.0) return 'demonstrating consistent and solid academic competence';
  return 'showing steady academic progress and perseverance';
}

export async function POST(req: Request) {
  try {
    const data = await req.json();

    const letterType = data.letterType || 'sop';
    const degreeLevel = data.degreeLevel || "Master's";

    // Required fields check
    if (!data.name || !data.university || !data.field) {
      return Response.json({ error: 'Missing required fields: Name, University, and Program are required.' }, { status: 400 });
    }

    if (letterType !== 'visa_letter' && (!data.degree || !data.cgpa)) {
      return Response.json({ error: 'Missing academic background details: Completed Degree and CGPA are required.' }, { status: 400 });
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

    const userDocRef = adminDb.collection('users').doc(userId);
    const userDoc = await userDocRef.get();

    if (!userDoc.exists) {
      return Response.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Context formatting
    const studentName = data.name.trim();
    const targetUni = data.university.trim();
    const targetField = data.field.trim();
    const completedDegree = data.degree ? data.degree.trim() : 'Higher Secondary / Bachelor\'s';
    const cgpa = data.cgpa ? data.cgpa.trim() : '3.5';

    const goalsText = data.goals?.trim().length > 10
      ? data.goals.trim()
      : `Advance into leadership and specialized technical roles in ${targetField}`;
    
    const achievementsText = data.achievements?.trim().length > 10
      ? data.achievements.trim()
      : `Demonstrated technical excellence through applied projects in ${targetField}`;
    
    const experienceText = data.experience?.trim().length > 10
      ? data.experience.trim()
      : 'Solid academic laboratory, capstone, and project-based experience';
    
    const researchText = data.researchInterest?.trim().length > 10
      ? data.researchInterest.trim()
      : `Advanced core topics and modern methodologies within ${targetField}`;
    
    const whyUniText = data.whyUniversity?.trim().length > 10
      ? data.whyUniversity.trim()
      : null;

    let systemPrompt = '';
    let userPrompt = '';
    let letterTitle = '';

    // ==========================================
    // 1. STATEMENT OF PURPOSE (SOP)
    // ==========================================
    if (letterType === 'sop') {
      letterTitle = `SOP - ${targetUni} (${degreeLevel} ${targetField})`;
      systemPrompt =
        'You are an internationally renowned academic admissions consultant with 20+ years of experience helping students gain admission to premier universities across the US, UK, Canada, Europe, and Asia. ' +
        'You craft Statements of Purpose that are analytically rigorous, deeply authentic, and completely free of artificial generic filler. ' +
        'Every SOP reads like an accomplished, self-aware candidate who is genuinely prepared for graduate-level research and coursework.';

      const para5Instruction = whyUniText
        ? `The student provided this reason for choosing ${targetUni}:\n"${whyUniText}"\n` +
          `Expand this into 4-5 articulate sentences integrating how the curriculum, research faculty, and institute resources align with their focus on "${researchText}". Do not fabricate course codes or professor names unless provided.`
        : `The student did not provide specific reasons for choosing ${targetUni}.\n` +
          `Write a polished paragraph with clear contextual brackets [e.g. Professor X\'s lab / Module Y] so the student can insert their specific research details seamlessly. Never use hollow clichés like "world-class reputation".`;

      userPrompt = [
        `Write an exceptional Statement of Purpose for an applicant applying for a ${degreeLevel} in ${targetField} at ${targetUni}.`,
        '',
        '=== APPLICANT PROFILE ===',
        `Candidate Name:       ${studentName}`,
        `Degree Level:         ${degreeLevel}`,
        `Current/Prior Degree: ${completedDegree}`,
        `Academic Standing:    ${cgpa}/4.0 (${gradingContext(cgpa)})`,
        `Target University:    ${targetUni}`,
        `Intended Program:     ${degreeLevel} in ${targetField}`,
        `Primary Career Goal:  ${goalsText}`,
        `Key Projects:         ${achievementsText}`,
        `Experience / Intern.: ${experienceText}`,
        `Research Interests:   ${researchText}`,
        `Why This University:  ${whyUniText ?? 'See bracketed personalization instruction'}`,
        '',
        '=== 7-PARAGRAPH STRUCTURE ===',
        'PARAGRAPH 1: THE HOOK (3-4 sentences) - An intellectual challenge, concrete problem, or pivotal observation that defined their commitment to this field. No childhood clichés.',
        `PARAGRAPH 2: ACADEMIC FOUNDATION (4-5 sentences) - How their ${completedDegree} established core theoretical and mathematical foundations. Naturally integrate their GPA of ${cgpa} as proof of academic consistency.`,
        `PARAGRAPH 3: APPLIED PROJECTS & RESEARCH (5-6 sentences) - Draw directly from: ${achievementsText}. Emphasize technical problem, methodology, quantifiable outcome, and academic lessons learned.`,
        `PARAGRAPH 4: PROFESSIONAL & PRACTICAL EXPERIENCE (4 sentences) - Draw from: ${experienceText}. Discuss technical problem solving, teamwork, and why graduate study is the necessary catalyst for their next level.`,
        `PARAGRAPH 5: WHY THIS PROGRAM & UNIVERSITY (4-5 sentences) - ${para5Instruction}`,
        `PARAGRAPH 6: CAREER TRAJECTORY (3-4 sentences) - Short-term (post-graduation 1-3 years) and long-term (5-7 years) goals directly drawing on: ${goalsText}.`,
        'PARAGRAPH 7: CLOSING STATEMENT (2-3 sentences) - Confident, concise assertion of mutual fit and readiness to contribute to the academic community.',
        '',
        '=== STRICT CONSTRAINTS ===',
        'BANNED PHRASES: Do NOT use any of the following:',
        BANNED_PHRASES.map(p => `  - "${p}"`).join('\n'),
        'TONE: First-person ("I"). Objective, intellectually mature, and academically rigorous.',
        'LENGTH: 620-720 words. Flowing prose only. No headings, no bolding, no bullet points.',
      ].join('\n');

    // ==========================================
    // 2. ACADEMIC LETTER OF RECOMMENDATION (LOR)
    // ==========================================
    } else if (letterType === 'lor_academic') {
      letterTitle = `Academic LOR - ${studentName} for ${targetUni}`;
      const recommenderName = data.recommenderName?.trim() || 'Prof. Dr. [Recommender Name]';
      const recommenderTitle = data.recommenderTitle?.trim() || 'Professor & Head of Department';
      const institution = data.institutionOrCompany?.trim() || 'Department of Academic Studies';
      const relationship = data.relationship?.trim() || 'academic advisor and course instructor for 3 years';

      systemPrompt =
        'You are an esteemed university professor and department chair who writes influential, highly respected Academic Letters of Recommendation for top-tier graduate admissions committees worldwide. ' +
        'Your letters are authoritative, specific, evidence-backed, and convey deep academic credibility.';

      userPrompt = [
        `Draft a formal, highly compelling Academic Letter of Recommendation for ${studentName} applying for a ${degreeLevel} in ${targetField} at ${targetUni}.`,
        '',
        '=== RECOMMENDER & CANDIDATE DETAILS ===',
        `Recommender Name:     ${recommenderName}`,
        `Recommender Title:    ${recommenderTitle}`,
        `Academic Institution: ${institution}`,
        `Relationship Context: ${relationship}`,
        `Candidate Name:       ${studentName}`,
        `Completed Degree:     ${completedDegree}`,
        `Academic CGPA:        ${cgpa}/4.0 (${gradingContext(cgpa)})`,
        `Key Projects Known:   ${achievementsText}`,
        `Academic Aptitude:    ${researchText}`,
        `Target Program:       ${degreeLevel} in ${targetField} at ${targetUni}`,
        '',
        '=== FORMAL LETTER STRUCTURE ===',
        '1. LETTERHEAD & SALUTATION: Date, "To the Admissions Committee, [Target University]", formal opening statement expressing highest recommendation.',
        '2. ACADEMIC CONTEXT: State how long the recommender has taught/supervised the candidate, courses taught, and rank the student (e.g. "top 3-5% of students taught during my academic tenure").',
        '3. INTELLECTUAL CAPABILITY & COURSE PERFORMANCE: Concrete analysis of the student\'s analytical depth, engagement with complex theoretical topics, and exceptional work ethic.',
        `4. RESEARCH / PROJECT LEADERSHIP: Detail specific achievements drawing on: "${achievementsText}". Highlight initiative, problem formulation, and independent research capability.`,
        '5. PERSONAL ATTRIBUTES & COLLABORATION: Discuss resilience, intellectual integrity, willingness to mentor peers, and openness to constructive critique.',
        `6. UNEQUIVOCAL ENDORSEMENT: Firm statement confirming the candidate will excel in ${targetUni}\'s rigorous ${degreeLevel} program, recommending them without reservation for admission and scholarship consideration.`,
        `7. FORMAL SIGN-OFF: "Sincerely,", Recommender Name, Title, Institution, and Email/Phone placeholder.`,
        '',
        '=== STRICT RULES ===',
        'FORMAT: Formal academic letter format. Clear paragraphing.',
        'LENGTH: 450-550 words.',
        'AVOID: Generic praise without concrete examples.',
      ].join('\n');

    // ==========================================
    // 3. PROFESSIONAL LETTER OF RECOMMENDATION (LOR)
    // ==========================================
    } else if (letterType === 'lor_professional') {
      letterTitle = `Professional LOR - ${studentName} for ${targetUni}`;
      const recommenderName = data.recommenderName?.trim() || '[Manager Name]';
      const recommenderTitle = data.recommenderTitle?.trim() || 'Senior Engineering Director / Technical Lead';
      const company = data.institutionOrCompany?.trim() || '[Company / Organization Name]';
      const relationship = data.relationship?.trim() || 'direct supervisor for 2 years';

      systemPrompt =
        'You are an experienced industry executive and engineering manager writing a powerful Professional Letter of Recommendation for a high-performing team member applying to graduate school. ' +
        'Your recommendation highlights technical leadership, deliverable outcomes, initiative under pressure, and professional maturity.';

      userPrompt = [
        `Write a formal Professional Letter of Recommendation for ${studentName} applying for a ${degreeLevel} in ${targetField} at ${targetUni}.`,
        '',
        '=== RECOMMENDER & CANDIDATE PROFILE ===',
        `Recommender:          ${recommenderName}, ${recommenderTitle}`,
        `Company/Organization: ${company}`,
        `Supervisory Context:  ${relationship}`,
        `Candidate Name:       ${studentName}`,
        `Relevant Work Record: ${experienceText}`,
        `Key Deliverables:     ${achievementsText}`,
        `Career Direction:     ${goalsText}`,
        `Target Program:       ${degreeLevel} in ${targetField} at ${targetUni}`,
        '',
        '=== LETTER STRUCTURE ===',
        '1. FORMAL SALUTATION: Date, "To the Admissions Committee, [Target University]".',
        '2. PROFESSIONAL RELATIONSHIP: Clarify candidate\'s role, duration of employment, and initial impression.',
        `3. TECHNICAL EXCELLENCE & DELIVERABLES: Detail specific contributions drawing on: "${achievementsText}" and "${experienceText}". Emphasize real-world problem solving, engineering execution, and metrics/outcomes.`,
        '4. LEADERSHIP, COLLABORATION & INITIATIVE: Describe how the candidate handled ambiguity, mentored colleagues, and maintained high professional standards.',
        `5. STRATEGIC FIT FOR GRADUATE STUDY: Explain why advancing their education in ${targetField} at ${targetUni} aligns with their professional trajectory and will prepare them for senior leadership.`,
        '6. ENTHUSIASTIC CONCLUSION: Strong, unreserved recommendation for admission.',
        '7. CORPORATE SIGN-OFF: Sincerely, Name, Title, Company Name.',
        '',
        'LENGTH: 450-550 words. Professional corporate tone.',
      ].join('\n');

    // ==========================================
    // 4. EUROPEAN LETTER OF MOTIVATION
    // ==========================================
    } else if (letterType === 'motivation_letter') {
      letterTitle = `Motivation Letter - ${targetUni} (${targetField})`;
      systemPrompt =
        'You are a senior European university academic advisor specializing in admissions for prestigious universities in Germany, Switzerland, the Netherlands, Sweden, France, and Italy (e.g. TUM, RWTH Aachen, ETH Zurich, TU Delft, KTH, Politecnico di Milano). ' +
        'You understand that European admissions committees value direct, academically rigorous, prerequisite-focused motivation letters over flowery American-style personal narratives.';

      userPrompt = [
        `Write a European-standard Letter of Motivation for ${studentName} applying for a ${degreeLevel} in ${targetField} at ${targetUni}.`,
        '',
        '=== APPLICANT QUALIFICATIONS ===',
        `Candidate Name:       ${studentName}`,
        `Completed Degree:     ${completedDegree}`,
        `Academic CGPA/Score:  ${cgpa}/4.0 (${gradingContext(cgpa)})`,
        `Target University:    ${targetUni}`,
        `Target Master/Degree: ${degreeLevel} in ${targetField}`,
        `Academic Prereqs:     ${researchText}`,
        `Projects & Skills:    ${achievementsText}`,
        `Practical Experience: ${experienceText}`,
        `Why This Program:     ${whyUniText || 'Program curriculum, institute specialization, and European career orientation'}`,
        `Long-Term Vision:     ${goalsText}`,
        '',
        '=== EUROPEAN LETTER STRUCTURE ===',
        '1. SALUTATION & DIRECT STATEMENT OF PURPOSE (1 paragraph): Clear declaration of candidacy for the program, citing their background in ' + completedDegree + ' and CGPA of ' + cgpa + '.',
        '2. ACADEMIC COMPETENCIES & PREREQUISITES (1 paragraph): Methodological and theoretical foundation. Explain how their prior coursework directly fulfills the academic prerequisites and ECTS-equivalent standards of this specific degree.',
        '3. PRACTICAL RESEARCH & APPLIED PROJECT WORK (1-2 paragraphs): Draw directly from: ' + achievementsText + '. Focus on technical methodology, tools used, scientific problem formulation, and analytical outcomes.',
        '4. CURRICULAR ALIGNMENT & INSTITUTIONAL SYNERGY (1 paragraph): Address why ' + targetUni + ' is the exact academic environment required. Focus on specialized curriculum tracks, seminars, or laboratories in ' + targetField + '.',
        '5. CAREER OBJECTIVES & EUROPEAN/GLOBAL OUTLOOK (1 paragraph): Direct correlation between the degree modules and their post-graduation plans (' + goalsText + ').',
        '6. FORMAL CLOSING: Respectful, professional closing ("Thank you for considering my application. I look forward to the opportunity to discuss my qualifications further. Yours sincerely, ' + studentName + '").',
        '',
        '=== GUIDELINES ===',
        'BANNED PHRASES: No clichés ("passion ignited", "ever since I was a child", "beacon", "catapult").',
        'TONE: Objective, formal, analytical, respectful.',
        'LENGTH: 550-650 words.',
      ].join('\n');

    // ==========================================
    // 5. STUDENT VISA COVER LETTER & STUDY PLAN
    // ==========================================
    } else if (letterType === 'visa_letter') {
      const destinationCountry = data.destinationCountry?.trim() || 'the Destination Country';
      const fundingSource = data.fundingSource?.trim() || 'Self-funded via savings and designated blocked account / bank balance';
      const homeCountryTies = data.homeCountryTies?.trim() || 'Family ties, established assets, and promising career opportunities in the home country tech/industrial sector';
      letterTitle = `Visa Cover Letter - ${destinationCountry} (${targetUni})`;

      systemPrompt =
        'You are an expert immigration legal consultant and student visa specialist with extensive experience preparing visa cover letters and study plans for embassies and consulates of Germany, Canada, the US, UK, Australia, and Schengen member states. ' +
        'Your letters clearly prove genuine student intent, financial self-sufficiency, academic progression logic, and non-immigrant ties to the home country.';

      userPrompt = [
        `Draft a comprehensive, highly persuasive Student Visa Cover Letter & Study Plan for an applicant applying for a Student Visa to ${destinationCountry}.`,
        '',
        '=== VISA APPLICANT DOSSIER ===',
        `Applicant Name:       ${studentName}`,
        `Home Country / City:  ${data.homeCountry || 'Home Country'}`,
        `Destination Country:  ${destinationCountry}`,
        `Accepted University:  ${targetUni}`,
        `Admitted Program:     ${degreeLevel} in ${targetField}`,
        `Academic Background:  ${completedDegree} (CGPA: ${cgpa}/4.0)`,
        `Financial Funding:    ${fundingSource}`,
        `Ties to Home Country: ${homeCountryTies}`,
        `Career Trajectory:    ${goalsText}`,
        '',
        '=== EMBASSY LETTER STRUCTURE ===',
        '1. FORMAL EMBASSY SALUTATION: Date, "To: The Visa Officer / Consular Section, Embassy / Consulate General of ' + destinationCountry + '".',
        'Subject line: "Application for International Student Visa – ' + studentName + ' – Admitted to ' + targetUni + '"',
        '2. INTRODUCTION & ADMISSION DETAILS: Clear statement of purpose, details of the unconditional/official admission letter received from ' + targetUni + ' for ' + degreeLevel + ' in ' + targetField + '.',
        '3. ACADEMIC BACKGROUND & PROGRESSION JUSTIFICATION: Logical explanation of how this program builds directly on ' + completedDegree + ', why studying in ' + destinationCountry + ' provides education not available locally, and how the curriculum fulfills career needs.',
        '4. FINANCIAL PLAN & SUFFICIENCY: Explicit breakdown of financial sponsorship (' + fundingSource + '), confirming compliance with visa financial requirements (e.g. Blocked Account, bank balance, living cost funds).',
        '5. TIES TO HOME COUNTRY & FUTURE CAREER IN HOME COUNTRY: Crucial section establishing deep economic, familial, and professional ties (' + homeCountryTies + ') and clear commitment to return home to pursue career opportunities (' + goalsText + ').',
        '6. CHECKLIST OF ENCLOSED DOCUMENTS: Clear numbered list of mandatory submitted documents (Passport, Acceptance Letter, Financial Proof, Academic Certificates, Language Proof, Health Insurance).',
        '7. FORMAL UNDERTAKING & CLOSING: Pledge to abide by immigration regulations, followed by respectful closing and signature block.',
        '',
        'LENGTH: 550-650 words. Highly structured, courteous, and legally precise.',
      ].join('\n');
    }

    // Call Groq LLaMA 3.3 70B
    const response = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.35,
      max_tokens: 2200,
      top_p: 0.9,
    });

    const result = response?.choices?.[0]?.message?.content?.trim();
    if (!result) {
      return Response.json({ error: 'AI did not return a valid letter. Please retry.' }, { status: 500 });
    }

    // Persist usage and record
    await userDocRef.update({ sop_used: FieldValue.increment(1) });

    await adminDb.collection('generations').add({
      user_id: userId,
      type: letterType,
      title: letterTitle,
      content: result,
      university: targetUni,
      field: targetField,
      degreeLevel: degreeLevel,
      whyUniversity: data.whyUniversity ?? '',
      createdAt: new Date(),
    });

    return Response.json({ result, title: letterTitle, letterType });

  } catch (error) {
    console.error('Letter generation error:', error);
    return Response.json({ error: 'Letter generation failed. Please try again.' }, { status: 500 });
  }
}
