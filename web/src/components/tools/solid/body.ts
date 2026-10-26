/* ============================================================================
 * Гүдгэр биетийн тор (mesh): нүүр, ирмэг, нормаль, хавтгайгаар огтлох.
 *
 * Муруй гадаргуу (цилиндр, конус, бөмбөрцөг)-г олон жижиг нүүрээр
 * ойролцоолно. Ирмэг бүр «онцлог» (f — үргэлж зурна: суурийн хүрээ, олон
 * талстын ирмэг) эсвэл «гөлгөр» (s — зөвхөн дүрсийн хүрээ болж харагдах үед,
 * өөрөөр хэлбэл нэг талын нүүр нь харагч руу, нөгөө нь эсрэг харсан үед) байна.
 * Ингэснээр цилиндрийн хажуугийн хоёр «байгуулагч» шугам автоматаар гарна.
 * ========================================================================== */

import { centroid, cross, dist, dot, len, lerp, newell, norm, basis, sub, type Vec3 } from "./vec.ts";

export type EdgeKind = "f" | "s";
export type FaceTag = "base" | "top" | "side" | "lateral" | "section";

export interface Face {
  pts: Vec3[];
  /** kinds[i] — pts[i] → pts[i+1] ирмэгийн төрөл */
  kinds: EdgeKind[];
  tag: FaceTag;
  /** Муруй гадаргуугийн хэсэг (тусдаа будахгүй, хүрээгээр нь будна) */
  smooth?: boolean;
}

/** n·p ≤ d тал нь «үлдэх» хагас огторгуй */
export interface Plane {
  n: Vec3;
  d: number;
}

export interface Body {
  faces: Face[];
  /** Бөмбөрцөг — хүрээг аналитикаар зурна */
  sphere?: { c: Vec3; R: number };
  /** Гадаргуу дээрх нэмэлт муруй (бөмбөрцгийн экватор) — цэг ба нормаль */
  curves?: { pts: Vec3[]; normals: Vec3[] }[];
  /** Хэрэглэгдсэн огтлолууд (аналитик муруйг тайрахад) */
  clips?: Plane[];
}

export interface PreparedEdge {
  a: Vec3;
  b: Vec3;
  kind: EdgeKind;
  faces: number[];
}

export interface Prepared {
  body: Body;
  normals: Vec3[];
  centers: Vec3[];
  center: Vec3;
  edges: PreparedEdge[];
  /** Хүрээлсэн бөмбөрцгийн радиус (center-ээс) */
  radius: number;
}

const KEY = 1e5;
const pk = (p: Vec3) => `${Math.round(p[0] * KEY)},${Math.round(p[1] * KEY)},${Math.round(p[2] * KEY)}`;

/** Бүх оройн цэг (давхардалгүй) */
export function bodyPoints(body: Body): Vec3[] {
  const seen = new Map<string, Vec3>();
  for (const f of body.faces) for (const p of f.pts) seen.set(pk(p), p);
  return [...seen.values()];
}

/** Нормаль, төв, ирмэгийн топологи — харагдацаас хамааралгүй тул нэг удаа */
export function prepareBody(body: Body): Prepared {
  const pts = bodyPoints(body);
  const center = centroid(pts);
  const centers = body.faces.map((f) => centroid(f.pts));
  const normals = body.faces.map((f, i) => {
    let n = norm(newell(f.pts));
    if (dot(n, sub(centers[i], center)) < 0) n = [-n[0], -n[1], -n[2]];
    return n;
  });
  const map = new Map<string, PreparedEdge>();
  body.faces.forEach((f, fi) => {
    for (let i = 0; i < f.pts.length; i++) {
      const a = f.pts[i], b = f.pts[(i + 1) % f.pts.length];
      if (dist(a, b) < 1e-9) continue;
      const ka = pk(a), kb = pk(b);
      const key = ka < kb ? `${ka}|${kb}` : `${kb}|${ka}`;
      const e = map.get(key);
      if (e) {
        e.faces.push(fi);
        if (f.kinds[i] === "f") e.kind = "f";
      } else {
        map.set(key, { a, b, kind: f.kinds[i], faces: [fi] });
      }
    }
  });
  let radius = 0;
  for (const p of pts) radius = Math.max(radius, dist(p, center));
  if (body.sphere) radius = Math.max(radius, dist(body.sphere.c, center) + body.sphere.R);
  return { body, normals, centers, center, edges: [...map.values()], radius };
}

