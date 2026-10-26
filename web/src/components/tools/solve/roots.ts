/* ============================================================================
 * Олон гишүүнт тэгшитгэл P(x) = 0 — алхамтай.
 *   1-р зэрэг: шугаман
 *   2-р зэрэг: дискриминант, x_{1,2}, Виет
 *   x^{2k}-аар орлуулах (биквадрат)
 *   ≥3: рационал язгуурын теорем + Хорнерийн схем → үлдсэнийг дахин
 *   Рационал язгуургүй үлдэгдэл: бодит язгуурыг тоогоор (ойролцоо гэж тэмдэглэнэ)
 * ========================================================================== */

import { type Q, q, ZERO, ONE, add, sub, mul, div, neg, isZ, val, qTex, igcd } from "./q.ts";
import { type X, xq, xroot, xdiv, xadd, xsub, xneg, xtex, approx, xsign, isZero, xeq, NotReal, ExactFail } from "./exact.ts";
import { type Poly, trim, deg, lead, ptex, rationalRoots, hornerTex, pdivmod, realRootsNum, primitive } from "./poly.ts";
import { type Step, qp, decTex } from "./steps.ts";

export interface Root {
  /** ЯГ утга (олдоогүй бол null — тэгвэл v нь ойролцоо) */
  x: X | null;
  v: number;
  tex: string;
  mult: number;
}
export interface Roots {
  roots: Root[];
  /** Бүх бодит язгуурыг олсон эсэх */
  complete: boolean;
  /** Бүгд ЯГ эсэх */
  exact: boolean;
  /** Тэгшитгэл адилтгал (x дурын) */
  all?: boolean;
}

export const rootX = (x: X, mult = 1): Root => ({ x, v: approx(x), tex: xtex(x), mult });
export const rootNum = (v: number): Root => ({ x: null, v, tex: `\\approx ${decTex(v, 6)}`, mult: 1 });

/** Давхардлыг нэгтгэж эрэмбэлнэ */
export function mergeRoots(rs: Root[]): Root[] {
  const out: Root[] = [];
  for (const r of rs) {
    const same = out.find((o) => (o.x && r.x ? xeq(o.x, r.x) : Math.abs(o.v - r.v) < 1e-9 * Math.max(1, Math.abs(r.v))));
    if (same) same.mult += r.mult;
    else out.push({ ...r });
  }
  return out.sort((a, b) => a.v - b.v);
}

/** Язгуурын жагсаалтыг LaTeX: x_1 = 2,\ x_2 = 3 */
export function rootsTex(rs: Root[], v = "x"): string[] {
  const rel = (r: Root) => (r.tex.startsWith("\\approx") ? ` ${r.tex}` : ` = ${r.tex}`);
  if (rs.length === 1) return [`${v}${rel(rs[0])}`];
  return rs.map((r, i) => `${v}_{${i + 1}}${rel(r)}`);
}

interface Opts {
  v?: string;
  /** Дэд тэгшитгэл: алхамыг товчлох */
  quiet?: boolean;
}

export function solvePoly(p: Poly, steps: Step[], opts: Opts = {}): Roots {
  const v = opts.v ?? "x";
  p = trim(p);
  const d = p.length - 1;
  if (d < 0) {
    steps.push({ text: `Тэгшитгэл адилтгал болж байна: $${v}$-ийн дурын бодит утгад биелнэ` });
    return { roots: [], complete: true, exact: true, all: true };
  }
  if (d === 0) {
    steps.push({ text: `$${qTex(p[0])} = 0$ гэсэн худал тэнцэтгэл гарсан тул шийдгүй` });
    return { roots: [], complete: true, exact: true };
  }
  if (d === 1) return linear(p, steps, v, opts.quiet);
  if (d === 2) return quadratic(p, steps, v, opts.quiet);
  return higher(p, steps, v, opts.quiet);
}

