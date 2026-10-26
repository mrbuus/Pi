/* ============================================================================
 * Эзлэхүүн, гадаргуугийн талбай, туслах хэмжигдэхүүн — томьёо + тоо орлуулсан
 * LaTeX + хариу. Хариуг «гоё» хэлбэрт (бутархай, a\sqrt{b}, p+q\sqrt{r}, k\pi).
 * ========================================================================== */

import { fracTex, gcd, splitSqrt, toFraction } from "../core/expr.ts";
import { buildSolid, sanitizeParams, type Params, type SolidKind } from "./solids.ts";
import { polyArea } from "./vec.ts";

export interface Measure {
  /** V, S, S_{\text{хажуу}}, l … */
  sym: string;
  /** Монгол нэр */
  name: string;
  /** Ерөнхий томьёо (тэнцүүгийн баруун тал) */
  formula: string;
  /** Тоо орлуулсан хэлбэр (хоосон байж болно) */
  subst: string;
  value: number;
  /** Утга нь π-тэй (хариуг k\pi хэлбэрээр) */
  pi?: boolean;
}

/* ------------------------------------------------- тоог гоё бичих -- */

const SQUAREFREE: number[] = [];
for (let n = 2; n <= 120; n++) {
  let ok = true;
  for (let k = 2; k * k <= n; k++) if (n % (k * k) === 0) ok = false;
  if (ok) SQUAREFREE.push(n);
}

function qTex(num: number, den: number, rad?: number): string {
  // num/den · √rad
  const g = gcd(Math.abs(num), den);
  const n = num / g, d = den / g;
  const sign = n < 0 ? "-" : "";
  const an = Math.abs(n);
  const r = rad ? `\\sqrt{${rad}}` : "";
  const top = rad ? `${an === 1 ? "" : an}${r}` : `${an}`;
  return d === 1 ? `${sign}${top}` : `${sign}\\frac{${top}}{${d}}`;
}

/** Бүхэл / бутархай / a\sqrt{b}/c / p+q\sqrt{r}. Олдохгүй бол null */
export function exactTex(x: number): string | null {
  if (!Number.isFinite(x)) return null;
  if (Math.abs(x) < 1e-12) return "0";
  const tol = 1e-10;
  const f = toFraction(x, 200, tol);
  if (f) return fracTex(f[0], f[1]);
  // |x| = √(p/q)
  const fs = toFraction(x * x, 400, tol);
  if (fs) {
    const [p, q] = fs;
    const [out, inn] = splitSqrt(p * q);
    if (inn > 1 && inn <= 10000 && Math.abs(out * Math.sqrt(inn) / q - Math.abs(x)) < 1e-9 * Math.max(1, Math.abs(x))) {
      return qTex(x < 0 ? -out : out, q, inn);
    }
  }
  // p + q√r
  for (const r of SQUAREFREE) {
    const sr = Math.sqrt(r);
    for (const den of r <= 30 ? [1, 2, 3, 4, 6] : [1, 2]) {
      const M = Math.min(60 * den, Math.ceil(((Math.abs(x) + 1) * den) / sr) + 1);
      for (let k = 1; k <= M; k++) {
        for (const s of [1, -1]) {
          const qv = (s * k) / den;
          const pv = x - qv * sr;
          const fp = toFraction(pv, 12, 1e-11);
          if (!fp || fp[0] === 0) continue;
          if (Math.abs(fp[0] / fp[1] + qv * sr - x) > 1e-10 * Math.max(1, Math.abs(x))) continue;
          const pt = fracTex(fp[0], fp[1]);
          const qt = qTex(s * k, den, r);
          return qt.startsWith("-") ? `${pt}${qt}` : `${pt}+${qt}`;
        }
      }
    }
  }
  return null;
}

/** Аравтын бичлэг (2 орон, илүү тэгийг хасна) */
export function decTex(x: number, digits = 2): string {
  const r = Number(x.toFixed(digits));
  return Object.is(r, -0) ? "0" : String(r);
}

