import LeadForm from "./LeadForm";

/**
 * Жил бүрийн ЭЕШ-ийн үр дүн — тогтвортой, амьдардаггүй тоо.
 *
 * ⚠️ Эзэн (2026-07-27) эдгээр тоог ОДООГООР МЭДЭХГҮЙ гэдгээ тодорхой хэлсэн.
 * Зохиомол он, тоо ХЭЗЭЭ Ч бичихгүй — хоосон "" утгатай мөрүүд үлдээж,
 * доор автоматаар "20__" / "__" гэж харуулна. Бодит тоо гарч ирвэл энэ
 * массивт нэг мөр нэмэх/засахад л хангалттай.
 */
interface YearlyExamResult {
  /** жишээ нь "2025" — "20" гэсэн угтвар автоматаар нэмэгддэг тул сүүлийн 2 оронг л бич */
  yearSuffix: string;
  scored700Plus: string;
  scored600Plus: string;
}

const YEARLY_EXAM_RESULTS: YearlyExamResult[] = [
  { yearSuffix: "", scored700Plus: "", scored600Plus: "" }, // TODO: төвөөс бодит тоо авах
  { yearSuffix: "", scored700Plus: "", scored600Plus: "" }, // TODO: төвөөс бодит тоо авах
  { yearSuffix: "", scored700Plus: "", scored600Plus: "" }, // TODO: төвөөс бодит тоо авах
];

/** Баталгаажсан, тогтвортой суурь тоо (2026-07-26) — амжилтын жагсаалтын дараа нам дуугаар. */
const STABLE_FACTS = [
  { value: "2", label: "салбартай" },
  { value: "359", label: "идэвхтэй сурагчтай" },
  { value: "16", label: "ажилтантай" },
] as const;

export default function Achievements() {
  return (
    <section id="achievements" className="relative scroll-mt-20 py-24">
      <div className="mx-auto max-w-6xl px-5">
        <p className="reveal text-sm font-bold uppercase tracking-[0.2em] text-brand">
          Бидний амжилтууд
        </p>
        <h2 className="reveal mt-3 max-w-2xl text-3xl font-extrabold md:text-4xl">
          10+ жилийн туршлага
        </h2>
        <p className="reveal mt-3 max-w-2xl text-base leading-relaxed text-ink-dim">
          Жил бүр сурагчдаа ЭЕШ-д өндөр оноо авахуйц бэлдэж ирсэн — жилийн
          үр дүнгээ доор харуулж байна.
        </p>

        <div className="reveal mt-8 rounded-2xl border border-line bg-panel p-6">
          <div className="grid gap-4">
            {YEARLY_EXAM_RESULTS.map((row, i) => (
              <p
                key={i}
                className="border-b border-line pb-4 text-base leading-relaxed text-ink last:border-0 last:pb-0"
              >
                <span className="font-bold">20{row.yearSuffix || "__"}</span>{" "}
                онд{" "}
                <span className="font-bold text-brand">
                  {row.scored700Plus || "__"}
                </span>{" "}
                сурагч ЭЕШ-д <span className="font-bold">700+</span> оноо,{" "}
                <span className="font-bold text-brand">
                  {row.scored600Plus || "__"}
                </span>{" "}
                сурагч <span className="font-bold">600+</span> оноо авсан.
              </p>
            ))}
          </div>
          <p className="mt-5 text-xs text-ink-dim">
            Дээрх тоонуудыг төвөөс баталгаажуулмагц энд нэмэх болно.
          </p>
        </div>

        {/* Тогтвортой суурь тоо — нам дуугаар, амжилтын жагсаалтын дараа */}
        <div className="reveal mt-6 flex flex-wrap items-center gap-x-8 gap-y-2 text-sm text-ink-dim">
          {STABLE_FACTS.map((f) => (
            <span key={f.label}>
              <span className="font-bold text-ink">{f.value}</span> {f.label}
            </span>
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