/** Эзлэхүүн (гүдгэр биет: төвөөс пирамидуудын нийлбэр) */
export function bodyVolume(body: Body): number {
  const c = centroid(bodyPoints(body));
  let v = 0;
  for (const f of body.faces) {
    const n = newell(f.pts); // урт = 2·талбай
    const area = len(n) / 2;
    if (area < 1e-15) continue;
    const h = Math.abs(dot(norm(n), sub(f.pts[0], c)));
    v += (area * h) / 3;
  }
  return v;
}

export function bodyArea(body: Body): number {
  let s = 0;
  for (const f of body.faces) s += len(newell(f.pts)) / 2;
  return s;
}

/* ---------------------------------------------------------- огтлол -- */

const sideOf = (pl: Plane, p: Vec3) => dot(pl.n, p) - pl.d;

/** Ирмэгийн огтлолцлын цэг — төгсгөлийн дарааллаас үл хамаарах (хөрш нүүрт яг ижил) */
function cutPoint(pl: Plane, a: Vec3, b: Vec3): Vec3 {
  const swap = pk(a) > pk(b);
  const p = swap ? b : a, q = swap ? a : b;
  const dp = sideOf(pl, p), dq = sideOf(pl, q);
  return lerp(p, q, dp / (dp - dq));
}

/** Хавтгайн хэрчмүүдийг өнцгөөр эрэмбэлж олон өнцөгт болгоно */
export function orderOnPlane(pts: Vec3[], n: Vec3): Vec3[] {
  const uniq: Vec3[] = [];
  for (const p of pts) if (!uniq.some((q) => dist(p, q) < 1e-7)) uniq.push(p);
  if (uniq.length < 3) return uniq;
  const c = centroid(uniq);
  const [u, w] = basis(n);
  return uniq
    .map((p) => ({ p, a: Math.atan2(dot(sub(p, c), w), dot(sub(p, c), u)) }))
    .sort((x, y) => x.a - y.a)
    .map((o) => o.p);
}

/** Нэг шулуун дээрх дундын цэгүүдийг хасна (булан л үлдэнэ) */
export function corners(poly: Vec3[], eps = 1e-6): Vec3[] {
  const cur = poly.slice();
  let changed = true;
  while (changed && cur.length > 3) {
    changed = false;
    for (let i = 0; i < cur.length; i++) {
      const p = cur[(i - 1 + cur.length) % cur.length], q = cur[i], r = cur[(i + 1) % cur.length];
      const c = len(cross(sub(q, p), sub(r, q)));
      if (c <= eps * dist(p, q) * dist(q, r) || dist(p, q) < 1e-9) {
        cur.splice(i, 1);
        changed = true;
        break;
      }
    }
  }
  return cur;
}

export interface SectionPoly {
  /** Огтлолын олон өнцөгтийн оройнууд (эрэмбэтэй) */
  pts: Vec3[];
  /** pts[i]→pts[i+1] хэрчим аль нүүрүүд дээр орших вэ (харагдах эсэхэд) */
  faces: number[][];
  area: number;
}

/** Хавтгай ∩ гүдгэр биет. Огтлолгүй эсвэл цэг/хэрчим бол null */
export function sectionPolygon(prep: Prepared, pl: Plane): SectionPoly | null {
  const n = norm(pl.n);
  const P: Plane = { n, d: pl.d / len(pl.n) };
  const eps = 1e-9 * Math.max(1, prep.radius);
  const raw: Vec3[] = [];
  for (const e of prep.edges) {
    const da = sideOf(P, e.a), db = sideOf(P, e.b);
    if (Math.abs(da) <= eps) raw.push(e.a);
    if (Math.abs(db) <= eps) raw.push(e.b);
    if ((da > eps && db < -eps) || (da < -eps && db > eps)) raw.push(cutPoint(P, e.a, e.b));
  }
  const pts = orderOnPlane(raw, n);
  if (pts.length < 3) return null;
  const area = len(newell(pts)) / 2;
  if (area < 1e-12 * Math.max(1, prep.radius ** 2)) return null;
  const faces = pts.map((a, i) => {
    const b = pts[(i + 1) % pts.length];
    const m = lerp(a, b, 0.5);
    const out: number[] = [];
    prep.body.faces.forEach((f, fi) => {
      const fn = prep.normals[fi];
      if (Math.abs(dot(fn, sub(m, f.pts[0]))) < 1e-7 * Math.max(1, prep.radius)) out.push(fi);
    });
    return out;
  });
  return { pts, faces, area };
}

