/* ============================================================================
 * Матанализ: уламжлал (дүрмээр, алхамтай), тодорхой бус интеграл (хүснэгт,
 * шугаман орлуулга, хэсэгчлэн, хялбар бутархай), тодорхой интеграл
 * (Ньютон–Лейбниц + Симпсоноор тулгах), хязгаар, функцийн судалгаа.
 *
 * Хамгаалалт: уламжлалыг тоон ялгавартай, эх функцийг дифференциалж
 * интеграл доорх функцтэй, хязгаарыг цэгийн ойролцоох утгуудтай тулгана.
 * Тулгалт унавал хариу гаргахгүй.
 * ========================================================================== */

import { compile, diff, simplify, toLatex, parse, same, type Node } from "../core/expr.ts";
import { type Q, q, ZERO, ONE, isZ, val, qTex, neg as qneg, div as qdiv, mul as qmul, add as qadd, sub as qsub } from "./q.ts";
import { type X, evalExact, xtex, approx, isZero, asQ, xq, xsub, NotReal, ExactFail } from "./exact.ts";
import {
  type Poly, polyFrom, ratFrom, ptex, pderiv, deg, lead, pdivmod, pevalQ, pevalX, trim, isZeroP, rationalRoots, primitive, pgcd, ratReduce, pmul,
} from "./poly.ts";
import { type Step, type Solution, failure, CANNOT, decTex, xWithApprox, toAscii } from "./steps.ts";
import { N, dep, numAt, exactAt, zerosOf } from "./equation.ts";
import { type Root, mergeRoots } from "./roots.ts";
import { prettify, prettyTex } from "./pretty.ts";
import { breakExprs, piecesTex, piecesFrom, type Piece } from "./ineq.ts";

const V = "x";
const T = (n: Node) => toLatex(n);
const P = (n: Node) => (n.t === "sym" || n.t === "num" || n.t === "call" ? T(n) : `\\left(${T(n)}\\right)`);

/** Үр дүнг цэвэр LaTeX болгоно: олон гишүүнт бол эрэмбэлсэн хэлбэр */
export function tidy(n: Node, v = V): string {
  const s = prettify(n);
  const p = polyFrom(s, v);
  if (p) return ptex(p, v);
  if (s.t === "div") {
    const np = polyFrom(s.a, v);
    if (np && np.length > 2) return `\\frac{${ptex(np, v)}}{${prettyTex(s.b)}}`;
  }
  return prettyTex(s);
}
function tidyNode(n: Node, v = V): Node {
  const s = simplify(n);
  const p = polyFrom(s, v);
  if (p) {
    try { return parse(ptexAscii(p, v)); } catch { return s; }
  }
  return s;
}
function ptexAscii(p: Poly, v: string): string {
  return trim(p).map((c, i) => `(${c.n}/${c.d})*${v}^${i}`).join("+") || "0";
}

/* ---------- Уламжлал ---------- */

const TABLE: Record<string, string> = {
  sin: "(\\sin x)' = \\cos x",
  cos: "(\\cos x)' = -\\sin x",
  tan: "(\\operatorname{tg} x)' = \\frac{1}{\\cos^2 x}",
  cot: "(\\operatorname{ctg} x)' = -\\frac{1}{\\sin^2 x}",
  ln: "(\\ln x)' = \\frac{1}{x}",
  lg: "(\\lg x)' = \\frac{1}{x\\ln 10}",
  log: "(\\log_a x)' = \\frac{1}{x\\ln a}",
  exp: "(e^x)' = e^x",
  sqrt: "(\\sqrt{x})' = \\frac{1}{2\\sqrt{x}}",
  asin: "(\\arcsin x)' = \\frac{1}{\\sqrt{1-x^2}}",
  acos: "(\\arccos x)' = -\\frac{1}{\\sqrt{1-x^2}}",
  atan: "(\\operatorname{arctg} x)' = \\frac{1}{1+x^2}",
  acot: "(\\operatorname{arcctg} x)' = -\\frac{1}{1+x^2}",
  abs: "(|x|)' = \\frac{x}{|x|}",
};

function explain(n: Node, v: string, steps: Step[], depth: number) {
  if (depth > 2 || !dep(n, v)) return;
  const d = (x: Node) => tidy(diff(x, v), v);
  const line = (x: Node) => `\\left(${T(x)}\\right)' = ${d(x)}`;
  const isConst = (x: Node) => !dep(x, v);
  if (polyFrom(n, v) && depth > 0) return;
  switch (n.t) {
    case "add": case "sub": {
      if (depth === 0) {
        const terms: Node[] = [];
        const flat = (x: Node, sgn: number) => {
          if ((x.t === "add" || x.t === "sub") && !polyFrom(x, v)) { flat(x.a, sgn); flat(x.b, x.t === "sub" ? -sgn : sgn); }
          else terms.push(x);
        };
        flat(n, 1);
        steps.push({ text: "Нийлбэрийн уламжлал $(u\\pm v)' = u'\\pm v'$ — гишүүн бүрийг тусад нь", tex: terms.filter((t) => dep(t, v)).map(line) });
        for (const t of terms) explain(t, v, steps, depth + 1);
      }
      return;
    }
    case "neg": explain(n.a, v, steps, depth); return;
    case "mul": {
      if (isConst(n.a) || isConst(n.b)) {
        const [c, u] = isConst(n.a) ? [n.a, n.b] : [n.b, n.a];
        steps.push({ text: "Тогтмолыг уламжлалын гадна гаргана $(c\\cdot u)' = c\\cdot u'$", tex: [`\\left(${T(n)}\\right)' = ${P(c)}\\cdot\\left(${T(u)}\\right)' = ${d(n)}`] });
        explain(u, v, steps, depth + 1);
        return;
      }
      steps.push({
        text: "Үржвэрийн уламжлал $(uv)' = u'v+uv'$",
        tex: [`u = ${T(n.a)},\\ v = ${T(n.b)},\\quad u' = ${d(n.a)},\\ v' = ${d(n.b)}`, `\\left(${T(n)}\\right)' = ${P(parseSafe(d(n.a)))}\\cdot ${P(n.b)}+${P(n.a)}\\cdot ${P(parseSafe(d(n.b)))} = ${d(n)}`.replace(/\\cdot \\left\(1\\right\)|\\left\(1\\right\)\\cdot /g, "")],
      });
      explain(n.a, v, steps, depth + 1);
      explain(n.b, v, steps, depth + 1);
      return;
    }
    case "div": {
      if (isConst(n.b)) {
        steps.push({ text: "Тогтмолд хуваасан $\\left(\\frac{u}{c}\\right)' = \\frac{u'}{c}$", tex: [line(n)] });
        explain(n.a, v, steps, depth + 1);
        return;
      }
      steps.push({
        text: "Ноогдворын уламжлал $\\left(\\frac{u}{v}\\right)' = \\frac{u'v-uv'}{v^2}$",
        tex: [`u = ${T(n.a)},\\ v = ${T(n.b)},\\quad u' = ${d(n.a)},\\ v' = ${d(n.b)}`, `\\left(${T(n)}\\right)' = \\frac{${P(parseSafe(d(n.a)))}\\cdot ${P(n.b)}-${P(n.a)}\\cdot ${P(parseSafe(d(n.b)))}}{${P(n.b)}^2} = ${d(n)}`],
      });
      explain(n.a, v, steps, depth + 1);
      explain(n.b, v, steps, depth + 1);
      return;
    }
    case "pow": {
      if (!dep(n.b, v)) {
        if (n.a.t === "sym") { steps.push({ text: "Зэргийн уламжлал $(x^n)' = nx^{n-1}$", tex: [line(n)] }); return; }
        steps.push({ text: "Нийлмэл функц: $(u^n)' = n u^{n-1}\\cdot u'$", tex: [`u = ${T(n.a)},\\ u' = ${d(n.a)}`, line(n)] });
        explain(n.a, v, steps, depth + 1);
        return;
      }
      if (!dep(n.a, v)) {
        steps.push({ text: "Илтгэгч функц: $(a^u)' = a^u\\ln a\\cdot u'$", tex: [line(n)] });
        explain(n.b, v, steps, depth + 1);
        return;
      }
      steps.push({ text: "$u^w = e^{w\\ln u}$ гэж бичээд дифференциална", tex: [line(n)] });
      return;
    }
    case "call": {
      const u = n.f === "log" || n.f === "root" ? n.args[1] : n.args[0];
      const tb = TABLE[n.f];
      if (u.t === "sym" && u.n === v) { if (tb) steps.push({ text: "Хүснэгтийн томьёо", tex: [tb] }); return; }
      steps.push({ text: `Нийлмэл функцийн уламжлал $(f(u))' = f'(u)\\cdot u'$${tb ? `, $${tb}$` : ""}`, tex: [`u = ${T(u)},\\ u' = ${d(u)}`, line(n)] });
      explain(u, v, steps, depth + 1);
      return;
    }
  }
}
function parseSafe(tex: string): Node {
  // зөвхөн хаалт хэрэгтэй эсэхийг шийдэхэд: олон гишүүнт бичлэг бол нийлбэр гэж үзнэ
  return /[+-]/.test(tex.slice(1)) ? { t: "add", a: { t: "sym", n: tex }, b: { t: "num", v: 0 } } : { t: "sym", n: tex };
}

