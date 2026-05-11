import Link from 'next/link';

export default function HeroSection() {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(99,102,241,0.25),transparent_40%)]" />

      <div className="relative mx-auto grid max-w-7xl grid-cols-1 items-center gap-16 px-6 py-24 lg:grid-cols-2">
        <div>
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-indigo-500/20 bg-indigo-500/10 px-4 py-2 text-sm text-indigo-300">
            🚀 AI-Powered University Admission Platform
          </div>

          <h1 className="text-5xl font-bold leading-tight md:text-6xl">
            Get Admitted <span className="text-indigo-500">Smarter</span> with AI
          </h1>

          <p className="mt-6 max-w-xl text-lg leading-8 text-gray-400">
            Generate SOPs, analyze your profile, discover universities, and prepare your applications — all in one intelligent platform.
          </p>

          <div className="mt-8 flex flex-wrap gap-4">
            <Link href="/signup" className="rounded-2xl bg-indigo-600 px-7 py-4 font-medium hover:bg-indigo-500 transition">
              Start
            </Link>

            <a
              href="https://www.youtube.com/watch?v=dQw4w9WgXcQ"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-2xl border border-white/10 px-7 py-4 font-medium hover:bg-white/10 transition"
            >
              Watch Demo
            </a>
          </div>

          <div className="mt-10 flex flex-wrap gap-4 text-sm text-gray-400">
            <div className="rounded-full border border-white/10 px-4 py-2">🤖 AI Powered</div>
            <div className="rounded-full border border-white/10 px-4 py-2">🎓 University Matching</div>
            <div className="rounded-full border border-white/10 px-4 py-2">🔒 Secure Platform</div>
          </div>
        </div>

        <div className="relative">
          <div className="absolute -inset-4 rounded-4xl bg-indigo-500/20 blur-3xl" />

          <div className="relative rounded-4xl border border-white/10 bg-white/5 p-5 backdrop-blur-xl shadow-2xl">
            <div className="mb-4 flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-red-500" />
              <div className="h-3 w-3 rounded-full bg-yellow-500" />
              <div className="h-3 w-3 rounded-full bg-green-500" />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl bg-black/40 p-5 border border-white/10">
                <h3 className="text-lg font-semibold">Admission Score</h3>
                <p className="mt-2 text-4xl font-bold text-indigo-400">87%</p>
                <p className="mt-2 text-sm text-gray-400">Strong profile for Canadian universities.</p>
              </div>

              <div className="rounded-2xl bg-black/40 p-5 border border-white/10">
                <h3 className="text-lg font-semibold">SOP Generated</h3>
                <p className="mt-2 text-4xl font-bold text-indigo-400">12</p>
                <p className="mt-2 text-sm text-gray-400">AI-generated SOP drafts available.</p>
              </div>

              <div className="rounded-2xl bg-black/40 p-5 border border-white/10 md:col-span-2">
                <h3 className="mb-4 text-lg font-semibold">Recommended Universities</h3>

                <div className="space-y-3">
                  <div className="flex items-center justify-between rounded-xl bg-white/5 px-4 py-3">
                    <div>
                      <p className="font-medium">University of Toronto</p>
                      <p className="text-sm text-gray-400">Canada</p>
                    </div>
                    <span className="rounded-full bg-green-500/10 px-3 py-1 text-sm text-green-400">High Match</span>
                  </div>

                  <div className="flex items-center justify-between rounded-xl bg-white/5 px-4 py-3">
                    <div>
                      <p className="font-medium">University of Melbourne</p>
                      <p className="text-sm text-gray-400">Australia</p>
                    </div>
                    <span className="rounded-full bg-yellow-500/10 px-3 py-1 text-sm text-yellow-400">Medium Match</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
