type Feature = {
  title: string;
  description: string;
  icon: string;
};

export default function FeaturesSection({ features }: { features: Feature[] }) {
  return (
    <section id="features">
      <div className="mx-auto max-w-7xl px-6 py-24">
        <div className="text-center">
          <p className="text-sm uppercase tracking-[0.3em] text-indigo-400">Features</p>
          <h2 className="mt-4 text-4xl font-bold">Everything You Need for University Admissions</h2>
        </div>

        <div className="mt-16 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <div
              key={feature.title}
              className="rounded-3xl border border-white/10 bg-white/3 p-8 hover:border-indigo-500/30 hover:bg-indigo-500/5 transition"
            >
              <div className="text-4xl">{feature.icon}</div>
              <h3 className="mt-5 text-2xl font-semibold">{feature.title}</h3>
              <p className="mt-4 leading-7 text-gray-400">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