/** Уламжлалыг тоон ялгавартай тулгана */
function derivOk(f: Node, d: Node, v: string): boolean {
  const F = (x: number) => numAt(f, v, x), D = (x: number) => numAt(d, v, x);
  let good = 0;
  for (const x of [0.37, 1.21, -0.83, 2.47, -1.93, 0.71, 3.1]) {
    const h = 1e-5 * Math.max(1, Math.abs(x));
    const fd = (F(x + h) - F(x - h)) / (2 * h), dv = D(x);
    if (!Number.isFinite(fd) || !Number.isFinite(dv)) continue;
    if (Math.abs(fd - dv) > 1e-4 * Math.max(1, Math.abs(dv))) return false;
    good++;
  }
  return good >= 2;
}

export function derivative(f: Node, opts: { order?: number; at?: Node; v?: string } = {}): Solution {
  const v = opts.v ?? V;
  const order = Math.max(1, Math.min(6, opts.order ?? 1));
  const primes = order <= 3 ? "'".repeat(order) : `^{(${order})}`;
  const problem = `\\left(${T(f)}\\right)${primes}`;
  const steps: Step[] = [];
  let cur = f;
  try {
    for (let k = 1; k <= order; k++) {
      const p = polyFrom(cur, v);
      if (k === 1) {
        if (p) steps.push({ text: "Олон гишүүнтийн уламжлал: гишүүн бүрт $(x^n)' = nx^{n-1}$, $(c)' = 0$", tex: [`\\left(${ptex(p, v)}\\right)' = ${ptex(pderiv(p), v)}`] });
        else explain(cur, v, steps, 0);
      }
      const dn = p ? (parse(asciiPoly(pderiv(p), v))) : diff(cur, v);
      if (!derivOk(cur, dn, v)) return { ...failure(`${CANNOT}: уламжлалын тулгалт амжилтгүй`), problem };
      cur = dn;
      if (k > 1) steps.push({ text: `${k}-р эрэмбийн уламжлал`, tex: [`f${k <= 3 ? "'".repeat(k) : `^{(${k})}`}(${v}) = ${tidy(cur, v)}`] });
    }
  } catch (e) {
    return { ...failure(e instanceof Error && /[А-Яа-яӨөҮү]/.test(e.message) ? e.message : CANNOT), problem };
  }
  const res = tidy(cur, v);
  const answer = [`f${primes}(${v}) = ${res}`];
  const approxs: string[] = [];
  if (opts.at) {
    let x0: X | null = null;
    try { x0 = evalExact(opts.at); } catch { x0 = null; }
    const xv = x0 ? approx(x0) : numAt(opts.at, v, 0);
    let val0: string;
    const ex = x0 ? exactAt(cur, v, x0) : null;
    if (ex && ex !== "nan") val0 = xWithApprox(ex);
    else {
      const y = numAt(cur, v, xv);
      if (!Number.isFinite(y)) return { ...failure("Энэ цэгт уламжлал тодорхойлогдохгүй"), problem };
      val0 = `\\approx ${decTex(y, 6)}`;
    }
    answer.push(`f${primes}\\left(${x0 ? xtex(x0) : T(opts.at)}\\right) ${val0.startsWith("\\approx") ? "" : "= "}${val0}`);
    steps.push({ text: "Цэг дээрх утгыг олохдоо уламжлалд орлуулна", tex: [answer[1]] });
  }
  return { ok: true, title: order > 1 ? `${order}-р эрэмбийн уламжлал` : "Уламжлал", problem, steps, answer, approx: approxs.length ? approxs : undefined, graph: [toAscii(f), toAscii(simplify(cur))] };
}

function asciiPoly(p: Poly, v: string): string {
  const t = trim(p);
  if (!t.length) return "0";
  return t.map((c, i) => `(${c.n})/(${c.d})*${v}^${i}`).join("+");
}

/* ---------- Тодорхой бус интеграл ---------- */

const num = (c: Q): Node => N.q(c);
const sym = (n: string): Node => ({ t: "sym", n });
const call = (f: string, ...args: Node[]): Node => ({ t: "call", f, args });

interface IntCtx { v: string; rules: Set<string> }

/** u = a x + b */
function linear(u: Node, v: string): { a: Q; b: Q } | null {
  const p = polyFrom(u, v);
  if (!p || deg(p) !== 1) return null;
  return { a: p[1], b: p[0] ?? ZERO };
}
const divA = (n: Node, a: Q): Node => (a.n === 1 && a.d === 1 ? n : N.mul(num(qdiv(ONE, a)), n));

