/* ============================================================================
 * Алгебр: үржигдэхүүнд задлах, хаалт задлах, бутархай хураах, олон гишүүнт
 * хуваах (Хорнер / баганаар), ХИЕХ/ХБЕХ (Евклид), анхны үржвэрт задлах.
 * Задаргаа бүрийг буцааж үржүүлэн анхны илэрхийлэлтэй ЯГ тулгана.
 * ========================================================================== */

import { freeSymbols, toLatex, type Node } from "../core/expr.ts";
import { type Q, q, ZERO, ONE, add, sub, mul, div, neg, isZ, qTex, igcd, ilcm, factorInt, divisors, iroot, qroot, ExactFail } from "./q.ts";
import {
  type MPoly, type Mono, mfrom, mvars, mtotalDeg, mcoeffs, masConst, mscale, madd, mmul, mpow, mconst, mvar, msub, mneg, mequal,
  misZero, toUni, fromUni, mtex, mterm, sortedTerms, tdeg, monoTex, mascii, mmulMono,
} from "./mpoly.ts";
import { type Poly, deg, trim, pdivmod, ptex, primitive, rationalRoots, pmul, hornerTex, lead, pevalQ } from "./poly.ts";
import { type Step, type Solution, failure, CANNOT, qp } from "./steps.ts";

/* ---------- Үржигдэхүүнд задлах ---------- */

interface Factored {
  k: Q;
  factors: { p: MPoly; m: number }[];
}

/** Анхны (коэффициентийн ХИЕХ 1, ахлах гишүүн эерэг) + нэг гишүүнт хүчин зүйл */
function content(p: MPoly): { k: Q; mono: Mono; prim: MPoly } {
  const ts = sortedTerms(p);
  if (!ts.length) return { k: ONE, mono: {}, prim: p };
  let L = 1, G = 0;
  for (const t of ts) L = ilcm(L, t.c.d);
  for (const t of ts) G = igcd(G, t.c.n * (L / t.c.d));
  let k = q(G, L);
  if (ts[0].c.n < 0) k = neg(k);
  const mono: Mono = {};
  for (const v of mvars(p)) {
    let mn = Infinity;
    for (const t of ts) mn = Math.min(mn, t.m[v] ?? 0);
    if (mn > 0) mono[v] = mn;
  }
  let prim: MPoly = new Map();
  for (const t of ts) {
    const m: Mono = { ...t.m };
    for (const v in mono) m[v] -= mono[v];
    prim = madd(prim, mterm(m, div(t.c, k)));
  }
  return { k, mono, prim };
}

const isMono = (p: MPoly) => p.size === 1;
const ftex = (p: MPoly, order?: string[]) => (isMono(p) && [...p.values()][0].c.n === 1 && [...p.values()][0].c.d === 1 ? mtex(p, order) : `\\left(${mtex(p, order)}\\right)`);

/** Нэг гишүүнтийн квадрат/куб язгуур (коэффициент рационал) */
function monoRoot(t: { m: Mono; c: Q }, k: number): MPoly | null {
  if (t.c.n < 0 && k % 2 === 0) return null;
  const c = qroot(t.c, k);
  if (!c) return null;
  const m: Mono = {};
  for (const v in t.m) {
    if (t.m[v] % k) return null;
    m[v] = t.m[v] / k;
  }
  return mterm(m, c);
}

