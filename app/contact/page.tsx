import Link from 'next/link';

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-[#FFFBF5] text-[#2C2C2A]">
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
        <div className="mb-10 text-center">
          <p className="text-sm text-[#1D9E75] uppercase tracking-widest">Get In Touch</p>
          <h1 className="mt-3 text-4xl font-bold text-[#085041]">Contact Us</h1>
          <p className="mt-3 text-[#5F5E5A] max-w-xl mx-auto">
            Have a question, feedback, or need support? We'd love to hear from you. Reach out and we'll get back to you as soon as possible.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 mb-10">
          {/* Email */}
          <div className="rounded-3xl border border-[#DDEDE8] bg-white p-6 sm:p-8">
            <div className="text-3xl mb-4">✉️</div>
            <h3 className="text-lg font-semibold mb-2 text-[#085041]">Email Us</h3>
            <p className="text-[#5F5E5A] text-sm mb-4">For all inquiries, support requests, and feedback.</p>
            <a
              href="mailto:ariesiantech.officiall@gmail.com"
              className="text-[#1D9E75] hover:text-[#0F6E56] text-sm font-medium transition break-all"
            >
              ariesiantech.officiall@gmail.com
            </a>
          </div>

          {/* Response time */}
          <div className="rounded-3xl border border-[#DDEDE8] bg-white p-6 sm:p-8">
            <div className="text-3xl mb-4">⏱️</div>
            <h3 className="text-lg font-semibold mb-2 text-[#085041]">Response Time</h3>
            <p className="text-[#5F5E5A] text-sm mb-4">We typically respond within 24–48 hours on business days.</p>
            <p className="text-sm text-gray-600">Monday – Friday · 9 AM – 6 PM PKT</p>
          </div>
        </div>

        {/* Topics */}
        <div className="rounded-3xl border border-[#DDEDE8] bg-white p-6 sm:p-8 mb-10">
          <h2 className="text-xl font-semibold mb-5 text-[#085041]">What Can We Help With?</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              { icon: '🔑', title: 'Account Issues', desc: 'Login problems, password reset, account deletion' },
              { icon: '💳', title: 'Billing & Payments', desc: 'Subscription questions, payment issues, refund requests' },
              { icon: '🤖', title: 'AI Tool Support', desc: 'SOP generation issues, profile analyzer, chatbot problems' },
              { icon: '💡', title: 'Feature Requests', desc: 'Suggest new features or improvements to the platform' },
              { icon: '🐛', title: 'Bug Reports', desc: 'Report technical issues or unexpected behavior' },
              { icon: '🤝', title: 'Partnerships', desc: 'Business inquiries, collaborations, and partnerships' },
            ].map((item) => (
              <div key={item.title} className="flex items-start gap-3 p-4 rounded-2xl border border-[#DDEDE8] bg-white">
                <span className="text-xl shrink-0">{item.icon}</span>
                <div>
                  <p className="text-sm font-semibold text-[#085041]">{item.title}</p>
                  <p className="text-xs text-[#5F5E5A] mt-0.5">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="text-center rounded-3xl border border-[#DDEDE8] bg-white p-8 sm:p-10">
          <h2 className="text-2xl font-bold mb-3 text-[#085041]">Ready to Get Started?</h2>
          <p className="text-[#5F5E5A] text-sm mb-6">Join students using UniQuest AI to prepare stronger university applications.</p>
          <Link
            href="/signup"
            className="inline-flex rounded-2xl bg-[#1D9E75] px-8 py-3.5 text-sm font-medium text-white hover:bg-[#0F6E56] transition"
          >
            Start Free Today →
          </Link>
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
