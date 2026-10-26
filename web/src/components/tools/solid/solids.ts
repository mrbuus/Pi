/* ============================================================================
 * Биетүүдийн тодорхойлолт: хэмжээ (параметр) → тор + нэрлэсэн цэг + шошго.
 *
 * Бүх биет суурь нь y = 0 хавтгай дээр, тэнхлэг нь y тэнхлэг дагуу.
 * Оройн нэр сурах бичгийн дагуу: суурь A B C D… (A урд-зүүн, цагийн зүүний
 * эсрэг биш — харагчаас A → B баруун тийш), дээд суурь A_1 B_1…, орой S,
 * суурийн төв O, дээд суурийн төв O_1.
 * ========================================================================== */

import type { Body, EdgeKind, Face, FaceTag } from "./body.ts";
import { add, dist, mid, mul, sub, type Vec3 } from "./vec.ts";

export type SolidKind =
  | "cube" | "box" | "prism" | "oblique" | "pyramid" | "gpyramid" | "tetra" | "frustum"
  | "cylinder" | "cone" | "fcone" | "sphere" | "octa";

export type Curved = "cyl" | "cone" | "fcone" | "sphere";

export interface ParamSpec {
  key: string;
  /** LaTeX тэмдэг (a, h, r…) */
  tex: string;
  /** Монгол нэр */
  name: string;
  min: number;
  max: number;
  step: number;
  def: number;
  int?: boolean;
  /** Энэ параметр харагдах нөхцөл */
  when?: (p: Params) => boolean;
}

export type Params = Record<string, number>;

export interface SolidInfo {
  kind: SolidKind;
  name: string;
  params: ParamSpec[];
  curved?: Curved;
}

const N: ParamSpec = { key: "n", tex: "n", name: "Суурийн өнцгийн тоо", min: 3, max: 8, step: 1, def: 4, int: true };

