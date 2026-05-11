type Step = {
  title: string;
  description: string;
};

export default function HowItWorks({ steps }: { steps: Step[] }) {
  return (
    <section id="how" className="border-y border-white/10 bg-white/2">
      <div className="mx-auto max-w-7xl px-6 py-24">
        <div className="text-center">
          <p className="text-sm uppercase tracking-[0.3em] text-indigo-400">How It Works</p>
          <h2 className="mt-4 text-4xl font-bold">Simple, Fast, Intelligent</h2>
        </div>

        <div className="mt-16 grid gap-8 md:grid-cols-3">
          {steps.map((step, index) => (
            <div key={step.title} className="rounded-3xl border border-white/10 bg-black/30 p-8">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 text-xl font-bold">
                {index + 1}
              </div>
              <h3 className="mt-6 text-2xl font-semibold">{step.title}</h3>
              <p className="mt-4 leading-7 text-gray-400">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
