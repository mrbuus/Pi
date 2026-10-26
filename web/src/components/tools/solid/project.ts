/* ============================================================================
 * Проекц ба харагдах байдал — WebGL-гүй, цэвэр SVG-д зориулсан.
 *
 * Гурван төрөл:
 *   persp   — перспектив (ойрын ирмэг томорно, жинхэнэ 3D мэдрэмж)
 *   ortho   — параллель (аксонометр, изометр)
 *   oblique — ташуу кабинет проекц (сурах бичгийн хэв: урд нүүр жинхэнэ
 *             хэлбэрээрээ, гүн 45°-аар хагас урттай)
 *
 * Гүдгэр биетэд нүүр харагдах эсэхийг гадагш нормаль харагч руу чиглэсэн
 * эсэхээр тодорхойлно — painter-ийн эрэмбэ шаардлагагүй, үнэн зөв.
 * Ирмэг: аль нэг хөрш нүүр нь харагдвал харагдана, үгүй бол нуугдсан.
 * ========================================================================== */

import { keptByClips, type Prepared } from "./body.ts";
import { add, basis, dot, len, mul, norm, sub, type Vec3 } from "./vec.ts";

export type Proj = "persp" | "ortho" | "oblique";

export interface View {
  /** Босоо тэнхлэгийг тойрох эргэлт (градус) */
  yaw: number;
  /** Дээрээс харах өнцөг (градус, 90 = яг дээрээс) */
  pitch: number;
  zoom: number;
  proj: Proj;
}

export type P2 = [number, number];

export interface Camera {
  /** Дэлгэцийн цэг (SVG координат, y доош) */
  screen(p: Vec3): P2;
  /** Гүн — их байх тусам харагчид ойр */
  depth(p: Vec3): number;
  /** Нормаль n-тэй, p цэг дээрх гадаргуу харагч руу харсан уу */
  facing(n: Vec3, p: Vec3): boolean;
  /** p цэгээс харагч руу чиглэсэн нэгж вектор (дэлхийн координатад) */
  toward(p: Vec3): Vec3;
  /** Перспективт харагчийн байрлал */
  eye: Vec3 | null;
  scale: number;
}

const D2R = Math.PI / 180;
/** Перспективын камерын зай (хүрээлсэн бөмбөрцгийн радиусаар) */
export const PERSP_K = 4.2;
const OBLIQUE_K = 0.5;
const OB_C = Math.cos(45 * D2R), OB_S = Math.sin(45 * D2R);

export function makeCamera(view: View, w: number, h: number, center: Vec3, radius: number): Camera {
  const cy = Math.cos(view.yaw * D2R), sy = Math.sin(view.yaw * D2R);
  const cp = Math.cos(view.pitch * D2R), sp = Math.sin(view.pitch * D2R);
  const R = Math.max(radius, 1e-6);
  // дэлхий → харагдац: эхлээд y тэнхлэгээр (yaw), дараа нь x тэнхлэгээр (pitch)
  const rot = (v: Vec3): Vec3 => {
    const x1 = v[0] * cy + v[2] * sy;
    const z1 = -v[0] * sy + v[2] * cy;
    return [x1, v[1] * cp - z1 * sp, v[1] * sp + z1 * cp];
  };
  const inv = (v: Vec3): Vec3 => {
    const y = v[1] * cp + v[2] * sp;
    const z1 = -v[1] * sp + v[2] * cp;
    return [v[0] * cy - z1 * sy, y, v[0] * sy + z1 * cy];
  };
  const D = PERSP_K * R;
  // Утасны босоо талбайд өргөн нь хязгаарладаг — өндөр илүү бол бага зэрэг томруулж дүүргэнэ
  const portrait = h > w ? Math.min(1.15, h / w) : 1;
  const base = (0.4 * Math.min(w, h) * portrait) / R;
  const scale = view.zoom * (view.proj === "persp" ? base * ((D - R) / D) : view.proj === "oblique" ? base * 0.92 : base);
  const W: Vec3 = [OBLIQUE_K * OB_C, OBLIQUE_K * OB_S, 1];
  const Wn = norm(W);
  const cx = w / 2, cyy = h / 2;
  const eye = view.proj === "persp" ? add(inv([0, 0, D]), center) : null;
  const parallelDir = view.proj === "oblique" ? inv(Wn) : inv([0, 0, 1]);

  return {
    screen(p) {
      const q = rot(sub(p, center));
      if (view.proj === "persp") {
        const f = D / Math.max(1e-6, D - q[2]);
        return [cx + q[0] * f * scale, cyy - q[1] * f * scale];
      }
      if (view.proj === "oblique") return [cx + (q[0] - OBLIQUE_K * q[2] * OB_C) * scale, cyy - (q[1] - OBLIQUE_K * q[2] * OB_S) * scale];
      return [cx + q[0] * scale, cyy - q[1] * scale];
    },
    depth(p) {
      const q = rot(sub(p, center));
      return view.proj === "oblique" ? dot(q, Wn) : q[2];
    },
    facing(n, p) {
      return dot(n, this.toward(p)) > 1e-9;
    },
    toward(p) {
      return eye ? norm(sub(eye, p)) : parallelDir;
    },
    eye,
    scale,
  };
}

