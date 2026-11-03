/* ============================================================================
 * Геометрийн утгын оролт (цэвэр логик, React-гүй) — дүрс, биетийн хэмжээ.
 *
 * Гулсуургүй: утгыг геометрийн гараар (GeoField + GeoKeypad) эсвэл
 * компьютерийн гараар бичнэ. Дотооддоо токены жагсаалт:
 *   "0".."9", ".", "-", "sqrt(", ")", "/", "^2", "pi", "deg"
 * Буцаах товч нэг токеныг бүтнээр нь арилгана.
 *
 * - Язгуур дараагийн ТООГ л хамарна: цифрээс өөр товч дармагц хаалт автоматаар
 *   хаагдана (2\sqrt{3}, \frac{\sqrt{3}}{2}) — «гарах» товч хэрэггүй.
 * - Бутархай: «/»-ийн өмнөх бүх хэсэг хүртвэр, араас нь хуваарь. Харуулах ба
 *   тооцох хоёр ижил бүтэцтэй (зурагт харагдсан нь тооцоонд орсонтой адил).
 * - Тооцоог core/expr.ts хийнэ («(2sqrt(3))/(3)»).
 * - Өнцгийн талбарт °-гүй π бичвэл радиан гэж үзэж градус руу хөрвүүлнэ
 *   (\frac{\pi}{3} → 60°).
 *
 * Импорт нь зөвхөн expr.ts — `node --test` шууд ачаална.
 * ========================================================================== */

import { compile, parse } from "./expr.ts";

/** Талбарын төрөл — ямар товч идэвхтэйг тодорхойлно */
export type GeoKind = "length" | "angle" | "integer";

export type GeoKey =
  | "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9"
  | "." | "sqrt" | "frac" | "sq" | "pi" | "deg" | "neg" | "back" | "clear";

export type Tokens = readonly string[];

const MAX_TOKENS = 24;
const isDigit = (t: string | undefined) => !!t && t.length === 1 && t >= "0" && t <= "9";

export interface GeoOpts {
  kind?: GeoKind;
  /** Сөрөг утга зөвшөөрөх (min < 0) */
  signed?: boolean;
}

/** Энэ товч энэ талбарт идэвхтэй эсэх */
export function allows(key: GeoKey, opts: GeoOpts = {}): boolean {
  const kind = opts.kind ?? "length";
  if (key === "back" || key === "clear") return true;
  if (key === "neg") return !!opts.signed;
  if (key === "deg") return kind === "angle";
  if (key === "." || key === "sqrt" || key === "frac" || key === "sq" || key === "pi") return kind !== "integer";
  return true;
}

function openCount(t: Tokens): number {
  let n = 0;
  for (const x of t) {
    if (x === "sqrt(") n++;
    else if (x === ")") n--;
  }
  return n;
}

/** Сүүлийн тоон хэсэг (цифр, цэг) */
function numberRun(t: Tokens): string {
  let s = "";
  for (let i = t.length - 1; i >= 0; i--) {
    if (isDigit(t[i]) || t[i] === ".") s = t[i] + s;
    else break;
  }
  return s;
}

const endsWithOp = (t: Tokens) => {
  const l = t[t.length - 1];
  return l === "/" || l === "sqrt(" || l === "." || l === "-";
};

/** Дуусаагүй: хуваарь, язгуурын доорх тоо эсвэл ганц хасах тэмдэг үлдсэн */
export function isIncomplete(t: Tokens): boolean {
  const l = t[t.length - 1];
  return l === "/" || l === "sqrt(" || l === "-";
}

function closeSqrt(t: string[]) {
  if (openCount(t) > 0 && t[t.length - 1] !== "sqrt(") t.push(")");
}

