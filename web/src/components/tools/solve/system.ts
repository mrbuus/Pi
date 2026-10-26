/* ============================================================================
 * Тэгшитгэлийн систем:
 *   - шугаман n×n (2×2: орлуулах арга + Крамер; 3×3: Крамер), тодорхойлогч 0
 *     бол Гауссаар (шийдгүй эсвэл төгсгөлгүй олон шийд)
 *   - нэг шугаман + нэг дурын олон гишүүнт (2 хувьсагч): орлуулах арга
 * Олсон хариуг бүх тэгшитгэлд ЯГ орлуулж шалгана.
 * ========================================================================== */

import { type Node, type Relation } from "../core/expr.ts";
import { type Q, q, ZERO, add, sub, mul, div, neg, isZ, qTex, eq as qeq } from "./q.ts";
import { type X, xq, xadd, xmul, xtex, isZero } from "./exact.ts";
import { mfrom, mvars, mtotalDeg, mcoeffs, masConst, msubst, mscale, madd, mconst, mvar, msub, toUni, mtex, mterm, type MPoly } from "./mpoly.ts";
import { solvePoly } from "./roots.ts";
import { ptex } from "./poly.ts";
import { type Step, type Solution, failure, CANNOT, qp, decTex, relTex } from "./steps.ts";
import { N } from "./equation.ts";

const ORDER = ["x", "y", "z", "t", "u", "v", "w", "a", "b", "c"];
const sortVars = (vs: string[]) => [...vs].sort((a, b) => (ORDER.indexOf(a) + 100 * +(ORDER.indexOf(a) < 0)) - (ORDER.indexOf(b) + 100 * +(ORDER.indexOf(b) < 0)) || a.localeCompare(b));

function det(m: Q[][]): Q {
  const n = m.length;
  if (n === 1) return m[0][0];
  if (n === 2) return sub(mul(m[0][0], m[1][1]), mul(m[0][1], m[1][0]));
  let s = ZERO;
  for (let j = 0; j < n; j++) {
    const minor = m.slice(1).map((r) => r.filter((_, k) => k !== j));
    const t = mul(m[0][j], det(minor));
    s = j % 2 ? sub(s, t) : add(s, t);
  }
  return s;
}
const vmat = (m: Q[][]) => `\\begin{vmatrix} ${m.map((r) => r.map(qTex).join(" & ")).join(" \\\\ ")} \\end{vmatrix}`;

function detExpansion(m: Q[][]): string {
  if (m.length === 2) return `${qp(m[0][0])}\\cdot ${qp(m[1][1])}-${qp(m[0][1])}\\cdot ${qp(m[1][0])}`;
  return "";
}

/** Гаусс–Жорданы арга (ЯГ): зэрэглэл, тууштай эсэх, үндсэн хувьсагчийн илэрхийлэл */
function gaussJordan(A: Q[][], b: Q[]) {
  const n = A.length, m = A[0].length;
  const M = A.map((r, i) => [...r, b[i]]);
  const pivots: number[] = [];
  let row = 0;
  for (let col = 0; col < m && row < n; col++) {
    let p = -1;
    for (let r = row; r < n; r++) if (!isZ(M[r][col])) { p = r; break; }
    if (p < 0) continue;
    [M[row], M[p]] = [M[p], M[row]];
    const pv = M[row][col];
    M[row] = M[row].map((x) => div(x, pv));
    for (let r = 0; r < n; r++) {
      if (r === row || isZ(M[r][col])) continue;
      const f = M[r][col];
      M[r] = M[r].map((x, k) => sub(x, mul(f, M[row][k])));
    }
    pivots.push(col);
    row++;
  }
  const inconsistent = M.some((r) => r.slice(0, m).every(isZ) && !isZ(r[m]));
  return { M, pivots, inconsistent, rank: pivots.length };
}

const pairTex = (vs: string[], vals: string[]) =>
  vs.length === 1 ? `${vs[0]} = ${vals[0]}` : `\\left(${vs.join(";\\ ")}\\right) = \\left(${vals.join(";\\ ")}\\right)`;