function linear(p: Poly, steps: Step[], v: string, quiet?: boolean): Roots {
  const [b, a] = p;
  const r = div(neg(b), a);
  if (!quiet) {
    const lines: string[] = [];
    if (!isZ(b)) lines.push(`${ptex([ZERO, a], v)} = ${qTex(neg(b))}`);
    if (!(a.n === 1 && a.d === 1)) lines.push(`${v} = \\frac{${qTex(neg(b))}}{${qTex(a)}}`.replace(/\\frac\{(-?)\\frac/, "\\frac{$1\\frac"));
    lines.push(`${v} = ${qTex(r)}`);
    steps.push({ text: "Шугаман тэгшитгэл: үл мэдэгдэгчтэй гишүүнийг нэг талд, тоог нөгөө талд шилжүүлнэ", tex: dedupe(lines) });
  }
  return { roots: [rootX(xq(r))], complete: true, exact: true };
}

function dedupe(a: string[]): string[] {
  return a.filter((s, i) => a.indexOf(s) === i);
}

function quadratic(p: Poly, steps: Step[], v: string, quiet?: boolean): Roots {
  const [c, b, a] = p;
  const say = (s: Step) => { if (!quiet) steps.push(s); };
  say({ text: `Квадрат тэгшитгэл $a${v}^2+b${v}+c=0$: $a=${qTex(a)},\\ b=${qTex(b)},\\ c=${qTex(c)}$` });
  if (isZ(b)) {
    // a x^2 + c = 0 → x^2 = -c/a
    const t = div(neg(c), a);
    say({ text: "Дутуу квадрат тэгшитгэл ($b=0$)", tex: [`${v}^2 = ${qTex(t)}`] });
    if (t.n < 0) {
      say({ text: `Квадрат нь сөрөг байж болохгүй тул бодит шийдгүй` });
      return { roots: [], complete: true, exact: true };
    }
    if (isZ(t)) return { roots: [rootX(xq(ZERO), 2)], complete: true, exact: true };
    const s = xroot(xq(t), 2);
    say({ tex: [`${v} = \\pm\\sqrt{${qTex(t)}} = \\pm ${xtex(s)}`] });
    return { roots: [rootX(xneg(s)), rootX(s)], complete: true, exact: true };
  }
  if (isZ(c)) {
    const r = div(neg(b), a);
    say({ text: "Дутуу квадрат тэгшитгэл ($c=0$): үржигдэхүүнд задална", tex: [`${v}\\left(${ptex([b, a], v)}\\right) = 0`, `${v}_1 = 0,\\quad ${v}_2 = ${qTex(r)}`] });
    return { roots: [rootX(xq(ZERO)), rootX(xq(r))].sort((x, y) => x.v - y.v), complete: true, exact: true };
  }
  const D = sub(mul(b, b), mul(q(4), mul(a, c)));
  say({ text: "Дискриминант", tex: [`D = b^2-4ac = ${qp(b)}^2-4\\cdot ${qp(a)}\\cdot ${qp(c)} = ${qTex(D)}`] });
  if (D.n < 0) {
    say({ text: "$D<0$ тул бодит язгуургүй" });
    return { roots: [], complete: true, exact: true };
  }
  const twoA = mul(q(2), a);
  if (isZ(D)) {
    const r = div(neg(b), twoA);
    say({ text: "$D=0$ тул давхар (ганц) язгууртай", tex: [`${v} = -\\frac{b}{2a} = ${qTex(r)}`] });
    return { roots: [rootX(xq(r), 2)], complete: true, exact: true };
  }
  const sD = xroot(xq(D), 2);
  const x1 = xdiv(xsub(xq(neg(b)), sD), xq(twoA));
  const x2 = xdiv(xadd(xq(neg(b)), sD), xq(twoA));
  const [lo, hi] = approx(x1) <= approx(x2) ? [x1, x2] : [x2, x1];
  say({
    text: "$D>0$ тул хоёр ялгаатай язгууртай",
    tex: [
      `${v}_{1,2} = \\frac{-b\\pm\\sqrt{D}}{2a} = \\frac{${qTex(neg(b))}\\pm\\sqrt{${qTex(D)}}}{${qTex(twoA)}}`,
      `${v}_1 = ${xtex(lo)},\\quad ${v}_2 = ${xtex(hi)}`,
    ],
  });
  say({
    text: "Виетийн теоремоор шалгавал",
    tex: [`${v}_1+${v}_2 = -\\frac{b}{a} = ${qTex(div(neg(b), a))},\\quad ${v}_1 ${v}_2 = \\frac{c}{a} = ${qTex(div(c, a))}`],
  });
  return { roots: [rootX(lo), rootX(hi)], complete: true, exact: true };
}

/** Зөвхөн x^{g}-ийн зэрэгтэй гишүүнтэй эсэх (g ≥ 2) */
function powerGcd(p: Poly): number {
  let g = 0;
  for (let i = 1; i < p.length; i++) if (!isZ(p[i])) g = igcd(g, i);
  return g;
}

function higher(p: Poly, steps: Step[], v: string, quiet?: boolean): Roots {
  const say = (s: Step) => { if (!quiet) steps.push(s); };
  const d = deg(p);
  const g = powerGcd(p);
  // Биквадрат: a x^4 + b x^2 + c (ерөнхийдөө x^{2g})
  if (g >= 2 && d / g <= 2 && !isZ(p[0])) {
    const tp: Poly = [];
    for (let i = 0; i <= d; i += g) tp.push(p[i]);
    const tv = "t";
    say({
      text: `Зөвхөн $${v}^{${g}}$-ийн зэрэгтэй гишүүнтэй тул $t = ${v}^{${g}}$${g % 2 === 0 ? " $(t\\ge 0)$" : ""} гэж орлуулна`,
      tex: [`${ptex(tp, tv)} = 0`],
    });
    const tr = solvePoly(tp, steps, { v: tv, quiet });
    const out: Root[] = [];
    for (const r of tr.roots) {
      if (!r.x) continue;
      const tt = xtex(r.x);
      if (g % 2 === 0 && xsign(r.x) < 0) {
        say({ text: `$t = ${tt} < 0$ тохирохгүй`, tone: "bad" });
        continue;
      }
      if (isZero(r.x)) { out.push(rootX(xq(ZERO), r.mult * g)); say({ text: `$${v}^{${g}} = 0 \\Rightarrow ${v} = 0$` }); continue; }
      try {
        const s = xroot(r.x, g);
        if (g % 2 === 0) {
          out.push(rootX(xneg(s)), rootX(s));
          say({ text: `$${v}^{${g}} = ${tt} \\Rightarrow ${v} = \\pm ${xtex(s)}$` });
        } else {
          out.push(rootX(s));
          say({ text: `$${v}^{${g}} = ${tt} \\Rightarrow ${v} = ${xtex(s)}$` });
        }
      } catch (e) {
        if (e instanceof NotReal) continue;
        const s = Math.pow(Math.abs(r.v), 1 / g) * (r.v < 0 ? -1 : 1);
        if (g % 2 === 0) out.push(rootNum(-s), rootNum(s));
        else out.push(rootNum(s));
      }
    }
    const roots = mergeRoots(out);
    return { roots, complete: tr.complete, exact: roots.every((r) => !!r.x) };
  }

  let rr;
  try {
    rr = rationalRoots(p);
  } catch (e) {
    if (!(e instanceof ExactFail)) throw e;
    const nums = realRootsNum(p);
    say({ text: "Коэффициент хэт том тул бодит язгуурыг тоон аргаар (ойролцоогоор) оллоо" });
    return { roots: nums.map(rootNum), complete: true, exact: false };
  }
  const { prim } = primitive(p);
  if (!quiet) {
    const intForm = ptex(prim, v);
    if (intForm !== ptex(p, v)) say({ text: "Бүхэл коэффициенттэй болговол", tex: [`${intForm} = 0`] });
    const a0 = prim.findIndex((c) => !isZ(c));
    if (a0 > 0) say({ text: `$${v}${a0 > 1 ? `^{${a0}}` : ""}$-ийг хаалтны гадна гаргавал $${v} = 0$ язгуур гарна` });
    if (rr.candidates.length) {
      const shown = rr.candidates.slice(0, 16).map(qTex).join(",\\ ");
      say({
        text: "Рационал язгуурын теорем: язгуур нь $\\frac{p}{q}$ хэлбэртэй, $p$ нь сул гишүүний, $q$ нь ахлах коэффициентийн хуваагч. Шалгах тоонууд",
        tex: [`${shown}${rr.candidates.length > 16 ? ",\\ \\ldots" : ""}`],
      });
    }
  }
  // Хорнерийн схемийг алхам алхмаар
  let cur = trim(prim);
  while (cur.length > 1 && isZ(cur[0])) cur = cur.slice(1);
  for (const { r, m } of rr.roots) {
    if (isZ(r)) continue;
    for (let i = 0; i < m; i++) {
      if (!quiet) say({ text: `$P(${qTex(r)}) = 0$ тул $${v} = ${qTex(r)}$ язгуур. Хорнерийн схемээр $(${v}${r.n < 0 ? "+" : "-"}${qTex(r.n < 0 ? neg(r) : r)})$-д хуваавал`, tex: [hornerTex(cur, r)] });
      cur = pdivmod(cur, [neg(r), ONE]).q;
    }
  }
  const out: Root[] = rr.roots.map((x) => rootX(xq(x.r), x.m));
  const rest = rr.rest;
  let complete = true;
  if (deg(rest) >= 1) {
    if (rr.roots.length) say({ text: "Үлдсэн тэгшитгэл", tex: [`${ptex(rest, v)} = 0`] });
    if (deg(rest) <= 2) {
      const sub = solvePoly(rest, steps, { v, quiet });
      out.push(...sub.roots);
    } else if (powerGcd(rest) >= 2 && deg(rest) / powerGcd(rest) <= 2 && !isZ(rest[0])) {
      const sub = higher(rest, steps, v, quiet);
      out.push(...sub.roots);
      complete = sub.complete;
    } else {
      const nums = realRootsNum(rest).filter((x) => !out.some((o) => Math.abs(o.v - x) < 1e-9));
      say({
        text: `$${ptex(rest, v)} = 0$ нь рационал язгуургүй тул бодит язгуурыг тоон аргаар (ойролцоогоор) оллоо`,
        tone: "note",
      });
      out.push(...nums.map(rootNum));
    }
  }
  const roots = mergeRoots(out);
  if (!quiet && roots.length && roots.every((r) => r.x && isRat(r.x)) && deg(rest) <= 0) {
    say({ text: "Үржигдэхүүнд задарсан хэлбэр", tex: [`${factorTex(lead(p), roots, v)} = 0`] });
  }
  return { roots, complete, exact: roots.every((r) => !!r.x) };
}

function isRat(x: X): boolean {
  return x.length === 0 || (x.length === 1 && x[0].n === 1 && x[0].pi === 0 && x[0].e === 0);
}

/** a(x-r_1)^{m_1}(x-r_2)… — рационал язгууруудаас */
export function factorTex(a: Q, roots: Root[], v = "x"): string {
  const parts = roots.map((r) => {
    const c = r.x && r.x.length ? r.x[0].c : ZERO;
    const base = isZ(c) ? v : `\\left(${v}${c.n < 0 ? "+" : "-"}${qTex(c.n < 0 ? neg(c) : c)}\\right)`;
    return r.mult > 1 ? `${base}^{${r.mult}}` : base;
  });
  const lead = a.n === 1 && a.d === 1 ? "" : a.n === -1 && a.d === 1 ? "-" : qTex(a);
  return lead + parts.join("");
}

export { val, add };
