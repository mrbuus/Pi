/* ============================================================================
 * Хавтгайн геометрийн цэвэр тооцоо (React-гүй, импортгүй).
 * Координат нь математикийн: y дээшээ. Өнцөг градусаар (оролт/гаралт),
 * дотооддоо радиан. Тест: node --test src/components/tools/plane/
 * ========================================================================== */

export interface Pt {
  x: number;
  y: number;
}

export const EPS = 1e-9;

export const pt = (x: number, y: number): Pt => ({ x, y });
export const add = (a: Pt, b: Pt): Pt => ({ x: a.x + b.x, y: a.y + b.y });
export const sub = (a: Pt, b: Pt): Pt => ({ x: a.x - b.x, y: a.y - b.y });
export const mul = (a: Pt, k: number): Pt => ({ x: a.x * k, y: a.y * k });
export const dot = (a: Pt, b: Pt): number => a.x * b.x + a.y * b.y;
export const cross = (a: Pt, b: Pt): number => a.x * b.y - a.y * b.x;
export const len = (a: Pt): number => Math.hypot(a.x, a.y);
export const dist = (a: Pt, b: Pt): number => Math.hypot(a.x - b.x, a.y - b.y);
export const mid = (a: Pt, b: Pt): Pt => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
export const lerp = (a: Pt, b: Pt, t: number): Pt => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
/** 90° цагийн зүүний эсрэг эргүүлсэн */
export const perp = (a: Pt): Pt => ({ x: -a.y, y: a.x });
export function norm(a: Pt): Pt {
  const l = len(a);
  return l < EPS ? { x: 0, y: 0 } : { x: a.x / l, y: a.y / l };
}
export function rotate(a: Pt, rad: number): Pt {
  const c = Math.cos(rad), s = Math.sin(rad);
  return { x: a.x * c - a.y * s, y: a.x * s + a.y * c };
}
export const polar = (c: Pt, r: number, rad: number): Pt => ({ x: c.x + r * Math.cos(rad), y: c.y + r * Math.sin(rad) });

export const toRad = (deg: number) => (deg * Math.PI) / 180;
export const toDeg = (rad: number) => (rad * 180) / Math.PI;

/** ∠ABC (B орой), радиан [0, π] */
export function angleAt(a: Pt, b: Pt, c: Pt): number {
  const u = sub(a, b), v = sub(c, b);
  const lu = len(u), lv = len(v);
  if (lu < EPS || lv < EPS) return NaN;
  const cos = Math.max(-1, Math.min(1, dot(u, v) / (lu * lv)));
  return Math.acos(cos);
}

/** Олон өнцөгтийн тэмдэгтэй талбай (Гауссын томьёо): ЦЗЭ дараалал бол эерэг */
export function signedArea(pts: Pt[]): number {
  let s = 0;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length];
    s += a.x * b.y - b.x * a.y;
  }
  return s / 2;
}
export const polygonArea = (pts: Pt[]) => Math.abs(signedArea(pts));
export function perimeter(pts: Pt[], closed = true): number {
  let s = 0;
  const n = closed ? pts.length : pts.length - 1;
  for (let i = 0; i < n; i++) s += dist(pts[i], pts[(i + 1) % pts.length]);
  return s;
}
export function centroidOf(pts: Pt[]): Pt {
  let x = 0, y = 0;
  for (const p of pts) { x += p.x; y += p.y; }
  return { x: x / pts.length, y: y / pts.length };
}

/* ---------------- Гурвалжин ---------------- */

/** Герон: S = √(p(p−a)(p−b)(p−c)). Гурвалжин үүсэхгүй бол NaN */
export function heron(a: number, b: number, c: number): number {
  const p = (a + b + c) / 2;
  const q = p * (p - a) * (p - b) * (p - c);
  if (q < -EPS) return NaN;
  return Math.sqrt(Math.max(0, q));
}

/** Косинусын теорем: b, c ба хоорондох өнцөг A (градус) → a */
export function cosineSide(b: number, c: number, angleDeg: number): number {
  return Math.sqrt(Math.max(0, b * b + c * c - 2 * b * c * Math.cos(toRad(angleDeg))));
}
/** Косинусын теорем: a-ийн эсрэг өнцөг (градус) */
export function cosineAngle(a: number, b: number, c: number): number {
  const cos = (b * b + c * c - a * a) / (2 * b * c);
  return toDeg(Math.acos(Math.max(-1, Math.min(1, cos))));
}

