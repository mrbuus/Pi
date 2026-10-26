/* ============================================================================
 * «Загвар» горимд зураг дээрх цэгийг чирж хэмжээг өөрчлөх (цэвэр логик).
 *   - Гурвалжин: орой бүр чирэгдэнэ → 3 тал (SSS), чирсэн байрлал (pose)
 *   - Тэгш өнцөгт/квадрат: C орой → талууд
 *   - Параллелограмм: B → a, D → b ба α; ромб: D → тал ба α
 *   - Трапец: C → дээд суурь ба өндөр, D → доод суурь
 *   - Зөв олон өнцөгт: орой → тал; тойрог: K → радиус, B → төв өнцөг, P → зай
 * Утгыг 0.1 алхамаар, бүхэл тоонд ойр бол бүхлээр (niceStep).
 * Тест: drag.test.mjs
 * ========================================================================== */

import { type Pt, type Tri, dist, placeTriangle, toDeg } from "./geom.ts";
import { niceStep } from "./fmt.ts";
import type { Params } from "./shapes.ts";

export interface DragResult {
  p: Params;
  /** Гурвалжны чирсэн оройнууд [A, B, C] */
  pose?: Pt[];
}

const clamp = (x: number, a: number, b: number) => Math.min(b, Math.max(a, x));
const MAX = 100;
const len = (x: number) => clamp(niceStep(x), 0.1, MAX);
const deg = (x: number, lo = 1, hi = 179) => clamp(Math.round(x), lo, hi);

/**
 * id-тай цэгийг w (математик координат) руу чирэхэд шинэ параметр.
 * verts — гурвалжны одоогийн оройнууд [A, B, C]. Боломжгүй бол null.
 */
export function applyDrag(p: Params, id: string, w: Pt, verts?: Pt[]): DragResult | null {
  switch (p.shape) {
    case "triangle": {
      if (!verts || verts.length !== 3) return null;
      const k = "ABC".indexOf(id);
      if (k < 0) return null;
      const v = verts.map((q, i) => (i === k ? w : q));
      const [A, B, C] = v;
      const a = dist(B, C), b = dist(C, A), c = dist(A, B);
      const m = Math.max(a, b, c);
      const area2 = Math.abs((B.x - A.x) * (C.y - A.y) - (C.x - A.x) * (B.y - A.y));
      if (m < 0.2 || area2 < 0.02 * m * m) return null; // хэт хавтгай
      const [ra, rb, rc] = [len(a), len(b), len(c)];
      if (!(ra + rb > rc && rb + rc > ra && ra + rc > rb)) return null;
      return { p: { ...p, triKind: "sss", a: ra, b: rb, c: rc, ssaAlt: false }, pose: v };
    }
    case "rectangle":
      if (id !== "C") return null;
      return { p: { ...p, rw: len(w.x), rh: len(w.y) } };
    case "square":
      if (id !== "C") return null;
      return { p: { ...p, sq: len(Math.max(w.x, w.y)) } };
    case "parallelogram":
      if (id === "B") return { p: { ...p, pa: len(w.x) } };
      if (id === "D") {
        if (w.y <= 0.05) return null;
        return { p: { ...p, pb: len(Math.hypot(w.x, w.y)), palpha: deg(toDeg(Math.atan2(w.y, w.x))) } };
      }
      return null;
    case "rhombus":
      if (id !== "D" || p.rhKind !== "angle" || w.y <= 0.05) return null;
      return { p: { ...p, rha: len(Math.hypot(w.x, w.y)), rhAlpha: deg(toDeg(Math.atan2(w.y, w.x))) } };
    case "trapezoid": {
      if (p.trKind === "legs") return null;
      if (id === "D") return { p: { ...p, ta: len(w.x) } };
      if (id === "C") {
        const tb = p.trKind === "iso" ? 2 * w.x - p.ta : w.x;
        return { p: { ...p, th: len(w.y), tb: len(tb) } };
      }
      return null;
    }
    case "polygon": {
      if (id !== "V") return null;
      const n = Math.round(p.n);
      return { p: { ...p, pside: len(2 * Math.hypot(w.x, w.y) * Math.sin(Math.PI / n)) } };
    }
    case "circle": {
      const R = Math.hypot(w.x, w.y);
      if (id === "K") return { p: { ...p, r: len(p.rAsD ? 2 * R : R) } };
      if (id === "B") {
        // B = polar(O, r, -90° + θ/2)
        let a = toDeg(Math.atan2(w.y, w.x)) + 90;
        if (a < 0) a += 360;
        return { p: { ...p, theta: deg(2 * a, 1, 359) } };
      }
      if (id === "P") {
        const r = p.rAsD ? p.r / 2 : p.r;
        return { p: { ...p, tanD: clamp(niceStep(Math.max(R, r + 0.1)), 0.1, 200) } };
      }
      return null;
    }
  }
}

/**
 * Чирж дууссаны дараа: бөөрөнхийлсөн талуудаар гурвалжныг яг байгуулж,
 * чирсэн байрлалын чиглэл, эргэлтийг хадгална (зураг үсрэхгүй).
 */
export function settlePose(t: Pick<Tri, "a" | "b" | "c">, pose: Pt[]): Pt[] {
  const [A0, B0, C0] = pose;
  const can = placeTriangle(t);
  const ang = Math.atan2(C0.y - B0.y, C0.x - B0.x);
  const cr = (C0.x - B0.x) * (A0.y - B0.y) - (C0.y - B0.y) * (A0.x - B0.x);
  const flip = cr < 0 ? -1 : 1;
  const cs = Math.cos(ang), sn = Math.sin(ang);
  const T = (q: Pt): Pt => {
    const y = q.y * flip;
    return { x: B0.x + q.x * cs - y * sn, y: B0.y + q.x * sn + y * cs };
  };
  return [T(can.A), T(can.B), T(can.C)];
}
