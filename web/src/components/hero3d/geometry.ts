/* ============================================================================
 * Нүүр хуудасны биетүүдийн ЦЭВЭР геометр — React, DOM, гадаад сангүй.
 *
 * ЯАГААД ГАРААР БИЧСЭН БЭ:
 * Өмнө нь энэ хэсэг three.js (@react-three/fiber + drei) дээр байсан. Тэр нь
 * ~600KB нэмдэг тул хассан. Оронд нь тавьсан «эргэлддэг SVG тойрог» нь 3D
 * БИШ байсан: хавтгай дүрсийг rotateY хийхэд өргөн нь cos(θ)-оор л агшдаг
 * тул зөвхөн хавчигдаад буцдаг — «Куб» гэж бичээд бөмбөлөг харуулж байв.
 *
 * Энд бодит оройнуудыг эргүүлж, перспективээр проекц хийнэ. Код бага, сан
 * шаардахгүй, гэхдээ жинхэнэ 3D байдлаар уншигдана.
 *
 * Цэвэр функц тул шууд тестлэгдэнэ (geometry.test.mjs).
 * ========================================================================== */

export type Vec3 = readonly [number, number, number];

/** Хэмжигдэхүүний өнгөний түлхүүр — catalog.tsx-ийн Dimension.colorKey-тэй нийцнэ */
export type DimKey = "m1" | "m2" | "m3" | "m4";

export interface Edge {
  /** vertices массив дахь индексүүд */
  a: number;
  b: number;
  /** Өгсөн бол энэ ирмэг нь ХЭМЖИГДЭХҮҮН (радиус, өндөр…) — өнгөөр ялгарна */
  dim?: DimKey;
}

export interface Mesh {
  vertices: Vec3[];
  edges: Edge[];
}

export interface Projected {
  x: number;
  y: number;
  /** Эргүүлсний дараах z — 0-ээс их бол камерт ойр (урд талд) */
  z: number;
}

/* ---------------------------------------------------------------- проекц -- */

/**
 * Оройг Y тэнхлэгээр эргүүлж, X тэнхлэгээр хазайлгаад перспективээр проекцлоно.
 *
 * Перспектив нь ЗААВАЛ хэрэгтэй: түүнгүйгээр (ортографик) эргэлдэх биет
 * хавтгай мэт харагддаг — ойрын ирмэг холынхоос томрох нь л 3D мэдрэмж өгнө.
 *
 * @param scale  дэлгэцийн нэгж рүү хөрвүүлэх коэффициент (viewBox-ын хэмжээ)
 * @param center viewBox дэх төв цэг
 */
export function project(
  v: Vec3,
  angleY: number,
  tiltX: number,
  distance: number,
  scale: number,
  center: number,
): Projected {
  const [x0, y0, z0] = v;

  // Y тэнхлэгийн эргэлт
  const cosY = Math.cos(angleY);
  const sinY = Math.sin(angleY);
  const x1 = x0 * cosY + z0 * sinY;
  const z1 = -x0 * sinY + z0 * cosY;

  // X тэнхлэгийн тогтмол хазайлт — дээрээс бага зэрэг харсан өнцөг
  const cosX = Math.cos(tiltX);
  const sinX = Math.sin(tiltX);
  const y2 = y0 * cosX - z1 * sinX;
  const z2 = y0 * sinX + z1 * cosX;

  // Перспектив: камераас хол орой (z сөрөг) жижигрэнэ.
  // distance нь оройн |z|-ээс ҮРГЭЛЖ том байх ёстой — эс тэгвээс тэг хуваалт
  // үүсч, биет гараараа эргүүлсэн мэт задарна.
  const factor = distance / (distance - z2);

  return {
    x: center + x1 * factor * scale,
    y: center - y2 * factor * scale,
    z: z2,
  };
}

/* ------------------------------------------------------------ туслахууд -- */

