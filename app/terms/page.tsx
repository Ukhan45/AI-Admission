import Link from 'next/link';

export default function TermsAndConditions() {
  return (
    <div className="min-h-screen bg-[#FFFBF5] text-[#2C2C2A]" style={{ fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
      {/* Navbar */}
      <nav className="border-b border-[#E1F5EE] bg-white/90 backdrop-blur-lg">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-[#1D9E75] flex items-center justify-center font-bold text-base text-white">AI</div>
            <span className="font-bold text-base text-[#2C2C2A]">UniQuest AI</span>
          </Link>
          <Link href="/signup" className="rounded-xl bg-[#1D9E75] px-4 py-2 text-sm font-medium text-white hover:bg-[#0F6E56] transition">
            Get Started
          </Link>
        </div>
      </nav>

      <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 sm:py-24">
        <div className="mb-10">
          <p className="text-sm text-[#1D9E75] uppercase tracking-widest">Legal</p>
          <h1 className="mt-3 text-4xl font-bold text-[#085041]">Terms & Conditions</h1>
          <p className="mt-3 text-[#5F5E5A] text-sm">Last updated: June 2026 · Effective immediately</p>
        </div>

        <div className="space-y-10 text-gray-700 text-sm leading-7">

          <section>
            <h2 className="text-xl font-semibold text-[#085041] mb-3">1. Acceptance of Terms</h2>
            <p className="text-[#5F5E5A]">By accessing or using UniQuest AI (&quot;the Platform&quot;), operated by Ariesian Tech, you agree to be bound by these Terms and Conditions (&quot;Terms&quot;). If you do not agree to these Terms, please do not use the Platform. These Terms apply to all visitors, users, and others who access or use the Platform.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#085041] mb-3">2. Description of Service</h2>
            <p className="text-[#5F5E5A] mb-3">UniQuest AI is an AI-powered university admission assistance platform that provides the following services:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li>AI-generated Statements of Purpose (SOPs) based on user-provided information</li>
              <li>Academic profile analysis and admission scoring</li>
              <li>University discovery and recommendation based on user preferences</li>
              <li>AI chat assistant for admission-related queries</li>
              <li>Document verification tools</li>
              <li>Centralized dashboard to track admission progress</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#085041] mb-3">3. User Accounts</h2>
            <p className="text-[#5F5E5A] mb-3">To access certain features of the Platform, you must create an account. You agree to:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li>Provide accurate, current, and complete information during registration</li>
              <li>Maintain and promptly update your account information</li>
              <li>Maintain the security of your password and accept responsibility for all activity under your account</li>
              <li>Notify us immediately of any unauthorized access to your account</li>
              <li>Not share your account credentials with any third party</li>
            </ul>
            <p className="mt-3">We reserve the right to suspend or terminate accounts that violate these Terms.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#085041] mb-3">4. Subscription Plans and Payments</h2>
            <h3 className="text-base font-semibold text-[#085041] mb-2">4.1 Free Plan</h3>
            <p className="text-[#5F5E5A] mb-3">The Free Plan includes limited usage of platform features including 3 SOP generations, 2 profile analyses, and 10 AI chat messages per billing period.</p>
            <h3 className="text-base font-semibold text-[#085041] mb-2">4.2 Pro Plan</h3>
            <p className="mb-3">The Pro Plan is available at PKR 800 per month and provides unlimited access to all platform features. A 7-day free trial is offered with no charge until the trial ends.</p>
            <h3 className="text-base font-semibold text-[#085041] mb-2">4.3 Billing</h3>
            <ul className="list-disc pl-5 space-y-2">
              <li>Subscriptions are billed monthly through Lemon Squeezy</li>
              <li>You may cancel your subscription at any time; access continues until the end of the billing period</li>
              <li>We reserve the right to change pricing with 30 days&#39; notice to existing subscribers</li>
              <li>Refunds are handled at our discretion on a case-by-case basis</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#085041] mb-3">5. Acceptable Use</h2>
            <p className="text-[#5F5E5A] mb-3">You agree not to use the Platform to:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li>Submit false or misleading information about your academic credentials</li>
              <li>Use AI-generated SOPs to misrepresent your abilities or qualifications to universities</li>
              <li>Attempt to reverse-engineer, hack, or interfere with the Platform&#39;s systems</li>
              <li>Scrape, crawl, or use automated tools to extract data from the Platform</li>
              <li>Use the Platform for any illegal or unauthorized purpose</li>
              <li>Violate any local, national, or international laws or regulations</li>
              <li>Transmit any viruses, malware, or harmful code</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#085041] mb-3">6. AI-Generated Content Disclaimer</h2>
            <p className="text-[#5F5E5A] mb-3">The Platform uses artificial intelligence to generate SOPs, analyze profiles, and provide university recommendations. You acknowledge and agree that:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li>AI-generated content is provided as a starting point and should be reviewed and edited before use</li>
              <li>We do not guarantee the accuracy, completeness, or suitability of AI-generated content for any specific university</li>
              <li>Admission decisions are made solely by universities and are beyond our control</li>
              <li>Profile scores and university recommendations are estimates and not guarantees of admission outcomes</li>
              <li>You are responsible for reviewing and verifying all AI-generated content before submitting to universities</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#085041] mb-3">7. Intellectual Property</h2>
            <p className="text-[#5F5E5A] mb-3">The Platform and its original content, features, and functionality are owned by Ariesian Tech and are protected by international copyright, trademark, and other intellectual property laws.</p>
            <p>You retain ownership of the personal information you provide. By using the Platform, you grant us a non-exclusive, worldwide, royalty-free license to use your data solely to provide and improve our services.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#085041] mb-3">8. Limitation of Liability</h2>
            <p className="text-[#5F5E5A] mb-3">To the fullest extent permitted by applicable law, Ariesian Tech shall not be liable for:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li>Any indirect, incidental, special, consequential, or punitive damages</li>
              <li>Loss of profits, data, goodwill, or other intangible losses</li>
              <li>Admission outcomes or decisions made by universities based on AI-generated content</li>
              <li>Any errors or inaccuracies in university information or recommendations</li>
              <li>Service interruptions or technical failures</li>
            </ul>
            <p className="mt-3">Our total liability to you for any claims arising from use of the Platform shall not exceed the amount you paid us in the 12 months preceding the claim.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#085041] mb-3">9. Disclaimer of Warranties</h2>
            <p className="text-[#5F5E5A]">The Platform is provided on an &quot;as is&quot; and &quot;as available&quot; basis without warranties of any kind, either express or implied, including but not limited to implied warranties of merchantability, fitness for a particular purpose, or non-infringement. We do not warrant that the Platform will be uninterrupted, secure, or error-free.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#085041] mb-3">10. Termination</h2>
            <p className="text-[#5F5E5A]">We reserve the right to suspend or terminate your access to the Platform at our sole discretion, without notice, for conduct that we believe violates these Terms or is harmful to other users, third parties, or the Platform. Upon termination, your right to use the Platform ceases immediately.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#085041] mb-3">11. Governing Law</h2>
            <p className="text-[#5F5E5A]">These Terms shall be governed and construed in accordance with the laws of Pakistan, without regard to its conflict of law provisions. Any disputes arising under these Terms shall be subject to the exclusive jurisdiction of the courts located in Pakistan.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#085041] mb-3">12. Changes to Terms</h2>
            <p className="text-[#5F5E5A]">We reserve the right to modify these Terms at any time. We will provide notice of significant changes by updating the effective date at the top of this page. Your continued use of the Platform after changes are posted constitutes your acceptance of the revised Terms.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#085041] mb-3">13. Contact Us</h2>
            <p>If you have questions about these Terms, please contact us:</p>
            <div className="mt-3 rounded-2xl border border-[#DDEDE8] bg-white p-5">
              <p className="font-semibold text-[#085041]">Ariesian Tech</p>
              <p className="mt-1">Email: <a href="mailto:ariesiantech.officiall@gmail.com" className="text-[#1D9E75] hover:text-[#0F6E56]">ariesiantech.officiall@gmail.com</a></p>
              <p className="mt-1">Platform: UniQuest AI</p>
            </div>
          </section>

        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-[#E1F5EE] bg-white">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 px-4 py-10 text-center sm:px-6 md:flex-row md:text-left">
          <p className="text-sm text-[#5F5E5A]">© 2026 Ariesian Tech. All rights reserved.</p>
          <div className="flex flex-wrap justify-center gap-6 text-sm text-[#5F5E5A]">
            <Link href="/privacy" className="hover:text-[#1D9E75] transition">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-[#1D9E75] transition">Terms & Conditions</Link>
            <Link href="/contact" className="hover:text-[#1D9E75] transition">Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
