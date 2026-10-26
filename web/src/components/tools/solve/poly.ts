/* ============================================================================
 * Нэг хувьсагчийн олон гишүүнт — рационал коэффициенттэй, ЯГ.
 * Poly = коэффициентийн массив, индекс = зэрэг (p[0] — сул гишүүн).
 * ========================================================================== */

import { freeSymbols, type Node } from "../core/expr.ts";
import {
  type Q, q, ZERO, ONE, add, sub, mul, div, neg, isZ, val, qTex, qAscii, ExactFail, igcd, ilcm, divisors, powQ,
} from "./q.ts";
import { evalExact, asQ, type X, xadd, xmul, xq, XZERO } from "./exact.ts";

export type Poly = Q[];
export interface RatFn {
  num: Poly;
  den: Poly;
}

export function trim(p: Poly): Poly {
  let n = p.length;
  while (n > 0 && isZ(p[n - 1])) n--;
  return p.slice(0, n);
}
export const deg = (p: Poly) => trim(p).length - 1; // тэг олон гишүүнт: -1
export const lead = (p: Poly) => { const t = trim(p); return t.length ? t[t.length - 1] : ZERO; };
export const isZeroP = (p: Poly) => trim(p).length === 0;
export const constP = (c: Q): Poly => trim([c]);
export const X1: Poly = [ZERO, ONE];

export function padd(a: Poly, b: Poly): Poly {
  const n = Math.max(a.length, b.length);
  const r: Poly = [];
  for (let i = 0; i < n; i++) r.push(add(a[i] ?? ZERO, b[i] ?? ZERO));
  return trim(r);
}
export const pneg = (a: Poly): Poly => a.map(neg);
export const psub = (a: Poly, b: Poly): Poly => padd(a, pneg(b));
export const pscale = (a: Poly, k: Q): Poly => trim(a.map((c) => mul(c, k)));
export function pmul(a: Poly, b: Poly): Poly {
  a = trim(a); b = trim(b);
  if (!a.length || !b.length) return [];
  const r: Poly = Array.from({ length: a.length + b.length - 1 }, () => ZERO);
  for (let i = 0; i < a.length; i++) {
    if (isZ(a[i])) continue;
    for (let j = 0; j < b.length; j++) r[i + j] = add(r[i + j], mul(a[i], b[j]));
  }
  return trim(r);
}
export function ppow(a: Poly, k: number): Poly {
  if (k > 64) throw new ExactFail("degree too big");
  let r: Poly = [ONE];
  for (let i = 0; i < k; i++) r = pmul(r, a);
  return r;
}
export function pdivmod(a: Poly, b: Poly): { q: Poly; r: Poly } {
  a = trim(a); b = trim(b);
  if (!b.length) throw new ExactFail("division by zero polynomial");
  let r = a.slice();
  const qq: Poly = Array.from({ length: Math.max(0, a.length - b.length + 1) }, () => ZERO);
  const lb = b[b.length - 1];
  while (trim(r).length >= b.length) {
    r = trim(r);
    const k = r.length - b.length;
    const c = div(r[r.length - 1], lb);
    qq[k] = c;
    for (let i = 0; i < b.length; i++) r[i + k] = sub(r[i + k], mul(c, b[i]));
    r = trim(r);
  }
  return { q: trim(qq), r: trim(r) };
}
export const monic = (p: Poly): Poly => (isZeroP(p) ? [] : pscale(p, div(ONE, lead(p))));
export function pgcd(a: Poly, b: Poly): Poly {
  a = trim(a); b = trim(b);
  while (b.length) [a, b] = [b, pdivmod(a, b).r];
  return monic(a);
}
export function pderiv(p: Poly): Poly {
  return trim(p.slice(1).map((c, i) => mul(c, q(i + 1))));
}
export function pevalQ(p: Poly, x: Q): Q {
  let r = ZERO;
  for (let i = p.length - 1; i >= 0; i--) r = add(mul(r, x), p[i]);
  return r;
}
export function pevalX(p: Poly, x: X): X {
  let r: X = XZERO;
  for (let i = p.length - 1; i >= 0; i--) r = xadd(xmul(r, x), xq(p[i]));
  return r;
}
export function pval(p: Poly, x: number): number {
  let r = 0;
  for (let i = p.length - 1; i >= 0; i--) r = r * x + val(p[i]);
  return r;
}
export const peq = (a: Poly, b: Poly) => isZeroP(psub(a, b));

/** Бүхэл, анхны (коэффициентүүдийн ХИЕХ = 1), ахлах нь эерэг: p = k · prim */
export function primitive(p: Poly): { k: Q; prim: Poly } {
  p = trim(p);
  if (!p.length) return { k: ONE, prim: [] };
  let L = 1;
  for (const c of p) L = ilcm(L, c.d);
  const ints = p.map((c) => c.n * (L / c.d));
  let g = 0;
  for (const v of ints) g = igcd(g, v);
  if (ints[ints.length - 1] < 0) g = -g;
  return { k: q(g, L), prim: ints.map((v) => q(v / g)) };
}

