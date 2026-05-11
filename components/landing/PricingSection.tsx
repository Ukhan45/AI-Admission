export default function PricingSection() {
  return (
    <section id="pricing" className="border-y border-white/10 bg-white/2">
      <div className="mx-auto max-w-7xl px-6 py-24">
        <div className="text-center">
          <p className="text-sm uppercase tracking-[0.3em] text-indigo-400">Pricing</p>
          <h2 className="mt-4 text-4xl font-bold">Start Free, Upgrade Anytime</h2>
        </div>

        <div className="mt-16 grid gap-8 lg:grid-cols-2">
          <div className="rounded-3xl border border-white/10 bg-black/40 p-10">
            <h3 className="text-3xl font-bold">Free</h3>
            <p className="mt-4 text-5xl font-bold">$0</p>

            <ul className="mt-8 space-y-4 text-gray-300">
              <li>✔ Limited SOP Generation</li>
              <li>✔ Basic Profile Analysis</li>
              <li>✔ University Search</li>
              <li>✔ AI Chat Access</li>
            </ul>

            <a href="/signup" className="mt-10 block w-full rounded-2xl border border-white/10 py-4 text-center hover:bg-white/10 transition">
              Get Started
            </a>
          </div>

          <div className="rounded-3xl border border-indigo-500 bg-indigo-500/10 p-10 shadow-2xl shadow-indigo-500/20">
            <div className="mb-4 inline-flex rounded-full bg-indigo-500 px-4 py-2 text-sm font-medium">Most Popular</div>

            <h3 className="text-3xl font-bold">Pro</h3>
            <p className="mt-4 text-5xl font-bold">$12</p>

            <ul className="mt-8 space-y-4 text-gray-200">
              <li>✔ Unlimited SOP Generation</li>
              <li>✔ Advanced AI Analysis</li>
              <li>✔ Priority University Matching</li>
              <li>✔ Premium AI Assistance</li>
              <li>✔ Future Scholarship Finder</li>
            </ul>

            <a href="/checkout" className="mt-10 block w-full rounded-2xl bg-indigo-600 py-4 text-center font-medium hover:bg-indigo-500 transition">
              Upgrade to Pro
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
