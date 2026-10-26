/* ============================================================================
 * Дэлгээс (net): биетийн нүүрүүдийг мод (tree) хэлбэрээр нугасласан,
 * t = 1 үед битүү биет, t = 0 үед суурийн хавтгай дээр дэлгэгдсэн.
 *
 * Нүүр бүр эцэг нүүртэйгээ нэг ирмэгээр (нугас) холбогдоно. Нээхдээ нүүрийг
 * нугасыг тойруулан α·(1−t) өнцгөөр эргүүлнэ; α нь нүүрийн гадагш нормалийг
 * эцгийнхтэй давхцуулах өнцөг (тэгвэл хоёр нүүр нэг хавтгайд, нугасын хоёр
 * талд). Хүүхэд нүүр эцгийнхээ хувиргалтыг өвлөнө.
 *
 * Цилиндр, конусыг N жижиг нүүрээр ойролцоолно; хажуугийн тууз нь гинж
 * (нүүр бүр хөршдөө нугасласан) тул дэлгэхэд тэгш өнцөгт / дугуй сектор
 * болно. Нүүрийн өргөн нь 2πr/N тул туузын урт яг 2πr.
 * ========================================================================== */

import type { EdgeKind } from "./body.ts";
import { buildSolid, sanitizeParams, type Params, type SolidKind } from "./solids.ts";
import {
  IDENTITY, applyAffine, centroid, compose, cross, dist, dot, newell, norm, polyArea, rotationAffine, sub,
  type Affine, type Vec3,
} from "./vec.ts";

export interface NetFace {
  pts: Vec3[];
  kinds: EdgeKind[];
  names?: (string | undefined)[];
  /** Эцэг нүүрийн индекс, үндэс бол -1 */
  parent: number;
}

export interface NetRef {
  f: number;
  p: Vec3;
}

export interface NetAnno {
  a: NetRef;
  b: NetRef;
  label: string;
  value: number;
  /** Хэрчмийг өөрийг нь зурах (радиус, апофем) */
  line?: boolean;
  /** Шошгыг хэрчмийн аль хэсэгт (0..1, анхдагч 0.5) */
  pos?: number;
}

export interface NetSpec {
  faces: NetFace[];
  annos: NetAnno[];
}

/* ---------------------------------------------------------- барих -- */

const ring = (R: number, y: number, n: number): Vec3[] => {
  const out: Vec3[] = [];
  // эхний нүүр (0) урд талд (z > 0) байрлана
  for (let i = 0; i < n; i++) {
    const t = Math.PI / 2 + Math.PI / n - (2 * Math.PI * i) / n;
    out.push([R * Math.cos(t), y, R * Math.sin(t)]);
  }
  return out;
};

const allF = (n: number): EdgeKind[] => Array.from({ length: n }, () => "f" as const);

/** Хажуугийн гинжийг 0-ээс хоёр тийш: i ≤ n/2 бол i−1, үгүй бол i+1 (mod n) */
const chainParent = (i: number, n: number, offset: number) =>
  i === 0 ? -2 : i <= Math.floor(n / 2) ? offset + i - 1 : offset + ((i + 1) % n);

export const NET_SEG = 48;

