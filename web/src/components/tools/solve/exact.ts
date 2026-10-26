/* ============================================================================
 * ЯГ тоо: рационал коэффициенттэй язгуур, π, e-гийн нийлбэр.
 *
 *   x = Σ c_i · r_i^{1/n_i} · π^{p_i} · e^{q_i}
 *
 * Жишээ: \frac{1+\sqrt5}{2}, 2-\sqrt3, \frac{\pi}{6}, 3\sqrt[3]{2}.
 * Хуваарийг хосмог үржвэрээр язгуургүй болгоно, √(a+b√r)-г задлахыг оролдоно.
 * Чадахгүй бол ExactFail — дээд түвшин нь аравтын ойролцоо руу шилжинэ.
 * Бодит тоонд тодорхойлогдохгүй (√-1, 1/0, log(-1)) бол NotReal.
 * ========================================================================== */

import type { Node } from "../core/expr.ts";
import {
  ExactFail, type Q, q, ZERO, ONE, add as qadd, mul as qmul, inv as qinv, neg as qneg, isZ, val, igcd, ilcm,
  smul, factorInt, decToQ, eq as qeq, qTex, powQ, sub as qsub, qroot, iroot,
} from "./q.ts";

export { ExactFail };
export class NotReal extends Error {}

export interface Term {
  c: Q;
  /** язгуурын зэрэг (1 = язгуургүй) */
  n: number;
  /** язгуур доорх бүхэл (≥1, n-р зэргийн хүчин зүйлгүй) */
  r: number;
  pi: number;
  e: number;
}
export type X = Term[];

const MAX_TERMS = 48;

const key = (t: Term) => `${t.n}|${t.r}|${t.pi}|${t.e}`;

function normalize(ts: Term[]): X {
  const m = new Map<string, Term>();
  for (const t of ts) {
    if (isZ(t.c)) continue;
    const k = key(t);
    const old = m.get(k);
    if (old) m.set(k, { ...old, c: qadd(old.c, t.c) });
    else m.set(k, t);
  }
  const out = [...m.values()].filter((t) => !isZ(t.c));
  if (out.length > MAX_TERMS) throw new ExactFail("too many terms");
  return out.sort((a, b) => a.pi - b.pi || a.e - b.e || a.n - b.n || a.r - b.r);
}

/* ---------- Үүсгэх ---------- */

export const xq = (a: Q): X => (isZ(a) ? [] : [{ c: a, n: 1, r: 1, pi: 0, e: 0 }]);
export const xint = (k: number): X => xq(q(k));
export const XZERO: X = [];
export const XONE: X = xint(1);
export const XPI: X = [{ c: ONE, n: 1, r: 1, pi: 1, e: 0 }];
export const XE: X = [{ c: ONE, n: 1, r: 1, pi: 0, e: 1 }];

/** Анхны тооны зэргийн зураглалаас n-р язгуурын нэр томъёо: гадагш гаргаж, зэргийг багасгана */
function radTerm(c: Q, n: number, exps: Map<number, number>, pi = 0, e = 0): Term {
  let out = 1;
  const inner = new Map<number, number>();
  for (const [p, k] of exps) {
    if (k === 0) continue;
    if (k < 0) throw new ExactFail("negative radicand exponent");
    const o = Math.floor(k / n), r = k % n;
    for (let i = 0; i < o; i++) out = smul(out, p);
    if (r) inner.set(p, r);
  }
  let g = n;
  for (const k of inner.values()) g = igcd(g, k);
  if (inner.size === 0) g = n;
  const nn = inner.size === 0 ? 1 : n / g;
  let r = 1;
  for (const [p, k] of inner) for (let i = 0; i < k / g; i++) r = smul(r, p);
  return { c: qmul(c, q(out)), n: nn, r, pi, e };
}

function expsOf(r: number, mult = 1, acc = new Map<number, number>()): Map<number, number> {
  for (const [p, k] of factorInt(r)) acc.set(p, (acc.get(p) ?? 0) + k * mult);
  return acc;
}

function mulTerm(a: Term, b: Term): Term {
  const c = qmul(a.c, b.c);
  if (a.n === 1 && b.n === 1) return { c, n: 1, r: 1, pi: a.pi + b.pi, e: a.e + b.e };
  const m = ilcm(a.n, b.n);
  const exps = expsOf(a.r, m / a.n);
  expsOf(b.r, m / b.n, exps);
  return radTerm(c, m, exps, a.pi + b.pi, a.e + b.e);
}

/* ---------- Арифметик ---------- */

