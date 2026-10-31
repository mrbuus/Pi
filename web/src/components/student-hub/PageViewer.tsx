"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, ExternalLink, LoaderCircle, RotateCw, X, ZoomIn, ZoomOut } from "lucide-react";
import { fileUrl } from "@/lib/api";
import { cn } from "@/lib/cn";
import { usePdfPages } from "./usePdfPages";

const reduceMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/*
 * Зургийн бүрэн дэлгэцийн үзэгч. Дэвсгэр нь горимоос үл хамааран үргэлж бараан
 * (зурган overlay) тул энд `text-white` / `bg-black` зориуд ашигласан.
 */
const ctrl =
  "flex size-11 shrink-0 items-center justify-center rounded-full text-white transition hover:bg-white/15 focus-visible:ring-2 focus-visible:ring-white/70 disabled:opacity-30";

/**
 * Хуудас бүрийг бүтэн дэлгэцээр: хуруугаар шударч (scroll-snap), сум/гарын
 * ← → товчоор шилжинэ, хоёр товшиж эсвэл товчоор 2 дахин томруулна, хуруугаар
 * томруулах (pinch) нь хөтчийн өөрийнх. Апп дотор харуулж чадаагүй бол
 * «Шинэ цонхонд нээх» нөөц зам.
 */