function factorPrim(p: MPoly, steps: Step[], order: string[], depth = 0): MPoly[] {
  if (depth > 8 || mtotalDeg(p) <= 1) return [p];
  const vs = mvars(p);
  const ts = sortedTerms(p, order);
  const T = (x: MPoly) => mtex(x, order);

  // Хоёр гишүүнт: квадратуудын ялгавар, кубуудын нийлбэр/ялгавар
  if (ts.length === 2) {
    const [A, B] = ts;
    if (A.c.n > 0 && B.c.n < 0) {
      const a = monoRoot(A, 2), b = monoRoot({ m: B.m, c: neg(B.c) }, 2);
      if (a && b) {
        steps.push({ text: "Квадратуудын ялгаврын томьёо $a^2-b^2=(a-b)(a+b)$", tex: [`${T(p)} = \\left(${T(msub(a, b))}\\right)\\left(${T(madd(a, b))}\\right)`] });
        return [...factorPrim(msub(a, b), steps, order, depth + 1), ...factorPrim(madd(a, b), steps, order, depth + 1)];
      }
    }
    const a3 = monoRoot(A, 3), b3 = monoRoot(B, 3);
    if (a3 && b3) {
      // A + B = a^3 + b^3 (b нь тэмдэгтэй)
      const f1 = madd(a3, b3), f2 = madd(msub(mmul(a3, a3), mmul(a3, b3)), mmul(b3, b3));
      const plus = B.c.n > 0;
      steps.push({
        text: plus ? "Кубуудын нийлбэрийн томьёо $a^3+b^3=(a+b)(a^2-ab+b^2)$" : "Кубуудын ялгаврын томьёо $a^3-b^3=(a-b)(a^2+ab+b^2)$",
        tex: [`${T(p)} = \\left(${T(f1)}\\right)\\left(${T(f2)}\\right)`],
      });
      return [...factorPrim(f1, steps, order, depth + 1), ...factorPrim(f2, steps, order, depth + 1)];
    }
  }

  // Нэг хувьсагч
  if (vs.length === 1) return factorUni(p, vs[0], steps, order, depth);

  // Хоёр хувьсагчийн нэгэн төрлийн: y = 1 гэж задлаад буцаана
  if (vs.length === 2) {
    const ds = new Set(ts.map((t) => tdeg(t.m)));
    if (ds.size === 1) {
      const [u, w] = order.filter((x) => vs.includes(x)).length === 2 ? order.filter((x) => vs.includes(x)) : vs;
      const d = [...ds][0];
      const uni = toUni(mmapSet(p, w), u);
      if (uni) {
        const sub: Step[] = [];
        const fs = factorUni(fromUni(uni, u), u, sub, order, depth + 1);
        if (fs.length > 1) {
          const back = fs.map((f) => homogenize(f, u, w));
          const prod = back.reduce((acc, f) => mmul(acc, f), mconst(ONE));
          if (mequal(prod, p)) {
            steps.push({ text: `Нэгэн төрлийн олон гишүүнт (${d}-р зэрэг): $${w}$-ийг тогтмол гэж үзээд $${u}$-ээр задлав`, tex: [`${T(p)} = ${back.map((f) => ftex(f, order)).join("")}`] });
            return back;
          }
        }
      }
    }
  }

  // Бүлэглэх (4 гишүүн)
  if (ts.length === 4) {
    const pairings = [[[0, 1], [2, 3]], [[0, 2], [1, 3]], [[0, 3], [1, 2]]];
    for (const [g1, g2] of pairings) {
      const P1 = g1.reduce((acc, i) => madd(acc, mterm(ts[i].m, ts[i].c)), new Map() as MPoly);
      const P2 = g2.reduce((acc, i) => madd(acc, mterm(ts[i].m, ts[i].c)), new Map() as MPoly);
      const c1 = content(P1), c2 = content(P2);
      const r1 = c1.prim, r2 = c2.prim;
      const m1 = mterm(c1.mono, c1.k), m2 = mterm(c2.mono, c2.k);
      let common: MPoly | null = null, other: MPoly | null = null;
      if (mequal(r1, r2)) { common = r1; other = madd(m1, m2); }
      else if (mequal(r1, mneg(r2))) { common = r1; other = msub(m1, m2); }
      if (common && other && mtotalDeg(common) >= 1) {
        steps.push({
          text: "Бүлэглэх арга",
          tex: [`${T(p)} = \\left(${T(P1)}\\right)+\\left(${T(P2)}\\right) = ${ftex(m1, order)}${ftex(r1, order)}${mtex(m2, order).startsWith("-") ? "" : "+"}${ftex(m2, order)}${ftex(r2, order)} = \\left(${T(common)}\\right)\\left(${T(other)}\\right)`],
        });
        const oc = content(other);
        const pre = oc.k.n === 1 && oc.k.d === 1 && !Object.keys(oc.mono).length ? [] : [mterm(oc.mono, oc.k)];
        return [...factorPrim(common, steps, order, depth + 1), ...pre, ...factorPrim(oc.prim, steps, order, depth + 1)];
      }
    }
  }

  // Бүтэн квадрат хасах квадрат: (a ± b)^2 - c^2
  if (ts.length >= 4 && ts.length <= 6) {
    const n = ts.length;
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) for (let k = j + 1; k < n; k++) {
      const tri = [ts[i], ts[j], ts[k]];
      const rest = ts.filter((_, x) => x !== i && x !== j && x !== k);
      const S = sqTrinomial(tri);
      if (!S) continue;
      const R = rest.reduce((acc, t) => madd(acc, mterm(t.m, t.c)), new Map() as MPoly);
      const negR = mneg(R);
      let c: MPoly | null = null;
      if (negR.size === 1) c = monoRoot([...negR.values()][0], 2);
      else if (negR.size === 3) c = sqTrinomial(sortedTerms(negR, order));
      if (!c) continue;
      const f1 = msub(S, c), f2 = madd(S, c);
      steps.push({ text: "Бүтэн квадрат ялгаж, квадратуудын ялгавар болгов", tex: [`${T(p)} = \\left(${T(S)}\\right)^2-${ftex(c, order)}^2 = \\left(${T(f1)}\\right)\\left(${T(f2)}\\right)`] });
      return [...factorPrim(f1, steps, order, depth + 1), ...factorPrim(f2, steps, order, depth + 1)];
    }
  }
  return [p];
}

