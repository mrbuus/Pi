"use client";

import { useEffect, useId, useRef, useState } from "react";
import { MoveHorizontal, RotateCcw, Box, Cone, Circle } from "lucide-react";
import MathText from "@/components/MathText";
import { Button } from "@/components/ui/kit/button";
import { drawSolid, INITIAL_VIEW, SOLIDS } from "./math-solid";
import styles from "./math-visual.module.css";

const icons = [Box, Cone, Circle];

/** Server emits the first solid; interactions redraw only SVG paths. */
export default function MathVisual() {
  const [index, setIndex] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const viewRef = useRef({ ...INITIAL_VIEW });
  const drawRef = useRef<() => void>(() => {});
  const visibleRef = useRef(false);
  const draggingRef = useRef(false);
  const descriptionId = useId();
  const visual = SOLIDS[index];
  const initial = drawSolid(index, INITIAL_VIEW.yaw, INITIAL_VIEW.pitch);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const observer = new IntersectionObserver(([entry]) => {
      visibleRef.current = entry.isIntersecting;
      if (entry.isIntersecting) drawRef.current();
    }, { threshold: 0.15 });
    observer.observe(root);
    // One local change every ten minutes while visible and unattended.
    // There is no idle animation loop, request, analytics or asset fetch.
    const timer = window.setInterval(() => {
      if (!preference.matches && visibleRef.current && document.visibilityState === "visible" && !draggingRef.current && !root.contains(document.activeElement)) {
        setIndex((current) => (current + 1) % SOLIDS.length);
      }
    }, 10 * 60 * 1000);
    return () => { observer.disconnect(); window.clearInterval(timer); };
  }, []);

  useEffect(() => {
    const stage = stageRef.current;
    const svg = svgRef.current;
    if (!stage || !svg) return;
    const shades = Array.from(svg.querySelectorAll<SVGPathElement>("[data-shade]"));
    const front = svg.querySelector<SVGPathElement>("[data-front]");
    const back = svg.querySelector<SVGPathElement>("[data-back]" );
    const dimensions = Array.from(svg.querySelectorAll<SVGPathElement>("[data-dimension]"));
    const labels = Array.from(svg.querySelectorAll<SVGForeignObjectElement>("[data-label]"));
    let frame = 0;
    let introFrame = 0;
    let introStarted = false;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let pointer: { id: number; startX: number; startY: number; x: number; y: number; touch: boolean; decided: boolean; ignored: boolean } | undefined;
    viewRef.current = { ...INITIAL_VIEW };
    function draw() {
      const paths = drawSolid(index, viewRef.current.yaw, viewRef.current.pitch);
      shades.forEach((node, position) => node.setAttribute("d", paths.shades[position]));
      front?.setAttribute("d", paths.front);
      back?.setAttribute("d", paths.back);
      dimensions.forEach((node, position) => node.setAttribute("d", paths.dimensions[position]?.path ?? ""));
      labels.forEach((node, position) => {
        const label = paths.dimensions[position];
        if (label) { node.setAttribute("x", String(label.x)); node.setAttribute("y", String(label.y)); }
      });
    }
    // A single three-second reveal gives the solid depth, then sleeps.
    // Stop immediately on focus, touch, reduced motion or leaving the viewport.
    function introduce() {
      if (introStarted || !visibleRef.current) return;
      introStarted = true;
      const started = performance.now();
      let previous = started;
      function turn(time: number) {
        introFrame = 0;
        if (time - started > 3000 || reducedMotion.matches || !visibleRef.current || document.visibilityState !== "visible" || draggingRef.current || rootRef.current?.contains(document.activeElement)) return;
        if (time - previous >= 32) {
          viewRef.current.yaw += (time - previous) * 0.0002;
          previous = time;
          draw();
        }
        introFrame = requestAnimationFrame(turn);
      }
      if (!reducedMotion.matches) introFrame = requestAnimationFrame(turn);
    }
    drawRef.current = () => { draw(); introduce(); };
    draw();
    introduce();
    function scheduleDraw() {
      if (frame || !visibleRef.current || document.visibilityState !== "visible") return;
      frame = requestAnimationFrame(() => { frame = 0; draw(); });
    }
    function down(event: PointerEvent) {
      if (!event.isPrimary || event.button !== 0) return;
      const touch = event.pointerType === "touch";
      pointer = { id: event.pointerId, startX: event.clientX, startY: event.clientY, x: event.clientX, y: event.clientY, touch, decided: !touch, ignored: false };
      draggingRef.current = true;
      if (!touch) {
        stage!.focus({ preventScroll: true });
        stage!.setPointerCapture(event.pointerId);
        stage!.dataset.dragging = "true";
        event.preventDefault();
      }
    }
    function move(event: PointerEvent) {
      if (!pointer || pointer.id !== event.pointerId || pointer.ignored) return;
      if (!pointer.decided) {
        const dx = Math.abs(event.clientX - pointer.startX), dy = Math.abs(event.clientY - pointer.startY);
        if (Math.max(dx, dy) < 8) return;
        pointer.decided = true;
        if (dy >= dx) { pointer.ignored = true; draggingRef.current = false; return; }
        stage!.setPointerCapture(event.pointerId);
        stage!.dataset.dragging = "true";
      }
      viewRef.current.yaw += (event.clientX - pointer.x) * 0.012;
      if (!pointer.touch) viewRef.current.pitch = Math.max(-1.1, Math.min(1.1, viewRef.current.pitch + (event.clientY - pointer.y) * 0.008));
      pointer.x = event.clientX; pointer.y = event.clientY;
      scheduleDraw();
    }
    function end(event: PointerEvent) {
      if (!pointer || pointer.id !== event.pointerId) return;
      if (stage!.hasPointerCapture(event.pointerId)) stage!.releasePointerCapture(event.pointerId);
      delete stage!.dataset.dragging;
      pointer = undefined; draggingRef.current = false;
    }
    function key(event: KeyboardEvent) {
      const amount = event.shiftKey ? 0.3 : 0.12;
      if (event.key === "ArrowLeft") viewRef.current.yaw -= amount;
      else if (event.key === "ArrowRight") viewRef.current.yaw += amount;
      else if (event.key === "ArrowUp") viewRef.current.pitch = Math.max(-1.1, viewRef.current.pitch - amount);
      else if (event.key === "ArrowDown") viewRef.current.pitch = Math.min(1.1, viewRef.current.pitch + amount);
      else if (event.key === "Home") viewRef.current = { ...INITIAL_VIEW };
      else return;
      event.preventDefault(); scheduleDraw();
    }
    stage.addEventListener("pointerdown", down); stage.addEventListener("pointermove", move);
    stage.addEventListener("pointerup", end); stage.addEventListener("pointercancel", end);
    stage.addEventListener("lostpointercapture", end); stage.addEventListener("keydown", key);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      if (introFrame) cancelAnimationFrame(introFrame);
      draggingRef.current = false;
      stage.removeEventListener("pointerdown", down); stage.removeEventListener("pointermove", move);
      stage.removeEventListener("pointerup", end); stage.removeEventListener("pointercancel", end);
      stage.removeEventListener("lostpointercapture", end); stage.removeEventListener("keydown", key);
      drawRef.current = () => {};
    };
  }, [index]);

  return (
    <div ref={rootRef} className={styles.exhibit}>
      <div className={styles.topline}>
        <span className={styles.kicker}>МАТЕМАТИКИЙГ ӨӨР ӨНЦГӨӨС</span>
        <Button type="button" variant="ghost" size="icon" className={styles.reset} aria-label="Биетийн өнцгийг эхлүүлэх" title="Өнцгийг эхлүүлэх" onClick={() => { viewRef.current = { ...INITIAL_VIEW }; drawRef.current(); }}><RotateCcw aria-hidden /></Button>
      </div>
      <div ref={stageRef} className={styles.stage} tabIndex={0} role="group" aria-label={`${visual.name} — эргүүлэх биет`} aria-describedby={descriptionId}>
        <span id={descriptionId} className="sr-only">Биетийг чирж эсвэл сумтай товчоор эргүүлнэ. Home товч өнцгийг эхлүүлнэ. Гар утсан дээр хажуу тийш чирж эргүүлнэ.</span>
        <div className={styles.orbit} aria-hidden /><div className={styles.shadow} aria-hidden />
        <svg ref={svgRef} viewBox="0 0 560 360" className={styles.solid} aria-hidden>
          <path data-back d={initial.back} className={styles.hiddenEdges} />
          {initial.shades.map((path, shade) => <path key={shade} data-shade={shade} d={path} className={styles[`shade${shade}`]} />)}
          <path data-front d={initial.front} className={index === 0 ? styles.edges : styles.curvedEdges} />
          {initial.dimensions.map((dimension, position) => <g key={dimension.label}>
            <path data-dimension={position} d={dimension.path} className={styles.dimension} />
            <foreignObject data-label={position} x={dimension.x} y={dimension.y} width="30" height="30" className={styles.dimensionLabel}><div><MathText>{`$${dimension.label}$`}</MathText></div></foreignObject>
          </g>)}
        </svg>
        <div className={styles.dragHint} aria-hidden><MoveHorizontal size={16} /> Чирж эргүүлээрэй</div>
      </div>
      <div className={styles.formulaRow}>
        <div><p className={styles.solidName}>{visual.name}</p><p className={styles.dimensionNote}><MathText>{visual.dimensions}</MathText></p></div>
        <div className={styles.formula}><MathText>{visual.formula}</MathText></div>
      </div>
      <div className={styles.selectors} role="group" aria-label="Биет сонгох">
        {SOLIDS.map((solid, position) => { const Icon = icons[position]; return <Button key={solid.name} type="button" variant="ghost" className={styles.selector} aria-pressed={index === position} onClick={() => setIndex(position)}><Icon size={15} aria-hidden />{solid.name}</Button>; })}
      </div>
    </div>
  );
}