export function buildNet(kind: SolidKind, raw: Partial<Params>, N = NET_SEG): NetSpec | null {
  const p = sanitizeParams(kind, raw);
  if (kind === "sphere") return null;

  if (kind === "cylinder" || kind === "cone" || kind === "fcone") {
    const R1 = kind === "fcone" ? p.R : p.r;
    const R2 = kind === "cylinder" ? p.r : kind === "fcone" ? p.r : 0;
    const s1 = (2 * Math.PI * R1) / N, s2 = (2 * Math.PI * R2) / N;
    const C1 = s1 / (2 * Math.sin(Math.PI / N)), C2 = s2 / (2 * Math.sin(Math.PI / N));
    const l = Math.hypot(p.h, R1 - R2);
    const hh = Math.sqrt(Math.max(1e-9, l * l - (C1 - C2) ** 2));
    const b = ring(C1, 0, N);
    const faces: NetFace[] = [{ pts: b.slice().reverse(), kinds: allF(N), parent: -1 }];
    const annos: NetAnno[] = [];
    const O: Vec3 = [0, 0, 0];
    if (kind === "cone") {
      const S: Vec3 = [0, hh, 0];
      for (let i = 0; i < N; i++) {
        const par = chainParent(i, N, 1);
        faces.push({ pts: [b[i], b[(i + 1) % N], S], kinds: ["f", "s", "s"], parent: par === -2 ? 0 : par });
      }
      const end = 1 + Math.floor(N / 2);
      annos.push({ a: { f: 0, p: O }, b: { f: 0, p: b[Math.floor(N / 2)] }, label: "r", value: p.r, line: true });
      annos.push({ a: { f: end, p: S }, b: { f: end, p: b[(Math.floor(N / 2) + 1) % N] }, label: "l", value: l });
      return { faces, annos };
    }
    const t = ring(C2, hh, N);
    for (let i = 0; i < N; i++) {
      const j = (i + 1) % N;
      const par = chainParent(i, N, 1);
      faces.push({ pts: [b[i], b[j], t[j], t[i]], kinds: ["f", "s", "f", "s"], parent: par === -2 ? 0 : par });
    }
    faces.push({ pts: t.slice(), kinds: allF(N), parent: 1 });
    const top = faces.length - 1;
    const half = Math.floor(N / 2);
    const endR = 1 + half, endL = 1 + ((half + 1) % N);
    annos.push({ a: { f: 0, p: O }, b: { f: 0, p: b[half] }, label: kind === "fcone" ? "R" : "r", value: R1, line: true });
    annos.push({ a: { f: top, p: [0, hh, 0] }, b: { f: top, p: t[half] }, label: "r", value: R2, line: true });
    const e = (half + 1) % N; // туузын төгсгөлийн зүсэгдсэн ирмэг
    annos.push({ a: { f: endR, p: b[e] }, b: { f: endR, p: t[e] }, label: kind === "fcone" ? "l" : "h", value: kind === "fcone" ? l : p.h });
    if (kind === "cylinder") {
      const far = b[(half + 1) % N];
      annos.push({ a: { f: endR, p: far }, b: { f: endL, p: far }, label: "2\\pi r", value: 2 * Math.PI * p.r, pos: 0.75 });
    }
    return { faces, annos };
  }

  // ---- олон талст: биетийн нүүрүүдээс ----
  const m = buildSolid(kind, p);
  const nameOf = (q: Vec3) => m.vertices.find((k) => dist(m.points[k], q) < 1e-7);
  const src = m.body.faces;
  const faces: NetFace[] = src.map((f) => ({ pts: f.pts.slice(), kinds: f.kinds.slice(), names: f.pts.map(nameOf), parent: -1 }));
  const annos: NetAnno[] = [];
  const at = (fi: number, name: string): NetRef => ({ f: fi, p: m.points[name] });
  if (kind === "octa") {
    // нүүрийн дараалал: 2i — дээд, 2i+1 — доод. Үндэс = доод 0
    faces[1].parent = -1;
    for (let i = 1; i < 4; i++) faces[2 * i + 1].parent = 2 * i - 1;
    for (let i = 0; i < 4; i++) faces[2 * i].parent = 2 * i + 1;
    annos.push({ a: at(1, "A"), b: at(1, "B"), label: "a", value: p.a });
    return { faces: reroot(faces, 1), annos: annos.map((x) => ({ ...x, a: { ...x.a, f: 0 }, b: { ...x.b, f: 0 } })) };
  }
  const base = src.findIndex((f) => f.tag === "base");
  const sides = src.map((f, i) => (f.tag === "side" ? i : -1)).filter((i) => i >= 0);
  const top = src.findIndex((f) => f.tag === "top");
  for (const s of sides) faces[s].parent = base;
  const side0 = sides.find((s) => faces[s].names?.includes("A") && faces[s].names?.includes("B")) ?? sides[0];
  if (top >= 0) faces[top].parent = side0;
  // ирмэгүүдийн шошго
  const side1 = sides.find((s) => faces[s].names?.includes("B") && faces[s].names?.includes("C")) ?? side0;
  annos.push({ a: at(base, "A"), b: at(base, "B"), label: "a", value: dist(m.points.A, m.points.B) });
  if (kind === "box") {
    annos.push({ a: at(base, "B"), b: at(base, "C"), label: "b", value: p.b });
    annos.push({ a: at(side1, "B"), b: at(side1, "B_1"), label: "c", value: p.c });
  } else if (kind === "prism") {
    annos.push({ a: at(side1, "B"), b: at(side1, "B_1"), label: "h", value: p.h });
  } else if (kind === "oblique") {
    annos.push({ a: at(side1, "B"), b: at(side1, "B_1"), label: "l", value: dist(m.points.B, m.points.B_1) });
  } else if (kind === "frustum") {
    annos.push({ a: at(top, "A_1"), b: at(top, "B_1"), label: "b", value: p.b });
    annos.push({ a: at(side0, "M"), b: at(side0, "M_1"), label: "m", value: dist(m.points.M, m.points.M_1), line: true });
  } else if (kind === "pyramid") {
    annos.push({ a: at(side0, "S"), b: at(side0, "M"), label: "m", value: dist(m.points.S, m.points.M), line: true });
  } else if (kind === "gpyramid" && p.n === 4) {
    annos.push({ a: at(base, "B"), b: at(base, "C"), label: "b", value: p.b });
  }
  return { faces, annos };
}

/** Үндсийг 0 индекс рүү шилжүүлнэ (эцэг нь хүүхдээсээ өмнө байх эрэмбэ) */
function reroot(faces: NetFace[], root: number): NetFace[] {
  const order: number[] = [root];
  for (let k = 0; k < order.length; k++) {
    faces.forEach((f, i) => {
      if (f.parent === order[k] && !order.includes(i)) order.push(i);
    });
  }
  const idx = new Map(order.map((o, i) => [o, i]));
  return order.map((o) => ({ ...faces[o], parent: faces[o].parent < 0 ? -1 : idx.get(faces[o].parent)! }));
}

