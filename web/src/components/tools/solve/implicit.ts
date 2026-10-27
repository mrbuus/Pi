/* ============================================================================
 * x ба y-тэй тэгшитгэлийг y-ээр шийдэх: (2x)^2 = y → y = 4x^2.
 *   1) олон гишүүнт хэлбэр (y-ээр 1-р зэрэг) — mpoly-оор яг коэффициент
 *   2) y-ээр шугаман ерөнхий хэлбэр (sin x = y, 2y = ln x) — модоор
 * Шийдэгдэхгүй бол null (UI нь «График дээр харах» гэж санал болгоно).
 *
 * Мөн x^{-1} мэт сөрөг зэргийг 1/x болгох туслах (бутархай хураахад).
 * Импортгүй цэвэр модуль (зөвхөн дотоод импорт) — node --test шууд ачаална.
 * ========================================================================== */

import { freeSymbols, simplify, type Node, type Relation } from "../core/expr.ts";
import { mfrom, mdegIn, mcoeffs, masConst, mscale, mneg, misZero, mascii, type MPoly } from "./mpoly.ts";
import { div as qdiv, neg as qneg, q } from "./q.ts";
import { toAscii } from "./steps.ts";

const N = (v: number): Node => ({ t: "num", v });
const hasY = (n: Node) => freeSymbols(n).has("y");

/** n = a + b·y хэлбэрт задлах (a, b нь y-гүй); y-ээр шугаман биш бол null */
function linY(n: Node): { a: Node; b: Node } | null {
  if (!hasY(n)) return { a: n, b: N(0) };
  switch (n.t) {
    case "sym":
      return n.n === "y" ? { a: N(0), b: N(1) } : null;
    case "neg": {
      const r = linY(n.a);
      return r && { a: { t: "neg", a: r.a }, b: { t: "neg", a: r.b } };
    }
    case "add":
    case "sub": {
      const l = linY(n.a), r = linY(n.b);
      if (!l || !r) return null;
      return { a: { t: n.t, a: l.a, b: r.a }, b: { t: n.t, a: l.b, b: r.b } };
    }
    case "mul": {
      if (!hasY(n.a)) {
        const r = linY(n.b);
        return r && { a: { t: "mul", a: n.a, b: r.a }, b: { t: "mul", a: n.a, b: r.b } };
      }
      if (!hasY(n.b)) {
        const l = linY(n.a);
        return l && { a: { t: "mul", a: l.a, b: n.b }, b: { t: "mul", a: l.b, b: n.b } };
      }
      return null;
    }
    case "div": {
      if (hasY(n.b)) return null;
      const l = linY(n.a);
      return l && { a: { t: "div", a: l.a, b: n.b }, b: { t: "div", a: l.b, b: n.b } };
    }
    default:
      return null;
  }
}

/** Олон гишүүнтийг ASCII (x-ийн) — тогтмол 0 бол "0" */
function polyAscii(p: MPoly): string {
  return misZero(p) ? "0" : mascii(p);
}

/**
 * x, y-тэй «=» харьцааг y = f(x) болгоно. Буцаах нь f(x)-ийн ASCII бичвэр.
 * y байхгүй, эсвэл x, y-ээс өөр хувьсагчтай бол null.
 */
export function solveForY(r: Relation): string | null {
  if (r.op !== "=") return null;
  const vs = new Set([...freeSymbols(r.lhs), ...freeSymbols(r.rhs)]);
  if (!vs.has("y") || ![...vs].every((v) => v === "x" || v === "y")) return null;
  const F: Node = { t: "sub", a: r.lhs, b: r.rhs };

  // 1) Олон гишүүнт: F = c0(x) + c1(x)·y
  const P = mfrom(F, { vars: new Set(["x", "y"]) });
  if (P && mdegIn(P, "y") === 1) {
    const [c0, c1] = mcoeffs(P, "y");
    const k = masConst(c1);
    if (k) {
      if (k.n === 0) return null;
      return polyAscii(mscale(c0, qneg(qdiv(q(1), k))));
    }
    // хуваарьт x-тэй: y = -c0 / c1
    return `(${polyAscii(mneg(c0))})/(${polyAscii(c1)})`;
  }
  if (P) return null; // y^2 гэх мэт — шийд нь ганц функц биш

  // 2) Ерөнхий шугаман: (a_l - a_r) + (b_l - b_r) y = 0
  const l = linY(r.lhs), rr = linY(r.rhs);
  if (!l || !rr) return null;
  const b = simplify({ t: "sub", a: l.b, b: rr.b });
  if (hasY(b) || (b.t === "num" && Math.abs(b.v) < 1e-12)) return null;
  const a = simplify({ t: "sub", a: rr.a, b: l.a });
  const body =
    b.t === "num" && b.v === 1 ? a
      : b.t === "num" && b.v === -1 ? simplify({ t: "neg", a })
        : b.t === "neg" && b.a.t === "num" && b.a.v === 1 ? simplify({ t: "neg", a })
          : simplify({ t: "div", a, b });
  if (hasY(body)) return null;
  return toAscii(body);
}

/** x^{-k} → 1/x^k (бутархай хураахад олон гишүүнтүүдийн харьцаа болгоно) */
export function negPowToDiv(n: Node): Node {
  switch (n.t) {
    case "num": case "sym": return n;
    case "neg": return { t: "neg", a: negPowToDiv(n.a) };
    case "fact": return { t: "fact", a: negPowToDiv(n.a) };
    case "call": return { t: "call", f: n.f, args: n.args.map(negPowToDiv) };
    case "pow": {
      const base = negPowToDiv(n.a);
      const e = n.b.t === "neg" && n.b.a.t === "num" ? n.b.a.v : n.b.t === "num" && n.b.v < 0 ? -n.b.v : null;
      if (e !== null && Number.isInteger(e) && e > 0 && freeSymbols(base).size > 0) {
        return { t: "div", a: N(1), b: e === 1 ? base : { t: "pow", a: base, b: N(e) } };
      }
      return { t: "pow", a: base, b: negPowToDiv(n.b) };
    }
    default:
      return { t: n.t, a: negPowToDiv(n.a), b: negPowToDiv(n.b) };
  }
}
