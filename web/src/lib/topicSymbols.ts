// Сэдвийн тэмдэг — СЭДВИЙН УТГААР (сурах бичгийн стандарт бичлэг), дарааллаар биш.
// Тэгшитгэл «=», тэнцэтгэл биш «>/<» — хос сэдэв зөвхөн тэмдгээрээ ялгарна
// (|x|=a / |x|<a). Нэг гэр бүлийн сэдэв ижил өнгөтэй. LaTeX-ээр (KaTeX) — бэлэн
// unicode тэмдэгт биш. Шар/алтан өнгө хэрэглэхгүй (эзний дизайны дүрэм).
// Дүрэм дарааллаар шалгагдана — тодорхой нь эхэнд.
// Нэг л эх сурвалж: бодлогын сан (/app/library) ба нийтийн номын хуудас (/books).

export type ToneKey = "brand" | "teal" | "rose" | "violet" | "sky";

export interface TopicTone {
  symbol: string;
  border: string;
  bg: string;
  soft: string;
  text: string;
  solid: string;
  line: string;
}

// Tailwind-ийн бүрэн анги нэрээр (динамик залгавал purge хийгдэнэ).
export const TONE_STYLE: Record<ToneKey, Omit<TopicTone, "symbol">> = {
  brand: { border: "border-brand-bright/45", bg: "bg-brand-bright/10", soft: "bg-brand-bright/18", text: "text-brand-bright", solid: "bg-brand-bright", line: "bg-brand-bright/40" },
  teal: { border: "border-accent-teal/45", bg: "bg-accent-teal/10", soft: "bg-accent-teal/18", text: "text-accent-teal", solid: "bg-accent-teal", line: "bg-accent-teal/40" },
  rose: { border: "border-accent-rose/45", bg: "bg-accent-rose/10", soft: "bg-accent-rose/18", text: "text-accent-rose", solid: "bg-accent-rose", line: "bg-accent-rose/40" },
  violet: { border: "border-accent-violet/45", bg: "bg-accent-violet/10", soft: "bg-accent-violet/18", text: "text-accent-violet", solid: "bg-accent-violet", line: "bg-accent-violet/40" },
  sky: { border: "border-accent-sky/45", bg: "bg-accent-sky/10", soft: "bg-accent-sky/18", text: "text-accent-sky", solid: "bg-accent-sky", line: "bg-accent-sky/40" },
};

