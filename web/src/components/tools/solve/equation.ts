/* ============================================================================
 * Нэг үл мэдэгдэгчтэй тэгшитгэл: ангилж, алхамтай бодно.
 *
 * F(x) = L - R = 0 гэж үзээд дарааллаар оролдоно:
 *   олон гишүүнт → рационал (ОЗ) → модуль (завсрын арга) → иррациональ
 *   (квадрат зэрэгт дэвшүүлж шалгах) → үзүүлэнт → логарифм → тригонометр.
 * Олдсон язгуур бүрийг анхны тэгшитгэлд орлуулж ЯГ (эсвэл тоогоор) шалгана —
 * шалгалт унавал хариу гаргахгүй. Чадахгүй бол үнэнээр хэлнэ.
 * ========================================================================== */

import { compile, freeSymbols, same, toLatex, type Node, type RelOp } from "../core/expr.ts";
import { type Q, q, ZERO, ONE, isZ, val, qTex, div as qdiv, mul as qmul, neg as qneg, add as qadd, igcd, ilcm, ExactFail } from "./q.ts";
import {
  type X, xq, XE, XPI, xint, evalExact, asQ, isZero, xsign, xcmp, xeq, xdiv, xsub, xmul, xneg, xadd, xpow, xlog, xtex,
  xatrig, approx, NotReal, xscale, iroot,
} from "./exact.ts";
import {
  type Poly, polyFrom, ratFrom, ptex, psub, pmul, padd, pscale, deg, isZeroP, trim, constP, ppow,
} from "./poly.ts";
import { type Root, type Roots, solvePoly, rootX, rootNum, mergeRoots, rootsTex } from "./roots.ts";
import { mfrom, mvars, toUni, mterm, madd, mmul, mpow, mconst, mvar, msub, tdeg, type MPoly } from "./mpoly.ts";
import { type Step, type Solution, failure, CANNOT, decTex, toAscii, relTex } from "./steps.ts";

/* ---------- Мод туслахууд ---------- */

export const N = {
  num: (v: number): Node => (v < 0 ? { t: "neg", a: { t: "num", v: -v } } : { t: "num", v }),
  q: (c: Q): Node => {
    const top: Node = { t: "num", v: Math.abs(c.n) };
    const body: Node = c.d === 1 ? top : { t: "div", a: top, b: { t: "num", v: c.d } };
    return c.n < 0 ? { t: "neg", a: body } : body;
  },
  sub: (a: Node, b: Node): Node => ({ t: "sub", a, b }),
  add: (a: Node, b: Node): Node => ({ t: "add", a, b }),
  mul: (a: Node, b: Node): Node => ({ t: "mul", a, b }),
  div: (a: Node, b: Node): Node => ({ t: "div", a, b }),
  pow: (a: Node, b: Node): Node => ({ t: "pow", a, b }),
  neg: (a: Node): Node => ({ t: "neg", a }),
};

export const dep = (n: Node, v: string) => freeSymbols(n).has(v);

export function collect(n: Node, pred: (n: Node) => boolean, acc: Node[] = []): Node[] {
  if (pred(n)) acc.push(n);
  switch (n.t) {
    case "neg": case "fact": collect(n.a, pred, acc); break;
    case "call": n.args.forEach((a) => collect(a, pred, acc)); break;
    case "num": case "sym": break;
    default: collect(n.a, pred, acc); collect(n.b, pred, acc);
  }
  return acc;
}

function mapNode(n: Node, f: (n: Node) => Node | undefined): Node {
  const r = f(n);
  if (r) return r;
  switch (n.t) {
    case "neg": return { t: "neg", a: mapNode(n.a, f) };
    case "fact": return { t: "fact", a: mapNode(n.a, f) };
    case "call": return { t: "call", f: n.f, args: n.args.map((a) => mapNode(a, f)) };
    case "num": case "sym": return n;
    default: return { t: n.t, a: mapNode(n.a, f), b: mapNode(n.b, f) };
  }
}

/** Тоон утга (градусын горимтой) */
export function numAt(F: Node, v: string, x: number, degrees = false): number {
  try {
    return compile(F, { degrees })({ [v]: x });
  } catch {
    return NaN;
  }
}

/** ЯГ утга; чадахгүй бол null, бодит биш бол "nan" */
export function exactAt(F: Node, v: string, x: X, degrees = false): X | null | "nan" {
  try {
    return evalExact(F, { scope: { [v]: x }, degrees });
  } catch (e) {
    if (e instanceof NotReal) return "nan";
    return null;
  }
}

export type Check = "ok" | "bad";
/** Язгуурыг анхны тэгшитгэлд орлуулж шалгана */
export function checkRoot(F: Node, v: string, r: Root, degrees = false): Check {
  if (r.x) {
    const ex = exactAt(F, v, r.x, degrees);
    if (ex === "nan") return "bad";
    if (ex) return isZero(ex) ? "ok" : "bad";
  }
  const y = numAt(F, v, r.v, degrees);
  if (!Number.isFinite(y)) return "bad";
  // хоёр талын хэмжээгээр хүлцэл
  const h = 1e-6 * Math.max(1, Math.abs(r.v));
  const s = Math.max(1, Math.abs(numAt(F, v, r.v + h, degrees)), Math.abs(numAt(F, v, r.v - h, degrees)));
  return Math.abs(y) <= 1e-8 * s ? "ok" : "bad";
}

/* ---------- Үр дүнгийн бүтэц ---------- */

export interface Family {
  tex: string;
  sample: (n: number) => number[];
}

export interface Zeros {
  kind: "finite" | "periodic" | "fail";
  roots: Root[];
  complete: boolean;
  exact: boolean;
  /** x дурын (except-ээс бусад) */
  all?: boolean;
  except?: Root[];
  /** F ≡ 0 байх битүү завсрууд (модультай тэгшитгэлд) */
  segments?: { a: Root; b: Root }[];
  families?: Family[];
  title?: string;
}

interface Ctx {
  v: string;
  degrees: boolean;
  steps: Step[];
  quiet: boolean;
  /** Дээд түвшний харьцаа — гоё хэлбэрийг таних */
  rel?: { lhs: Node; rhs: Node };
  depth: number;
}

const FAIL: Zeros = { kind: "fail", roots: [], complete: false, exact: false };
const fromRoots = (r: Roots, title?: string): Zeros => ({
  kind: "finite", roots: r.roots, complete: r.complete, exact: r.exact, all: r.all, title,
});

function say(c: Ctx, s: Step) {
  if (!c.quiet) c.steps.push(s);
}
function sub(c: Ctx, quiet = c.quiet): Ctx {
  return { ...c, quiet, rel: undefined, depth: c.depth + 1, steps: quiet ? [] : c.steps };
}

/* ---------- Гол хуваарилагч ---------- */

export function findZeros(F: Node, c: Ctx): Zeros {
  if (c.depth > 6) return FAIL;
  if (!dep(F, c.v)) {
    try {
      const k = evalExact(F, { degrees: c.degrees });
      return isZero(k)
        ? { kind: "finite", roots: [], complete: true, exact: true, all: true }
        : { kind: "finite", roots: [], complete: true, exact: true };
    } catch {
      const k = numAt(F, c.v, 0, c.degrees);
      if (Number.isFinite(k) && Math.abs(k) > 1e-9) return { kind: "finite", roots: [], complete: true, exact: true };
      return FAIL;
    }
  }
  const methods = [polyMethod, ratMethod, absMethod, radicalMethod, expMethod, logMethod, trigMethod, quotientMethod, productMethod];
  for (const m of methods) {
    let z: Zeros | null = null;
    const mark = c.steps.length;
    try {
      z = m(F, c);
    } catch (e) {
      if ((globalThis as { SOLVE_DEBUG?: boolean }).SOLVE_DEBUG && !(e instanceof ExactFail) && !(e instanceof NotReal)) throw e;
      z = FAIL;
    }
    if (z) {
      if (z.kind === "fail") c.steps.length = mark; // хагас алхамыг арилгана
      return z;
    }
  }
  return FAIL;
}

/* ---------- 1. Олон гишүүнт ---------- */

function polyTitle(d: number, p: Poly): string {
  if (d < 1) return "Шугаман тэгшитгэл";
  if (d === 1) return "Шугаман тэгшитгэл";
  if (d === 2) return "Квадрат тэгшитгэл";
  if (d === 4 && isZ(p[1] ?? ZERO) && isZ(p[3] ?? ZERO)) return "Биквадрат тэгшитгэл";
  if (d === 3) return "Куб тэгшитгэл";
  return `${d}-р зэргийн тэгшитгэл`;
}

function polyMethod(F: Node, c: Ctx): Zeros | null {
  const p = polyFrom(F, c.v);
  if (!p) return null;
  if (c.rel && !c.quiet) {
    const std = `${ptex(p, c.v)} = 0`;
    const orig = `${toLatex(c.rel.lhs)}=${toLatex(c.rel.rhs)}`;
    if (std.replace(/\s/g, "") !== orig.replace(/\s/g, "")) {
      say(c, { text: "Бүх гишүүнийг зүүн тал руу шилжүүлж эмхэтгэвэл", tex: [std] });
    }
  }
  const r = solvePoly(p, c.steps, { v: c.v, quiet: c.quiet });
  return fromRoots(r, polyTitle(deg(p), p));
}

