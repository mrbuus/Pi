/* ============================================================================
 * Тоог LaTeX болон зургийн шошгонд харуулах (цэвэр, React-гүй).
 *
 * Эзний дүрэм: хэт олон оронтой аравтын тоо БҮҮ харуул. Эхлээд яг хэлбэр
 * (\frac{12}{5}, \sqrt{13}, \frac{\sqrt{73}}{2}, 25\pi), ойролцоо утга нь
 * 2 оронтой, саарал, дор нь. Өнцөг цэвэр бол бүхэл (90°), бусад нь 1 орон.
 *
 *   val(2.4)        → { exact: "\frac{12}{5}", dec: "2.4", eq: true }
 *   val(Math.sqrt(13)) → { exact: "\sqrt{13}", dec: "3.61", eq: false }
 *   num(2.5)        → "2.5"      — томьёонд орлуулах тоо
 *   res(√41)        → "=\sqrt{41}\approx 6.4"  — нэг мөрөнд (хуучин хэлбэр)
 * ========================================================================== */

import { gcd, splitSqrt, toFraction } from "../core/expr.ts";

/** Ойролцоо аравтын бичлэг (digits орон хүртэл, илүү тэггүй) */
export function dec(x: number, digits = 2): string {
  if (!Number.isFinite(x)) return "—";
  const v = Number(x.toFixed(digits));
  return String(Object.is(v, -0) ? 0 : v);
}

const isInt = (x: number, tol = 1e-9) => Math.abs(x - Math.round(x)) < tol * Math.max(1, Math.abs(x));
/** digits оронтой аравтын бичлэг нь яг тэнцүү эсэх */
const decExact = (x: number, digits: number) => Math.abs(Number(x.toFixed(digits)) - x) < 1e-9 * Math.max(1, Math.abs(x));

/**
 * Яг хэлбэр (LaTeX) олдвол буцаана: бүхэл, жижиг хуваарьтай бутархай,
 * \frac{a\sqrt{b}}{q} (q ≤ 12). Олдохгүй бол null.
 */
export function exactTex(x: number): string | null {
  if (!Number.isFinite(x)) return null;
  if (isInt(x)) return String(Math.round(x));
  const sign = x < 0 ? "-" : "";
  const ax = Math.abs(x);
  const f = toFraction(ax, 12, 1e-10);
  if (f) return `${sign}\\frac{${f[0]}}{${f[1]}}`;
  for (let q = 1; q <= 12; q++) {
    const sq = (ax * q) ** 2;
    if (sq > 1e6 || Math.abs(sq - Math.round(sq)) > 1e-6) continue;
    const [o, i] = splitSqrt(Math.round(sq));
    if (i <= 1) continue;
    const g = gcd(o, q), oo = o / g, qq = q / g;
    const top = `${oo === 1 ? "" : oo}\\sqrt{${i}}`;
    return `${sign}${qq === 1 ? top : `\\frac{${top}}{${qq}}`}`;
  }
  return null;
}

/** Үр дүнгийн утга: яг хэлбэр (байвал), 2 оронтой аравтын, тэнцүү эсэх */
export interface Val {
  /** Яг хэлбэр (LaTeX), бүхэл тоо ч байж болно. null — яг хэлбэргүй */
  exact: string | null;
  /** 2 оронтой аравтын бичлэг */
  dec: string;
  /** dec нь яг утгатайгаа тэнцүү (\approx биш =) */
  eq: boolean;
}

export function val(x: number, digits = 2): Val {
  return { exact: exactTex(x), dec: dec(x, digits), eq: decExact(x, digits) };
}

/** k·π хэлбэрийн утга: k цэвэр бол «25\pi», «\frac{5\pi}{2}» */
export function piVal(k: number, digits = 2): Val {
  const v = k * Math.PI;
  const e = exactTex(k);
  let exact: string | null = null;
  if (e !== null && !e.includes("sqrt")) {
    const m = /^(-?)\\frac\{(\d+)\}\{(\d+)\}$/.exec(e);
    if (m) exact = `${m[1]}\\frac{${m[2] === "1" ? "" : m[2]}\\pi}{${m[3]}}`;
    else exact = e === "0" ? "0" : `${e === "1" ? "" : e === "-1" ? "-" : e}\\pi`;
  }
  return { exact, dec: dec(v, digits), eq: decExact(v, digits) };
}

