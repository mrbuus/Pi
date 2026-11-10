"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronUp, ExternalLink, LoaderCircle, RotateCw, ZoomIn, ZoomOut } from "lucide-react";
import { fileUrl } from "@/lib/api";
import { cn } from "@/lib/cn";
import { usePdfPages } from "./usePdfPages";

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 4;
const clampZoom = (z: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.round(z * 100) / 100));

const tool =
  "flex size-11 shrink-0 items-center justify-center rounded-lg text-ink-dim transition hover:bg-ink/5 hover:text-ink focus-visible:ring-2 focus-visible:ring-brand-bright disabled:opacity-30 sm:size-9";

/**
 * Илгээсэн дэвтрийн хуудсуудыг цонх ДОТОР PDF шиг уншина (эзэн 2026-11-05): хуудсууд доошоо
 * дараалж (touchpad, хуруугаар жигд гүйлгэнэ), дурын хэмжээгээр томруулж/жижигрүүлж (товч,
 * touchpad-ын хоёр хуруу = ctrl+wheel, утсан дээр чимхэх), томруулсан үед хажуу тийш гүйлгэнэ,
 * хуудас бүрийг тусад нь эргүүлнэ. Бүтэн дэлгэцийн тусдаа давхарга нээхгүй — өөр цонхны дотор
 * нээгдсэн давхарга хулгана/гүйлгээг алддаг байв.
 */