/** Хэвтээ хавтгай дээрх n өнцөгтийн оройнууд (y = өндөр) */
export function ring(n: number, radius: number, y: number, phase = 0): Vec3[] {
  const out: Vec3[] = [];
  for (let i = 0; i < n; i++) {
    const t = phase + (i / n) * Math.PI * 2;
    out.push([Math.cos(t) * radius, y, Math.sin(t) * radius]);
  }
  return out;
}

/** Дараалсан оройнуудыг битүү гогцоо болгож холбоно */
function loop(offset: number, n: number): Edge[] {
  const out: Edge[] = [];
  for (let i = 0; i < n; i++) {
    out.push({ a: offset + i, b: offset + ((i + 1) % n) });
  }
  return out;
}

/** Хоёр гогцооны харгалзах оройнуудыг босоо ирмэгээр холбоно */
function connect(topOffset: number, bottomOffset: number, n: number, step = 1): Edge[] {
  const out: Edge[] = [];
  for (let i = 0; i < n; i += step) {
    out.push({ a: topOffset + i, b: bottomOffset + i });
  }
  return out;
}

/** Муруй гадаргууг ойролцоолох сегментийн тоо — гөлгөр ба хөнгөний тэнцвэр */
const SEG = 28;

/* -------------------------------------------------------------- биетүүд -- */

function cube(): Mesh {
  const a = 0.72;
  const vertices: Vec3[] = [
    [-a, -a, -a], [a, -a, -a], [a, -a, a], [-a, -a, a],
    [-a, a, -a], [a, a, -a], [a, a, a], [-a, a, a],
  ];
  return {
    vertices,
    edges: [
      // доод талст — эхний ирмэгийг «ирмэг a» болгож тодруулна
      { a: 0, b: 1, dim: "m1" }, { a: 1, b: 2 }, { a: 2, b: 3 }, { a: 3, b: 0 },
      { a: 4, b: 5 }, { a: 5, b: 6 }, { a: 6, b: 7 }, { a: 7, b: 4 },
      { a: 0, b: 4 }, { a: 1, b: 5 }, { a: 2, b: 6 }, { a: 3, b: 7 },
    ],
  };
}

function box(): Mesh {
  const [a, b, h] = [0.86, 0.58, 0.68];
  const vertices: Vec3[] = [
    [-a, -h, -b], [a, -h, -b], [a, -h, b], [-a, -h, b],
    [-a, h, -b], [a, h, -b], [a, h, b], [-a, h, b],
  ];
  return {
    vertices,
    edges: [
      { a: 0, b: 1 }, { a: 1, b: 2 }, { a: 2, b: 3 }, { a: 3, b: 0 },
      { a: 4, b: 5 }, { a: 5, b: 6 }, { a: 6, b: 7 }, { a: 7, b: 4 },
      // босоо ирмэг = «өндөр h»
      { a: 0, b: 4, dim: "m1" }, { a: 1, b: 5 }, { a: 2, b: 6 }, { a: 3, b: 7 },
    ],
  };
}

function triangularPrism(): Mesh {
  const h = 0.72;
  const top = ring(3, 0.82, h, -Math.PI / 2);
  const bottom = ring(3, 0.82, -h, -Math.PI / 2);
  return {
    vertices: [...top, ...bottom],
    edges: [
      ...loop(0, 3),
      ...loop(3, 3),
      { a: 0, b: 3, dim: "m1" }, { a: 1, b: 4 }, { a: 2, b: 5 },
    ],
  };
}

function squarePyramid(): Mesh {
  const h = 0.86;
  const base = ring(4, 0.86, -h * 0.55, Math.PI / 4);
  const apex: Vec3 = [0, h, 0];
  const baseCentre: Vec3 = [0, -h * 0.55, 0];
  return {
    vertices: [...base, apex, baseCentre],
    edges: [
      ...loop(0, 4),
      { a: 0, b: 4 }, { a: 1, b: 4 }, { a: 2, b: 4 }, { a: 3, b: 4 },
      // тэнхлэгийн өндөр
      { a: 5, b: 4, dim: "m1" },
    ],
  };
}

