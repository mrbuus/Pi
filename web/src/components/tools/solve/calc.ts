/* ============================================================================
 * Тооцоолох горим: илэрхийллийг ЯГ (бутархай, a\sqrt b, k\pi) ба аравтын
 * хэлбэрээр. Факториал, C, A-г их бүхэл тоогоор (BigInt) яг гаргана.
 * ========================================================================== */

import { parse, compile, toLatex, freeSymbols, ParseError } from "../core/expr.ts";
import { evalExact, xtex, approx, asQ, NotReal, type X } from "./exact.ts";
import { type Solution, failure, decTex } from "./steps.ts";
import { prepare, combPattern, InputError } from "./input.ts";

const big = (n: number) => BigInt(n);

export function bigFact(n: number): bigint {
  let r = big(1);
  for (let i = 2; i <= n; i++) r *= big(i);
  return r;
}
export function bigA(n: number, k: number): bigint {
  let r = big(1);
  for (let i = n - k + 1; i <= n; i++) r *= big(i);
  return r;
}
export function bigC(n: number, k: number): bigint {
  k = Math.min(k, n - k);
  let r = big(1);
  for (let i = 1; i <= k; i++) r = (r * big(n - k + i)) / big(i);
  return r;
}

/** Их бүхлийг LaTeX: 3 оронгоор зайтай */
export function bigTex(b: bigint): string {
  const s = b.toString();
  const neg = s.startsWith("-");
  const d = neg ? s.slice(1) : s;
  const grouped = d.replace(/\B(?=(\d{3})+(?!\d))/g, "\\,");
  return (neg ? "-" : "") + grouped;
}

/**
 * C(n,k), A(n,k)-тай илэрхийллийн бичлэг: факториалын бутархай болгож задлахгүй,
 * сургуулийн тэмдэглэгээгээр C_n^k (тоо нь баруун дээд, баруун доод талд) — эзэн 2026-10-27.
 * Хослол бүрийг түр том үсгээр орлуулж задлаад, LaTeX-д буцааж тавина.
 */
export function combProblemTex(src: string, degrees: boolean): string | null {
  const re = /\b([CA])\s*\(\s*([^,;()]+?)\s*[,;]\s*([^,;()]+?)\s*\)/g;
  if (!re.test(src)) return null;
  const free = "QRSTUVWZ".split("").filter((ch) => !src.includes(ch));
  const map = new Map<string, string>();
  let i = 0;
  const marked = src.replace(re, (_m, kind: string, n: string, k: string) => {
    const ch = free[i++];
    if (!ch) return _m;
    map.set(ch, `${kind}_{${n.trim()}}^{${k.trim()}}`);
    return ch;
  });
  if (!map.size) return null;
  try {
    let tex = toLatex(parse(prepare(marked, { degrees })));
    // Түр үсгүүд src-д байхгүй, toLatex том үсгээр команд бичдэггүй тул шууд солино
    for (const [ch, t] of map) tex = tex.split(ch).join(t);
    // Хоёр хослол зэрэгцвэл үржих тэмдэг: C_5^2\cdot C_4^1
    return tex.replace(/\}\s*(?=[CA]_\{)/g, "}\\cdot ");
  } catch {
    return null;
  }
}

export function calculate(src: string, opts: { degrees?: boolean } = {}): Solution {
  const degrees = !!opts.degrees;
  let prepared: string;
  try {
    prepared = prepare(src, { degrees });
  } catch (e) {
    return failure(e instanceof InputError ? e.message : "Илэрхийллийг ойлгосонгүй");
  }
  // их факториал, C, A
  const cp = combPattern(src);
  if (cp) {
    if (cp.n > 5000 || cp.k > cp.n) return failure(cp.k > cp.n ? "$k \\le n$ байх ёстой" : "Хэт их тоо — 5000 хүртэл");
    const val = cp.kind === "F" ? bigFact(cp.n) : cp.kind === "A" ? bigA(cp.n, cp.k) : bigC(cp.n, cp.k);
    const problem = cp.kind === "F" ? `${cp.n}!` : cp.kind === "A" ? `A_{${cp.n}}^{${cp.k}}` : `C_{${cp.n}}^{${cp.k}}`;
    const formula = cp.kind === "F" ? "" : cp.kind === "A" ? `\\frac{${cp.n}!}{${cp.n - cp.k}!}` : `\\frac{${cp.n}!}{${cp.k}!\\,${cp.n - cp.k}!}`;
    const digits = val.toString().length;
    return {
      ok: true, title: "Тооцоо", problem, steps: [],
      answer: [`${problem} ${formula ? `= ${formula} ` : ""}= ${digits > 400 ? "\\ldots" : bigTex(val)}`],
      notes: digits > 15 ? [`${digits} оронтой тоо`] : undefined,
    };
  }
  let node;
  try {
    node = parse(prepared);
  } catch (e) {
    return failure(e instanceof ParseError ? e.message : "Илэрхийллийг ойлгосонгүй");
  }
  const problem = combProblemTex(src, degrees) ?? toLatex(node);
  const vars = [...freeSymbols(node)];
  if (vars.length) {
    return { ...failure(`Тооцоолох горимд хувьсагч ($${vars.join(",\\ ")}$) орохгүй. Тэгшитгэл бол «Тэгшитгэл», хаалт задлах бол «Алгебр» горимыг сонгоно уу`), problem };
  }
  let exact: X | null = null;
  try {
    exact = evalExact(node, { degrees });
  } catch (e) {
    if (e instanceof NotReal) return { ...failure("Бодит тоонд тодорхойлогдохгүй (тэгд хуваах, сөрөг тооны тэгш зэргийн язгуур г.м.)"), problem };
    exact = null;
  }
  const v = exact ? approx(exact) : compile(node, { degrees })({});
  if (!Number.isFinite(v)) return { ...failure("Бодит тоонд тодорхойлогдохгүй эсвэл хэт их утга"), problem };
  const answer: string[] = [];
  const approxs: string[] = [];
  if (exact) {
    const r = asQ(exact);
    answer.push(`${problem} = ${xtex(exact)}`);
    if (r && r.d !== 1) {
      const whole = Math.trunc(r.n / r.d);
      if (whole !== 0) answer.push(`= ${whole < 0 ? "-" : ""}${Math.abs(whole)}\\frac{${Math.abs(r.n) % r.d}}{${r.d}}`);
    }
    if (!r || r.d !== 1) approxs.push(`\\approx ${decTex(v, 10)}`);
  } else {
    answer.push(`${problem} \\approx ${decTex(v, 10)}`);
  }
  return {
    ok: true, title: degrees && /sin|cos|tan|cot|asin|acos|atan|acot/.test(prepared) ? "Тооцоо (градус)" : "Тооцоо", problem, steps: [], answer,
    approx: approxs.length ? approxs : undefined,
  };
}