export interface AnswerParts {
  /** Яг хэлбэр (12\pi, \frac{\sqrt{2}}{12}, 8). Олдохгүй бол null */
  exact: string | null;
  /** Ойролцоо утга (2 орон) — яг хэлбэр нь бүхэл тоо бол null */
  approx: string | null;
}

/** Хариуг яг ба ойролцоо хэсэгт салгана (картад: яг хэлбэр том, ойролцоо нь саарал доор) */
export function answerParts(x: number, pi = false): AnswerParts {
  const approx = decTex(x);
  let exact: string | null = null;
  if (pi) {
    const c = exactTex(x / Math.PI);
    if (c) exact = c === "0" ? "0" : c === "1" ? "\\pi" : /[+-]/.test(c.slice(1)) ? `(${c})\\pi` : `${c}\\pi`;
  } else exact = exactTex(x);
  if (!exact) return { exact: null, approx };
  if (/\\sqrt|\\pi|\\frac/.test(exact)) return { exact, approx };
  return { exact, approx: null };
}

/** Хариу: «12\pi \approx 37.7», «4\sqrt{2} \approx 5.66», «8» */
export function answerTex(x: number, pi = false): string {
  const { exact, approx } = answerParts(x, pi);
  if (!exact) return `\\approx ${approx}`;
  return approx ? `${exact}\\approx ${approx}` : exact;
}

/** Параметрийг орлуулахдаа: 4, 2.5 */
const P = (x: number) => decTex(x, 3);
/** Зэрэгт: 4^2, (2.5)^2 */
const pw = (x: number, e: number) => (Number.isInteger(x) ? `${x}^${e}` : `(${P(x)})^${e}`);
/** Үржвэрт тооноос өмнө: \cdot */
const dotj = (...xs: string[]) => xs.join("\\cdot ");
/** Туслах утгын квадрат: 2^2, (\sqrt{3})^2 */
const pq = (x: number) => {
  const e = Q(x);
  return /^\d+$/.test(e) ? `${e}^2` : `(${e})^2`;
};
/** Туслах утгыг орлуулахдаа (\sqrt{13} г.м.) */
const Q = (x: number) => {
  const e = exactTex(x);
  return e && e.length < 24 ? e : decTex(x);
};

/* ----------------------------------------------- суурийн талбай -- */

/** Зөв n өнцөгтийн талбайн томьёо (a-аар) */
function baseFormula(n: number): { tex: string; k: number; sub: (a: number) => string } {
  const k = n / (4 * Math.tan(Math.PI / n)); // S = k a²
  if (n === 3) return { tex: "\\frac{\\sqrt{3}}{4}a^2", k, sub: (a) => `\\frac{\\sqrt{3}}{4}\\cdot ${pw(a, 2)}` };
  if (n === 4) return { tex: "a^2", k, sub: (a) => pw(a, 2) };
  if (n === 6) return { tex: "\\frac{3\\sqrt{3}}{2}a^2", k, sub: (a) => `\\frac{3\\sqrt{3}}{2}\\cdot ${pw(a, 2)}` };
  return {
    tex: `\\frac{${n}a^2}{4\\operatorname{tg}\\frac{180^\\circ}{${n}}}`,
    k,
    // 180°/n-ийг аравтын бутархайгаар биш, бутархайгаар нь үлдээнэ (25.71° гэх мэт биш)
    sub: (a) => `\\frac{${n}\\cdot ${pw(a, 2)}}{4\\operatorname{tg}\\frac{180^\\circ}{${n}}}`,
  };
}

const SB = "S_{\\text{суурь}}";
const SL = "S_{\\text{хажуу}}";
const SF = "S_{\\text{бүтэн}}";

/* ------------------------------------------------------- хэмжилт -- */

