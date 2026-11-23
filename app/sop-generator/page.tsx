'use client';

import { useEffect, useState, useMemo } from 'react';
import { incrementStat } from '@/lib/stats';
import { auth } from '@/lib/firebase';
import Link from 'next/link';

type LetterType = 'sop' | 'lor_academic' | 'lor_professional' | 'motivation_letter' | 'visa_letter';
type DegreeLevel = "Bachelor's" | "Master's" | 'PhD';

const LETTER_CONFIGS: Record<LetterType, { label: string; icon: string; subtitle: string; idealWords: [number, number] }> = {
  sop: {
    label: 'Statement of Purpose (SOP)',
    icon: '📝',
    subtitle: 'Standard 7-paragraph academic SOP for US, UK, Canada & global graduate programs.',
    idealWords: [600, 750],
  },
  lor_academic: {
    label: 'Academic Recommendation (LOR)',
    icon: '🎓',
    subtitle: 'Formal institutional letter written by a professor, lecturer, or research supervisor.',
    idealWords: [450, 600],
  },
  lor_professional: {
    label: 'Professional Recommendation (LOR)',
    icon: '💼',
    subtitle: 'Corporate letter of recommendation written by a manager, team lead, or director.',
    idealWords: [450, 600],
  },
  motivation_letter: {
    label: 'European Motivation Letter',
    icon: '🇪🇺',
    subtitle: 'Direct, prerequisite-focused motivation letter for German, Dutch, Nordic & EU universities.',
    idealWords: [550, 680],
  },
  visa_letter: {
    label: 'Visa Cover Letter & Study Plan',
    icon: '🛂',
    subtitle: 'Persuasive embassy cover letter demonstrating genuine student intent & strong home ties.',
    idealWords: [550, 700],
  },
};

