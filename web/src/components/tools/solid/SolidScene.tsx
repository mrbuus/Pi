"use client";

import { memo, useId, type CSSProperties, type RefObject } from "react";
import { SvgLabel } from "../core/svgText";
import type { Construction, LineRole } from "./angles.ts";
import { clipSegment, keptByClips, sectionPolygon, type Plane, type Prepared } from "./body.ts";
import { layoutLabels, type LabelReq, type Seg2 } from "./labels.ts";
import { decTex, exactTex } from "./measure.ts";
import { foldNet, netEdgeDrawn, netTransforms, transformRef, type PreparedNet } from "./net.ts";
import { buildFrame, faceFronts, makeCamera, segmentVisible, type Camera, type P2, type View } from "./project.ts";
import type { SectionInfo } from "./section.ts";
import { modelCenter, type AnnoGroup, type SolidModel } from "./solids.ts";
import type { HiddenMode } from "./state.ts";
import { add, centroid, cross, dist, dot, mul, norm, sub, type Vec3 } from "./vec.ts";

/* ============================================================================
 * Биетийн зураг — цэвэр SVG. Сурах бичгийн хэв: тод хар ирмэг, нуугдсан
 * ирмэг тасархай, зөөлөн тунгалаг нүүр, огтлол --brand-tint-ээр.
 * Бүх тооцоо project.ts / body.ts / net.ts / angles.ts-д, энд зөвхөн зурна.
 * Шошгыг labels.ts давхцалгүй байрлуулна (ирмэг, бусад шошго, орой).
 * ========================================================================== */

export interface SectionView {
  plane: Plane | null;
  info: SectionInfo | null;
  defPts: Vec3[];
  cutAway: boolean;
  flip: boolean;
  showPlane: boolean;
}

export interface NetView {
  pn: PreparedNet;
  t: number;
  center: Vec3;
  radius: number;
}

export interface MeasureView {
  draw: Construction;
  /** Хэмжилтэд сонгосон нэрлэсэн цэгүүд (нэрийг нь бичнэ) */
  names: string[];
}

interface Props {
  svgRef: RefObject<SVGSVGElement | null>;
  w: number;
  h: number;
  model: SolidModel;
  /** Биетийн анхны тор */
  prep: Prepared;
  /** Зурах тор (тайрсан бол тайрсан нь) */
  shown: Prepared;
  view: View;
  hidden: HiddenMode;
  labels: boolean;
  dims: boolean;
  numbers: boolean;
  groups: Record<AnnoGroup, boolean>;
  section: SectionView | null;
  net: NetView | null;
  measure: MeasureView | null;
  /** Тестэд зориулж: цагаан дэвсгэр, хар зураас, будалтгүй, тоогүй */
  test: boolean;
  title: string;
}

/**
 * «Тест» горимын дэлгэцийн өнгө — core/export.ts-ийн хэвлэх өнгөтэй ижил
 * (PNG/SVG татахад тэр палитраар солигддог тул дэлгэц, файл хоёр ижил харагдана)
 */
const TEST_VARS = { "--surface": "#FFFFFF", "--ink": "#111111", "--ink-dim": "#555555" } as CSSProperties;

/** Шошгоны өмнөх кадрын байрлал — эргүүлэхэд чичрэхгүй (labels.ts hysteresis) */
const LABEL_MEMORY = new Map<string, number>();

const f1 = (x: number) => Math.round(x * 10) / 10;
const pathD = (pts: P2[], close = true) =>
  pts.length ? `M${pts.map((p) => `${f1(p[0])} ${f1(p[1])}`).join("L")}${close ? "Z" : ""}` : "";

/** Зураг доторх тоон шошго: 4, 2.5, 4\sqrt{2} (SvgLabel √ болгоно) */
export function svgNum(x: number): string {
  const e = exactTex(x);
  if (e && /^(\d+|\d*\\sqrt\{\d+\})$/.test(e)) return e;
  return decTex(x, 2);
}

