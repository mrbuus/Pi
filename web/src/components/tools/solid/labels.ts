/* ============================================================================
 * Зургийн шошгыг давхцалгүй байрлуулах (React-гүй, цэвэр функц).
 *
 * Шошго бүрд «дуртай» чиглэл бий: оройн нэр — биетийн проекцлогдсон төвөөс
 * орой руу (гадагш), ирмэгийн хэмжээс — ирмэгт перпендикуляр гадагш.
 * Тэр чиглэлийн эргэн тойронд хэд хэдэн байрлал туршиж, «торгууль» хамгийн
 * бага байрлалыг сонгоно:
 *   - өөр шошготой давхцах        (маш их)
 *   - шугам (ирмэг) хайрцгийг дайрах (их)
 *   - өөр оройн цэгийг халхлах    (их)
 *   - зургийн хүрээнээс гарах     (маш их)
 *   - дуртай чиглэлээс хазайх      (бага)
 * Эргүүлэх үед чичрэхгүйн тулд өмнөх кадрын сонголтод бага зэрэг урамшуулал
 * өгнө (hysteresis) — ойролцоо хоёр байрлал ээлжлэн солигдохгүй.
 * ========================================================================== */

export type P2 = [number, number];

export interface LabelReq {
  key: string;
  /** Шошго хамаарах цэг (орой, ирмэгийн дунд) */
  anchor: P2;
  /** Дуртай чиглэл (нэгж эсвэл тэг) */
  dir: P2;
  text: string;
  size: number;
  /** Ирмэгийн шошго: ирмэгийн чиглэл ба дэлгэцэн дээрх урт (дагуу нь шилжүүлж болно) */
  along?: P2;
  alongLen?: number;
  /** Зөвхөн дуртай тал руу (ирмэгийн эсрэг талд гаргахгүй) */
  oneSide?: boolean;
}

export interface Seg2 {
  a: P2;
  b: P2;
  /** Торгуулийн жин (харагдах ирмэг 1, нуугдсан 0.6 г.м.) */
  w?: number;
}

export interface PlacedLabel extends LabelReq {
  x: number;
  y: number;
  w: number;
  h: number;
}

type Box = { x0: number; y0: number; x1: number; y1: number };

/** Шошгоны хайрцгийн ойролцоо хэмжээ (serif налуу, доод индекс жижиг) */
export function textBox(text: string, size: number): { w: number; h: number } {
  let s = text.replace(/\\(alpha|beta|gamma|varphi|phi|theta|pi)/g, "x").replace(/\\sqrt\{([^}]*)\}/g, "v$1").replace(/\^\\circ|\^\{\\circ\}/g, "o");
  let sub = "";
  const m = /^(.*?)_\{?([^}]*)\}?$/.exec(s);
  if (m) {
    s = m[1];
    sub = m[2];
  }
  const w = size * (0.6 * s.length + 0.45 * sub.length) + 2;
  const h = size * (sub ? 1.2 : 1.0);
  return { w, h };
}

function rot(v: P2, deg: number): P2 {
  const r = (deg * Math.PI) / 180;
  const c = Math.cos(r), s = Math.sin(r);
  return [v[0] * c - v[1] * s, v[0] * s + v[1] * c];
}

/** Хэрчим тэгш өнцөгтийг дайрах эсэх (Лян-Барски) */
export function segHitsBox(a: P2, b: P2, bx: Box): boolean {
  let t0 = 0, t1 = 1;
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const p = [-dx, dx, -dy, dy];
  const q = [a[0] - bx.x0, bx.x1 - a[0], a[1] - bx.y0, bx.y1 - a[1]];
  for (let i = 0; i < 4; i++) {
    if (Math.abs(p[i]) < 1e-12) {
      if (q[i] < 0) return false;
    } else {
      const r = q[i] / p[i];
      if (p[i] < 0) {
        if (r > t1) return false;
        if (r > t0) t0 = r;
      } else {
        if (r < t0) return false;
        if (r < t1) t1 = r;
      }
    }
  }
  return t0 <= t1;
}

const overlap = (a: Box, b: Box) => Math.max(0, Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0)) * Math.max(0, Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0));

const VERTEX_ANGLES = [0, 25, -25, 50, -50, 75, -75, 105, -105, 135, -135, 180];
const RINGS = [0, 7, 14, 22];
const ALONG = [0, 0.18, -0.18, 0.34, -0.34];

interface Cand {
  idx: number;
  cx: number;
  cy: number;
  base: number;
}

/** Цэгээс d чиглэлд, хайрцаг тэр цэгийг халхлахгүй хамгийн ойр зай */
function clearDist(d: P2, hw: number, hh: number, gap: number): number {
  const ax = Math.abs(d[0]), ay = Math.abs(d[1]);
  const tx = ax > 1e-9 ? hw / ax : Infinity;
  const ty = ay > 1e-9 ? hh / ay : Infinity;
  return Math.min(tx, ty) + gap;
}

