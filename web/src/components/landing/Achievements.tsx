/**
 * Жил бүрийн ЭЕШ-ийн үр дүн — эзэн энэ ажлын хамрах хүрээнээс гадуур.
 *
 * ⚠️ Эзэн (2026-07-27) эдгээр тоог одоогоор мэдэхгүй. Зохиомол утга
 * ХЭЗЭЭ Ч бичихгүй. Бодит тоо гарч ирвэл энэ файлыг шинэчилнэ.
 */

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
          <p className="text-base leading-relaxed text-ink-dim">
            Жил бүрийн ЭЕШ-ийн үр дүнгийн тоо төвөөс баталгаажсаны дараа
            энд нэмэгдэнэ. Сургалтын төвөөс асуу.
          </p>
        </div>

        <div className="reveal mt-6 flex flex-wrap items-center gap-x-8 gap-y-2 text-sm text-ink-dim">
          {STABLE_FACTS.map((f) => (
            <span key={f.label}>
              <span className="font-bold text-ink">{f.value}</span> {f.label}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