/** Товч дарав — шинэ токены жагсаалт (хүлээн авахгүй бол ижил массив) */
export function press(tokens: Tokens, key: GeoKey, opts: GeoOpts = {}): Tokens {
  if (!allows(key, opts)) return tokens;
  const t = [...tokens];
  const last = t[t.length - 1];
  const full = t.length >= MAX_TOKENS;
  switch (key) {
    case "back": {
      if (!t.length) return tokens;
      t.pop();
      // автоматаар хаасан хаалт — хамт арилгана (язгуур дахин нээгдэнэ)
      if (t[t.length - 1] === ")") t.pop();
      return t;
    }
    case "clear":
      return t.length ? [] : tokens;
    case "neg":
      return t[0] === "-" ? t.slice(1) : full ? tokens : ["-", ...t];
    case ".": {
      if (full || last === "deg" || last === "^2" || last === "pi" || last === ")") return tokens;
      const run = numberRun(t);
      if (run.includes(".")) return tokens;
      if (!run) t.push("0");
      t.push(".");
      return t;
    }
    case "sqrt":
      if (full || last === "deg") return tokens;
      closeSqrt(t);
      t.push("sqrt(");
      return t;
    case "frac":
      if (!t.length || endsWithOp(t) || last === "deg") return tokens;
      closeSqrt(t);
      t.push("/");
      return t;
    case "sq":
      if (!t.length || endsWithOp(t) || last === "deg" || last === "^2") return tokens;
      closeSqrt(t);
      t.push("^2");
      return t;
    case "pi":
      if (full || last === "deg" || last === "pi") return tokens;
      if (!(openCount(t) > 0 && last === "sqrt(")) closeSqrt(t);
      t.push("pi");
      return t;
    case "deg":
      if (!t.length || t.includes("deg") || endsWithOp(t)) return tokens;
      closeSqrt(t);
      t.push("deg");
      return t;
    default: {
      // цифр
      if (full || last === "deg" || last === "^2" || last === "pi" || last === ")") return tokens;
      t.push(key);
      return t;
    }
  }
}

/** Дээд түвшний «/»-ээр хуваасан хэсгүүд (язгуур доторх «/» байхгүй ч хамгаална) */
function parts(t: Tokens): string[][] {
  const out: string[][] = [[]];
  let depth = 0;
  for (const x of t) {
    if (x === "sqrt(") depth++;
    if (x === ")") depth--;
    if (x === "/" && depth <= 0) out.push([]);
    else out[out.length - 1].push(x);
  }
  return out;
}

function partPlain(p: string[]): string {
  let s = "";
  for (const x of p) {
    if (x === "deg") continue;
    if (x === "pi") s += isDigit(s[s.length - 1]) || s.endsWith(".") || s.endsWith(")") ? "*pi" : "pi";
    else s += x;
  }
  for (let i = openCount(p); i > 0; i--) s += ")";
  return s;
}

/** Тооцоонд өгөх бичвэр: «(2sqrt(3))/(3)» */
export function plainOf(t: Tokens): string {
  const body = t[0] === "-" ? t.slice(1) : t;
  const ps = parts(body).map(partPlain);
  const expr = ps.length === 1 ? ps[0] : ps.map((p) => `(${p})`).join("/");
  return t[0] === "-" ? `-(${expr})` : expr;
}

/** Утга; хоосон, дуусаагүй эсвэл тооцоолох боломжгүй бол null */
export function valueOf(t: Tokens, opts: GeoOpts = {}): number | null {
  if (!t.length || isIncomplete(t)) return null;
  const body = t[0] === "-" ? t.slice(1) : t;
  if (parts(body).some((p) => !p.length || p.every((x) => x === "deg"))) return null;
  let v: number;
  try {
    v = compile(parse(plainOf(t)))({});
  } catch {
    return null;
  }
  if (!Number.isFinite(v)) return null;
  if ((opts.kind ?? "length") === "angle" && t.includes("pi") && !t.includes("deg")) v = (v * 180) / Math.PI;
  return v;
}

/* ---------- Харуулах LaTeX ---------- */

function partTex(p: string[]): string {
  let s = "";
  let i = 0;
  const group = (): string => {
    // sqrt( … ) — дотор нь тоо, π
    let inner = "";
    while (i < p.length && p[i] !== ")") inner += atom(p[i++]);
    if (p[i] === ")") i++;
    return `\\sqrt{${inner || "\\square"}}`;
  };
  const atom = (x: string): string => {
    if (x === "pi") return "\\pi ";
    if (x === "^2") return "^{2}";
    if (x === "deg") return "^{\\circ}";
    return x;
  };
  while (i < p.length) {
    const x = p[i++];
    s += x === "sqrt(" ? group() : atom(x);
  }
  return s.trim() || "\\square";
}

