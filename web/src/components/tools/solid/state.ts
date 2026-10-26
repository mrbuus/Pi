/* ============================================================================
 * Хэрэгслийн төлөв: төрөл, хадгалсан утгыг аюулгүй болгох, анхдагч утга.
 * React-гүй — хадгалсан (хуучин, эвдэрсэн) өгөгдлөөс хамгаална.
 * ========================================================================== */

import type { MeasureKind } from "./angles.ts";
import type { PointRef } from "./section.ts";
import { PRESETS, type Proj, type View } from "./project.ts";
import { SOLIDS, defaultParams, sanitizeParams, type AnnoGroup, type Params, type SolidKind, type SolidModel } from "./solids.ts";

export type Mode = "solid" | "section" | "net" | "measure";
export type HiddenMode = "dash" | "hide" | "show";

export interface SectionState {
  how: "tilt" | "points";
  /** Өндөр — биетийн өндрийн хувь (0..1) */
  y: number;
  /** Хэвтээтэй үүсгэх өнцөг, градус */
  tilt: number;
  /** Налуугийн чиглэл, градус */
  turn: number;
  /** Тэнхлэгээс шилжилт — биетийн өргөний хувь (−1..1) */
  shift: number;
  pts: PointRef[];
  cutAway: boolean;
  flip: boolean;
  showPlane: boolean;
}

export interface MeasureState {
  kind: MeasureKind;
  /** Сонгосон цэгүүд (хоосон бол биетийн жишээ цэгүүд) */
  pts: PointRef[];
}

export interface SolidState {
  kind: SolidKind;
  params: Partial<Record<SolidKind, Params>>;
  view: View;
  mode: Mode;
  hidden: HiddenMode;
  labels: boolean;
  dims: boolean;
  numbers: boolean;
  groups: Record<AnnoGroup, boolean>;
  section: SectionState;
  netT: number;
  auto: boolean;
  measure: MeasureState;
  /** «Тестэд зориулж»: тоогүй, зөвхөн үсэг, цагаан дэвсгэр, хар зураас */
  test: boolean;
}

export const DEFAULT_SECTION: SectionState = {
  how: "tilt",
  y: 0.5,
  tilt: 0,
  turn: 0,
  shift: 0,
  pts: [],
  cutAway: false,
  flip: false,
  showPlane: true,
};

export const DEFAULT_STATE: SolidState = {
  kind: "cube",
  params: {},
  view: { ...PRESETS.default, zoom: 1, proj: "persp" },
  mode: "solid",
  hidden: "dash",
  labels: true,
  dims: true,
  numbers: false,
  groups: { height: true, apothem: false, diag: false, radius: true },
  section: DEFAULT_SECTION,
  netT: 0,
  auto: false,
  measure: { kind: "lp", pts: [] },
  test: false,
};

const KINDS = SOLIDS.map((s) => s.kind);
const num = (v: unknown, def: number, lo: number, hi: number) => {
  const x = Number(v);
  return Number.isFinite(x) ? Math.min(hi, Math.max(lo, x)) : def;
};
const bool = (v: unknown, def: boolean) => (typeof v === "boolean" ? v : def);
const oneOf = <T extends string>(v: unknown, list: readonly T[], def: T): T => (list.includes(v as T) ? (v as T) : def);

function sanitizeRef(r: unknown): PointRef | null {
  if (!r || typeof r !== "object") return null;
  const o = r as Record<string, unknown>;
  if (typeof o.name === "string") return { name: o.name };
  if (typeof o.a === "string" && typeof o.b === "string") return { a: o.a, b: o.b, t: num(o.t, 0.5, 0, 1) };
  return null;
}