function candidates(r: LabelReq, w: number, h: number): Cand[] {
  const hw = w / 2, hh = h / 2;
  let dir = r.dir;
  const l = Math.hypot(dir[0], dir[1]);
  dir = l < 1e-9 ? [0, -1] : [dir[0] / l, dir[1] / l];
  const out: Cand[] = [];
  if (r.along && r.alongLen !== undefined) {
    const al = Math.hypot(r.along[0], r.along[1]) || 1;
    const t: P2 = [r.along[0] / al, r.along[1] / al];
    const sides = r.oneSide ? [1] : [1, -1];
    let idx = 0;
    for (const side of sides) {
      const n: P2 = [dir[0] * side, dir[1] * side];
      for (const [ai, s] of ALONG.entries()) {
        for (const [ri, ring] of RINGS.slice(0, 3).entries()) {
          const shift = s * r.alongLen;
          const base = r.anchor;
          const px = base[0] + t[0] * shift, py = base[1] + t[1] * shift;
          // ирмэгийн шугамаас хайрцаг бүхэлдээ зайтай (налуу ирмэгт ч өөрийгөө дайрахгүй)
          const dd = hw * Math.abs(n[0]) + hh * Math.abs(n[1]) + 3 + ring;
          out.push({ idx: idx++, cx: px + n[0] * dd, cy: py + n[1] * dd, base: (side < 0 ? 2.5 : 0) + ai * 0.35 + ri * 0.6 });
        }
      }
    }
    return out;
  }
  let idx = 0;
  for (const deg of VERTEX_ANGLES) {
    const d = rot(dir, deg);
    for (const [ri, ring] of RINGS.entries()) {
      const dd = clearDist(d, hw, hh, 3) + ring;
      out.push({ idx: idx++, cx: r.anchor[0] + d[0] * dd, cy: r.anchor[1] + d[1] * dd, base: Math.abs(deg) * 0.018 + ri * 0.5 });
    }
  }
  return out;
}

/**
 * Шошгуудыг эрэмбээр нь (эхнийх нь илүү чухал) байрлуулна.
 * segs — саад болох шугамууд, dots — халхлахгүй байх цэгүүд (оройнууд),
 * W×H — зургийн хэмжээ, memory — өмнөх кадрын сонголт (чичрэхгүй).
 */
export function layoutLabels(
  reqs: LabelReq[],
  segs: Seg2[],
  dots: P2[],
  W: number,
  H: number,
  memory?: Map<string, number>,
): PlacedLabel[] {
  const placed: PlacedLabel[] = [];
  const boxes: Box[] = [];
  for (const r of reqs) {
    const { w, h } = textBox(r.text, r.size);
    let best: Cand | null = null;
    let bestCost = Infinity;
    const prev = memory?.get(r.key);
    for (const c of candidates(r, w, h)) {
      const bx: Box = { x0: c.cx - w / 2, y0: c.cy - h / 2, x1: c.cx + w / 2, y1: c.cy + h / 2 };
      let cost = c.base;
      if (bx.x0 < 2 || bx.y0 < 2 || bx.x1 > W - 2 || bx.y1 > H - 2) cost += 30;
      const pad: Box = { x0: bx.x0 - 1.5, y0: bx.y0 - 1.5, x1: bx.x1 + 1.5, y1: bx.y1 + 1.5 };
      for (const s of segs) if (segHitsBox(s.a, s.b, pad)) cost += 6 * (s.w ?? 1);
      for (const d of dots) {
        if (d[0] === r.anchor[0] && d[1] === r.anchor[1]) continue;
        if (d[0] > pad.x0 - 2 && d[0] < pad.x1 + 2 && d[1] > pad.y0 - 2 && d[1] < pad.y1 + 2) cost += 8;
      }
      for (const b of boxes) {
        const o = overlap(pad, b);
        if (o > 0) cost += 14 + (30 * o) / Math.max(1, w * h);
      }
      if (prev === c.idx) cost -= 0.9;
      if (cost < bestCost) {
        bestCost = cost;
        best = c;
      }
    }
    if (!best) continue;
    memory?.set(r.key, best.idx);
    boxes.push({ x0: best.cx - w / 2, y0: best.cy - h / 2, x1: best.cx + w / 2, y1: best.cy + h / 2 });
    placed.push({ ...r, x: best.cx, y: best.cy, w, h });
  }
  return placed;
}

/** Хоёр хайрцаг давхцах эсэх (тестэд) */
export function labelsOverlap(a: PlacedLabel, b: PlacedLabel): boolean {
  return overlap({ x0: a.x - a.w / 2, y0: a.y - a.h / 2, x1: a.x + a.w / 2, y1: a.y + a.h / 2 }, { x0: b.x - b.w / 2, y0: b.y - b.h / 2, x1: b.x + b.w / 2, y1: b.y + b.h / 2 }) > 0;
}
