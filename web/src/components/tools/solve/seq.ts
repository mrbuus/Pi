/* ============================================================================
 * Прогресс, хослол/сэлгэмэл, магадлал — томьёогоор, ЯГ тоогоор.
 * ========================================================================== */

import { parse } from "../core/expr.ts";
import { type X, evalExact, xadd, xmul, xsub, xdiv, xpowInt, xint, xtex, asQ, approx, xeq, xsign, NotReal } from "./exact.ts";
import { type Solution, type Step, failure, decTex } from "./steps.ts";
import { bigA, bigC, bigFact, bigTex } from "./calc.ts";
import { prepare } from "./input.ts";
import { q, qTex, mul, powQ, sub, ONE, type Q, ExactFail } from "./q.ts";

function num(src: string, name: string): X {
  const s = src.trim();
  if (!s) throw new Error(`$${name}$-г оруулна уу`);
  try {
    return evalExact(parse(prepare(s)));
  } catch (e) {
    if (e instanceof NotReal) throw new Error(`$${name}$ бодит тоо биш`);
    throw new Error(`$${name}$-г тоо эсвэл бутархайгаар оруулна уу (ж: 3, -1/2, \\sqrt{2})`);
  }
}
function natural(src: string, name: string, min = 1): number {
  const x = num(src, name);
  const r = asQ(x);
  if (!r || r.d !== 1 || r.n < min) throw new Error(`$${name}$ нь ${min === 0 ? "сөрөг биш бүхэл" : "натурал"} тоо байх ёстой`);
  if (r.n > 100000) throw new Error(`$${name}$ хэт их байна`);
  return r.n;
}
const wrap = (f: () => Solution): Solution => {
  try {
    return f();
  } catch (e) {
    if (e instanceof ExactFail) return failure("Тоо хэт их тул яг утгыг гаргаж чадсангүй");
    return failure(e instanceof Error ? e.message : "Утгыг шалгана уу");
  }
};
const par = (x: X) => { const t = xtex(x); return t.startsWith("-") || /[+-]/.test(t.slice(1)) ? `\\left(${t}\\right)` : t; };
const withApprox = (x: X) => (asQ(x) ? xtex(x) : `${xtex(x)}\\approx ${decTex(approx(x), 6)}`);

export function arithmetic(a1s: string, ds: string, ns: string): Solution {
  return wrap(() => {
    const a1 = num(a1s, "a_1"), d = num(ds, "d"), n = natural(ns, "n");
    const an = xadd(a1, xmul(xint(n - 1), d));
    const Sn = xdiv(xmul(xadd(a1, an), xint(n)), xint(2));
    const steps: Step[] = [
      { text: "$n$-р гишүүний томьёо", tex: [`a_n = a_1+(n-1)d = ${xtex(a1)}+${n - 1}\\cdot ${par(d)} = ${xtex(an)}`] },
      { text: "Эхний $n$ гишүүний нийлбэр", tex: [`S_n = \\frac{(a_1+a_n)\\,n}{2} = \\frac{\\left(${xtex(a1)}+${par(an)}\\right)\\cdot ${n}}{2} = ${xtex(Sn)}`] },
    ];
    return {
      ok: true, title: "Арифметик прогресс", problem: `a_1 = ${xtex(a1)},\\ d = ${xtex(d)},\\ n = ${n}`, steps,
      answer: [`a_{${n}} = ${withApprox(an)}`, `S_{${n}} = ${withApprox(Sn)}`],
    };
  });
}

export function geometric(b1s: string, qs: string, ns: string): Solution {
  return wrap(() => {
    const b1 = num(b1s, "b_1"), qq = num(qs, "q"), n = natural(ns, "n");
    if (asQ(qq)?.n === 0) throw new Error("Хуваарь $q \\ne 0$ байх ёстой");
    if (asQ(b1)?.n === 0) throw new Error("$b_1 \\ne 0$ байх ёстой");
    if (n > 200) throw new Error("$n \\le 200$");
    const bn = xmul(b1, xpowInt(qq, n - 1));
    const steps: Step[] = [{ text: "$n$-р гишүүний томьёо", tex: [`b_n = b_1 q^{n-1} = ${par(b1)}\\cdot ${par(qq)}^{${n - 1}} = ${xtex(bn)}`] }];
    let Sn: X;
    if (xeq(qq, xint(1))) {
      Sn = xmul(b1, xint(n));
      steps.push({ text: "$q = 1$ тул $S_n = n b_1$", tex: [`S_n = ${xtex(Sn)}`] });
    } else {
      Sn = xdiv(xmul(b1, xsub(xpowInt(qq, n), xint(1))), xsub(qq, xint(1)));
      steps.push({ text: "Эхний $n$ гишүүний нийлбэр", tex: [`S_n = \\frac{b_1\\left(q^n-1\\right)}{q-1} = \\frac{${par(b1)}\\left(${par(qq)}^{${n}}-1\\right)}{${par(qq)}-1} = ${xtex(Sn)}`] });
    }
    const answer = [`b_{${n}} = ${withApprox(bn)}`, `S_{${n}} = ${withApprox(Sn)}`];
    if (Math.abs(approx(qq)) < 1) {
      const S = xdiv(b1, xsub(xint(1), qq));
      steps.push({ text: "$|q| < 1$ тул төгсгөлгүй буурах прогрессийн нийлбэр", tex: [`S = \\frac{b_1}{1-q} = ${xtex(S)}`] });
      answer.push(`S = ${withApprox(S)}`);
    }
    return { ok: true, title: "Геометр прогресс", problem: `b_1 = ${xtex(b1)},\\ q = ${xtex(qq)},\\ n = ${n}`, steps, answer };
  });
}