function integ(n: Node, c: IntCtx): Node | null {
  const v = c.v;
  if (!dep(n, v)) { c.rules.add("const"); return N.mul(n, sym(v)); }
  if (n.t === "pow" && !dep(n.b, v)) {
    const l = linear(n.a, v), e = constQ(n.b);
    if (l && e && !(l.a.n === 1 && l.a.d === 1 && isZ(l.b))) {
      if (e.n === -1 && e.d === 1) { c.rules.add("log"); return divA(call("ln", call("abs", n.a)), l.a); }
      c.rules.add("lin");
      const m = qadd(e, ONE);
      return divA(N.div(N.pow(n.a, num(m)), num(m)), l.a);
    }
    // sin^2 u = (1-cos 2u)/2, cos^2 u = (1+cos 2u)/2
    if (e && e.n === 2 && e.d === 1 && n.a.t === "call" && (n.a.f === "sin" || n.a.f === "cos")) {
      const l2 = linear(n.a.args[0], v);
      if (l2) {
        c.rules.add("trig2");
        const u2 = N.mul({ t: "num", v: 2 }, n.a.args[0]);
        const half = N.mul(num(q(1, 2)), sym(v));
        const part = divA(N.mul(num(q(1, 4)), call("sin", u2)), l2.a);
        return n.a.f === "sin" ? N.sub(half, part) : N.add(half, part);
      }
    }
  }
  const p = polyFrom(n, v);
  if (p) {
    c.rules.add("power");
    let r: Node = { t: "num", v: 0 };
    trim(p).forEach((co, i) => {
      if (isZ(co)) return;
      const k = qdiv(co, q(i + 1));
      r = N.add(r, N.mul(num(k), N.pow(sym(v), { t: "num", v: i + 1 })));
    });
    return r;
  }
  switch (n.t) {
    case "neg": { const a = integ(n.a, c); return a && N.neg(a); }
    case "add": case "sub": {
      c.rules.add("sum");
      const a = integ(n.a, c), b = integ(n.b, c);
      return a && b && (n.t === "add" ? N.add(a, b) : N.sub(a, b));
    }
    case "mul": {
      if (!dep(n.a, v)) { c.rules.add("constmul"); const b = integ(n.b, c); return b && N.mul(n.a, b); }
      if (!dep(n.b, v)) { c.rules.add("constmul"); const a = integ(n.a, c); return a && N.mul(n.b, a); }
      return byParts(n, c);
    }
    case "div": {
      if (!dep(n.b, v)) { c.rules.add("constmul"); const a = integ(n.a, c); return a && N.div(a, n.b); }
      if (!dep(n.a, v)) {
        const k = n.a;
        const den = n.b;
        // 1/(ax+b) , 1/(ax+b)^n
        const l = linear(den, v);
        if (l) { c.rules.add("log"); return N.mul(k, divA(call("ln", call("abs", den)), l.a)); }
        if (den.t === "pow" && !dep(den.b, v)) {
          const l2 = linear(den.a, v);
          const e = constQ(den.b);
          if (l2 && e && !(e.n === 1 && e.d === 1)) {
            c.rules.add("lin");
            const m = qsub(ONE, e); // 1-n
            return N.mul(k, divA(N.div(N.pow(den.a, num(m)), num(m)), l2.a));
          }
          // 1/cos^2(u), 1/sin^2(u)
          if (e && e.n === 2 && e.d === 1 && den.a.t === "call" && (den.a.f === "cos" || den.a.f === "sin")) {
            const l3 = linear(den.a.args[0], v);
            if (l3) {
              c.rules.add("trig");
              const core = den.a.f === "cos" ? call("tan", den.a.args[0]) : N.neg(call("cot", den.a.args[0]));
              return N.mul(k, divA(core, l3.a));
            }
          }
        }
        // 1/sqrt(a^2 - x^2) → arcsin(x/a)
        if (den.t === "call" && den.f === "sqrt") {
          const r = polyFrom(den.args[0], v);
          if (r && deg(r) === 2 && isZ(r[1]) && r[2].n < 0 && r[0].n > 0) {
            const a2 = qdiv(r[0], qneg(r[2]));
            c.rules.add("arcsin");
            return N.mul(N.div(k, call("sqrt", num(qneg(r[2])))), call("asin", N.div(sym(v), call("sqrt", num(a2)))));
          }
          const l4 = linear(den.args[0], v);
          if (l4) { c.rules.add("lin"); return N.mul(k, divA(N.mul({ t: "num", v: 2 }, den), l4.a)); }
        }
      }
      return rationalInt(n, c);
    }
    case "pow": {
      if (!dep(n.b, v)) {
        const l = linear(n.a, v);
        const e = constQ(n.b);
        if (l && e) {
          if (e.n === -1 && e.d === 1) { c.rules.add("log"); return divA(call("ln", call("abs", n.a)), l.a); }
          c.rules.add("lin");
          const m = qadd(e, ONE);
          return divA(N.div(N.pow(n.a, num(m)), num(m)), l.a);
        }
        return null;
      }
      if (!dep(n.a, v)) {
        const l = linear(n.b, v);
        if (!l) return null;
        c.rules.add("exp");
        const isE = n.a.t === "sym" && n.a.n === "e";
        const core = isE ? n : N.div(n, call("ln", n.a));
        return divA(core, l.a);
      }
      return null;
    }
    case "call": {
      const u = n.args[0];
      const l = linear(u, v);
      if (!l) return null;
      switch (n.f) {
        case "sqrt": c.rules.add("lin"); return divA(N.mul(num(q(2, 3)), N.pow(u, num(q(3, 2)))), l.a);
        case "cbrt": c.rules.add("lin"); return divA(N.mul(num(q(3, 4)), N.pow(u, num(q(4, 3)))), l.a);
        case "exp": c.rules.add("exp"); return divA(call("exp", u), l.a);
        case "sin": c.rules.add("trig"); return divA(N.neg(call("cos", u)), l.a);
        case "cos": c.rules.add("trig"); return divA(call("sin", u), l.a);
        case "tan": c.rules.add("trig"); return divA(N.neg(call("ln", call("abs", call("cos", u)))), l.a);
        case "cot": c.rules.add("trig"); return divA(call("ln", call("abs", call("sin", u))), l.a);
        case "ln": c.rules.add("parts"); return divA(N.sub(N.mul(u, call("ln", u)), u), l.a);
      }
      return null;
    }
  }
  return null;
}

function constQ(n: Node): Q | null {
  try { return asQ(evalExact(n)); } catch { return null; }
}