function mmapSet(p: MPoly, w: string): MPoly {
  let r: MPoly = new Map();
  for (const t of p.values()) {
    const m = { ...t.m };
    delete m[w];
    r = madd(r, mterm(m, t.c));
  }
  return r;
}
function homogenize(f: MPoly, u: string, w: string): MPoly {
  const d = mtotalDeg(f);
  let r: MPoly = new Map();
  for (const t of f.values()) r = madd(r, mterm({ ...t.m, [w]: d - tdeg(t.m) }, t.c));
  return r;
}

/** a^2 ± 2ab + b^2 → a ± b */
function sqTrinomial(tri: { m: Mono; c: Q }[]): MPoly | null {
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) {
    if (i === j) continue;
    const k = 3 - i - j;
    const a = monoRoot(tri[i], 2), b = monoRoot(tri[j], 2);
    if (!a || !b) continue;
    const ab2 = mscale(mmul(a, b), q(2));
    const mid = mterm(tri[k].m, tri[k].c);
    if (mequal(mid, ab2)) return madd(a, b);
    if (mequal(mid, mneg(ab2))) return msub(a, b);
  }
  return null;
}

function factorUni(p: MPoly, v: string, steps: Step[], order: string[], depth: number): MPoly[] {
  const up = toUni(p, v)!;
  const d = deg(up);
  const T = (x: MPoly) => mtex(x, order);
  if (d <= 1) return [p];
  if (d === 2) {
    const [c, b, a] = up;
    const D = sub(mul(b, b), mul(q(4), mul(a, c)));
    const s = D.n >= 0 ? qroot(D, 2) : null;
    if (!s) {
      steps.push({ text: `$${T(p)}$: $D = ${qTex(D)}$ ${D.n < 0 ? "сөрөг" : "рационал тооны квадрат биш"} тул рационал коэффициенттэй үржигдэхүүнд задрахгүй`, tone: "note" });
      return [p];
    }
    const x1 = div(sub(neg(b), s), mul(q(2), a)), x2 = div(add(neg(b), s), mul(q(2), a));
    const lin = (r: Q) => fromUni(primitive([neg(r), ONE]).prim, v);
    const f1 = lin(x1), f2 = lin(x2);
    if (isZ(D)) steps.push({ text: "Бүтэн квадрат: $a^2\\pm 2ab+b^2=(a\\pm b)^2$", tex: [`${T(p)} = \\left(${T(f1)}\\right)^2`] });
    else steps.push({
      text: "Квадрат гурван гишүүнт: $ax^2+bx+c=a(x-x_1)(x-x_2)$",
      tex: [`D = ${qp(b)}^2-4\\cdot ${qp(a)}\\cdot ${qp(c)} = ${qTex(D)},\\quad ${v}_1 = ${qTex(x1)},\\ ${v}_2 = ${qTex(x2)}`, `${T(p)} = \\left(${T(f1)}\\right)\\left(${T(f2)}\\right)`],
    });
    return [f1, f2];
  }
  // Рационал язгуур
  let rr;
  try { rr = rationalRoots(up); } catch { return [p]; }
  const nz = rr.roots.filter((r) => !isZ(r.r));
  if (nz.length) {
    const out: MPoly[] = [];
    let cur = primitive(up).prim;
    for (const { r, m } of nz) {
      for (let i = 0; i < m; i++) {
        const lf = primitive([neg(r), ONE]).prim; // q x - p
        steps.push({ text: `$${v} = ${qTex(r)}$ үед олон гишүүнт тэг болох тул $(${ptex(lf, v)})$-д хуваагдана. Хорнерийн схем`, tex: [hornerTex(cur, r)] });
        cur = pdivmod(cur, lf).q;
        out.push(fromUni(lf, v));
      }
    }
    const restP = fromUni(primitive(cur).prim, v);
    const rest = deg(cur) >= 1 ? factorPrim(restP, steps, order, depth + 1) : [];
    return [...out, ...rest];
  }
  // x^4 + ... — хоёр квадрат гурван гишүүнтэд (бүхэл, ахлах коэффициент 1)
  const pr = primitive(up).prim;
  if (d === 4 && lead(pr).n === 1) {
    const [e0, e1, e2, e3] = pr.map((x) => x.n);
    const ds = e0 === 0 ? [] : divisors(e0).flatMap((x) => [x, -x]);
    for (const qq of ds) {
      const s = e0 / qq;
      const tryPR = (pp: number, rr2: number) => pp + rr2 === e3 && pp * rr2 + qq + s === e2 && pp * s + qq * rr2 === e1;
      const cands: [number, number][] = [];
      if (s !== qq) {
        const num = e1 - e3 * qq, den = s - qq;
        if (num % den === 0) { const pp = num / den; cands.push([pp, e3 - pp]); }
      } else {
        const disc = e3 * e3 - 4 * (e2 - 2 * qq);
        const sq = disc >= 0 ? iroot(disc, 2) : null;
        if (sq !== null && (e3 + sq) % 2 === 0) cands.push([(e3 + sq) / 2, (e3 - sq) / 2]);
      }
      for (const [pp, r2] of cands) {
        if (!tryPR(pp, r2)) continue;
        const f1 = fromUni([q(qq), q(pp), ONE], v), f2 = fromUni([q(s), q(r2), ONE], v);
        steps.push({ text: "Хоёр квадрат гурван гишүүнтийн үржвэрт задлав (коэффициентыг тааруулж)", tex: [`${T(p)} = \\left(${T(f1)}\\right)\\left(${T(f2)}\\right)`] });
        return [...factorPrim(f1, steps, order, depth + 1), ...factorPrim(f2, steps, order, depth + 1)];
      }
    }
  }
  return [p];
}