export function measures(kind: SolidKind, raw: Partial<Params>): Measure[] {
  const p = sanitizeParams(kind, raw);
  const out: Measure[] = [];
  const add = (m: Measure) => out.push(m);

  switch (kind) {
    case "cube": {
      const a = p.a;
      add({ sym: "V", name: "Эзлэхүүн", formula: "a^3", subst: pw(a, 3), value: a ** 3 });
      add({ sym: SL, name: "Хажуу гадаргуу", formula: "4a^2", subst: `4\\cdot ${pw(a, 2)}`, value: 4 * a * a });
      add({ sym: SF, name: "Бүтэн гадаргуу", formula: "6a^2", subst: `6\\cdot ${pw(a, 2)}`, value: 6 * a * a });
      add({ sym: "d", name: "Диагональ", formula: "a\\sqrt{3}", subst: `${P(a)}\\sqrt{3}`, value: a * Math.sqrt(3) });
      break;
    }
    case "box": {
      const { a, b, c } = p;
      add({ sym: "V", name: "Эзлэхүүн", formula: "abc", subst: dotj(P(a), P(b), P(c)), value: a * b * c });
      add({ sym: SL, name: "Хажуу гадаргуу", formula: "2(a+b)c", subst: `2(${P(a)}+${P(b)})\\cdot ${P(c)}`, value: 2 * (a + b) * c });
      add({
        sym: SF, name: "Бүтэн гадаргуу", formula: "2(ab+bc+ac)",
        subst: `2(${dotj(P(a), P(b))}+${dotj(P(b), P(c))}+${dotj(P(a), P(c))})`, value: 2 * (a * b + b * c + a * c),
      });
      add({ sym: "d", name: "Диагональ", formula: "\\sqrt{a^2+b^2+c^2}", subst: `\\sqrt{${pw(a, 2)}+${pw(b, 2)}+${pw(c, 2)}}`, value: Math.hypot(a, b, c) });
      break;
    }
    case "prism":
    case "oblique": {
      const { n, a, h } = p;
      const bf = baseFormula(n);
      const Sb = bf.k * a * a;
      add({ sym: SB, name: "Суурийн талбай", formula: bf.tex, subst: bf.sub(a), value: Sb });
      add({ sym: "V", name: "Эзлэхүүн", formula: `${SB}\\cdot h`, subst: dotj(Q(Sb), P(h)), value: Sb * h });
      if (kind === "prism") {
        add({ sym: SL, name: "Хажуу гадаргуу", formula: "nah", subst: dotj(String(n), P(a), P(h)), value: n * a * h });
        add({ sym: SF, name: "Бүтэн гадаргуу", formula: `${SL}+2${SB}`, subst: `${Q(n * a * h)}+2\\cdot ${Q(Sb)}`, value: n * a * h + 2 * Sb });
      } else {
        const m = buildSolid(kind, p);
        const lat = m.body.faces.filter((f) => f.tag === "side").reduce((s, f) => s + polyArea(f.pts), 0);
        const l = Math.hypot(h, p.d);
        add({ sym: "l", name: "Хажуу ирмэг", formula: "\\sqrt{h^2+d^2}", subst: `\\sqrt{${pw(h, 2)}+${pw(p.d, 2)}}`, value: l });
        add({ sym: SL, name: "Хажуу гадаргуу", formula: "S_1+S_2+\\ldots+S_n", subst: "", value: lat });
        add({ sym: SF, name: "Бүтэн гадаргуу", formula: `${SL}+2${SB}`, subst: `${Q(lat)}+2\\cdot ${Q(Sb)}`, value: lat + 2 * Sb });
      }
      break;
    }
    case "pyramid": {
      const { n, a, h } = p;
      const bf = baseFormula(n);
      const Sb = bf.k * a * a;
      const r = a / (2 * Math.tan(Math.PI / n));
      const m = Math.hypot(h, r);
      const R = a / (2 * Math.sin(Math.PI / n));
      add({ sym: SB, name: "Суурийн талбай", formula: bf.tex, subst: bf.sub(a), value: Sb });
      add({ sym: "V", name: "Эзлэхүүн", formula: `\\frac{1}{3}${SB}\\cdot h`, subst: `\\frac{1}{3}\\cdot ${dotj(Q(Sb), P(h))}`, value: (Sb * h) / 3 });
      add({ sym: "r", name: "Суурийн апофем", formula: `\\frac{a}{2\\operatorname{tg}\\frac{180^\\circ}{${n}}}`, subst: "", value: r });
      add({ sym: "m", name: "Апофем", formula: "\\sqrt{h^2+r^2}", subst: `\\sqrt{${pw(h, 2)}+${pq(r)}}`, value: m });
      add({ sym: "b", name: "Хажуу ирмэг", formula: "\\sqrt{h^2+R^2}", subst: "", value: Math.hypot(h, R) });
      add({ sym: SL, name: "Хажуу гадаргуу", formula: "\\frac{1}{2}nam", subst: `\\frac{1}{2}\\cdot ${dotj(String(n), P(a), Q(m))}`, value: (n * a * m) / 2 });
      add({ sym: SF, name: "Бүтэн гадаргуу", formula: `${SL}+${SB}`, subst: `${Q((n * a * m) / 2)}+${Q(Sb)}`, value: (n * a * m) / 2 + Sb });
      break;
    }
    case "gpyramid": {
      const { n, a, h } = p;
      const model = buildSolid(kind, p);
      const base = model.body.faces.find((f) => f.tag === "base")!;
      const Sb = polyArea(base.pts);
      const lat = model.body.faces.filter((f) => f.tag === "side").reduce((s, f) => s + polyArea(f.pts), 0);
      const bt = n === 4 ? { tex: "ab", sub: dotj(P(a), P(p.b)) } : { tex: baseFormula(n).tex, sub: baseFormula(n).sub(a) };
      add({ sym: SB, name: "Суурийн талбай", formula: bt.tex, subst: bt.sub, value: Sb });
      add({ sym: "V", name: "Эзлэхүүн", formula: `\\frac{1}{3}${SB}\\cdot h`, subst: `\\frac{1}{3}\\cdot ${dotj(Q(Sb), P(h))}`, value: (Sb * h) / 3 });
      add({ sym: SL, name: "Хажуу гадаргуу", formula: "S_1+S_2+\\ldots+S_n", subst: "", value: lat });
      add({ sym: SF, name: "Бүтэн гадаргуу", formula: `${SL}+${SB}`, subst: `${Q(lat)}+${Q(Sb)}`, value: lat + Sb });
      break;
    }
    case "tetra": {
      const a = p.a;
      add({ sym: "V", name: "Эзлэхүүн", formula: "\\frac{a^3\\sqrt{2}}{12}", subst: `\\frac{${pw(a, 3)}\\sqrt{2}}{12}`, value: (a ** 3 * Math.SQRT2) / 12 });
      add({ sym: SF, name: "Бүтэн гадаргуу", formula: "a^2\\sqrt{3}", subst: `${pw(a, 2)}\\sqrt{3}`, value: a * a * Math.sqrt(3) });
      add({ sym: "h", name: "Өндөр", formula: "a\\sqrt{\\frac{2}{3}}", subst: `${P(a)}\\sqrt{\\frac{2}{3}}`, value: a * Math.sqrt(2 / 3) });
      break;
    }
    case "frustum": {
      const { n, a, b, h } = p;
      const bf = baseFormula(n);
      const S1 = bf.k * a * a, S2 = bf.k * b * b;
      const r1 = a / (2 * Math.tan(Math.PI / n)), r2 = b / (2 * Math.tan(Math.PI / n));
      const m = Math.hypot(h, r1 - r2);
      const V = (h / 3) * (S1 + S2 + Math.sqrt(S1 * S2));
      const lat = (n * (a + b) * m) / 2;
      add({ sym: "S_1", name: "Доод суурь", formula: bf.tex, subst: bf.sub(a), value: S1 });
      add({ sym: "S_2", name: "Дээд суурь", formula: bf.tex.replace(/a\^2/g, "b^2"), subst: bf.sub(b), value: S2 });
      add({ sym: "V", name: "Эзлэхүүн", formula: "\\frac{h}{3}\\left(S_1+S_2+\\sqrt{S_1S_2}\\right)", subst: `\\frac{${P(h)}}{3}\\left(${Q(S1)}+${Q(S2)}+\\sqrt{${Q(S1)}\\cdot ${Q(S2)}}\\right)`, value: V });
      add({ sym: "m", name: "Апофем", formula: "\\sqrt{h^2+(r_1-r_2)^2}", subst: "", value: m });
      add({ sym: SL, name: "Хажуу гадаргуу", formula: "\\frac{1}{2}n(a+b)m", subst: `\\frac{1}{2}\\cdot ${n}\\cdot (${P(a)}+${P(b)})\\cdot ${Q(m)}`, value: lat });
      add({ sym: SF, name: "Бүтэн гадаргуу", formula: `${SL}+S_1+S_2`, subst: `${Q(lat)}+${Q(S1)}+${Q(S2)}`, value: lat + S1 + S2 });
      break;
    }
    case "cylinder": {
      const { r, h } = p;
      add({ sym: "V", name: "Эзлэхүүн", formula: "\\pi r^2h", subst: `\\pi\\cdot ${pw(r, 2)}\\cdot ${P(h)}`, value: Math.PI * r * r * h, pi: true });
      add({ sym: SL, name: "Хажуу гадаргуу", formula: "2\\pi rh", subst: `2\\pi\\cdot ${dotj(P(r), P(h))}`, value: 2 * Math.PI * r * h, pi: true });
      add({ sym: SF, name: "Бүтэн гадаргуу", formula: "2\\pi r(r+h)", subst: `2\\pi\\cdot ${P(r)}(${P(r)}+${P(h)})`, value: 2 * Math.PI * r * (r + h), pi: true });
      break;
    }
    case "cone": {
      const { r, h } = p;
      const l = Math.hypot(r, h);
      add({ sym: "l", name: "Байгуулагч", formula: "\\sqrt{r^2+h^2}", subst: `\\sqrt{${pw(r, 2)}+${pw(h, 2)}}`, value: l });
      add({ sym: "V", name: "Эзлэхүүн", formula: "\\frac{1}{3}\\pi r^2h", subst: `\\frac{1}{3}\\pi\\cdot ${pw(r, 2)}\\cdot ${P(h)}`, value: (Math.PI * r * r * h) / 3, pi: true });
      add({ sym: SL, name: "Хажуу гадаргуу", formula: "\\pi rl", subst: `\\pi\\cdot ${dotj(P(r), Q(l))}`, value: Math.PI * r * l, pi: true });
      add({ sym: SF, name: "Бүтэн гадаргуу", formula: "\\pi r(r+l)", subst: `\\pi\\cdot ${P(r)}(${P(r)}+${Q(l)})`, value: Math.PI * r * (r + l), pi: true });
      break;
    }
    case "fcone": {
      const { R, r, h } = p;
      const l = Math.hypot(h, R - r);
      const lat = Math.PI * (R + r) * l;
      add({ sym: "l", name: "Байгуулагч", formula: "\\sqrt{h^2+(R-r)^2}", subst: `\\sqrt{${pw(h, 2)}+${pw(R - r, 2)}}`, value: l });
      add({ sym: "V", name: "Эзлэхүүн", formula: "\\frac{1}{3}\\pi h(R^2+Rr+r^2)", subst: `\\frac{1}{3}\\pi\\cdot ${P(h)}(${pw(R, 2)}+${dotj(P(R), P(r))}+${pw(r, 2)})`, value: (Math.PI * h * (R * R + R * r + r * r)) / 3, pi: true });
      add({ sym: SL, name: "Хажуу гадаргуу", formula: "\\pi(R+r)l", subst: `\\pi(${P(R)}+${P(r)})\\cdot ${Q(l)}`, value: lat, pi: true });
      add({ sym: SF, name: "Бүтэн гадаргуу", formula: `${SL}+\\pi(R^2+r^2)`, subst: "", value: lat + Math.PI * (R * R + r * r), pi: true });
      break;
    }
    case "sphere": {
      const R = p.R;
      add({ sym: "V", name: "Эзлэхүүн", formula: "\\frac{4}{3}\\pi R^3", subst: `\\frac{4}{3}\\pi\\cdot ${pw(R, 3)}`, value: (4 / 3) * Math.PI * R ** 3, pi: true });
      add({ sym: "S", name: "Гадаргуу", formula: "4\\pi R^2", subst: `4\\pi\\cdot ${pw(R, 2)}`, value: 4 * Math.PI * R * R, pi: true });
      break;
    }
    case "octa": {
      const a = p.a;
      add({ sym: "V", name: "Эзлэхүүн", formula: "\\frac{a^3\\sqrt{2}}{3}", subst: `\\frac{${pw(a, 3)}\\sqrt{2}}{3}`, value: (a ** 3 * Math.SQRT2) / 3 });
      add({ sym: SF, name: "Бүтэн гадаргуу", formula: "2\\sqrt{3}a^2", subst: `2\\sqrt{3}\\cdot ${pw(a, 2)}`, value: 2 * Math.sqrt(3) * a * a });
      add({ sym: "d", name: "Диагональ", formula: "a\\sqrt{2}", subst: `${P(a)}\\sqrt{2}`, value: a * Math.SQRT2 });
      break;
    }
  }
  return out;
}