/** Биетийг хавтгайгаар тайрч, n·p ≤ d хэсгийг үлдээнэ. Огтлолын шинэ нүүр tag="section" */
export function clipBody(body: Body, pl: Plane): Body {
  const n = norm(pl.n);
  const P: Plane = { n, d: pl.d / len(pl.n) };
  const eps = 1e-9;
  const faces: Face[] = [];
  const cutPts: Vec3[] = [];
  for (const f of body.faces) {
    const out: { p: Vec3; k: EdgeKind }[] = [];
    const m = f.pts.length;
    for (let i = 0; i < m; i++) {
      const cur = f.pts[i], nxt = f.pts[(i + 1) % m], k = f.kinds[i];
      const dc = sideOf(P, cur), dn = sideOf(P, nxt);
      const cin = dc <= eps, nin = dn <= eps;
      if (cin) {
        out.push({ p: cur, k });
        if (Math.abs(dc) <= eps) cutPts.push(cur);
        if (!nin) {
          const I = Math.abs(dc) <= eps ? cur : cutPoint(P, cur, nxt);
          out.push({ p: I, k: "f" });
          cutPts.push(I);
        }
      } else if (nin) {
        const I = Math.abs(dn) <= eps ? nxt : cutPoint(P, cur, nxt);
        out.push({ p: I, k });
        cutPts.push(I);
      }
    }
    // давхардсан цэгүүдийг цэвэрлэнэ (дараагийнхын төрлийг авна)
    const clean: { p: Vec3; k: EdgeKind }[] = [];
    for (const o of out) {
      const last = clean[clean.length - 1];
      if (last && dist(last.p, o.p) < 1e-10) last.k = o.k;
      else clean.push({ ...o });
    }
    while (clean.length > 1 && dist(clean[0].p, clean[clean.length - 1].p) < 1e-10) clean.pop();
    if (clean.length < 3) continue;
    if (len(newell(clean.map((c) => c.p))) < 1e-12) continue;
    faces.push({ pts: clean.map((c) => c.p), kinds: clean.map((c) => c.k), tag: f.tag, smooth: f.smooth });
  }
  const sec = orderOnPlane(cutPts, n);
  if (sec.length >= 3 && len(newell(sec)) > 1e-12) {
    // аль хэдийн тэр хавтгай дээр нүүр байвал (огтлол = нүүр) давхар нэмэхгүй
    const dup = faces.some((f) => f.pts.length === sec.length && f.pts.every((p) => Math.abs(sideOf(P, p)) <= 1e-7));
    if (!dup) faces.push({ pts: sec, kinds: sec.map(() => "f" as const), tag: "section" });
  }
  return {
    faces,
    sphere: body.sphere,
    curves: body.curves,
    clips: [...(body.clips ?? []), P],
  };
}

/** Цэг үлдэх хэсэгт байгаа эсэх (бүх огтлолоор) */
export function keptByClips(body: Body, p: Vec3, eps = 1e-7): boolean {
  for (const c of body.clips ?? []) if (sideOf(c, p) > eps) return false;
  return true;
}

/** Хэрчмийг огтлолын үлдэх хэсгээр тайрна. Бүхэлдээ гадна бол null */
export function clipSegment(body: Body, a: Vec3, b: Vec3): [Vec3, Vec3] | null {
  let t0 = 0, t1 = 1;
  for (const c of body.clips ?? []) {
    const da = sideOf(c, a), db = sideOf(c, b);
    if (da > 1e-9 && db > 1e-9) return null;
    if (da > 1e-9) t0 = Math.max(t0, da / (da - db));
    else if (db > 1e-9) t1 = Math.min(t1, da / (da - db));
  }
  if (t1 - t0 < 1e-9) return null;
  return [lerp(a, b, t0), lerp(a, b, t1)];
}