/** Хэсэгчлэн: олон гишүүнт × (e^{u}, sin u, cos u), x^n ln x */
function byParts(n: Node, c: IntCtx): Node | null {
  if (n.t !== "mul") return null;
  const v = c.v;
  const tryPair = (pn: Node, g: Node): Node | null => {
    const p = polyFrom(pn, v);
    if (!p) return null;
    // x^n · ln x
    if (g.t === "call" && g.f === "ln" && g.args[0].t === "sym" && g.args[0].n === v) {
      if (trim(p).length - 1 > 6) return null;
      c.rules.add("parts");
      // ∫ P ln x = Q ln x - ∫ Q/x,  Q = ∫P
      const Qn = integ(pn, c);
      if (!Qn) return null;
      const Qp = polyFrom(Qn, v)!;
      const rest = trim(Qp).slice(1); // Q/x (Q(0)=0)
      const inner = integ(parse(asciiPoly(rest, v)), c);
      return inner && N.sub(N.mul(Qn, g), inner);
    }
    // Хүснэгтийн арга: Σ (-1)^k P^{(k)} · G_{k+1}
    let G: Node | null = g;
    let Pk: Poly = p;
    let res: Node = { t: "num", v: 0 };
    let sgn = 1;
    for (let k = 0; k < 12 && !isZeroP(Pk); k++) {
      G = G && integ(G, { v, rules: new Set() });
      if (!G) return null;
      const term = N.mul(parse(asciiPoly(Pk, v)), G);
      res = sgn > 0 ? N.add(res, term) : N.sub(res, term);
      sgn = -sgn;
      Pk = pderiv(Pk);
    }
    c.rules.add("parts");
    return res;
  };
  const okG = (g: Node) => g.t === "call" && ["exp", "sin", "cos", "ln"].includes(g.f) || (g.t === "pow" && !dep(g.a, v));
  if (okG(n.b)) { const r = tryPair(n.a, n.b); if (r) return r; }
  if (okG(n.a)) { const r = tryPair(n.b, n.a); if (r) return r; }
  return null;
}

/** Рационал функц: олон гишүүнт хэсэг + ялгаатай рационал язгууртай хуваарь → ln */
function rationalInt(n: Node, c: IntCtx): Node | null {
  const v = c.v;
  const rf0 = ratFrom(n, v);
  if (!rf0) return null;
  const rf = ratReduce(rf0);
  if (deg(rf.den) < 1) return integ(parse(asciiPoly(rf.num, v)), c);
  const { q: Qp, r: R } = pdivmod(rf.num, rf.den);
  let res: Node = isZeroP(Qp) ? { t: "num", v: 0 } : integ(parse(asciiPoly(Qp, v)), c)!;
  if (isZeroP(R)) return res;
  // x^2 + a (a>0) → arctg
  const D = rf.den;
  if (deg(D) === 2 && isZ(D[1] ?? ZERO) && deg(R) === 0) {
    const a = qdiv(D[0], D[2]);
    if (a.n > 0) {
      c.rules.add("arctan");
      const k = qdiv(R[0], D[2]);
      const sa = call("sqrt", num(a));
      return N.add(res, N.mul(N.div(num(k), sa), call("atan", N.div(sym(v), sa))));
    }
  }
  let rr;
  try { rr = rationalRoots(D); } catch { return null; }
  if (deg(rr.rest) > 0 || rr.roots.some((x) => x.m > 1)) return null;
  const dD = pderiv(D);
  c.rules.add("partial");
  for (const { r } of rr.roots) {
    const A = qdiv(pevalQ(R, r), pevalQ(dD, r));
    if (isZ(A)) continue;
    res = N.add(res, N.mul(num(A), call("ln", call("abs", N.sub(sym(v), num(r))))));
  }
  return res;
}

const RULES: Record<string, string> = {
  power: "$\\int x^n\\,dx = \\frac{x^{n+1}}{n+1}+C$",
  log: "$\\int \\frac{dx}{x} = \\ln|x|+C$",
  lin: "Шугаман орлуулга: $\\int f(ax+b)\\,dx = \\frac{1}{a}F(ax+b)+C$",
  exp: "$\\int e^x dx = e^x+C$, $\\int a^x dx = \\frac{a^x}{\\ln a}+C$",
  trig: "$\\int\\sin x\\,dx = -\\cos x+C$, $\\int\\cos x\\,dx = \\sin x+C$, $\\int\\frac{dx}{\\cos^2 x} = \\operatorname{tg} x+C$",
  parts: "Хэсэгчлэн интегралчлах: $\\int u\\,dv = uv-\\int v\\,du$",
  partial: "Хялбар бутархайд задлах: $\\frac{P(x)}{(x-a)(x-b)\\ldots} = \\frac{A}{x-a}+\\frac{B}{x-b}+\\ldots$",
  arctan: "$\\int\\frac{dx}{x^2+a^2} = \\frac{1}{a}\\operatorname{arctg}\\frac{x}{a}+C$",
  arcsin: "$\\int\\frac{dx}{\\sqrt{a^2-x^2}} = \\arcsin\\frac{x}{a}+C$",
  trig2: "Зэрэг бууруулах томьёо: $\\sin^2 u = \\frac{1-\\cos 2u}{2}$, $\\cos^2 u = \\frac{1+\\cos 2u}{2}$",
  sum: "Шугаман чанар: нийлбэрийн интеграл нь интегралуудын нийлбэр",
  constmul: "Тогтмол үржигдэхүүнийг интегралын гадна гаргана",
};

/** Эх функцийг дифференциалж f-тэй тулгана */
function antiderivOk(F: Node, f: Node, v: string): boolean {
  let dF: Node;
  try { dF = diff(F, v); } catch { return false; }
  let good = 0;
  for (const x of [0.37, 1.21, -0.83, 2.47, -1.93, 0.71, 3.1, 0.13, 5.3]) {
    const a = numAt(dF, v, x), b = numAt(f, v, x);
    if (!Number.isFinite(a) || !Number.isFinite(b)) continue;
    if (Math.abs(a - b) > 1e-7 * Math.max(1, Math.abs(b))) return false;
    good++;
  }
  return good >= 3;
}

export function antiderivative(f: Node, v = V): { F: Node; rules: string[] } | null {
  const c: IntCtx = { v, rules: new Set() };
  let F: Node | null = null;
  try { F = integ(f, c); } catch { F = null; }
  if (!F) return null;
  const Fs = simplify(F);
  if (!antiderivOk(Fs, f, v)) return null;
  return { F: Fs, rules: [...c.rules] };
}

export function indefiniteIntegral(f: Node, v = V): Solution {
  const problem = `\\int ${P(f)}\\,d${v}`;
  const r = antiderivative(f, v);
  if (!r) return { ...failure(`${CANNOT}: энэ интегралыг энгийн аргуудаар (хүснэгт, шугаман орлуулга, хэсэгчлэн, хялбар бутархай) олж чадсангүй`), problem };
  const steps: Step[] = r.rules.filter((x) => RULES[x]).map((x) => ({ text: RULES[x] }));
  const polyOnly = r.rules.every((x) => ["power", "sum", "constmul", "const"].includes(x));
  const Ft = polyOnly ? tidy(r.F, v) : prettyTex(prettify(r.F));
  steps.push({ text: "Үр дүнг дифференциалахад интеграл доорх функц гарч байна (шалгав)", tone: "ok" });
  return { ok: true, title: "Тодорхой бус интеграл", problem, steps, answer: [`${problem} = ${Ft}+C`], graph: [toAscii(f), toAscii(r.F)] };
}

/* ---------- Тодорхой интеграл ---------- */

