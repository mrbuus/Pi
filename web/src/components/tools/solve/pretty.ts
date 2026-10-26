/* ============================================================================
 * Илэрхийллийг сурах бичгийн хэлбэрт: тоон коэффициентыг урд нэгтгэх,
 * ижил үржигдэхүүнийг зэрэг болгох, хүртвэр/хуваарийн ижлийг хураах,
 * төстэй гишүүдийг нэгтгэх. Утга НЭГ Ч өөрчлөгдөхгүй (зөвхөн бичлэг).
 *   e^{x^2}\cdot 2x → 2xe^{x^2},   -(\frac{1}{2\sqrt u}\cdot 2x) → -\frac{x}{\sqrt u}
 * ========================================================================== */

import { same, simplify, toLatex, type Node } from "../core/expr.ts";
import { type Q, q, ZERO, ONE, add, mul, div, neg, isZ, decToQ, ExactFail } from "./q.ts";

interface Fac { b: Node; e: Q }
interface Term { c: Q; f: Fac[] }

const num = (v: number): Node => ({ t: "num", v });
const qNode = (c: Q): Node => (c.d === 1 ? num(c.n) : { t: "div", a: num(c.n), b: num(c.d) });

function numQ(n: Node): Q | null {
  if (n.t === "num") {
    try { return decToQ(n.v); } catch { return null; }
  }
  if (n.t === "neg") { const a = numQ(n.a); return a && neg(a); }
  if (n.t === "div") { const a = numQ(n.a), b = numQ(n.b); return a && b && !isZ(b) ? div(a, b) : null; }
  return null;
}

function mulTerms(a: Term, b: Term): Term {
  return { c: mul(a.c, b.c), f: [...a.f, ...b.f] };
}

function toTerms(n: Node): Term[] {
  switch (n.t) {
    case "add": return [...toTerms(n.a), ...toTerms(n.b)];
    case "sub": return [...toTerms(n.a), ...toTerms(n.b).map((t) => ({ ...t, c: neg(t.c) }))];
    case "neg": return toTerms(n.a).map((t) => ({ ...t, c: neg(t.c) }));
  }
  return [toProd(n)];
}

function asFactor(n: Node): Term {
  const p = prettify(n);
  const c = numQ(p);
  if (c) return { c, f: [] };
  if (p.t === "pow") {
    const e = numQ(p.b);
    if (e) return { c: ONE, f: [{ b: p.a, e }] };
  }
  return { c: ONE, f: [{ b: p, e: ONE }] };
}

function toProd(n: Node): Term {
  const c = numQ(n);
  if (c) return { c, f: [] };
  switch (n.t) {
    case "neg": { const t = toProd(n.a); return { ...t, c: neg(t.c) }; }
    case "mul": {
      const a = single(n.a), b = single(n.b);
      return mulTerms(a, b);
    }
    case "div": {
      const a = single(n.a), b = single(n.b);
      if (isZ(b.c)) return asFactor(n);
      return { c: div(a.c, b.c), f: [...a.f, ...b.f.map((x) => ({ b: x.b, e: neg(x.e) }))] };
    }
  }
  return asFactor(n);
}

/** Хүчин зүйлийг ганц гишүүн болгоно; нийлбэр бол тунгалаг үржигдэхүүн */
function single(n: Node): Term {
  if (n.t === "add" || n.t === "sub") {
    const p = prettify(n);
    if (p.t !== "add" && p.t !== "sub") return toProd(p);
    return { c: ONE, f: [{ b: p, e: ONE }] };
  }
  return toProd(n);
}

function combine(t: Term): Term {
  const out: Fac[] = [];
  for (const f of t.f) {
    const e = out.find((o) => same(o.b, f.b));
    if (e) e.e = add(e.e, f.e);
    else out.push({ b: f.b, e: f.e });
  }
  return { c: t.c, f: out.filter((x) => !isZ(x.e)) };
}

const rank = (b: Node): number => (b.t === "sym" ? 0 : b.t === "pow" && b.a.t === "sym" ? 1 : b.t === "call" ? 3 : 2);

function powNode(b: Node, e: Q): Node {
  return e.n === 1 && e.d === 1 ? b : { t: "pow", a: b, b: qNode(e) };
}