export function factorM(p: MPoly, steps: Step[], order: string[]): Factored {
  const c = content(p);
  const out: { p: MPoly; m: number }[] = [];
  const push = (f: MPoly, m = 1) => {
    const e = out.find((o) => mequal(o.p, f));
    if (e) e.m += m;
    else out.push({ p: f, m });
  };
  for (const v of Object.keys(c.mono).sort()) push(mvar(v), c.mono[v]);
  if (!(c.k.n === 1 && c.k.d === 1) || Object.keys(c.mono).length) {
    const monoT = mtex(mterm(c.mono, c.k), order);
    steps.push({ text: "Ерөнхий үржигдэхүүнийг хаалтны гадна гаргавал", tex: [`${mtex(p, order)} = ${monoT === "1" ? "" : monoT === "-1" ? "-" : monoT}\\left(${mtex(c.prim, order)}\\right)`] });
  }
  let k = c.k;
  for (const f of factorPrim(c.prim, steps, order)) {
    const cc = content(f);
    k = mul(k, cc.k);
    for (const v of Object.keys(cc.mono)) push(mvar(v), cc.mono[v]);
    if (!(masConst(cc.prim) && isZ(sub(masConst(cc.prim)!, ONE)))) push(cc.prim);
  }
  return { k, factors: out };
}

export function factoredTex(f: Factored, order?: string[]): string {
  if (f.factors.length === 1 && f.factors[0].m === 1 && f.k.n === 1 && f.k.d === 1) return mtex(f.factors[0].p, order);
  const parts = f.factors.map(({ p, m }) => {
    const base = ftex(p, order);
    return m > 1 ? `${base}^{${m}}` : base;
  });
  const k = f.k;
  const lead = k.n === 1 && k.d === 1 ? "" : k.n === -1 && k.d === 1 ? "-" : qTex(k);
  return lead + (parts.join("") || "1");
}

function expandFactored(f: Factored): MPoly {
  let r = mconst(f.k);
  for (const { p, m } of f.factors) r = mmul(r, mpow(p, m));
  return r;
}

const ORDER = ["x", "y", "z", "a", "b", "c", "m", "n", "p", "t"];
function orderOf(p: MPoly): string[] {
  const vs = mvars(p);
  return [...ORDER.filter((x) => vs.includes(x)), ...vs.filter((x) => !ORDER.includes(x))];
}