export default function PagesReader({ keys, pages, className }: { keys: string[]; pages: number; className?: string }) {
  const [retry, setRetry] = useState(0);
  const state = usePdfPages(keys, true, retry);
  const count = state.status === "ready" ? state.urls.length : Math.max(1, pages);
  const [zoom, setZoom] = useState(1);
  const [rot, setRot] = useState<Record<number, number>>({});
  const [ratio, setRatio] = useState<Record<number, number>>({}); // өндөр / өргөн
  const [cur, setCur] = useState(0);
  const [width, setWidth] = useState(0);
  const box = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<(HTMLDivElement | null)[]>([]);
  const zoomRef = useRef(1);

  // Чингэлгийн өргөн → хуудасны өргөн (zoom = 1 үед багтана)
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setWidth(el.clientWidth));
    ro.observe(el);
    setWidth(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  /** Томруулахдаа харж буй цэгээ хадгална (fx, fy = чингэлэг доторх байрлал 0..1) */
  const applyZoom = useCallback((next: number, fx = 0.5, fy = 0.5) => {
    const el = box.current;
    const z0 = zoomRef.current;
    const z1 = clampZoom(next);
    if (!el || z1 === z0) return;
    const ax = el.scrollLeft + el.clientWidth * fx;
    const ay = el.scrollTop + el.clientHeight * fy;
    zoomRef.current = z1;
    setZoom(z1);
    requestAnimationFrame(() => {
      el.scrollLeft = (ax * z1) / z0 - el.clientWidth * fx;
      el.scrollTop = (ay * z1) / z0 - el.clientHeight * fy;
    });
  }, []);

  // Touchpad-ын чимхэлт (ctrl+wheel) ба утасны хоёр хуруу — хөтчийн хуудас томруулахыг хаана
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      const r = el.getBoundingClientRect();
      applyZoom(zoomRef.current * Math.exp(-e.deltaY * 0.01), (e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height);
    };
    let pinch: { d: number; z: number } | null = null;
    const dist = (t: TouchList) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
    const onStart = (e: TouchEvent) => {
      if (e.touches.length === 2) pinch = { d: dist(e.touches), z: zoomRef.current };
    };
    const onMove = (e: TouchEvent) => {
      if (!pinch || e.touches.length !== 2) return;
      e.preventDefault();
      const r = el.getBoundingClientRect();
      const cx = (e.touches[0].clientX + e.touches[1].clientX) / 2;
      const cy = (e.touches[0].clientY + e.touches[1].clientY) / 2;
      applyZoom((pinch.z * dist(e.touches)) / pinch.d, (cx - r.left) / r.width, (cy - r.top) / r.height);
    };
    const onEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) pinch = null;
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("touchstart", onStart, { passive: true });
    el.addEventListener("touchmove", onMove, { passive: false });
    el.addEventListener("touchend", onEnd);
    return () => {
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("touchstart", onStart);
      el.removeEventListener("touchmove", onMove);
      el.removeEventListener("touchend", onEnd);
    };
  }, [applyZoom]);

  // Одоогийн хуудас: дээд гуравны нэгт хамгийн ойр
  function onScroll() {
    const el = box.current;
    if (!el) return;
    const line = el.scrollTop + el.clientHeight / 3;
    let i = 0;
    pageRefs.current.forEach((p, k) => {
      if (p && p.offsetTop <= line) i = k;
    });
    if (i !== cur) setCur(i);
  }

  const goTo = (i: number) => {
    const next = Math.max(0, Math.min(count - 1, i));
    const p = pageRefs.current[next];
    if (p && box.current) box.current.scrollTo({ top: p.offsetTop - 8, behavior: "smooth" });
    setCur(next);
  };

  const href = keys.length === 1 ? fileUrl(keys[0]) : undefined;
  const pageW = Math.max(0, width - 16) * zoom; // p-2 зай

  return (
    <div className={cn("flex min-h-0 flex-col overflow-hidden rounded-xl border border-line bg-panel", className)}>
      <div className="flex shrink-0 items-center gap-0.5 overflow-x-auto border-b border-line bg-surface px-1 [scrollbar-width:none]" role="toolbar" aria-label="Зургийн удирдлага">
        {/* Утсан дээр хуруугаар гүйлгэнэ — сумыг нууж, томруулах/эргүүлэх багтана */}
        <button type="button" className={cn(tool, "hidden sm:flex")} onClick={() => goTo(cur - 1)} disabled={cur === 0} aria-label="Өмнөх хуудас">
          <ChevronUp className="size-5" aria-hidden />
        </button>
        <span aria-live="polite" className="min-w-12 text-center text-sm font-semibold tabular-nums text-ink">
          {cur + 1} / {count}
        </span>
        <button type="button" className={cn(tool, "hidden sm:flex")} onClick={() => goTo(cur + 1)} disabled={cur >= count - 1} aria-label="Дараах хуудас">
          <ChevronDown className="size-5" aria-hidden />
        </button>
        <span className="mx-1 hidden h-6 w-px bg-line sm:block" aria-hidden />
        <button type="button" className={tool} onClick={() => applyZoom(zoom / 1.25)} disabled={zoom <= MIN_ZOOM} aria-label="Жижигрүүлэх">
          <ZoomOut className="size-5" aria-hidden />
        </button>
        <button
          type="button"
          onClick={() => applyZoom(1, 0, 0)}
          className="min-h-11 min-w-14 rounded-lg px-1 text-xs font-semibold tabular-nums text-ink-dim hover:bg-ink/5 hover:text-ink sm:min-h-9"
          aria-label="Багтаах"
          title="Багтаах"
        >
          {Math.round(zoom * 100)}%
        </button>
        <button type="button" className={tool} onClick={() => applyZoom(zoom * 1.25)} disabled={zoom >= MAX_ZOOM} aria-label="Томруулах">
          <ZoomIn className="size-5" aria-hidden />
        </button>
        <button
          type="button"
          className={tool}
          onClick={() => setRot((r) => ({ ...r, [cur]: ((r[cur] ?? 0) + 90) % 360 }))}
          disabled={state.status !== "ready"}
          aria-label={`${cur + 1}-р хуудсыг эргүүлэх`}
        >
          <RotateCw className="size-5" aria-hidden />
        </button>
        {href && (
          <a href={href} target="_blank" rel="noopener noreferrer" className={cn(tool, "ml-auto hidden sm:flex")} aria-label="Шинэ цонхонд нээх" title="Шинэ цонхонд нээх">
            <ExternalLink className="size-4" aria-hidden />
          </a>
        )}
      </div>

      <div
        ref={box}
        onScroll={onScroll}
        tabIndex={0}
        role="region"
        aria-label="Дэвтрийн хуудсууд"
        className="min-h-0 flex-1 overflow-auto overscroll-contain p-2 [touch-action:pan-x_pan-y] focus-visible:outline-none"
      >
        {state.status === "error" ? (
          <div role="alert" className="flex h-full flex-col items-center justify-center gap-3 p-4 text-center">
            <p className="text-sm text-ink-dim">Зургийг харуулж чадсангүй</p>
            <button
              type="button"
              onClick={() => setRetry((n) => n + 1)}
              className="inline-flex min-h-11 items-center gap-2 rounded-full border border-line px-4 text-sm font-semibold hover:bg-ink/5"
            >
              <RotateCw className="size-4" aria-hidden />
              Дахин оролдох
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3" style={{ width: pageW > 0 ? Math.max(pageW, width - 16) : undefined }}>
            {Array.from({ length: count }, (_, i) => {
              const url = state.status === "ready" ? state.urls[i] : null;
              const d = rot[i] ?? 0;
              const side = d % 180 !== 0;
              const r = ratio[i] ?? 4 / 3; // өндөр / өргөн
              // Эргүүлсэн үед харагдах өргөн нь зургийн өндөр болно — хайрцгийг түүгээр хэмжинэ
              const boxH = side ? pageW / r : pageW * r;
              const imgW = side ? pageW / r : pageW;
              return (
                <div
                  key={i}
                  ref={(n) => {
                    pageRefs.current[i] = n;
                  }}
                  className="relative shrink-0 overflow-hidden rounded-md bg-surface shadow-sm"
                  style={{ width: pageW || "100%", height: pageW ? boxH : undefined, minHeight: pageW ? undefined : "60vh" }}
                >
                  {url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={url}
                      alt={`${i + 1}-р хуудас`}
                      draggable={false}
                      onLoad={(e) => {
                        const im = e.currentTarget;
                        if (im.naturalWidth) setRatio((m) => ({ ...m, [i]: im.naturalHeight / im.naturalWidth }));
                      }}
                      onDoubleClick={(e) => {
                        const b = box.current?.getBoundingClientRect();
                        if (!b) return;
                        applyZoom(zoom > 1 ? 1 : 2, (e.clientX - b.left) / b.width, (e.clientY - b.top) / b.height);
                      }}
                      className="absolute left-1/2 top-1/2 max-w-none select-none"
                      style={{ width: imgW || "100%", transform: `translate(-50%, -50%) rotate(${d}deg)` }}
                    />
                  ) : (
                    <div className="flex h-full min-h-[50vh] w-full items-center justify-center">
                      <LoaderCircle className="size-7 animate-spin text-ink-dim motion-reduce:animate-none" aria-label="Ачаалж байна" />
                    </div>
                  )}
                  <span className="absolute bottom-1.5 left-1.5 rounded-md bg-ink/70 px-1.5 text-xs font-bold tabular-nums text-bg">{i + 1}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