function simpson(f: (x: number) => number, a: number, b: number): number {
  const rec = (a0: number, b0: number, fa: number, fm: number, fb: number, whole: number, eps: number, depth: number): number => {
    const m = (a0 + b0) / 2, lm = (a0 + m) / 2, rm = (m + b0) / 2;
    const flm = f(lm), frm = f(rm);
    const left = ((m - a0) / 6) * (fa + 4 * flm + fm), right = ((b0 - m) / 6) * (fm + 4 * frm + fb);
    if (depth <= 0 || Math.abs(left + right - whole) <= 15 * eps) return left + right + (left + right - whole) / 15;
    return rec(a0, m, fa, flm, fm, left, eps / 2, depth - 1) + rec(m, b0, fm, frm, fb, right, eps / 2, depth - 1);
  };
  const fa = f(a), fb = f(b), fm = f((a + b) / 2);
  return rec(a, b, fa, fm, fb, ((b - a) / 6) * (fa + 4 * fm + fb), 1e-11, 40);
}

export function definiteIntegral(f: Node, aN: Node, bN: Node, v = V): Solution {
  const problem = `\\int_{${T(aN)}}^{${T(bN)}} ${P(f)}\\,d${v}`;
  let ax: X | null = null, bx: X | null = null;
  try { ax = evalExact(aN); } catch { ax = null; }
  try { bx = evalExact(bN); } catch { bx = null; }
  const a = ax ? approx(ax) : numAt(aN, v, 0), b = bx ? approx(bx) : numAt(bN, v, 0);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return { ...failure("Хязгаар нь төгсгөлөг тоо байх ёстой (өргөтгөсөн интеграл бодохгүй)"), problem };
  const fn = (x: number) => numAt(f, v, x);
  // Завсарт тасралтгүй эсэх
  for (let i = 0; i <= 400; i++) {
    const x = a + ((b - a) * i) / 400;
    if (!Number.isFinite(fn(x))) return { ...failure("Интеграл доорх функц энэ завсарт тодорхойлогдохгүй эсвэл тасралттай — өргөтгөсөн интегралыг бодохгүй"), problem };
  }
  const S = a === b ? 0 : simpson(fn, Math.min(a, b), Math.max(a, b)) * (a < b ? 1 : -1);
  const steps: Step[] = [];
  const r = antiderivative(f, v);
  if (r) {
    const Ft = tidy(r.F, v);
    steps.push({ text: "Эх функц", tex: [`F(${v}) = ${Ft}`] });
    let exact: X | null = null;
    if (ax && bx) {
      const Fa = exactAt(r.F, v, ax), Fb = exactAt(r.F, v, bx);
      if (Fa && Fb && Fa !== "nan" && Fb !== "nan") exact = xsub(Fb, Fa);
    }
    const nl = numAt(r.F, v, b) - numAt(r.F, v, a);
    if (Math.abs(nl - S) > 1e-6 * Math.max(1, Math.abs(S))) return { ...failure(`${CANNOT}: тулгалт амжилтгүй`), problem };
    const valTex = exact ? xtex(exact) : `\\approx ${decTex(nl, 8)}`;
    steps.push({ text: "Ньютон–Лейбницийн томьёо $\\int_a^b f\\,dx = F(b)-F(a)$", tex: [`F\\left(${T(bN)}\\right)-F\\left(${T(aN)}\\right) = ${valTex}`] });
    steps.push({ text: `Симпсоны тоон аргаар тулгавал $\\approx ${decTex(S, 8)}$`, tone: "ok" });
    return {
      ok: true, title: "Тодорхой интеграл", problem, steps,
      answer: [`${problem} ${exact ? "=" : ""} ${valTex}`],
      approx: exact && asQ(exact) === null ? [`\\approx ${decTex(approx(exact), 8)}`] : undefined,
      graph: [toAscii(f)],
    };
  }
  steps.push({ text: "Эх функцийг энгийн аргаар олж чадаагүй тул Симпсоны (тоон) аргаар бодов", tone: "note" });
  return { ok: true, title: "Тодорхой интеграл (тоон)", problem, steps, answer: [`${problem} \\approx ${decTex(S, 8)}`], notes: ["Тоон аргаар олсон ойролцоо утга"], graph: [toAscii(f)] };
}

/* ---------- Хязгаар ---------- */

type Target = { kind: "pt"; x: X | null; v: number; tex: string } | { kind: "inf"; sign: 1 | -1 };

export function parseTarget(src: string): Target | null {
  const s = src.trim().replace(/\s/g, "").replace(/∞/g, "inf");
  if (/^\+?inf(inity)?$/i.test(s)) return { kind: "inf", sign: 1 };
  if (/^-inf(inity)?$/i.test(s)) return { kind: "inf", sign: -1 };
  try {
    const n = parse(s);
    try {
      const x = evalExact(n);
      return { kind: "pt", x, v: approx(x), tex: xtex(x) };
    } catch {
      const v = compile(n)({});
      return Number.isFinite(v) ? { kind: "pt", x: null, v, tex: T(n) } : null;
    }
  } catch {
    return null;
  }
}

function near(f: Node, v: string, a: number, side: 1 | -1, h: number) {
  return numAt(f, v, a + side * h * Math.max(1, Math.abs(a)));
}

/** Хариуг цэгийн орчим тоогоор тулгана: L (тоо) эсвэл ±∞ */
function limitOk(f: Node, v: string, t: Target, L: number): boolean {
  const vals: number[] = [];
  if (t.kind === "pt") for (const s of [1, -1] as const) for (const h of [1e-5, 1e-6, 1e-7]) vals.push(near(f, v, t.v, s, h));
  else for (const X0 of [1e5, 1e6, 1e7]) vals.push(numAt(f, v, t.sign * X0));
  const fin = vals.filter(Number.isFinite);
  if (fin.length < 2) return false;
  if (!Number.isFinite(L)) return fin.every((y) => Math.sign(y) === Math.sign(L) && Math.abs(y) > 1e3);
  return fin.every((y) => Math.abs(y - L) < 2e-3 * Math.max(1, Math.abs(L)));
}