export function factorExpr(node: Node): Solution {
  const p = mfrom(node);
  const problem = toLatex(node);
  if (!p) return { ...failure(`${CANNOT}: зөвхөн олон гишүүнтийг (рационал коэффициенттэй) үржигдэхүүнд задална`), problem };
  if (misZero(p)) return { ok: true, title: "Үржигдэхүүнд задлах", problem, steps: [], answer: ["0"] };
  const order = orderOf(p);
  const steps: Step[] = [];
  const pre = mtex(p, order);
  if (pre.replace(/\s/g, "") !== problem.replace(/\s/g, "")) steps.push({ text: "Эхлээд хаалт задалж эмхэтгэвэл", tex: [pre] });
  const f = factorM(p, steps, order);
  if (!mequal(expandFactored(f), p)) return { ...failure(`${CANNOT}: задаргаа шалгалтад тэнцээгүй`), problem };
  const tex = factoredTex(f, order);
  const trivial = f.factors.length <= 1 && f.factors.every((x) => x.m === 1) && (f.k.n === 1 && f.k.d === 1);
  if (trivial) steps.push({ text: "Рационал коэффициенттэй үржигдэхүүнд цааш задрахгүй (эсвэл эдгээр аргаар задлагдсангүй)", tone: "note" });
  else steps.push({ text: "Буцааж үржүүлэхэд анхны илэрхийлэл гарч байна", tone: "ok" });
  return { ok: true, title: "Үржигдэхүүнд задлах", problem, steps, answer: [`${problem} = ${tex}`], graph: graphOf(p) };
}

function graphOf(p: MPoly): string[] | undefined {
  const vs = mvars(p);
  return vs.length === 1 && vs[0] === "x" ? [mascii(p)] : undefined;
}

/* ---------- Хаалт задлах ---------- */

function binom(n: Node): [MPoly, MPoly, string] | null {
  if (n.t !== "add" && n.t !== "sub") return null;
  const a = mfrom(n.a), b = mfrom(n.b);
  if (!a || !b) return null;
  return [a, n.t === "add" ? b : mneg(b), n.t === "add" ? "+" : "-"];
}

export function expandExpr(node: Node): Solution {
  const p = mfrom(node);
  const problem = toLatex(node);
  if (!p) return { ...failure(`${CANNOT}: зөвхөн олон гишүүнтийн хаалтыг задална`), problem };
  const order = orderOf(p);
  const steps: Step[] = [];
  // Товч үржвэрийн томьёо таних
  if (node.t === "pow" && node.b.t === "num" && (node.b.v === 2 || node.b.v === 3)) {
    const bn = binom(node.a);
    if (bn) {
      const [a, b] = bn;
      const sgn = bn[2];
      const fa = ftex(a, order), fb = ftex(sgn === "-" ? mneg(b) : b, order);
      if (node.b.v === 2) steps.push({ text: `Товч үржвэрийн томьёо $(a${sgn}b)^2=a^2${sgn}2ab+b^2$`, tex: [`${problem} = ${fa}^2${sgn}2\\cdot ${fa}\\cdot ${fb}+${fb}^2`] });
      else steps.push({ text: `Товч үржвэрийн томьёо $(a${sgn}b)^3=a^3${sgn}3a^2b+3ab^2${sgn}b^3$`, tex: [`${problem} = ${fa}^3${sgn}3\\cdot ${fa}^2\\cdot ${fb}+3\\cdot ${fa}\\cdot ${fb}^2${sgn}${fb}^3`] });
    }
  } else if (node.t === "pow" && node.b.t === "num" && Number.isInteger(node.b.v) && node.b.v >= 4 && node.b.v <= 10) {
    steps.push({ text: "Ньютоны бином: $(a+b)^n=\\sum_{k=0}^{n} C_n^k a^{n-k}b^k$" });
  } else if (node.t === "mul") {
    const b1 = binom(node.a), b2 = binom(node.b);
    if (b1 && b2 && mequal(b1[0], b2[0]) && mequal(b1[1], mneg(b2[1]))) {
      steps.push({ text: "Товч үржвэрийн томьёо $(a-b)(a+b)=a^2-b^2$" });
    } else steps.push({ text: "Хаалт бүрийн гишүүн бүрийг нөгөө хаалтны гишүүн бүрээр үржүүлнэ" });
  }
  const res = mtex(p, order);
  steps.push({ text: "Төстэй гишүүдийг эмхэтгэвэл", tex: [res] });
  return { ok: true, title: "Хаалт задлах", problem, steps, answer: [`${problem} = ${res}`], graph: graphOf(p) };
}

