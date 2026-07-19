// Ном тус бүрийн брэнд өнгө + эвтэйхэн нэр — Pi.mn даяар нэгдсэн ашиглана
// (Landing, Дэлгүүр, Бодлогын сан). Код (DB-ийн Book.code) → уншигчид ойлгомжтой
// нэр рүү хөрвүүлнэ; шинэ ном нэмэгдэхэд энд нэг мөр нэмэхэд хангалттай.
export interface BookMeta {
  label: string;
  desc: string;
  accent: string; // hex — border/text/glow-д ашиглана
  soft: string; // хагас тунгалаг дэвсгэр
}

const BOOK_META: Record<string, BookMeta> = {
  "100": {
    label: "100×100",
    desc: "Суурь түвшний 100 сэдэв",
    accent: "#4f7fe6",
    soft: "rgba(79, 127, 230, 0.12)",
  },
  "200": {
    label: "200×200",
    desc: "Ахисан түвшний бодлогууд",
    accent: "#7c5fe6",
    soft: "rgba(124, 95, 230, 0.12)",
  },
  "300": {
    label: "300×300",
    desc: "ЭЕШ-ийн өндөр түвшин",
    accent: "#34d6a8",
    soft: "rgba(52, 214, 168, 0.12)",
  },
  "1000": {
    label: "1000 бодлого",
    desc: "Асар том бодлогын сан",
    accent: "#9c7df0",
    soft: "rgba(156, 125, 240, 0.12)",
  },
  HAV: {
    label: "Хавтгай геометр",
    desc: "Хавтгайн геометрийн бодлогууд",
    accent: "#f07aa6",
    soft: "rgba(240, 122, 166, 0.12)",
  },
  OGT: {
    label: "Огторгуйн геометр",
    desc: "Огторгуйн геометрийн бодлогууд",
    accent: "#64c7f5",
    soft: "rgba(100, 199, 245, 0.12)",
  },
  PI: {
    label: "П-тест",
    desc: "11 цуврал жишиг тест",
    accent: "#e8c468",
    soft: "rgba(232, 196, 104, 0.12)",
  },
};

const FALLBACK: BookMeta = {
  label: "",
  desc: "",
  accent: "#93a3c7",
  soft: "rgba(147, 163, 199, 0.12)",
};

// Код яг таарахгүй бол (ж: "200-legacy") хамгийн урт таарах угтварыг олно
export function getBookMeta(code: string, title?: string): BookMeta {
  const direct = BOOK_META[code];
  if (direct) return direct;
  const prefix = Object.keys(BOOK_META)
    .sort((a, b) => b.length - a.length)
    .find((k) => code.startsWith(k));
  if (prefix) return BOOK_META[prefix];
  return { ...FALLBACK, label: title ?? code, desc: "" };
}
