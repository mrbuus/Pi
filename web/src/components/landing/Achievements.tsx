import LeadForm from "./LeadForm";

// Зөвхөн баталгаажсан бодит тоо (2026-07-26) ашиглана — сурагчийн
// тоо/дүн ХЭЗЭЭ Ч зохиохгүй.
const BREAKDOWN = [
  { label: "12-р анги", value: "209" },
  { label: "11-р анги", value: "76" },
  { label: "9-10-р анги", value: "74" },
] as const;

const HIGHLIGHTS = [
  {
    value: "80+",
    label: "өөр сургуулиас ирсэн сурагчид",
    detail: "Улаанбаатарын өөр өөр дүүргийн сургуулиудаас итгэж ирдэг.",
  },
  {
    value: "88%",
    label: "секц дүүрсэн (251/286)",
    detail: "Суудлын тоо хязгаарлагдмал — эрт бүртгүүлсэн нь тав тухтай суудалтай.",
  },
  {
    value: "2",
    label: "салбартай",
    detail: "16 ажилтантай, тогтвортой үйл ажиллагаатай сургалтын төв.",
  },
] as const;

export default function Achievements() {
  return (
    <section id="achievements" className="relative scroll-mt-20 py-24">
      <div className="mx-auto max-w-6xl px-5">
        <p className="reveal text-sm font-bold uppercase tracking-[0.2em] text-brand">
          Бидний амжилтууд
        </p>
        <h2 className="reveal mt-3 max-w-2xl text-3xl font-extrabold md:text-4xl">
          Тоогоор батлагдсан тогтвортой үр дүн
        </h2>

        <div className="reveal mt-10 grid gap-4 rounded-2xl border border-line bg-panel p-6 sm:grid-cols-3">
          <p className="sm:col-span-3 text-sm font-semibold text-ink-dim">
            359 идэвхтэй сурагчийн ангиллаар:
          </p>
          {BREAKDOWN.map((b) => (
            <div key={b.label} className="text-center">
              <p className="text-2xl font-extrabold text-ink">{b.value}</p>
              <p className="mt-1 text-sm text-ink-dim">{b.label}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 grid gap-5 md:grid-cols-3">
          {HIGHLIGHTS.map((h, i) => (
            <div
              key={h.label}
              className="reveal rounded-2xl border border-line bg-panel p-6"
              style={{ transitionDelay: `${i * 90}ms` }}
            >
              <p className="text-3xl font-extrabold text-brand">{h.value}</p>
              <p className="mt-1 text-sm font-bold text-ink">{h.label}</p>
              <p className="mt-2 text-sm leading-relaxed text-ink-dim">
                {h.detail}
              </p>
            </div>
          ))}
        </div>

        {/* TODO: төвөөс бодит утга авах — нэртэй сурагчийн жишээ (нэр,
            хичээл, өмнөх→дараах оноо). Зөвшөөрөл авалгүй, зохиомол сурагч
            зохиож бичихгүй. */}
        <div className="reveal mt-6 rounded-2xl border border-dashed border-line p-6 text-center">
          <p className="text-sm font-semibold text-ink-dim">
            Нэртэй сурагчдын амжилтын түүх (нэр · хичээл · өмнөх→дараах оноо)
            удахгүй нэмэгдэнэ.
          </p>
        </div>

        <div className="mx-auto mt-10 max-w-xl">
          <LeadForm
            title="Таны хүүхдийн ээлж"
            subtitle="Дараагийн амжилтын түүх тань болъё — мэдээллээ үлдээгээрэй."
          />
        </div>
      </div>
    </section>
  );
}