/* ---------- 2. Рационал (бутархай) ---------- */

function denominators(F: Node, v: string): Node[] {
  const out: Node[] = [];
  collect(F, (n) => {
    if (n.t === "div" && dep(n.b, v)) out.push(n.b);
    if (n.t === "pow" && dep(n.a, v) && !dep(n.b, v)) {
      try {
        const e = asQ(evalExact(n.b));
        if (e && e.n < 0) out.push(n.a);
      } catch { /* */ }
    }
    return false;
  });
  const uniq: Node[] = [];
  for (const d of out) if (!uniq.some((u) => same(u, d))) uniq.push(d);
  return uniq;
}

/** Хуваарь тэг болох цэгүүд (ОЗ-оос хасагдах) */
function excluded(F: Node, c: Ctx): { pts: Root[]; ok: boolean; tex: string[] } {
  const pts: Root[] = [];
  const tex: string[] = [];
  let ok = true;
  for (const d of denominators(F, c.v)) {
    const z = findZeros(d, sub(c, true));
    if (z.kind !== "finite" || !z.complete || z.all) { ok = false; continue; }
    pts.push(...z.roots);
    tex.push(`${toLatex(d)} \\ne 0`);
  }
  return { pts: mergeRoots(pts), ok, tex };
}

const inList = (r: Root, list: Root[]) =>
  list.some((e) => (e.x && r.x ? xeq(e.x, r.x) : Math.abs(e.v - r.v) < 1e-9 * Math.max(1, Math.abs(r.v))));

function ratMethod(F: Node, c: Ctx): Zeros | null {
  const rf = ratFrom(F, c.v);
  if (!rf || deg(rf.den) < 1) return null;
  const ex = excluded(F, c);
  if (!ex.ok) return FAIL;
  if (ex.tex.length) {
    say(c, {
      text: "Тодорхойлогдох муж (ОЗ): хуваарь тэгээс ялгаатай",
      tex: [ex.tex.join(",\\quad ") + (ex.pts.length ? `\\ \\Rightarrow\\ ${c.v} \\ne ${ex.pts.map((p) => p.tex).join(",\\ ")}` : "")],
    });
  }
  // N/D = 0 → N = 0, D ≠ 0 (хүртвэрийн язгуурыг ОЗ-оор шүүнэ)
  const num = rf.num;
  say(c, {
    text: "Ерөнхий хуваарьт оруулбал бутархай тэгтэй тэнцэх нь хүртвэр тэг байх явдал",
    tex: [`${ptex(num, c.v)} = 0`],
  });
  if (isZeroP(num)) {
    return { kind: "finite", roots: [], complete: true, exact: true, all: true, except: ex.pts, title: "Бутархай-рационал тэгшитгэл" };
  }
  const r = solvePoly(num, c.steps, { v: c.v, quiet: c.quiet });
  const good: Root[] = [];
  for (const root of r.roots) {
    if (inList(root, ex.pts)) say(c, { text: `$${c.v} = ${root.tex}$ нь ОЗ-д харьяалагдахгүй тул гаднах язгуур`, tone: "bad" });
    else good.push(root);
  }
  if (r.all) return { kind: "finite", roots: [], complete: true, exact: true, all: true, except: ex.pts, title: "Бутархай-рационал тэгшитгэл" };
  return { kind: "finite", roots: good, complete: r.complete, exact: r.exact, title: "Бутархай-рационал тэгшитгэл" };
}

/* ---------- 3. Модуль ---------- */

const isAbs = (n: Node, v: string) => n.t === "call" && n.f === "abs" && dep(n.args[0], v);

function inside(r: Root, lo: Root | null, hi: Root | null): boolean {
  const ge = (a: Root, b: Root) => (a.x && b.x ? xcmp(a.x, b.x) >= 0 : a.v >= b.v - 1e-9 * Math.max(1, Math.abs(b.v)));
  return (!lo || ge(r, lo)) && (!hi || ge(hi, r));
}

function absMethod(F: Node, c: Ctx): Zeros | null {
  const absNodes = collect(F, (n) => isAbs(n, c.v));
  if (!absNodes.length) return null;

  // |u| = k, |u| = |w| — сурах бичгийн шууд аргууд
  if (c.rel) {
    const { lhs, rhs } = c.rel;
    const [A, B] = isAbs(lhs, c.v) ? [lhs, rhs] : isAbs(rhs, c.v) ? [rhs, lhs] : [null, null];
    if (A && B && A.t === "call") {
      const u = A.args[0];
      if (!dep(B, c.v) && collect(u, (n) => isAbs(n, c.v)).length === 0) {
        let k: X | null = null;
        try { k = evalExact(B); } catch { k = null; }
        if (k) {
          const kt = xtex(k);
          if (xsign(k) < 0) {
            say(c, { text: `Модуль сөрөг тоотой тэнцэхгүй ($${kt} < 0$) тул шийдгүй` });
            return { kind: "finite", roots: [], complete: true, exact: true, title: "Модультай тэгшитгэл" };
          }
          if (isZero(k)) {
            say(c, { text: "Модуль тэгтэй тэнцвэл доторх илэрхийлэл тэг", tex: [`${toLatex(u)} = 0`] });
            const z = findZeros(u, sub(c));
            return z.kind === "fail" ? FAIL : { ...z, title: "Модультай тэгшитгэл" };
          }
          say(c, { text: `$|a| = ${kt}$ $(${kt} > 0)$ бол $a = ${kt}$ эсвэл $a = -${kt.startsWith("-") ? `(${kt})` : kt}$` });
          const all: Root[] = [];
          let complete = true;
          for (const [i, sgn] of [[1, 1], [2, -1]] as const) {
            const target = sgn > 0 ? B : N.neg(B);
            say(c, { text: `${i}) $${toLatex(u)} = ${sgn > 0 ? kt : `-${kt.startsWith("-") ? `(${kt})` : kt}`}$` });
            const z = findZeros(N.sub(u, target), sub(c));
            if (z.kind !== "finite" || z.all) return FAIL;
            complete &&= z.complete;
            all.push(...z.roots);
          }
          const roots = mergeRoots(all);
          return { kind: "finite", roots, complete, exact: roots.every((r) => !!r.x), title: "Модультай тэгшитгэл" };
        }
      }
      if (isAbs(B, c.v) && B.t === "call") {
        const w = B.args[0];
        if (collect(u, (n) => isAbs(n, c.v)).length === 0 && collect(w, (n) => isAbs(n, c.v)).length === 0) {
          say(c, { text: "$|a| = |b|$ бол $a = b$ эсвэл $a = -b$" });
          const all: Root[] = [];
          let complete = true;
          for (const [i, G] of [[1, N.sub(u, w)], [2, N.add(u, w)]] as const) {
            say(c, { text: `${i}) $${toLatex(u)} = ${i === 1 ? toLatex(w) : `-\\left(${toLatex(w)}\\right)`}$` });
            const z = findZeros(G, sub(c));
            if (z.kind !== "finite") return FAIL;
            if (z.all) return FAIL;
            complete &&= z.complete;
            all.push(...z.roots);
          }
          const roots = mergeRoots(all);
          return { kind: "finite", roots, complete, exact: roots.every((r) => !!r.x), title: "Модультай тэгшитгэл" };
        }
      }
    }
  }

  // Ерөнхий: завсрын арга
  const crit: Root[] = [];
  for (const a of absNodes) {
    if (a.t !== "call") continue;
    const z = findZeros(a.args[0], sub(c, true));
    if (z.kind !== "finite" || !z.complete || z.all) return FAIL;
    crit.push(...z.roots);
  }
  const pts = mergeRoots(crit).map((r) => ({ ...r, mult: 1 }));
  say(c, {
    text: "Модулийн доторх илэрхийллийг тэгтэй тэнцүүлж, тоон шулууныг завсруудад хуваана",
    tex: pts.length ? [`${c.v} = ${pts.map((p) => p.tex).join(",\\ ")}`] : undefined,
  });
  const roots: Root[] = [];
  const segments: { a: Root; b: Root }[] = [];
  let complete = true;
  for (let i = 0; i <= pts.length; i++) {
    const lo = i > 0 ? pts[i - 1] : null, hi = i < pts.length ? pts[i] : null;
    const t = lo && hi ? (lo.v + hi.v) / 2 : lo ? lo.v + 1 : hi ? hi.v - 1 : 0;
    const signOf = new Map<Node, number>();
    for (const a of absNodes) if (a.t === "call") signOf.set(a, Math.sign(numAt(a.args[0], c.v, t, c.degrees)) || 1);
    const repl = (n: Node): Node =>
      mapNode(n, (m) => {
        const s = signOf.get(m);
        if (s === undefined || m.t !== "call") return undefined;
        const inner = repl(m.args[0]);
        return s > 0 ? inner : N.neg(inner);
      });
    const G = repl(F);
    const lab = `${lo ? `[${lo.tex}` : "(-\\infty"};\\ ${hi ? `${hi.tex}]` : "+\\infty)"}`;
    const z = findZeros(G, sub(c, true));
    if (z.kind !== "finite") return FAIL;
    complete &&= z.complete;
    if (z.all) {
      if (!lo || !hi || (z.except && z.except.length)) return FAIL;
      segments.push({ a: lo, b: hi });
      say(c, { text: `$${c.v}\\in ${lab}$ үед тэгшитгэл адилтгал болж, завсар бүхэлдээ шийд` });
      continue;
    }
    const inI = z.roots.filter((r) => inside(r, lo, hi));
    const out = z.roots.filter((r) => !inside(r, lo, hi));
    roots.push(...inI);
    say(c, {
      text: `$${c.v}\\in ${lab}$ үед модулийг тэмдгээр нь задлавал`,
      tex: [
        `${toLatex(G)} = 0`,
        ...(inI.length ? [`${c.v} = ${inI.map((r) => r.tex).join(",\\ ")}`] : []),
      ],
    });
    for (const r of out) say(c, { text: `$${c.v} = ${r.tex}$ энэ завсарт орохгүй`, tone: "bad" });
    if (!z.roots.length) say(c, { text: "Энэ завсарт шийдгүй" });
  }
  const merged = mergeRoots(roots).filter((r) => !segments.some((s) => inside(r, s.a, s.b)));
  return {
    kind: "finite", roots: merged, complete, exact: merged.every((r) => !!r.x), segments: segments.length ? segments : undefined,
    title: "Модультай тэгшитгэл",
  };
}

