/* ============================================================================
 * Олон хувьсагчийн олон гишүүнт (рационал коэффициент, ЯГ).
 * Хаалт задлах, үржигдэхүүнд задлах, систем, тригонометрийн орлуулгад.
 * ========================================================================== */

import { freeSymbols, type Node } from "../core/expr.ts";
import { type Q, q, ZERO, ONE, add, mul, neg, isZ, div, qTex, qAscii, eq as qeq } from "./q.ts";
import { evalExact, asQ } from "./exact.ts";
import { type Poly, trim } from "./poly.ts";

export type Mono = Record<string, number>;
export interface MTerm {
  m: Mono;
  c: Q;
}
export type MPoly = Map<string, MTerm>;

export function monoKey(m: Mono): string {
  return Object.keys(m)
    .filter((k) => m[k])
    .sort()
    .map((k) => `${k}^${m[k]}`)
    .join("*");
}
function clean(m: Mono): Mono {
  const r: Mono = {};
  for (const k of Object.keys(m).sort()) if (m[k]) r[k] = m[k];
  return r;
}

export function mconst(c: Q): MPoly {
  const p: MPoly = new Map();
  if (!isZ(c)) p.set("", { m: {}, c });
  return p;
}
export function mvar(v: string): MPoly {
  return new Map([[`${v}^1`, { m: { [v]: 1 }, c: ONE }]]);
}
export function mterm(m: Mono, c: Q): MPoly {
  const cm = clean(m);
  return isZ(c) ? new Map() : new Map([[monoKey(cm), { m: cm, c }]]);
}

export function madd(a: MPoly, b: MPoly): MPoly {
  const r: MPoly = new Map(a);
  for (const [k, t] of b) {
    const o = r.get(k);
    if (o) {
      const c = add(o.c, t.c);
      if (isZ(c)) r.delete(k);
      else r.set(k, { m: o.m, c });
    } else r.set(k, t);
  }
  return r;
}
export const mneg = (a: MPoly): MPoly => new Map([...a].map(([k, t]) => [k, { m: t.m, c: neg(t.c) }]));
export const msub = (a: MPoly, b: MPoly) => madd(a, mneg(b));
export function mscale(a: MPoly, k: Q): MPoly {
  if (isZ(k)) return new Map();
  return new Map([...a].map(([key, t]) => [key, { m: t.m, c: mul(t.c, k) }]));
}
export function mmulMono(a: Mono, b: Mono): Mono {
  const r: Mono = { ...a };
  for (const k in b) r[k] = (r[k] ?? 0) + b[k];
  return clean(r);
}
export function mmul(a: MPoly, b: MPoly): MPoly {
  let r: MPoly = new Map();
  if (a.size * b.size > 20000) throw new Error("too big");
  for (const s of a.values()) for (const t of b.values()) r = madd(r, mterm(mmulMono(s.m, t.m), mul(s.c, t.c)));
  return r;
}
export function mpow(a: MPoly, k: number): MPoly {
  if (k > 40) throw new Error("too big");
  let r = mconst(ONE);
  for (let i = 0; i < k; i++) r = mmul(r, a);
  return r;
}
export const misZero = (a: MPoly) => a.size === 0;
export const mequal = (a: MPoly, b: MPoly) => misZero(msub(a, b));

export function mvars(a: MPoly): string[] {
  const s = new Set<string>();
  for (const t of a.values()) for (const k in t.m) s.add(k);
  return [...s].sort();
}
export const tdeg = (m: Mono) => Object.values(m).reduce((s, e) => s + e, 0);
export function mtotalDeg(a: MPoly): number {
  let d = -1;
  for (const t of a.values()) d = Math.max(d, tdeg(t.m));
  return d;
}
export function mdegIn(a: MPoly, v: string): number {
  let d = 0;
  for (const t of a.values()) d = Math.max(d, t.m[v] ?? 0);
  return d;
}

/** v-ийн зэргээр коэффициентууд: p = Σ c_k v^k */
export function mcoeffs(a: MPoly, v: string): MPoly[] {
  const out: MPoly[] = [];
  for (const t of a.values()) {
    const k = t.m[v] ?? 0;
    const m = { ...t.m };
    delete m[v];
    while (out.length <= k) out.push(new Map());
    out[k] = madd(out[k], mterm(m, t.c));
  }
  return out;
}

/** v-г өөр олон гишүүнтээр орлуулна */
export function msubst(a: MPoly, v: string, b: MPoly): MPoly {
  let r: MPoly = new Map();
  const cs = mcoeffs(a, v);
  let pw = mconst(ONE);
  for (let k = 0; k < cs.length; k++) {
    if (k) pw = mmul(pw, b);
    r = madd(r, mmul(cs[k], pw));
  }
  return r;
}