const unit = (v: P2): P2 => {
  const l = Math.hypot(v[0], v[1]);
  return l < 1e-9 ? [0, -1] : [v[0] / l, v[1] / l];
};

/** Хэрчмийн гадагш нормаль (center-ээс холдох тал руу) */
function outward(a: P2, b: P2, center: P2): P2 {
  const m: P2 = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  let n: P2 = unit([-(b[1] - a[1]), b[0] - a[0]]);
  if ((m[0] - center[0]) * n[0] + (m[1] - center[1]) * n[1] < 0) n = [-n[0], -n[1]];
  if (Math.hypot(m[0] - center[0], m[1] - center[1]) < 2 && n[0] < 0) n = [-n[0], -n[1]];
  return n;
}

/** Ирмэгийн шошгоны хүсэлт */
function edgeReq(key: string, a: P2, b: P2, center: P2, text: string, size: number, k = 0.5): LabelReq {
  const anchor: P2 = [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k];
  return { key, anchor, dir: outward(a, b, center), along: [b[0] - a[0], b[1] - a[1]], alongLen: Math.hypot(b[0] - a[0], b[1] - a[1]), text, size };
}

const LABEL_HALO = { stroke: "var(--surface)", strokeWidth: 4, paintOrder: "stroke" as const, strokeLinejoin: "round" as const };

const SECTION_LETTERS = ["M", "N", "K", "L", "P", "Q", "R", "T", "U", "V", "W", "X"];
const AUX_LETTERS = ["H", "K", "O", "P", "Q", "T", "E", "F", "L", "N"];