/* ---------- 4. Иррациональ ---------- */

interface Rad {
  Q: Poly;
  R: Poly;
}
interface RadSum {
  S: Poly;
  rads: Map<string, Rad>;
}
const rkey = (R: Poly) => R.map((x) => `${x.n}/${x.d}`).join(",");

function radAdd(a: RadSum, b: RadSum, sgn = 1): RadSum {
  const rads = new Map(a.rads);
  for (const [k, r] of b.rads) {
    const Qb = sgn > 0 ? r.Q : pscale(r.Q, q(-1));
    const o = rads.get(k);
    if (o) {
      const Qs = padd(o.Q, Qb);
      if (isZeroP(Qs)) rads.delete(k);
      else rads.set(k, { Q: Qs, R: o.R });
    } else rads.set(k, { Q: Qb, R: r.R });
  }
  return { S: sgn > 0 ? padd(a.S, b.S) : psub(a.S, b.S), rads };
}
function radMul(a: RadSum, b: RadSum): RadSum {
  let out: RadSum = { S: pmul(a.S, b.S), rads: new Map() };
  const addRad = (Q: Poly, R: Poly) => {
    if (isZeroP(Q)) return;
    out = radAdd(out, { S: [], rads: new Map([[rkey(R), { Q, R }]]) });
  };
  for (const r of b.rads.values()) addRad(pmul(a.S, r.Q), r.R);
  for (const r of a.rads.values()) addRad(pmul(b.S, r.Q), r.R);
  for (const r1 of a.rads.values()) for (const r2 of b.rads.values()) {
    if (rkey(r1.R) === rkey(r2.R)) out = { ...out, S: padd(out.S, pmul(pmul(r1.Q, r2.Q), r1.R)) };
    else addRad(pmul(r1.Q, r2.Q), pmul(r1.R, r2.R));
  }
  if (out.rads.size > 3) throw new ExactFail("too many radicals");
  return out;
}
function radParse(n: Node, v: string): RadSum | null {
  const p = polyFrom(n, v);
  if (p) return { S: p, rads: new Map() };
  const sqrtOf = (arg: Node): RadSum | null => {
    const R = polyFrom(arg, v);
    if (!R || deg(R) < 1) return null;
    return { S: [], rads: new Map([[rkey(R), { Q: [ONE], R }]]) };
  };
  switch (n.t) {
    case "call":
      if (n.f === "sqrt") return sqrtOf(n.args[0]);
      if (n.f === "root") {
        try {
          const k = asQ(evalExact(n.args[0]));
          if (k && k.n === 2 && k.d === 1) return sqrtOf(n.args[1]);
        } catch { /* */ }
      }
      return null;
    case "neg": { const a = radParse(n.a, v); return a && radAdd({ S: [], rads: new Map() }, a, -1); }
    case "add": case "sub": {
      const a = radParse(n.a, v), b = radParse(n.b, v);
      return a && b && radAdd(a, b, n.t === "add" ? 1 : -1);
    }
    case "mul": {
      const a = radParse(n.a, v), b = radParse(n.b, v);
      return a && b && radMul(a, b);
    }
    case "div": {
      const a = radParse(n.a, v), d = polyFrom(n.b, v);
      if (!a || !d || deg(d) !== 0) return null;
      const k = qdiv(ONE, d[0]);
      const rads = new Map<string, Rad>();
      for (const [key, r] of a.rads) rads.set(key, { Q: pscale(r.Q, k), R: r.R });
      return { S: pscale(a.S, k), rads };
    }
    case "pow": {
      if (dep(n.b, v)) return null;
      let e: Q | null = null;
      try { e = asQ(evalExact(n.b)); } catch { e = null; }
      if (!e) return null;
      if (e.n === 1 && e.d === 2) return sqrtOf(n.a);
      if (e.d !== 1 || e.n < 1 || e.n > 6) return null;
      const a = radParse(n.a, v);
      if (!a) return null;
      let r: RadSum = { S: [ONE], rads: new Map() };
      for (let i = 0; i < e.n; i++) r = radMul(r, a);
      return r;
    }
  }
  return null;
}

function radTex(r: Rad, v: string): string {
  const Qt = ptex(r.Q, v);
  const co = Qt === "1" ? "" : Qt === "-1" ? "-" : deg(r.Q) >= 1 && r.Q.filter((x) => !isZ(x)).length > 1 ? `\\left(${Qt}\\right)` : Qt;
  return `${co}\\sqrt{${ptex(r.R, v)}}`;
}

function radicalMethod(F: Node, c: Ctx): Zeros | null {
  const fracPow = (n: Node) => {
    if (n.t !== "pow" || !dep(n.a, c.v) || dep(n.b, c.v)) return false;
    try { const e = asQ(evalExact(n.b)); return !!e && e.d === 2; } catch { return false; }
  };
  const rootNodes = collect(F, (n) => (n.t === "call" && (n.f === "sqrt" || n.f === "root") && dep(n, c.v)) || fracPow(n));
  if (!rootNodes.length) return null;
  const rs = radParse(F, c.v);
  if (!rs || rs.rads.size === 0) return null;
  if (rs.rads.size > 2) return FAIL;
  const v = c.v;
  const conds = rootNodes
    .filter((n) => n.t === "call")
    .map((n) => (n.t === "call" ? `${toLatex(n.f === "root" ? n.args[1] : n.args[0])} \\ge 0` : ""));
  if (conds.length) say(c, { text: "Тодорхойлогдох муж: язгуурын доорх илэрхийлэл сөрөг биш", tex: [Array.from(new Set(conds)).join(",\\quad ")] });
  const rads = [...rs.rads.values()];
  let final: Poly;
  if (rads.length === 1) {
    const [r] = rads;
    say(c, { text: "Язгуурыг нэг талд үлдээвэл", tex: [`${radTex(r, v)} = ${ptex(pscale(rs.S, q(-1)), v)}`] });
    const L = pmul(pmul(r.Q, r.Q), r.R), Rt = pmul(rs.S, rs.S);
    say(c, { text: "Хоёр талыг квадрат зэрэгт дэвшүүлбэл", tex: [`${ptex(L, v)} = ${ptex(Rt, v)}`] });
    final = psub(L, Rt);
  } else {
    const [r1, r2] = rads;
    const S = rs.S;
    if (isZeroP(S)) {
      say(c, { text: "Язгууруудыг хоёр талд байрлуулбал", tex: [`${radTex(r1, v)} = ${radTex({ Q: pscale(r2.Q, q(-1)), R: r2.R }, v)}`] });
      final = psub(pmul(pmul(r1.Q, r1.Q), r1.R), pmul(pmul(r2.Q, r2.Q), r2.R));
      say(c, { text: "Квадрат зэрэгт дэвшүүлбэл", tex: [`${ptex(pmul(pmul(r1.Q, r1.Q), r1.R), v)} = ${ptex(pmul(pmul(r2.Q, r2.Q), r2.R), v)}`] });
    } else {
      const negS = pscale(S, q(-1));
      say(c, { text: "Нэг язгуурыг тусгаарлавал", tex: [`${radTex(r1, v)} = ${ptex(negS, v)}${radTex({ Q: pscale(r2.Q, q(-1)), R: r2.R }, v).replace(/^(?!-)/, "+")}`] });
      // Q1²R1 = S² + 2 S Q2 √R2 + Q2² R2
      const A = pscale(pmul(S, r2.Q), q(2));
      const B = psub(psub(pmul(pmul(r1.Q, r1.Q), r1.R), pmul(S, S)), pmul(pmul(r2.Q, r2.Q), r2.R));
      say(c, { text: "Квадрат зэрэгт дэвшүүлж, үлдсэн язгуурыг тусгаарлавал", tex: [`${radTex({ Q: A, R: r2.R }, v)} = ${ptex(B, v)}`] });
      final = psub(pmul(pmul(A, A), r2.R), pmul(B, B));
      say(c, { text: "Дахин квадрат зэрэгт дэвшүүлбэл", tex: [`${ptex(pmul(pmul(A, A), r2.R), v)} = ${ptex(pmul(B, B), v)}`] });
    }
  }
  final = trim(final);
  if (isZeroP(final)) return FAIL;
  say(c, { text: "Эмхэтгэвэл", tex: [`${ptex(final, v)} = 0`] });
  const r = solvePoly(final, c.steps, { v, quiet: c.quiet });
  if (r.all) return FAIL;
  const good: Root[] = [];
  if (r.roots.length) say(c, { text: "Квадрат зэрэгт дэвшүүлэхэд гаднах язгуур гарч болох тул анхны тэгшитгэлд орлуулж шалгана" });
  for (const root of r.roots) {
    if (checkRoot(F, v, root, c.degrees) === "ok") {
      good.push(root);
      say(c, { text: `$${v} = ${root.tex}$: тэгшитгэл биелнэ`, tone: "ok" });
    } else say(c, { text: `$${v} = ${root.tex}$: биелэхгүй, гаднах язгуур`, tone: "bad" });
  }
  return { kind: "finite", roots: good, complete: r.complete, exact: good.every((x) => !!x.x), title: "Иррациональ тэгшитгэл" };
}

