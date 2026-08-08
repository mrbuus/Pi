import StudyRhythmLoop from "./StudyRhythmLoop";

// Сургалтын төвийн тухай тайлбарлах хэсэг — HowItWorks (бүртгүүлэх алхам)
// болон Branches (хаяг) хоёрын хооронд. Зорилго: сайт зөвхөн холбоос биш,
// төв яг юу хийдгийг тайлбарлана.
//
// ⚠️ Хичээлийн урт, ангийн дүүргэлтийн дээд хязгаар зэрэг бодит тоог одоогоор
// мэдэхгүй тул "__" + TODO үлдээв. Зохиомол тоо ХЭЗЭЭ Ч бичихгүй.

const HOW_IT_WORKS_POINTS = [
  {
    title: "Анги бүрдүүлэлт",
    text: "Сурагчдыг ангийн зэрэг (9-10, 11, 12-р анги), хичээлийн түвшингээр нь бүлэглэж, тогтмол цаг, багштай \"секц\" (анги) байгуулдаг.",
  },
  {
    title: "Багшийн бүрэлдэхүүн",
    text: "Хичээл тус бүрийг сэдвээрээ мэргэшсэн, туршлагатай багш нар хичээллүүлдэг.",
  },
  {
    title: "2 салбар",
    text: "Улаанбаатарын баруун ба зүүн 4 замд тус бүр нэг салбартай — сурагч гэртээ ойрхон салбараа сонгоно.",
  },
] as const;

const CLASS_RHYTHM_POINTS = [
  {
    title: "Долоо хоногийн хуваарь",
    text: "Секц тус бүр тогтмол гараг, цагийн хуваариар хичээллэдэг; тухайн хуваарийг элсэлтийн үед мэдэгдэнэ.",
  },
  {
    title: "Нэг хичээлийн үргэлжлэх хугацаа",
    text: "120 минут (2 цаг).",
  },
  {
    title: "Ангийн дүүргэлт",
    text: "Секц тутамд дээд тал нь 30 сурагч.",
  },
  {
    title: "Гэрийн даалгавар",
    text: "Хичээл бүрийн дараа гэрийн даалгавар өгч, дараагийн хичээл дээр шалгадаг.",
  },
  {
    title: "Орой бодлогоо тэмдэглэх дадал",
    text: "Сурагчид өдөр бүр орой бодсон бодлогоо тэмдэглэж, хичээлийн явцаа тогтмол хардаг.",
  },
  {
    title: "Сар бүрийн шалгалт",
    text: "Сар бүр түвшин тогтоох шалгалт өгч, ахицаа хянана.",
  },
] as const;

export default function CentreInfo() {
  return (
    <section id="centre-info" className="relative scroll-mt-20 py-24">
      <div aria-hidden className="grid-bg pointer-events-none absolute inset-0" />
      <div className="relative mx-auto max-w-6xl px-5">
        <p className="reveal text-sm font-bold uppercase tracking-[0.2em] text-brand">
          Төвийн тухай
        </p>
        <h2 className="reveal mt-3 max-w-2xl text-3xl font-extrabold md:text-4xl">
          Сургалтын төв хэрхэн ажилладаг вэ
        </h2>

        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {HOW_IT_WORKS_POINTS.map((p, i) => (
            <div
              key={p.title}
              className="reveal rounded-2xl border border-line bg-panel p-6"
              style={{ transitionDelay: `${i * 90}ms` }}
            >
              <p className="text-base font-bold text-ink">{p.title}</p>
              <p className="mt-2 text-sm leading-relaxed text-ink-dim">
                {p.text}
              </p>
            </div>
          ))}
        </div>

        <h3 className="reveal mt-16 max-w-2xl text-2xl font-extrabold md:text-3xl">
          Хүүхдэд хичээл яаж ордог вэ
        </h3>
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {CLASS_RHYTHM_POINTS.map((p, i) => (
            <div
              key={p.title}
              className="reveal rounded-2xl border border-line bg-panel p-6"
              style={{ transitionDelay: `${i * 90}ms` }}
            >
              <p className="text-base font-bold text-ink">{p.title}</p>
              <p className="mt-2 text-sm leading-relaxed text-ink-dim">
                {p.text}
              </p>
            </div>
          ))}
        </div>

        <StudyRhythmLoop />

        <div className="reveal mt-10 rounded-2xl border border-line bg-panel p-6">
          <p className="text-base font-bold text-ink">
            Хичээл бүр адилхан биш — аль анги бидэнд тохирохыг сонгоорой
          </p>
          <div className="mt-4 grid gap-3">
            <p className="text-sm leading-relaxed text-ink-dim">
              <span className="font-bold text-brand">Математик</span> —
              танхимын анги болон онлайн ангид аль алинд нь ордог.
            </p>
            <p className="text-sm leading-relaxed text-ink-dim">
              <span className="font-bold text-brand">Нийгэм судлал</span> —
              зөвхөн танхимын ангид ордог; онлайнаар үзэх боломжгүй.
            </p>
            <p className="text-sm leading-relaxed text-ink-dim">
              <span className="font-bold text-brand">SAT</span> — зөвхөн
              танхимын ангид ордог бөгөөд одоогоор бэлтгэл хийгдэж, удахгүй
              нээгдэх төлөвтэй.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