export const xadd = (a: X, b: X): X => normalize([...a, ...b]);
export const xneg = (a: X): X => a.map((t) => ({ ...t, c: qneg(t.c) }));
export const xsub = (a: X, b: X): X => xadd(a, xneg(b));
export function xmul(a: X, b: X): X {
  if (a.length * b.length > 400) throw new ExactFail("too big");
  const out: Term[] = [];
  for (const s of a) for (const t of b) out.push(mulTerm(s, t));
  return normalize(out);
}
export const xscale = (a: X, k: Q): X => normalize(a.map((t) => ({ ...t, c: qmul(t.c, k) })));

export const isZero = (a: X) => a.length === 0;
export function asQ(a: X): Q | null {
  if (a.length === 0) return ZERO;
  if (a.length === 1 && a[0].n === 1 && a[0].pi === 0 && a[0].e === 0) return a[0].c;
  return null;
}
export const isRational = (a: X) => asQ(a) !== null;

export function approx(a: X): number {
  let s = 0;
  for (const t of a) s += val(t.c) * Math.pow(t.r, 1 / t.n) * Math.pow(Math.PI, t.pi) * Math.pow(Math.E, t.e);
  return s;
}

/** Тэмдэг: яг тэг бол 0, үгүй бол ойролцоо утгын тэмдэг */
export function xsign(a: X): number {
  if (a.length === 0) return 0;
  return Math.sign(approx(a));
}
export const xcmp = (a: X, b: X) => xsign(xsub(a, b));
export const xeq = (a: X, b: X) => isZero(xsub(a, b));

function invMonomial(t: Term): Term {
  if (t.n === 1) return { c: qinv(t.c), n: 1, r: 1, pi: -t.pi, e: -t.e };
  // 1/(c r^{1/n}) = r^{(n-1)/n} / (c r)
  const exps = expsOf(t.r, t.n - 1);
  return radTerm(qinv(qmul(t.c, q(t.r))), t.n, exps, -t.pi, -t.e);
}

export function xinv(a: X): X {
  if (a.length === 0) throw new NotReal("zero division");
  if (a.length === 1) return [invMonomial(a[0])];
  // нийтлэг трансцендент хэсэг (π^p e^q) ижил, язгуур нь зөвхөн квадрат байх ёстой
  const { pi, e } = a[0];
  if (a.some((t) => t.pi !== pi || t.e !== e || t.n > 2)) throw new ExactFail("cannot rationalize");
  let den: X = a.map((t) => ({ ...t, pi: 0, e: 0 }));
  let num: X = XONE;
  for (let guard = 0; guard < 12 && !isRational(den); guard++) {
    // анхны p-г агуулсан язгууруудыг тусгаарлана: D = A + √p·B → (A - √p·B)-аар үржүүлнэ
    const t0 = den.find((t) => t.r > 1)!;
    const p = factorInt(t0.r)[0][0];
    const conj = den.map((t) => (t.r % p === 0 ? { ...t, c: qneg(t.c) } : t));
    num = xmul(num, conj);
    den = xmul(den, conj);
  }
  const dq = asQ(den);
  if (!dq || isZ(dq)) throw new ExactFail("cannot rationalize");
  return xmul(xscale(num, qinv(dq)), [{ c: ONE, n: 1, r: 1, pi: -pi, e: -e }]);
}
export const xdiv = (a: X, b: X): X => xmul(a, xinv(b));

export function xpowInt(a: X, k: number): X {
  if (!Number.isInteger(k) || Math.abs(k) > 200) throw new ExactFail("power");
  if (k < 0) return xinv(xpowInt(a, -k));
  if (k === 0) return XONE;
  if (a.length > 1 && k > 12) throw new ExactFail("power too big");
  let r: X = XONE, b = a;
  while (k > 0) {
    if (k & 1) r = xmul(r, b);
    k >>= 1;
    if (k) b = xmul(b, b);
  }
  return r;
}

/** k-р язгуур (бодит) */
export function xroot(a: X, k: number): X {
  if (!Number.isInteger(k) || k < 1) throw new ExactFail("root index");
  if (k === 1 || a.length === 0) return a;
  if (a.length === 1) {
    const t = a[0];
    if (t.pi % k !== 0 || t.e % k !== 0) throw new ExactFail("transcendental root");
    let c = t.c;
    let negative = false;
    if (c.n < 0) {
      if (k % 2 === 0) throw new NotReal("even root of negative");
      negative = true;
      c = qneg(c);
    }
    // (a/b)^{1/k} = (a·b^{k-1})^{1/k} / b
    const exps = expsOf(c.n);
    expsOf(c.d, k - 1, exps);
    const outer = radTerm(q(1, c.d), k, exps, t.pi / k, t.e / k);
    let res: Term = outer;
    if (t.n > 1) {
      const inner = radTerm(ONE, t.n * k, expsOf(t.r));
      res = mulTerm(outer, inner);
    }
    if (negative) res = { ...res, c: qneg(res.c) };
    return [res];
  }
  if (k === 2) return sqrtDenest(a);
  throw new ExactFail("root of sum");
}