/* ---------- Нийтлэг суурь ---------- */

/** Суурийг аль болох жижиг бүхэл болгоно: 4 → 2 (зэрэг k) */
function primitiveBase(c: X): { base: X; k: number } {
  const cq = asQ(c);
  if (!cq) return { base: c, k: 1 };
  let b = cq, k = 1;
  if (b.n < b.d && b.n > 0) { b = q(b.d, b.n); k = -1; }
  if (b.d === 1) {
    for (let e = 6; e >= 2; e--) {
      const r = iroot(b.n, e);
      if (r !== null && r > 1) return { base: xq(q(r)), k: k * e };
    }
  }
  return { base: xq(b), k };
}

function qGcd(list: Q[]): Q {
  let L = 1;
  for (const s of list) L = ilcm(L, s.d);
  let G = 0;
  for (const s of list) G = igcd(G, s.n * (L / s.d));
  return q(Math.abs(G), L);
}

const baseTex = (b: X) => (xeq(b, XE) ? "e" : xtex(b));
const logTex = (b: X, arg: string) => (xeq(b, XE) ? `\\ln ${arg}` : xeq(b, xint(10)) ? `\\lg ${arg}` : `\\log_{${xtex(b)}} ${arg}`);
const argTex = (s: string) => (/^[\w.]+$/.test(s) ? s : `\\left(${s}\\right)`);

/* ---------- 5. Үзүүлэнт ---------- */

interface ExpTerm { k: X; base: X; u: Node }
interface ExpLin { K: X; terms: ExpTerm[] }

function expLin(n: Node, v: string): ExpLin | null {
  if (!dep(n, v)) {
    try { return { K: evalExact(n), terms: [] }; } catch { return null; }
  }
  const scale = (a: ExpLin, k: X): ExpLin => ({ K: xmul(a.K, k), terms: a.terms.map((t) => ({ ...t, k: xmul(t.k, k) })) });
  const single = (a: ExpLin) => a.terms.length === 1 && isZero(a.K);
  const inv = (a: ExpLin): ExpLin | null => (single(a) ? { K: [], terms: [{ k: xdiv(xint(1), a.terms[0].k), base: a.terms[0].base, u: N.neg(a.terms[0].u) }] } : null);
  const mul2 = (a: ExpLin, b: ExpLin): ExpLin | null => {
    if (!a.terms.length) return scale(b, a.K);
    if (!b.terms.length) return scale(a, b.K);
    if (!single(a) || !single(b)) return null;
    const s = a.terms[0], t = b.terms[0];
    let tq: X;
    try { tq = xlog(s.base, t.base); } catch { return null; }
    const tr = asQ(tq);
    if (!tr) return null;
    return { K: [], terms: [{ k: xmul(s.k, t.k), base: s.base, u: N.add(s.u, N.mul(N.q(tr), t.u)) }] };
  };
  switch (n.t) {
    case "pow": {
      if (!dep(n.a, v)) {
        let b: X;
        try { b = evalExact(n.a); } catch { return null; }
        if (xsign(b) <= 0 || xeq(b, xint(1))) return null;
        return { K: [], terms: [{ k: xint(1), base: b, u: n.b }] };
      }
      if (dep(n.b, v)) return null;
      let e: Q | null;
      try { e = asQ(evalExact(n.b)); } catch { return null; }
      const a = expLin(n.a, v);
      if (!a || !e || e.d !== 1) return null;
      if (!single(a)) return null;
      const t = a.terms[0];
      return { K: [], terms: [{ k: xpow(t.k, xq(e)), base: t.base, u: N.mul(N.q(e), t.u) }] };
    }
    case "call":
      if (n.f === "exp") return { K: [], terms: [{ k: xint(1), base: XE, u: n.args[0] }] };
      return null;
    case "neg": { const a = expLin(n.a, v); return a && scale(a, xint(-1)); }
    case "add": case "sub": {
      const a = expLin(n.a, v), b0 = expLin(n.b, v);
      if (!a || !b0) return null;
      const b = n.t === "sub" ? scale(b0, xint(-1)) : b0;
      return { K: xadd(a.K, b.K), terms: [...a.terms, ...b.terms] };
    }
    case "mul": {
      const a = expLin(n.a, v), b = expLin(n.b, v);
      return a && b && mul2(a, b);
    }
    case "div": {
      const a = expLin(n.a, v), b = expLin(n.b, v);
      if (!a || !b) return null;
      if (!b.terms.length) return isZero(b.K) ? null : scale(a, xdiv(xint(1), b.K));
      const ib = inv(b);
      return ib && mul2(a, ib);
    }
  }
  return null;
}