function cone(): Mesh {
  const h = 0.82;
  const r = 0.76;
  const base = ring(SEG, r, -h * 0.6);
  const apex: Vec3 = [0, h, 0];
  const centre: Vec3 = [0, -h * 0.6, 0];
  const iApex = SEG;
  const iCentre = SEG + 1;
  return {
    vertices: [...base, apex, centre],
    edges: [
      ...loop(0, SEG),
      // дүрсийг таниулах хоёр байгуулагч
      { a: 0, b: iApex }, { a: Math.floor(SEG / 2), b: iApex },
      { a: Math.floor(SEG / 4), b: iApex }, { a: Math.floor((3 * SEG) / 4), b: iApex },
      { a: iCentre, b: 0, dim: "m1" }, // радиус r
      { a: iCentre, b: iApex, dim: "m2" }, // өндөр h
    ],
  };
}

function truncatedCone(): Mesh {
  const h = 0.66;
  const top = ring(SEG, 0.44, h);
  const bottom = ring(SEG, 0.82, -h);
  const cTop: Vec3 = [0, h, 0];
  const cBottom: Vec3 = [0, -h, 0];
  const iTop = SEG * 2;
  const iBottom = SEG * 2 + 1;
  return {
    vertices: [...top, ...bottom, cTop, cBottom],
    edges: [
      ...loop(0, SEG),
      ...loop(SEG, SEG),
      ...connect(0, SEG, SEG, Math.floor(SEG / 4)),
      { a: iTop, b: 0, dim: "m1" }, // дээд радиус r
      { a: iBottom, b: SEG, dim: "m2" }, // доод радиус R
      { a: iBottom, b: iTop, dim: "m3" }, // өндөр h
    ],
  };
}

function cylinder(): Mesh {
  const h = 0.74;
  const r = 0.66;
  const top = ring(SEG, r, h);
  const bottom = ring(SEG, r, -h);
  const cTop: Vec3 = [0, h, 0];
  const cBottom: Vec3 = [0, -h, 0];
  const iTop = SEG * 2;
  const iBottom = SEG * 2 + 1;
  return {
    vertices: [...top, ...bottom, cTop, cBottom],
    edges: [
      ...loop(0, SEG),
      ...loop(SEG, SEG),
      ...connect(0, SEG, SEG, Math.floor(SEG / 4)),
      { a: iTop, b: 0, dim: "m1" }, // радиус r
      { a: iBottom, b: iTop, dim: "m2" }, // өндөр h
    ],
  };
}

function hexPrism(): Mesh {
  const h = 0.7;
  const a = 0.7;
  const top = ring(6, a, h);
  const bottom = ring(6, a, -h);
  return {
    vertices: [...top, ...bottom],
    edges: [
      ...loop(0, 6),
      ...loop(6, 6),
      ...connect(0, 6, 6),
      { a: 0, b: 1, dim: "m1" }, // ирмэг a
      { a: 0, b: 6, dim: "m2" }, // өндөр h
    ],
  };
}

function sphere(): Mesh {
  const r = 0.82;
  const vertices: Vec3[] = [];
  const edges: Edge[] = [];

  // Уртрагийн 4 гогцоо — Y тэнхлэгийн эргэн тойронд
  for (let m = 0; m < 4; m++) {
    const phi = (m / 4) * Math.PI;
    const offset = vertices.length;
    for (let i = 0; i < SEG; i++) {
      const t = (i / SEG) * Math.PI * 2;
      vertices.push([
        Math.cos(t) * r * Math.cos(phi),
        Math.sin(t) * r,
        Math.cos(t) * r * Math.sin(phi),
      ]);
    }
    edges.push(...loop(offset, SEG));
  }

  // Өргөрөгийн 3 гогцоо — бөмбөрцөг мэт уншигдахад хангалттай
  for (const frac of [-0.5, 0, 0.5]) {
    const y = r * frac;
    const rr = Math.sqrt(Math.max(r * r - y * y, 0));
    const offset = vertices.length;
    vertices.push(...ring(SEG, rr, y));
    edges.push(...loop(offset, SEG));
  }

  // Радиус — төвөөс гадаргуу хүртэл
  const iCentre = vertices.length;
  vertices.push([0, 0, 0]);
  const iSurface = vertices.length;
  vertices.push([r, 0, 0]);
  edges.push({ a: iCentre, b: iSurface, dim: "m1" });

  return { vertices, edges };
}