/** Шийдсэн гурвалжин: a=BC, b=CA, c=AB; A,B,C — оройн өнцөг (градус) */
export interface Tri {
  a: number;
  b: number;
  c: number;
  A: number;
  B: number;
  C: number;
}
export type TriResult = { ok: true; tri: Tri; alt?: Tri } | { ok: false; reason: string; tex?: string };

const bad = (reason: string, tex?: string): TriResult => ({ ok: false, reason, tex });
const pos = (...xs: number[]) => xs.every((x) => Number.isFinite(x) && x > 0);
const r3 = (x: number) => String(Number(x.toFixed(3)));

/** 3 тал */
export function solveSSS(a: number, b: number, c: number): TriResult {
  if (!pos(a, b, c)) return bad("Талын урт эерэг тоо байх ёстой");
  const s = [a, b, c].sort((x, y) => x - y);
  if (s[0] + s[1] <= s[2] * (1 + 1e-12)) {
    return bad(
      "Хамгийн урт тал нь нөгөө хоёрын нийлбэрээс бага байх ёстой",
      `${r3(s[0])}+${r3(s[1])}${Math.abs(s[0] + s[1] - s[2]) < 1e-12 ? "=" : "<"}${r3(s[2])}`,
    );
  }
  const A = cosineAngle(a, b, c), B = cosineAngle(b, c, a);
  return { ok: true, tri: { a, b, c, A, B, C: 180 - A - B } };
}

/** 2 тал (b, c) ба хоорондох өнцөг A */
export function solveSAS(b: number, A: number, c: number): TriResult {
  if (!pos(b, c)) return bad("Талын урт эерэг тоо байх ёстой");
  if (!(A > 0 && A < 180)) return bad("Өнцөг 0-ээс их, 180-аас бага байх ёстой", `0^\\circ<\\angle A<180^\\circ`);
  const a = cosineSide(b, c, A);
  const B = cosineAngle(b, c, a);
  return { ok: true, tri: { a, b, c, A, B, C: 180 - A - B } };
}

/** 2 өнцөг (B, C) ба тэдгээрийн хоорондох тал a */
export function solveASA(B: number, a: number, C: number): TriResult {
  if (!pos(a)) return bad("Талын урт эерэг тоо байх ёстой");
  if (!(B > 0 && C > 0)) return bad("Өнцөг эерэг байх ёстой");
  if (B + C >= 180) return bad("Хоёр өнцгийн нийлбэр 180-аас бага байх ёстой", `${r3(B)}^\\circ+${r3(C)}^\\circ\\ge 180^\\circ`);
  const A = 180 - B - C;
  const k = a / Math.sin(toRad(A));
  return { ok: true, tri: { a, b: k * Math.sin(toRad(B)), c: k * Math.sin(toRad(C)), A, B, C } };
}

/** 2 өнцөг (A, B) ба A-гийн эсрэг тал a */
export function solveAAS(A: number, B: number, a: number): TriResult {
  if (!pos(a)) return bad("Талын урт эерэг тоо байх ёстой");
  if (!(A > 0 && B > 0)) return bad("Өнцөг эерэг байх ёстой");
  if (A + B >= 180) return bad("Хоёр өнцгийн нийлбэр 180-аас бага байх ёстой", `${r3(A)}^\\circ+${r3(B)}^\\circ\\ge 180^\\circ`);
  const C = 180 - A - B;
  const k = a / Math.sin(toRad(A));
  return { ok: true, tri: { a, b: k * Math.sin(toRad(B)), c: k * Math.sin(toRad(C)), A, B, C } };
}

/**
 * 2 тал (a, b) ба a-гийн эсрэг өнцөг A — 0, 1 эсвэл 2 шийдтэй.
 * Хоёр шийдтэй бол `alt`-д хоёр дахь (B мохоо) гурвалжин.
 */
export function solveSSA(a: number, b: number, A: number): TriResult {
  if (!pos(a, b)) return bad("Талын урт эерэг тоо байх ёстой");
  if (!(A > 0 && A < 180)) return bad("Өнцөг 0-ээс их, 180-аас бага байх ёстой");
  const sinB = (b * Math.sin(toRad(A))) / a;
  if (sinB > 1 + 1e-12) return bad("Синусын теоремоор sin B нь 1-ээс их гарч байна", `\\sin B=\\frac{b\\sin A}{a}=${r3(sinB)}>1`);
  const B1 = Math.abs(sinB - 1) <= 1e-9 ? 90 : toDeg(Math.asin(Math.min(1, sinB)));
  const make = (B: number): Tri | null => {
    const C = 180 - A - B;
    if (C <= 1e-9) return null;
    const k = a / Math.sin(toRad(A));
    return { a, b, c: k * Math.sin(toRad(C)), A, B, C };
  };
  const t1 = make(B1);
  const B2 = 180 - B1;
  // sin B ≈ 1 бол B = 90° — ганц шийд
  const t2 = Math.abs(sinB - 1) > 1e-9 && Math.abs(B2 - B1) > 1e-9 ? make(B2) : null;
  if (!t1 && !t2) return bad("Өнцгүүдийн нийлбэр 180-аас хэтэрч байна");
  if (t1 && t2) return { ok: true, tri: t1, alt: t2 };
  return { ok: true, tri: (t1 ?? t2)! };
}