export function limit(f: Node, target: string, v = V): Solution {
  const t = parseTarget(target);
  if (!t) return failure("Хязгаарын цэгийг тоо, $\\pi$-тэй илэрхийлэл эсвэл inf, -inf гэж оруулна уу");
  const tTex = t.kind === "inf" ? (t.sign > 0 ? "+\\infty" : "-\\infty") : t.tex;
  const problem = `\\lim_{${v}\\to ${tTex}} ${P(f)}`;
  const steps: Step[] = [];
  const done = (L: X | number, extra?: string): Solution => {
    const Lv = typeof L === "number" ? L : approx(L);
    if (!limitOk(f, v, t, Lv)) return { ...failure(`${CANNOT}: олсон утга тоон тулгалтад тэнцээгүй`), problem, steps: [] };
    const lt = typeof L === "number" ? (Number.isFinite(L) ? `\\approx ${decTex(L, 6)}` : L > 0 ? "+\\infty" : "-\\infty") : xtex(L);
    steps.push({ text: "Цэгийн ойролцоох утгуудаар тоогоор шалгав", tone: "ok" });
    return {
      ok: true, title: "Хязгаар", problem, steps, answer: [`${problem} ${lt.startsWith("\\approx") ? "" : "="} ${lt}`],
      approx: typeof L !== "number" && !asQ(L) ? [`\\approx ${decTex(approx(L), 6)}`] : undefined, notes: extra ? [extra] : undefined, graph: [toAscii(f)],
    };
  };
  const rf = ratFrom(f, v);
  if (t.kind === "pt") {
    // 1. Шууд орлуулах
    if (t.x) {
      const ex = exactAt(f, v, t.x);
      if (ex && ex !== "nan") {
        steps.push({ text: "Функц энэ цэгт тасралтгүй тул шууд орлуулна", tex: [`f\\left(${t.tex}\\right) = ${xtex(ex)}`] });
        const r = done(ex);
        if (r.ok) return r;
        steps.length = 0;
      }
    }
    // 2. Рационал: (x-a)-аар хураах
    if (rf && t.x && asQ(t.x)) {
      const a = asQ(t.x)!;
      let { num, den } = rf;
      const Na = pevalQ(num, a), Da = pevalQ(den, a);
      if (isZ(Na) && isZ(Da)) {
        const g = pgcd(num, den);
        const gp = primitive(g).prim;
        num = pdivmod(num, g).q; den = pdivmod(den, g).q;
        steps.push({ text: "$\\frac{0}{0}$ тодорхойгүй хэлбэр. Хүртвэр, хуваарийг нийтлэг үржигдэхүүнээр хураана", tex: [`\\frac{${ptex(rf.num, v)}}{${ptex(rf.den, v)}} = \\frac{\\left(${ptex(gp, v)}\\right)\\left(${ptex(pmul(num, [qdiv(lead(g), lead(gp))]), v)}\\right)}{\\left(${ptex(gp, v)}\\right)\\left(${ptex(den, v)}\\right)} = \\frac{${ptex(pmul(num, [qdiv(lead(g), lead(gp))]), v)}}{${ptex(den, v)}}`] });
        const N2 = pevalQ(pmul(num, [qdiv(lead(g), lead(gp))]), a), D2 = pevalQ(den, a);
        if (!isZ(D2)) {
          const L = qdiv(N2, D2);
          steps.push({ text: "Одоо орлуулбал", tex: [`\\frac{${qTex(N2)}}{${qTex(D2)}} = ${qTex(L)}`] });
          return done(xq(L));
        }
        num = pmul(num, [qdiv(lead(g), lead(gp))]);
      }
      if (!isZ(pevalQ(num, a)) && isZ(pevalQ(den, a))) {
        const l = near(f, v, t.v, -1, 1e-7), r = near(f, v, t.v, 1, 1e-7);
        steps.push({ text: `$\\frac{${qTex(pevalQ(num, a))}}{0}$ хэлбэр — нэг талын хязгаарыг шалгана` });
        if (Math.sign(l) === Math.sign(r)) return done(Math.sign(r) * Infinity);
        return {
          ok: true, title: "Хязгаар", problem, steps,
          answer: [`\\lim_{${v}\\to ${tTex}-0} = ${l > 0 ? "+" : "-"}\\infty,\\quad \\lim_{${v}\\to ${tTex}+0} = ${r > 0 ? "+" : "-"}\\infty`],
          notes: ["Нэг талын хязгаарууд ялгаатай тул хязгаар оршихгүй"], graph: [toAscii(f)],
        };
      }
    }
    // 3. Лопиталь (0/0)
    if (f.t === "div") {
      let u = f.a, w = f.b;
      for (let k = 1; k <= 3; k++) {
        const ua = t.x ? exactAt(u, v, t.x) : null, wa = t.x ? exactAt(w, v, t.x) : null;
        const uz = ua && ua !== "nan" ? isZero(ua) : Math.abs(numAt(u, v, t.v)) < 1e-12;
        const wz = wa && wa !== "nan" ? isZero(wa) : Math.abs(numAt(w, v, t.v)) < 1e-12;
        if (!(uz && wz)) break;
        let du: Node, dw: Node;
        try { du = diff(u, v); dw = diff(w, v); } catch { break; }
        steps.push({ text: `$\\frac{0}{0}$ хэлбэр — Лопиталийн дүрэм: хүртвэр, хуваарийн уламжлалын харьцаа`, tex: [`\\lim_{${v}\\to ${tTex}} \\frac{${tidy(du, v)}}{${tidy(dw, v)}}`] });
        u = du; w = dw;
        const q2: Node = N.div(u, w);
        if (t.x) {
          const ex = exactAt(simplify(q2), v, t.x);
          if (ex && ex !== "nan") {
            steps.push({ text: "Орлуулбал", tex: [xtex(ex)] });
            return done(ex);
          }
        }
      }
    }
  } else {
    // x → ±∞
    if (rf) {
      const n = deg(rf.num), d = deg(rf.den);
      if (n < 0) return done(xq(ZERO));
      steps.push({ text: `Хүртвэр, хуваарийг $${v}$-ийн хамгийн их зэрэг $${v}^{${Math.max(n, d)}}$-д хуваана` });
      if (n < d) { steps.push({ text: "Хүртвэрийн зэрэг бага тул хязгаар 0" }); return done(xq(ZERO)); }
      if (n === d) {
        const L = qdiv(lead(rf.num), lead(rf.den));
        steps.push({ text: "Зэрэг тэнцүү тул ахлах коэффициентуудын харьцаа", tex: [`\\frac{${qTex(lead(rf.num))}}{${qTex(lead(rf.den))}} = ${qTex(L)}`] });
        return done(xq(L));
      }
      const s = Math.sign(val(qdiv(lead(rf.num), lead(rf.den)))) * ((n - d) % 2 === 1 ? t.sign : 1);
      steps.push({ text: "Хүртвэрийн зэрэг их тул хязгаар төгсгөлгүй" });
      return done(s * Infinity);
    }
    // 1^∞ хэлбэр: (B)^E, B→1, E→∞ → e^{lim (B-1)E}
    if (f.t === "pow" && dep(f.b, v)) {
      const Bv = numAt(f.a, v, t.sign * 1e7), Ev = numAt(f.b, v, t.sign * 1e7);
      if (Math.abs(Bv - 1) < 1e-4 && Math.abs(Ev) > 1e5) {
        const G = N.mul(N.sub(f.a, { t: "num", v: 1 }), f.b);
        const gr = ratFrom(G, v);
        if (gr) {
          const n = deg(gr.num), d = deg(gr.den);
          let L: Q | null = null;
          if (n < d) L = ZERO;
          else if (n === d) L = qdiv(lead(gr.num), lead(gr.den));
          if (L) {
            steps.push({ text: "$1^{\\infty}$ хэлбэр: $\\lim B^{E} = e^{\\lim (B-1)E}$ (гайхамшигт хязгаар)", tex: [`\\lim_{${v}\\to ${tTex}} ${P(G)} = ${qTex(L)}`] });
            const ex = evalExact(N.pow({ t: "sym", n: "e" }, num(L)));
            return done(ex);
          }
        }
      }
    }
    // Лопиталь (∞/∞)
    if (f.t === "div") {
      let u = f.a, w = f.b;
      for (let k = 1; k <= 3; k++) {
        const uv = numAt(u, v, t.sign * 1e6), wv = numAt(w, v, t.sign * 1e6);
        if (!(Math.abs(uv) > 1e3 && Math.abs(wv) > 1e3)) break;
        try { u = diff(u, v); w = diff(w, v); } catch { break; }
        steps.push({ text: "$\\frac{\\infty}{\\infty}$ хэлбэр — Лопиталийн дүрэм", tex: [`\\lim \\frac{${tidy(u, v)}}{${tidy(w, v)}}`] });
        const r2 = ratFrom(N.div(u, w), v);
        if (r2) {
          const sub = limit(N.div(u, w), target, v);
          if (sub.ok) { steps.push(...sub.steps.filter((s) => s.tone !== "ok")); return done(parseLimitValue(sub, N.div(u, w), v, t)); }
        }
        if (!dep(w, v) || !dep(u, v)) break;
      }
    }
  }
  // Тоон үнэлгээ
  const seq: number[] = [];
  if (t.kind === "pt") for (const s of [1, -1] as const) seq.push(near(f, v, t.v, s, 1e-6), near(f, v, t.v, s, 1e-7));
  else seq.push(numAt(f, v, t.sign * 1e6), numAt(f, v, t.sign * 1e7));
  if (seq.every(Number.isFinite) && Math.max(...seq) - Math.min(...seq) < 1e-5 * Math.max(1, Math.abs(seq[0]))) {
    const L = seq[seq.length - 1];
    return {
      ok: true, title: "Хязгаар (тоон)", problem, steps: [{ text: "Аналитик аргаар бодож чадаагүй тул цэгийн ойролцоох утгуудаар тоогоор үнэлэв", tone: "note" }],
      answer: [`${problem} \\approx ${decTex(L, 6)}`], notes: ["Тоон үнэлгээ — ойролцоо утга"], graph: [toAscii(f)],
    };
  }
  return { ...failure(`${CANNOT}: хязгаар оршихгүй байж болно эсвэл энэ хэлбэрийг бодож чадсангүй`), problem, graph: [toAscii(f)] };
}