/** Бэлэн өнцгүүд */
export const PRESETS: Record<"front" | "top" | "side" | "iso" | "default", Pick<View, "yaw" | "pitch">> = {
  default: { yaw: -28, pitch: 18 },
  front: { yaw: 0, pitch: 0 },
  top: { yaw: 0, pitch: 90 },
  side: { yaw: -90, pitch: 0 },
  iso: { yaw: -45, pitch: 35.264 },
};

/* ---------------------------------------------------------- кадр -- */

export interface FrameFace {
  idx: number;
  pts: P2[];
  front: boolean;
  /** 0..1 гэрэлтүүлэг (Ламберт) */
  shade: number;
  depth: number;
}

export interface FrameEdge {
  a: P2;
  b: P2;
  hidden: boolean;
  /** Гөлгөр гадаргуугийн хүрээ (байгуулагч) */
  sil: boolean;
  /** Огтлолын нүүрийн ирмэг */
  section: boolean;
}

export interface Frame {
  faces: FrameFace[];
  edges: FrameEdge[];
  /** Гөлгөр гадаргуутай биетийн проекцийн гүдгэр бүрхүүл (будахад) */
  hull: P2[] | null;
  /** Бөмбөрцгийн хүрээ ба экватор (харагдах/нуугдсан хэрчмүүд) */
  curveSegs: FrameEdge[];
  front: boolean[];
}

const LIGHT = norm([-0.45, 0.75, 0.5]);

/** Андрюгийн гүдгэр бүрхүүл */
export function convexHull(pts: P2[]): P2[] {
  const p = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  if (p.length < 3) return p;
  const crossZ = (o: P2, a: P2, b: P2) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower: P2[] = [], upper: P2[] = [];
  for (const q of p) {
    while (lower.length >= 2 && crossZ(lower[lower.length - 2], lower[lower.length - 1], q) <= 0) lower.pop();
    lower.push(q);
  }
  for (let i = p.length - 1; i >= 0; i--) {
    const q = p[i];
    while (upper.length >= 2 && crossZ(upper[upper.length - 2], upper[upper.length - 1], q) <= 0) upper.pop();
    upper.push(q);
  }
  return [...lower.slice(0, -1), ...upper.slice(0, -1)];
}

/** Нүүр бүр харагдах эсэх */
export function faceFronts(prep: Prepared, cam: Camera): boolean[] {
  return prep.body.faces.map((_, i) => cam.facing(prep.normals[i], prep.centers[i]));
}

