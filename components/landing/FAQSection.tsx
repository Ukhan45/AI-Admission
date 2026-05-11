type FAQ = {
  q: string;
  a: string;
};

export default function FAQSection({ faqs }: { faqs: FAQ[] }) {
  return (
    <section id="faq">
      <div className="mx-auto max-w-5xl px-6 py-24">
        <div className="text-center">
          <p className="text-sm uppercase tracking-[0.3em] text-indigo-400">FAQ</p>
          <h2 className="mt-4 text-4xl font-bold">Frequently Asked Questions</h2>
        </div>

        <div className="mt-16 space-y-6">
          {faqs.map((faq) => (
            <div key={faq.q} className="rounded-3xl border border-white/10 bg-white/3 p-8">
              <h3 className="text-xl font-semibold">{faq.q}</h3>
              <p className="mt-4 leading-7 text-gray-400">{faq.a}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
