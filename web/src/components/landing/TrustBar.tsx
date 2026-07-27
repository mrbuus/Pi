import { Counter } from "./shared";

// Зөвхөн баталгаажсан бодит тоо (2026-07-26) — зохиомол статистик хэзээ ч
// ашиглахгүй. Утга өөрчлөгдвөл эндээс засна.
const STATS = [
  { to: 359, suffix: "+", label: "идэвхтэй сурагч" },
  { to: 96.8, suffix: "%", label: "тогтоц (371-ээс 12 гарсан)" },
  { to: 16, suffix: "", label: "ажилтан" },
] as const;

export default function TrustBar() {
  return (
    <section className="relative border-y border-line bg-panel/60 py-10">
      <div className="mx-auto grid max-w-6xl gap-8 px-5 sm:grid-cols-3">
        {STATS.map((s) => (
          <div key={s.label} className="reveal text-center">
            <p className="text-3xl font-extrabold text-ink sm:text-4xl">
              <Counter to={s.to} suffix={s.suffix} />
            </p>
            <p className="mt-1.5 text-sm text-ink-dim">{s.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