/** √(A + B√r) = √x ± √y, x,y = (A ± √(A²-B²r))/2 */
function sqrtDenest(a: X): X {
  if (a.length !== 2 && a.length !== 1) throw new ExactFail("denest");
  const rat = a.find((t) => t.n === 1 && t.pi === 0 && t.e === 0);
  const rad = a.find((t) => t.n === 2 && t.pi === 0 && t.e === 0);
  if (!rat || !rad || a.length !== 2) throw new ExactFail("denest");
  if (approx(a) < 0) throw new NotReal("negative");
  const A = rat.c, B = rad.c, r = rad.r;
  const D = qsub(qmul(A, A), qmul(qmul(B, B), q(r)));
  if (D.n < 0) throw new ExactFail("denest");
  const s = qroot(D, 2);
  if (!s) throw new ExactFail("denest");
  const x = qmul(qadd(A, s), q(1, 2)), y = qmul(qsub(A, s), q(1, 2));
  if (x.n < 0 || y.n < 0) throw new ExactFail("denest");
  const sx = xroot(xq(x), 2), sy = xroot(xq(y), 2);
  return B.n > 0 ? xadd(sx, sy) : xsub(sx, sy);
}

export function xpow(a: X, b: X): X {
  const bq = asQ(b);
  if (!bq) throw new ExactFail("irrational exponent");
  if (bq.d === 1) {
    if (isZero(a) && bq.n <= 0) throw new NotReal("0^0");
    return xpowInt(a, bq.n);
  }
  if (isZero(a)) {
    if (bq.n < 0) throw new NotReal("0^neg");
    return XZERO;
  }
  const r = xroot(a, bq.d);
  return xpowInt(r, bq.n);
}

/* ---------- Тригонометр ---------- */

let SIN12: X[] | null = null;
function sinTable(): X[] {
  if (SIN12) return SIN12;
  const s2 = xroot(xint(2), 2), s3 = xroot(xint(3), 2), s6 = xroot(xint(6), 2);
  const quarter = (v: X) => xscale(v, q(1, 4));
  SIN12 = [
    XZERO,
    quarter(xsub(s6, s2)),
    xq(q(1, 2)),
    xscale(s2, q(1, 2)),
    xscale(s3, q(1, 2)),
    quarter(xadd(s6, s2)),
    XONE,
  ];
  return SIN12;
}
function sinK(k: number): X {
  k = ((k % 24) + 24) % 24;
  const t = sinTable();
  if (k <= 6) return t[k];
  if (k <= 12) return t[12 - k];
  return xneg(sinK(k - 12));
}

/** Өнцгийг π/12-ийн бүхэл тоо (k) болгоно; боломжгүй бол null */
function angleK(a: X, degrees: boolean): number | null {
  if (a.length === 0) return 0;
  if (degrees) {
    const d = asQ(a);
    if (!d) return null;
    const k = qmul(d, q(1, 15));
    return k.d === 1 ? k.n : null;
  }
  if (a.length !== 1) return null;
  const t = a[0];
  if (t.n !== 1 || t.pi !== 1 || t.e !== 0) return null;
  const k = qmul(t.c, q(12));
  return k.d === 1 ? k.n : null;
}
const kToAngle = (k: number, degrees: boolean): X => (degrees ? xint(15 * k) : xscale(XPI, q(k, 12)));

export function xtrig(f: string, a: X, degrees = false): X {
  const k = angleK(a, degrees);
  if (k === null) throw new ExactFail("non-table angle");
  const s = sinK(k), c = sinK(k + 6);
  switch (f) {
    case "sin": return s;
    case "cos": return c;
    case "tan": if (isZero(c)) throw new NotReal("tan undefined"); return xdiv(s, c);
    case "cot": if (isZero(s)) throw new NotReal("cot undefined"); return xdiv(c, s);
  }
  throw new ExactFail("trig");
}