export function sanitizeState(raw: unknown): SolidState {
  const s = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const kind = oneOf(s.kind, KINDS, DEFAULT_STATE.kind);
  const params: Partial<Record<SolidKind, Params>> = {};
  const rp = (s.params && typeof s.params === "object" ? s.params : {}) as Record<string, unknown>;
  for (const k of KINDS) if (rp[k] && typeof rp[k] === "object") params[k] = sanitizeParams(k, rp[k] as Params);
  const v = (s.view && typeof s.view === "object" ? s.view : {}) as Record<string, unknown>;
  const view: View = {
    yaw: num(v.yaw, DEFAULT_STATE.view.yaw, -1e6, 1e6) % 360,
    pitch: num(v.pitch, DEFAULT_STATE.view.pitch, -90, 90),
    zoom: num(v.zoom, 1, 0.4, 3),
    proj: oneOf<Proj>(v.proj, ["persp", "ortho", "oblique"], "persp"),
  };
  const g = (s.groups && typeof s.groups === "object" ? s.groups : {}) as Record<string, unknown>;
  const sec = (s.section && typeof s.section === "object" ? s.section : {}) as Record<string, unknown>;
  const meas = (s.measure && typeof s.measure === "object" ? s.measure : {}) as Record<string, unknown>;
  const pts = Array.isArray(sec.pts) ? sec.pts.map(sanitizeRef).filter((x): x is PointRef => !!x).slice(0, 3) : [];
  return {
    kind,
    params,
    view,
    mode: oneOf<Mode>(s.mode, ["solid", "section", "net", "measure"], "solid"),
    hidden: oneOf<HiddenMode>(s.hidden, ["dash", "hide", "show"], "dash"),
    labels: bool(s.labels, true),
    dims: bool(s.dims, true),
    numbers: bool(s.numbers, false),
    groups: {
      height: bool(g.height, true),
      apothem: bool(g.apothem, false),
      diag: bool(g.diag, false),
      radius: bool(g.radius, true),
    },
    section: {
      how: oneOf(sec.how, ["tilt", "points"] as const, "tilt"),
      y: num(sec.y, 0.5, 0, 1),
      tilt: num(sec.tilt, 0, 0, 90),
      turn: num(sec.turn, 0, -360, 360),
      shift: num(sec.shift, 0, -1, 1),
      pts,
      cutAway: bool(sec.cutAway, false),
      flip: bool(sec.flip, false),
      showPlane: bool(sec.showPlane, true),
    },
    netT: num(s.netT, 0, 0, 1),
    auto: bool(s.auto, false),
    measure: {
      kind: oneOf<MeasureKind>(meas.kind, ["lp", "pp", "ll", "dp"], "lp"),
      pts: Array.isArray(meas.pts) ? meas.pts.map(sanitizeRef).filter((x): x is PointRef => !!x).slice(0, 6) : [],
    },
    test: bool(s.test, false),
  };
}

export const paramsOf = (s: SolidState): Params => s.params[s.kind] ?? defaultParams(s.kind);

/* ---------------------------------------------- огтлолын цэгүүд -- */

export interface PointOption {
  key: string;
  label: string;
  ref: PointRef;
}

export const refKey = (r: PointRef) => ("name" in r ? `v:${r.name}` : `s:${r.a}|${r.b}`);

/** Сонгож болох цэг: нэрлэсэн орой, нэрлэсэн хэрчмийн цэг (харьцаатай) */
export function pointOptions(m: SolidModel): PointOption[] {
  const names = [...m.vertices, ...Object.keys(m.points).filter((k) => !m.vertices.includes(k) && m.segments.some(([a, b]) => a === k || b === k))];
  const out: PointOption[] = names.map((n) => ({ key: `v:${n}`, label: n, ref: { name: n } }));
  for (const [a, b] of m.segments) out.push({ key: `s:${a}|${b}`, label: `${a}${b}`, ref: { a, b, t: 0.5 } });
  return out;
}

/** Цэгүүд энэ биетэд хүчинтэй эсэх */
export function validRefs(m: SolidModel, pts: PointRef[], count = 3, options = pointOptions(m)): boolean {
  if (pts.length !== count) return false;
  const opts = new Set(options.map((o) => o.key));
  return pts.every((r) => opts.has(refKey(r)));
}

/** Өнцөг, зай хэмжихэд: бүх нэрлэсэн цэг (O, M, H…) + ирмэг дээрх цэг */
export function measureOptions(m: SolidModel): PointOption[] {
  const names = [...m.vertices, ...Object.keys(m.points).filter((k) => !m.vertices.includes(k))];
  const out: PointOption[] = names.map((n) => ({ key: `v:${n}`, label: n, ref: { name: n } }));
  for (const [a, b] of m.segments) out.push({ key: `s:${a}|${b}`, label: `${a}${b}`, ref: { a, b, t: 0.5 } });
  return out;
}

/** Анхдагч гурван цэг: A, C ба B-гээс дээш ирмэгийн дунд (сурах бичгийн жишээ) */
export function defaultPoints(m: SolidModel): PointRef[] {
  const v = m.vertices;
  if (m.curved === "cone") return [{ name: "S" }, { name: "O" }, { name: "A" }];
  if (m.curved) return [{ name: "O" }, { name: "A" }, { name: "A_1" }];
  const apex = m.kind === "tetra" ? "D" : m.kind === "octa" ? "E" : "S";
  const up = m.points.B_1 ? "B_1" : m.points[apex] ? apex : v[v.length - 1];
  const has = (a: string, b: string) => m.segments.some(([x, y]) => (x === a && y === b) || (x === b && y === a));
  const third: PointRef = has("B", up) ? { a: "B", b: up, t: 0.5 } : { name: up };
  return [{ name: "A" }, { name: "C" }, third];
}