export default function SopGenerator() {
  const [letterType, setLetterType] = useState<LetterType>('sop');
  const [degreeLevel, setDegreeLevel] = useState<DegreeLevel>("Master's");

  const [form, setForm] = useState({
    name: '',
    degree: '',
    cgpa: '',
    university: '',
    field: '',
    goals: '',
    achievements: '',
    experience: '',
    researchInterest: '',
    whyUniversity: '',
    // LOR specific
    recommenderName: '',
    recommenderTitle: '',
    institutionOrCompany: '',
    relationship: '',
    // Visa specific
    destinationCountry: '',
    homeCountry: '',
    fundingSource: '',
    homeCountryTies: '',
  });

  const [result, setResult] = useState('');
  const [generatedTitle, setGeneratedTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [copied, setCopied] = useState(false);

  const currentCfg = LETTER_CONFIGS[letterType];

  const wordCount = useMemo(() => {
    if (!result) return 0;
    return result.trim().split(/\s+/).filter(Boolean).length;
  }, [result]);

  const [minW, maxW] = currentCfg.idealWords;
  const wordCountColor =
    wordCount >= minW && wordCount <= maxW
      ? 'text-[#2d9e7a]'
      : wordCount > 0
      ? 'text-[#c47d0a]'
      : 'text-gray-400';

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError('');
  };

  useEffect(() => {
    if (!successMessage) return;
    const t = window.setTimeout(() => setSuccessMessage(''), 5000);
    return () => window.clearTimeout(t);
  }, [successMessage]);

  const isFormValid = () => {
    if (!form.name || !form.university || !form.field) return false;
    if (letterType !== 'visa_letter' && (!form.degree || !form.cgpa)) return false;
    return true;
  };

  const generateLetter = async () => {
    if (!isFormValid()) {
      setError('Please fill in all mandatory fields marked with an asterisk (*).');
      return;
    }

    setLoading(true);
    setError('');
    setSuccessMessage('');
    setResult('');

    try {
      const user = auth.currentUser;
      if (!user) {
        setError('You must be signed in to generate letters.');
        return;
      }
      const token = await user.getIdToken();

      const res = await fetch('/api/sop', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...form,
          letterType,
          degreeLevel,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data?.error || 'Failed to generate your document. Please try again.');
      } else {
        setResult(data.result);
        setGeneratedTitle(data.title || currentCfg.label);
        setSuccessMessage(`${currentCfg.label} generated successfully!`);
        incrementStat('sopsGenerated');
        setTimeout(() => {
          document.getElementById('letter-result')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadTxt = () => {
    if (!result) return;
    const blob = new Blob([result], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(generatedTitle || 'Admission_Letter').replace(/[^a-zA-Z0-9_-]/g, '_')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadDoc = () => {
    if (!result) return;
    const header = '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"><title>' + generatedTitle + '</title><style>body{font-family:Calibri,Arial,sans-serif;font-size:12pt;line-height:1.5;margin:1in;} p{margin-bottom:12pt;}</style></head><body>';
    const body = result.split('\n\n').map(p => `<p>${p.replace(/\n/g, '<br/>')}</p>`).join('');
    const footer = '</body></html>';
    const blob = new Blob([header + body + footer], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(generatedTitle || 'Admission_Letter').replace(/[^a-zA-Z0-9_-]/g, '_')}.doc`;
    a.click();
    URL.revokeObjectURL(url);
  };

  /* ── Styles ── */
  const inputCls = `w-full bg-white border border-gray-200 text-gray-800 placeholder-gray-400
    px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:border-[#2d9e7a] focus:ring-2
    focus:ring-[#2d9e7a]/15 transition mt-1`;

  const labelCls = `block text-[11px] font-bold text-[#1a7a5e] uppercase tracking-wider`;
  const hintCls = `text-[11px] text-gray-400 mt-1 ml-0.5 leading-4`;
  const sectionCls = `text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3 mt-1`;

  return (
    <div
      className="min-h-screen bg-[#f5f5f0]"
      style={{ fontFamily: "'Segoe UI', system-ui, sans-serif" }}
    >
      {/* ── Page Header ── */}
      <div className="bg-white border-b border-gray-100 px-4 sm:px-6 py-4 sm:py-5">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <span className="inline-flex items-center gap-1.5 bg-[#f0faf6] border border-[#b6e8d4] text-[#2d9e7a] text-[11px] font-semibold uppercase tracking-widest px-3 py-1 rounded-full mb-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#f5a623] inline-block" />
              High-Accuracy Document Suite
            </span>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">AI Letter & SOP Suite</h1>
            <p className="text-sm text-gray-400 mt-0.5">
              Draft authentic, human-grade Statements of Purpose, Recommendation Letters, Motivation Letters, and Visa Plans.
            </p>
          </div>
          <Link
            href="/sop-history"
            className="self-start sm:self-auto text-xs font-bold px-4 py-2 rounded-xl border bg-[#f0faf6] border-[#b6e8d4] text-[#2d9e7a] hover:bg-[#e0f5ec] transition"
          >
            📂 Document History →
          </Link>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 sm:py-6 space-y-5">
        {/* ── Document Type Selector Tabs ── */}
        <div className="bg-white rounded-2xl border border-gray-100 p-2 sm:p-2.5 shadow-sm">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-2 mb-2">
            Select Document To Generate:
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
            {(Object.keys(LETTER_CONFIGS) as LetterType[]).map((type) => {
              const cfg = LETTER_CONFIGS[type];
              const active = letterType === type;
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => {
                    setLetterType(type);
                    setError('');
                  }}
                  className={`text-left p-2.5 rounded-xl border text-xs font-bold transition flex flex-col items-start gap-1 ${
                    active
                      ? 'bg-[#1a7a5e] text-white border-[#1a7a5e] shadow-sm'
                      : 'bg-gray-50 border-gray-100 text-gray-600 hover:bg-[#f0faf6] hover:text-[#1a7a5e]'
                  }`}
                >
                  <span className="text-base">{cfg.icon}</span>
                  <span className="truncate w-full">{cfg.label.split('(')[0].trim()}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Active Type Information Banner ── */}
        <div className="flex items-center gap-3 bg-[#f0faf6] border border-[#b6e8d4] rounded-xl px-4 py-3">
          <span className="text-2xl">{currentCfg.icon}</span>
          <div className="flex-1">
            <h3 className="text-xs font-bold text-[#1a7a5e]">{currentCfg.label}</h3>
            <p className="text-[11px] text-[#2d9e7a]">{currentCfg.subtitle}</p>
          </div>
        </div>

        {/* ── Success banner ── */}
        {successMessage && (
          <div className="flex items-center justify-between gap-4 bg-[#f0faf6] border border-[#b6e8d4] text-[#1a7a5e] text-sm rounded-xl px-4 sm:px-5 py-3.5 shadow-sm">
            <div className="flex items-center gap-2 font-medium">
              <span>✅</span> {successMessage}
            </div>
            <button
              onClick={() => setSuccessMessage('')}
              className="text-[#2d9e7a] hover:text-[#1a7a5e] transition text-xs font-bold shrink-0"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* ── Form Card ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-4 sm:px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-[#2d9e7a] uppercase tracking-widest">Step 1</p>
              <h2 className="text-base sm:text-lg font-bold text-gray-900 mt-0.5">Required Details</h2>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400 font-medium">Degree Level:</span>
              <select
                value={degreeLevel}
                onChange={(e) => setDegreeLevel(e.target.value as DegreeLevel)}
                className="text-xs bg-gray-50 border border-gray-200 text-gray-800 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-[#2d9e7a]"
              >
                <option value="Bachelor's">Bachelor's (BS / BA)</option>
                <option value="Master's">Master's (MS / MA / MBA)</option>
                <option value="PhD">Doctorate (PhD)</option>
              </select>
            </div>
          </div>

          <div className="p-4 sm:p-6 space-y-6">
            {/* ── Candidate & Target Institution ── */}
            <div>
              <p className={sectionCls}>A — Target Institution & Candidate</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>
                    Candidate Full Name <span className="text-red-400">*</span>
                  </label>
                  <input
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    placeholder="e.g. Aisha Khan"
                    className={inputCls}
                  />
                </div>

                <div>
                  <label className={labelCls}>
                    Target University / Institution <span className="text-red-400">*</span>
                  </label>
                  <input
                    name="university"
                    value={form.university}
                    onChange={handleChange}
                    placeholder="e.g. Technical University of Munich (TUM)"
                    className={inputCls}
                  />
                </div>

                <div>
                  <label className={labelCls}>
                    Intended Program / Field of Study <span className="text-red-400">*</span>
                  </label>
                  <input
                    name="field"
                    value={form.field}
                    onChange={handleChange}
                    placeholder="e.g. Data Engineering & Analytics"
                    className={inputCls}
                  />
                </div>

                <div>
                  <label className={labelCls}>
                    Completed Degree <span className="text-red-400">*</span>
                  </label>
                  <input
                    name="degree"
                    value={form.degree}
                    onChange={handleChange}
                    placeholder="e.g. BS Computer Science"
                    className={inputCls}
                  />
                </div>

                <div>
                  <label className={labelCls}>
                    CGPA / Academic Score <span className="text-red-400">*</span>
                  </label>
                  <input
                    name="cgpa"
                    value={form.cgpa}
                    onChange={handleChange}
                    placeholder="e.g. 3.75 / 4.0 or 85%"
                    className={inputCls}
                  />
                </div>

                {letterType === 'visa_letter' && (
                  <div>
                    <label className={labelCls}>
                      Destination Country <span className="text-red-400">*</span>
                    </label>
                    <input
                      name="destinationCountry"
                      value={form.destinationCountry}
                      onChange={handleChange}
                      placeholder="e.g. Germany"
                      className={inputCls}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* ── LOR Specific Fields ── */}
            {(letterType === 'lor_academic' || letterType === 'lor_professional') && (
              <div>
                <p className={sectionCls}>
                  B — {letterType === 'lor_academic' ? 'Academic Recommender' : 'Professional Recommender'} Details
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>
                      Recommender Full Name <span className="text-red-400">*</span>
                    </label>
                    <input
                      name="recommenderName"
                      value={form.recommenderName}
                      onChange={handleChange}
                      placeholder={letterType === 'lor_academic' ? 'e.g. Prof. Dr. Robert Davies' : 'e.g. Sarah Jenkins'}
                      className={inputCls}
                    />
                  </div>

                  <div>
                    <label className={labelCls}>
                      Recommender Title / Designation <span className="text-red-400">*</span>
                    </label>
                    <input
                      name="recommenderTitle"
                      value={form.recommenderTitle}
                      onChange={handleChange}
                      placeholder={
                        letterType === 'lor_academic'
                          ? 'e.g. Professor & Head of Computer Science'
                          : 'e.g. VP of Software Engineering'
                      }
                      className={inputCls}
                    />
                  </div>

                  <div>
                    <label className={labelCls}>
                      {letterType === 'lor_academic' ? 'University / Department' : 'Company / Organization'}
                    </label>
                    <input
                      name="institutionOrCompany"
                      value={form.institutionOrCompany}
                      onChange={handleChange}
                      placeholder={letterType === 'lor_academic' ? 'e.g. School of Computing' : 'e.g. FinTech Solutions Ltd'}
                      className={inputCls}
                    />
                  </div>

                  <div>
                    <label className={labelCls}>Professional / Academic Relationship</label>
                    <input
                      name="relationship"
                      value={form.relationship}
                      onChange={handleChange}
                      placeholder="e.g. Supervised the candidate's senior research thesis for 2 years"
                      className={inputCls}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ── Visa Specific Fields ── */}
            {letterType === 'visa_letter' && (
              <div>
                <p className={sectionCls}>B — Visa Dossier & Financial Information</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>Applicant Home Country / City</label>
                    <input
                      name="homeCountry"
                      value={form.homeCountry}
                      onChange={handleChange}
                      placeholder="e.g. Lahore, Pakistan"
                      className={inputCls}
                    />
                  </div>

                  <div>
                    <label className={labelCls}>Funding Source & Financial Proof</label>
                    <input
                      name="fundingSource"
                      value={form.fundingSource}
                      onChange={handleChange}
                      placeholder="e.g. Fintiba Blocked Account of €11,904 + family savings"
                      className={inputCls}
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className={labelCls}>Ties to Home Country & Career Intent Upon Return</label>
                    <textarea
                      name="homeCountryTies"
                      value={form.homeCountryTies}
                      onChange={handleChange}
                      rows={3}
                      placeholder="e.g. Established family assets, strong industry demand in home country tech sector, commitment to join a leading regional firm as a Senior Security Engineer upon graduation."
                      className={`${inputCls} resize-none`}
                    />
                    <p className={hintCls}>Embassies require solid proof of intent to return home after studies</p>
                  </div>
                </div>
              </div>
            )}

            {/* ── Achievements, Experience & Background ── */}
            <div>
              <p className={sectionCls}>
                {letterType === 'lor_academic'
                  ? 'C — Academic Projects & Candidate Strengths'
                  : letterType === 'lor_professional'
                  ? 'C — Work Contributions & Leadership'
                  : 'C — Applied Projects & Experience'}
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>
                    {letterType === 'lor_academic'
                      ? 'Key Projects, Publications or Lab Work'
                      : 'Key Projects & Measurable Achievements'}
                  </label>
                  <textarea
                    name="achievements"
                    value={form.achievements}
                    onChange={handleChange}
                    rows={4}
                    placeholder="e.g. Designed a distributed consensus prototype using Raft, reducing replication latency by 25%. Published results in university undergraduate symposium."
                    className={`${inputCls} resize-none`}
                  />
                  <p className={hintCls}>Mention specific tools, methodologies, and quantitative results</p>
                </div>

                <div>
                  <label className={labelCls}>
                    {letterType === 'lor_professional'
                      ? 'Work Responsibilities & Execution'
                      : 'Work / Internship / Laboratory Experience'}
                  </label>
                  <textarea
                    name="experience"
                    value={form.experience}
                    onChange={handleChange}
                    rows={4}
                    placeholder="e.g. 6-month software engineering internship. Worked with backend microservices in Go and implemented automated CI/CD pipelines with Docker."
                    className={`${inputCls} resize-none`}
                  />
                  <p className={hintCls}>Mention real responsibilities and team problem solving</p>
                </div>
              </div>
            </div>

            {/* ── Goals & Fit (SOP, Motivation, Visa) ── */}
            {letterType !== 'lor_academic' && letterType !== 'lor_professional' && (
              <div>
                <p className={sectionCls}>D — Goals, Research & Program Synergy</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>Career Goals (Post-Graduation)</label>
                    <textarea
                      name="goals"
                      value={form.goals}
                      onChange={handleChange}
                      rows={3}
                      placeholder="e.g. Lead architecture of cloud security systems at a top technology firm; long-term establish a specialized cybersecurity consultancy."
                      className={`${inputCls} resize-none`}
                    />
                  </div>

                  <div>
                    <label className={labelCls}>Research / Academic Interests</label>
                    <textarea
                      name="researchInterest"
                      value={form.researchInterest}
                      onChange={handleChange}
                      rows={3}
                      placeholder="e.g. High-performance distributed systems, formal verification, and memory safety."
                      className={`${inputCls} resize-none`}
                    />
                  </div>
                </div>

                <div className="mt-4">
                  <label className={labelCls}>
                    Why This University & Program?{' '}
                    <span className="text-[#f5a623] normal-case font-bold tracking-normal">
                      (Crucial for authenticity)
                    </span>
                  </label>
                  <textarea
                    name="whyUniversity"
                    value={form.whyUniversity}
                    onChange={handleChange}
                    rows={3}
                    placeholder="e.g. The program's core focus on distributed algorithms matches my project background. I am eager to join the Chair of Distributed Systems led by Prof. [Name] and leverage the institute's industry ties with [Company/Hub]."
                    className={`${inputCls} resize-none`}
                  />
                  <p className={hintCls}>
                    Naming a specific professor, institute, lab, or curricular module dramatically increases admission success.
                  </p>
                </div>
              </div>
            )}

            {/* ── Error ── */}
            {error && (
              <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3">
                <span className="shrink-0">⚠️</span> {error}
              </div>
            )}

            {/* ── Submit button ── */}
            <button
              type="button"
              onClick={generateLetter}
              disabled={loading || !isFormValid()}
              className="w-full bg-[#1a7a5e] hover:bg-[#145d47] disabled:opacity-40 disabled:cursor-not-allowed
                text-white font-bold py-3.5 rounded-xl transition flex items-center justify-center gap-2 text-sm shadow-sm"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  Drafting high-accuracy {currentCfg.label}…
                </>
              ) : (
                `✨ Generate High-Accuracy ${currentCfg.label.split('(')[0].trim()}`
              )}
            </button>
          </div>
        </div>

        {/* ── Result Card ── */}
        {result && (
          <div
            id="letter-result"
            className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
          >
            <div className="px-4 sm:px-6 py-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <p className="text-[11px] font-bold text-[#2d9e7a] uppercase tracking-widest">Step 2</p>
                <h2 className="text-base sm:text-lg font-bold text-gray-900 mt-0.5">
                  {generatedTitle || currentCfg.label}
                </h2>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-lg border transition
                    bg-gray-50 border-gray-200 text-gray-700 hover:border-[#2d9e7a] hover:text-[#1a7a5e] hover:bg-[#f0faf6]"
                >
                  {copied ? '✅ Copied!' : '📋 Copy Text'}
                </button>
                <button
                  type="button"
                  onClick={handleDownloadTxt}
                  className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-lg border transition
                    bg-gray-50 border-gray-200 text-gray-700 hover:border-[#2d9e7a] hover:text-[#1a7a5e] hover:bg-[#f0faf6]"
                >
                  💾 Download .txt
                </button>
                <button
                  type="button"
                  onClick={handleDownloadDoc}
                  className="flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-lg border bg-[#f0faf6] border-[#b6e8d4] text-[#1a7a5e] hover:bg-[#e0f5ec] transition"
                >
                  📄 Download .doc (Word)
                </button>
              </div>
            </div>

            <div className="p-4 sm:p-6">
              <div className="bg-[#f9f9f7] border border-gray-100 rounded-xl p-4 sm:p-6 shadow-inner">
                <p className="text-gray-800 text-sm leading-8 whitespace-pre-wrap font-sans">
                  {result}
                </p>
              </div>

              <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="flex flex-wrap items-center gap-3">
                  <span className={`text-xs font-bold ${wordCountColor}`}>
                    {wordCount} words
                    {wordCount >= minW && wordCount <= maxW && ' ✓ ideal document length'}
                    {wordCount > 0 && (wordCount < minW || wordCount > maxW) && ' (comprehensive draft)'}
                  </span>
                  <p className="text-xs text-gray-400">
                    Always review and add any specific faculty or laboratory names before formal submission.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
