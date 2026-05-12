import Link from 'next/link';

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      {/* Navbar */}
      <nav className="border-b border-white/10 bg-black/80 backdrop-blur-lg">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-indigo-600 flex items-center justify-center font-bold text-base">AI</div>
            <span className="font-bold text-base">AI Admission</span>
          </Link>
          <Link href="/signup" className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium hover:bg-indigo-500 transition">
            Get Started
          </Link>
        </div>
      </nav>

      <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 sm:py-24">
        <div className="mb-10 text-center">
          <p className="text-sm text-indigo-400 uppercase tracking-widest">Get In Touch</p>
          <h1 className="mt-3 text-4xl font-bold">Contact Us</h1>
          <p className="mt-3 text-gray-400 max-w-xl mx-auto">
            Have a question, feedback, or need support? We'd love to hear from you. Reach out and we'll get back to you as soon as possible.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 mb-10">
          {/* Email */}
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 sm:p-8">
            <div className="text-3xl mb-4">✉️</div>
            <h3 className="text-lg font-semibold mb-2">Email Us</h3>
            <p className="text-gray-400 text-sm mb-4">For all inquiries, support requests, and feedback.</p>
            <a
              href="mailto:ariesiantech.officiall@gmail.com"
              className="text-indigo-400 hover:text-indigo-300 text-sm font-medium transition break-all"
            >
              ariesiantech.officiall@gmail.com
            </a>
          </div>

          {/* Response time */}
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6 sm:p-8">
            <div className="text-3xl mb-4">⏱️</div>
            <h3 className="text-lg font-semibold mb-2">Response Time</h3>
            <p className="text-gray-400 text-sm mb-4">We typically respond within 24–48 hours on business days.</p>
            <p className="text-sm text-gray-500">Monday – Friday · 9 AM – 6 PM PKT</p>
          </div>
        </div>

        {/* Topics */}
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6 sm:p-8 mb-10">
          <h2 className="text-xl font-semibold mb-5">What Can We Help With?</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              { icon: '🔑', title: 'Account Issues', desc: 'Login problems, password reset, account deletion' },
              { icon: '💳', title: 'Billing & Payments', desc: 'Subscription questions, payment issues, refund requests' },
              { icon: '🤖', title: 'AI Tool Support', desc: 'SOP generation issues, profile analyzer, chatbot problems' },
              { icon: '💡', title: 'Feature Requests', desc: 'Suggest new features or improvements to the platform' },
              { icon: '🐛', title: 'Bug Reports', desc: 'Report technical issues or unexpected behavior' },
              { icon: '🤝', title: 'Partnerships', desc: 'Business inquiries, collaborations, and partnerships' },
            ].map((item) => (
              <div key={item.title} className="flex items-start gap-3 p-4 rounded-2xl border border-white/5 bg-white/3">
                <span className="text-xl shrink-0">{item.icon}</span>
                <div>
                  <p className="text-sm font-semibold text-white">{item.title}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="text-center rounded-3xl border border-indigo-500/20 bg-indigo-500/10 p-8 sm:p-10">
          <h2 className="text-2xl font-bold mb-3">Ready to Get Started?</h2>
          <p className="text-gray-400 text-sm mb-6">Join students using AI Admission to prepare stronger university applications.</p>
          <Link
            href="/signup"
            className="inline-flex rounded-2xl bg-indigo-600 px-8 py-3.5 text-sm font-medium hover:bg-indigo-500 transition"
          >
            Start Free Today →
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-white/10 bg-black">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 px-4 py-10 text-center sm:px-6 md:flex-row md:text-left">
          <p className="text-sm text-gray-500">© 2026 Ariesian Tech. All rights reserved.</p>
          <div className="flex flex-wrap justify-center gap-6 text-sm text-gray-400">
            <Link href="/privacy" className="hover:text-white transition">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-white transition">Terms & Conditions</Link>
            <Link href="/contact" className="hover:text-white transition">Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