export function xatrig(f: string, v: X, degrees = false): X {
  const find = (fn: (k: number) => X | null, ks: number[]): number | null => {
    for (const k of ks) {
      const w = fn(k);
      if (w && xeq(w, v)) return k;
    }
    return null;
  };
  const range = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
  const av = approx(v);
  switch (f) {
    case "asin": case "acos": {
      if (Math.abs(av) > 1 + 1e-12) throw new NotReal("asin domain");
      const k = find(sinK, range(-6, 6));
      if (k === null) throw new ExactFail("non-table");
      return kToAngle(f === "asin" ? k : 6 - k, degrees);
    }
    case "atan": case "acot": {
      if (f === "acot" && isZero(v)) return kToAngle(6, degrees);
      const target = f === "acot" ? xinv(v) : v;
      const k = find((kk) => xdiv(sinK(kk), sinK(kk + 6)), range(-5, 5).filter((kk) => kk !== 0 || isZero(target)));
      const k0 = isZero(target) ? 0 : k;
      if (k0 === null) throw new ExactFail("non-table");
      if (f === "atan") return kToAngle(k0, degrees);
      return kToAngle(k0 < 0 ? k0 + 12 : k0, degrees); // arcctg ∈ (0; π)
    }
  }
  throw new ExactFail("atrig");
}

/* ---------- Логарифм ---------- */

/** Эерэг ганц гишүүний «анхны зэрэг»: 0-р түлхүүр = e */
function logExps(a: X): Map<number, Q> | null {
  if (a.length !== 1) return null;
  const t = a[0];
  if (t.pi !== 0 || t.c.n <= 0) return null;
  const m = new Map<number, Q>();
  const addE = (p: number, k: Q) => m.set(p, qadd(m.get(p) ?? ZERO, k));
  for (const [p, k] of factorInt(t.c.n)) addE(p, q(k));
  for (const [p, k] of factorInt(t.c.d)) addE(p, q(-k));
  if (t.r > 1) for (const [p, k] of factorInt(t.r)) addE(p, q(k, t.n));
  if (t.e) addE(0, q(t.e));
  for (const [p, k] of [...m]) if (isZ(k)) m.delete(p);
  return m;
}

/** log_b(x) яг рационал бол буцаана */
export function xlog(b: X, x: X): X {
  if (xsign(x) <= 0) throw new NotReal("log of non-positive");
  if (xsign(b) <= 0 || xeq(b, XONE)) throw new NotReal("bad log base");
  if (xeq(x, XONE)) return XZERO;
  const ex = logExps(x), eb = logExps(b);
  if (!ex || !eb || eb.size === 0) throw new ExactFail("log");
  const [p0, k0] = [...eb][0];
  const t = qmul(ex.get(p0) ?? ZERO, qinv(k0));
  const keys = new Set([...ex.keys(), ...eb.keys()]);
  for (const p of keys) if (!qeq(ex.get(p) ?? ZERO, qmul(t, eb.get(p) ?? ZERO))) throw new ExactFail("log not rational");
  return xq(t);
}

/* ---------- LaTeX ---------- */

function transTex(pi: number, e: number): string {
  let s = "";
  if (pi) s += pi === 1 ? "\\pi" : `\\pi^{${pi}}`;
  if (e) s += e === 1 ? "e" : `e^{${e}}`;
  return s;
}
function radTex(n: number, r: number): string {
  if (r === 1) return "";
  return n === 2 ? `\\sqrt{${r}}` : `\\sqrt[${n}]{${r}}`;
}
/** |k|·язгуур·π (k бүхэл, k≠0) */
function bodyTex(k: number, t: Term): string {
  const rad = radTex(t.n, t.r) + transTex(t.pi, t.e);
  const ak = Math.abs(k);
  if (!rad) return String(ak);
  return ak === 1 ? rad : `${ak}${rad}`;
}

export function xtex(a: X): string {
  if (a.length === 0) return "0";
  if (a.some((t) => t.pi < 0 || t.e < 0)) {
    // сөрөг трансцендент зэрэгтэй — гишүүн бүрийг тусад нь бутархай болгоно
    return a
      .map((t, i) => {
        const up: Term = { ...t, pi: Math.max(0, t.pi), e: Math.max(0, t.e) };
        const down = transTex(Math.max(0, -t.pi), Math.max(0, -t.e));
        const top = bodyTex(t.c.n, up);
        const s = t.c.n < 0 ? "-" : i ? "+" : "";
        const den = (t.c.d === 1 ? "" : String(t.c.d)) + down;
        return den ? `${s}\\frac{${top}}{${den}}` : `${s}${top}`;
      })
      .join("");
  }
  // сурах бичгийн хэв: эерэг гишүүнээр эхэлнэ (\sqrt2-1, -1+\sqrt2 биш)
  const firstPos = a.findIndex((t) => t.c.n > 0);
  if (firstPos > 0) a = [a[firstPos], ...a.slice(0, firstPos), ...a.slice(firstPos + 1)];
  let L = 1;
  for (const t of a) L = ilcm(L, t.c.d);
  const ks = a.map((t) => smul(t.c.n, L / t.c.d));
  let flip = false;
  if (L > 1 && ks.every((k) => k < 0)) flip = true;
  const parts = a.map((t, i) => {
    const k = flip ? -ks[i] : ks[i];
    const sgn = k < 0 ? "-" : i ? "+" : "";
    return sgn + bodyTex(k, t);
  });
  const numer = parts.join("");
  if (L === 1) return numer;
  return `${flip ? "-" : ""}\\frac{${numer}}{${L}}`;
}