function expMethod(F: Node, c: Ctx): Zeros | null {
  const v = c.v;
  const hasExp = collect(F, (n) => (n.t === "pow" && dep(n.b, v)) || (n.t === "call" && n.f === "exp" && dep(n, v))).length > 0;
  if (!hasExp) return null;
  const L = expLin(F, v);
  if (!L || !L.terms.length) return null;
  // Нэг суурьт шилжүүлэх
  const b0 = primitiveBase(L.terms[0].base).base;
  const terms: { k: X; u: Node; p: Poly | null }[] = [];
  for (const t of L.terms) {
    let tq: Q | null;
    try { tq = asQ(xlog(b0, t.base)); } catch { return FAIL; }
    if (!tq) return FAIL;
    const u = N.mul(N.q(tq), t.u);
    terms.push({ k: t.k, u, p: polyFrom(u, v) });
  }
  const bt = baseTex(b0);
  const title = "Үзүүлэнт тэгшитгэл";
  if (terms.every((t) => t.p && deg(t.p) <= 1)) {
    const ss = terms.map((t) => t.p![1] ?? ZERO).filter((s) => !isZ(s));
    if (!ss.length) return FAIL;
    const g = qGcd(ss);
    const poly: Q[] = [];
    let minm = 0;
    const items = terms.map((t) => {
      const s = t.p![1] ?? ZERO, tt = t.p![0] ?? ZERO;
      const m = qdiv(s, g);
      const coef = asQ(xmul(t.k, xpow(b0, xq(tt))));
      return { m: m.n, coef };
    });
    if (items.some((i) => !i.coef)) return FAIL;
    const K0 = asQ(L.K);
    if (!K0) return FAIL;
    for (const it of items) minm = Math.min(minm, it.m);
    for (const it of items) {
      const idx = it.m - minm;
      while (poly.length <= idx) poly.push(ZERO);
      poly[idx] = qadd(poly[idx], it.coef!);
    }
    while (poly.length <= -minm) poly.push(ZERO);
    poly[-minm] = qadd(poly[-minm], K0);
    const gx = g.n === 1 && g.d === 1 ? v : `${qTex(g)}${v}`;
    const yv = "y";
    if (deg(trim(poly)) === 1 && terms.length === 1 && deg(terms[0].p!) >= 1 && !c.quiet) {
      // a^{f(x)} = b хэлбэр
      say(c, { text: `Хоёр талыг $${bt}$ суурьтай зэрэг болгож бодно` });
    }
    say(c, {
      text: `$${yv} = ${bt}^{${gx}}$ $(${yv} > 0)$ гэж орлуулбал${minm < 0 ? ` (хоёр талыг $${yv}^{${-minm}}$-аар үржүүлж)` : ""}`,
      tex: [`${ptex(poly, yv)} = 0`],
    });
    const r = solvePoly(trim(poly), c.steps, { v: yv, quiet: c.quiet });
    if (r.all) return FAIL;
    const out: Root[] = [];
    for (const y of r.roots) {
      if (y.v <= 0 || (y.x && xsign(y.x) <= 0)) {
        say(c, { text: `$${yv} = ${y.tex}$ — эерэг биш тул тохирохгүй`, tone: "bad" });
        continue;
      }
      // b^{gx} = y → x = log_b(y)/g
      let root: Root | null = null;
      if (y.x) {
        try {
          const lx = xlog(b0, y.x);
          root = rootX(xdiv(lx, xq(g)));
        } catch { root = null; }
      }
      if (!root) {
        const xv = Math.log(y.v) / Math.log(approx(b0)) / val(g);
        const lt = logTex(b0, argTex(y.x ? xtex(y.x) : decTex(y.v, 6)));
        const tex = g.n === 1 && g.d === 1 ? lt : `\\frac{${lt}}{${qTex(g)}}`;
        root = { x: null, v: xv, tex: y.x ? tex : `\\approx ${decTex(xv, 6)}`, mult: 1 };
      }
      say(c, { text: `$${bt}^{${gx}} = ${y.tex} \\Rightarrow ${v} = ${root.tex}$` });
      out.push(root);
    }
    const roots = mergeRoots(out);
    return { kind: "finite", roots, complete: r.complete, exact: roots.every((x) => !x.tex.startsWith("\\approx")), title };
  }
  // Зэрэг нь олон гишүүнт: k·b^{P} + K = 0 эсвэл k1 b^{P1} + k2 b^{P2} = 0
  let P: Poly | null = null, w: X | null = null;
  if (terms.length === 1 && terms[0].p) {
    P = terms[0].p;
    w = xdiv(xneg(L.K), terms[0].k);
  } else if (terms.length === 2 && isZero(L.K) && terms[0].p && terms[1].p) {
    P = psub(terms[0].p, terms[1].p);
    w = xdiv(xneg(terms[1].k), terms[0].k);
  }
  if (!P || !w) return FAIL;
  if (xsign(w) <= 0) {
    say(c, { text: `Зэрэг эерэг утгатай тул $${bt}^{\\ldots} = ${xtex(w)}$ шийдгүй` });
    return { kind: "finite", roots: [], complete: true, exact: true, title };
  }
  let Lq: Q | null;
  try { Lq = asQ(xlog(b0, w)); } catch { return FAIL; }
  if (!Lq) return FAIL;
  say(c, { text: `$${xtex(w)} = ${bt}^{${qTex(Lq)}}$ тул зэргийг тэнцүүлбэл`, tex: [`${ptex(P, v)} = ${qTex(Lq)}`] });
  const r = solvePoly(psub(P, constP(Lq)), c.steps, { v, quiet: c.quiet });
  return { ...fromRoots(r, title) };
}

/* ---------- 6. Логарифм ---------- */

interface LogTerm { k: X; base: X; u: Node; p: number }
interface LogLin { K: X; terms: LogTerm[] }

function logLin(n: Node, v: string): LogLin | null {
  if (!dep(n, v)) {
    try { return { K: evalExact(n), terms: [] }; } catch { return null; }
  }
  const scale = (a: LogLin, k: X): LogLin => ({ K: xmul(a.K, k), terms: a.terms.map((t) => ({ ...t, k: xmul(t.k, k) })) });
  switch (n.t) {
    case "call": {
      if (n.f === "ln") return { K: [], terms: [{ k: xint(1), base: XE, u: n.args[0], p: 1 }] };
      if (n.f === "lg") return { K: [], terms: [{ k: xint(1), base: xint(10), u: n.args[0], p: 1 }] };
      if (n.f === "log" && !dep(n.args[0], v)) {
        let b: X;
        try { b = evalExact(n.args[0]); } catch { return null; }
        if (xsign(b) <= 0 || xeq(b, xint(1))) return null;
        return { K: [], terms: [{ k: xint(1), base: b, u: n.args[1], p: 1 }] };
      }
      return null;
    }
    case "neg": { const a = logLin(n.a, v); return a && scale(a, xint(-1)); }
    case "add": case "sub": {
      const a = logLin(n.a, v), b0 = logLin(n.b, v);
      if (!a || !b0) return null;
      const b = n.t === "sub" ? scale(b0, xint(-1)) : b0;
      return { K: xadd(a.K, b.K), terms: [...a.terms, ...b.terms] };
    }
    case "mul": {
      const a = logLin(n.a, v), b = logLin(n.b, v);
      if (!a || !b) return null;
      if (!a.terms.length) return scale(b, a.K);
      if (!b.terms.length) return scale(a, b.K);
      // log·log (ижил аргумент, суурь) → квадрат
      if (a.terms.length === 1 && b.terms.length === 1 && isZero(a.K) && isZero(b.K)) {
        const s = a.terms[0], t = b.terms[0];
        if (same(s.u, t.u) && xeq(s.base, t.base)) return { K: [], terms: [{ k: xmul(s.k, t.k), base: s.base, u: s.u, p: s.p + t.p }] };
      }
      return null;
    }
    case "div": {
      const a = logLin(n.a, v);
      if (!a || dep(n.b, v)) return null;
      let k: X;
      try { k = evalExact(n.b); } catch { return null; }
      return isZero(k) ? null : scale(a, xdiv(xint(1), k));
    }
    case "pow": {
      if (dep(n.b, v)) return null;
      let e: Q | null;
      try { e = asQ(evalExact(n.b)); } catch { return null; }
      const a = logLin(n.a, v);
      if (!a || !e || e.d !== 1 || e.n < 1 || e.n > 4 || a.terms.length !== 1 || !isZero(a.K)) return null;
      const t = a.terms[0];
      return { K: [], terms: [{ k: xpow(t.k, xq(e)), base: t.base, u: t.u, p: t.p * e.n }] };
    }
  }
  return null;
}

function logMethod(F: Node, c: Ctx): Zeros | null {
  const v = c.v;
  const hasLog = collect(F, (n) => n.t === "call" && (n.f === "ln" || n.f === "lg" || n.f === "log") && dep(n, v)).length > 0;
  if (!hasLog) return null;
  const L = logLin(F, v);
  if (!L || !L.terms.length) return null;
  const title = "Логарифм тэгшитгэл";
  const pb = primitiveBase(L.terms[0].base);
  const b0 = xeq(L.terms[0].base, XE) ? XE : pb.base;
  const terms: { k: Q; u: Node; p: number }[] = [];
  for (const t of L.terms) {
    let beta: Q | null;
    try { beta = asQ(xlog(b0, t.base)); } catch { return FAIL; }
    if (!beta || isZ(beta)) return FAIL;
    const k = asQ(xdiv(t.k, xq(qPow(beta, t.p))));
    if (!k) return FAIL;
    terms.push({ k, u: t.u, p: t.p });
  }
  const K0 = asQ(L.K);
  if (!K0) return FAIL;
  const args: Node[] = [];
  for (const t of terms) if (!args.some((a) => same(a, t.u))) args.push(t.u);
  say(c, { text: "Тодорхойлогдох муж: логарифмын доорх илэрхийлэл эерэг", tex: [args.map((a) => `${toLatex(a)} > 0`).join(",\\quad ")] });
  const domainOk = (r: Root) =>
    args.every((a) => {
      if (r.x) {
        const ex = exactAt(a, v, r.x, c.degrees);
        if (ex && ex !== "nan") return xsign(ex) > 0;
        if (ex === "nan") return false;
      }
      return numAt(a, v, r.v, c.degrees) > 0;
    });
  const bt = baseTex(b0);
  const out: Root[] = [];
  let complete = true;

  if (args.length === 1) {
    // t = log_b(u) орлуулга (эсвэл шууд log_b u = k)
    const u = args[0];
    const poly: Q[] = [];
    for (const t of terms) {
      while (poly.length <= t.p) poly.push(ZERO);
      poly[t.p] = qadd(poly[t.p], t.k);
    }
    poly[0] = qadd(poly[0] ?? ZERO, K0);
    const P = trim(poly);
    const lt = logTex(b0, argTex(toLatex(u)));
    let ts: Root[];
    if (deg(P) === 1) {
      const t0 = qdiv(qneg(P[0]), P[1]);
      say(c, { text: "Эмхэтгэвэл", tex: [`${lt} = ${qTex(t0)}`] });
      ts = [rootX(xq(t0))];
    } else {
      say(c, { text: `$t = ${lt}$ гэж орлуулбал`, tex: [`${ptex(P, "t")} = 0`] });
      const r = solvePoly(P, c.steps, { v: "t", quiet: c.quiet });
      if (r.all) return FAIL;
      ts = r.roots;
      complete &&= r.complete;
    }
    for (const t of ts) {
      let w: X;
      try {
        if (!t.x) return FAIL;
        w = xpow(b0, t.x);
      } catch { return FAIL; }
      say(c, { text: `$${lt} = ${t.tex} \\Rightarrow ${toLatex(u)} = ${bt}^{${t.tex}} = ${xtex(w)}$` });
      const up = polyFrom(u, v);
      let z: Zeros;
      if (up && deg(up) === 1 && !asQ(w)) {
        const x = xdiv(xsub(w, xq(up[0])), xq(up[1]));
        z = { kind: "finite", roots: [rootX(x)], complete: true, exact: true };
      } else {
        const wq = asQ(w);
        if (!wq) return FAIL;
        z = findZeros(N.sub(u, N.q(wq)), sub(c));
      }
      if (z.kind !== "finite" || z.all) return FAIL;
      complete &&= z.complete;
      out.push(...z.roots);
    }
  } else {
    if (terms.some((t) => t.p !== 1)) return FAIL;
    let Lc = 1;
    for (const t of terms) Lc = ilcm(Lc, t.k.d);
    const ms = terms.map((t) => qmul(t.k, q(Lc)).n);
    const Kp = qmul(K0, q(Lc));
    // Σ m_i log u_i = -K'  →  Π u^{m} = b^{-K'}
    let C: Q | null;
    try { C = asQ(xpow(b0, xq(qneg(Kp)))); } catch { return FAIL; }
    if (!C) return FAIL;
    let pos: Node | null = null, negN: Node | null = null;
    terms.forEach((t, i) => {
      const m = ms[i];
      const f = Math.abs(m) === 1 ? t.u : N.pow(t.u, N.num(Math.abs(m)));
      if (m > 0) pos = pos ? N.mul(pos, f) : f;
      else negN = negN ? N.mul(negN, f) : f;
    });
    const lhsN: Node = pos ?? N.num(1);
    const rhsN: Node = negN ? N.mul(N.q(C), negN) : N.q(C);
    say(c, {
      text: `Логарифмын чанараар нэгтгэж, потенцчилбэл (суурь $${bt}$)`,
      tex: [`${toLatex(lhsN)} = ${toLatex(rhsN)}`],
    });
    const z = findZeros(N.sub(lhsN, rhsN), sub(c));
    if (z.kind !== "finite" || z.all) return FAIL;
    complete &&= z.complete;
    out.push(...z.roots);
  }
  const good: Root[] = [];
  for (const r of mergeRoots(out)) {
    if (domainOk(r) && checkRoot(F, v, r, c.degrees) === "ok") {
      good.push(r);
      say(c, { text: `$${v} = ${r.tex}$: ОЗ-д харьяалагдана`, tone: "ok" });
    } else say(c, { text: `$${v} = ${r.tex}$: ОЗ-д харьяалагдахгүй, гаднах язгуур`, tone: "bad" });
  }
  return { kind: "finite", roots: good, complete, exact: good.every((r) => !!r.x), title };
}