function perpendicularLines(): Mesh {
  const L = 0.9;
  const tick = 0.18;
  const vertices: Vec3[] = [
    [-L, 0, 0], [L, 0, 0], // a — хэвтээ
    [0, -L, 0], [0, L, 0], // b — босоо
    [tick, 0, 0], [tick, tick, 0], [0, tick, 0], // тэгш өнцгийн тэмдэг
  ];
  return {
    vertices,
    edges: [
      { a: 0, b: 1, dim: "m1" },
      { a: 2, b: 3, dim: "m2" },
      { a: 4, b: 5 }, { a: 5, b: 6 },
    ],
  };
}

/**
 * catalog.tsx-ийн CATALog-той ИЖИЛ дараалал. Индексээр холбогдох тул
 * каталогт биет нэмбэл энд ч нэмнэ — `meshOfIndex` хамгаалалттай (доор).
 */
export const MESHES: (() => Mesh)[] = [
  cube,
  box,
  triangularPrism,
  squarePyramid,
  cone,
  truncatedCone,
  cylinder,
  hexPrism,
  sphere,
  perpendicularLines,
];

/**
 * Индексээр mesh авна. Каталог болон MESHES-ийн урт зөрвөл (хэн нэг нь
 * нөгөөгөө мартвал) апп унахгүй — хүрээнд нь оруулж авна.
 */
export function meshOfIndex(index: number): Mesh {
  const safe = ((index % MESHES.length) + MESHES.length) % MESHES.length;
  return MESHES[safe]();
}

/* --------------------------------------------------------- зам үүсгэлт -- */

export interface PathBuckets {
  /** Камерын цаана буй ирмэгүүд — бүдэг зурагдана (гүний мэдрэмж) */
  back: Map<string, string>;
  /** Урд талын ирмэгүүд — тод */
  front: Map<string, string>;
}

const BODY = "body";

/**
 * Mesh-ийг эргүүлж, ирмэг бүрийг өнгө (body / m1..m4) ба гүн (урд/хойд)
 * гэсэн хэсгүүдэд ялгаж SVG path болгоно.
 *
 * Ирмэг бүрт тусад нь <line> зурвал 60fps-д хэдэн зуун DOM бичилт болно.
 * Иймд хэсэг бүрийг НЭГ path болгож нийлүүлнэ — кадр бүрт 8-хан бичилт.
 */
export function buildPaths(
  mesh: Mesh,
  angleY: number,
  options: {
    tiltX?: number;
    distance?: number;
    scale?: number;
    center?: number;
  } = {},
): PathBuckets {
  const tiltX = options.tiltX ?? -0.28;
  const distance = options.distance ?? 4.2;
  const scale = options.scale ?? 62;
  const center = options.center ?? 100;

  const points = mesh.vertices.map((v) =>
    project(v, angleY, tiltX, distance, scale, center),
  );

  const back = new Map<string, string>();
  const front = new Map<string, string>();

  for (const edge of mesh.edges) {
    const p = points[edge.a];
    const q = points[edge.b];
    if (!p || !q) continue; // индекс буруу бол чимээгүй алгасна (апп унахгүй)

    const key = edge.dim ?? BODY;
    // Ирмэгийн дундаж гүнээр урд/хойдыг шийднэ — ирмэг нь хоёр талд огтолж
    // болох ч нүдэнд дундаж нь хангалттай нарийн.
    const bucket = (p.z + q.z) / 2 >= 0 ? front : back;
    const segment = `M${p.x.toFixed(2)} ${p.y.toFixed(2)}L${q.x.toFixed(2)} ${q.y.toFixed(2)}`;
    bucket.set(key, (bucket.get(key) ?? "") + segment);
  }

  return { back, front };
}

export const BODY_KEY = BODY;
