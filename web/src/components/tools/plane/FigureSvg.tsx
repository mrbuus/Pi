"use client";

import { useEffect, useMemo, useState, useSyncExternalStore, type ReactNode, type RefObject, type SVGProps } from "react";
import { SvgLabel } from "../core/svgText";
import type { Prim, Tone } from "./figure";
import { type Box, type Pt, boxAdd, emptyBox, fitView } from "./geom";
import { type Disc, type LabelReq, type Seg, boxEdgePoint, placeLabels, textSize } from "./layout";

/* ============================================================================
 * Prim[] → SVG. Сурах бичгийн хэв: тод хар зураас, будалтгүй (эсвэл маш
 * зөөлөн --brand-tint), налуу serif шошго. Тэмдэг, шошго пикселээр тогтмол.
 * viewBox = контейнерийн бодит пиксел хэмжээ — шошгоны үсэг дэлгэцэн дээр
 * яг fontSize px. Шошгуудыг layout.ts давхцалгүй байрлуулна: оройн нэр
 * дүрсийн гадна, талын урт талын гадна, өнцөг нумын дотор (зай хүрэхгүй
 * бол холдуулж заагч шугамтай).
 * ========================================================================== */

export interface View {
  s: number;
  ox: number;
  oy: number;
}

/** Энгийн өнгө: шугам ink, тодотгол brand, туслах dim */
const COLOR: Record<Tone, string> = {
  ink: "var(--ink)",
  brand: "var(--brand)",
  dim: "var(--ink-dim)",
  accent: "var(--brand)",
};
const DASH = "7 5";

/** Контейнерийн хэмжээ (ResizeObserver) */
export function useSize(ref: RefObject<HTMLElement | null>, fallback = { w: 360, h: 360 }) {
  const [size, setSize] = useState(fallback);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => {
      const w = Math.max(80, Math.round(e.contentRect.width));
      const h = Math.max(80, Math.round(e.contentRect.height));
      setSize((s) => (s.w === w && s.h === h ? s : { w, h }));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [ref]);
  return size;
}

