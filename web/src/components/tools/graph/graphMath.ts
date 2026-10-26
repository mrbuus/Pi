/* ============================================================================
 * График хэрэгслийн ЦЭВЭР логик (react-гүй): оролтын ангилал, дээжлэлт,
 * далд тэгшитгэлийн контур (marching squares), тэнцэтгэл бишийн муж,
 * тэг/экстремум/огтлолцол олох. node --test-ээр шалгагдана.
 * ========================================================================== */
import {
  ParseError,
  compile,
  freeSymbols,
  normalizeInput,
  parse,
  parseRelation,
  relationLatex,
  toLatex,
  type Fn,
  type Node,
  type RelOp,
  type Scope,
} from "../core/expr.ts";

/* ---------- Ангилал ---------- */

export type Item =
  | { kind: "empty" }
  | { kind: "error"; message: string }
  | { kind: "fn"; f: Fn; params: string[]; tex: string }
  | { kind: "vline"; c: Fn; params: string[]; tex: string }
  | { kind: "implicit"; F: Fn; params: string[]; tex: string }
  | { kind: "ineq"; F: Fn; op: RelOp; params: string[]; tex: string }
  | { kind: "point"; px: Fn; py: Fn; params: string[]; tex: string };

const isSym = (n: Node, name: string) => n.t === "sym" && n.n === name;
const has = (n: Node, s: string) => freeSymbols(n).has(s);
const paramsOf = (...nodes: Node[]): string[] => {
  const set = new Set<string>();
  nodes.forEach((n) => freeSymbols(n, set));
  set.delete("x");
  set.delete("y");
  return [...set].sort();
};

/** «(2;3)» эсвэл «(1,5; -2)» хэлбэрийн цэг: хаалтын гаднах нэг л таслал/цэгтүү таслал */
function splitPoint(src: string): [string, string] | null {
  const s = normalizeInput(src).trim().replace(/;/g, ";");
  if (!s.startsWith("(") || !s.endsWith(")")) return null;
  // «;» байвал тусгаарлагч нь зөвхөн «;», таслал нь аравтын тэмдэг (1,5)
  const semi = s.includes(";");
  const sep = semi ? ";" : ",";
  let depth = 0;
  let cut = -1;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c === "(" || c === "[" || c === "{") depth++;
    else if (c === ")" || c === "]" || c === "}") {
      depth--;
      if (depth === 0 && i !== s.length - 1) return null; // (a)+(b) гэх мэт
    } else if (c === sep && depth === 1) {
      if (cut >= 0) return null;
      cut = i;
    }
  }
  if (cut < 0 || depth !== 0) return null;
  const fix = (t: string) => (semi ? t.replace(/(\d),(\d)/g, "$1.$2") : t);
  return [fix(s.slice(1, cut)), fix(s.slice(cut + 1, s.length - 1))];
}

export function analyze(src: string, degrees = false): Item {
  const opts = { degrees };
  if (!src.trim()) return { kind: "empty" };
  try {
    // Цэг
    const pt = splitPoint(src);
    if (pt) {
      const a = parse(pt[0]);
      const b = parse(pt[1]);
      if (!has(a, "x") && !has(a, "y") && !has(b, "x") && !has(b, "y")) {
        return {
          kind: "point",
          px: compile(a, opts),
          py: compile(b, opts),
          params: paramsOf(a, b),
          tex: `\\left(${toLatex(a)};\\ ${toLatex(b)}\\right)`,
        };
      }
    }
    // f(x)= угтварыг авч хаяна
    const stripped = normalizeInput(src).replace(/^\s*[a-zA-Z]\s*\(\s*x\s*\)\s*=/, "y=");
    const rel = parseRelation(stripped);
    if (!rel) {
      const node = parse(stripped);
      const syms = freeSymbols(node);
      if (syms.has("y")) {
        return { kind: "implicit", F: compile(node, opts), params: paramsOf(node), tex: `${toLatex(node)}=0` };
      }
      return { kind: "fn", f: compile(node, opts), params: paramsOf(node), tex: `y=${toLatex(node)}` };
    }
    const { lhs, op, rhs } = rel;
    if (op === "=") {
      if (isSym(lhs, "y") && !has(rhs, "y"))
        return { kind: "fn", f: compile(rhs, opts), params: paramsOf(rhs), tex: `y=${toLatex(rhs)}` };
      if (isSym(rhs, "y") && !has(lhs, "y"))
        return { kind: "fn", f: compile(lhs, opts), params: paramsOf(lhs), tex: `y=${toLatex(lhs)}` };
      if (isSym(lhs, "x") && !has(rhs, "x") && !has(rhs, "y"))
        return { kind: "vline", c: compile(rhs, opts), params: paramsOf(rhs), tex: `x=${toLatex(rhs)}` };
      if (isSym(rhs, "x") && !has(lhs, "x") && !has(lhs, "y"))
        return { kind: "vline", c: compile(lhs, opts), params: paramsOf(lhs), tex: `x=${toLatex(lhs)}` };
    }
    const diff: Node = { t: "sub", a: lhs, b: rhs };
    const F = compile(diff, opts);
    const params = paramsOf(lhs, rhs);
    if (op === "=") return { kind: "implicit", F, params, tex: relationLatex(rel) };
    return { kind: "ineq", F, op, params, tex: relationLatex(rel) };
  } catch (e) {
    if (e instanceof ParseError) return { kind: "error", message: e.message };
    return { kind: "error", message: "Илэрхийллийг ойлгосонгүй" };
  }
}

