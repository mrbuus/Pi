/* ============================================================================
 * Зургийн шошгоны давхцал зайлуулалт (цэвэр логик, React-гүй).
 *
 * Шошго бүр анкер цэг (орой, талын дунд, өнцгийн орой), илүүд үзэх чиглэл,
 * анкераас хамгийн бага зайтай. Нэр дэвшигч байрлал олныг (чиглэлийг
 * эргүүлж, зайг ихэсгэж, талын дагуу гулсуулж) үүсгээд, торгууль хамгийн
 * бага байрлалыг сонгоно:
 *   - өөр шошготой давхцах (bounding box)
 *   - зураастай (хэрчим, тойргийн хэрчмүүд, өнцгийн нум) огтлолцох
 *   - цэгийг халхлах, зургийн хүрээнээс гарах
 *   - илүүд үзсэн чиглэлээс хазайх, холдох
 * Эхлээд ач холбогдлын дарааллаар шунахайгаар тавиад, дараа нь шошго бүрийг
 * бусдынхаа эсрэг дахин байрлуулах давталт хийнэ.
 * Координат дэлгэцийнх (px, y доош). Тест: layout.test.mjs
 * ========================================================================== */

export interface Box {
  /** Төв */
  x: number;
  y: number;
  w: number;
  h: number;
}
export interface Seg {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}
export interface Disc {
  x: number;
  y: number;
  r: number;
}

export interface LabelReq {
  ax: number;
  ay: number;
  /** Илүүд үзэх чиглэл (нэгж вектор, дэлгэцийн координат) */
  dx: number;
  dy: number;
  /** Анкераас хайрцагны ирмэг хүртэлх хамгийн бага зай */
  gap: number;
  w: number;
  h: number;
  /** Бага нь түрүүлж байрлана */
  prio?: number;
  /** Чиглэлээс хазайх дээд өнцөг (радиан), анхдагч π (бүх тал) */
  spread?: number;
  /** Хазайлтын торгуулийн жин */
  bend?: number;
  /** Эсрэг тал (дотор тал) руу шилжихийг зөвшөөрөх нэмэлт торгууль */
  flipCost?: number;
  /** Анкерыг шугамын дагуу гулсуулах (нэгж чиглэл, хагас урт px) */
  slide?: { ux: number; uy: number; len: number };
  /** Нэмэлт холдуулалт (px) — жижиг өнцгийн шошгыг нумаас холдуулах */
  reach?: number[];
}

export interface Placed {
  x: number;
  y: number;
  /** Илүүд үзсэн байрлалдаа (хазайлт, гулсалтгүй) тавигдсан */
  ideal: boolean;
  /** Анкераас холдсон нэмэлт зай */
  extra: number;
}

/* ---------------- Бичвэрийн хэмжээ ---------------- */

const GREEK = /\\(alpha|beta|gamma|delta|epsilon|varphi|phi|theta|lambda|mu|pi|rho|sigma|tau|omega|Delta)/g;

/** Нэг тэмдэгтийн ойролцоо өргөн (em) — serif налуу фонт */
function charW(ch: string): number {
  if (/[0-9]/.test(ch)) return 0.5;
  if (ch === "." || ch === ",") return 0.26;
  if (ch === " ") return 0.26;
  if (ch === "=") return 0.58;
  if (/[A-Z]/.test(ch)) return 0.64;
  if (/[a-z]/.test(ch)) return 0.48;
  if (/[а-яё]/i.test(ch)) return 0.52;
  return 0.55;
}

/** SvgLabel-ийн зурах хайрцгийн ойролцоо хэмжээ (px) */
export function textSize(src: string, size: number): { w: number; h: number } {
  let s = src.replace(GREEK, "a").replace(/\\sqrt\{([^}]*)\}/g, "v$1").replace(/\\cdot/g, ".").replace(/\\,/g, " ");
  let sup = 0;
  s = s.replace(/\^\\circ|\^\{\\circ\}/g, () => {
    sup = 0.32;
    return "";
  });
  let sub = "";
  const m = /^(.*?)_\{?([^}]*)\}?$/.exec(s);
  if (m) {
    s = m[1];
    sub = m[2];
  }
  let w = 0;
  for (const ch of s) w += charW(ch);
  for (const ch of sub) w += charW(ch) * 0.68;
  w += sup;
  return { w: Math.max(0.5, w) * size + 4, h: size * (sub ? 1.25 : 1.02) + 2 };
}