/** Тал → оройн байрлал: B=(0,0), C=(a,0), A дээд талд */
export function placeTriangle(t: Pick<Tri, "a" | "b" | "c">): { A: Pt; B: Pt; C: Pt } {
  const { a, b, c } = t;
  const x = (c * c - b * b + a * a) / (2 * a);
  const y = Math.sqrt(Math.max(0, c * c - x * x));
  return { A: { x, y }, B: { x: 0, y: 0 }, C: { x: a, y: 0 } };
}

/** Медианы огтлолцол (барицентр) */
export const centroid = (A: Pt, B: Pt, C: Pt): Pt => ({ x: (A.x + B.x + C.x) / 3, y: (A.y + B.y + C.y) / 3 });

/** Дунд перпендикуляруудын огтлолцол (гадна тойргийн төв) */
export function circumcenter(A: Pt, B: Pt, C: Pt): Pt | null {
  const d = 2 * (A.x * (B.y - C.y) + B.x * (C.y - A.y) + C.x * (A.y - B.y));
  if (Math.abs(d) < EPS) return null;
  const a2 = A.x * A.x + A.y * A.y, b2 = B.x * B.x + B.y * B.y, c2 = C.x * C.x + C.y * C.y;
  return {
    x: (a2 * (B.y - C.y) + b2 * (C.y - A.y) + c2 * (A.y - B.y)) / d,
    y: (a2 * (C.x - B.x) + b2 * (A.x - C.x) + c2 * (B.x - A.x)) / d,
  };
}

/** Биссектрисуудын огтлолцол (дотор тойргийн төв) */
export function incenter(A: Pt, B: Pt, C: Pt): Pt {
  const a = dist(B, C), b = dist(C, A), c = dist(A, B), s = a + b + c;
  return { x: (a * A.x + b * B.x + c * C.x) / s, y: (a * A.y + b * B.y + c * C.y) / s };
}

/** Өндрүүдийн огтлолцол: H = A + B + C − 2O */
export function orthocenter(A: Pt, B: Pt, C: Pt): Pt | null {
  const O = circumcenter(A, B, C);
  if (!O) return null;
  return { x: A.x + B.x + C.x - 2 * O.x, y: A.y + B.y + C.y - 2 * O.y };
}

/** Дотор (багтсан) тойргийн радиус r = S/p */
export function inradius(a: number, b: number, c: number): number {
  return heron(a, b, c) / ((a + b + c) / 2);
}
/** Гадна (багтаасан) тойргийн радиус R = abc/(4S) */
export function circumradius(a: number, b: number, c: number): number {
  return (a * b * c) / (4 * heron(a, b, c));
}
/** a тал руу буусан өндөр h_a = 2S/a */
export const heightTo = (a: number, b: number, c: number) => (2 * heron(a, b, c)) / a;
/** a тал руу татсан медиан m_a = ½√(2b²+2c²−a²) */
export const medianTo = (a: number, b: number, c: number) => 0.5 * Math.sqrt(Math.max(0, 2 * b * b + 2 * c * c - a * a));
/** A өнцгийн биссектрис (a тал хүртэл) l_a = √(bc((b+c)²−a²))/(b+c) */
export const bisectorTo = (a: number, b: number, c: number) => Math.sqrt(Math.max(0, b * c * ((b + c) ** 2 - a * a))) / (b + c);

