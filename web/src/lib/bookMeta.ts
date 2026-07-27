// Ном тус бүрийн брэнд өнгө + эвтэйхэн нэр — Pi.mn даяар нэгдсэн ашиглана
// (Landing, Дэлгүүр, Бодлогын сан). Код (DB-ийн Book.code) → уншигчид ойлгомжтой
// нэр рүү хөрвүүлнэ; шинэ ном нэмэгдэхэд энд нэг мөр нэмэхэд хангалттай.
//
// ӨНГӨНИЙ СИСТЕМ: buyer/page.tsx одоогоор `${meta.accent}55` гэж hex утга руу
// шууд alpha suffix залгадаг тул `accent` заавал "#rrggbb" хэлбэрийн шууд hex
// байх ёстой (CSS var/token класс биш). Тиймээс энд theme-aware байдлыг өөр
// аргаар — value-г ДУУДАХ мөчид идэвхтэй горим (light/dark)-ыг ThemeProvider-ийн
// адил cascade-аар тодорхойлж, тухайн горимд зориулсан hex-ийг сонгож өгнө.
export interface BookMeta {
  label: string;
  desc: string;
  accent: string; // hex — идэвхтэй горимд (light/dark) тааруулсан утга
  soft: string; // хагас тунгалаг дэвсгэр — мөн идэвхтэй горимд тааруулсан
}

type ToneKey = "brand" | "teal" | "gold" | "violet" | "fuchsia" | "sky" | "rose";

// globals.css-ийн --brand-bright/--teal/--gold/--violet/--fuchsia/--sky/--rose
// хувьсагчидтай ЯГ таарсан LIGHT/DARK hex хосууд — нэг эх сурвалжтай байлгана.
const TONE_HEX: Record<ToneKey, { light: string; dark: string }> = {
  brand: { light: "#1E40AF", dark: "#4F7FE6" },
  teal: { light: "#0F766E", dark: "#34D6A8" },
  gold: { light: "#8A6D00", dark: "#E8C468" },
  violet: { light: "#6D28D9", dark: "#A78BFA" },
  fuchsia: { light: "#A21CAF", dark: "#E879D2" },
  sky: { light: "#0369A1", dark: "#5EC9F8" },
  rose: { light: "#BE123C", dark: "#FB7AA8" },
};

// LIGHT дэвсгэр (цайвар) дээр хэт өнгөлөг wash сарних тул alpha-г арай
// бага, DARK дээр анхныхтай ойролцоо (0.12-0.14) авав.
const SOFT_ALPHA = { light: 0.09, dark: 0.14 };

const BOOK_TONE: Record<string, { label: string; desc: string; tone: ToneKey }> = {
  "100": { label: "100×100", desc: "Суурь түвшний 100 сэдэв", tone: "brand" },
  "200": { label: "200×200", desc: "Ахисан түвшний бодлогууд", tone: "violet" },
  "300": { label: "300×300", desc: "ЭЕШ-ийн өндөр түвшин", tone: "teal" },
  "1000": { label: "1000 бодлого", desc: "Асар том бодлогын сан", tone: "fuchsia" },
  HAV: { label: "Хавтгай геометр", desc: "Хавтгайн геометрийн бодлогууд", tone: "rose" },
  OGT: { label: "Огторгуйн геометр", desc: "Огторгуйн геометрийн бодлогууд", tone: "sky" },
  PI: { label: "П-тест", desc: "11 цуврал жишиг тест", tone: "gold" },
};

// ink-dim токентой ойролцоо саарал — тохирох ном олдоогүй үеийн нейтраль өнгө
const FALLBACK_HEX = { light: "#57544D", dark: "#B0ADA6" };

function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// globals.css-ийн cascade-тай яг ижил дараалал: эхлээд <html data-theme>-ийн
// тодорхой сонголт (light/dark), үгүй бол системийн prefers-color-scheme.
// Сервер дээр (typeof document undefined) LIGHT — өгөгдмөл горимтой тааруулав.
function resolveActiveTheme(): "light" | "dark" {
  if (typeof document === "undefined") return "light";
  const explicit = document.documentElement.getAttribute("data-theme");
  if (explicit === "dark") return "dark";
  if (explicit === "light") return "light";
  if (typeof window !== "undefined" && window.matchMedia) {
    if (window.matchMedia("(prefers-color-scheme: dark)").matches) return "dark";
  }
  return "light";
}

// Код яг таарахгүй бол (ж: "200-legacy") хамгийн урт таарах угтварыг олно
export function getBookMeta(code: string, title?: string): BookMeta {
  const theme = resolveActiveTheme();
  const direct = BOOK_TONE[code];
  const prefixKey = direct
    ? code
    : Object.keys(BOOK_TONE)
        .sort((a, b) => b.length - a.length)
        .find((k) => code.startsWith(k));
  const entry = direct ?? (prefixKey ? BOOK_TONE[prefixKey] : null);

  if (!entry) {
    const hex = theme === "dark" ? FALLBACK_HEX.dark : FALLBACK_HEX.light;
    return {
      label: title ?? code,
      desc: "",
      accent: hex,
      soft: hexToRgba(hex, SOFT_ALPHA[theme]),
    };
  }

  const hex = TONE_HEX[entry.tone][theme];
  return {
    label: entry.label,
    desc: entry.desc,
    accent: hex,
    soft: hexToRgba(hex, SOFT_ALPHA[theme]),
  };
}