/* ---------- Харагдац ---------- */

export interface View {
  cx: number; // төвийн x
  cy: number; // төвийн y
  sx: number; // px / нэгж (x)
  sy: number; // px / нэгж (y)
  w: number; // зургийн өргөн, px
  h: number;
}

export const xOf = (v: View, px: number) => v.cx + (px - v.w / 2) / v.sx;
export const yOf = (v: View, py: number) => v.cy - (py - v.h / 2) / v.sy;
export const pxOf = (v: View, x: number) => v.w / 2 + (x - v.cx) * v.sx;
export const pyOf = (v: View, y: number) => v.h / 2 - (y - v.cy) * v.sy;

export function xRange(v: View): [number, number] {
  return [xOf(v, 0), xOf(v, v.w)];
}
export function yRange(v: View): [number, number] {
  return [yOf(v, v.h), yOf(v, 0)];
}

/** (px,py) цэгийн доорх координатыг тогтоосон хэвээр factor-оор томруулна */
export function zoomAbout(v: View, px: number, py: number, fx: number, fy = fx): View {
  const x = xOf(v, px);
  const y = yOf(v, py);
  const sx = clamp(v.sx * fx, 1e-6, 1e9);
  const sy = clamp(v.sy * fy, 1e-6, 1e9);
  return { ...v, sx, sy, cx: x - (px - v.w / 2) / sx, cy: y + (py - v.h / 2) / sy };
}

export const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

/** [xmin,xmax,ymin,ymax]-аас харагдац */
export function viewFromRange(xmin: number, xmax: number, ymin: number, ymax: number, w: number, h: number): View {
  return { cx: (xmin + xmax) / 2, cy: (ymin + ymax) / 2, sx: w / (xmax - xmin), sy: h / (ymax - ymin), w, h };
}

/* ---------- Тэнхлэгийн шошго ---------- */

/** 1, 2, 5 × 10^k хэлбэрийн алхам; хоёр шошгоны хоорондох зай ≥ targetPx */
export function niceStep(pxPerUnit: number, targetPx = 70): number {
  const raw = targetPx / pxPerUnit;
  const p = Math.pow(10, Math.floor(Math.log10(raw)));
  const m = raw / p;
  const f = m <= 1 ? 1 : m <= 2 ? 2 : m <= 5 ? 5 : 10;
  return f * p;
}

/** π-ийн хэсгүүдээр алхам (x тэнхлэгт тригонометр): π/12 ... 10π */
export function piStep(pxPerUnit: number, targetPx = 70): number {
  const steps = [Math.PI / 12, Math.PI / 6, Math.PI / 4, Math.PI / 3, Math.PI / 2, Math.PI, 2 * Math.PI, 5 * Math.PI, 10 * Math.PI, 50 * Math.PI];
  return steps.find((s) => s * pxPerUnit >= targetPx) ?? steps[steps.length - 1];
}

