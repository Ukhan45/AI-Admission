export default function PricingSection() {
  return (
    <section id="pricing" className="border-y border-white/10 bg-white/2">
      <div className="mx-auto max-w-7xl px-6 py-24">
        <div className="text-center">
          <p className="text-sm uppercase tracking-[0.3em] text-indigo-400">Free for everyone</p>
          <h2 className="mt-4 text-4xl font-bold">Every Tool. No Limits. No Cost.</h2>
        </div>

        <div className="mx-auto mt-16 max-w-2xl rounded-3xl border border-indigo-500 bg-indigo-500/10 p-10 text-center shadow-2xl shadow-indigo-500/20">
          <h3 className="text-3xl font-bold">Free</h3>
          <p className="mt-4 text-5xl font-bold">$0</p>
          <ul className="mt-8 space-y-4 text-gray-200">
            <li>✔ Unlimited SOP Generation</li>
            <li>✔ Unlimited Profile Analysis</li>
            <li>✔ University and Scholarship Search</li>
            <li>✔ Unlimited AI Chat</li>
            <li>✔ Document Checking and all other tools</li>
          </ul>
          <a href="/signup" className="mt-10 block w-full rounded-2xl bg-indigo-600 py-4 text-center font-medium hover:bg-indigo-500 transition">
            Create a Free Account
          </a>
        </div>
      </div>
    </section>
  );
}