export const SOLIDS: SolidInfo[] = [
  { kind: "cube", name: "Куб", params: [{ key: "a", tex: "a", name: "Ирмэг", min: 0.5, max: 20, step: 0.5, def: 4 }] },
  {
    kind: "box",
    name: "Тэгш өнцөгт параллелепипед",
    params: [
      { key: "a", tex: "a", name: "Урт", min: 0.5, max: 20, step: 0.5, def: 5 },
      { key: "b", tex: "b", name: "Өргөн", min: 0.5, max: 20, step: 0.5, def: 3 },
      { key: "c", tex: "c", name: "Өндөр", min: 0.5, max: 20, step: 0.5, def: 4 },
    ],
  },
  {
    kind: "prism",
    name: "Зөв призм",
    params: [
      { ...N, def: 3 },
      { key: "a", tex: "a", name: "Суурийн тал", min: 0.5, max: 20, step: 0.5, def: 4 },
      { key: "h", tex: "h", name: "Өндөр", min: 0.5, max: 20, step: 0.5, def: 5 },
    ],
  },
  {
    kind: "oblique",
    name: "Налуу призм",
    params: [
      { ...N, def: 4 },
      { key: "a", tex: "a", name: "Суурийн тал", min: 0.5, max: 20, step: 0.5, def: 4 },
      { key: "h", tex: "h", name: "Өндөр", min: 0.5, max: 20, step: 0.5, def: 4 },
      { key: "d", tex: "d", name: "Хазайлт", min: -10, max: 10, step: 0.5, def: 2 },
    ],
  },
  {
    kind: "pyramid",
    name: "Зөв пирамид",
    params: [
      { ...N, def: 4 },
      { key: "a", tex: "a", name: "Суурийн тал", min: 0.5, max: 20, step: 0.5, def: 4 },
      { key: "h", tex: "h", name: "Өндөр", min: 0.5, max: 20, step: 0.5, def: 5 },
    ],
  },
  {
    kind: "gpyramid",
    name: "Пирамид (ерөнхий)",
    params: [
      { ...N, def: 4 },
      { key: "a", tex: "a", name: "Суурийн тал", min: 0.5, max: 20, step: 0.5, def: 4 },
      { key: "b", tex: "b", name: "Суурийн өргөн", min: 0.5, max: 20, step: 0.5, def: 3, when: (p) => p.n === 4 },
      { key: "h", tex: "h", name: "Өндөр", min: 0.5, max: 20, step: 0.5, def: 4 },
      { key: "dx", tex: "x_S", name: "Оройн шилжилт (баруун)", min: -10, max: 10, step: 0.5, def: -2 },
      { key: "dz", tex: "z_S", name: "Оройн шилжилт (урагш)", min: -10, max: 10, step: 0.5, def: 1.5 },
    ],
  },
  { kind: "tetra", name: "Зөв тетраэдр", params: [{ key: "a", tex: "a", name: "Ирмэг", min: 0.5, max: 20, step: 0.5, def: 4 }] },
  {
    kind: "frustum",
    name: "Тайрсан пирамид",
    params: [
      { ...N, def: 4 },
      { key: "a", tex: "a", name: "Доод суурийн тал", min: 0.5, max: 20, step: 0.5, def: 5 },
      { key: "b", tex: "b", name: "Дээд суурийн тал", min: 0.5, max: 20, step: 0.5, def: 2 },
      { key: "h", tex: "h", name: "Өндөр", min: 0.5, max: 20, step: 0.5, def: 4 },
    ],
  },
  {
    kind: "cylinder",
    name: "Цилиндр",
    curved: "cyl",
    params: [
      { key: "r", tex: "r", name: "Радиус", min: 0.5, max: 20, step: 0.5, def: 3 },
      { key: "h", tex: "h", name: "Өндөр", min: 0.5, max: 20, step: 0.5, def: 5 },
    ],
  },
  {
    kind: "cone",
    name: "Конус",
    curved: "cone",
    params: [
      { key: "r", tex: "r", name: "Радиус", min: 0.5, max: 20, step: 0.5, def: 3 },
      { key: "h", tex: "h", name: "Өндөр", min: 0.5, max: 20, step: 0.5, def: 4 },
    ],
  },
  {
    kind: "fcone",
    name: "Тайрсан конус",
    curved: "fcone",
    params: [
      { key: "R", tex: "R", name: "Доод радиус", min: 0.5, max: 20, step: 0.5, def: 4 },
      { key: "r", tex: "r", name: "Дээд радиус", min: 0.5, max: 20, step: 0.5, def: 2 },
      { key: "h", tex: "h", name: "Өндөр", min: 0.5, max: 20, step: 0.5, def: 4 },
    ],
  },
  { kind: "sphere", name: "Бөмбөрцөг", curved: "sphere", params: [{ key: "R", tex: "R", name: "Радиус", min: 0.5, max: 20, step: 0.5, def: 3 }] },
  { kind: "octa", name: "Зөв октаэдр", params: [{ key: "a", tex: "a", name: "Ирмэг", min: 0.5, max: 20, step: 0.5, def: 4 }] },
];

export const solidInfo = (k: SolidKind): SolidInfo => SOLIDS.find((s) => s.kind === k) ?? SOLIDS[0];

export function defaultParams(k: SolidKind): Params {
  const out: Params = {};
  for (const p of solidInfo(k).params) out[p.key] = p.def;
  return out;
}

/** Хязгаар, бүхэл тоо — гаднаас ирсэн (хадгалсан) утгыг аюулгүй болгоно */
export function sanitizeParams(k: SolidKind, raw: Partial<Params> | undefined): Params {
  const out: Params = {};
  for (const p of solidInfo(k).params) {
    let v = Number(raw?.[p.key]);
    if (!Number.isFinite(v)) v = p.def;
    v = Math.min(p.max, Math.max(p.min, v));
    if (p.int) v = Math.round(v);
    out[p.key] = v;
  }
  // тайрсан конус/пирамидад дээд суурь доодоосоо бага байх ёстой (тэнцүү бол призм/цилиндр)
  if (k === "fcone" && out.r >= out.R) out.r = Math.max(0.5, Math.min(out.R - 0.5, out.r));
  if (k === "frustum" && out.b >= out.a) out.b = Math.max(0.5, Math.min(out.a - 0.5, out.b));
  if (k === "fcone" && out.r >= out.R) out.R = out.r + 0.5;
  if (k === "frustum" && out.b >= out.a) out.a = out.b + 0.5;
  return out;
}

