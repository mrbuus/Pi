/* ============================================================================
 * Огтлол: хавтгайг тодорхойлох (өндөр + налуу, эсвэл гурван цэг),
 * биетийг огтолж олон өнцөгт/муруйг олох, хэлбэрийг монголоор нэрлэх,
 * талбайг тоолох (боломжтой бол яг утгаар).
 * ========================================================================== */

import { corners, prepareBody, sectionPolygon, type Plane, type Prepared, type SectionPoly } from "./body.ts";
import { answerParts, answerTex, decTex, type AnswerParts } from "./measure.ts";
import { buildSolid, onSegment, type SolidModel } from "./solids.ts";
import { cross, dist, dot, len, norm, sub, type Vec3 } from "./vec.ts";

export type PointRef = { name: string } | { a: string; b: string; t: number };

export type SectionDef =
  | { how: "tilt"; y: number; tilt: number; turn: number; shift: number }
  | { how: "points"; pts: PointRef[] };

const D2R = Math.PI / 180;

export function resolvePoint(m: SolidModel, r: PointRef): Vec3 | null {
  if ("name" in r) return m.points[r.name] ?? null;
  if (!m.points[r.a] || !m.points[r.b]) return null;
  return onSegment(m, r.a, r.b, Math.min(1, Math.max(0, r.t)));
}

/** Нормалийг «дээш» чиглүүлнэ (n.y > 0; хэвтээ бол x, z-ээр) */
function orient(n: Vec3): Vec3 {
  const s = Math.abs(n[1]) > 1e-9 ? Math.sign(n[1]) : Math.abs(n[0]) > 1e-9 ? Math.sign(n[0]) : Math.sign(n[2]) || 1;
  return [n[0] * s, n[1] * s, n[2] * s];
}

export interface PlaneResult {
  plane: Plane | null;
  /** Хавтгайг тодорхойлсон цэгүүд (гурван цэгийн горимд) */
  defPts: Vec3[];
  error?: string;
}

/** Хавтгай: n·p = d, n нэгж, дээш чиглэсэн */
export function planeFrom(m: SolidModel, def: SectionDef): PlaneResult {
  if (def.how === "tilt") {
    const a = Math.min(90, Math.max(0, def.tilt)) * D2R, t = def.turn * D2R;
    const n: Vec3 = orient([Math.sin(a) * Math.cos(t), Math.cos(a), Math.sin(a) * Math.sin(t)]);
    const P0: Vec3 = [def.shift * Math.cos(t), def.y, def.shift * Math.sin(t)];
    return { plane: { n, d: dot(n, P0) }, defPts: [] };
  }
  const pts = def.pts.map((r) => resolvePoint(m, r));
  if (pts.length < 3 || pts.some((p) => !p)) return { plane: null, defPts: [], error: "Гурван цэгээ сонгоно уу" };
  const [A, B, C] = pts as Vec3[];
  if (dist(A, B) < 1e-9 || dist(B, C) < 1e-9 || dist(A, C) < 1e-9) return { plane: null, defPts: [A, B, C], error: "Гурван өөр цэг сонгоно уу" };
  const c = cross(sub(B, A), sub(C, A));
  if (len(c) < 1e-9 * dist(A, B) * dist(A, C)) return { plane: null, defPts: [A, B, C], error: "Гурван цэг нэг шулуун дээр байна" };
  const n = orient(norm(c));
  return { plane: { n, d: dot(n, A) }, defPts: [A, B, C] };
}

/* --------------------------------------------------- нэрлэх -- */

const NUM = ["", "", "", "Гурвалжин", "Дөрвөн өнцөгт", "Таван өнцөгт", "Зургаан өнцөгт", "Долоон өнцөгт", "Найман өнцөгт", "Есөн өнцөгт", "Арван өнцөгт"];

