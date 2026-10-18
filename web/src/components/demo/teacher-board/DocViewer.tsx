"use client";

import { ChevronDown, ChevronUp, MoveHorizontal, RotateCw, ZoomIn, ZoomOut } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import NotebookPage from "./NotebookPage";
import { IconBtn } from "./parts";

const BASE_W = 720;
const ASPECT = 1.4142;

const reduceMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * PDF маягийн хуудас үзэгч: хуудсууд босоогоор давхарлагдан гүйлгэгдэнэ,
 * "2 / 3" тоолуур, одоогийн хуудсыг 90°-аар эргүүлэх, өргөнд тааруулах.
 * Зураг байхгүй — хуудас бүр SVG. Сурагч солигдоход эцэг нь `key`-ээр шинэчилнэ.
 */
export default function DocViewer({ seed, pages }: { seed: number; pages: number }) {
  const [cur, setCur] = useState(0);
  const [rot, setRot] = useState<number[]>(() => Array.from({ length: pages }, () => 0));
  const [scale, setScale] = useState<number | null>(null); // null = өргөнд тааруулсан
  const scroller = useRef<HTMLDivElement>(null);
  const refs = useRef<Array<HTMLDivElement | null>>([]);

  const onScroll = useCallback(() => {
    const sc = scroller.current;
    if (!sc) return;
    let idx = 0;
    const limit = sc.scrollTop + sc.clientHeight * 0.35;
    refs.current.forEach((el, i) => {
      if (el && el.offsetTop - 16 <= limit) idx = i;
    });
    if (sc.scrollTop + sc.clientHeight >= sc.scrollHeight - 4) idx = pages - 1;
    setCur(idx);
  }, [pages]);

  const goTo = (i: number) => {
    const el = refs.current[i];
    const sc = scroller.current;
    if (!el || !sc) return;
    sc.scrollTo({ top: el.offsetTop - 12, behavior: reduceMotion() ? "auto" : "smooth" });
  };

  const rotate = () => setRot((r) => r.map((v, i) => (i === cur ? (v + 90) % 360 : v)));
  const zoom = (delta: number) => setScale((s) => Math.min(2.5, Math.max(0.5, (s ?? 1) + delta)));

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 flex-wrap items-center gap-0.5 border-b border-line bg-surface px-1.5 py-1">
        <IconBtn label="Өмнөх хуудас" onClick={() => goTo(Math.max(0, cur - 1))} disabled={cur === 0}>
          <ChevronUp className="size-5" aria-hidden />
        </IconBtn>
        <span aria-live="polite" className="min-w-14 text-center text-sm font-semibold tabular-nums text-ink">
          {cur + 1} / {pages}
        </span>
        <IconBtn label="Дараах хуудас" onClick={() => goTo(Math.min(pages - 1, cur + 1))} disabled={cur === pages - 1}>
          <ChevronDown className="size-5" aria-hidden />
        </IconBtn>
        <span aria-hidden className="mx-1 h-5 w-px bg-line" />
        <IconBtn label="Хуудсыг эргүүлэх" onClick={rotate}>
          <RotateCw className="size-4" aria-hidden />
        </IconBtn>
        <span aria-hidden className="mx-1 h-5 w-px bg-line" />
        <IconBtn label="Жижигрүүлэх" onClick={() => zoom(-0.25)} disabled={scale !== null && scale <= 0.5} className="hidden sm:inline-flex">
          <ZoomOut className="size-4" aria-hidden />
        </IconBtn>
        <span className="hidden min-w-10 text-center text-xs tabular-nums text-ink-dim sm:inline">
          {scale === null ? "Өргөн" : `${Math.round(scale * 100)}%`}
        </span>
        <IconBtn label="Томруулах" onClick={() => zoom(0.25)} disabled={scale !== null && scale >= 2.5} className="hidden sm:inline-flex">
          <ZoomIn className="size-4" aria-hidden />
        </IconBtn>
        <IconBtn label="Өргөнд тааруулах" onClick={() => setScale(null)} className={cn(scale === null && "text-brand")}>
          <MoveHorizontal className="size-4" aria-hidden />
        </IconBtn>
      </div>

      <div
        ref={scroller}
        onScroll={onScroll}
        tabIndex={0}
        role="region"
        aria-label="Илгээсэн хуудсууд"
        className="relative min-h-0 flex-1 overflow-auto bg-ink/[0.06] p-3 sm:p-4"
      >
        {Array.from({ length: pages }, (_, i) => {
          const deg = rot[i] ?? 0;
          const sideways = deg % 180 !== 0;
          return (
            <div
              key={i}
              ref={(el) => {
                refs.current[i] = el;
              }}
              className="mx-auto mb-3 last:mb-0"
              style={scale === null ? { width: "100%", maxWidth: 960 } : { width: scale * BASE_W }}
            >
              <div
                className="elev-2 relative overflow-hidden border border-line bg-surface"
                style={{ aspectRatio: sideways ? `${ASPECT} / 1` : `1 / ${ASPECT}` }}
              >
                <div
                  className="absolute transition-transform duration-200 motion-reduce:transition-none"
                  style={
                    sideways
                      ? {
                          left: "50%",
                          top: "50%",
                          width: `${100 / ASPECT}%`,
                          height: `${100 * ASPECT}%`,
                          transform: `translate(-50%, -50%) rotate(${deg}deg)`,
                        }
                      : { inset: 0, transform: `rotate(${deg}deg)` }
                  }
                >
                  <NotebookPage seed={seed} index={i} total={pages} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
