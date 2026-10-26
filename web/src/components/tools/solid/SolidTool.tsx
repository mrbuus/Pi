"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as RPointerEvent } from "react";
import { FileText, Pause, Play, RotateCcw, ZoomIn, ZoomOut } from "lucide-react";
import { Button } from "@/components/ui/kit/button";
import ToolFrame from "../core/ToolFrame";
import { loadState, saveState } from "../core/export";
import { takePending } from "../core/hub";
import { computeMeasure, defaultMeasureRefs, slotCount } from "./angles.ts";
import { clipBody, prepareBody, type Plane } from "./body.ts";
import { measures } from "./measure.ts";
import { buildNet, foldNet, prepareNet } from "./net.ts";
import { PRESETS, type View } from "./project.ts";
import { finePrepared, planeFrom, sectionInfo, type PointRef, type SectionDef } from "./section.ts";
import SolidScene, { type MeasureView, type NetView, type SectionView } from "./SolidScene";
import { SOLIDS, buildSolid, defaultParams, sanitizeParams, solidInfo, type AnnoGroup, type Params, type SolidKind } from "./solids.ts";
import { DEFAULT_STATE, defaultPoints, measureOptions, sanitizeState, validRefs, type Mode, type SolidState } from "./state.ts";
import type { PanelCtx } from "./SolidPanels";
import { centroid, dist, mul } from "./vec.ts";

/* ============================================================================
 * Биет: огторгуйн геометрийн биетийг хэмжээгээр нь зурж, эргүүлж, огтолж,
 * дэлгэж, өнцөг/зайг хэмжинэ. Зураг нь цэвэр SVG (WebGL биш) — PNG/SVG-ээр
 * тест, ажлын хуудсанд шууд тавигдана.
 *
 * Ачаалал: энэ файл (зураг) KaTeX-гүй тул жижиг chunk — таб нээгдэнгүүт
 * зураг гарна. Удирдлага, үр дүн (MathText/KaTeX) SolidPanels-д, тусдаа
 * chunk-аар зэрэгцэн ачаалагдана.
 * ========================================================================== */

const loadPanels = () => import("./SolidPanels");
// Модуль ачаалагдмагц татаж эхэлнэ (зураг зурж байх хооронд)
if (typeof window !== "undefined") void loadPanels();

function ControlsLoading() {
  return (
    <div className="space-y-4" aria-hidden>
      <div className="h-44 rounded-2xl skeleton" />
      <div className="h-28 rounded-2xl skeleton" />
    </div>
  );
}
function ResultsLoading() {
  return (
    <div className="grid grid-cols-2 gap-2 px-3 py-3" aria-hidden>
      <div className="h-16 rounded-xl skeleton" />
      <div className="h-16 rounded-xl skeleton" />
    </div>
  );
}

const SolidControls = dynamic(() => loadPanels().then((m) => m.SolidControls), { ssr: false, loading: ControlsLoading });
const SolidResults = dynamic(() => loadPanels().then((m) => m.SolidResults), { ssr: false, loading: ResultsLoading });

const STORE = "solid";
const NO_GROUPS: Record<AnnoGroup, boolean> = { height: false, apothem: false, diag: false, radius: false };