function prodNode(fs: Fac[]): Node | null {
  if (!fs.length) return null;
  const sorted = [...fs].sort((a, b) => rank(a.b) - rank(b.b));
  return sorted.map((f) => powNode(f.b, f.e)).reduce((acc, x) => ({ t: "mul", a: acc, b: x }));
}

function termNode(t: Term): { node: Node; negative: boolean } {
  const negative = t.c.n < 0;
  const c = negative ? neg(t.c) : t.c;
  const up = prodNode(t.f.filter((f) => f.e.n > 0));
  const down = prodNode(t.f.filter((f) => f.e.n < 0).map((f) => ({ b: f.b, e: neg(f.e) })));
  let node: Node;
  if (!down) {
    if (!up) node = qNode(c);
    else if (c.n === 1 && c.d === 1) node = up;
    else node = { t: "mul", a: qNode(c), b: up };
  } else {
    const topC = num(c.n);
    const top: Node = up ? (c.n === 1 ? up : { t: "mul", a: topC, b: up }) : topC;
    const bot: Node = c.d === 1 ? down : { t: "mul", a: num(c.d), b: down };
    node = { t: "div", a: top, b: bot };
  }
  return { node, negative };
}

/** Үндсэн функц */
export function prettify(n: Node): Node {
  try {
    const s = simplify(n);
    return pretty(s);
  } catch (e) {
    if (e instanceof ExactFail) return n;
    return n;
  }
}

function pretty(n: Node): Node {
  switch (n.t) {
    case "num": case "sym": return n;
    case "call": return { t: "call", f: n.f, args: n.args.map(prettify) };
    case "fact": return { t: "fact", a: prettify(n.a) };
    case "pow": return { t: "pow", a: prettify(n.a), b: prettify(n.b) };
  }
  const terms = toTerms(n).map(combine);
  // төстэй гишүүд
  const merged: Term[] = [];
  for (const t of terms) {
    const key = JSON.stringify(t.f.map((f) => [f.b, f.e]).sort());
    const e = merged.find((m) => JSON.stringify(m.f.map((f) => [f.b, f.e]).sort()) === key);
    if (e) e.c = add(e.c, t.c);
    else merged.push({ c: t.c, f: t.f });
  }
  const live = merged.filter((t) => !isZ(t.c));
  if (!live.length) return num(0);
  let acc: Node | null = null;
  for (const t of live) {
    const { node, negative } = termNode(t);
    if (!acc) acc = negative ? { t: "neg", a: node } : node;
    else acc = negative ? { t: "sub", a: acc, b: node } : { t: "add", a: acc, b: node };
  }
  return acc!;
}

/** LaTeX: ln|u| гэх мэт сурах бичгийн тусгай хэлбэртэй */
export function prettyTex(n: Node): string {
  const mark = (m: Node): Node => {
    switch (m.t) {
      case "call":
        if (m.f === "ln" && m.args[0].t === "call" && m.args[0].f === "abs") {
          return { t: "sym", n: `\\ln\\left|${prettyTex(m.args[0].args[0])}\\right|` };
        }
        return { t: "call", f: m.f, args: m.args.map(mark) };
      case "num": case "sym": return m;
      case "neg": return { t: "neg", a: mark(m.a) };
      case "fact": return { t: "fact", a: mark(m.a) };
      default: return { t: m.t, a: mark(m.a), b: mark(m.b) };
    }
  };
  // Нийлбэрийн түвшинд хасах тэмдгийг хаалтгүй бичнэ: -\frac{x}{2}, a-2b
  const top = (m: Node): string => {
    if (m.t === "neg" && m.a.t !== "add" && m.a.t !== "sub") return `-${toLatex(mark(m.a))}`;
    if (m.t === "add" || m.t === "sub") {
      const b = m.b;
      const bt = b.t === "add" || b.t === "sub" ? `\\left(${top(b)}\\right)` : b.t === "neg" ? `\\left(${top(b)}\\right)` : toLatex(mark(b));
      return `${top(m.a)}${m.t === "add" ? "+" : "-"}${bt}`;
    }
    return toLatex(mark(m));
  };
  return top(n);
}

export { ZERO, q };