/* ------------------------------------------------------ нугалах -- */

export interface PreparedNet {
  spec: NetSpec;
  /** Эцэг нь хүүхдээсээ өмнө байх дараалал */
  order: number[];
  hinge: ({ o: Vec3; u: Vec3; angle: number; a: Vec3; b: Vec3 } | null)[];
  /** Үндэс нүүрийг y = 0 хавтгайд (гадагш нормаль доош) тавих хувиргалт */
  align: Affine;
}

const near3 = (a: Vec3, b: Vec3) => dist(a, b) < 1e-7;

export function prepareNet(spec: NetSpec): PreparedNet {
  const all = spec.faces.flatMap((f) => f.pts);
  const c = centroid(all);
  const normal = (f: NetFace) => {
    let n = norm(newell(f.pts));
    if (dot(n, sub(centroid(f.pts), c)) < 0) n = [-n[0], -n[1], -n[2]];
    return n;
  };
  const hinge = spec.faces.map((f) => {
    if (f.parent < 0) return null;
    const P = spec.faces[f.parent];
    const shared = f.pts.filter((q) => P.pts.some((r) => near3(q, r)));
    if (shared.length < 2) throw new Error("Дэлгээсийн нүүр эцэгтэйгээ ирмэгээр холбогдоогүй");
    const [a, b] = shared;
    const u = norm(sub(b, a));
    const nF = normal(f), nP = normal(P);
    const angle = Math.atan2(dot(u, cross(nF, nP)), dot(nF, nP));
    return { o: a, u, angle, a, b };
  });
  const order: number[] = [];
  const root = spec.faces.findIndex((f) => f.parent < 0);
  order.push(root);
  for (let k = 0; k < order.length; k++) {
    spec.faces.forEach((f, i) => {
      if (f.parent === order[k]) order.push(i);
    });
  }
  // үндэс нүүрийг хэвтээ болгоно (октаэдр нүүрээрээ тавигдана)
  const nr = normal(spec.faces[root]);
  const down: Vec3 = [0, -1, 0];
  const ax = cross(nr, down);
  let align: Affine = IDENTITY;
  if (Math.hypot(ax[0], ax[1], ax[2]) > 1e-9) align = rotationAffine([0, 0, 0], norm(ax), Math.acos(Math.max(-1, Math.min(1, dot(nr, down)))));
  else if (dot(nr, down) < 0) align = rotationAffine([0, 0, 0], [1, 0, 0], Math.PI);
  const y0 = applyAffine(align, spec.faces[root].pts[0])[1];
  align = compose([1, 0, 0, 0, 0, 1, 0, -y0, 0, 0, 1, 0], align);
  return { spec, order, hinge, align };
}

/** Нүүр бүрийн хувиргалт: t=1 битүү, t=0 бүрэн дэлгэгдсэн */
export function netTransforms(pn: PreparedNet, t: number): Affine[] {
  const M: Affine[] = new Array(pn.spec.faces.length).fill(IDENTITY);
  for (const i of pn.order) {
    const f = pn.spec.faces[i];
    const h = pn.hinge[i];
    if (f.parent < 0 || !h) {
      M[i] = IDENTITY;
      continue;
    }
    M[i] = compose(M[f.parent], rotationAffine(h.o, h.u, h.angle * (1 - t)));
  }
  return M.map((m) => compose(pn.align, m));
}

export function foldNet(pn: PreparedNet, t: number): Vec3[][] {
  const M = netTransforms(pn, t);
  return pn.spec.faces.map((f, i) => f.pts.map((q) => applyAffine(M[i], q)));
}

/** Дэлгээсийн нийт талбай (нүүрүүдийн талбайн нийлбэр) */
export const netArea = (spec: NetSpec) => spec.faces.reduce((s, f) => s + polyArea(f.pts), 0);

/** Дэлгээсэд зурах ирмэг: онцлог ирмэг, эсвэл нугасгүй (зүсэгдсэн) ирмэг */
export function netEdgeDrawn(pn: PreparedNet, fi: number, k: number): boolean {
  const f = pn.spec.faces[fi];
  if (f.kinds[k] === "f") return true;
  const a = f.pts[k], b = f.pts[(k + 1) % f.pts.length];
  const isHinge = (h: PreparedNet["hinge"][number]) => !!h && ((near3(h.a, a) && near3(h.b, b)) || (near3(h.a, b) && near3(h.b, a)));
  if (isHinge(pn.hinge[fi])) return false;
  // хүүхэд нүүртэй нугас
  return !pn.spec.faces.some((g, gi) => g.parent === fi && isHinge(pn.hinge[gi]));
}

export function transformRef(M: Affine[], r: NetRef): Vec3 {
  return applyAffine(M[r.f], r.p);
}