/** Бүтэн гадаргуугийн талбай (дэлгээсийн шалгалтад) */
export function totalArea(kind: SolidKind, raw: Partial<Params>): number {
  const ms = measures(kind, raw);
  const m = ms.find((x) => x.sym === SF || x.sym === "S");
  return m ? m.value : NaN;
}

export function volume(kind: SolidKind, raw: Partial<Params>): number {
  return measures(kind, raw).find((x) => x.sym === "V")?.value ?? NaN;
}

/** Нэг мөр LaTeX: «V = a^3 = 2^3 = 8» */
export function measureTex(m: Measure): string {
  const parts = [m.sym, m.formula];
  if (m.subst && m.subst !== m.formula) parts.push(m.subst);
  let ans = answerTex(m.value, m.pi);
  const last = parts[parts.length - 1];
  // орлуулга нь хариутайгаа ижил бол давтахгүй: «4\sqrt{3}=4\sqrt{3}\approx…»
  if (ans === last) return parts.join("=");
  if (ans.startsWith(`${last}\\approx`)) ans = ans.slice(last.length);
  return `${parts.join("=")}${ans.startsWith("\\approx") ? "" : "="}${ans}`;
}

/** Хоёр мөр (утсан дээр багтаахад): «V=\frac13\pi r^2h» ба «=…=12\pi\approx 37.7» */
export function measureLines(m: Measure): [string, string] {
  const first = `${m.sym}=${m.formula}`;
  const one = measureTex(m);
  const rest = one.slice(first.length);
  return [first, rest];
}