export function solveSystem(rels: Relation[]): Solution {
  if (rels.length < 2) return failure("Системд хамгийн багадаа 2 тэгшитгэл мөр мөрөөр оруулна уу");
  if (rels.length > 4) return failure("4-өөс олон тэгшитгэлтэй системийг бодохгүй");
  if (rels.some((r) => r.op !== "=")) return failure("Системийн мөр бүр тэгшитгэл ($=$) байх ёстой");
  const problem = `\\begin{cases} ${rels.map((r) => relTex(r)).join(" \\\\ ")} \\end{cases}`;
  const polys: MPoly[] = [];
  for (const r of rels) {
    const p = mfrom(N.sub(r.lhs, r.rhs));
    if (!p) return { ...failure(`${CANNOT}: системд зөвхөн олон гишүүнт тэгшитгэл (бутархай коэффициенттэй байж болно) ойлгоно`), problem };
    polys.push(p);
  }
  const vs = sortVars([...new Set(polys.flatMap(mvars))]);
  if (!vs.length) return { ...failure("Системд үл мэдэгдэгч алга"), problem };
  const graph = vs.length === 2 && vs.every((x) => x === "x" || x === "y") ? rels.map((r) => `${asciiRel(r)}`) : undefined;
  if (polys.every((p) => mtotalDeg(p) <= 1)) return linearSystem(polys, vs, problem, graph);
  if (polys.length === 2 && vs.length === 2) return mixedSystem(polys, vs, problem, graph);
  return { ...failure(`${CANNOT}: шугаман бус системээс зөвхөн «нэг шугаман + нэг олон гишүүнт» хэлбэрийг бодно`), problem, graph };
}

import { toAscii } from "./steps.ts";
function asciiRel(r: Relation): string {
  return `${toAscii(r.lhs)}=${toAscii(r.rhs)}`;
}

function linearSystem(polys: MPoly[], vs: string[], problem: string, graph?: string[]): Solution {
  const A = polys.map((p) => vs.map((v) => masConst(mcoeffs(p, v)[1] ?? new Map()) ?? ZERO));
  const b = polys.map((p) => neg(masConst(vsReduce(p, vs)) ?? ZERO));
  const steps: Step[] = [];
  const n = polys.length, m = vs.length;
  const stdForm = polys.map((p, i) => `${mtex(msub(p, mconst(neg(b[i]))), vs)} = ${qTex(b[i])}`);
  steps.push({ text: "Стандарт хэлбэрт бичвэл", tex: [`\\begin{cases} ${stdForm.join(" \\\\ ")} \\end{cases}`] });
  const titleTxt = n === m ? `Шугаман тэгшитгэлийн систем (${n} хувьсагч)` : "Шугаман тэгшитгэлийн систем";

  if (n === m && n <= 3) {
    const D = det(A);
    if (n === 2) substitution2(A, b, vs, steps);
    const dSteps: string[] = [`\\Delta = ${vmat(A)} = ${n === 2 ? `${detExpansion(A)} = ` : ""}${qTex(D)}`];
    if (!isZ(D)) {
      const vals: Q[] = [];
      vs.forEach((v, j) => {
        const Aj = A.map((r, i) => r.map((x, k) => (k === j ? b[i] : x)));
        const Dj = det(Aj);
        dSteps.push(`\\Delta_{${v}} = ${vmat(Aj)} = ${n === 2 ? `${detExpansion(Aj)} = ` : ""}${qTex(Dj)}`);
        vals.push(div(Dj, D));
      });
      dSteps.push(vs.map((v, j) => `${v} = \\frac{\\Delta_{${v}}}{\\Delta} = ${qTex(vals[j])}`).join(",\\quad "));
      steps.push({ text: n === 2 ? "Крамерын аргаар шалгавал" : "Крамерын арга: тодорхойлогчууд", tex: dSteps });
      // шалгалт
      for (let i = 0; i < n; i++) {
        let s = ZERO;
        for (let j = 0; j < m; j++) s = add(s, mul(A[i][j], vals[j]));
        if (!qeq(s, b[i])) return { ...failure(`${CANNOT}: шалгалтад тэнцээгүй`), problem };
      }
      steps.push({ text: "Олсон утгыг тэгшитгэл бүрт орлуулахад биелж байна", tone: "ok" });
      return { ok: true, title: titleTxt, problem, steps, answer: [pairTex(vs, vals.map(qTex))], graph };
    }
    steps.push({ text: "Үндсэн тодорхойлогч тэг тул Гауссын аргаар шинжилнэ", tex: [dSteps[0]] });
  }
  const g = gaussJordan(A, b);
  const rowsTex = g.M.map((r) => `${mtex(rowPoly(r, vs), vs)} = ${qTex(r[m])}`);
  steps.push({ text: "Гауссын аргаар (мөрийн хувиргалт) хялбарчилбал", tex: [`\\begin{cases} ${rowsTex.join(" \\\\ ")} \\end{cases}`] });
  if (g.inconsistent) {
    steps.push({ text: "$0 = c\\ (c\\ne 0)$ гэсэн зөрчилтэй мөр гарсан тул шийдгүй" });
    return { ok: true, title: "Шугаман тэгшитгэлийн систем", problem, steps, answer: ["\\varnothing"], notes: ["Систем шийдгүй"], graph };
  }
  if (g.rank === m) {
    const vals = vs.map((_, j) => g.M[g.pivots.indexOf(j)][m]);
    return { ok: true, title: "Шугаман тэгшитгэлийн систем", problem, steps, answer: [pairTex(vs, vals.map(qTex))], graph };
  }
  // Төгсгөлгүй олон шийд: чөлөөт хувьсагчаар илэрхийлнэ
  const free = vs.filter((_, j) => !g.pivots.includes(j));
  const exprs = vs.map((v, j) => {
    if (free.includes(v)) return v;
    const r = g.M[g.pivots.indexOf(j)];
    let e = mconst(r[m]);
    free.forEach((f) => { const k = vs.indexOf(f); e = madd(e, mterm({ [f]: 1 }, neg(r[k]))); });
    return mtex(e, vs);
  });
  steps.push({ text: `Чөлөөт хувьсагч: $${free.join(",\\ ")}$ — дурын бодит тоо` });
  return {
    ok: true, title: "Шугаман тэгшитгэлийн систем", problem, steps,
    answer: [pairTex(vs, exprs), `${free.join(",\\ ")}\\in\\mathbb{R}`],
    notes: ["Төгсгөлгүй олон шийдтэй"], graph,
  };
}