function parseLimitValue(sol: Solution, f: Node, v: string, t: Target): X | number {
  const s = sol.answer[0] ?? "";
  if (s.endsWith("+\\infty")) return Infinity;
  if (s.endsWith("-\\infty")) return -Infinity;
  const vals = t.kind === "inf" ? numAt(f, v, t.sign * 1e7) : near(f, v, t.v, 1, 1e-7);
  // хүртвэр/хуваарийн зэрэг ижил үед ахлах коэффициент
  const rf = ratFrom(f, v);
  if (rf && t.kind === "inf") {
    const n = deg(rf.num), d = deg(rf.den);
    if (n < d) return xq(ZERO);
    if (n === d) return xq(qdiv(lead(rf.num), lead(rf.den)));
  }
  return vals;
}

/* ---------- Функцийн судалгаа ---------- */

function definedAt(f: Node, v: string, r: Root): boolean {
  if (r.x) {
    const ex = exactAt(f, v, r.x);
    if (ex === "nan") return false;
    if (ex) return true;
  }
  return Number.isFinite(numAt(f, v, r.v));
}

function pointsOf(F: Node, v: string): Root[] | null {
  const pts: Root[] = [];
  for (const e of breakExprs(F, v)) {
    if (e.t === "call" && (e.f === "tan" || e.f === "cot")) return null;
    const z = zerosOf(e, v);
    if (z.kind !== "finite" || !z.complete) {
      if (z.kind === "finite" && z.all) continue;
      return null;
    }
    pts.push(...z.roots);
  }
  return pts;
}