/** CSS media query (1024px+ г.м.) — useSyncExternalStore, effect дотор setState үгүй */
export function useMedia(query: string): boolean {
  return useSyncExternalStore(
    (cb) => {
      const m = window.matchMedia(query);
      m.addEventListener("change", cb);
      return () => m.removeEventListener("change", cb);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

/** Анхдагч дүрсүүдийн хүрээ (масштаб тааруулахад) */
export function primsBox(prims: Prim[]): Box {
  let b = emptyBox();
  const addCircle = (c: Pt, r: number) => {
    b = boxAdd(b, { x: c.x - r, y: c.y - r });
    b = boxAdd(b, { x: c.x + r, y: c.y + r });
  };
  for (const p of prims) {
    switch (p.k) {
      case "poly": p.pts.forEach((q) => (b = boxAdd(b, q))); break;
      case "seg": case "side": case "ticks": b = boxAdd(boxAdd(b, p.a), p.b); break;
      case "circle": case "arc": case "region": addCircle(p.c, p.r); break;
      case "dot": case "label": b = boxAdd(b, p.p); break;
      case "angle": b = boxAdd(b, p.v); break;
      case "line": case "ray": b = boxAdd(b, p.p); break;
    }
  }
  return b;
}

/** Дүрсийг талбайд багтаана. pad — шошгонд үлдээх зай (px) */
export function fitPrims(prims: Prim[], w: number, h: number, pad = 44): View {
  return fitView(primsBox(prims), w, h, Math.min(pad, Math.min(w, h) / 4));
}

const n2 = (x: number) => Math.round(x * 100) / 100;

interface Props extends Omit<SVGProps<SVGSVGElement>, "ref"> {
  prims: Prim[];
  view: View;
  w: number;
  h: number;
  svgRef?: RefObject<SVGSVGElement | null>;
  under?: ReactNode;
  over?: ReactNode;
  /** Шошгоны үндсэн хэмжээ px (утсан дээр 16, проекторт томруулна) */
  fontSize?: number;
}

interface LabelJob {
  req: LabelReq;
  text: string;
  size: number;
  fill: string;
  italic?: boolean;
  /** Холдсон үед заагч шугам эхлэх цэг */
  leaderFrom?: Pt;
  /** Хэдэн px холдвол заагч зурах */
  leaderAfter?: number;
}

function arcPoly(cx: number, cy: number, r: number, start: number, sweep: number, segs: Seg[]) {
  const n = Math.max(4, Math.ceil((Math.abs(sweep) * r) / 10));
  let px = cx + r * Math.cos(start), py = cy - r * Math.sin(start);
  for (let i = 1; i <= n; i++) {
    const a = start + (sweep * i) / n;
    const x = cx + r * Math.cos(a), y = cy - r * Math.sin(a);
    segs.push({ x1: px, y1: py, x2: x, y2: y });
    px = x;
    py = y;
  }
}

function render(prims: Prim[], view: View, w: number, h: number, fontSize: number) {
  const S = (p: Pt) => ({ x: view.ox + p.x * view.s, y: view.oy - p.y * view.s });
  const L = (w + h) * 3;
  const out: ReactNode[] = [];
  const dots: ReactNode[] = [];
  const segs: Seg[] = [];
  const discs: Disc[] = [];
  const jobs: LabelJob[] = [];
  const seg = (a: { x: number; y: number }, b: { x: number; y: number }) => segs.push({ x1: a.x, y1: a.y, x2: b.x, y2: b.y });

  prims.forEach((p, i) => {
    const key = `${p.k}${i}`;
    const tone = COLOR[("tone" in p && p.tone) || "ink"];
    switch (p.k) {
      case "poly": {
        const q = p.pts.map(S);
        const d = q.map((v, j) => `${j ? "L" : "M"}${n2(v.x)} ${n2(v.y)}`).join(" ") + " Z";
        q.forEach((v, j) => seg(v, q[(j + 1) % q.length]));
        out.push(
          <path key={key} d={d} fill={p.fill ? "var(--brand-tint)" : "none"} fillOpacity={p.fill ? 0.55 : undefined} stroke={tone} strokeWidth={p.w ?? 2.2} strokeLinejoin="round" strokeDasharray={p.dash ? DASH : undefined} />,
        );
        break;
      }
      case "seg": {
        const a = S(p.a), b = S(p.b);
        seg(a, b);
        out.push(<line key={key} x1={n2(a.x)} y1={n2(a.y)} x2={n2(b.x)} y2={n2(b.y)} stroke={tone} strokeWidth={p.w ?? 2} strokeLinecap="round" strokeDasharray={p.dash ? DASH : undefined} />);
        break;
      }
      case "line":
      case "ray": {
        const a = S(p.p);
        const len = Math.hypot(p.d.x, p.d.y) || 1;
        const u = { x: p.d.x / len, y: -p.d.y / len };
        const s0 = p.k === "line" ? -L : 0;
        const A = { x: a.x + u.x * s0, y: a.y + u.y * s0 }, B = { x: a.x + u.x * L, y: a.y + u.y * L };
        seg(A, B);
        out.push(<line key={key} x1={n2(A.x)} y1={n2(A.y)} x2={n2(B.x)} y2={n2(B.y)} stroke={tone} strokeWidth={p.w ?? 1.8} strokeDasharray={p.dash ? DASH : undefined} />);
        break;
      }
      case "circle": {
        const c = S(p.c), r = p.r * view.s;
        arcPoly(c.x, c.y, r, 0, 2 * Math.PI, segs);
        out.push(<circle key={key} cx={n2(c.x)} cy={n2(c.y)} r={n2(r)} fill="none" stroke={tone} strokeWidth={p.w ?? 2} strokeDasharray={p.dash ? DASH : undefined} />);
        break;
      }
      case "arc":
      case "region": {
        const c = S(p.c), r = p.r * view.s;
        let sweep = (p.a1 - p.a0) % (2 * Math.PI);
        if (sweep <= 0) sweep += 2 * Math.PI;
        const P0 = { x: c.x + r * Math.cos(p.a0), y: c.y - r * Math.sin(p.a0) };
        const P1 = { x: c.x + r * Math.cos(p.a0 + sweep), y: c.y - r * Math.sin(p.a0 + sweep) };
        const arc = `A${n2(r)} ${n2(r)} 0 ${sweep > Math.PI ? 1 : 0} 0 ${n2(P1.x)} ${n2(P1.y)}`;
        if (p.k === "arc") {
          arcPoly(c.x, c.y, r, p.a0, sweep, segs);
          out.push(<path key={key} d={`M${n2(P0.x)} ${n2(P0.y)} ${arc}`} fill="none" stroke={tone} strokeWidth={p.w ?? 2} strokeDasharray={p.dash ? DASH : undefined} />);
        } else {
          const d = p.kind === "sector" ? `M${n2(c.x)} ${n2(c.y)} L${n2(P0.x)} ${n2(P0.y)} ${arc} Z` : `M${n2(P0.x)} ${n2(P0.y)} ${arc} Z`;
          out.unshift(<path key={key} d={d} fill="var(--brand-tint)" fillOpacity={p.strong ? 0.9 : 0.5} stroke="none" />);
        }
        break;
      }
      case "dot": {
        const c = S(p.p);
        const r = p.r ?? 3.6;
        discs.push({ x: c.x, y: c.y, r: r + 1 });
        dots.push(<circle key={key} cx={n2(c.x)} cy={n2(c.y)} r={r} fill={p.hollow ? "var(--surface)" : tone} stroke={tone} strokeWidth={p.hollow ? 1.6 : 0} />);
        break;
      }
      case "label": {
        const c = S(p.p);
        let dir = { x: 0.6, y: -0.8 };
        let spread = Math.PI;
        if (p.away) {
          const a = S(p.away);
          const l = Math.hypot(c.x - a.x, c.y - a.y);
          if (l > 1e-6) dir = { x: (c.x - a.x) / l, y: (c.y - a.y) / l };
        } else if (p.dir) {
          const l = Math.hypot(p.dir.x, p.dir.y) || 1;
          dir = { x: p.dir.x / l, y: -p.dir.y / l };
        }
        // gap = 0 — яг цэг дээр төвлөрнө (олон өнцөгтийн талбай г.м.)
        const fixed = p.gap === 0;
        if (fixed) {
          dir = { x: 0, y: 0 };
          spread = 0;
        }
        const size = Math.max(14, p.size ?? fontSize + 1);
        const { w: tw, h: th } = textSize(p.text, size);
        jobs.push({
          req: {
            ax: c.x, ay: c.y, dx: dir.x, dy: dir.y, gap: fixed ? 0 : p.gap ?? 7, w: tw, h: th,
            prio: fixed ? 4 : p.size ? 3 : 0, spread, bend: p.away ? 0.7 : 0.5, reach: fixed ? [0] : undefined,
          },
          text: p.text, size, fill: COLOR[p.tone ?? "ink"], italic: p.italic,
          leaderFrom: fixed ? undefined : c, leaderAfter: 22,
        });
        break;
      }
      case "side": {
        const a = S(p.a), b = S(p.b), ins = S(p.inside);
        const m = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
        const dl = Math.hypot(b.x - a.x, b.y - a.y) || 1;
        let n = { x: -(b.y - a.y) / dl, y: (b.x - a.x) / dl };
        if (n.x * (ins.x - m.x) + n.y * (ins.y - m.y) > 0) n = { x: -n.x, y: -n.y };
        const size = Math.max(14, p.size ?? fontSize);
        const { w: tw, h: th } = textSize(p.text, size);
        jobs.push({
          req: {
            ax: m.x, ay: m.y, dx: n.x, dy: n.y, gap: 5, w: tw, h: th, prio: p.size ? 2 : 1,
            spread: Math.PI / 5, flipCost: 3.5, slide: { ux: (b.x - a.x) / dl, uy: (b.y - a.y) / dl, len: Math.max(0, dl / 2 - 10) * 0.75 },
          },
          text: p.text, size, fill: COLOR[p.tone ?? "ink"],
          leaderFrom: m, leaderAfter: 26,
        });
        break;
      }
      case "ticks": {
        const a = S(p.a), b = S(p.b);
        const t = p.at ?? 0.5;
        const m = { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
        const dl = Math.hypot(b.x - a.x, b.y - a.y) || 1;
        const d = { x: (b.x - a.x) / dl, y: (b.y - a.y) / dl };
        const nn = { x: -d.y, y: d.x };
        for (let j = 0; j < p.n; j++) {
          const off = (j - (p.n - 1) / 2) * 4.5;
          const c = { x: m.x + d.x * off, y: m.y + d.y * off };
          const A = { x: c.x - nn.x * 6, y: c.y - nn.y * 6 }, B = { x: c.x + nn.x * 6, y: c.y + nn.y * 6 };
          seg(A, B);
          out.push(<line key={`${key}-${j}`} x1={n2(A.x)} y1={n2(A.y)} x2={n2(B.x)} y2={n2(B.y)} stroke={tone} strokeWidth={1.8} strokeLinecap="round" />);
        }
        break;
      }
      case "angle": {
        const v = S(p.v), a = S(p.a), b = S(p.b);
        const la = Math.hypot(a.x - v.x, a.y - v.y), lb = Math.hypot(b.x - v.x, b.y - v.y);
        if (la < 1e-6 || lb < 1e-6) break;
        const ua = { x: (a.x - v.x) / la, y: (a.y - v.y) / la }, ub = { x: (b.x - v.x) / lb, y: (b.y - v.y) / lb };
        if (p.right) {
          const q = Math.min(13, 0.3 * Math.min(la, lb));
          const P1 = { x: v.x + ua.x * q, y: v.y + ua.y * q }, P2 = { x: v.x + (ua.x + ub.x) * q, y: v.y + (ua.y + ub.y) * q }, P3 = { x: v.x + ub.x * q, y: v.y + ub.y * q };
          seg(P1, P2);
          seg(P2, P3);
          out.push(<path key={key} d={`M${n2(P1.x)} ${n2(P1.y)} L${n2(P2.x)} ${n2(P2.y)} L${n2(P3.x)} ${n2(P3.y)}`} fill="none" stroke={tone} strokeWidth={1.6} />);
          break;
        }
        // математик өнцгүүд (y дээш)
        const fa = Math.atan2(-ua.y, ua.x), fb = Math.atan2(-ub.y, ub.x);
        let start = fa, sweep = (fb - fa) % (2 * Math.PI);
        if (sweep < 0) sweep += 2 * Math.PI;
        if (!p.ccw && sweep > Math.PI) {
          start = fb;
          sweep = 2 * Math.PI - sweep;
        }
        const r0 = Math.max(12, Math.min(p.r ?? 24, 0.4 * Math.min(la, lb)));
        const arcs = Math.max(1, p.arcs ?? 1);
        for (let j = 0; j < arcs; j++) {
          const r = r0 + j * 4;
          const P0 = { x: v.x + r * Math.cos(start), y: v.y - r * Math.sin(start) };
          const P1 = { x: v.x + r * Math.cos(start + sweep), y: v.y - r * Math.sin(start + sweep) };
          arcPoly(v.x, v.y, r, start, sweep, segs);
          out.push(
            <path key={`${key}-${j}`} d={`M${n2(P0.x)} ${n2(P0.y)} A${n2(r)} ${n2(r)} 0 ${sweep > Math.PI ? 1 : 0} 0 ${n2(P1.x)} ${n2(P1.y)}`} fill="none" stroke={tone} strokeWidth={1.5} />,
          );
        }
        if (p.text) {
          const fm = start + sweep / 2;
          const dir = { x: Math.cos(fm), y: -Math.sin(fm) };
          const rOut = r0 + (arcs - 1) * 4;
          const size = Math.max(14, fontSize - 2);
          const { w: tw, h: th } = textSize(p.text, size);
          jobs.push({
            req: {
              ax: v.x, ay: v.y, dx: dir.x, dy: dir.y, gap: rOut + 4, w: tw, h: th, prio: 2,
              spread: Math.min(Math.PI / 4, sweep / 3), bend: 1.4, flipCost: 4, reach: [0, 6, 14, 24, 36, 52, 72],
            },
            text: p.text, size, fill: tone,
            leaderFrom: { x: v.x + rOut * dir.x, y: v.y + rOut * dir.y }, leaderAfter: 20,
          });
        }
        break;
      }
    }
  });

  const placed = placeLabels(jobs.map((j) => j.req), segs, discs, w, h);
  const labels: ReactNode[] = [];
  const leaders: ReactNode[] = [];
  jobs.forEach((j, i) => {
    const pl = placed[i];
    const box = { x: pl.x, y: pl.y, w: j.req.w, h: j.req.h };
    if (j.leaderFrom && !pl.ideal) {
      const e = boxEdgePoint(box, j.leaderFrom.x, j.leaderFrom.y);
      const d = Math.hypot(e.x - j.leaderFrom.x, e.y - j.leaderFrom.y);
      if (d > (j.leaderAfter ?? 22)) {
        leaders.push(
          <line key={`ld${i}`} x1={n2(j.leaderFrom.x)} y1={n2(j.leaderFrom.y)} x2={n2(e.x)} y2={n2(e.y)} stroke="var(--ink-dim)" strokeWidth={1} strokeLinecap="round" />,
        );
      }
    }
    labels.push(<SvgLabel key={`lb${i}`} x={n2(pl.x)} y={n2(pl.y)} label={j.text} size={j.size} italic={j.italic} fill={j.fill} />);
  });
  return { out, dots, labels, leaders };
}

export default function FigureSvg({ prims, view, w, h, svgRef, under, over, fontSize = 16, ...rest }: Props) {
  const { s, ox, oy } = view;
  const g = useMemo(() => render(prims, { s, ox, oy }, w, h, fontSize), [prims, s, ox, oy, w, h, fontSize]);
  return (
    <svg ref={svgRef} viewBox={`0 0 ${w} ${h}`} width={w} height={h} className="block h-full w-full select-none" role="img" {...rest}>
      {under}
      <g>{g.out}</g>
      <g>{g.leaders}</g>
      <g>{g.dots}</g>
      <g>{g.labels}</g>
      {over}
    </svg>
  );
}
