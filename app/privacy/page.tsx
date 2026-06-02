import Link from 'next/link';

export default function PrivacyPolicy() {
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
          <h1 className="mt-3 text-4xl font-bold text-[#085041]">Privacy Policy</h1>
          <p className="mt-3 text-[#5F5E5A] text-sm">Last updated: June 2026 · Effective immediately</p>
        </div>

        <div className="space-y-10 text-gray-700 text-sm leading-7">

          <section>
            <h2 className="text-xl font-semibold text-[#085041] mb-3">1. Introduction</h2>
            <p className="text-[#5F5E5A]">Welcome to UniQuest AI (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;), a product developed and operated by Ariesian Tech. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our platform at ai-admission-eta.vercel.app and use our services. Please read this policy carefully. If you disagree with its terms, please discontinue use of our platform.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#085041] mb-3">2. Information We Collect</h2>
            <p className="text-[#5F5E5A] mb-3">We collect information you provide directly to us and information collected automatically when you use our platform.</p>
            <h3 className="text-base font-semibold text-[#085041] mb-2">2.1 Information You Provide</h3>
            <ul className="list-disc pl-5 space-y-2 mb-4">
              <li>Account information: email address and password when you register</li>
              <li>Profile data: academic details such as CGPA, degree, field of study, country preference, and budget</li>
              <li>Generated content: Statements of Purpose (SOPs) you generate using our platform</li>
              <li>Payment information: processed securely through Lemon Squeezy; we do not store card details</li>
              <li>Communications: messages you send via our contact form or support channels</li>
            </ul>
            <h3 className="text-base font-semibold text-[#085041] mb-2">2.2 Information Collected Automatically</h3>
            <ul className="list-disc pl-5 space-y-2">
              <li>Usage data: pages visited, features used, and actions taken on the platform</li>
              <li>Device information: browser type, operating system, and IP address</li>
              <li>Cookies and session tokens used for authentication and platform functionality</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#085041] mb-3">3. How We Use Your Information</h2>
            <p className="mb-3">We use the information we collect to:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li>Provide, operate, and improve our AI-powered admission tools</li>
              <li>Personalize your experience and generate relevant university recommendations</li>
              <li>Process payments and manage your subscription plan</li>
              <li>Send you account-related notifications and service updates</li>
              <li>Respond to your inquiries and provide customer support</li>
              <li>Monitor and analyze usage patterns to improve platform performance</li>
              <li>Comply with legal obligations and enforce our terms of service</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#085041] mb-3">4. Data Storage and Security</h2>
            <p className="text-[#5F5E5A] mb-3">Your data is stored securely using Firebase (Google Cloud), a trusted cloud platform with industry-standard encryption and security compliance (SOC 2, ISO 27001). We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction.</p>
            <p>Authentication is handled through Firebase Auth with encrypted session tokens. Passwords are never stored in plain text and are managed securely by Google&#39;s infrastructure. Payment processing is handled entirely by Lemon Squeezy under PCI-DSS compliance.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#085041] mb-3">5. Third-Party Services</h2>
            <p className="text-[#5F5E5A] mb-3">We use the following third-party services to operate our platform:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong className="text-[#085041]">Firebase (Google Cloud)</strong> — database and authentication</li>
              <li><strong className="text-[#085041]">Groq AI (LLaMA)</strong> — AI language model for generating SOPs and analysis</li>
              <li><strong className="text-[#085041]">Lemon Squeezy</strong> — payment processing and subscription management</li>
              <li><strong className="text-[#085041]">Vercel</strong> — platform hosting and deployment</li>
            </ul>
            <p className="mt-3">Each of these services has their own privacy policies governing data use. We encourage you to review them.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#085041] mb-3">6. Data Sharing and Disclosure</h2>
            <p className="mb-3">We do not sell, trade, or rent your personal information to third parties. We may disclose your information only in the following circumstances:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li>With your explicit consent</li>
              <li>To service providers who assist in operating our platform (listed above)</li>
              <li>When required by law or to comply with legal process</li>
              <li>To protect the rights, property, or safety of UniQuest AI, our users, or the public</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#085041] mb-3">7. Data Retention</h2>
            <p>We retain your personal information for as long as your account is active or as needed to provide our services. Generated SOPs and profile data are retained to provide history and continuity of service. You may request deletion of your data at any time by contacting us at ariesiantech.officiall@gmail.com.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#085041] mb-3">8. Your Rights</h2>
            <p className="mb-3">Depending on your location, you may have the following rights regarding your personal data:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong className="text-[#085041]">Access:</strong> Request a copy of the personal data we hold about you</li>
              <li><strong className="text-[#085041]">Correction:</strong> Request correction of inaccurate or incomplete data</li>
              <li><strong className="text-[#085041]">Deletion:</strong> Request deletion of your personal data</li>
              <li><strong className="text-[#085041]">Portability:</strong> Request transfer of your data in a machine-readable format</li>
              <li><strong className="text-[#085041]">Objection:</strong> Object to processing of your data for certain purposes</li>
            </ul>
            <p className="mt-3">To exercise any of these rights, contact us at ariesiantech.officiall@gmail.com.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#085041] mb-3">9. Cookies</h2>
            <p>We use cookies and similar tracking technologies to maintain your authentication session and improve platform functionality. These are strictly necessary cookies and do not track you across other websites. You can disable cookies in your browser settings, but this may affect your ability to log in and use the platform.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#085041] mb-3">10. Children&#39;s Privacy</h2>
            <p>Our platform is not directed to children under the age of 13. We do not knowingly collect personal information from children under 13. If you believe we have inadvertently collected such information, please contact us immediately.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#085041] mb-3">11. Changes to This Policy</h2>
            <p>We may update this Privacy Policy from time to time. We will notify you of significant changes by posting the new policy on this page with an updated effective date. Your continued use of the platform after changes constitutes acceptance of the updated policy.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-[#085041] mb-3">12. Contact Us</h2>
            <p className="text-[#5F5E5A]">If you have questions, concerns, or requests regarding this Privacy Policy, please contact us:</p>
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
