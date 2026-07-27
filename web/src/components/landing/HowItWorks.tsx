const STEPS = [
  {
    n: "1",
    title: "Мэдээллээ үлдээнэ",
    text: "Нэр, утасны дугаар, хичээл, ангийн түвшнээ бөглөөд илгээнэ — 30 секунд л шаардана.",
  },
  {
    n: "2",
    title: "Бид тантай холбогдоно",
    text: "Манай ажилтан утсаар эсвэл Messenger-ээр тантай ярьж, тохирох бүлгийг санал болгоно.",
  },
  {
    n: "3",
    title: "Түвшингээ тогтооно",
    text: "Үнэгүй түвшин тогтоох тестээр одоогийн мэдлэгээ шалгуулж, аль хэсгээс эхлэхээ тодорхойлно.",
  },
  {
    n: "4",
    title: "Хичээлдээ ирнэ",
    text: "Салбар, хуваарь, төлбөрийн хэлбэрээ сонгоод сургалтаа эхлүүлнэ.",
  },
] as const;

export default function HowItWorks() {
  return (
    <section id="how" className="relative scroll-mt-20 py-24">
      <div aria-hidden className="grid-bg pointer-events-none absolute inset-0" />
      <div className="relative mx-auto max-w-6xl px-5">
        <p className="reveal text-sm font-bold uppercase tracking-[0.2em] text-brand">
          Хэрхэн бүртгүүлэх вэ
        </p>
        <h2 className="reveal mt-3 max-w-2xl text-3xl font-extrabold md:text-4xl">
          4 алхмаар элсэлтийн бэлтгэлээ эхлүүлнэ
        </h2>
        <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s, i) => (
            <div
              key={s.n}
              className="reveal rounded-2xl border border-line bg-panel p-6"
              style={{ transitionDelay: `${i * 90}ms` }}
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-bright/15 font-serif text-lg font-bold text-brand">
                {s.n}
              </div>
              <p className="mt-4 text-base font-bold text-ink">{s.title}</p>
              <p className="mt-2 text-sm leading-relaxed text-ink-dim">
                {s.text}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