export const TOPIC_SYMBOLS: { test: RegExp; symbol: string; tone: ToneKey }[] = [
  // Тэгшитгэл / тэнцэтгэл биш — хос
  { test: /модул.*тэнцэтгэл/i, symbol: "$|x|<a$", tone: "rose" },
  { test: /модул/i, symbol: "$|x|=a$", tone: "rose" },
  { test: /иррациональ.*тэнцэтгэл/i, symbol: "$\\sqrt{x}>a$", tone: "teal" },
  { test: /иррациональ/i, symbol: "$\\sqrt{x}=a$", tone: "teal" },
  { test: /рациональ.*тэнцэтгэл/i, symbol: "$\\frac{P}{Q}>0$", tone: "brand" },
  { test: /рациональ/i, symbol: "$\\frac{P}{Q}=0$", tone: "brand" },
  { test: /илтгэгч.*тэнцэтгэл/i, symbol: "$a^x>b$", tone: "sky" },
  { test: /илтгэгч/i, symbol: "$a^x=b$", tone: "sky" },
  { test: /логарифм.*тэнцэтгэл/i, symbol: "$\\log_a x>b$", tone: "violet" },
  { test: /логарифм.*тэгшитгэл/i, symbol: "$\\log_a x=b$", tone: "violet" },
  { test: /логарифм/i, symbol: "$\\log_a b$", tone: "violet" },
  { test: /тригонометр.*тэгшитгэл/i, symbol: "$\\sin x=a$", tone: "teal" },
  { test: /тригонометр.*урвуу/i, symbol: "$\\arcsin x$", tone: "teal" },
  { test: /тригонометр.*график/i, symbol: "$y=\\sin x$", tone: "teal" },
  { test: /тригонометр/i, symbol: "$\\sin\\alpha$", tone: "teal" },
  { test: /квадрат тэгшитгэлийн шийд/i, symbol: "$x_1x_2$", tone: "brand" },
  { test: /квадрат функц/i, symbol: "$y=x^2$", tone: "brand" },
  { test: /квадрат тэгшитгэл/i, symbol: "$x^2=a$", tone: "brand" },
  { test: /өндөр зэргийн/i, symbol: "$x^n=a$", tone: "brand" },
  { test: /тойргийн тэгшитгэл/i, symbol: "$x^2+y^2=R^2$", tone: "sky" },
  { test: /шүргэгч/i, symbol: "$y=kx+b$", tone: "violet" },
  // Анализ
  { test: /нугаралт/i, symbol: "$f''=0$", tone: "violet" },
  { test: /экстремум/i, symbol: "$f'=0$", tone: "violet" },
  { test: /өсөх|буурах/i, symbol: "$f'>0$", tone: "violet" },
  { test: /их ба бага утга/i, symbol: "$\\max f$", tone: "violet" },
  { test: /уламжлалын хэрэглээ/i, symbol: "$f'(x_0)$", tone: "violet" },
  { test: /уламжлал/i, symbol: "$f'(x)$", tone: "violet" },
  { test: /дифференциал/i, symbol: "$y'=f(x,y)$", tone: "violet" },
  { test: /хурд/i, symbol: "$v=s'$", tone: "violet" },
  { test: /эзлэхүүн/i, symbol: "$V=\\pi\\!\\int y^2$", tone: "sky" },
  { test: /интегралын хэрэглээ/i, symbol: "$\\int_a^b$", tone: "sky" },
  { test: /интеграл/i, symbol: "$\\int x\\,dx$", tone: "sky" },
  // Функц
  { test: /урвуу функц/i, symbol: "$f^{-1}$", tone: "rose" },
  { test: /тэгш сондгой/i, symbol: "$f(-x)$", tone: "rose" },
  { test: /функцийн үе/i, symbol: "$f(x+T)$", tone: "rose" },
  { test: /тодорхойлогдох муж/i, symbol: "$D(f)$", tone: "rose" },
  { test: /утгын муж/i, symbol: "$E(f)$", tone: "rose" },
  { test: /функц/i, symbol: "$f(x)$", tone: "rose" },
  // Алгебр, тоо
  { test: /бином/i, symbol: "$\\binom{n}{k}$", tone: "brand" },
  { test: /полином задаргаа/i, symbol: "$(a+b)^n$", tone: "brand" },
  { test: /олон гишүүнт/i, symbol: "$P(x)$", tone: "brand" },
  { test: /комплекс/i, symbol: "$a+bi$", tone: "sky" },
  { test: /матриц/i, symbol: "$\\det A$", tone: "sky" },
  { test: /факториал/i, symbol: "$n!$", tone: "teal" },
  { test: /комбинаторик/i, symbol: "$C_n^k$", tone: "teal" },
  { test: /магадлал/i, symbol: "$P(A)$", tone: "teal" },
  { test: /өгөгдл/i, symbol: "$\\bar{x}$", tone: "teal" },
  { test: /арифметик прогресс/i, symbol: "$a_n+d$", tone: "brand" },
  { test: /геометр прогресс/i, symbol: "$b_n\\cdot q$", tone: "brand" },
  { test: /дараалал/i, symbol: "$\\{a_n\\}$", tone: "brand" },
  { test: /тоо тоолол/i, symbol: "$\\mathbb{N}$", tone: "brand" },
  { test: /1000 бодлого|сорил/i, symbol: "$\\Sigma$", tone: "brand" },
  // Геометр
  { test: /вектор/i, symbol: "$\\vec{a}$", tone: "sky" },
  { test: /аналитик геометр/i, symbol: "$(x;y)$", tone: "sky" },
  { test: /хувиргалт/i, symbol: "$A\\to A'$", tone: "violet" },
  { test: /талбай/i, symbol: "$S$", tone: "violet" },
  { test: /огторгуй/i, symbol: "$V$", tone: "violet" },
  { test: /геометр/i, symbol: "$\\triangle ABC$", tone: "violet" },
  // Ерөнхий
  { test: /тэнцэтгэл/i, symbol: "$x>a$", tone: "brand" },
  { test: /тэгшитгэл/i, symbol: "$x=a$", tone: "brand" },
];

export function toneFor(topic: string): TopicTone {
  // Зарим нэрэнд «й» задарсан (и + ̆) — харагдах нь ижил ч регекс тохирохгүй
  const name = topic.normalize("NFC");
  const rule = TOPIC_SYMBOLS.find((r) => r.test.test(name));
  return { symbol: rule?.symbol ?? "$\\sum$", ...TONE_STYLE[rule?.tone ?? "brand"] };
}

/** «Тоо тоолол · Тест 1» → { topic: "Тоо тоолол", label: "Тест 1" } */
export function splitChapterTitle(title: string) {
  const [topic, ...rest] = title.split(" · ");
  return { topic: topic?.trim() || title, label: rest.join(" · ").trim() || title };
}