function rowPoly(r: Q[], vs: string[]): MPoly {
  let p: MPoly = new Map();
  vs.forEach((v, j) => { p = madd(p, mterm({ [v]: 1 }, r[j])); });
  return p;
}
/** Хувьсагчгүй гишүүн (сул гишүүн) — "__" нэрээр 0-р зэрэгт */
function vsReduce(p: MPoly, vs: string[]): MPoly {
  let r: MPoly = new Map();
  for (const t of p.values()) if (!vs.some((v) => t.m[v])) r = madd(r, mterm({}, t.c));
  return r;
}

/** 2×2 орлуулах арга (±1 коэффициенттэй хувьсагчийг илэрхийлнэ) */
function substitution2(A: Q[][], b: Q[], vs: string[], steps: Step[]) {
  let pick: [number, number] | null = null;
  for (let i = 0; i < 2 && !pick; i++) for (let j = 1; j >= 0; j--) if (A[i][j].d === 1 && Math.abs(A[i][j].n) === 1) { pick = [i, j]; break; }
  if (!pick) for (let i = 0; i < 2 && !pick; i++) for (let j = 1; j >= 0; j--) if (!isZ(A[i][j])) { pick = [i, j]; break; }
  if (!pick) return;
  const [i, j] = pick, o = 1 - j, k = 1 - i;
  const a = A[i][j];
  // v_j = (b_i - A[i][o] v_o)/a
  const c0 = div(b[i], a), c1 = div(neg(A[i][o]), a);
  const expr = madd(mconst(c0), mscale(mvar(vs[o]), c1));
  steps.push({ text: `Орлуулах арга: ${i + 1}-р тэгшитгэлээс $${vs[j]}$-г илэрхийлбэл`, tex: [`${vs[j]} = ${mtex(expr, vs)}`] });
  // k-р тэгшитгэлд орлуулна: A[k][o] v_o + A[k][j] (c0 + c1 v_o) = b[k]
  const co = add(A[k][o], mul(A[k][j], c1)), rhs = sub(b[k], mul(A[k][j], c0));
  const lhsTex = `${A[k][o].n ? `${mtex(mterm({ [vs[o]]: 1 }, A[k][o]))}` : ""}${isZ(A[k][j]) ? "" : `${A[k][j].n < 0 ? "-" : "+"}${Math.abs(A[k][j].n) === 1 && A[k][j].d === 1 ? "" : qTex(A[k][j].n < 0 ? neg(A[k][j]) : A[k][j])}\\left(${mtex(expr, vs)}\\right)`}`;
  steps.push({ text: `${k + 1}-р тэгшитгэлд орлуулбал`, tex: [`${lhsTex.replace(/^\+/, "")} = ${qTex(b[k])}`, `${ptex([ZERO, co], vs[o])} = ${qTex(rhs)}`] });
  if (isZ(co)) return;
  const vo = div(rhs, co);
  const vj = add(c0, mul(c1, vo));
  steps.push({ tex: [`${vs[o]} = ${qTex(vo)},\\quad ${vs[j]} = ${qTex(vj)}`] });
}