export function tickValues(min: number, max: number, step: number): number[] {
  const out: number[] = [];
  const start = Math.ceil(min / step - 1e-9);
  const end = Math.floor(max / step + 1e-9);
  if (end - start > 400) return out;
  for (let k = start; k <= end; k++) out.push(k * step);
  return out;
}

export function numLabel(v: number, step: number): string {
  if (Math.abs(v) < step * 1e-6) return "0";
  const digits = Math.max(0, Math.min(8, -Math.floor(Math.log10(step) + 1e-9)));
  let s = v.toFixed(digits);
  if (s.includes(".")) s = s.replace(/0+$/, "").replace(/\.$/, "");
  if (Math.abs(v) >= 1e6 || (Math.abs(v) < 1e-4 && v !== 0)) {
    const [m, e] = v.toExponential(2).split("e");
    return `${Number(m)}e${Number(e)}`;
  }
  return s.replace("-", "−");
}

/** k·π/q мөр: «π/2», «3π/2», «−π», «2π» */
export function piLabel(v: number): string {
  const k12 = Math.round((v / Math.PI) * 12);
  if (k12 === 0) return "0";
  const g = gcdInt(Math.abs(k12), 12);
  const num = k12 / g;
  const den = 12 / g;
  const sign = num < 0 ? "−" : "";
  const a = Math.abs(num);
  const top = a === 1 ? "π" : `${a}π`;
  return den === 1 ? `${sign}${top}` : `${sign}${top}/${den}`;
}

function gcdInt(a: number, b: number): number {
  while (b) [a, b] = [b, a % b];
  return a || 1;
}

/* ---------- Функцийн дээжлэлт ---------- */

const r1 = (n: number) => Math.round(n * 10) / 10;

/** y=f(x) муруйн SVG зам. Тасралт (асимптот), хязгааргүйг салгаж зурна */
export function fnPath(f: Fn, scope: Scope, v: View): string {
  const [xa, xb] = xRange(v);
  const n = Math.max(40, Math.ceil(v.w * 1.5));
  const h = v.h;
  const lim = 6 * h;
  let d = "";
  let pen = false;
  let lastPy = 0;
  for (let i = 0; i <= n; i++) {
    const x = xa + ((xb - xa) * i) / n;
    scope.x = x;
    const y = f(scope);
    if (!Number.isFinite(y)) {
      pen = false;
      continue;
    }
    let py = pyOf(v, y);
    const px = (i / n) * v.w;
    if (pen && Math.abs(py - lastPy) > 3 * h) {
      // асимптотыг дамжих үсрэлт: зам таслах
      pen = false;
    }
    lastPy = py;
    py = clamp(py, -lim, h + lim);
    d += `${pen ? "L" : "M"}${r1(px)} ${r1(py)}`;
    pen = true;
  }
  return d;
}

/* ---------- Далд тэгшитгэл (marching squares) ---------- */

export interface Grid {
  nx: number;
  ny: number;
  cell: number;
  vals: Float64Array;
}

export function sampleGrid(F: Fn, scope: Scope, v: View, maxCells = 60000, minCell = 4): Grid {
  const cell = Math.max(minCell, Math.sqrt((v.w * v.h) / maxCells));
  const nx = Math.ceil(v.w / cell) + 1;
  const ny = Math.ceil(v.h / cell) + 1;
  const vals = new Float64Array(nx * ny);
  for (let j = 0; j < ny; j++) {
    scope.y = yOf(v, j * cell);
    for (let i = 0; i < nx; i++) {
      scope.x = xOf(v, i * cell);
      vals[j * nx + i] = F(scope);
    }
  }
  return { nx, ny, cell, vals };
}

// Кэшийн нүдний сегментүүд: [ирмэг, ирмэг]; ирмэг 0=дээд 1=баруун 2=доод 3=зүүн
const SEG: number[][][] = [
  [], [[3, 2]], [[1, 2]], [[3, 1]], [[0, 1]], [], [[0, 2]], [[3, 0]],
  [[3, 0]], [[0, 2]], [], [[0, 1]], [[3, 1]], [[1, 2]], [[3, 2]], [],
];