/** P цэгээс AB шулуун руу буулгасан перпендикулярын суурь */
export function foot(p: Pt, a: Pt, b: Pt): Pt {
  const d = sub(b, a);
  const l2 = dot(d, d);
  if (l2 < EPS) return { ...a };
  const t = dot(sub(p, a), d) / l2;
  return add(a, mul(d, t));
}
/** Шулуун дээрх параметр: a + t(b−a) */
export function paramOn(p: Pt, a: Pt, b: Pt): number {
  const d = sub(b, a);
  const l2 = dot(d, d);
  return l2 < EPS ? 0 : dot(sub(p, a), d) / l2;
}
/** Цэгээс хэрчим хүртэлх зай */
export function distToSegment(p: Pt, a: Pt, b: Pt): number {
  const t = Math.max(0, Math.min(1, paramOn(p, a, b)));
  return dist(p, lerp(a, b, t));
}
/** Цэгээс шулуун (p0 + t·d) хүртэлх зай */
export function distToLine(p: Pt, p0: Pt, d: Pt): number {
  const l = len(d);
  return l < EPS ? dist(p, p0) : Math.abs(cross(d, sub(p, p0))) / l;
}

/** B оройн өнцгийн биссектрисийн нэгж чиглэл (BA, BC-ийн дунд) */
export function bisectorDir(a: Pt, b: Pt, c: Pt): Pt {
  const u = norm(sub(a, b)), v = norm(sub(c, b));
  const s = add(u, v);
  return len(s) < EPS ? perp(u) : norm(s);
}

/** Биссектрисийн суурь: BC-г AB:AC харьцаагаар хуваана */
export function bisectorFoot(A: Pt, B: Pt, C: Pt): Pt {
  const c = dist(A, B), b = dist(A, C);
  return lerp(B, C, c / (b + c));
}

/* ---------------- Огтлолцол ---------------- */

/** p1 + t·d1 ба p2 + u·d2 шулуунуудын огтлолцол; параллель бол null */
export function lineLine(p1: Pt, d1: Pt, p2: Pt, d2: Pt): { p: Pt; t: number; u: number } | null {
  const den = cross(d1, d2);
  if (Math.abs(den) < EPS * Math.max(1, len(d1) * len(d2))) return null;
  const w = sub(p2, p1);
  const t = cross(w, d2) / den;
  const u = cross(w, d1) / den;
  return { p: add(p1, mul(d1, t)), t, u };
}

/** Шулуун (p + t·d) ба тойргийн огтлолцол — t өсөх дарааллаар */
export function lineCircle(p: Pt, d: Pt, c: Pt, r: number): { p: Pt; t: number }[] {
  const f = sub(p, c);
  const A = dot(d, d), B = 2 * dot(f, d), C = dot(f, f) - r * r;
  if (A < EPS) return [];
  const disc = B * B - 4 * A * C;
  const tol = 1e-9 * Math.max(1, B * B);
  if (disc < -tol) return [];
  if (Math.abs(disc) <= tol) {
    const t = -B / (2 * A);
    return [{ p: add(p, mul(d, t)), t }];
  }
  const s = Math.sqrt(disc);
  const t1 = (-B - s) / (2 * A), t2 = (-B + s) / (2 * A);
  return [{ p: add(p, mul(d, t1)), t: t1 }, { p: add(p, mul(d, t2)), t: t2 }];
}

/** Хоёр тойргийн огтлолцол (c1→c2 чиглэлийн зүүн талынх эхэнд) */
export function circleCircle(c1: Pt, r1: number, c2: Pt, r2: number): Pt[] {
  const d = dist(c1, c2);
  if (d < EPS) return [];
  if (d > r1 + r2 + 1e-9 || d < Math.abs(r1 - r2) - 1e-9) return [];
  const a = (r1 * r1 - r2 * r2 + d * d) / (2 * d);
  const h2 = r1 * r1 - a * a;
  const e = norm(sub(c2, c1));
  const m = add(c1, mul(e, a));
  if (h2 <= 1e-12) return [m];
  const h = Math.sqrt(h2);
  const n = perp(e);
  return [add(m, mul(n, h)), sub(m, mul(n, h))];
}

/** Гадна P цэгээс тойрогт татсан шүргэгчийн шүргэлтийн цэгүүд */
export function tangentPoints(p: Pt, c: Pt, r: number): Pt[] {
  const d = dist(p, c);
  if (d < r - 1e-9) return [];
  if (Math.abs(d - r) <= 1e-9) return [{ ...p }];
  // Шүргэлтийн цэгүүд нь CP диаметртэй тойрог дээр байна
  return circleCircle(c, r, mid(c, p), d / 2);
}
/** Шүргэгчийн урт √(d² − r²) */
export const tangentLength = (d: number, r: number) => Math.sqrt(Math.max(0, d * d - r * r));

/* ---------------- Зөв олон өнцөгт ---------------- */

