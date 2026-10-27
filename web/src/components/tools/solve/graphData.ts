/* ============================================================================
 * Жижиг графикийн тооцоо (react-гүй): x-ийн функцуудыг сонгож, харагдах
 * мужийг тэг/огтлолцлын цэгээс хамааруулан автоматаар тогтооно.
 * ========================================================================== */

import { parse, parseRelation, compile, freeSymbols, type Fn } from "../core/expr.ts";
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

/** x, y-тэй харьцаа (x^2+y^2=25, y>x^2) → F(x,y) = зүүн - баруун; биш бол null */
function implicitOf(src: string): Fn | null {
  if (!/[=<>]/.test(src)) return null;
  try {
    const r = parseRelation(src);
    if (!r) return null;
    const vs = new Set([...freeSymbols(r.lhs), ...freeSymbols(r.rhs)]);
    if (!vs.has("y") || ![...vs].every((v) => v === "x" || v === "y")) return null;
    const l = compile(r.lhs), rr = compile(r.rhs);
    return (sc) => l(sc) - rr(sc);
  } catch {
    return null;
  }
}

/** Далд муруй: марширлах дөрвөлжин (marching squares) — F = 0 шугам */
function implicitData(F: Fn, W: number, H: number, PAD: number): GraphData | null {
  const f = (x: number, y: number) => {
    const v = F({ x, y });
    return Number.isFinite(v) ? v : NaN;
  };
  // Муруйн хүрээг том торонд олж харагдах мужийг тохируулна
  const scan = (R: number, n: number) => {
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    const st = (2 * R) / n;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      const x = -R + i * st, y = -R + j * st;
      const a = f(x, y), b = f(x + st, y), c = f(x, y + st);
      if ((a <= 0 && b >= 0) || (a >= 0 && b <= 0) || (a <= 0 && c >= 0) || (a >= 0 && c <= 0)) {
        if (!Number.isFinite(a + b + c)) continue;
        x0 = Math.min(x0, x); x1 = Math.max(x1, x + st); y0 = Math.min(y0, y); y1 = Math.max(y1, y + st);
      }
    }
    return Number.isFinite(x0) ? { x0, x1, y0, y1 } : null;
  };
  let box = scan(20, 160) ?? scan(100, 200);
  if (!box) return null;
  // Төгсгөлгүй муруй (парабол, гипербол): эх цэгийн орчмыг харуулна
  if (box.x1 - box.x0 > 30 || box.y1 - box.y0 > 30) {
    box = { x0: Math.max(box.x0, -5), x1: Math.min(box.x1, 5), y0: Math.max(box.y0, -5), y1: Math.min(box.y1, 5) };
    if (box.x0 >= box.x1 || box.y0 >= box.y1) box = { x0: -5, x1: 5, y0: -5, y1: 5 };
  }
  const aspect = (W - 2 * PAD) / (H - 2 * PAD);
  let cx = (box.x0 + box.x1) / 2, cy = (box.y0 + box.y1) / 2;
  let hw = Math.max(2, ((box.x1 - box.x0) / 2) * 1.3), hh = Math.max(2, ((box.y1 - box.y0) / 2) * 1.3);
  // эх цэг ойр бол багтаана
  if (Math.abs(cx) < hw * 1.5) { hw = Math.max(hw, Math.abs(cx) + hw * 0.6); cx = cx * 0.5; }
  if (Math.abs(cy) < hh * 1.5) { hh = Math.max(hh, Math.abs(cy) + hh * 0.6); cy = cy * 0.5; }
  if (hw / hh < aspect) hw = hh * aspect; else hh = hw / aspect;
  const lo = cx - hw, hi = cx + hw, ylo = cy - hh, yhi = cy + hh;
  const X = (v: number) => PAD + ((v - lo) / (hi - lo)) * (W - 2 * PAD);
  const Y = (v: number) => H - PAD - ((v - ylo) / (yhi - ylo)) * (H - 2 * PAD);
  const nx = 150, ny = Math.round(nx / aspect);
  const sx = (hi - lo) / nx, sy = (yhi - ylo) / ny;
  const g: number[][] = [];
  for (let i = 0; i <= nx; i++) { g.push([]); for (let j = 0; j <= ny; j++) g[i].push(f(lo + i * sx, ylo + j * sy)); }
  let d = "";
  const P = (x: number, y: number) => `${X(x).toFixed(1)},${Y(y).toFixed(1)}`;
  for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) {
    const v = [g[i][j], g[i + 1][j], g[i + 1][j + 1], g[i][j + 1]];
    if (v.some((t) => !Number.isFinite(t))) continue;
    const x = lo + i * sx, y = ylo + j * sy;
    const corners: [number, number][] = [[x, y], [x + sx, y], [x + sx, y + sy], [x, y + sy]];
    const pts: [number, number][] = [];
    for (let e = 0; e < 4; e++) {
      const a = v[e], b = v[(e + 1) % 4];
      if ((a < 0) !== (b < 0)) {
        const t = a / (a - b);
        // үсрэлтийг (1/x мэт) муруй гэж үзэхгүй
        if (Math.abs(a) + Math.abs(b) > 1e3 * (sx + sy) * (1 + Math.abs(a - b))) continue;
        const [p, q] = [corners[e], corners[(e + 1) % 4]];
        pts.push([p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]);
      }
    }
    if (pts.length >= 2) d += `M${P(...pts[0])}L${P(...pts[1])}`;
    if (pts.length === 4) d += `M${P(...pts[2])}L${P(...pts[3])}`;
  }
  if (!d) return null;
  return { paths: [d], points: [], xTicks: ticks(lo, hi, 6), yTicks: ticks(ylo, yhi, 4), X, Y };
}

export function graphData(exprs: string[], W: number, H: number, PAD: number): GraphData | null {
  if (exprs.length === 1) {
    const F = implicitOf(prepare(exprs[0]));
    if (F) return implicitData(F, W, H, PAD);
  }
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