const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() => typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);
  useEffect(() => {
    const mq = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!mq) return;
    const on = () => setReduced(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return reduced;
}

/** Хадгалсан төлөв + өөр хэрэгслээс дамжсан биет (takePending нэг л удаа уншина) */
function initialState(): SolidState {
  const s = sanitizeState(loadState(STORE, DEFAULT_STATE));
  const p = takePending<{ kind?: SolidKind; params?: Partial<Params> }>("solid");
  if (p?.kind && SOLIDS.some((x) => x.kind === p.kind)) {
    const k = p.kind;
    return { ...s, kind: k, params: { ...s.params, [k]: sanitizeParams(k, p.params) }, mode: "solid" };
  }
  return s;
}

export default function SolidTool() {
  const [st, setSt] = useState<SolidState>(initialState);
  const [size, setSize] = useState({ w: 360, h: 420 });
  const svgRef = useRef<SVGSVGElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const reduced = usePrefersReducedMotion();

  // Хадгалах (эргүүлэх бүрт биш — түр хүлээж)
  useEffect(() => {
    const id = setTimeout(() => saveState(STORE, st), 400);
    return () => clearTimeout(id);
  }, [st]);

  // Зургийн талбайн хэмжээ — viewBox нь бодит пикселтэй тэнцүү (шошго утсан дээр ч уншигдана)
  useEffect(() => {
    const el = wrapRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(([e]) => {
      const w = Math.max(240, Math.round(e.contentRect.width));
      const h = Math.max(240, Math.round(e.contentRect.height));
      setSize((s) => (s.w === w && s.h === h ? s : { w, h }));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  /* ---------------------------------------------- тооцоо -- */

  const kind = st.kind;
  const info = solidInfo(kind);
  // defaultParams шинэ объект үүсгэдэг — эргүүлэх кадр бүрт биетийг дахин барихгүйн тулд memo
  const rawParams = st.params[kind];
  const params = useMemo(() => rawParams ?? defaultParams(kind), [rawParams, kind]);
  const isSphere = kind === "sphere";
  const mode: Mode = isSphere && st.mode === "measure" ? "solid" : st.mode;
  const model = useMemo(() => buildSolid(kind, params), [kind, params]);
  const prep = useMemo(() => prepareBody(model.body), [model]);
  const sec = st.section;
  const how = isSphere ? "tilt" : sec.how;
  const inSection = mode === "section";
  const inNet = mode === "net";
  const inMeasure = mode === "measure";

  // Огтлолын хүнд тооцоо (муруй биетийн 720 хуваалттай тор) зөвхөн огтлолын горимд
  const fine = useMemo(() => (inSection ? finePrepared(model) : null), [inSection, model]);
  const secRefs: PointRef[] = useMemo(() => (validRefs(model, sec.pts) ? sec.pts : defaultPoints(model)), [model, sec.pts]);
  const sectionDef: SectionDef = useMemo(
    () =>
      how === "tilt"
        ? { how: "tilt", y: sec.y * model.H, tilt: sec.tilt, turn: sec.turn, shift: sec.shift * model.span }
        : { how: "points", pts: secRefs },
    [how, sec.y, sec.tilt, sec.turn, sec.shift, secRefs, model.H, model.span],
  );
  const planeRes = useMemo(() => (inSection ? planeFrom(model, sectionDef) : null), [inSection, model, sectionDef]);
  const plane = planeRes?.plane ?? null;
  const secInfo = useMemo(() => (plane ? sectionInfo(model, prep, plane, fine) : null), [model, prep, plane, fine]);
  const cutPlane: Plane | null = useMemo(
    () => (inSection && plane && sec.cutAway ? (sec.flip ? { n: mul(plane.n, -1), d: -plane.d } : plane) : null),
    [inSection, plane, sec.cutAway, sec.flip],
  );
  const shown = useMemo(() => (cutPlane ? prepareBody(clipBody(model.body, cutPlane)) : prep), [cutPlane, model.body, prep]);

  const ms = useMemo(() => measures(kind, params), [kind, params]);

  // Дэлгээс — зөвхөн дэлгээсийн горимд
  const netBase = useMemo(() => {
    if (!inNet) return null;
    const spec = buildNet(kind, params);
    if (!spec) return null;
    const pn = prepareNet(spec);
    const flat = foldNet(pn, 0).flat();
    const folded = foldNet(pn, 1).flat();
    const center = centroid(flat);
    let radius = 0;
    for (const p of [...flat, ...folded]) radius = Math.max(radius, dist(p, center));
    return { pn, center, radius };
  }, [inNet, kind, params]);
  const netView: NetView | null = useMemo(() => (netBase ? { ...netBase, t: st.netT } : null), [netBase, st.netT]);

  // Өнцөг, зай — зөвхөн тэр горимд
  const mKind = st.measure.kind;
  const measureRefs: PointRef[] = useMemo(() => {
    if (!inMeasure) return [];
    const n = slotCount(mKind);
    return validRefs(model, st.measure.pts, n, measureOptions(model)) ? st.measure.pts : defaultMeasureRefs(model, mKind);
  }, [inMeasure, model, mKind, st.measure.pts]);
  const measureRes = useMemo(() => (inMeasure ? computeMeasure(model, mKind, measureRefs, prep.radius) : null), [inMeasure, model, mKind, measureRefs, prep.radius]);
  const measureView: MeasureView | null = useMemo(
    () => (measureRes && !measureRes.error ? { draw: measureRes.draw, names: measureRefs.flatMap((r) => ("name" in r ? [r.name] : [])) } : null),
    [measureRes, measureRefs],
  );

  const sectionView: SectionView | null = useMemo(
    () => (inSection ? { plane, info: secInfo, defPts: planeRes?.defPts ?? [], cutAway: sec.cutAway, flip: sec.flip, showPlane: sec.showPlane } : null),
    [inSection, plane, secInfo, planeRes, sec.cutAway, sec.flip, sec.showPlane],
  );

  /* ---------------------------------------------- үйлдэл -- */

  const patch = useCallback((p: Partial<SolidState>) => setSt((s) => ({ ...s, ...p })), []);
  const setView = useCallback((p: Partial<View>) => setSt((s) => ({ ...s, view: { ...s.view, ...p } })), []);

  // ---- чирэх, чимхэх (rAF-аар нэг кадрт нэг шинэчлэл) ----
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinchD = useRef(0);
  const acc = useRef({ yaw: 0, pitch: 0, zoom: 1 });
  const raf = useRef(0);
  const flush = useCallback(() => {
    raf.current = 0;
    const a = acc.current;
    acc.current = { yaw: 0, pitch: 0, zoom: 1 };
    setSt((s) => ({
      ...s,
      view: {
        ...s.view,
        yaw: (s.view.yaw + a.yaw) % 360,
        pitch: clamp(s.view.pitch + a.pitch, -90, 90),
        zoom: clamp(s.view.zoom * a.zoom, 0.4, 3),
      },
    }));
  }, []);
  const schedule = useCallback(() => {
    if (!raf.current) raf.current = requestAnimationFrame(flush);
  }, [flush]);
  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  const onDown = (e: RPointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinchD.current = Math.hypot(a.x - b.x, a.y - b.y);
    }
  };
  const onMove = (e: RPointerEvent<HTMLDivElement>) => {
    const prev = pointers.current.get(e.pointerId);
    if (!prev) return;
    const cur = { x: e.clientX, y: e.clientY };
    pointers.current.set(e.pointerId, cur);
    if (pointers.current.size === 1) {
      acc.current.yaw += (cur.x - prev.x) * 0.45;
      acc.current.pitch += (cur.y - prev.y) * 0.45;
    } else if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (pinchD.current > 0) acc.current.zoom *= d / pinchD.current;
      pinchD.current = d;
    }
    schedule();
  };
  const onUp = (e: RPointerEvent<HTMLDivElement>) => {
    pointers.current.delete(e.pointerId);
    // нэг хуруу үлдвэл дараагийн хөдөлгөөн «үсрэхгүй»: чимхэлтийг шинээр эхлүүлнэ
    pinchD.current = 0;
  };

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      acc.current.zoom *= Math.exp(-e.deltaY * 0.0015);
      schedule();
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [schedule]);

  // ---- автомат эргэлт (хөдөлгөөн багасгах горимд унтарна) ----
  const autoOn = st.auto && !reduced;
  useEffect(() => {
    if (!autoOn) return;
    let id = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      setSt((s) => ({ ...s, view: { ...s.view, yaw: (s.view.yaw + dt * 20) % 360 } }));
      id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [autoOn]);

  /* ---------------------------------------------- харагдац -- */

  const title = `${info.name}${inSection && secInfo ? ` — огтлол: ${secInfo.name}` : inNet ? " — дэлгээс" : inMeasure ? " — өнцөг, зай" : ""}`;

  const toolbar = (
    <>
      <Button variant="ghost" size="icon" className="hidden sm:inline-flex" onClick={() => setView({ zoom: clamp(st.view.zoom / 1.2, 0.4, 3) })} aria-label="Жижигрүүлэх">
        <ZoomOut className="h-4 w-4" aria-hidden />
      </Button>
      <Button variant="ghost" size="icon" className="hidden sm:inline-flex" onClick={() => setView({ zoom: clamp(st.view.zoom * 1.2, 0.4, 3) })} aria-label="Томруулах">
        <ZoomIn className="h-4 w-4" aria-hidden />
      </Button>
      <Button variant="ghost" size="icon" onClick={() => setView({ ...(inNet ? PRESETS.top : PRESETS.default), zoom: 1 })} aria-label="Анхны байрлал">
        <RotateCcw className="h-4 w-4" aria-hidden />
      </Button>
      {!reduced && (
        <Button variant="ghost" size="icon" onClick={() => patch({ auto: !st.auto })} aria-pressed={st.auto} aria-label={st.auto ? "Эргэлтийг зогсоох" : "Автоматаар эргүүлэх"}>
          {st.auto ? <Pause className="h-4 w-4" aria-hidden /> : <Play className="h-4 w-4" aria-hidden />}
        </Button>
      )}
      <Button
        variant={st.test ? "secondary" : "ghost"}
        size="sm"
        className="min-h-11"
        onClick={() => patch({ test: !st.test })}
        aria-pressed={st.test}
        aria-label="Тестэд зориулж: тоогүй, цагаан дэвсгэр, хар зураас"
      >
        <FileText className="h-4 w-4" aria-hidden />
        Тестэд
      </Button>
    </>
  );

  const ctx: PanelCtx = {
    st,
    setSt,
    model,
    params,
    ms,
    mode,
    secInfo,
    planeError: planeRes?.error ?? null,
    how,
    secRefs,
    netOk: !!netBase,
    measureRes,
    measureRefs,
    reduced,
  };

  return (
    <ToolFrame
      svgRef={svgRef}
      fileName={`pimath-${kind}${inSection ? "-ogtlol" : inNet ? "-delgees" : inMeasure ? "-untsug" : ""}`}
      controls={<SolidControls ctx={ctx} />}
      toolbar={toolbar}
      footer={<SolidResults ctx={ctx} />}
    >
      {/* Утсан дээр зураг ~55vh; 1024px+ үед удирдлагын багана өндөр тул зургийг дэлгэцэнд наалдуулна */}
      <div className="relative h-[55svh] min-h-72 lg:absolute lg:inset-0 lg:h-auto lg:min-h-0">
        <div
          ref={wrapRef}
          className="h-full w-full cursor-grab touch-none active:cursor-grabbing lg:sticky lg:top-2 lg:h-[min(100%,calc(100dvh-8rem))] lg:min-h-60"
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          onLostPointerCapture={onUp}
        >
          <SolidScene
            svgRef={svgRef}
            w={size.w}
            h={size.h}
            model={model}
            prep={prep}
            shown={shown}
            view={st.view}
            hidden={st.hidden}
            labels={st.labels}
            dims={st.dims}
            numbers={st.numbers}
            groups={inMeasure ? NO_GROUPS : st.groups}
            section={sectionView}
            net={inNet ? netView : null}
            measure={measureView}
            test={st.test}
            title={title}
          />
        </div>
      </div>
    </ToolFrame>
  );
}