/* ---------------- Геометр ---------------- */

/** Хэрчим хайрцгийг (pad-аар томруулсан) огтлох эсэх — Лян-Барски */
export function boxSegHit(b: Box, s: Seg, pad = 1): boolean {
  const x0 = b.x - b.w / 2 - pad, x1 = b.x + b.w / 2 + pad;
  const y0 = b.y - b.h / 2 - pad, y1 = b.y + b.h / 2 + pad;
  const dx = s.x2 - s.x1, dy = s.y2 - s.y1;
  let t0 = 0, t1 = 1;
  const clip = (p: number, q: number) => {
    if (Math.abs(p) < 1e-12) return q >= 0;
    const r = q / p;
    if (p < 0) {
      if (r > t1) return false;
      if (r > t0) t0 = r;
    } else {
      if (r < t0) return false;
      if (r < t1) t1 = r;
    }
    return true;
  };
  return clip(-dx, s.x1 - x0) && clip(dx, x1 - s.x1) && clip(-dy, s.y1 - y0) && clip(dy, y1 - s.y1);
}

/** Хоёр хайрцгийн давхцлын талбай (pad-тай) */
export function overlapArea(a: Box, b: Box, pad = 0): number {
  const ox = Math.min(a.x + a.w / 2, b.x + b.w / 2) - Math.max(a.x - a.w / 2, b.x - b.w / 2) + 2 * pad;
  const oy = Math.min(a.y + a.h / 2, b.y + b.h / 2) - Math.max(a.y - a.h / 2, b.y - b.h / 2) + 2 * pad;
  return ox > 0 && oy > 0 ? ox * oy : 0;
}

/** Хайрцаг ба тойргийн хоорондох зай (дотор бол 0) */
function boxDiscDist(b: Box, d: Disc): number {
  const dx = Math.max(Math.abs(d.x - b.x) - b.w / 2, 0);
  const dy = Math.max(Math.abs(d.y - b.y) - b.h / 2, 0);
  return Math.hypot(dx, dy);
}

/** Хайрцгийн ирмэг дээрх, p цэгт хамгийн ойр цэг (заагч шугамд) */
export function boxEdgePoint(b: Box, px: number, py: number): { x: number; y: number } {
  const dx = px - b.x, dy = py - b.y;
  const hw = b.w / 2, hh = b.h / 2;
  if (Math.abs(dx) < 1e-9 && Math.abs(dy) < 1e-9) return { x: b.x, y: b.y - hh };
  const k = Math.min(hw / Math.abs(dx || 1e-9), hh / Math.abs(dy || 1e-9));
  return { x: b.x + dx * Math.min(1, k), y: b.y + dy * Math.min(1, k) };
}

/** Хоёр хайрцаг давхцаж байгаа эсэх (шалгалт, тестэд) */
export function boxesOverlap(a: Box, b: Box, pad = 0): boolean {
  return overlapArea(a, b, pad) > 0;
}

/* ---------------- Байрлуулалт ---------------- */

const STEP = Math.PI / 12; // 15°
const ROT = [0, 1, -1, 2, -2, 3, -3, 4, -4, 5, -5, 6, -6, 8, -8, 10, -10, 12];
const REACH = [0, 7, 16, 28];

interface Cand {
  x: number;
  y: number;
  base: number;
  ideal: boolean;
  extra: number;
}