/** F=0 контурын SVG зам */
export function contourPath(g: Grid): string {
  const { nx, ny, cell, vals } = g;
  let d = "";
  for (let j = 0; j < ny - 1; j++) {
    for (let i = 0; i < nx - 1; i++) {
      const a = vals[j * nx + i]; // зүүн дээд
      const b = vals[j * nx + i + 1]; // баруун дээд
      const c = vals[(j + 1) * nx + i + 1]; // баруун доод
      const e = vals[(j + 1) * nx + i]; // зүүн доод
      if (!(Number.isFinite(a) && Number.isFinite(b) && Number.isFinite(c) && Number.isFinite(e))) continue;
      const idx = (a > 0 ? 8 : 0) | (b > 0 ? 4 : 0) | (c > 0 ? 2 : 0) | (e > 0 ? 1 : 0);
      if (idx === 0 || idx === 15) continue;
      // Хэт том үсрэлт (асимптот): гарцыг зурахгүй
      const big = Math.max(Math.abs(a), Math.abs(b), Math.abs(c), Math.abs(e));
      const small = Math.min(Math.abs(a), Math.abs(b), Math.abs(c), Math.abs(e));
      if (big > 1e6 && small > 1e3) continue;
      let segs = SEG[idx];
      if (idx === 5 || idx === 10) {
        const mid = (a + b + c + e) / 4 > 0;
        if (idx === 5) segs = mid ? [[3, 0], [1, 2]] : [[0, 1], [3, 2]];
        else segs = mid ? [[0, 1], [3, 2]] : [[3, 0], [1, 2]];
      }
      const x0 = i * cell;
      const y0 = j * cell;
      const pt = (edge: number): [number, number] => {
        const t = (p: number, q: number) => (p === q ? 0.5 : clamp(p / (p - q), 0, 1));
        switch (edge) {
          case 0: return [x0 + t(a, b) * cell, y0];
          case 1: return [x0 + cell, y0 + t(b, c) * cell];
          case 2: return [x0 + t(e, c) * cell, y0 + cell];
          default: return [x0, y0 + t(a, e) * cell];
        }
      };
      for (const [p, q] of segs) {
        const [x1, y1] = pt(p);
        const [x2, y2] = pt(q);
        d += `M${r1(x1)} ${r1(y1)}L${r1(x2)} ${r1(y2)}`;
      }
    }
  }
  return d;
}

/** Тэнцэтгэл бишийн мужийн хэвтээ нүднүүдийг нийлүүлсэн тэгш өнцөгтүүдийн зам */
export function regionPath(g: Grid, op: RelOp): string {
  const { nx, ny, cell, vals } = g;
  const want = op === ">" || op === ">=" ? 1 : -1;
  let d = "";
  for (let j = 0; j < ny - 1; j++) {
    let start = -1;
    for (let i = 0; i <= nx - 1; i++) {
      let inside = false;
      if (i < nx - 1) {
        const a = vals[j * nx + i];
        const b = vals[j * nx + i + 1];
        const c = vals[(j + 1) * nx + i + 1];
        const e = vals[(j + 1) * nx + i];
        if (Number.isFinite(a) && Number.isFinite(b) && Number.isFinite(c) && Number.isFinite(e)) {
          const m = (a + b + c + e) / 4;
          inside = want > 0 ? m > 0 : m < 0;
        }
      }
      if (inside && start < 0) start = i;
      if (!inside && start >= 0) {
        d += `M${r1(start * cell)} ${r1(j * cell)}h${r1((i - start) * cell)}v${r1(cell)}h${r1(-(i - start) * cell)}z`;
        start = -1;
      }
    }
  }
  return d;
}

/* ---------- Онцгой цэгүүд ---------- */

export type SpecialKind = "zero" | "yint" | "max" | "min" | "cross";
export interface Special {
  kind: SpecialKind;
  x: number;
  y: number;
  /** цэг аль мөрнөөс гарсан (cross бол эхний мөр) */
  line: number;
  other?: number;
}

function sample(f: Fn, scope: Scope, a: number, b: number, n: number) {
  const xs = new Float64Array(n + 1);
  const ys = new Float64Array(n + 1);
  for (let i = 0; i <= n; i++) {
    const x = a + ((b - a) * i) / n;
    scope.x = x;
    xs[i] = x;
    ys[i] = f(scope);
  }
  return { xs, ys };
}