/* ------------------------------------------------------------ шошго -- */

export type AnnoGroup = "height" | "apothem" | "diag" | "radius";

export type Anno =
  /** Нэмэлт хэрчим (өндөр, апофем, диагональ, радиус) */
  | { t: "seg"; a: string; b: string; group: AnnoGroup; label?: string; value?: number; em?: boolean }
  /** Байгаа ирмэгийн хажууд хэмжээсийн шошго */
  | { t: "dim"; a: string; b: string; label: string; value: number }
  /** Тэгш өнцгийн тэмдэг */
  | { t: "right"; at: string; a: string; b: string; group: AnnoGroup };

export interface SolidModel {
  kind: SolidKind;
  params: Params;
  body: Body;
  /** Нэрлэсэн цэгүүд (орой + нэмэлт цэг) */
  points: Record<string, Vec3>;
  /** Жинхэнэ оройнууд — «оройн нэр» асаалттай үед үргэлж бичнэ */
  vertices: string[];
  annos: Anno[];
  /** Нэрлэсэн хоёр цэгийн хэрчим (огтлолын цэг сонгоход) */
  segments: [string, string][];
  curved?: Curved;
  /** Биетийн өндөр (y-ийн хамгийн их утга) */
  H: number;
  /** Тэнхлэгээс хамгийн хол цэгийн зай */
  span: number;
  /** Энэ биетэд байгаа нэмэлт шугамын бүлгүүд */
  groups: AnnoGroup[];
}

export const LETTERS = ["A", "B", "C", "D", "E", "F", "G", "H"];

/* ------------------------------------------------------------ туслах -- */

/** Зөв n өнцөгт: A урд-зүүн, B урд-баруун (AB нь x тэнхлэгтэй параллель, урд талд) */
export function regularRing(n: number, side: number, y: number): Vec3[] {
  const R = side / (2 * Math.sin(Math.PI / n));
  const out: Vec3[] = [];
  for (let i = 0; i < n; i++) {
    const t = Math.PI / 2 + Math.PI / n - (2 * Math.PI * i) / n;
    out.push([R * Math.cos(t), y, R * Math.sin(t)]);
  }
  return out;
}

const face = (pts: Vec3[], tag: FaceTag, kinds?: EdgeKind[], smooth?: boolean): Face => ({
  pts,
  kinds: kinds ?? pts.map(() => "f" as const),
  tag,
  smooth,
});

/** Призм/тайрсан пирамид: доод ба дээд олон өнцөгт (ижил тооны орой) */
function loft(bottom: Vec3[], top: Vec3[]): Face[] {
  const n = bottom.length;
  const faces: Face[] = [face(bottom.slice().reverse(), "base"), face(top.slice(), "top")];
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    faces.push(face([bottom[i], bottom[j], top[j], top[i]], "side"));
  }
  return faces;
}

function cone3(bottom: Vec3[], apex: Vec3): Face[] {
  const n = bottom.length;
  const faces: Face[] = [face(bottom.slice().reverse(), "base")];
  for (let i = 0; i < n; i++) faces.push(face([bottom[i], bottom[(i + 1) % n], apex], "side"));
  return faces;
}

function named(prefix: string[], pts: Vec3[], suffix = ""): Record<string, Vec3> {
  const out: Record<string, Vec3> = {};
  pts.forEach((p, i) => (out[`${prefix[i]}${suffix}`] = p));
  return out;
}