export function buildFrame(prep: Prepared, cam: Camera): Frame {
  const body = prep.body;
  const front = faceFronts(prep, cam);
  const lightW = LIGHT; // харагдацын биш, дэлхийн координатын гэрэл — эргүүлэхэд сүүдэр хөдөлнө
  const faces: FrameFace[] = body.faces.map((f, i) => ({
    idx: i,
    pts: f.pts.map((p) => cam.screen(p)),
    front: front[i],
    shade: Math.max(0, dot(prep.normals[i], lightW)),
    depth: cam.depth(prep.centers[i]),
  }));
  const edges: FrameEdge[] = [];
  for (const e of prep.edges) {
    const fr = e.faces.map((fi) => front[fi]);
    const section = e.faces.some((fi) => body.faces[fi].tag === "section");
    if (e.kind === "f") {
      edges.push({ a: cam.screen(e.a), b: cam.screen(e.b), hidden: !fr.some(Boolean), sil: false, section });
    } else if (!body.sphere && fr.length === 2 && fr[0] !== fr[1]) {
      edges.push({ a: cam.screen(e.a), b: cam.screen(e.b), hidden: false, sil: true, section });
    }
  }
  const smooth = body.faces.some((f) => f.smooth);
  let hull: P2[] | null = null;
  if (smooth) {
    const all: P2[] = [];
    for (const f of faces) for (const p of f.pts) all.push(p);
    hull = convexHull(all);
  }
  const curveSegs: FrameEdge[] = [];
  if (body.sphere) {
    const { c, R } = body.sphere;
    // аналитик хүрээ: харагчаас бөмбөрцөгт татсан шүргэгч конусын тойрог
    let cc: Vec3, rad: number, nrm: Vec3;
    if (cam.eye) {
      const v = sub(cam.eye, c);
      const L = len(v);
      cc = add(c, mul(v, (R * R) / (L * L)));
      rad = R * Math.sqrt(Math.max(0, 1 - (R * R) / (L * L)));
      nrm = norm(v);
    } else {
      cc = c;
      rad = R;
      nrm = cam.toward(c);
    }
    const [u, w] = basis(nrm);
    const K = 160;
    const pt = (k: number) => add(cc, add(mul(u, Math.cos((2 * Math.PI * k) / K) * rad), mul(w, Math.sin((2 * Math.PI * k) / K) * rad)));
    for (let k = 0; k < K; k++) {
      const a = pt(k), b = pt(k + 1);
      if (!keptByClips(body, a, 1e-6) || !keptByClips(body, b, 1e-6)) continue;
      curveSegs.push({ a: cam.screen(a), b: cam.screen(b), hidden: false, sil: true, section: false });
    }
  }
  for (const cv of body.curves ?? []) {
    for (let k = 0; k + 1 < cv.pts.length; k++) {
      const a = cv.pts[k], b = cv.pts[k + 1];
      if (!keptByClips(body, a, 1e-6) || !keptByClips(body, b, 1e-6)) continue;
      const nm = norm(add(cv.normals[k], cv.normals[k + 1]));
      const m = mul(add(a, b), 0.5);
      curveSegs.push({ a: cam.screen(a), b: cam.screen(b), hidden: !cam.facing(nm, m), sil: false, section: false });
    }
  }
  return { faces, edges, hull, curveSegs, front };
}

/**
 * Биет дотор/гадаргуу дээрх хэрчим харагдах уу: хоёр төгсгөл нь харагдах
 * нэг нүүр дээр байвал харагдана; биетийн дотуур эсвэл ар талын нүүрээр
 * явбал нуугдана (тасархай).
 */
export function segmentVisible(prep: Prepared, front: boolean[], a: Vec3, b: Vec3): boolean {
  const eps = 1e-6 * Math.max(1, prep.radius);
  for (let i = 0; i < prep.body.faces.length; i++) {
    if (!front[i]) continue;
    const n = prep.normals[i], p0 = prep.body.faces[i].pts[0];
    if (Math.abs(dot(n, sub(a, p0))) < eps && Math.abs(dot(n, sub(b, p0))) < eps) return true;
  }
  return false;
}