/** Нэг хувьсагчтай бол Poly (v-ээр) */
export function toUni(a: MPoly, v: string): Poly | null {
  const vs = mvars(a);
  if (vs.some((x) => x !== v)) return null;
  const p: Poly = [];
  for (const t of a.values()) {
    const k = t.m[v] ?? 0;
    while (p.length <= k) p.push(ZERO);
    p[k] = add(p[k], t.c);
  }
  return trim(p);
}
export function fromUni(p: Poly, v: string): MPoly {
  let r: MPoly = new Map();
  p.forEach((c, i) => { r = madd(r, mterm(i ? { [v]: i } : {}, c)); });
  return r;
}

/** Тогтмол бол Q */
export function masConst(a: MPoly): Q | null {
  if (a.size === 0) return ZERO;
  if (a.size === 1 && a.has("")) return a.get("")!.c;
  return null;
}

/* ---------- Модноос ---------- */

export interface MFromOpts {
  /** Дэд модыг тэмдэгт болгон солих (тригонометрийн орлуулга г.м.) */
  map?: (n: Node) => string | null;
  /** Зөвшөөрөх хувьсагчид (бусад нь → null) */
  vars?: Set<string>;
}

export function mfrom(node: Node, opts: MFromOpts = {}): MPoly | null {
  try {
    return mf(node, opts);
  } catch {
    return null;
  }
}
function constQ(n: Node): Q | null {
  try {
    return asQ(evalExact(n));
  } catch {
    return null;
  }
}
function mf(n: Node, o: MFromOpts): MPoly | null {
  const sym = o.map?.(n);
  if (sym) return mvar(sym);
  if (freeSymbols(n).size === 0) {
    const c = constQ(n);
    return c ? mconst(c) : null;
  }
  switch (n.t) {
    case "sym":
      if (n.n === "pi" || n.n === "e") return null;
      if (o.vars && !o.vars.has(n.n)) return null;
      return mvar(n.n);
    case "neg": { const a = mf(n.a, o); return a && mneg(a); }
    case "add": case "sub": case "mul": {
      const a = mf(n.a, o), b = mf(n.b, o);
      if (!a || !b) return null;
      return n.t === "add" ? madd(a, b) : n.t === "sub" ? msub(a, b) : mmul(a, b);
    }
    case "div": {
      const a = mf(n.a, o);
      const b = freeSymbols(n.b).size === 0 ? constQ(n.b) : null;
      if (!a || !b || isZ(b)) return null;
      return mscale(a, div(ONE, b));
    }
    case "pow": {
      const e = freeSymbols(n.b).size === 0 ? constQ(n.b) : null;
      if (!e || e.d !== 1 || e.n < 0 || e.n > 40) return null;
      const a = mf(n.a, o);
      return a && mpow(a, e.n);
    }
  }
  return null;
}

/* ---------- Эрэмбэ ба LaTeX ---------- */

/** Нийт зэргээр буурах, дараа нь үсгийн дарааллаар (x^2+2xy+y^2) */
export function sortedTerms(a: MPoly, order?: string[]): MTerm[] {
  const vs = order ?? mvars(a);
  return [...a.values()].sort((s, t) => {
    const d = tdeg(t.m) - tdeg(s.m);
    if (d) return d;
    for (const v of vs) {
      const e = (t.m[v] ?? 0) - (s.m[v] ?? 0);
      if (e) return e;
    }
    return 0;
  });
}

export function monoTex(m: Mono): string {
  return Object.keys(m)
    .sort()
    .map((k) => (m[k] === 1 ? k : `${k}^{${m[k]}}`))
    .join("");
}

export function mtex(a: MPoly, order?: string[]): string {
  if (a.size === 0) return "0";
  let s = "";
  for (const t of sortedTerms(a, order)) {
    const negc = t.c.n < 0;
    const c = negc ? neg(t.c) : t.c;
    const mt = monoTex(t.m);
    let body: string;
    if (!mt) body = qTex(c);
    else if (c.n === 1 && c.d === 1) body = mt;
    else if (c.d === 1) body = `${c.n}${mt}`;
    else body = `\\frac{${c.n}}{${c.d}}${mt}`;
    s += negc ? `-${body}` : s ? `+${body}` : body;
  }
  return s;
}

export function mascii(a: MPoly): string {
  if (a.size === 0) return "0";
  let s = "";
  for (const t of sortedTerms(a)) {
    const negc = t.c.n < 0;
    const c = negc ? neg(t.c) : t.c;
    const mt = Object.keys(t.m).sort().map((k) => (t.m[k] === 1 ? k : `${k}^${t.m[k]}`)).join("*");
    const cs = c.d === 1 ? String(c.n) : `(${qAscii(c)})`;
    const body = !mt ? qAscii(c) : c.n === 1 && c.d === 1 ? mt : `${cs}*${mt}`;
    s += negc ? `-${body}` : s ? `+${body}` : body;
  }
  return s;
}

/** Хоёр нэг гишүүнт ижил эсэх */
export function monoEq(a: Mono, b: Mono): boolean {
  return monoKey(a) === monoKey(b);
}
export { qeq, q };