export interface MeasureSteps {
  /** «V=\frac{1}{3}\pi r^2h» */
  formula: string;
  /** «=\frac{1}{3}\pi\cdot 3^2\cdot 4=12\pi» (хоосон байж болно) */
  subst: string;
  /** Саарал жижиг мөр: «\approx 37.7» (яг хариу бүхэл бол null) */
  approx: string | null;
}

/** «Дэлгэрэнгүй»-д: томьёо, орлуулалт + яг хариу, ойролцоо утга тусдаа мөрөнд */
export function measureSteps(m: Measure): MeasureSteps {
  const formula = `${m.sym}=${m.formula}`;
  const { exact, approx } = answerParts(m.value, m.pi);
  const parts: string[] = [];
  if (m.subst && m.subst !== m.formula) parts.push(m.subst);
  if (exact && exact !== parts[parts.length - 1] && exact !== m.formula) parts.push(exact);
  const subst = parts.length ? `=${parts.join("=")}` : "";
  return { formula, subst, approx: approx ? `\\approx ${approx}` : null };
}

/**
 * Үр дүнгийн картад гарах гол утгууд (2-4): V, бүтэн гадаргуу, хажуу гадаргуу,
 * дараа нь биетийн онцлог нэг утга (диагональ, байгуулагч, апофем, өндөр)
 */
export function keyMeasures(ms: Measure[], max = 4): Measure[] {
  const pick: Measure[] = [];
  const take = (pred: (m: Measure) => boolean) => {
    const m = ms.find((x) => pred(x) && !pick.includes(x));
    if (m && pick.length < max) pick.push(m);
  };
  take((m) => m.sym === "V");
  take((m) => m.sym === SF || m.sym === "S");
  take((m) => m.sym === SL);
  for (const s of ["d", "l", "m", "h"]) take((m) => m.sym === s);
  return pick;
}