/** Нэрлэсэн оройнуудын хоорондох торын ирмэгүүд */
function namedEdges(body: Body, points: Record<string, Vec3>, names: string[]): [string, string][] {
  const find = (p: Vec3) => names.find((k) => dist(points[k], p) < 1e-7);
  const out: [string, string][] = [];
  const seen = new Set<string>();
  for (const f of body.faces) {
    for (let i = 0; i < f.pts.length; i++) {
      if (f.kinds[i] !== "f") continue;
      const a = find(f.pts[i]), b = find(f.pts[(i + 1) % f.pts.length]);
      if (!a || !b) continue;
      const key = [a, b].sort().join("|");
      if (seen.has(key)) continue;
      seen.add(key);
      out.push([a, b]);
    }
  }
  return out;
}

/* ------------------------------------------------- муруй гадаргуу -- */

/** Муруй биетийн тойргийн хуваалт (зурахад) */
export const SEG_DRAW = 72;

function circle(r: number, y: number, n: number): Vec3[] {
  const out: Vec3[] = [];
  for (let i = 0; i < n; i++) {
    const t = (2 * Math.PI * i) / n;
    out.push([r * Math.cos(t), y, r * Math.sin(t)]);
  }
  return out;
}

/** Цилиндр, тайрсан конус (r1 доод, r2 дээд) */
function roundLoft(r1: number, r2: number, h: number, n: number): Body {
  const b = circle(r1, 0, n), t = circle(r2, h, n);
  const faces: Face[] = [face(b.slice().reverse(), "base"), face(t.slice(), "top")];
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    faces.push(face([b[i], b[j], t[j], t[i]], "lateral", ["f", "s", "f", "s"], true));
  }
  return { faces };
}

function roundCone(r: number, h: number, n: number): Body {
  const b = circle(r, 0, n);
  const S: Vec3 = [0, h, 0];
  const faces: Face[] = [face(b.slice().reverse(), "base")];
  for (let i = 0; i < n; i++) faces.push(face([b[i], b[(i + 1) % n], S], "lateral", ["f", "s", "s"], true));
  return { faces };
}

function sphereBody(R: number, lon: number, lat: number): Body {
  const c: Vec3 = [0, R, 0];
  const P = (i: number, j: number): Vec3 => {
    const phi = Math.PI * (j / lat); // 0 = дээд туйл
    const th = (2 * Math.PI * i) / lon;
    return [R * Math.sin(phi) * Math.cos(th), R + R * Math.cos(phi), R * Math.sin(phi) * Math.sin(th)];
  };
  const faces: Face[] = [];
  for (let j = 0; j < lat; j++) {
    for (let i = 0; i < lon; i++) {
      const i2 = (i + 1) % lon;
      if (j === 0) faces.push(face([P(0, 0), P(i2, 1), P(i, 1)], "lateral", ["s", "s", "s"], true));
      else if (j === lat - 1) faces.push(face([P(i, j), P(i2, j), P(0, lat)], "lateral", ["s", "s", "s"], true));
      else faces.push(face([P(i, j), P(i2, j), P(i2, j + 1), P(i, j + 1)], "lateral", ["s", "s", "s", "s"], true));
    }
  }
  const eq: Vec3[] = [], en: Vec3[] = [];
  for (let i = 0; i <= 96; i++) {
    const t = (2 * Math.PI * i) / 96;
    const p: Vec3 = [R * Math.cos(t), R, R * Math.sin(t)];
    eq.push(p);
    en.push([Math.cos(t), 0, Math.sin(t)]);
  }
  return { faces, sphere: { c, R }, curves: [{ pts: eq, normals: en }] };
}

/* ------------------------------------------------------------ барих -- */

export interface BuildOptions {
  /** Муруй гадаргуугийн хуваалт (талбайн нарийн тооцоонд их утга) */
  segments?: number;
}