export default function PageViewer({
  keys,
  pages,
  start = 0,
  title,
  subtitle,
  onClose,
}: {
  keys: string[];
  /** Хуудасны тоо (ачаалахаас өмнөх сүүдэрт) */
  pages: number;
  start?: number;
  title: string;
  subtitle?: string;
  onClose: () => void;
}) {
  const [retry, setRetry] = useState(0);
  const state = usePdfPages(keys, true, retry);
  const count = state.status === "ready" ? state.urls.length : Math.max(1, pages);
  const [cur, setCur] = useState(Math.min(start, count - 1));
  const [zoom, setZoom] = useState(false);
  const [rot, setRot] = useState<Record<number, number>>({});
  const track = useRef<HTMLDivElement>(null);
  const dialog = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const positioned = useRef(false);

  const goTo = useCallback(
    (i: number, smooth = true) => {
      const el = track.current;
      if (!el) return;
      const next = Math.max(0, Math.min(count - 1, i));
      setZoom(false);
      el.scrollTo({ left: next * el.clientWidth, behavior: smooth && !reduceMotion() ? "smooth" : "auto" });
      setCur(next);
    },
    [count],
  );

  // Эхний хуудас руу (анимацгүй) — слайдууд сүүдрээр ч байрлалтай
  useEffect(() => {
    if (positioned.current || !track.current) return;
    positioned.current = true;
    goTo(start, false);
  }, [goTo, start]);

  // Фокус, Escape, сум, Tab занга, арын гүйлгээг түгжих
  useEffect(() => {
    const prevFocus = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      } else if (e.key === "ArrowRight") goTo(cur + 1);
      else if (e.key === "ArrowLeft") goTo(cur - 1);
      else if (e.key === "Tab" && dialog.current) {
        const items = Array.from(
          dialog.current.querySelectorAll<HTMLElement>("button:not([disabled]), a[href], [tabindex='0']"),
        );
        if (!items.length) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
    window.addEventListener("keydown", onKey, true);
    return () => {
      window.removeEventListener("keydown", onKey, true);
      document.body.style.overflow = prevOverflow;
      prevFocus?.focus?.();
    };
  }, [cur, goTo, onClose]);

  function onScroll() {
    const el = track.current;
    if (!el || zoom) return;
    const i = Math.round(el.scrollLeft / Math.max(1, el.clientWidth));
    if (i !== cur) setCur(Math.max(0, Math.min(count - 1, i)));
  }

  const href = keys.length === 1 ? fileUrl(keys[0]) : undefined;

  return createPortal(
    <div
      ref={dialog}
      data-page-viewer
      role="dialog"
      aria-modal="true"
      aria-labelledby="page-viewer-title"
      className="fixed inset-0 z-[80] flex flex-col bg-black text-white"
    >
      <div className="flex shrink-0 items-center gap-1 px-2 pt-[max(0.5rem,env(safe-area-inset-top))] pb-1">
        <div className="min-w-0 flex-1 px-2">
          <p id="page-viewer-title" className="truncate text-sm font-bold">
            {title}
          </p>
          {subtitle && <p className="truncate text-xs text-white/70">{subtitle}</p>}
        </div>
        <span aria-live="polite" className="px-2 text-sm font-semibold tabular-nums text-white/90">
          {cur + 1} / {count}
        </span>
        <button
          type="button"
          className={ctrl}
          onClick={() => setRot((r) => ({ ...r, [cur]: ((r[cur] ?? 0) + 90) % 360 }))}
          aria-label="Эргүүлэх"
          disabled={state.status !== "ready"}
        >
          <RotateCw className="size-5" aria-hidden />
        </button>
        <button
          type="button"
          className={ctrl}
          onClick={() => setZoom((z) => !z)}
          aria-label={zoom ? "Жижигрүүлэх" : "Томруулах"}
          aria-pressed={zoom}
          disabled={state.status !== "ready"}
        >
          {zoom ? <ZoomOut className="size-5" aria-hidden /> : <ZoomIn className="size-5" aria-hidden />}
        </button>
        <button ref={closeRef} type="button" className={ctrl} onClick={onClose} aria-label="Хаах">
          <X className="size-6" aria-hidden />
        </button>
      </div>

      <div className="relative min-h-0 flex-1">
        <div
          ref={track}
          onScroll={onScroll}
          tabIndex={0}
          role="region"
          aria-label="Хуудсууд"
          className={cn(
            "flex h-full snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
            zoom ? "overflow-hidden" : "overflow-x-auto overflow-y-hidden",
          )}
        >
          {Array.from({ length: count }, (_, i) => {
            const url = state.status === "ready" ? state.urls[i] : null;
            const d = rot[i] ?? 0;
            const zoomed = zoom && i === cur;
            return (
              <div
                key={i}
                className={cn(
                  "flex h-full w-full shrink-0 snap-center snap-always",
                  zoomed ? "overflow-auto" : "items-center justify-center overflow-hidden p-2 sm:p-6",
                )}
                aria-hidden={i !== cur}
              >
                {url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={url}
                    alt={`${i + 1}-р хуудас`}
                    draggable={false}
                    onDoubleClick={() => setZoom((z) => !z)}
                    className={cn(
                      "select-none transition-transform duration-200 motion-reduce:transition-none",
                      zoomed ? "m-auto w-[200%] max-w-none" : "max-h-full max-w-full object-contain",
                    )}
                    style={d ? { transform: `rotate(${d}deg)${d % 180 && !zoomed ? " scale(0.75)" : ""}` } : undefined}
                  />
                ) : state.status === "error" ? (
                  i === cur ? (
                    <div role="alert" className="max-w-xs space-y-3 text-center">
                      <p className="text-sm text-white/85">Зургийг энд харуулж чадсангүй</p>
                      <div className="flex flex-wrap justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => setRetry((n) => n + 1)}
                          className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/40 px-4 text-sm font-semibold hover:bg-white/10"
                        >
                          <RotateCw className="size-4" aria-hidden />
                          Дахин оролдох
                        </button>
                        {href && (
                          <a
                            href={href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex min-h-11 items-center gap-2 rounded-full bg-white px-4 text-sm font-bold text-black"
                          >
                            <ExternalLink className="size-4" aria-hidden />
                            Шинэ цонхонд нээх
                          </a>
                        )}
                      </div>
                    </div>
                  ) : null
                ) : (
                  <div className="flex aspect-[3/4] h-[70%] max-w-full items-center justify-center rounded-lg bg-white/10">
                    <LoaderCircle className="size-8 animate-spin text-white/70 motion-reduce:animate-none" aria-label="Ачаалж байна" />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {count > 1 && (
          <>
            <button
              type="button"
              onClick={() => goTo(cur - 1)}
              disabled={cur === 0}
              aria-label="Өмнөх хуудас"
              className={cn(ctrl, "absolute left-2 top-1/2 hidden -translate-y-1/2 bg-black/50 sm:flex")}
            >
              <ChevronLeft className="size-6" aria-hidden />
            </button>
            <button
              type="button"
              onClick={() => goTo(cur + 1)}
              disabled={cur === count - 1}
              aria-label="Дараах хуудас"
              className={cn(ctrl, "absolute right-2 top-1/2 hidden -translate-y-1/2 bg-black/50 sm:flex")}
            >
              <ChevronRight className="size-6" aria-hidden />
            </button>
          </>
        )}
      </div>

      {count > 1 && (
        <div className="flex shrink-0 items-center justify-center gap-1.5 px-4 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          {Array.from({ length: count }, (_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => goTo(i)}
              aria-label={`${i + 1}-р хуудас`}
              aria-current={i === cur ? "true" : undefined}
              className="flex size-8 items-center justify-center rounded-full focus-visible:ring-2 focus-visible:ring-white/70"
            >
              <span
                className={cn(
                  "block size-2 rounded-full transition-transform motion-reduce:transition-none",
                  i === cur ? "scale-125 bg-white" : "bg-white/40",
                )}
              />
            </button>
          ))}
        </div>
      )}
    </div>,
    document.body,
  );
}
