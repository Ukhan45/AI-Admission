export default function ProblemSolution() {
  return (
    <section className="border-t border-white/10 bg-white/2">
      <div className="mx-auto max-w-7xl px-6 py-24">
        <div className="grid gap-10 lg:grid-cols-2">
          <div className="rounded-3xl border border-red-500/10 bg-red-500/5 p-10">
            <h2 className="text-3xl font-bold">The Problem</h2>
            <ul className="mt-6 space-y-4 text-gray-300">
              <li>❌ Students struggle with writing SOPs</li>
              <li>❌ Finding suitable universities is confusing</li>
              <li>❌ Admission chances are unclear</li>
              <li>❌ Application documents often contain mistakes</li>
            </ul>
          </div>

          <div className="rounded-3xl border border-indigo-500/10 bg-indigo-500/5 p-10">
            <h2 className="text-3xl font-bold">Our Solution</h2>
            <p className="mt-6 text-lg leading-8 text-gray-300">
              AI Admission simplifies the entire admission journey using artificial intelligence — from SOP generation to university matching and profile analysis.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