export function buildSolid(kind: SolidKind, raw: Partial<Params>, opts: BuildOptions = {}): SolidModel {
  const p = sanitizeParams(kind, raw);
  const seg = opts.segments ?? SEG_DRAW;
  const info = solidInfo(kind);
  let body: Body;
  let points: Record<string, Vec3> = {};
  let vertices: string[] = [];
  const annos: Anno[] = [];
  let extraSegs: [string, string][] = [];

  const prismLike = (bottom: Vec3[], top: Vec3[]) => {
    const n = bottom.length;
    body = { faces: loft(bottom, top) };
    points = { ...named(LETTERS, bottom), ...named(LETTERS, top, "_1") };
    vertices = [...LETTERS.slice(0, n), ...LETTERS.slice(0, n).map((l) => `${l}_1`)];
  };

  switch (kind) {
    case "cube":
    case "box": {
      const a = p.a, b = kind === "cube" ? p.a : p.b, c = kind === "cube" ? p.a : p.c;
      const bottom: Vec3[] = [[-a / 2, 0, b / 2], [a / 2, 0, b / 2], [a / 2, 0, -b / 2], [-a / 2, 0, -b / 2]];
      prismLike(bottom, bottom.map((q) => add(q, [0, c, 0])));
      if (kind === "cube") {
        annos.push({ t: "dim", a: "A", b: "B", label: "a", value: a });
      } else {
        annos.push({ t: "dim", a: "A", b: "B", label: "a", value: a });
        annos.push({ t: "dim", a: "B", b: "C", label: "b", value: b });
        annos.push({ t: "dim", a: "A", b: "A_1", label: "c", value: c });
      }
      annos.push({ t: "seg", a: "A", b: "C", group: "diag" });
      annos.push({ t: "seg", a: "A", b: "C_1", group: "diag", label: "d", value: Math.hypot(a, b, c), em: true });
      annos.push({ t: "right", at: "C", a: "A", b: "C_1", group: "diag" });
      break;
    }
    case "prism":
    case "oblique": {
      const n = p.n;
      const bottom = regularRing(n, p.a, 0);
      const shift: Vec3 = [kind === "oblique" ? p.d : 0, p.h, 0];
      prismLike(bottom, bottom.map((q) => add(q, shift)));
      annos.push({ t: "dim", a: "A", b: "B", label: "a", value: p.a });
      if (kind === "prism") {
        annos.push({ t: "dim", a: "B", b: "B_1", label: "h", value: p.h });
        if (n >= 4) {
          annos.push({ t: "seg", a: "A", b: "C", group: "diag" });
          annos.push({ t: "seg", a: "A", b: "C_1", group: "diag", label: "d", value: dist(points.A, points.C_1), em: true });
          annos.push({ t: "right", at: "C", a: "A", b: "C_1", group: "diag" });
        } else {
          annos.push({ t: "seg", a: "A", b: "B_1", group: "diag", label: "d", value: dist(points.A, points.B_1), em: true });
        }
      } else {
        points.H = [points.A_1[0], 0, points.A_1[2]];
        annos.push({ t: "seg", a: "A_1", b: "H", group: "height", label: "h", value: p.h });
        annos.push({ t: "right", at: "H", a: "A_1", b: "A", group: "height" });
        annos.push({ t: "dim", a: "B", b: "B_1", label: "l", value: dist(points.B, points.B_1) });
      }
      break;
    }
    case "pyramid":
    case "gpyramid":
    case "tetra": {
      const n = kind === "tetra" ? 3 : p.n;
      const side = p.a;
      let bottom: Vec3[];
      if (kind === "gpyramid" && n === 4) {
        const a = p.a, b = p.b;
        bottom = [[-a / 2, 0, b / 2], [a / 2, 0, b / 2], [a / 2, 0, -b / 2], [-a / 2, 0, -b / 2]];
      } else bottom = regularRing(n, side, 0);
      const h = kind === "tetra" ? side * Math.sqrt(2 / 3) : p.h;
      const apexName = kind === "tetra" ? "D" : "S";
      // gpyramid: «урагш» = +z (харагч руу); A урд талд байдаг тул dz>0 нь A тал руу
      const S: Vec3 = kind === "gpyramid" ? [p.dx, h, p.dz] : [0, h, 0];
      body = { faces: cone3(bottom, S) };
      points = { ...named(LETTERS, bottom), [apexName]: S, O: [0, 0, 0] };
      vertices = [...LETTERS.slice(0, n), apexName];
      annos.push({ t: "dim", a: "A", b: "B", label: "a", value: dist(points.A, points.B) });
      if (kind === "gpyramid") {
        points.H = [S[0], 0, S[2]];
        annos.push({ t: "seg", a: apexName, b: "H", group: "height", label: "h", value: h });
        const ref = dist(points.H, points.A) > 1e-6 ? "A" : "B";
        annos.push({ t: "right", at: "H", a: apexName, b: ref, group: "height" });
        if (n === 4) annos.push({ t: "dim", a: "B", b: "C", label: "b", value: p.b });
      } else {
        points.M = mid(points.A, points.B);
        annos.push({ t: "seg", a: apexName, b: "O", group: "height", label: "h", value: h });
        annos.push({ t: "right", at: "O", a: apexName, b: "M", group: "height" });
        const rin = dist(points.O, points.M);
        const m = Math.hypot(h, rin);
        annos.push({ t: "seg", a: apexName, b: "M", group: "apothem", label: kind === "tetra" ? undefined : "m", value: m, em: true });
        annos.push({ t: "seg", a: "O", b: "M", group: "apothem", label: "r", value: rin });
        annos.push({ t: "right", at: "M", a: apexName, b: "B", group: "apothem" });
        annos.push({ t: "seg", a: "O", b: "A", group: "radius", label: "R", value: dist(points.O, points.A) });
        extraSegs = [[apexName, "O"], [apexName, "M"]];
      }
      break;
    }
    case "frustum": {
      const n = p.n;
      prismLike(regularRing(n, p.a, 0), regularRing(n, p.b, p.h));
      points.O = [0, 0, 0];
      points.O_1 = [0, p.h, 0];
      points.M = mid(points.A, points.B);
      points.M_1 = mid(points.A_1, points.B_1);
      annos.push({ t: "dim", a: "A", b: "B", label: "a", value: p.a });
      annos.push({ t: "dim", a: "A_1", b: "B_1", label: "b", value: p.b });
      annos.push({ t: "seg", a: "O", b: "O_1", group: "height", label: "h", value: p.h });
      annos.push({ t: "right", at: "O", a: "O_1", b: "M", group: "height" });
      annos.push({ t: "seg", a: "M", b: "M_1", group: "apothem", label: "m", value: dist(points.M, points.M_1), em: true });
      annos.push({ t: "seg", a: "O", b: "M", group: "apothem" });
      annos.push({ t: "seg", a: "O_1", b: "M_1", group: "apothem" });
      extraSegs = [["O", "O_1"], ["M", "M_1"]];
      break;
    }
    case "octa": {
      const a = p.a, m = a / Math.SQRT2;
      const eq: Vec3[] = [[-a / 2, m, a / 2], [a / 2, m, a / 2], [a / 2, m, -a / 2], [-a / 2, m, -a / 2]];
      const E: Vec3 = [0, 2 * m, 0], F: Vec3 = [0, 0, 0];
      const faces: Face[] = [];
      for (let i = 0; i < 4; i++) {
        const j = (i + 1) % 4;
        faces.push(face([eq[i], eq[j], E], "side"));
        faces.push(face([eq[j], eq[i], F], i === 0 ? "base" : "side"));
      }
      body = { faces };
      points = { ...named(LETTERS, eq), E, F, O: [0, m, 0] };
      vertices = ["A", "B", "C", "D", "E", "F"];
      annos.push({ t: "dim", a: "A", b: "B", label: "a", value: a });
      annos.push({ t: "seg", a: "E", b: "F", group: "diag", label: "d", value: 2 * m, em: true });
      annos.push({ t: "seg", a: "A", b: "C", group: "diag" });
      break;
    }
    case "cylinder": {
      body = roundLoft(p.r, p.r, p.h, seg);
      points = { O: [0, 0, 0], O_1: [0, p.h, 0], A: [p.r, 0, 0], A_1: [p.r, p.h, 0], B: [0, 0, p.r] };
      annos.push({ t: "seg", a: "O", b: "A", group: "radius", label: "r", value: p.r, em: true });
      annos.push({ t: "seg", a: "O", b: "O_1", group: "height", label: "h", value: p.h });
      annos.push({ t: "seg", a: "A", b: "A_1", group: "radius" });
      annos.push({ t: "right", at: "O", a: "A", b: "O_1", group: "height" });
      extraSegs = [["O", "O_1"], ["O", "A"], ["A", "A_1"], ["O_1", "A_1"]];
      break;
    }
    case "cone": {
      body = roundCone(p.r, p.h, seg);
      points = { O: [0, 0, 0], S: [0, p.h, 0], A: [p.r, 0, 0], B: [0, 0, p.r] };
      vertices = ["S"];
      annos.push({ t: "seg", a: "O", b: "A", group: "radius", label: "r", value: p.r, em: true });
      annos.push({ t: "seg", a: "S", b: "O", group: "height", label: "h", value: p.h });
      annos.push({ t: "seg", a: "S", b: "A", group: "radius", label: "l", value: Math.hypot(p.r, p.h), em: true });
      annos.push({ t: "right", at: "O", a: "A", b: "S", group: "height" });
      extraSegs = [["S", "O"], ["O", "A"], ["S", "A"]];
      break;
    }
    case "fcone": {
      body = roundLoft(p.R, p.r, p.h, seg);
      points = { O: [0, 0, 0], O_1: [0, p.h, 0], A: [p.R, 0, 0], A_1: [p.r, p.h, 0], B: [0, 0, p.R] };
      annos.push({ t: "seg", a: "O", b: "A", group: "radius", label: "R", value: p.R, em: true });
      annos.push({ t: "seg", a: "O_1", b: "A_1", group: "radius", label: "r", value: p.r, em: true });
      annos.push({ t: "seg", a: "O", b: "O_1", group: "height", label: "h", value: p.h });
      annos.push({ t: "seg", a: "A", b: "A_1", group: "radius", label: "l", value: Math.hypot(p.h, p.R - p.r) });
      annos.push({ t: "right", at: "O", a: "A", b: "O_1", group: "height" });
      extraSegs = [["O", "O_1"], ["O", "A"], ["A", "A_1"], ["O_1", "A_1"]];
      break;
    }
    case "sphere": {
      const lon = Math.max(24, Math.round(seg / 2));
      const lat = 2 * Math.max(6, Math.round(lon / 4)); // тэгш — экватор торын шугам дээр
      body = sphereBody(p.R, lon, lat);
      points = { O: [0, p.R, 0], A: [p.R, p.R, 0] };
      annos.push({ t: "seg", a: "O", b: "A", group: "radius", label: "R", value: p.R, em: true });
      extraSegs = [["O", "A"]];
      break;
    }
  }

  const b = body!;
  let H = 0, span = 0;
  for (const f of b.faces) for (const q of f.pts) {
    H = Math.max(H, q[1]);
    span = Math.max(span, Math.hypot(q[0], q[2]));
  }
  const groups = [...new Set(annos.flatMap((a) => (a.t === "dim" ? [] : [a.group])))];
  const segs = [...namedEdges(b, points, vertices), ...extraSegs.filter(([x, y]) => points[x] && points[y])];
  return { kind, params: p, body: b, points, vertices, annos, segments: segs, curved: info.curved, H, span, groups };
}

/** Тэнхлэгийн дагуух хагас өндрийн цэг (харагдацын төв) */
export const modelCenter = (m: SolidModel): Vec3 => [0, m.H / 2, 0];

/** Хэрчмийн цэг (огтлолын цэг сонгоход) */
export const onSegment = (m: SolidModel, a: string, b: string, t: number): Vec3 =>
  add(m.points[a], mul(sub(m.points[b], m.points[a]), t));