/** Дэлгэцэнд харуулах LaTeX ($-гүй); дуусаагүй хэсэгт \square */
export function displayTex(t: Tokens): string {
  if (!t.length) return "";
  const neg = t[0] === "-";
  const body = neg ? t.slice(1) : t;
  const deg = body.includes("deg");
  const ps = parts(body.filter((x) => x !== "deg")).map(partTex);
  let s = ps[0];
  for (let k = 1; k < ps.length; k++) s = `\\frac{${s}}{${ps[k]}}`;
  if (!body.length) s = "\\square";
  return `${neg ? "-" : ""}${s}${deg ? "^{\\circ}" : ""}`;
}

/** Энгийн аравтын тоо биш (язгуур, π, бутархай, квадрат) — ойролцоо утгыг хажууд нь харуулна */
export function isSymbolic(t: Tokens): boolean {
  return t.some((x) => x === "sqrt(" || x === "pi" || x === "/" || x === "^2");
}

/** Тоог токен болгох: 4 → ["4"], 2.5 → ["2", ".", "5"] */
export function tokensOf(v: number): string[] {
  if (!Number.isFinite(v)) return [];
  const r = Number(v.toFixed(6));
  const s = String(Object.is(r, -0) ? 0 : Math.abs(r) < 1e-21 ? 0 : r);
  if (s.includes("e")) return [];
  return s.split("");
}

/* ---------- Компьютерийн гар, хуулж буулгах ---------- */

/** Нэг товчлуурын даралт → гарны товч (таарахгүй бол null) */
export function keyFromKeyboard(k: string): GeoKey | null {
  if (k.length === 1 && k >= "0" && k <= "9") return k as GeoKey;
  switch (k) {
    case ".":
    case ",":
      return ".";
    case "/":
    case ":":
      return "frac";
    case "r":
    case "R":
    case "s":
    case "S":
    case "v":
    case "√":
      return "sqrt";
    case "p":
    case "P":
    case "π":
      return "pi";
    case "^":
    case "²":
    case "q":
      return "sq";
    case "d":
    case "D":
    case "o":
    case "°":
      return "deg";
    case "-":
    case "−":
      return "neg";
    case "Backspace":
      return "back";
    case "Delete":
      return "clear";
    default:
      return null;
  }
}

/**
 * Бичвэрийг токен болгоно: «2sqrt3», «3/4», «2\sqrt{3}», «\frac{\sqrt3}{2}»,
 * «pi/3», «2√3», «60°». Ойлгохгүй тэмдэгтийг алгасна.
 */
export function fromText(src: string, opts: GeoOpts = {}): Tokens {
  let s = src
    .replace(/\\frac\s*\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}\s*\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}/g, "$1/$2")
    .replace(/\\left|\\right|\\,|\\ /g, "")
    .replace(/\\sqrt|sqrt/gi, "√")
    .replace(/\\pi|pi/gi, "π")
    .replace(/\^\{?\\circ\}?|\\degree/g, "°")
    .replace(/\^\{?2\}?/g, "²")
    .replace(/[{}()\\\s]/g, "");
  let t: Tokens = [];
  if (s.startsWith("-") || s.startsWith("−")) {
    s = s.slice(1);
    t = press(t, "neg", opts);
  }
  for (const ch of s) {
    const key = keyFromKeyboard(ch);
    if (key && key !== "neg" && key !== "back" && key !== "clear") t = press(t, key, opts);
  }
  return t;
}

/** Хэмжээг шалгаад тайван зөвлөмж (зөв бол null) */
export function hintFor(t: Tokens, value: number | null, min: number, max: number, opts: GeoOpts = {}): string | null {
  if (!t.length) return "Утгаа бичнэ үү";
  const l = t[t.length - 1];
  if (l === "/") return "Хуваарийг бичнэ үү";
  if (l === "sqrt(") return "Язгуур доорх тоог бичнэ үү";
  if (l === "-") return "Тоогоо бичнэ үү";
  if (value === null) return "Энэ утгыг тооцоолж чадсангүй";
  const show = (x: number) => String(Number(x.toFixed(4)));
  if ((opts.kind ?? "length") === "integer" && !Number.isInteger(value)) return "Бүхэл тоо бичнэ үү";
  if (value < min) return min > 0 && min < 1 ? "Тэгээс их утга бичнэ үү" : `Хамгийн багадаа ${show(min)}`;
  if (value > max) return `Хамгийн ихдээ ${show(max)}`;
  return null;
}
