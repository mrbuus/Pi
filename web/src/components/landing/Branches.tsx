import { BRANCHES, PHONES } from "@/lib/orgInfo";

export default function Branches() {
  return (
    <section id="branches" className="relative scroll-mt-20 py-24">
      <div className="mx-auto max-w-6xl px-5">
        <p className="reveal text-sm font-bold uppercase tracking-[0.2em] text-brand">
          Салбарууд
        </p>
        <h2 className="reveal mt-3 max-w-2xl text-3xl font-extrabold md:text-4xl">
          Танд ойрхон салбарт очно уу
        </h2>
        <div className="mt-12 grid gap-5 md:grid-cols-2">
          {BRANCHES.map((b, i) => (
            <div
              key={b.id}
              className="reveal rounded-2xl border border-line bg-panel p-7"
              style={{ transitionDelay: `${i * 90}ms` }}
            >
              <p className="text-xs font-bold uppercase tracking-wider text-brand">
                {b.district}
              </p>
              <h3 className="mt-1.5 text-xl font-extrabold text-ink">
                {b.label}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-ink-dim">
                {b.address}
              </p>
            </div>
          ))}
        </div>

        <div className="reveal mt-8 rounded-2xl border border-line bg-panel p-6 text-center">
          <p className="text-sm font-semibold text-ink-dim">Утсаар холбогдох</p>
          <div className="mt-2 flex flex-wrap justify-center gap-x-6 gap-y-1">
            {PHONES.map((phone) => (
              <a
                key={phone}
                href={`tel:${phone.replace(/\s/g, "")}`}
                className="text-lg font-bold text-brand hover:underline"
              >
                {phone}
              </a>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