function SolidScene(props: Props) {
  const { svgRef, w, h, title, test } = props;
  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${Math.round(w)} ${Math.round(h)}`}
      width="100%"
      height="100%"
      role="img"
      aria-label={title}
      className="block select-none"
      style={test ? TEST_VARS : undefined}
    >
      <title>{title}</title>
      {test && <rect x={0} y={0} width={Math.round(w)} height={Math.round(h)} fill="var(--surface)" />}
      {props.net ? <NetDrawing {...props} net={props.net} /> : <SolidDrawing {...props} />}
    </svg>
  );
}

export default memo(SolidScene);

/* ================================================== биет / огтлол == */

function SolidDrawing({ w, h, model, prep, shown, view, hidden, labels, dims, numbers, groups, section, measure, test }: Props) {
  const gid = useId().replace(/:/g, "");
  const center = modelCenter(model);
  const radius = Math.max(prep.radius, 1e-6);
  const brand = test ? "var(--ink)" : "var(--brand)";
  const brand2 = test ? "var(--ink)" : "var(--teal)";

  const cutPlane = shown !== prep;

  const cam = makeCamera(view, w, h, center, radius);
  const fr = buildFrame(shown, cam);
  const cs = cam.screen(center);
  const body = shown.body;
  const front = fr.front;
  const numOn = numbers && !test;

  const lab = (label: string, value: number | undefined) => (numOn && value !== undefined ? svgNum(value) : label);

  // ---- огтлолын хавтгайн хүрээ ----
  let planeFrame: P2[] | null = null;
  if (section?.plane && section.showPlane) {
    const n = norm(section.plane.n);
    const c0 = sub(center, mul(n, dot(n, center) - section.plane.d));
    let u = cross(n, [0, 1, 0]);
    u = Math.hypot(u[0], u[1], u[2]) < 1e-6 ? [1, 0, 0] : norm(u);
    const wv = cross(n, u);
    const s = radius * 1.05;
    const corners3 = [add(add(c0, mul(u, s)), mul(wv, s)), add(sub(c0, mul(u, s)), mul(wv, s)), sub(sub(c0, mul(u, s)), mul(wv, s)), sub(add(c0, mul(u, s)), mul(wv, s))];
    planeFrame = corners3.map((p) => cam.screen(p));
  }

  // ---- нэмэлт шугам ----
  type Seg = { a: P2; b: P2; vis: boolean; em?: boolean; label?: string; key: string };
  const segs: Seg[] = [];
  const rights: { pts: P2[]; key: string; color?: string }[] = [];
  const usedPts = new Set<string>();
  const P = model.points;
  for (const [i, an] of model.annos.entries()) {
    if (an.t === "dim") continue;
    if (!groups[an.group]) continue;
    if (an.t === "seg") {
      const cl = clipSegment(body, P[an.a], P[an.b]);
      if (!cl) continue;
      const vis = segmentVisible(shown, front, cl[0], cl[1]);
      segs.push({ a: cam.screen(cl[0]), b: cam.screen(cl[1]), vis, em: an.em, label: dims && an.label ? lab(an.label, an.value) : undefined, key: `s${i}` });
      if (keptByClips(body, P[an.a])) usedPts.add(an.a);
      if (keptByClips(body, P[an.b])) usedPts.add(an.b);
    } else {
      const O = P[an.at];
      if (!keptByClips(body, O)) continue;
      const size = Math.min(dist(O, P[an.a]), dist(O, P[an.b]), radius) * 0.14;
      const u = mul(norm(sub(P[an.a], O)), size), v = mul(norm(sub(P[an.b], O)), size);
      rights.push({ pts: [add(O, u), add(add(O, u), v), add(O, v)].map((p) => cam.screen(p)), key: `r${i}` });
      usedPts.add(an.at);
    }
  }

  // ---- өнцөг, зайн байгууламж ----
  const prepFront = cutPlane ? null : faceFronts(prep, cam);
  type MLine = { a: P2; b: P2; vis: boolean; role: LineRole; label?: string; key: string };
  const mLines: MLine[] = [];
  const mPlanes: { fill: P2[]; out: { a: P2; b: P2; vis: boolean }[]; color: string; key: string }[] = [];
  const mArcs: { d: string; mid: P2; dir: P2; label: string; key: string }[] = [];
  const mDots: { p: P2; name?: string; key: string }[] = [];
  if (measure && prepFront) {
    const D = measure.draw;
    D.planes.forEach((pl, i) => {
      const poly = sectionPolygon(prep, pl);
      if (!poly) return;
      const fill = poly.pts.map((p) => cam.screen(p));
      const out = poly.pts.map((p, k) => ({ a: fill[k], b: fill[(k + 1) % fill.length], vis: poly.faces[k].some((fi) => prepFront[fi]) }));
      mPlanes.push({ fill, out, color: pl.role === "p1" ? brand : brand2, key: `mp${i}` });
    });
    D.lines.forEach((l, i) => {
      mLines.push({ a: cam.screen(l.a), b: cam.screen(l.b), vis: l.role !== "aux" && segmentVisible(shown, front, l.a, l.b), role: l.role, label: l.label, key: `ml${i}` });
    });
    D.arcs.forEach((a, i) => {
      const e1 = norm(a.u);
      const e2raw = sub(a.v, mul(e1, dot(a.v, e1)));
      const e2 = norm(e2raw);
      const th = Math.acos(Math.max(-1, Math.min(1, dot(e1, norm(a.v)))));
      const K = 18;
      const pts: P2[] = [];
      for (let k = 0; k <= K; k++) {
        const t = (th * k) / K;
        pts.push(cam.screen(add(a.o, add(mul(e1, Math.cos(t) * a.r), mul(e2, Math.sin(t) * a.r)))));
      }
      const bis = add(mul(e1, Math.cos(th / 2)), mul(e2, Math.sin(th / 2)));
      // шошго нумаас гадна, биссектрисийн дагуу (нарийн өнцгийн дотор багтахаар)
      const mid = cam.screen(add(a.o, mul(bis, a.r * 1.45)));
      const o = cam.screen(a.o);
      mArcs.push({ d: pathD(pts, false), mid, dir: [mid[0] - o[0], mid[1] - o[1]], label: a.label, key: `ma${i}` });
    });
    D.rights.forEach((r, i) => {
      const u = mul(norm(r.u), r.s), v = mul(norm(r.v), r.s);
      rights.push({ pts: [add(r.o, u), add(add(r.o, u), v), add(r.o, v)].map((p) => cam.screen(p)), key: `mr${i}`, color: brand });
    });
    const taken = new Set([...Object.keys(P)]);
    const free = AUX_LETTERS.filter((l) => !taken.has(l));
    let fi = 0;
    D.points.forEach((pt, i) => {
      const nm = Object.keys(P).find((k) => dist(P[k], pt.p) < 1e-7);
      mDots.push({ p: cam.screen(pt.p), name: nm ? undefined : free[fi++ % free.length], key: `md${i}` });
      if (nm) usedPts.add(nm);
    });
    for (const nm of measure.names) usedPts.add(nm);
  }

  // ---- огтлол (тайраагүй үед давхарга) ----
  const info = section?.info ?? null;
  const secOutline: { a: P2; b: P2; vis: boolean; key: string }[] = [];
  let secFill: P2[] | null = null;
  if (info && !cutPlane && prepFront) {
    secFill = info.poly.pts.map((p) => cam.screen(p));
    info.poly.pts.forEach((p, i) => {
      const q = info.poly.pts[(i + 1) % info.poly.pts.length];
      const vis = info.poly.faces[i].some((fi) => prepFront[fi]);
      secOutline.push({ a: cam.screen(p), b: cam.screen(q), vis, key: `o${i}` });
    });
  }
  // огтлолын оройн нэр (олон талстад), тодорхойлсон цэгүүд
  const secDots: P2[] = [];
  const secReqs: LabelReq[] = [];
  if (section && (info || section.defPts.length)) {
    const taken = new Set(Object.keys(P));
    const letters = SECTION_LETTERS.filter((l) => !taken.has(l));
    const named = (q: Vec3) => Object.keys(P).find((k) => dist(P[k], q) < 1e-7);
    const secC = info ? cam.screen(centroid(info.corners)) : cs;
    const list: Vec3[] = [...section.defPts];
    if (info && !info.curvedEdge) for (const c of info.corners) if (!list.some((q) => dist(q, c) < 1e-7)) list.push(c);
    let li = 0;
    list.forEach((q, i) => {
      if (cutPlane && !keptByClips(body, q, 1e-6)) return;
      const isDef = i < section.defPts.length;
      const nm = named(q);
      const sp = cam.screen(q);
      if (isDef) secDots.push(sp);
      if (nm && model.vertices.includes(nm)) return; // оройн нэр аль хэдийн бичигдсэн
      if (!labels) return;
      const text = nm ?? letters[li++ % letters.length];
      secReqs.push({ key: `q${i}-${text}`, anchor: sp, dir: [sp[0] - secC[0], sp[1] - secC[1]], text, size: 16 });
    });
  }

  /* ---------- шошгын байрлал: эхлээд саадууд ---------- */
  const showHidden = hidden !== "hide";
  const obstacles: Seg2[] = [];
  for (const e of fr.edges) if (!e.hidden || showHidden) obstacles.push({ a: e.a, b: e.b, w: e.hidden ? 0.6 : 1 });
  for (const e of fr.curveSegs) if (!e.hidden || showHidden) obstacles.push({ a: e.a, b: e.b, w: e.hidden ? 0.6 : 1 });
  for (const s of segs) obstacles.push({ a: s.a, b: s.b, w: 0.8 });
  for (const s of secOutline) obstacles.push({ a: s.a, b: s.b, w: 0.8 });
  for (const s of mLines) obstacles.push({ a: s.a, b: s.b, w: 0.9 });
  for (const p of mPlanes) for (const s of p.out) obstacles.push({ a: s.a, b: s.b, w: 0.5 });
  for (const r of rights) for (let k = 0; k + 1 < r.pts.length; k++) obstacles.push({ a: r.pts[k], b: r.pts[k + 1], w: 0.5 });
  for (const a of mArcs) {
    const nums = a.d.slice(1).split("L").map((s) => s.split(" ").map(Number) as P2);
    for (let k = 0; k + 1 < nums.length; k++) obstacles.push({ a: nums[k], b: nums[k + 1], w: 0.5 });
  }

  const reqs: LabelReq[] = [];
  const dots: P2[] = [];
  if (labels) {
    const names = [...model.vertices, ...[...usedPts].filter((k) => !model.vertices.includes(k))];
    for (const k of names) {
      const p3 = P[k];
      if (!p3 || !keptByClips(body, p3)) continue;
      const sp = cam.screen(p3);
      dots.push(sp);
      reqs.push({ key: `v${k}`, anchor: sp, dir: [sp[0] - cs[0], sp[1] - cs[1]], text: k, size: 17 });
    }
    for (const d of mDots) {
      dots.push(d.p);
      if (d.name) reqs.push({ key: `m${d.name}`, anchor: d.p, dir: [d.p[0] - cs[0], d.p[1] - cs[1]], text: d.name, size: 16 });
    }
  }
  if (dims) {
    for (const [i, an] of model.annos.entries()) {
      if (an.t !== "dim") continue;
      if (!keptByClips(body, P[an.a]) || !keptByClips(body, P[an.b])) continue;
      reqs.push(edgeReq(`d${i}`, cam.screen(P[an.a]), cam.screen(P[an.b]), cs, lab(an.label, an.value), 16));
    }
    for (const s of segs) if (s.label) reqs.push(edgeReq(`l${s.key}`, s.a, s.b, cs, s.label, 16));
  }
  for (const l of mLines) if (l.label) reqs.push(edgeReq(`ml${l.key}`, l.a, l.b, cs, l.label, 16));
  for (const a of mArcs) reqs.push({ key: a.key, anchor: a.mid, dir: a.dir, text: a.label, size: 17 });
  reqs.push(...secReqs);
  if (planeFrame) {
    const right = planeFrame.reduce((a, b) => (b[0] > a[0] ? b : a));
    const pc: P2 = [planeFrame.reduce((s2, p) => s2 + p[0], 0) / 4, planeFrame.reduce((s2, p) => s2 + p[1], 0) / 4];
    const at: P2 = [right[0] + (pc[0] - right[0]) * 0.1, right[1] + (pc[1] - right[1]) * 0.1];
    reqs.push({ key: "alpha", anchor: at, dir: [pc[0] - right[0], pc[1] - right[1]], text: "\\alpha", size: 17 });
  }
  const placed = layoutLabels(reqs, obstacles, dots, w, h, LABEL_MEMORY);
  const colorOf = (key: string) =>
    key === "alpha" || key.startsWith("q") || key.startsWith("ma") || key.startsWith("mlml") ? brand : key.startsWith("l") && segs.find((s) => `l${s.key}` === key)?.em ? brand : "var(--ink)";

  const smoothBody = body.faces.some((f) => f.smooth);
  const hiddenDash = hidden === "dash" ? "6 5" : undefined;
  const hiddenStroke = hidden === "dash" && !test ? "var(--ink-dim)" : "var(--ink)";
  const roleStroke = (r: LineRole) => (r === "main" ? brand : r === "main2" ? brand2 : r === "perp" ? brand : "var(--ink)");
  const roleWidth = (r: LineRole) => (r === "main" || r === "main2" ? 2.6 : r === "perp" ? 2 : 1.4);

  return (
    <g strokeLinecap="round" strokeLinejoin="round">
      <defs>
        <linearGradient id={`g${gid}`} x1="0" y1="0" x2="1" y2="0.35">
          <stop offset="0" stopColor="var(--brand-tint)" stopOpacity="0.95" />
          <stop offset="0.55" stopColor="var(--brand-tint)" stopOpacity="0.45" />
          <stop offset="1" stopColor="var(--brand-tint)" stopOpacity="0.8" />
        </linearGradient>
      </defs>

      {planeFrame && <path d={pathD(planeFrame)} fill={test ? "none" : "var(--brand)"} fillOpacity={0.06} stroke={brand} strokeOpacity={0.5} strokeWidth={1} />}

      {!test && smoothBody && fr.hull && <path d={pathD(fr.hull)} fill={`url(#g${gid})`} stroke="none" />}
      {!test &&
        fr.faces.map((f) => {
          const face = body.faces[f.idx];
          if (!f.front || face.smooth) return null;
          if (face.tag === "section") return <path key={`f${f.idx}`} d={pathD(f.pts)} fill="var(--brand)" fillOpacity={0.24} stroke="none" />;
          return <path key={`f${f.idx}`} d={pathD(f.pts)} fill="var(--brand-tint)" fillOpacity={smoothBody ? 0.55 + 0.35 * f.shade : 0.3 + 0.5 * f.shade} stroke="none" />;
        })}
      {secFill && !test && <path d={pathD(secFill)} fill="var(--brand)" fillOpacity={0.2} stroke="none" />}
      {!test && mPlanes.map((p) => <path key={p.key} d={pathD(p.fill)} fill={p.color} fillOpacity={0.16} stroke="none" />)}

      {/* нуугдсан ирмэг */}
      {showHidden && (
        <g fill="none" stroke={hiddenStroke} strokeWidth={1.15} strokeDasharray={hiddenDash}>
          {fr.edges.filter((e) => e.hidden).map((e, i) => (
            <line key={`h${i}`} x1={f1(e.a[0])} y1={f1(e.a[1])} x2={f1(e.b[0])} y2={f1(e.b[1])} stroke={e.section ? brand : undefined} />
          ))}
          {fr.curveSegs.filter((e) => e.hidden).map((e, i) => (
            <line key={`hc${i}`} x1={f1(e.a[0])} y1={f1(e.a[1])} x2={f1(e.b[0])} y2={f1(e.b[1])} />
          ))}
          {segs.filter((s) => !s.vis).map((s) => (
            <line key={s.key} x1={f1(s.a[0])} y1={f1(s.a[1])} x2={f1(s.b[0])} y2={f1(s.b[1])} stroke={s.em ? brand : undefined} strokeDasharray={hidden === "dash" ? "5 4" : undefined} strokeWidth={s.em ? 1.6 : 1.15} />
          ))}
          {secOutline.filter((s) => !s.vis).map((s) => (
            <line key={s.key} x1={f1(s.a[0])} y1={f1(s.a[1])} x2={f1(s.b[0])} y2={f1(s.b[1])} stroke={brand} strokeWidth={1.5} />
          ))}
          {mPlanes.flatMap((p) => p.out.filter((s) => !s.vis).map((s, k) => (
            <line key={`${p.key}h${k}`} x1={f1(s.a[0])} y1={f1(s.a[1])} x2={f1(s.b[0])} y2={f1(s.b[1])} stroke={p.color} strokeWidth={1.4} />
          )))}
        </g>
      )}

      {/* харагдах ирмэг */}
      <g fill="none" stroke="var(--ink)" strokeWidth={1.8}>
        {fr.edges.filter((e) => !e.hidden).map((e, i) => (
          <line key={`e${i}`} x1={f1(e.a[0])} y1={f1(e.a[1])} x2={f1(e.b[0])} y2={f1(e.b[1])} stroke={e.section ? brand : undefined} strokeWidth={e.section ? 2.3 : undefined} />
        ))}
        {fr.curveSegs.filter((e) => !e.hidden).map((e, i) => (
          <line key={`c${i}`} x1={f1(e.a[0])} y1={f1(e.a[1])} x2={f1(e.b[0])} y2={f1(e.b[1])} />
        ))}
        {segs.filter((s) => s.vis).map((s) => (
          <line key={s.key} x1={f1(s.a[0])} y1={f1(s.a[1])} x2={f1(s.b[0])} y2={f1(s.b[1])} stroke={s.em ? brand : "var(--ink)"} strokeWidth={s.em ? 2.1 : 1.3} />
        ))}
        {secOutline.filter((s) => s.vis).map((s) => (
          <line key={s.key} x1={f1(s.a[0])} y1={f1(s.a[1])} x2={f1(s.b[0])} y2={f1(s.b[1])} stroke={brand} strokeWidth={2.4} />
        ))}
        {mPlanes.flatMap((p) => p.out.filter((s) => s.vis).map((s, k) => (
          <line key={`${p.key}v${k}`} x1={f1(s.a[0])} y1={f1(s.a[1])} x2={f1(s.b[0])} y2={f1(s.b[1])} stroke={p.color} strokeWidth={2} />
        )))}
        {rights.map((r) => (
          <path key={r.key} d={pathD(r.pts, false)} strokeWidth={1.1} stroke={r.color} />
        ))}
      </g>

      {/* өнцөг, зай: тодотгосон шулуун, перпендикуляр, нум */}
      {mLines.length > 0 && (
        <g fill="none">
          {mLines.map((l) => (
            <line
              key={l.key}
              x1={f1(l.a[0])}
              y1={f1(l.a[1])}
              x2={f1(l.b[0])}
              y2={f1(l.b[1])}
              stroke={roleStroke(l.role)}
              strokeWidth={roleWidth(l.role)}
              strokeDasharray={l.vis ? undefined : l.role === "aux" ? "3 4" : "6 4"}
            />
          ))}
          {mArcs.map((a) => (
            <path key={a.key} d={a.d} stroke={brand} strokeWidth={1.6} />
          ))}
        </g>
      )}

      {secDots.map((p, i) => (
        <circle key={`dot${i}`} cx={f1(p[0])} cy={f1(p[1])} r={3.4} fill={brand} />
      ))}
      {mDots.map((d) => (
        <circle key={d.key} cx={f1(d.p[0])} cy={f1(d.p[1])} r={3.2} fill={brand} />
      ))}

      {/* шошго — давхцалгүй байрлуулсан */}
      <g>
        {placed.map((l) => (
          <SvgLabel key={l.key} x={f1(l.x)} y={f1(l.y)} label={l.text} size={l.size} fill={colorOf(l.key)} {...LABEL_HALO} />
        ))}
      </g>
    </g>
  );
}