/* ---------- Бутархай хураах ---------- */

interface MRat { num: MPoly; den: MPoly }
function mrat(n: Node): MRat | null {
  const m = mfrom(n);
  if (m) return { num: m, den: mconst(ONE) };
  switch (n.t) {
    case "neg": { const a = mrat(n.a); return a && { num: mneg(a.num), den: a.den }; }
    case "add": case "sub": {
      const a = mrat(n.a), b = mrat(n.b);
      if (!a || !b) return null;
      if (mequal(a.den, b.den)) return { num: n.t === "add" ? madd(a.num, b.num) : msub(a.num, b.num), den: a.den };
      const x = mmul(a.num, b.den), y = mmul(b.num, a.den);
      return { num: n.t === "add" ? madd(x, y) : msub(x, y), den: mmul(a.den, b.den) };
    }
    case "mul": {
      const a = mrat(n.a), b = mrat(n.b);
      return a && b && { num: mmul(a.num, b.num), den: mmul(a.den, b.den) };
    }
    case "div": {
      const a = mrat(n.a), b = mrat(n.b);
      if (!a || !b || misZero(b.num)) return null;
      return { num: mmul(a.num, b.den), den: mmul(a.den, b.num) };
    }
    case "pow": {
      if (n.b.t !== "num" || !Number.isInteger(n.b.v) || Math.abs(n.b.v) > 12) return null;
      const a = mrat(n.a);
      if (!a) return null;
      const k = Math.abs(n.b.v);
      const r = { num: mpow(a.num, k), den: mpow(a.den, k) };
      return n.b.v >= 0 ? r : { num: r.den, den: r.num };
    }
  }
  return null;
}

export function simplifyFraction(node: Node): Solution {
  const problem = toLatex(node);
  const r = mrat(node);
  if (!r) return { ...failure(`${CANNOT}: олон гишүүнтүүдийн харьцаа (рационал бутархай) оруулна уу`), problem };
  const order = orderOf(madd(r.num, r.den));
  const steps: Step[] = [];
  if (masConst(r.den)) {
    const k = masConst(r.den)!;
    const res = mscale(r.num, div(ONE, k));
    steps.push({ text: "Хуваарь нь тоо тул гишүүн бүрийг хуваана", tex: [mtex(res, order)] });
    return { ok: true, title: "Бутархай хураах", problem, steps, answer: [`${problem} = ${mtex(res, order)}`] };
  }
  const fs: Step[] = [];
  const fn = factorM(r.num, fs, order), fd = factorM(r.den, fs, order);
  steps.push({ text: "Хүртвэр ба хуваарийг үржигдэхүүнд задлавал", tex: [`\\frac{${factoredTex(fn, order)}}{${factoredTex(fd, order)}}`] });
  const cancelled: string[] = [];
  for (const a of fn.factors) {
    const b = fd.factors.find((x) => mequal(x.p, a.p));
    if (!b) continue;
    const m = Math.min(a.m, b.m);
    a.m -= m;
    b.m -= m;
    cancelled.push(m > 1 ? `${ftex(a.p, order)}^{${m}}` : ftex(a.p, order));
  }
  fn.factors = fn.factors.filter((x) => x.m > 0);
  fd.factors = fd.factors.filter((x) => x.m > 0);
  const k = div(fn.k, fd.k);
  fn.k = k;
  fd.k = ONE;
  const numT = factoredTex(fn, order), denT = factoredTex(fd, order);
  const res = fd.factors.length ? `\\frac{${numT.startsWith("-") ? numT.slice(1) : numT}}{${denT}}` : numT;
  const resSigned = fd.factors.length && numT.startsWith("-") ? `-${res}` : res;
  if (cancelled.length) steps.push({ text: `Нийтлэг үржигдэхүүн $${cancelled.join(",\\ ")}$-ийг хураавал`, tex: [resSigned] });
  else steps.push({ text: "Нийтлэг үржигдэхүүнгүй тул цааш хураагдахгүй", tone: "note" });
  return {
    ok: true, title: "Бутархай хураах", problem, steps, answer: [`${problem} = ${resSigned}`],
    notes: cancelled.length ? ["Хураасан үржигдэхүүн тэгээс ялгаатай байх нөхцөлд (анхны бутархайн ОЗ) тэнцүү"] : undefined,
  };
}

/* ---------- Олон гишүүнт хуваах ---------- */