function qPow(b: Q, k: number): Q {
  let r = ONE;
  for (let i = 0; i < k; i++) r = qmul(r, b);
  return r;
}

/* ---------- 7. Тригонометр ---------- */

const TRIG = ["sin", "cos", "tan", "cot"];
const TSYM: Record<string, string> = { sin: "S", cos: "C", tan: "T", cot: "K" };
const TNAME: Record<string, string> = { S: "\\sin", C: "\\cos", T: "\\operatorname{tg}", K: "\\operatorname{ctg}" };

/** u = a·x + b (a рационал, b ЯГ тоо) */
function linearArg(u: Node, v: string): { a: Q; b: X } | null {
  try {
    const at = (k: number) => evalExact(u, { scope: { [v]: xint(k) } });
    const u0 = at(0), u1 = at(1), u2 = at(2);
    const a = asQ(xsub(u1, u0));
    if (!a || isZ(a)) return null;
    if (!xeq(xsub(u2, u0), xq(qmul(a, q(2))))) return null;
    const t = 0.3719;
    if (Math.abs(numAt(u, v, t) - (val(a) * t + approx(u0))) > 1e-9) return null;
    return { a, b: u0 };
  } catch {
    return null;
  }
}

function joinTex(parts: string[]): string {
  const ps = parts.filter((p) => p && p !== "0");
  if (!ps.length) return "0";
  return ps.map((p, i) => (i === 0 || p.startsWith("-") ? p : `+${p}`)).join("");
}

function basicFamily(f: "S" | "C" | "T" | "K", t: Root, lin: { a: Q; b: X }, degrees: boolean, uTex: string, steps: Step[], quiet: boolean): Family | null {
  const deg = degrees;
  const PI = deg ? xint(180) : XPI;
  const unit = (x: X) => {
    if (!deg) return xtex(x);
    const r = asQ(x);
    if (r && r.d !== 1 && [2, 4, 5, 8, 10, 20, 25].includes(r.d)) return `${decTex(val(r), 4).replace(".", "{,}")}^\\circ`;
    const t = xtex(x);
    return t.startsWith("\\frac") || t.startsWith("-\\frac") ? `\\left(${t}\\right)^\\circ` : `${t}^\\circ`;
  };
  const name = TNAME[f];
  const tt = t.tex;
  const tv = t.v;
  if ((f === "S" || f === "C") && (Math.abs(tv) > 1 + 1e-12 || (t.x && Math.abs(approx(t.x)) > 1 && !xeq(t.x, xint(1)) && !xeq(t.x, xint(-1))))) {
    if (!quiet) steps.push({ text: `$${name} ${uTex} = ${tt}$: $|${tt.replace(/^\\approx\s*/, "")}| > 1$ тул шийдгүй`, tone: "bad" });
    return null;
  }
  const is = (k: number) => !!t.x && xeq(t.x, xint(k));
  let sgn: "none" | "alt" | "pm" = "none";
  let alpha: X | null = null;
  let alphaTex = "", alphaV = 0;
  let period: X = PI;
  const two = (x: X) => xscale(x, q(2));
  if (f === "S") {
    if (is(0)) alpha = xint(0);
    else if (is(1)) { alpha = xscale(PI, q(1, 2)); period = two(PI); }
    else if (is(-1)) { alpha = xscale(PI, q(-1, 2)); period = two(PI); }
    else sgn = "alt";
  } else if (f === "C") {
    period = two(PI);
    if (is(0)) { alpha = xscale(PI, q(1, 2)); period = PI; }
    else if (is(1)) alpha = xint(0);
    else if (is(-1)) alpha = PI;
    else sgn = "pm";
  }
  const inv = { S: "asin", C: "acos", T: "atan", K: "acot" }[f];
  const invTex = { S: "\\arcsin", C: "\\arccos", T: "\\operatorname{arctg}", K: "\\operatorname{arcctg}" }[f];
  if (!alpha && t.x) {
    try { alpha = xatrig(inv, t.x, deg); } catch { alpha = null; }
  }
  const k = deg ? 180 / Math.PI : 1;
  const numAlpha = () => {
    const x = tv;
    const r = f === "S" ? Math.asin(x) : f === "C" ? Math.acos(x) : f === "T" ? Math.atan(x) : Math.PI / 2 - Math.atan(x);
    return r * k;
  };
  if (alpha) { alphaV = approx(alpha); alphaTex = unit(alpha); }
  else {
    alphaV = numAlpha();
    alphaTex = t.x ? `${invTex}${/^[\w.]+$/.test(tt) ? ` ${tt}` : `\\left(${tt}\\right)`}` : `\\approx ${decTex(alphaV, 4)}`;
  }
  // x = (u - b)/a
  const a = lin.a, aAbs = a.n < 0 ? qneg(a) : a;
  const B = xdiv(xneg(lin.b), xq(a));
  const P = xdiv(period, xq(aAbs));
  const Ptex = (() => {
    const s = unit(P);
    if (s === "1") return "n";
    return /[a-zA-Z]$/.test(s) ? `${s} n` : `${s}n`;
  })();
  let Atex: string;
  if (alpha) Atex = unit(xdiv(alpha, xq(a)));
  else if (!t.x) Atex = `\\approx ${decTex(alphaV / val(a), 4)}`;
  else Atex = a.n === 1 && a.d === 1 ? alphaTex : a.n === -1 && a.d === 1 ? `-${alphaTex}` : `\\frac{${alphaTex}}{${qTex(a)}}`;
  const Btex = isZero(B) ? "" : unit(B);
  let tex: string;
  if (sgn === "none") {
    const sum = alpha ? xadd(xdiv(alpha, xq(a)), B) : null;
    const first = sum ? (isZero(sum) ? "" : unit(sum)) : joinTex([Atex, Btex]);
    tex = `x = ${joinTex([first, Ptex])}`;
  } else {
    let A0 = Atex, pw = "n";
    if (alpha && sgn === "alt" && xsign(xdiv(alpha, xq(a))) < 0) { A0 = unit(xneg(xdiv(alpha, xq(a)))); pw = "n+1"; }
    if (alpha && sgn === "pm" && xsign(xdiv(alpha, xq(a))) < 0) A0 = unit(xneg(xdiv(alpha, xq(a))));
    const At = /[+-]/.test(A0.slice(1)) && !A0.startsWith("\\frac") ? `\\left(${A0}\\right)` : A0;
    const lead = sgn === "alt" ? `(-1)^{${pw}}${At.startsWith("-") ? `\\left(${At}\\right)` : At}` : `\\pm ${At}`;
    tex = `x = ${joinTex([lead, Btex, Ptex])}`;
  }
  tex += ",\\ n\\in\\mathbb{Z}";
  if (!quiet) {
    const gen = sgn === "alt" ? `(-1)^{n}\\arcsin a+\\pi n` : sgn === "pm" ? `\\pm\\arccos a+2\\pi n` : "";
    steps.push({ text: `$${name} ${uTex} = ${tt}$${gen ? ` — ерөнхий шийд $${gen}$` : ""}`, tex: [tex] });
  }
  const bV = approx(lin.b), pV = approx(period), aV = val(a);
  return {
    tex,
    sample: (n) => {
      const signs = sgn === "alt" ? [n % 2 === 0 ? 1 : -1] : sgn === "pm" ? [1, -1] : [1];
      return signs.map((s) => (s * alphaV + pV * n - bV) / aV);
    },
  };
}