export function findRoots(f: Fn, scope: Scope, a: number, b: number, n = 800): number[] {
  const { xs, ys } = sample(f, scope, a, b, n);
  const out: number[] = [];
  const add = (x: number) => {
    if (!out.some((r) => Math.abs(r - x) < (b - a) * 1e-6)) out.push(x);
  };
  for (let i = 0; i < n; i++) {
    const y0 = ys[i];
    const y1 = ys[i + 1];
    if (!Number.isFinite(y0) || !Number.isFinite(y1)) continue;
    if (y0 === 0) {
      add(xs[i]);
      continue;
    }
    if (y0 * y1 < 0) {
      let lo = xs[i];
      let hi = xs[i + 1];
      let flo = y0;
      for (let k = 0; k < 70; k++) {
        const mid = (lo + hi) / 2;
        scope.x = mid;
        const fm = f(scope);
        if (!Number.isFinite(fm)) break;
        if (fm === 0) { lo = hi = mid; break; }
        if (flo * fm < 0) hi = mid;
        else { lo = mid; flo = fm; }
      }
      const r = (lo + hi) / 2;
      scope.x = r;
      const fr = f(scope);
      if (Number.isFinite(fr) && Math.abs(fr) < 1e-6) add(r);
    }
  }
  if (Number.isFinite(ys[n]) && ys[n] === 0) add(xs[n]);
  // Давхар язгуур (шүргэх): экстремум дээр функц ~0
  for (const e of findExtrema(f, scope, a, b, n)) if (Math.abs(e.y) < 1e-7) add(e.x);
  return out.sort((p, q) => p - q);
}

export function findExtrema(f: Fn, scope: Scope, a: number, b: number, n = 800): { x: number; y: number; max: boolean }[] {
  const { xs, ys } = sample(f, scope, a, b, n);
  const diffs: number[] = [];
  for (let i = 1; i <= n; i++) {
    const d = ys[i] - ys[i - 1];
    if (Number.isFinite(d)) diffs.push(Math.abs(d));
  }
  if (diffs.length < 10) return [];
  diffs.sort((p, q) => p - q);
  const med = diffs[Math.floor(diffs.length / 2)];
  if (diffs[diffs.length - 1] < 1e-12) return []; // тогтмол
  const scale = Math.max(...Array.from(ys).filter(Number.isFinite).map(Math.abs), 1);
  const out: { x: number; y: number; max: boolean }[] = [];
  for (let i = 1; i < n; i++) {
    const y0 = ys[i - 1];
    const y1 = ys[i];
    const y2 = ys[i + 1];
    if (!(Number.isFinite(y0) && Number.isFinite(y1) && Number.isFinite(y2))) continue;
    const d0 = y1 - y0;
    const d1 = y2 - y1;
    const isMax = d0 > 0 && d1 < 0;
    const isMin = d0 < 0 && d1 > 0;
    if (!isMax && !isMin) continue;
    if (Math.max(Math.abs(d0), Math.abs(d1)) > 30 * med + 1e-9 * scale) continue;
    // алтан огтлолоор нарийвчлах
    let lo = xs[i - 1];
    let hi = xs[i + 1];
    const sign = isMax ? -1 : 1;
    const g = (x: number) => {
      scope.x = x;
      return sign * f(scope);
    };
    const phi = (Math.sqrt(5) - 1) / 2;
    let c = hi - phi * (hi - lo);
    let e = lo + phi * (hi - lo);
    let gc = g(c);
    let ge = g(e);
    for (let k = 0; k < 80; k++) {
      if (gc < ge) {
        hi = e; e = c; ge = gc; c = hi - phi * (hi - lo); gc = g(c);
      } else {
        lo = c; c = e; gc = ge; e = lo + phi * (hi - lo); ge = g(e);
      }
    }
    const x = (lo + hi) / 2;
    scope.x = x;
    const y = f(scope);
    if (!Number.isFinite(y)) continue;
    if (!out.some((o) => Math.abs(o.x - x) < (b - a) * 1e-5)) out.push({ x, y, max: isMax });
  }
  return out;
}

