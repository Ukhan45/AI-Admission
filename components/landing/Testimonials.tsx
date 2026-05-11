export default function Testimonials() {
  const reviews = [
    'The SOP generator saved me hours of work and helped me structure my application professionally.',
    'The university recommendations were surprisingly accurate for my profile.',
    'This platform made the entire admission process much easier and less stressful.',
  ];

  return (
    <section>
      <div className="mx-auto max-w-7xl px-6 py-24">
        <div className="text-center">
          <p className="text-sm uppercase tracking-[0.3em] text-indigo-400">Testimonials</p>
          <h2 className="mt-4 text-4xl font-bold">Students Love Using AI Admission</h2>
        </div>

        <div className="mt-16 grid gap-6 md:grid-cols-3">
          {reviews.map((review, i) => (
            <div key={i} className="rounded-3xl border border-white/10 bg-white/3 p-8">
              <div className="mb-4 text-2xl">⭐️⭐️⭐️⭐️⭐️</div>
              <p className="leading-8 text-gray-300">“{review}”</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
