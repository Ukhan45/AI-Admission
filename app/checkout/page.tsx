'use client';

const PRO_CHECKOUT_URL = 'https://aiadmission.lemonsqueezy.com/checkout/buy/5535bb57-c9d6-4a91-aab7-e58279177c6c';

const FREE_FEATURES = [
  '3 SOP Generations per month',
  '2 Profile Analyses per month',
  '5 University Searches per month',
  '10 AI Chat messages per month',
  'Basic admission scoring',
];

const PRO_FEATURES = [
  'Unlimited SOP Generations',
  'Unlimited Profile Analyses',
  'Unlimited University Searches',
  'Unlimited AI Chat messages',
  'Advanced admission scoring',
  'Priority support',
  '7-day free trial — cancel anytime',
];

export default function Checkout() {
  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold text-gray-900">Simple, Transparent Pricing</h1>
        <p className="text-gray-500 mt-2 text-sm">
          Start free. Upgrade when you are ready. Cancel anytime.
        </p>
      </div>

      {/* Plans */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Free Plan */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-7 flex flex-col">
          <div className="mb-5">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Free</span>
            <div className="mt-2 flex items-end gap-1">
              <span className="text-4xl font-bold text-gray-900">$0</span>
              <span className="text-gray-400 text-sm mb-1">/month</span>
            </div>
            <p className="text-sm text-gray-500 mt-1">Perfect for getting started</p>
          </div>

          <ul className="space-y-3 flex-1 mb-7">
            {FREE_FEATURES.map((f) => (
              <li key={f} className="flex items-start gap-2.5 text-sm text-gray-600">
                <span className="mt-0.5 shrink-0 w-4 h-4 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 text-[10px]">✓</span>
                {f}
              </li>
            ))}
          </ul>

          <div className="bg-gray-50 border border-gray-200 text-gray-500 font-semibold text-sm py-3 rounded-xl text-center">
            Current Plan
          </div>
        </div>

        {/* Pro Plan */}
        <div className="bg-blue-600 rounded-2xl shadow-lg p-7 flex flex-col relative overflow-hidden">
          {/* Popular badge */}
          <div className="absolute top-4 right-4">
            <span className="bg-white text-blue-600 text-[11px] font-bold px-2.5 py-1 rounded-full">
              MOST POPULAR
            </span>
          </div>

          {/* Glow effect */}
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-blue-500 rounded-full opacity-30 blur-2xl" />

          <div className="mb-5 relative">
            <span className="text-xs font-semibold uppercase tracking-wider text-blue-200">Pro</span>
            <div className="mt-2 flex items-end gap-1">
              <span className="text-4xl font-bold text-white">pkr 800</span>
              <span className="text-blue-200 text-sm mb-1">/month</span>
            </div>
            <p className="text-sm text-blue-200 mt-1">Everything you need to get admitted</p>
          </div>

          <ul className="space-y-3 flex-1 mb-7 relative">
            {PRO_FEATURES.map((f) => (
              <li key={f} className="flex items-start gap-2.5 text-sm text-white">
                <span className="mt-0.5 shrink-0 w-4 h-4 rounded-full bg-white/20 flex items-center justify-center text-white text-[10px]">✓</span>
                {f}
              </li>
            ))}
          </ul>

          <a
            href={PRO_CHECKOUT_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="relative bg-white text-blue-600 hover:bg-blue-50 font-bold text-sm py-3.5 rounded-xl text-center transition block"
          >
            Start 7-Day Free Trial →
          </a>
          <p className="text-blue-200 text-[11px] text-center mt-2">No credit card required for trial</p>
        </div>
      </div>

      {/* FAQ */}
      <div className="mt-12">
        <h2 className="text-lg font-bold text-gray-900 mb-5 text-center">Frequently Asked Questions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            {
              q: 'Can I cancel anytime?',
              a: 'Yes. Cancel anytime from your account. You keep Pro access until the end of your billing period.',
            },
            {
              q: 'Is there really a free trial?',
              a: 'Yes — 7 days free on the Pro plan. No charges until the trial ends.',
            },
            {
              q: 'What payment methods are accepted?',
              a: 'Credit/debit cards, Apple Pay, Google Pay, and PayPal are all accepted.',
            },
            {
              q: 'What happens when I hit free limits?',
              a: 'You\'ll be prompted to upgrade. Your existing data is never deleted.',
            },
          ].map((item) => (
            <div key={item.q} className="bg-white rounded-xl border border-gray-100 p-5">
              <p className="font-semibold text-gray-800 text-sm">{item.q}</p>
              <p className="text-gray-500 text-sm mt-1.5">{item.a}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Trust bar */}
      <div className="mt-8 flex items-center justify-center gap-6 flex-wrap">
        <span className="text-xs text-gray-400 flex items-center gap-1.5">🔒 Secure checkout via Lemon Squeezy</span>
        <span className="text-xs text-gray-400 flex items-center gap-1.5">💳 All major cards accepted</span>
        <span className="text-xs text-gray-400 flex items-center gap-1.5">↩️ Cancel anytime</span>
      </div>
    </div>
  );
}
