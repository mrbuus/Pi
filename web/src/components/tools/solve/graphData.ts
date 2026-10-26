/* ============================================================================
 * Жижиг графикийн тооцоо (react-гүй): x-ийн функцуудыг сонгож, харагдах
 * мужийг тэг/огтлолцлын цэгээс хамааруулан автоматаар тогтооно.
 * ========================================================================== */

import { parse, compile, freeSymbols, type Fn } from "../core/expr.ts";
import { prepare } from "./input.ts";

export interface GraphData {
  paths: string[];
  points: { x: number; y: number }[];
  xTicks: number[];
  yTicks: number[];
  X: (v: number) => number;
  Y: (v: number) => number;
}

/** Зөвхөн x-ийн (эсвэл тогтмол) илэрхийлэл → тооцоологч; бусад нь null */
function fnOf(src: string): Fn | null {
  if (/[=<>]/.test(src)) return null;
  try {
    const n = parse(prepare(src));
    const vs = [...freeSymbols(n)];
    if (!vs.every((v) => v === "x")) return null;
    return compile(n);
  } catch {
    return null;
  }
}

/** 1, 2, 5 × 10^k алхам */
export function niceStep(span: number, maxTicks: number): number {
  const raw = span / Math.max(1, maxTicks);
  const p = Math.pow(10, Math.floor(Math.log10(raw)));
  for (const m of [1, 2, 5, 10]) if (m * p >= raw) return m * p;
  return 10 * p;
}

function ticks(lo: number, hi: number, maxTicks: number): number[] {
  const st = niceStep(hi - lo, maxTicks);
  const out: number[] = [];
  for (let v = Math.ceil(lo / st) * st; v <= hi + 1e-9; v += st) out.push(Number(v.toFixed(10)));
  return out;
}

/** Тэмдэг солигдох цэгүүд (бисекц) */
function zeros(h: (x: number) => number, lo: number, hi: number, n: number): number[] {
  const out: number[] = [];
  let px = lo, py = h(lo);
  for (let i = 1; i <= n; i++) {
    const x = lo + ((hi - lo) * i) / n, y = h(x);
    if (Number.isFinite(py) && Number.isFinite(y)) {
      if (y === 0) out.push(x);
      else if (py * y < 0) {
        let a = px, b = x, fa = py;
        for (let k = 0; k < 50; k++) {
          const m = (a + b) / 2, fm = h(m);
          if (!Number.isFinite(fm)) break;
          if (fa * fm <= 0) b = m; else { a = m; fa = fm; }
        }
        const r = (a + b) / 2;
        // үсрэлт (1/x) биш, жинхэнэ тэг эсэх
        if (Math.abs(h(r)) < 1e-6 * (1 + Math.abs(py) + Math.abs(y))) out.push(r);
      }
    }
    px = x;
    py = y;
  }
  return out.filter((r, i) => i === 0 || Math.abs(r - out[i - 1]) > 1e-6);
}

export function graphData(exprs: string[], W: number, H: number, PAD: number): GraphData | null {
  const fns = exprs.map(fnOf).filter((f): f is Fn => !!f).slice(0, 3);
  if (!fns.length) return null;
  // ганц тогтмол бол график утгагүй
  const val = (f: Fn, x: number) => {
    const y = f({ x });
    return Number.isFinite(y) ? y : NaN;
  };
  if (fns.length === 1 && exprs.length === 1 && !/x/.test(exprs[0])) return null;

  // Тэг/огтлолцол
  const h = fns.length >= 2 ? (x: number) => val(fns[0], x) - val(fns[1], x) : (x: number) => val(fns[0], x);
  const all = zeros(h, -50, 50, 4000);
  const near = all.filter((r) => Math.abs(r) <= 20);
  let lo: number, hi: number;
  if (near.length > 6 || !near.length) {
    lo = near.length ? -7 : -6;
    hi = -lo;
  } else {
    // Сонирхолтой цэгүүд (тэг, огтлолцол) ба эх цэгийг багтаана
    const a = Math.min(0, ...near), b = Math.max(0, ...near);
    const pad = Math.max(2, (b - a) * 0.4);
    lo = Math.max(-50, a - pad);
    hi = Math.min(50, b + pad);
  }

  // y муж: 5-95 хувь
  const ys: number[] = [];
  const N = 480;
  for (const f of fns) for (let i = 0; i <= N; i++) {
    const y = val(f, lo + ((hi - lo) * i) / N);
    if (Number.isFinite(y)) ys.push(y);
  }
  if (!ys.length) return null;
  ys.sort((a, b) => a - b);
  let ylo = ys[Math.floor(ys.length * 0.04)], yhi = ys[Math.floor(ys.length * 0.96)];
  const pts = near.length <= 6 ? near.map((x) => ({ x, y: fns.length >= 2 ? val(fns[0], x) : 0 })).filter((p) => Number.isFinite(p.y)) : [];
  for (const p of pts) { ylo = Math.min(ylo, p.y); yhi = Math.max(yhi, p.y); }
  if (ylo > 0 && ylo < (yhi - ylo) * 0.6) ylo = 0;
  if (yhi < 0 && -yhi < (yhi - ylo) * 0.6) yhi = 0;
  if (yhi - ylo < 2) { const m = (yhi + ylo) / 2; ylo = m - 1; yhi = m + 1; }
  const pad = (yhi - ylo) * 0.14;
  ylo -= pad;
  yhi += pad;

  const X = (v: number) => PAD + ((v - lo) / (hi - lo)) * (W - 2 * PAD);
  const Y = (v: number) => H - PAD - ((v - ylo) / (yhi - ylo)) * (H - 2 * PAD);
  const span = yhi - ylo;
  const paths = fns.map((f) => {
    let d = "", pen = false, prev = NaN;
    const M = 600;
    for (let i = 0; i <= M; i++) {
      const x = lo + ((hi - lo) * i) / M, y = val(f, x);
      const jump = Number.isFinite(prev) && Math.abs(y - prev) > span * 1.5;
      if (!Number.isFinite(y) || jump || y < ylo - span * 3 || y > yhi + span * 3) {
        pen = false;
        prev = y;
        if (!Number.isFinite(y) || jump) continue;
        continue;
      }
      const cy = Math.min(H + 40, Math.max(-40, Y(y)));
      d += `${pen ? "L" : "M"}${X(x).toFixed(1)},${cy.toFixed(1)}`;
      pen = true;
      prev = y;
    }
    return d;
  });
  return { paths, points: pts, xTicks: ticks(lo, hi, 6), yTicks: ticks(ylo, yhi, 4), X, Y };
}