/** SvgLabel-д тохирох богино бичвэр: 1/2, (1+\sqrt{5})/2, \pi/6 */
export function xlabel(a: X): string {
  const tex = xtex(a);
  const m = /^(-?)\\frac\{(.+)\}\{(\d+)\}$/.exec(tex);
  if (m && !m[2].includes("\\frac")) {
    const top = /[+-]/.test(m[2].slice(1)) ? `(${m[2]})` : m[2];
    return `${m[1]}${top}/${m[3]}`;
  }
  if (tex.includes("\\frac")) return String(Number(approx(a).toFixed(2)));
  return tex;
}

/* ---------- Модноос ЯГ тооцоо ---------- */

export interface ExactOpts {
  degrees?: boolean;
  scope?: Record<string, X>;
}

function factQ(n: number): Q {
  if (!Number.isInteger(n) || n < 0) throw new ExactFail("factorial");
  if (n > 18) throw new ExactFail("factorial too big");
  let r = 1;
  for (let i = 2; i <= n; i++) r *= i;
  return q(r);
}

export function evalExact(node: Node, opts: ExactOpts = {}): X {
  const go = (n: Node): X => evalExact(n, opts);
  switch (n_t(node)) {
    case "num": {
      const v = (node as { v: number }).v;
      if (!Number.isFinite(v)) throw new ExactFail("inf");
      return xq(decToQ(v));
    }
    case "sym": {
      const name = (node as { n: string }).n;
      if (opts.scope && opts.scope[name]) return opts.scope[name];
      if (name === "pi") return XPI;
      if (name === "e") return XE;
      throw new ExactFail("free symbol");
    }
  }
  switch (node.t) {
    case "neg": return xneg(go(node.a));
    case "add": return xadd(go(node.a), go(node.b));
    case "sub": return xsub(go(node.a), go(node.b));
    case "mul": return xmul(go(node.a), go(node.b));
    case "div": return xdiv(go(node.a), go(node.b));
    case "pow": return xpow(go(node.a), go(node.b));
    case "fact": {
      const a = asQ(go(node.a));
      if (!a || a.d !== 1) throw new ExactFail("factorial");
      return xq(factQ(a.n));
    }
    case "call": {
      const args = node.args.map(go);
      const [a, b] = args;
      switch (node.f) {
        case "sqrt": return xroot(a, 2);
        case "cbrt": return xroot(a, 3);
        case "root": {
          const k = asQ(a);
          if (!k || k.d !== 1 || k.n < 1) throw new ExactFail("root index");
          return xroot(b, k.n);
        }
        case "abs": return xsign(a) < 0 ? xneg(a) : a;
        case "sin": case "cos": case "tan": case "cot": return xtrig(node.f, a, opts.degrees);
        case "asin": case "acos": case "atan": case "acot": return xatrig(node.f, a, opts.degrees);
        case "ln": return xlog(XE, a);
        case "lg": return xlog(xint(10), a);
        case "log": return xlog(a, b);
        case "exp": return xpow(XE, a);
        case "sign": return xint(xsign(a));
        case "floor": case "ceil": case "round": {
          const r = asQ(a);
          const v = approx(a);
          if (!r && Math.abs(v - Math.round(v)) < 1e-9) throw new ExactFail("near integer");
          const fn = node.f === "floor" ? Math.floor : node.f === "ceil" ? Math.ceil : Math.round;
          return xint(fn(r ? val(r) : v));
        }
        case "min": case "max": {
          let best = args[0];
          for (const x of args.slice(1)) {
            const c = xcmp(x, best);
            if ((node.f === "min" && c < 0) || (node.f === "max" && c > 0)) best = x;
          }
          return best;
        }
      }
      throw new ExactFail("function");
    }
  }
  throw new ExactFail("node");
}
function n_t(node: Node): string {
  return node.t;
}

/** Олон гишүүнтийн рационал коэффициентийг ЯГ тоогоор */
export const fromQ = xq;
export { qTex, powQ, iroot };