export interface FnLine {
  idx: number;
  f: Fn;
  scope: Scope;
}

/** Харагдаж буй x-хүрээнд: тэг, y-огтлол, экстремум, функц хоорондын огтлолцол */
export function specialPoints(lines: FnLine[], a: number, b: number, cap = 60): Special[] {
  const out: Special[] = [];
  for (const ln of lines) {
    for (const x of findRoots(ln.f, ln.scope, a, b)) out.push({ kind: "zero", x, y: 0, line: ln.idx });
    ln.scope.x = 0;
    const y0 = ln.f(ln.scope);
    if (a <= 0 && b >= 0 && Number.isFinite(y0)) out.push({ kind: "yint", x: 0, y: y0, line: ln.idx });
    for (const e of findExtrema(ln.f, ln.scope, a, b)) out.push({ kind: e.max ? "max" : "min", x: e.x, y: e.y, line: ln.idx });
    if (out.length > cap) break;
  }
  for (let i = 0; i < lines.length; i++) {
    for (let j = i + 1; j < lines.length; j++) {
      const p = lines[i];
      const q = lines[j];
      const scope = { ...p.scope };
      const diff: Fn = (s) => {
        const sq = { ...q.scope, x: s.x };
        return p.f(s) - q.f(sq);
      };
      for (const x of findRoots(diff, scope, a, b, 600)) {
        scope.x = x;
        const y = p.f(scope);
        if (Number.isFinite(y)) out.push({ kind: "cross", x, y, line: p.idx, other: q.idx });
      }
      if (out.length > cap) break;
    }
  }
  return out.slice(0, cap);
}

/** Тоо ба нэр: тэгийн бүрэн чөлөөт цэгийн (x ; y) LaTeX */
export function pairTex(x: string, y: string) {
  return `\\left(${x};\\ ${y}\\right)`;
}

/** Утгын хүснэгт */
export function valueTable(f: Fn, scope: Scope, start: number, step: number, rows = 9): { x: number; y: number }[] {
  const out: { x: number; y: number }[] = [];
  for (let i = 0; i < rows; i++) {
    const x = Math.round((start + i * step) * 1e9) / 1e9;
    scope.x = x;
    out.push({ x, y: f(scope) });
  }
  return out;
}

/* ---------- Шүргэгч ба талбай ---------- */

/** f'(x) — төв ялгавар (тоон) */
export function derivAt(f: Fn, scope: Scope, x: number): number {
  const h = 1e-5 * Math.max(1, Math.abs(x));
  scope.x = x + h;
  const a = f(scope);
  scope.x = x - h;
  const b = f(scope);
  return (a - b) / (2 * h);
}

/** ∫_a^b f dx — Симпсон (тасралттай бол NaN) */
export function simpson(f: Fn, scope: Scope, a: number, b: number, n = 2000): number {
  if (a === b) return 0;
  if (n % 2) n++;
  const h = (b - a) / n;
  let s = 0;
  for (let i = 0; i <= n; i++) {
    scope.x = a + i * h;
    const y = f(scope);
    if (!Number.isFinite(y)) return NaN;
    s += y * (i === 0 || i === n ? 1 : i % 2 ? 4 : 2);
  }
  return (s * h) / 3;
}

/** Муруй ба x тэнхлэгийн хоорондох мужийн SVG зам [a; b] */
export function areaPath(f: Fn, scope: Scope, v: View, a: number, b: number): string {
  const lo = Math.min(a, b);
  const hi = Math.max(a, b);
  const n = Math.max(20, Math.min(600, Math.ceil(Math.abs(pxOf(v, hi) - pxOf(v, lo)))));
  const y0 = pyOf(v, 0);
  let d = `M${r1(pxOf(v, lo))} ${r1(y0)}`;
  for (let i = 0; i <= n; i++) {
    const x = lo + ((hi - lo) * i) / n;
    scope.x = x;
    const y = f(scope);
    if (!Number.isFinite(y)) continue;
    d += `L${r1(pxOf(v, x))} ${r1(clamp(pyOf(v, y), -5 * v.h, 6 * v.h))}`;
  }
  return `${d}L${r1(pxOf(v, hi))} ${r1(y0)}Z`;
}