/* ======================================================== дэлгээс == */

function NetDrawing({ w, h, view, labels, dims, numbers, net, test }: Props & { net: NetView }) {
  const { pn, t } = net;
  const cam: Camera = makeCamera(view, w, h, net.center, net.radius);
  const M = netTransforms(pn, t);
  const pos = foldNet(pn, t);
  const spec = pn.spec;
  const all = pos.flat();
  const cAll = centroid(all);
  const faces = pos.map((pts, i) => {
    const c = centroid(pts);
    // нормалийг нүүрийн дарааллаас: Ньюэлл (нугалахад чиглэл хадгалагдана)
    const n0 = norm(cross(sub(pts[1], pts[0]), sub(pts[2], pts[0])));
    const lit = Math.abs(dot(n0, norm([-0.45, 0.75, 0.5])));
    return { i, pts, depth: cam.depth(c), lit };
  });
  faces.sort((a, b) => a.depth - b.depth);
  const flat = t < 0.02;
  const cs = cam.screen(cAll);
  const brand = test ? "var(--ink)" : "var(--brand)";

  const screenFaces = faces.map((f) => ({ ...f, sp: f.pts.map((p) => cam.screen(p)) }));
  const obstacles: Seg2[] = [];
  for (const f of screenFaces) {
    f.sp.forEach((p, k) => {
      if (netEdgeDrawn(pn, f.i, k)) obstacles.push({ a: p, b: f.sp[(k + 1) % f.sp.length] });
    });
  }

  // оройн нэр (давхардсан хуулбарыг нэг удаа)
  const reqs: LabelReq[] = [];
  const dots: P2[] = [];
  if (labels && flat) {
    spec.faces.forEach((f, i) => {
      f.names?.forEach((nm, k) => {
        if (!nm) return;
        const sp = cam.screen(pos[i][k]);
        if (reqs.some((v) => v.text === nm && Math.hypot(v.anchor[0] - sp[0], v.anchor[1] - sp[1]) < 19)) return;
        dots.push(sp);
        reqs.push({ key: `n${i}-${k}-${nm}`, anchor: sp, dir: [sp[0] - cs[0], sp[1] - cs[1]], text: nm, size: 15 });
      });
    });
  }
  const annos =
    flat && dims
      ? spec.annos.map((a, i) => {
          const A = cam.screen(transformRef(M, a.a)), B = cam.screen(transformRef(M, a.b));
          return { A, B, line: a.line, req: edgeReq(`na${i}`, A, B, cs, numbers && !test ? svgNum(a.value) : a.label, 16, a.pos ?? 0.5), key: i };
        })
      : [];
  for (const a of annos) if (a.line) obstacles.push({ a: a.A, b: a.B, w: 0.6 });
  // хэмжээсийг эхэлж (ирмэгт хамаарах тул сонголт цөөн), дараа нь оройн нэр
  const placed = layoutLabels([...annos.map((a) => a.req), ...reqs], obstacles, dots, w, h, LABEL_MEMORY);
  const lineKeys = new Set(annos.filter((a) => a.line).map((a) => a.req.key));

  return (
    <g strokeLinecap="round" strokeLinejoin="round">
      {flat && !test && (
        // хавтгай үед бүх нүүр нэг хавтгайд — нэг бүлэгт будвал заадас харагдахгүй
        <g opacity={0.6}>
          {screenFaces.map(({ i, sp }) => (
            <path key={`b${i}`} d={pathD(sp)} fill="var(--brand-tint)" stroke="var(--brand-tint)" strokeWidth={0.8} />
          ))}
        </g>
      )}
      {screenFaces.map(({ i, sp, lit }) => (
        <g key={i}>
          {!flat && (
            <>
              <path d={pathD(sp)} fill="var(--surface)" stroke="none" />
              {!test && <path d={pathD(sp)} fill="var(--brand-tint)" fillOpacity={0.35 + 0.5 * lit} stroke="none" />}
            </>
          )}
          {sp.map((p, k) =>
            netEdgeDrawn(pn, i, k) ? (
              <line key={k} x1={f1(p[0])} y1={f1(p[1])} x2={f1(sp[(k + 1) % sp.length][0])} y2={f1(sp[(k + 1) % sp.length][1])} stroke="var(--ink)" strokeWidth={1.7} />
            ) : null,
          )}
        </g>
      ))}
      {annos.map((a) =>
        a.line ? <line key={a.key} x1={f1(a.A[0])} y1={f1(a.A[1])} x2={f1(a.B[0])} y2={f1(a.B[1])} stroke={brand} strokeWidth={1.4} strokeDasharray="5 4" /> : null,
      )}
      {placed.map((l) => (
        <SvgLabel key={l.key} x={f1(l.x)} y={f1(l.y)} label={l.text} size={l.size} fill={lineKeys.has(l.key) ? brand : "var(--ink)"} {...LABEL_HALO} />
      ))}
    </g>
  );
}