function trigLin(F: Node, map: (n: Node) => string | null): { k: X; m: X; sym: "S" | "C" | "T" | "K" } | null {
  let sym: string | null = null;
  const go = (n: Node): { k: X; m: X } | null => {
    const s0 = map(n);
    if (s0) {
      if (sym && sym !== s0) return null;
      sym = s0;
      return { k: xint(1), m: [] };
    }
    if (collect(n, (x) => !!map(x)).length === 0) {
      try { return { k: [], m: evalExact(n) }; } catch { return null; }
    }
    switch (n.t) {
      case "neg": { const a = go(n.a); return a && { k: xneg(a.k), m: xneg(a.m) }; }
      case "add": case "sub": {
        const a = go(n.a), b = go(n.b);
        if (!a || !b) return null;
        return n.t === "add" ? { k: xadd(a.k, b.k), m: xadd(a.m, b.m) } : { k: xsub(a.k, b.k), m: xsub(a.m, b.m) };
      }
      case "mul": {
        const a = go(n.a), b = go(n.b);
        if (!a || !b) return null;
        if (isZero(a.k)) return { k: xmul(a.m, b.k), m: xmul(a.m, b.m) };
        if (isZero(b.k)) return { k: xmul(b.m, a.k), m: xmul(b.m, a.m) };
        return null;
      }
      case "div": {
        const a = go(n.a), b = go(n.b);
        if (!a || !b || !isZero(b.k) || isZero(b.m)) return null;
        return { k: xdiv(a.k, b.m), m: xdiv(a.m, b.m) };
      }
    }
    return null;
  };
  try {
    const r = go(F);
    if (!r || isZero(r.k) || !sym) return null;
    return { ...r, sym: sym as "S" };
  } catch {
    return null;
  }
}

function trigMethod(F: Node, c: Ctx): Zeros | null {
  const v = c.v;
  const trigs = collect(F, (n) => n.t === "call" && TRIG.includes(n.f) && dep(n, v));
  if (!trigs.length) return null;
  const u0 = (trigs[0] as { args: Node[] }).args[0];
  const lin = linearArg(u0, v);
  if (!lin) return null;
  const sameArg = (n: Node) => {
    if (n.t !== "call") return false;
    const u = n.args[0];
    if (same(u, u0)) return true;
    const l = linearArg(u, v);
    return !!l && xeq(xq(l.a), xq(lin.a)) && xeq(l.b, lin.b);
  };
  if (!trigs.every(sameArg)) return null;
  const map = (n: Node) => (n.t === "call" && TRIG.includes(n.f) && dep(n, v) && sameArg(n) ? TSYM[n.f] : null);
  let G = mfrom(F, { map, vars: new Set() });
  const uTex = /^[\w]+$/.test(toLatex(u0)) ? toLatex(u0) : `\\left(${toLatex(u0)}\\right)`;
  const title = "Тригонометрийн тэгшитгэл";
  if (!G) {
    // k·f(u) + m = 0, k, m — ЯГ (иррационал байж болно)
    const tl = trigLin(F, map);
    if (!tl) return null;
    const t = xdiv(xneg(tl.m), tl.k);
    say(c, { text: "Эмхэтгэвэл", tex: [`${TNAME[tl.sym]} ${uTex} = ${xtex(t)}`] });
    const fam = basicFamily(tl.sym, rootX(t), lin, c.degrees, uTex, c.steps, c.quiet);
    if (!fam) return { kind: "finite", roots: [], complete: true, exact: true, title };
    for (let n = -2; n <= 2; n++) for (const x of fam.sample(n)) {
      const y = numAt(F, v, x, c.degrees);
      if (!Number.isFinite(y) || Math.abs(y) > 1e-7) return FAIL;
    }
    return { kind: "periodic", roots: [], complete: true, exact: true, families: [fam], title };
  }
  if (G.size === 0) return null;
  const fams: Family[] = [];
  const steps = c.steps, quiet = c.quiet;
  const syms = mvars(G);
  const hasTK = syms.includes("T") || syms.includes("K"), hasSC = syms.includes("S") || syms.includes("C");
  if (hasTK && hasSC) return FAIL;
  let excludeZero = false;
  if (syms.includes("T") && syms.includes("K")) {
    // ctg = 1/tg → tg^{m}-ээр үржүүлнэ
    let maxK = 0;
    for (const t of G.values()) maxK = Math.max(maxK, t.m.K ?? 0);
    let H: MPoly = new Map();
    for (const t of G.values()) H = madd(H, mterm({ T: (t.m.T ?? 0) - (t.m.K ?? 0) + maxK }, t.c));
    G = H;
    excludeZero = true;
    say(c, { text: "$\\operatorname{ctg} u = \\frac{1}{\\operatorname{tg} u}$ гэж бичээд хоёр талыг үржүүлбэл" });
  }
  // Нийтлэг хүчин зүйл S^i, C^j, T^k, K^l
  for (const s of ["S", "C", "T", "K"]) {
    if (s === "T" && excludeZero) continue;
    let mn = Infinity;
    for (const t of G.values()) mn = Math.min(mn, t.m[s] ?? 0);
    if (mn > 0 && mn < Infinity) {
      let H: MPoly = new Map();
      for (const t of G.values()) H = madd(H, mterm({ ...t.m, [s]: (t.m[s] ?? 0) - mn }, t.c));
      G = H;
      say(c, { text: `$${TNAME[s]} ${uTex}$ хүчин зүйлийг хаалтны гадна гаргавал нэг үржигдэхүүн нь тэг` });
      const fam = basicFamily(s as "S", rootX(xint(0)), lin, c.degrees, uTex, steps, quiet);
      if (fam) fams.push(fam);
    }
  }
  const rest = mvars(G);
  let tsym: "S" | "C" | "T" | "K" | null = null;
  let P: Poly | null = null;
  const evenIn = (s: string) => [...G!.values()].every((t) => (t.m[s] ?? 0) % 2 === 0);
  if (rest.length === 0) {
    P = null;
  } else if (rest.length === 1) {
    tsym = rest[0] as "S";
    P = toUni(G, tsym);
  } else if (rest.includes("S") && rest.includes("C")) {
    const conv = (from: "S" | "C", to: "S" | "C") => {
      let H: MPoly = new Map();
      const one_minus = msub(mconst(ONE), mpow(mvar(to), 2));
      for (const t of G!.values()) {
        const e = t.m[from] ?? 0;
        const m = { ...t.m };
        delete m[from];
        H = madd(H, mmul(mterm(m, t.c), mpow(one_minus, e / 2)));
      }
      return H;
    };
    if (evenIn("C")) {
      G = conv("C", "S");
      tsym = "S";
      say(c, { text: "$\\cos^2 u = 1-\\sin^2 u$ гэж орлуулбал" });
    } else if (evenIn("S")) {
      G = conv("S", "C");
      tsym = "C";
      say(c, { text: "$\\sin^2 u = 1-\\cos^2 u$ гэж орлуулбал" });
    } else {
      const ds = new Set([...G.values()].map((t) => tdeg(t.m)));
      if (ds.size !== 1) return FAIL;
      const d = [...ds][0];
      let H: MPoly = new Map();
      for (const t of G.values()) H = madd(H, mterm({ T: t.m.S ?? 0 }, t.c));
      G = H;
      tsym = "T";
      say(c, { text: `Нэгэн төрлийн тэгшитгэл: хоёр талыг $\\cos^{${d}} ${uTex}$-д хуваавал ($\\cos ${uTex} = 0$ үед биелэхгүй)` });
    }
    P = toUni(G, tsym);
  } else return FAIL;
  if (rest.length && (!P || !tsym)) return FAIL;
  if (P && tsym) {
    const tv = "t";
    if (deg(P) >= 1) {
      say(c, { text: `$t = ${TNAME[tsym]} ${uTex}$${tsym === "S" || tsym === "C" ? " $(|t|\\le 1)$" : ""} гэж орлуулбал`, tex: [`${ptex(P, tv)} = 0`] });
      const r = solvePoly(P, steps, { v: tv, quiet });
      if (r.all) return FAIL;
      for (const t of r.roots) {
        if (excludeZero && Math.abs(t.v) < 1e-12) { say(c, { text: "$t = 0$ үед $\\operatorname{ctg}$ тодорхойлогдохгүй", tone: "bad" }); continue; }
        const fam = basicFamily(tsym, t, lin, c.degrees, uTex, steps, quiet);
        if (fam && !fams.some((f) => f.tex === fam.tex)) fams.push(fam);
      }
    } else if (deg(P) < 0) return FAIL;
  }
  // Шалгалт: гишүүн бүрийн хэд хэдэн утгыг орлуулна
  for (const f of fams) for (let n = -2; n <= 2; n++) for (const x of f.sample(n)) {
    const y = numAt(F, v, x, c.degrees);
    if (!Number.isFinite(y) || Math.abs(y) > 1e-7) return FAIL;
  }
  if (!fams.length) {
    say(c, { text: "Шийдгүй" });
    return { kind: "finite", roots: [], complete: true, exact: true, title };
  }
  return { kind: "periodic", roots: [], complete: true, exact: true, families: fams, title };
}

