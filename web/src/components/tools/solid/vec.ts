/* ============================================================================
 * 3D векторын жижиг туслахууд — импортгүй, цэвэр функц.
 * Координат: x баруун, y дээш, z харагч руу (баруун гарын систем).
 * ========================================================================== */

export type Vec3 = readonly [number, number, number];

export const v3 = (x: number, y: number, z: number): Vec3 => [x, y, z];
export const add = (a: Vec3, b: Vec3): Vec3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const mul = (a: Vec3, k: number): Vec3 => [a[0] * k, a[1] * k, a[2] * k];
export const dot = (a: Vec3, b: Vec3): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const cross = (a: Vec3, b: Vec3): Vec3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
export const len = (a: Vec3): number => Math.hypot(a[0], a[1], a[2]);
export const dist = (a: Vec3, b: Vec3): number => len(sub(a, b));
export const norm = (a: Vec3): Vec3 => {
  const l = len(a);
  return l < 1e-15 ? [0, 0, 0] : [a[0] / l, a[1] / l, a[2] / l];
};
export const lerp = (a: Vec3, b: Vec3, t: number): Vec3 => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
];
export const mid = (a: Vec3, b: Vec3): Vec3 => lerp(a, b, 0.5);

export function centroid(pts: readonly Vec3[]): Vec3 {
  let x = 0, y = 0, z = 0;
  for (const p of pts) { x += p[0]; y += p[1]; z += p[2]; }
  const n = pts.length || 1;
  return [x / n, y / n, z / n];
}

/** Ньюэллийн арга: олон өнцөгтийн нормаль (урт = 2·талбай) */
export function newell(pts: readonly Vec3[]): Vec3 {
  let x = 0, y = 0, z = 0;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length];
    x += (a[1] - b[1]) * (a[2] + b[2]);
    y += (a[2] - b[2]) * (a[0] + b[0]);
    z += (a[0] - b[0]) * (a[1] + b[1]);
  }
  return [x, y, z];
}

/** Хавтгай олон өнцөгтийн талбай */
export const polyArea = (pts: readonly Vec3[]): number => len(newell(pts)) / 2;

/** n-д перпендикуляр хоёр нэгж вектор (хавтгайн суурь) */
export function basis(n: Vec3): [Vec3, Vec3] {
  const nn = norm(n);
  const helper: Vec3 = Math.abs(nn[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
  const u = norm(cross(nn, helper));
  const w = cross(nn, u);
  return [u, w];
}

/** p-г тэнхлэг (o цэгээр дайрах, нэгж u чиглэл) тойруулан θ өнцгөөр эргүүлнэ (Родригес) */
export function rotateAround(p: Vec3, o: Vec3, u: Vec3, th: number): Vec3 {
  const v = sub(p, o);
  const c = Math.cos(th), s = Math.sin(th);
  const r = add(add(mul(v, c), mul(cross(u, v), s)), mul(u, dot(u, v) * (1 - c)));
  return add(r, o);
}

/* ---------- 3×4 аффин матриц (эргэлт + шилжилт) ---------- */

/** [r00 r01 r02 tx; r10 r11 r12 ty; r20 r21 r22 tz] мөрөөр */
export type Affine = readonly number[];

export const IDENTITY: Affine = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0];

export function applyAffine(m: Affine, p: Vec3): Vec3 {
  return [
    m[0] * p[0] + m[1] * p[1] + m[2] * p[2] + m[3],
    m[4] * p[0] + m[5] * p[1] + m[6] * p[2] + m[7],
    m[8] * p[0] + m[9] * p[1] + m[10] * p[2] + m[11],
  ];
}

/** a∘b (эхлээд b, дараа нь a) */
export function compose(a: Affine, b: Affine): Affine {
  const out = new Array<number>(12);
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 4; c++) {
      let s = c === 3 ? a[r * 4 + 3] : 0;
      for (let k = 0; k < 3; k++) s += a[r * 4 + k] * b[k * 4 + c];
      out[r * 4 + c] = s;
    }
  }
  return out;
}

/** o цэгээр дайрах u тэнхлэгийг тойрох θ эргэлтийн матриц */
export function rotationAffine(o: Vec3, u: Vec3, th: number): Affine {
  const [x, y, z] = norm(u);
  const c = Math.cos(th), s = Math.sin(th), t = 1 - c;
  const r = [
    t * x * x + c, t * x * y - s * z, t * x * z + s * y,
    t * x * y + s * z, t * y * y + c, t * y * z - s * x,
    t * x * z - s * y, t * y * z + s * x, t * z * z + c,
  ];
  // p' = R(p - o) + o = Rp + (o - Ro)
  const ro: Vec3 = [
    r[0] * o[0] + r[1] * o[1] + r[2] * o[2],
    r[3] * o[0] + r[4] * o[1] + r[5] * o[2],
    r[6] * o[0] + r[7] * o[1] + r[8] * o[2],
  ];
  return [
    r[0], r[1], r[2], o[0] - ro[0],
    r[3], r[4], r[5], o[1] - ro[1],
    r[6], r[7], r[8], o[2] - ro[2],
  ];
}

/** Тоон ойролцоо тэнцүү */
export const near = (a: number, b: number, eps = 1e-9) => Math.abs(a - b) <= eps * Math.max(1, Math.abs(a), Math.abs(b));
export const samePt = (a: Vec3, b: Vec3, eps = 1e-7) => dist(a, b) <= eps;