export function polyDivide(a: Node, b: Node): Solution {
  const problem = `\\frac{${toLatex(a)}}{${toLatex(b)}}`;
  const pa = mfrom(a), pb = mfrom(b);
  const vs = [...new Set([...(pa ? mvars(pa) : []), ...(pb ? mvars(pb) : [])])];
  if (!pa || !pb || vs.length > 1) return { ...failure(`${CANNOT}: нэг хувьсагчийн хоёр олон гишүүнт оруулна уу (ж: (x^3-1)/(x-1))`), problem };
  const v = vs[0] ?? "x";
  const P = toUni(pa, v)!, D = toUni(pb, v)!;
  if (!trim(D).length) return { ...failure("Тэгт хуваах боломжгүй"), problem };
  const steps: Step[] = [];
  const { q: Qp, r: R } = pdivmod(P, D);
  if (deg(D) === 1 && lead(D).n === 1 && lead(D).d === 1) {
    const r0 = neg(D[0]);
    steps.push({ text: `Хуваагч $${ptex(D, v)}$ тул Хорнерийн схемээр ($${v} = ${qTex(r0)}$)`, tex: [hornerTex(P, r0)] });
    steps.push({ text: `Доод мөрийн тоонууд нь ноогдворын коэффициент, сүүлийнх нь үлдэгдэл. Безугийн теоремоор $P(${qTex(r0)}) = ${qTex(pevalQ(P, r0))}$` });
  } else {
    // Баганаар хуваах алхмууд
    let cur = trim(P);
    const lines: string[] = [];
    let guard = 0;
    while (deg(cur) >= deg(D) && guard++ < 20) {
      const k = deg(cur) - deg(D);
      const c = div(lead(cur), lead(D));
      const term: Poly = Array.from({ length: k + 1 }, (_, i) => (i === k ? c : ZERO));
      const prod = pmul(term, D);
      const next = trim(cur.map((x, i) => sub(x, prod[i] ?? ZERO)));
      lines.push(`${ptex(term, v)}:\\quad ${ptex(cur, v)} - \\left(${ptex(prod, v)}\\right) = ${ptex(next, v)}`);
      cur = trim(cur.map((x, i) => sub(x, prod[i] ?? ZERO)));
    }
    steps.push({ text: "Баганаар хуваах: ахлах гишүүнийг ахлах гишүүнд хувааж, үржүүлээд хасна", tex: lines });
  }
  steps.push({ text: "Шалгалт: хуваагдагч = хуваагч $\\cdot$ ноогдвор + үлдэгдэл", tex: [`${ptex(P, v)} = \\left(${ptex(D, v)}\\right)\\left(${ptex(Qp, v)}\\right)${trim(R).length ? `+${par0(ptex(R, v))}` : ""}`] });
  const Rneg = trim(R).length > 0 && lead(R).n < 0;
  const Rt = Rneg ? ptex(R.map(neg), v) : ptex(R, v);
  const answer = [`${problem} = ${ptex(Qp, v)}${trim(R).length ? `${Rneg ? "-" : "+"}\\frac{${Rt}}{${ptex(D, v)}}` : ""}`];
  return { ok: true, title: "Олон гишүүнт хуваах", problem, steps, answer, notes: [`Ноогдвор: $${ptex(Qp, v)}$, үлдэгдэл: $${ptex(R, v)}$`] };
}
const par0 = (s: string) => (s.startsWith("-") ? `\\left(${s}\\right)` : s);

/* ---------- Тооны онол ---------- */

export function primeTex(n: number): string {
  const f = factorInt(n);
  if (!f.length) return String(n);
  return f.map(([p, e]) => (e > 1 ? `${p}^{${e}}` : String(p))).join("\\cdot ");
}

function parseInts(src: string): number[] | null {
  const parts = src.split(/[\s,;]+/).filter(Boolean);
  const out: number[] = [];
  for (const s of parts) {
    if (!/^-?\d+$/.test(s)) return null;
    const v = Number(s);
    if (!Number.isSafeInteger(v)) return null;
    out.push(Math.abs(v));
  }
  return out;
}