/* ---------- 8. Бутархай ба үржвэр: u/w = 0 ⇔ u = 0, u·w = 0 ⇔ u = 0 эсвэл w = 0 ---------- */

function quotientMethod(F: Node, c: Ctx): Zeros | null {
  if (F.t !== "div" || !dep(F.b, c.v)) return null;
  say(c, { text: "Бутархай тэгтэй тэнцэх нь хүртвэр тэг, хуваарь тэгээс ялгаатай байх явдал", tex: [`${toLatex(F.a)} = 0`] });
  const z = findZeros(F.a, sub(c));
  if (z.kind !== "finite" || z.all) return FAIL;
  const good = z.roots.filter((r) => checkRoot(F, c.v, r, c.degrees) === "ok");
  for (const r of z.roots) if (!good.includes(r)) say(c, { text: `$${c.v} = ${r.tex}$ үед бутархай тодорхойлогдохгүй`, tone: "bad" });
  return { kind: "finite", roots: good, complete: z.complete, exact: good.every((r) => !!r.x), title: z.title ?? "Тэгшитгэл" };
}

function productMethod(F: Node, c: Ctx): Zeros | null {
  if (F.t !== "mul" || !dep(F.a, c.v) || !dep(F.b, c.v)) return null;
  say(c, { text: "Үржвэр тэгтэй тэнцэх нь аль нэг үржигдэхүүн тэг байх явдал (ОЗ-д харьяалагдах нөхцөлтэй)" });
  const out: Root[] = [];
  let complete = true;
  for (const part of [F.a, F.b]) {
    say(c, { text: "", tex: [`${toLatex(part)} = 0`] });
    const z = findZeros(part, sub(c));
    if (z.kind !== "finite" || z.all) return FAIL;
    complete &&= z.complete;
    out.push(...z.roots);
  }
  const good = mergeRoots(out).filter((r) => checkRoot(F, c.v, r, c.degrees) === "ok");
  return { kind: "finite", roots: good, complete, exact: good.every((r) => !!r.x), title: "Тэгшитгэл" };
}

/* ---------- Тоон хайлт (бусад бүх аргаар чадаагүй үед) ---------- */

export function numericScan(F: Node, v: string, degrees: boolean, lo = -50, hi = 50): number[] {
  const n = 40000;
  const f = (x: number) => numAt(F, v, x, degrees);
  const out: number[] = [];
  const push = (x: number) => { if (!out.some((y) => Math.abs(y - x) < 1e-6)) out.push(x); };
  let px = lo, py = f(lo);
  for (let i = 1; i <= n; i++) {
    const x = lo + ((hi - lo) * i) / n, y = f(x);
    if (Number.isFinite(py) && py === 0) push(px);
    if (Number.isFinite(py) && Number.isFinite(y) && py * y < 0) {
      let a = px, b = x, fa = py;
      for (let k = 0; k < 100; k++) {
        const m = (a + b) / 2, fm = f(m);
        if (!Number.isFinite(fm)) break;
        if (fm * fa <= 0) b = m; else { a = m; fa = fm; }
      }
      const r = (a + b) / 2;
      if (Math.abs(f(r)) < 1e-8 * Math.max(1, Math.abs(py), Math.abs(y))) push(r);
    }
    px = x; py = y;
  }
  return out.sort((a, b) => a - b);
}

/* ---------- Дээд түвшин ---------- */

export interface EqOpts {
  v?: string;
  degrees?: boolean;
}

/** Хувьсагчийг тодорхойлно: ганц бол түүнийг, олон бол x */
export function pickVar(nodes: Node[], prefer?: string): { v: string | null; extra: string[] } {
  const s = new Set<string>();
  for (const n of nodes) for (const x of freeSymbols(n)) s.add(x);
  const all = [...s];
  if (prefer && s.has(prefer)) return { v: prefer, extra: all.filter((x) => x !== prefer) };
  if (all.length === 0) return { v: null, extra: [] };
  if (all.length === 1) return { v: all[0], extra: [] };
  for (const p of ["x", "y", "t"]) if (s.has(p)) return { v: p, extra: all.filter((x) => x !== p) };
  return { v: all[0], extra: all.slice(1) };
}

export function zerosOf(F: Node, v: string, degrees = false, quiet = true, steps: Step[] = []): Zeros {
  return findZeros(F, { v, degrees, steps, quiet, depth: 0 });
}

export function solveEquation(lhs: Node, rhs: Node, opts: EqOpts = {}): Solution {
  const op: RelOp = "=";
  const problem = relTex({ lhs, op, rhs });
  const { v, extra } = pickVar([lhs, rhs], opts.v);
  if (!v) return failure("Тэгшитгэлд үл мэдэгдэгч алга. Тоо бодох бол «Тооцоолох» горимыг сонгоно уу");
  if (extra.length) return failure(`Нэг үл мэдэгдэгчтэй тэгшитгэл оруулна уу ($${extra.join(",\\ ")}$ илүү байна). Системийг «Систем» горимоор бодно`);
  const degrees = !!opts.degrees;
  const F = N.sub(lhs, rhs);
  const steps: Step[] = [];
  const z = findZeros(F, { v, degrees, steps, quiet: false, rel: { lhs, rhs }, depth: 0 });
  const graph = [toAscii(lhs), toAscii(rhs)].filter((s, i) => !(i === 1 && /^-?\d+(\.\d+)?$/.test(s) && Number(s) === 0));
  if (z.kind === "fail") {
    const nums = numericScan(F, v, degrees);
    const base: Solution = { ok: false, title: CANNOT, problem, steps: [], answer: [], graph };
    if (nums.length) {
      return {
        ...base,
        answer: [],
        approx: nums.slice(0, 12).map((x) => `${v} \\approx ${decTex(x, 6)}`),
        notes: [
          `${CANNOT}. Аналитик шийд гаргаж чадаагүй тул $[-50;\\ 50]$ завсарт тоогоор хайж олсон ойролцоо утгуудыг харуулав — бүх шийд гэж баталгаажаагүй`,
        ],
      };
    }
    return { ...base, answer: [], notes: [CANNOT] };
  }
  const title = z.title ?? "Тэгшитгэл";
  if (z.kind === "periodic") {
    return { ok: true, title, problem, steps, answer: z.families!.map((f) => f.tex), graph };
  }
  // Эцсийн хамгаалалт: язгуур бүрийг анхны тэгшитгэлд орлуулна
  for (const r of z.roots) {
    if (checkRoot(F, v, r, degrees) !== "ok") {
      return { ...failure(`${CANNOT}: олдсон утга шалгалтад тэнцээгүй тул хариу гаргахгүй`), problem, graph };
    }
  }
  let answer: string[];
  let answerNote: string | undefined;
  if (z.all) {
    answer = [`${v}\\in\\mathbb{R}${z.except && z.except.length ? `,\\ ${v}\\ne ${z.except.map((e) => e.tex).join(",\\ ")}` : ""}`];
  } else if (!z.roots.length && !z.segments) {
    answer = [`${v}\\in\\varnothing`];
    answerNote = "Бодит шийдгүй";
  } else {
    const segs = (z.segments ?? []).map((s) => `${v}\\in\\left[${s.a.tex};\\ ${s.b.tex}\\right]`);
    answer = [...segs, ...(z.roots.length ? rootsTex(z.roots, v) : [])];
  }
  const approxs = z.roots.filter((r) => r.x && !asQ(r.x) || (!r.x && !r.tex.startsWith("\\approx"))).map((r) => `${r.tex} \\approx ${decTex(r.v, 6)}`);
  const notes: string[] = [];
  if (answerNote) notes.push(answerNote);
  if (!z.complete) notes.push("Зарим язгуурыг тоон аргаар олсон");
  if (!z.exact) notes.push("$\\approx$ тэмдэгтэй утгууд ойролцоо (тоон аргаар)");
  return { ok: true, title, problem, steps, answer, approx: approxs.length ? approxs : undefined, notes: notes.length ? notes : undefined, graph };
}

export { mergeRoots, rootX, rootNum, xq, ppow };