export interface RegularPolygon {
  n: number;
  a: number;
  /** Багтаасан тойргийн радиус R = a / (2 sin(π/n)) */
  R: number;
  /** Багтсан тойргийн радиус (апофем) r = a / (2 tg(π/n)) */
  r: number;
  P: number;
  S: number;
  /** Дотоод өнцөг 180(n−2)/n */
  interior: number;
  /** Төв өнцөг 360/n */
  central: number;
  pts: Pt[];
}

/** n өнцөгт, тал a: төв (0,0), доод тал хэвтээ */
export function regularPolygon(n: number, a: number): RegularPolygon {
  const R = a / (2 * Math.sin(Math.PI / n));
  const r = a / (2 * Math.tan(Math.PI / n));
  const start = -Math.PI / 2 - Math.PI / n;
  const pts: Pt[] = [];
  for (let i = 0; i < n; i++) pts.push(polar({ x: 0, y: 0 }, R, start + (2 * Math.PI * i) / n));
  return { n, a, R, r, P: n * a, S: (n * a * a) / (4 * Math.tan(Math.PI / n)), interior: (180 * (n - 2)) / n, central: 360 / n, pts };
}

/* ---------------- Тойргийн элементүүд ---------------- */

/** Төв өнцөг θ (градус) хамарсан хөвчийн урт 2r·sin(θ/2) */
export const chordLength = (r: number, deg: number) => 2 * r * Math.sin(toRad(deg) / 2);
/** Нумын урт πrθ/180 */
export const arcLength = (r: number, deg: number) => (Math.PI * r * deg) / 180;
/** Секторын талбай πr²θ/360 */
export const sectorArea = (r: number, deg: number) => (Math.PI * r * r * deg) / 360;
/** Сегментийн талбай ½r²(θ − sin θ) */
export const segmentArea = (r: number, deg: number) => 0.5 * r * r * (toRad(deg) - Math.sin(toRad(deg)));

/* ---------------- Дөрвөн өнцөгт ---------------- */

/** Параллелограмм: a=AB, b=AD, α=∠A → A,B,C,D (ЦЗЭ) */
export function parallelogram(a: number, b: number, alphaDeg: number): Pt[] {
  const d = polar({ x: 0, y: 0 }, b, toRad(alphaDeg));
  return [{ x: 0, y: 0 }, { x: a, y: 0 }, { x: a + d.x, y: d.y }, d];
}

/**
 * Трапец: доод суурь AD = a, дээд суурь BC = b, B = (p, h).
 * Хажуу талаар (c = AB, d = CD) өгвөл p, h-ийг олно. Үүсэхгүй бол null.
 */
export function trapezoidFromLegs(a: number, b: number, c: number, d: number): { p: number; h: number } | null {
  if (!pos(a, b, c, d) || Math.abs(a - b) < 1e-12) return null;
  const e = b - a;
  const p = (d * d - c * c - e * e) / (2 * e);
  const h2 = c * c - p * p;
  if (h2 <= 1e-12) return null;
  return { p, h: Math.sqrt(h2) };
}
/** Трапецын оройнууд: A(0,0), B(p,h), C(p+b,h), D(a,0) */
export const trapezoidPts = (a: number, b: number, p: number, h: number): Pt[] => [
  { x: 0, y: 0 },
  { x: p, y: h },
  { x: p + b, y: h },
  { x: a, y: 0 },
];

/* ---------------- Хүрээ, масштаб ---------------- */

export interface Box {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}
export function emptyBox(): Box {
  return { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
}
export function boxAdd(b: Box, p: Pt): Box {
  return { minX: Math.min(b.minX, p.x), minY: Math.min(b.minY, p.y), maxX: Math.max(b.maxX, p.x), maxY: Math.max(b.maxY, p.y) };
}

/** Математик хүрээг w×h пикселд pad зайтай багтаах: дэлгэц = (ox + x·s, oy − y·s) */
export function fitView(b: Box, w: number, h: number, pad: number): { s: number; ox: number; oy: number } {
  if (!Number.isFinite(b.minX)) return { s: 40, ox: w / 2, oy: h / 2 };
  const bw = Math.max(b.maxX - b.minX, 1e-6), bh = Math.max(b.maxY - b.minY, 1e-6);
  const s = Math.max(1e-6, Math.min((w - 2 * pad) / bw, (h - 2 * pad) / bh));
  const cx = (b.minX + b.maxX) / 2, cy = (b.minY + b.maxY) / 2;
  return { s, ox: w / 2 - cx * s, oy: h / 2 + cy * s };
}