/** Олон өнцөгтийн хэлбэрийн нэр (булангууд нь эрэмбэтэй) */
export function polygonName(c: Vec3[]): string {
  const n = c.length;
  const L = c.map((p, i) => dist(p, c[(i + 1) % n]));
  const dir = c.map((p, i) => norm(sub(c[(i + 1) % n], p)));
  const eqL = (x: number, y: number) => Math.abs(x - y) <= 1e-6 * Math.max(x, y);
  const allEq = L.every((x) => eqL(x, L[0]));
  const perp = (i: number, j: number) => Math.abs(dot(dir[i], dir[j])) < 1e-6;
  const par = (i: number, j: number) => Math.abs(Math.abs(dot(dir[i], dir[j])) - 1) < 1e-9;
  // дотоод өнцгүүд тэнцүү эсэх
  const ang = c.map((_, i) => dot(dir[i], dir[(i + 1) % n]));
  const allAng = ang.every((x) => Math.abs(x - ang[0]) < 1e-6);
  if (n === 3) {
    if (allEq) return "Зөв гурвалжин";
    const right = perp(0, 1) || perp(1, 2) || perp(2, 0);
    const iso = eqL(L[0], L[1]) || eqL(L[1], L[2]) || eqL(L[2], L[0]);
    if (right && iso) return "Адил хажуут тэгш өнцөгт гурвалжин";
    if (right) return "Тэгш өнцөгт гурвалжин";
    if (iso) return "Адил хажуут гурвалжин";
    return "Гурвалжин";
  }
  if (n === 4) {
    const rect = perp(0, 1) && perp(1, 2) && perp(2, 3);
    if (rect) return allEq ? "Квадрат" : "Тэгш өнцөгт";
    const p02 = par(0, 2), p13 = par(1, 3);
    if (p02 && p13) return allEq ? "Ромб" : "Параллелограмм";
    if (p02 || p13) {
      const legs = p02 ? [1, 3] : [0, 2];
      if (eqL(L[legs[0]], L[legs[1]])) return "Адил хажуут трапец";
      const bases = p02 ? [0, 2] : [1, 3];
      if (perp(legs[0], bases[0]) || perp(legs[1], bases[0])) return "Тэгш өнцөгт трапец";
      return "Трапец";
    }
    return "Дөрвөн өнцөгт";
  }
  const base = NUM[n] ?? `${n} өнцөгт`;
  if (allEq && allAng) return `Зөв ${base.charAt(0).toLowerCase()}${base.slice(1)}`;
  return base;
}

/* --------------------------------------------------- огтлол -- */

export interface SectionInfo {
  poly: SectionPoly;
  /** Булангийн оройнууд (хэлбэр тодорхойлох, нэрлэх) */
  corners: Vec3[];
  name: string;
  area: number;
  /** Талбайн LaTeX хариу (\approx-той байж болно) */
  areaTex: string;
  /** Муруй биетийн огтлол (хүрээ нь муруй) */
  curvedEdge: boolean;
  /** Картад: яг хэлбэр ба ойролцоо утга тусдаа */
  parts: AnswerParts;
}

/** Нарийн тороор ойролцоолсон талбай — яг хэлбэр хайхгүй */
const approxOnly = (x: number): AnswerParts => ({ exact: null, approx: decTex(x) });

/** Муруй биетийн талбайг нарийн тооцох тор (харагдацын тороос нягт) */
export function finePrepared(m: SolidModel): Prepared | null {
  if (!m.curved || m.curved === "sphere") return null;
  return prepareBody(buildSolid(m.kind, m.params, { segments: 720 }).body);
}

const near0 = (x: number, eps = 1e-7) => Math.abs(x) <= eps;