/* ---------- Модноос олон гишүүнт ---------- */

function constOf(node: Node, v: string): Q | null {
  if (freeSymbols(node).has(v)) return null;
  try {
    return asQ(evalExact(node));
  } catch {
    return null;
  }
}

/** Модыг v-ийн олон гишүүнт болгоно; боломжгүй бол null */
export function polyFrom(node: Node, v = "x"): Poly | null {
  try {
    return pf(node, v);
  } catch {
    return null;
  }
}
function pf(n: Node, v: string): Poly | null {
  const c = constOf(n, v);
  if (c) return constP(c);
  switch (n.t) {
    case "sym": return n.n === v ? X1 : null;
    case "neg": { const a = pf(n.a, v); return a && pneg(a); }
    case "add": case "sub": case "mul": {
      const a = pf(n.a, v), b = pf(n.b, v);
      if (!a || !b) return null;
      return n.t === "add" ? padd(a, b) : n.t === "sub" ? psub(a, b) : pmul(a, b);
    }
    case "div": {
      const a = pf(n.a, v), b = constOf(n.b, v);
      if (!a || !b || isZ(b)) return null;
      return pscale(a, div(ONE, b));
    }
    case "pow": {
      const e = constOf(n.b, v);
      if (!e || e.d !== 1 || e.n < 0 || e.n > 64) return null;
      const a = pf(n.a, v);
      return a && ppow(a, e.n);
    }
  }
  return null;
}

/** Рационал функц N/D (хураахгүй — ОЗ-д хэрэгтэй) */
export function ratFrom(node: Node, v = "x"): RatFn | null {
  try {
    return rf(node, v);
  } catch {
    return null;
  }
}
function rf(n: Node, v: string): RatFn | null {
  const c = constOf(n, v);
  if (c) return { num: constP(c), den: [ONE] };
  switch (n.t) {
    case "sym": return n.n === v ? { num: X1, den: [ONE] } : null;
    case "neg": { const a = rf(n.a, v); return a && { num: pneg(a.num), den: a.den }; }
    case "add": case "sub": {
      const a = rf(n.a, v), b = rf(n.b, v);
      if (!a || !b) return null;
      if (peq(a.den, b.den)) return { num: n.t === "add" ? padd(a.num, b.num) : psub(a.num, b.num), den: a.den };
      const x = pmul(a.num, b.den), y = pmul(b.num, a.den);
      return { num: n.t === "add" ? padd(x, y) : psub(x, y), den: pmul(a.den, b.den) };
    }
    case "mul": {
      const a = rf(n.a, v), b = rf(n.b, v);
      if (!a || !b) return null;
      return { num: pmul(a.num, b.num), den: pmul(a.den, b.den) };
    }
    case "div": {
      const a = rf(n.a, v), b = rf(n.b, v);
      if (!a || !b || isZeroP(b.num)) return null;
      return { num: pmul(a.num, b.den), den: pmul(a.den, b.num) };
    }
    case "pow": {
      const e = constOf(n.b, v);
      if (!e || e.d !== 1 || Math.abs(e.n) > 32) return null;
      const a = rf(n.a, v);
      if (!a) return null;
      const P = { num: ppow(a.num, Math.abs(e.n)), den: ppow(a.den, Math.abs(e.n)) };
      return e.n >= 0 ? P : isZeroP(P.num) ? null : { num: P.den, den: P.num };
    }
  }
  return null;
}

/** Хураах: N/D-г ХИЕХ-ээр хувааж, хуваарийн ахлах коэффициентийг 1 болгоно */
export function ratReduce(r: RatFn): RatFn {
  const g = pgcd(r.num, r.den);
  let num = pdivmod(r.num, g).q, den = pdivmod(r.den, g).q;
  const l = lead(den);
  num = pscale(num, div(ONE, l));
  den = pscale(den, div(ONE, l));
  return { num, den };
}

/* ---------- LaTeX / ASCII ---------- */

/** Коэффициент·хувьсагч: -\frac{1}{2}x^{2}+3x-1 */
export function ptex(p: Poly, v = "x"): string {
  p = trim(p);
  if (!p.length) return "0";
  let s = "";
  for (let i = p.length - 1; i >= 0; i--) {
    const c = p[i];
    if (isZ(c)) continue;
    const negc = c.n < 0;
    const a = negc ? neg(c) : c;
    const xs = i === 0 ? "" : i === 1 ? v : `${v}^{${i}}`;
    let body: string;
    if (i === 0) body = qTex(a);
    else if (a.n === 1 && a.d === 1) body = xs;
    else if (a.d === 1) body = `${a.n}${xs}`;
    else body = `\\frac{${a.n}}{${a.d}}${xs}`;
    s += negc ? `-${body}` : s ? `+${body}` : body;
  }
  return s;
}