function candidates(r: LabelReq): Cand[] {
  const out: Cand[] = [];
  const spread = r.spread ?? Math.PI;
  const bend = r.bend ?? 1;
  const reach = r.reach ?? REACH;
  const slides = r.slide ? [0, 0.3, -0.3, 0.6, -0.6, 0.9, -0.9] : [0];
  for (const k of ROT) {
    const a = k * STEP;
    const flip = Math.abs(a) > spread + 1e-9;
    // эсрэг тал руу зөвхөн flipCost өгсөн үед, эсрэг чиглэлийн spread орчимд
    if (flip && (r.flipCost === undefined || Math.abs(a) < Math.PI - spread - 1e-9)) continue;
    const c = Math.cos(a), s = Math.sin(a);
    const ux = r.dx * c - r.dy * s, uy = r.dx * s + r.dy * c;
    const ext = Math.abs(ux) * (r.w / 2) + Math.abs(uy) * (r.h / 2);
    const dev = flip ? Math.PI - Math.abs(a) : Math.abs(a);
    for (const sl of slides) {
      const sx = r.slide ? r.slide.ux * r.slide.len * sl : 0;
      const sy = r.slide ? r.slide.uy * r.slide.len * sl : 0;
      for (const ex of reach) {
        const d = r.gap + ext + ex;
        out.push({
          x: r.ax + sx + ux * d,
          y: r.ay + sy + uy * d,
          base: bend * 1.4 * (dev / Math.PI) + ex * 0.05 + Math.abs(sl) * 0.9 + (flip ? (r.flipCost ?? 0) : 0),
          ideal: k === 0 && sl === 0 && ex === 0,
          extra: ex,
        });
      }
    }
  }
  out.sort((p, q) => p.base - q.base);
  return out;
}

function cost(b: Box, base: number, others: Box[], segs: Seg[], discs: Disc[], W: number, H: number, limit: number): number {
  let c = base;
  // хүрээнээс гарах
  const outX = Math.max(0, 3 - (b.x - b.w / 2)) + Math.max(0, b.x + b.w / 2 - (W - 3));
  const outY = Math.max(0, 3 - (b.y - b.h / 2)) + Math.max(0, b.y + b.h / 2 - (H - 3));
  if (outX || outY) c += 12 + 0.6 * (outX + outY);
  if (c >= limit) return c;
  for (const o of others) {
    const a = overlapArea(b, o, 2);
    if (a > 0) {
      c += 10 + (8 * a) / Math.min(b.w * b.h, o.w * o.h);
      if (c >= limit) return c;
    }
  }
  for (const s of segs) {
    if (boxSegHit(b, s, 1.5)) {
      c += 5;
      if (c >= limit) return c;
    }
  }
  for (const d of discs) {
    if (boxDiscDist(b, d) < d.r + 1) {
      c += 6;
      if (c >= limit) return c;
    }
  }
  return c;
}

/**
 * Шошгуудыг байрлуулна. segs — зурсан бүх шугамын хэрчмүүд, discs — цэгүүд,
 * W×H — зургийн хүрээ (px). Буцаах массив reqs-тэй ижил дараалалтай.
 */
export function placeLabels(reqs: LabelReq[], segs: Seg[], discs: Disc[], W: number, H: number, iterations = 2): Placed[] {
  const cands = reqs.map(candidates);
  const order = reqs.map((r, i) => i).sort((i, j) => (reqs[i].prio ?? 5) - (reqs[j].prio ?? 5) || i - j);
  const chosen: (Cand | null)[] = reqs.map(() => null);
  const boxOf = (i: number, c: Cand): Box => ({ x: c.x, y: c.y, w: reqs[i].w, h: reqs[i].h });

  const best = (i: number): Cand => {
    const others: Box[] = [];
    chosen.forEach((c, j) => c && j !== i && others.push(boxOf(j, c)));
    let bc = cands[i][0];
    let bv = Infinity;
    for (const c of cands[i]) {
      if (c.base >= bv) break; // дараалсан тул цааш нь бүгд муу
      const v = cost(boxOf(i, c), c.base, others, segs, discs, W, H, bv);
      if (v < bv) {
        bv = v;
        bc = c;
      }
    }
    return bc;
  };

  for (const i of order) chosen[i] = best(i);
  for (let it = 0; it < iterations; it++) {
    let changed = false;
    for (const i of order) {
      const c = best(i);
      if (c !== chosen[i]) {
        chosen[i] = c;
        changed = true;
      }
    }
    if (!changed) break;
  }
  return chosen.map((c) => ({ x: c!.x, y: c!.y, ideal: c!.ideal, extra: c!.extra }));
}

/** Байрлуулсан шошгуудын хоорондох давхцлын тоо (тестэд) */
export function countOverlaps(boxes: Box[], pad = 0): number {
  let n = 0;
  for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) if (boxesOverlap(boxes[i], boxes[j], pad)) n++;
  return n;
}