/** Градус: цэвэр бол бүхэл «90^\circ», бусад нь 1 оронтой «53.1^\circ» */
export function degVal(x: number): Val {
  if (Math.abs(x - Math.round(x)) < 1e-6) return { exact: `${Math.round(x)}^\\circ`, dec: `${Math.round(x)}^\\circ`, eq: true };
  return { exact: null, dec: `${dec(x, 1)}^\\circ`, eq: decExact(x, 1) };
}

/** Утгыг нэг мөрт LaTeX болгох: «=\frac{12}{5}=2.4», «=\sqrt{13}\approx 3.61», «\approx 4.27» */
export function valTex(v: Val, unit = ""): string {
  if (v.exact !== null) {
    if (/^-?\d+(\.\d+)?(\^\\circ)?$/.test(v.exact) || v.exact === v.dec) return `=${v.exact}${unit}`;
    return `=${v.exact}${v.eq ? `=${v.dec}` : `\\approx ${v.dec}`}${unit}`;
  }
  return `${v.eq ? "=" : "\\approx "}${v.dec}${unit}`;
}

/** Яг хэлбэрийн дор «≈» мөр хэрэгтэй эсэх (бүхэл, энгийн аравтын бол хэрэггүй) */
export function needsApprox(v: Val): boolean {
  return v.exact !== null && !/^-?\d+(\.\d+)?(\^\\circ)?$/.test(v.exact) && v.exact !== v.dec;
}

/** Үр дүн: «=6», «=\sqrt{41}\approx 6.4», «\approx 3.14» */
export function res(x: number, digits = 2): string {
  return valTex(val(x, digits));
}

/** k·π хэлбэрийн үр дүн: «=25\pi\approx 78.54» */
export function piRes(k: number, digits = 2): string {
  return valTex(piVal(k, digits));
}

/**
 * Томьёонд орлуулах тоо: бүхэл/2 хүртэл оронтой бол тэр чигээр нь,
 * үгүй бол яг хэлбэр (\sqrt{13}), тэр ч үгүй бол 2 орон.
 */
export function num(x: number): string {
  if (!Number.isFinite(x)) return "—";
  if (decExact(x, 2)) return dec(x, 2);
  return exactTex(x) ?? dec(x, 2);
}

/** Сөрөг тоог хаалтанд (орлуулахад) */
export function numP(x: number): string {
  const s = num(x);
  return x < 0 ? `\\left(${s}\\right)` : s;
}

/** Градус томьёонд: цэвэр бол бүхэл, үгүй бол 1 орон «36.9^\circ» */
export function degTex(x: number): string {
  return degVal(x).dec;
}

/** Зургийн шошгонд (SvgLabel) урт: «5», «2.5», «3.61», «5 см» — 2 орон хүртэл */
export function lenLabel(x: number, unit: string, digits = 2): string {
  const d = dec(x, digits);
  return unit ? `${d} ${unit}` : d;
}

/** Зургийн шошгонд өнцөг: «60^\circ», «53.1^\circ» */
export function degLabel(x: number): string {
  return degVal(x).dec;
}

/** Нэгжийн LaTeX залгавар: урт «\ \text{см}», талбай «\ \text{см}^2» */
export function unitTex(unit: string, power: 1 | 2 = 1): string {
  if (!unit) return "";
  return power === 2 ? `\\ \\text{${unit}}^2` : `\\ \\text{${unit}}`;
}

/**
 * Чирэхэд тохирох утга: 0.1 алхам, бүхэл тоонд ойр бол бүхэл болгоно
 * (3.96 → 4), хамгийн бага утгаас доош орохгүй.
 */
export function niceStep(x: number, min = 0.1, magnet = 0.12): number {
  const r = Math.round(x);
  const v = Math.abs(x - r) < magnet ? r : Math.round(x * 10) / 10;
  return Math.max(min, v);
}