export function primeFactorization(src: string): Solution {
  const ns = parseInts(src);
  if (!ns || ns.length !== 1) return failure("Нэг натурал тоо оруулна уу (ж: 360)");
  const n = ns[0];
  if (n < 2) return failure("2-оос их натурал тоо оруулна уу");
  if (n > 1e15) return failure("Хэт их тоо — $10^{15}$ хүртэл");
  const steps: Step[] = [];
  const rows: string[] = [];
  let m = n;
  for (const [p, e] of factorInt(n)) for (let i = 0; i < e; i++) { rows.push(`${m} & ${p}`); m /= p; }
  rows.push("1 &");
  steps.push({ text: "Хамгийн бага анхны хуваагчид дараалан хуваана", tex: [`\\begin{array}{r|l} ${rows.join(" \\\\ ")} \\end{array}`] });
  const f = factorInt(n);
  const tau = f.reduce((s, [, e]) => s * (e + 1), 1);
  const ds = tau <= 64 ? divisors(n) : null;
  steps.push({ text: `Хуваагчийн тоо: $\\tau(n) = ${f.map(([, e]) => `(${e}+1)`).join("")} = ${tau}$` });
  if (ds) steps.push({ text: "Бүх хуваагчид", tex: [ds.join(",\\ ")] });
  const isPrime = f.length === 1 && f[0][1] === 1;
  return {
    ok: true, title: "Анхны үржвэрт задлах", problem: String(n), steps, answer: [`${n} = ${primeTex(n)}`],
    notes: isPrime ? [`${n} нь анхны тоо`] : undefined,
  };
}

export function gcdLcm(src: string): Solution {
  const ns = parseInts(src);
  if (!ns || ns.length < 2) return failure("Хоёр ба түүнээс олон натурал тоог таслалаар тусгаарлаж оруулна уу (ж: 12, 18)");
  if (ns.some((x) => x === 0)) return failure("Тэгээс ялгаатай тоо оруулна уу");
  if (ns.some((x) => x > 1e12)) return failure("Хэт их тоо — $10^{12}$ хүртэл");
  const steps: Step[] = [];
  steps.push({ text: "Анхны үржвэрт задлавал", tex: ns.map((n) => `${n} = ${primeTex(n)}`) });
  // Евклидийн алгоритм
  const euclid: string[] = [];
  let g = ns[0];
  for (let i = 1; i < ns.length; i++) {
    let a = Math.max(g, ns[i]), b = Math.min(g, ns[i]);
    while (b) {
      euclid.push(`${a} = ${b}\\cdot ${Math.floor(a / b)}${a % b ? ` + ${a % b}` : ""}`);
      [a, b] = [b, a % b];
    }
    g = a;
  }
  steps.push({ text: "Евклидийн алгоритм (үлдэгдэл 0 болтол хуваана)", tex: euclid.slice(0, 30) });
  let l = 1;
  try {
    for (const n of ns) l = ilcm(l, n);
  } catch (e) {
    if (e instanceof ExactFail) return failure("ХБЕХ хэт их гарч байна");
    throw e;
  }
  const primes = [...new Set(ns.flatMap((n) => factorInt(n).map(([p]) => p)))].sort((a, b) => a - b);
  const pw = (n: number, p: number) => factorInt(n).find(([x]) => x === p)?.[1] ?? 0;
  const gT = primes.map((p) => [p, Math.min(...ns.map((n) => pw(n, p)))] as const).filter(([, e]) => e > 0).map(([p, e]) => (e > 1 ? `${p}^{${e}}` : `${p}`)).join("\\cdot ") || "1";
  const lT = primes.map((p) => [p, Math.max(...ns.map((n) => pw(n, p)))] as const).map(([p, e]) => (e > 1 ? `${p}^{${e}}` : `${p}`)).join("\\cdot ");
  steps.push({ text: "ХИЕХ — нийтлэг анхны тоонуудын хамгийн бага зэрэг, ХБЕХ — бүх анхны тоонуудын хамгийн их зэрэг", tex: [`\\text{ХИЕХ} = ${gT} = ${g}`, `\\text{ХБЕХ} = ${lT} = ${l}`] });
  if (ns.length === 2) steps.push({ text: "Шалгалт: $a\\cdot b = \\text{ХИЕХ}\\cdot\\text{ХБЕХ}$", tex: [`${ns[0]}\\cdot ${ns[1]} = ${g}\\cdot ${l} = ${ns[0] * ns[1]}`] });
  const list = ns.join(";\\ ");
  return { ok: true, title: "ХИЕХ ба ХБЕХ", problem: list, steps, answer: [`\\text{ХИЕХ}(${list}) = ${g}`, `\\text{ХБЕХ}(${list}) = ${l}`] };
}

export { freeSymbols, mmulMono, monoTex, mcoeffs, misZero };