export function studyFunction(f: Node, v = V): Solution {
  const problem = `f(${v}) = ${T(f)}`;
  if (/sin|cos|tan|cot/.test(JSON.stringify(f))) return { ...failure(`${CANNOT}: тригонометрийн функцийн бүрэн судалгааг хийхгүй (графикаар харна уу)`), problem, graph: [toAscii(f)] };
  const steps: Step[] = [];
  const answer: string[] = [];
  let d: Node;
  try { d = diff(f, v); } catch { return { ...failure(CANNOT), problem }; }
  if (!derivOk(f, d, v)) return { ...failure(CANNOT), problem };
  const fp = pointsOf(f, v);
  const dz = zerosOf(d, v);
  const dp = pointsOf(d, v);
  const fz = zerosOf(f, v);
  if (!fp || !dp || dz.kind !== "finite" || !dz.complete) return { ...failure(`${CANNOT}: функцийн онцгой цэгүүдийг бүрэн олж чадсангүй`), problem, graph: [toAscii(f)] };
  // 1. Тодорхойлогдох муж
  const dom = mergeRoots(fp).map((r) => ({ ...r, mult: 1 }));
  const domSigns: number[] = [];
  for (let i = 0; i <= dom.length; i++) {
    const lo = i ? dom[i - 1] : null, hi = i < dom.length ? dom[i] : null;
    const t = lo && hi ? (lo.v + hi.v) / 2 : lo ? lo.v + 1 : hi ? hi.v - 1 : 0.5;
    domSigns.push(Number.isFinite(numAt(f, v, t)) ? 1 : NaN);
  }
  const domPieces: Piece[] = piecesFrom({ points: dom, signs: domSigns, pointSigns: dom.map((p) => (definedAt(f, v, p) ? 1 : NaN)), zeros: [] }, ">");
  const full = domPieces.length === 1 && !domPieces[0].a && !domPieces[0].b;
  const domTex = full ? "\\mathbb{R}" : piecesTex(domPieces);
  answer.push(`D(f) = ${domTex}`);
  steps.push({ text: "1. Тодорхойлогдох муж", tex: [`D(f) = ${domTex}`] });
  const inDom = (x: number) => Number.isFinite(numAt(f, v, x));
  // 2. Тэг ба тэнхлэгтэй огтлолцол
  if (fz.kind === "finite" && fz.complete) {
    const zs = fz.roots.filter((r) => definedAt(f, v, r));
    steps.push({ text: "2. Функцийн тэг ($f(x) = 0$)", tex: [zs.length ? `${v} = ${zs.map((r) => r.tex).join(",\\ ")}` : "\\text{тэггүй}"] });
    if (zs.length) answer.push(`f(${v}) = 0:\\ ${v} = ${zs.map((r) => r.tex).join(",\\ ")}`);
  }
  if (inDom(0)) {
    const y0 = exactAt(f, v, xq(ZERO));
    steps.push({ text: "$Oy$ тэнхлэгтэй огтлолцох цэг", tex: [`f(0) = ${y0 && y0 !== "nan" ? xtex(y0) : decTex(numAt(f, v, 0), 6)}`] });
  }
  // Тэгш, сондгой (зөвхөн рационал функцэд ЯГ)
  const rf = ratFrom(f, v);
  if (rf) {
    const fm = ratFrom(mapX(f, v), v);
    if (fm) {
      const eqP = (a: Poly, b: Poly) => isZeroP(trim(a.map((c, i) => qsub(c, b[i] ?? ZERO))).concat(b.slice(a.length).map((c) => c)).filter((c) => !isZ(c)) as Poly);
      const crossEq = (s: number) => eqP(pmul(fm.num, rf.den), pmul(rf.num, fm.den).map((c) => (s > 0 ? c : qneg(c))));
      const symDom = dom.every((p) => dom.some((o) => Math.abs(o.v + p.v) < 1e-9));
      if (symDom && crossEq(1)) { steps.push({ text: "$f(-x) = f(x)$ — тэгш функц (графикаа $Oy$-ийн хувьд тэгш хэмтэй)" }); answer.push("\\text{тэгш функц}"); }
      else if (symDom && crossEq(-1)) { steps.push({ text: "$f(-x) = -f(x)$ — сондгой функц (графикаа эх цэгийн хувьд тэгш хэмтэй)" }); answer.push("\\text{сондгой функц}"); }
    }
  }
  // 3. Уламжлал, критик цэг
  steps.push({ text: "3. Уламжлал", tex: [`f'(${v}) = ${tidy(d, v)}`] });
  const crit = mergeRoots([...dz.roots, ...dp]).filter((r) => definedAt(f, v, r));
  const allPts = mergeRoots([...dom, ...dz.roots, ...dp]).map((r) => ({ ...r, mult: 1 }));
  if (crit.length) steps.push({ text: "Критик цэгүүд ($f'(x) = 0$ эсвэл $f'$ тодорхойлогдохгүй)", tex: [`${v} = ${crit.map((r) => r.tex).join(",\\ ")}`] });
  // 4. Монотон завсар
  type Mono = { lo: Root | null; hi: Root | null; s: number };
  const ivs: Mono[] = [];
  for (let i = 0; i <= allPts.length; i++) {
    const lo = i ? allPts[i - 1] : null, hi = i < allPts.length ? allPts[i] : null;
    const t = lo && hi ? (lo.v + hi.v) / 2 : lo ? lo.v + Math.max(1, Math.abs(lo.v)) : hi ? hi.v - Math.max(1, Math.abs(hi.v)) : 0.5;
    if (!inDom(t)) { ivs.push({ lo, hi, s: NaN }); continue; }
    const y = numAt(d, v, t);
    ivs.push({ lo, hi, s: Number.isFinite(y) ? Math.sign(y) : NaN });
  }
  // нэгтгэх: дундах цэг мужид орж, тэмдэг ижил бол
  const merged: Mono[] = [];
  for (const iv of ivs) {
    const last = merged[merged.length - 1];
    if (last && last.s === iv.s && !Number.isNaN(iv.s) && last.hi && definedAt(f, v, last.hi)) last.hi = iv.hi;
    else merged.push({ ...iv });
  }
  const ivTex = (m: Mono) => `\\left(${m.lo ? m.lo.tex : "-\\infty"};\\ ${m.hi ? m.hi.tex : "+\\infty"}\\right)`;
  const inc = merged.filter((m) => m.s > 0).map(ivTex), dec = merged.filter((m) => m.s < 0).map(ivTex), cons = merged.filter((m) => m.s === 0).map(ivTex);
  steps.push({
    text: "4. Уламжлалын тэмдгээр монотон завсар ($f'>0$ — өснө, $f'<0$ — буурна)",
    tex: [inc.length ? `\\nearrow:\\ ${inc.join(",\\ ")}` : "", dec.length ? `\\searrow:\\ ${dec.join(",\\ ")}` : "", cons.length ? `\\text{тогтмол}:\\ ${cons.join(",\\ ")}` : ""].filter(Boolean),
  });
  if (inc.length) answer.push(`\\text{өснө: } ${inc.join("\\cup ")}`);
  if (dec.length) answer.push(`\\text{буурна: } ${dec.join("\\cup ")}`);
  // 5. Экстремум
  const ext: string[] = [];
  for (const c of crit) {
    const i = ivs.findIndex((iv) => iv.hi && Math.abs(iv.hi.v - c.v) < 1e-12);
    if (i < 0 || i + 1 >= ivs.length) continue;
    const l = ivs[i].s, r = ivs[i + 1].s;
    if (Number.isNaN(l) || Number.isNaN(r) || l === r || l === 0 || r === 0) continue;
    const y = c.x ? exactAt(f, v, c.x) : null;
    const yt = y && y !== "nan" ? xtex(y) : `\\approx ${decTex(numAt(f, v, c.v), 6)}`;
    const kind = l > 0 && r < 0 ? "max" : "min";
    ext.push(`${v}_{\\${kind}} = ${c.tex},\\ f_{\\${kind}} = ${yt.startsWith("\\approx") ? yt.replace("\\approx", "\\approx") : yt}`.replace("= \\approx", "\\approx"));
  }
  steps.push({ text: "5. Экстремум: уламжлалын тэмдэг $+\\to-$ бол максимум, $-\\to+$ бол минимум", tex: ext.length ? ext : ["\\text{экстремумгүй}"] });
  answer.push(...ext);
  // 6. Асимптот (рационал)
  if (rf) {
    const red = ratReduce(rf);
    const asym: string[] = [];
    const vz = zerosOf(parse(asciiPoly(red.den, v)), v);
    if (vz.kind === "finite") for (const r of vz.roots) asym.push(`${v} = ${r.tex}`);
    const n = deg(red.num), dd = deg(red.den);
    if (dd >= 1) {
      if (n < dd) asym.push("y = 0");
      else if (n === dd) asym.push(`y = ${qTex(qdiv(lead(red.num), lead(red.den)))}`);
      else if (n === dd + 1) asym.push(`y = ${ptex(pdivmod(red.num, red.den).q, v)}`);
    }
    if (asym.length) { steps.push({ text: "6. Асимптотууд", tex: asym }); answer.push(`\\text{асимптот: } ${asym.join(",\\ ")}`); }
  }
  return { ok: true, title: "Функцийн судалгаа", problem, steps, answer, graph: [toAscii(f)] };
}

function mapX(f: Node, v: string): Node {
  const go = (n: Node): Node => {
    switch (n.t) {
      case "sym": return n.n === v ? { t: "neg", a: n } : n;
      case "num": return n;
      case "neg": return { t: "neg", a: go(n.a) };
      case "fact": return { t: "fact", a: go(n.a) };
      case "call": return { t: "call", f: n.f, args: n.args.map(go) };
      default: return { t: n.t, a: go(n.a), b: go(n.b) };
    }
  };
  return go(f);
}

export { same, NotReal, ExactFail, isZero, qmul, pevalX, tidyNode };