export function combinatorics(ns: string, ks: string): Solution {
  return wrap(() => {
    const n = natural(ns, "n", 0), k = natural(ks, "k", 0);
    if (n > 3000) throw new Error("$n \\le 3000$");
    const steps: Step[] = [];
    const answer: string[] = [];
    const t = (b: bigint) => (b.toString().length > 300 ? `\\ldots\\ (${b.toString().length}\\ \\text{орон})` : bigTex(b));
    steps.push({ text: "Сэлгэмэл (бүх элементийн байрлал)", tex: [`P_{${n}} = ${n}! = ${t(bigFact(n))}`] });
    answer.push(`P_{${n}} = ${t(bigFact(n))}`);
    if (k <= n) {
      steps.push({ text: "Байрлал (дараалал чухал)", tex: [`A_{${n}}^{${k}} = \\frac{n!}{(n-k)!} = \\frac{${n}!}{${n - k}!} = ${t(bigA(n, k))}`] });
      steps.push({ text: "Хослол (дараалал хамаагүй)", tex: [`C_{${n}}^{${k}} = \\frac{n!}{k!\\,(n-k)!} = \\frac{${n}!}{${k}!\\,${n - k}!} = ${t(bigC(n, k))}`] });
      answer.push(`A_{${n}}^{${k}} = ${t(bigA(n, k))}`, `C_{${n}}^{${k}} = ${t(bigC(n, k))}`);
    } else steps.push({ text: "$k > n$ тул давталтгүй байрлал, хослол тэгтэй тэнцүү", tone: "note" });
    if (k <= 400) {
      let rep = BigInt(1);
      for (let i = 0; i < k; i++) rep *= BigInt(n);
      steps.push({ text: "Давталттай байрлал ба хослол", tex: [`\\bar{A}_{${n}}^{${k}} = n^k = ${t(rep)}`, `\\bar{C}_{${n}}^{${k}} = C_{n+k-1}^{k} = ${t(n + k - 1 >= k ? bigC(n + k - 1, k) : BigInt(0))}`] });
    }
    return { ok: true, title: "Хослол, сэлгэмэл, байрлал", problem: `n = ${n},\\ k = ${k}`, steps, answer };
  });
}

export function classicalProbability(ms: string, ns: string): Solution {
  return wrap(() => {
    const m = natural(ms, "m", 0), n = natural(ns, "n");
    if (m > n) throw new Error("Таатай тохиолдлын тоо $m \\le n$ байх ёстой");
    const p = q(m, n);
    return {
      ok: true, title: "Сонгодог магадлал", problem: `m = ${m},\\ n = ${n}`,
      steps: [{ text: "Таатай тохиолдлын тоог бүх боломжит тохиолдлын тоонд хуваана", tex: [`P(A) = \\frac{m}{n} = \\frac{${m}}{${n}} = ${qTex(p)}`] }],
      answer: [`P(A) = ${qTex(p)}${p.d === 1 ? "" : `\\approx ${decTex(m / n, 4)}`}`],
    };
  });
}

export function bernoulli(ns: string, ks: string, ps: string): Solution {
  return wrap(() => {
    const n = natural(ns, "n"), k = natural(ks, "k", 0);
    if (k > n) throw new Error("$k \\le n$ байх ёстой");
    if (n > 60) throw new Error("$n \\le 60$");
    const px = num(ps, "p");
    const pq = asQ(px);
    if (!pq || xsign(px) < 0 || pq.n > pq.d) throw new Error("Магадлал $0 \\le p \\le 1$ рационал тоо байх ёстой (ж: 1/6, 0.3)");
    const c = Number(bigC(n, k));
    const res: Q = mul(mul(q(c), powQ(pq, k)), powQ(sub(ONE, pq), n - k));
    return {
      ok: true, title: "Бернуллийн томьёо", problem: `n = ${n},\\ k = ${k},\\ p = ${qTex(pq)}`,
      steps: [{
        text: "$n$ туршилтад үзэгдэл яг $k$ удаа илрэх магадлал",
        tex: [`P_n(k) = C_n^k p^k (1-p)^{n-k} = C_{${n}}^{${k}}\\cdot \\left(${qTex(pq)}\\right)^{${k}}\\cdot \\left(${qTex(sub(ONE, pq))}\\right)^{${n - k}} = ${qTex(res)}`],
      }],
      answer: [`P_{${n}}(${k}) = ${qTex(res)}\\approx ${decTex(res.n / res.d, 6)}`],
    };
  });
}

export { xtex };
