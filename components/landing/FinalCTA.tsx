export default function FinalCTA() {
  return (
    <section className="relative overflow-hidden border-t border-white/10">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(99,102,241,0.25),transparent_50%)]" />

      <div className="relative mx-auto max-w-5xl px-6 py-28 text-center">
        <h2 className="text-5xl font-bold leading-tight">Start Your Admission Journey with AI</h2>
        <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-gray-400">
          Join students using AI Admission to prepare stronger university applications faster and smarter.
        </p>
        <a href="/signup" className="mt-10 inline-flex rounded-2xl bg-indigo-600 px-10 py-5 text-lg font-medium hover:bg-indigo-500 transition">
          Get Started Free
        </a>
      </div>
    </section>
  );
}