export function sectionInfo(m: SolidModel, prep: Prepared, plane: Plane, fine?: Prepared | null): SectionInfo | null {
  const poly = sectionPolygon(prep, plane);
  const p = m.params;
  const n = norm(plane.n);
  const alpha = Math.acos(Math.min(1, Math.abs(n[1]))) / D2R; // хэвтээтэй үүсгэх өнцөг

  if (m.curved === "sphere") {
    const c: Vec3 = [0, p.R, 0];
    const e = Math.abs(dot(n, c) - plane.d);
    if (e >= p.R - 1e-9 || !poly) return null;
    const rho2 = p.R * p.R - e * e;
    return { poly, corners: poly.pts, name: "Тойрог", area: Math.PI * rho2, areaTex: answerTex(Math.PI * rho2, true), curvedEdge: true, parts: answerParts(Math.PI * rho2, true) };
  }
  if (!poly) return null;

  if (!m.curved) {
    const cs = corners(poly.pts);
    return { poly, corners: cs, name: polygonName(cs), area: poly.area, areaTex: answerTex(poly.area), curvedEdge: false, parts: answerParts(poly.area) };
  }

  // ---- муруй биет ----
  const H = m.H;
  const fineSec = fine ? sectionPolygon(fine, plane) : null;
  let area = fineSec ? fineSec.area : poly.area;
  let exact: string | null = null;
  let parts: AnswerParts | null = null;
  const onCap = poly.pts.some((q) => near0(q[1]) || near0(q[1] - H));
  const touchesCapEdge = poly.faces.some((fs) => fs.some((fi) => prep.body.faces[fi].tag !== "lateral"));
  const caps = onCap && touchesCapEdge;
  let name: string;
  const horizontal = alpha < 0.05;
  const vertical = alpha > 89.95;
  const y0 = horizontal ? plane.d / n[1] : 0;

  if (m.curved === "cyl") {
    const r = p.r;
    if (horizontal) {
      name = "Тойрог";
      area = Math.PI * r * r;
      exact = answerTex(area, true);
      parts = answerParts(area, true);
    } else if (vertical) {
      name = "Тэгш өнцөгт";
      const e = Math.abs(plane.d);
      area = 2 * Math.sqrt(Math.max(0, r * r - e * e)) * H;
      exact = answerTex(area);
      parts = answerParts(area);
    } else if (!caps) {
      name = "Эллипс";
      area = (Math.PI * r * r) / Math.cos(alpha * D2R);
      exact = answerTex(area, true);
      parts = answerParts(area, true);
    } else name = "Эллипсийн хэсэг";
  } else {
    const R = m.curved === "cone" ? p.r : p.R;
    const rt = m.curved === "cone" ? 0 : p.r;
    const apexH = (H * R) / (R - rt); // (бодит эсвэл төсөөллийн) оройн өндөр
    const apex: Vec3 = [0, apexH, 0];
    const throughApex = Math.abs(dot(n, apex) - plane.d) < 1e-7 * Math.max(1, apexH);
    const beta = Math.atan2(H, R - rt) / D2R;
    if (horizontal) {
      name = "Тойрог";
      const rho = R + ((rt - R) * y0) / H;
      area = Math.PI * rho * rho;
      exact = answerTex(area, true);
      parts = answerParts(area, true);
    } else if (throughApex) {
      name = m.curved === "cone" ? "Адил хажуут гурвалжин" : "Адил хажуут трапец";
      exact = null;
    } else if (alpha < beta - 0.05) {
      name = caps ? "Эллипсийн хэсэг" : "Эллипс";
    } else if (alpha <= beta + 0.05) {
      name = "Параболын хэсэг";
    } else name = "Гиперболын хэсэг";
    // оройгоор дайрсан огтлолыг яг тооцоолно (хөвч нь тойргийн дагуу)
    if (throughApex) {
      const chord = (y: number, rho: number): [Vec3, Vec3] | null => {
        // n·(x, y, z) = d, x² + z² = rho²
        const a = n[0], c = n[2], k = plane.d - n[1] * y;
        const hn = Math.hypot(a, c);
        if (hn < 1e-12) return null;
        const e = k / hn;
        if (Math.abs(e) > rho) return null;
        const ux = a / hn, uz = c / hn; // хэвтээ нормаль
        const w = Math.sqrt(rho * rho - e * e);
        return [[ux * e - uz * w, y, uz * e + ux * w], [ux * e + uz * w, y, uz * e - ux * w]];
      };
      const b = chord(0, R);
      if (b) {
        if (m.curved === "cone") {
          area = len(cross(sub(b[0], apex), sub(b[1], apex))) / 2;
        } else {
          // трапецийн өндөр = H / sin(α) — хавтгай дээрх хоёр хөвчийн зай
          const t = chord(H, rt);
          if (t) area = ((dist(b[0], b[1]) + dist(t[0], t[1])) / 2) * (H / Math.sin(alpha * D2R));
        }
        exact = answerTex(area);
        parts = answerParts(area);
      }
    }
  }
  return { poly, corners: poly.pts, name, area, areaTex: exact ?? answerTex(area), curvedEdge: true, parts: parts ?? approxOnly(area) };
}