export function pascii(p: Poly, v = "x"): string {
  p = trim(p);
  if (!p.length) return "0";
  let s = "";
  for (let i = p.length - 1; i >= 0; i--) {
    const c = p[i];
    if (isZ(c)) continue;
    const a = c.n < 0 ? neg(c) : c;
    const xs = i === 0 ? "" : i === 1 ? v : `${v}^${i}`;
    const coef = i === 0 ? qAscii(a) : a.n === 1 && a.d === 1 ? "" : a.d === 1 ? `${a.n}` : `(${qAscii(a)})`;
    const body = i === 0 ? coef : coef ? `${coef}*${xs}` : xs;
    s += c.n < 0 ? `-${body}` : s ? `+${body}` : body;
  }
  return s;
}

/* ---------- Язгуур ---------- */

export interface RatRoots {
  roots: { r: Q; m: number }[];
  rest: Poly;
  candidates: Q[];
  scaled: Poly; // бүхэл коэффициенттэй хувилбар
}

/** Рационал язгуурын теорем + олон дахин хуваалт */
export function rationalRoots(p: Poly): RatRoots {
  let rest = primitive(p).prim;
  const scaled = rest;
  const roots: { r: Q; m: number }[] = [];
  let zm = 0;
  while (rest.length > 1 && isZ(rest[0])) { rest = rest.slice(1); zm++; }
  if (zm) roots.push({ r: ZERO, m: zm });
  const candidates: Q[] = [];
  if (deg(rest) >= 1) {
    const a0 = Math.abs(rest[0].n), an = Math.abs(lead(rest).n);
    if (a0 > 1e12 || an > 1e12) throw new ExactFail("coefficients too big");
    const ps = divisors(a0), qs = divisors(an);
    const seen = new Set<string>();
    for (const pp of ps) for (const qq of qs) {
      for (const s of [1, -1]) {
        const c = q(s * pp, qq);
        const k = `${c.n}/${c.d}`;
        if (!seen.has(k)) { seen.add(k); candidates.push(c); }
      }
    }
    candidates.sort((a, b) => Math.abs(val(a)) - Math.abs(val(b)) || val(b) - val(a));
    for (const c of candidates) {
      if (deg(rest) < 1) break;
      let m = 0;
      while (deg(rest) >= 1 && isZ(pevalQ(rest, c))) {
        rest = pdivmod(rest, [neg(c), ONE]).q;
        m++;
      }
      if (m) roots.push({ r: c, m });
    }
  }
  roots.sort((a, b) => val(a.r) - val(b.r));
  return { roots, rest, candidates, scaled };
}

/** Хорнерийн схем: p-г (x - r)-ээр хуваах мөрүүд */
export function horner(p: Poly, r: Q): { top: Q[]; bottom: Q[]; rem: Q } {
  const top = trim(p).slice().reverse();
  const bottom: Q[] = [];
  let acc = ZERO;
  for (const c of top) {
    acc = add(mul(acc, r), c);
    bottom.push(acc);
  }
  const rem = bottom.pop()!;
  return { top, bottom, rem };
}

export function hornerTex(p: Poly, r: Q): string {
  const { top, bottom, rem } = horner(p, r);
  const cols = "c".repeat(top.length);
  return `\\begin{array}{c|${cols}} & ${top.map(qTex).join(" & ")} \\\\ \\hline ${qTex(r)} & ${bottom.map(qTex).join(" & ")} & \\mathbf{${qTex(rem)}} \\end{array}`;
}

/** Бодит язгуурууд (тоон): уламжлалын язгуураар завсар хувааж хоёр хуваана */
export function realRootsNum(p: Poly): number[] {
  p = trim(p);
  const d = p.length - 1;
  if (d < 1) return [];
  if (d === 1) return [-val(p[0]) / val(p[1])];
  const an = Math.abs(val(p[d]));
  let B = 1;
  for (let i = 0; i < d; i++) B = Math.max(B, 1 + Math.abs(val(p[i])) / an);
  const crit = realRootsNum(pderiv(p)).filter((c) => c > -B && c < B);
  const pts = [-B, ...crit, B];
  const f = (x: number) => pval(p, x);
  let scale = 0;
  for (const c of p) scale = Math.max(scale, Math.abs(val(c)));
  const out: number[] = [];
  const push = (x: number) => { if (!out.some((y) => Math.abs(y - x) < 1e-7)) out.push(x); };
  for (let i = 0; i < pts.length - 1; i++) {
    let lo = pts[i], hi = pts[i + 1];
    let flo = f(lo), fhi = f(hi);
    if (Math.abs(flo) < 1e-11 * scale) { push(lo); continue; }
    if (flo * fhi < 0) {
      for (let k = 0; k < 200 && hi - lo > 1e-15 * Math.max(1, Math.abs(lo)); k++) {
        const mid = (lo + hi) / 2, fm = f(mid);
        if (fm === 0) { lo = hi = mid; break; }
        if (fm * flo < 0) { hi = mid; fhi = fm; } else { lo = mid; flo = fm; }
      }
      push((lo + hi) / 2);
    }
  }
  if (Math.abs(f(B)) < 1e-11 * scale) push(B);
  return out.sort((a, b) => a - b);
}

export { qTex, powQ, val };