function mixedSystem(polys: MPoly[], vs: string[], problem: string, graph?: string[]): Solution {
  const li = polys.findIndex((p) => mtotalDeg(p) <= 1);
  if (li < 0) return { ...failure(`${CANNOT}: шугаман бус системээс зөвхөн «нэг шугаман + нэг олон гишүүнт» хэлбэрийг бодно`), problem, graph };
  const L = polys[li], P = polys[1 - li];
  // L = a x + b y + c: коэффициент нь ±1 хувьсагчийг сонгоно, эс бөгөөс тэгээс ялгаатай
  const coef = (v: string) => masConst(mcoeffs(L, v)[1] ?? new Map()) ?? ZERO;
  const cands = [...vs].reverse();
  const ev = cands.find((v) => { const a = coef(v); return a.d === 1 && Math.abs(a.n) === 1; }) ?? cands.find((v) => !isZ(coef(v)));
  if (!ev) return { ...failure(CANNOT), problem, graph };
  const ov = vs.find((v) => v !== ev)!;
  const a = coef(ev);
  // ev = -(L - a ev)/a
  const restL = msub(L, mterm({ [ev]: 1 }, a));
  const expr = mscale(restL, div(q(-1), a));
  const steps: Step[] = [];
  steps.push({ text: `Шугаман тэгшитгэлээс $${ev}$-г илэрхийлбэл`, tex: [`${ev} = ${mtex(expr, vs)}`] });
  const S = msubst(P, ev, expr);
  const up = toUni(S, ov);
  if (!up) return { ...failure(CANNOT), problem, graph };
  steps.push({ text: "Нөгөө тэгшитгэлд орлуулж эмхэтгэвэл", tex: [`${ptex(up, ov)} = 0`] });
  const r = solvePoly(up, steps, { v: ov });
  if (r.all) return { ...failure(`${CANNOT}: төгсгөлгүй олон шийдтэй`), problem, graph };
  const ec0 = masConst(mcoeffs(expr, ov)[0] ?? new Map()) ?? ZERO, ec1 = masConst(mcoeffs(expr, ov)[1] ?? new Map()) ?? ZERO;
  const pairs: { [k: string]: X }[] = [];
  const approxs: string[] = [];
  for (const root of r.roots) {
    if (!root.x) {
      const e = (ec0.n / ec0.d) + (ec1.n / ec1.d) * root.v;
      approxs.push(`\\left(${ov};\\ ${ev}\\right) \\approx \\left(${decTex(root.v, 5)};\\ ${decTex(e, 5)}\\right)`);
      continue;
    }
    const e = xadd(xq(ec0), xmul(xq(ec1), root.x));
    pairs.push({ [ov]: root.x, [ev]: e });
    steps.push({ text: `$${ov} = ${root.tex}$ үед $${ev} = ${xtex(e)}$` });
  }
  // ЯГ шалгалт
  for (const pr of pairs) {
    for (const p of polys) {
      let s: X = [];
      for (const t of p.values()) {
        let term: X = xq(t.c);
        for (const v in t.m) for (let i = 0; i < t.m[v]; i++) term = xmul(term, pr[v]);
        s = xadd(s, term);
      }
      if (!isZero(s)) return { ...failure(`${CANNOT}: шалгалтад тэнцээгүй`), problem, graph };
    }
  }
  if (pairs.length) steps.push({ text: "Хос бүрийг хоёр тэгшитгэлд орлуулахад биелж байна", tone: "ok" });
  const answer = pairs.length
    ? pairs.map((pr) => pairTex(vs, vs.map((v) => xtex(pr[v]))))
    : approxs.length ? [] : ["\\varnothing"];
  const notes = !pairs.length && !approxs.length ? ["Систем бодит шийдгүй"] : undefined;
  return { ok: true, title: "Шугаман ба шугаман бус систем", problem, steps, answer, approx: approxs.length ? approxs : undefined, notes, graph };
}

export type { Node };
