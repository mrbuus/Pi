"use client";

import { useEffect, useRef, useState } from "react";
import { FileImage, Maximize2 } from "lucide-react";
import { saveDataOn } from "@/lib/pdfImages";
import { cn } from "@/lib/cn";
import PageViewer from "./PageViewer";
import { usePdfPages } from "./usePdfPages";

/**
 * Илгээсэн хуудсуудын жижиг зургууд. Дарахад бүтэн дэлгэцийн үзэгч нээгдэнэ.
 * `autoLoad` бол дэлгэцэд харагдмагц жижиг зургийг татна (дата хэмнэх горимд үгүй);
 * эс бол дугаартай хуудасны сүүдэр харагдаж, нээхэд л татна.
 */
export default function PhotoPages({
  keys,
  pages,
  title,
  subtitle,
  autoLoad = false,
  max = 6,
}: {
  keys: string[];
  pages: number;
  title: string;
  subtitle?: string;
  autoLoad?: boolean;
  /** Жагсаалтад харуулах дээд тоо — үлдсэнийг «+N» */
  max?: number;
}) {
  const [open, setOpen] = useState<number | null>(null);
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLUListElement>(null);

  useEffect(() => {
    if (!autoLoad || saveDataOn()) return;
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      // хуучин хөтөч — шууд татна
      setVisible(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true);
          io.disconnect();
        }
      },
      { rootMargin: "200px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [autoLoad]);

  const state = usePdfPages(keys, visible);
  const total = state.status === "ready" ? state.urls.length : Math.max(1, pages);
  const shown = Math.min(total, max);
  const extra = total - shown;

  return (
    <>
      <ul ref={ref} className="grid grid-cols-3 gap-2 sm:grid-cols-6" aria-label={`${title} — ${total} хуудас`}>
        {Array.from({ length: shown }, (_, i) => {
          const url = state.status === "ready" ? state.urls[i] : null;
          const last = i === shown - 1 && extra > 0;
          return (
            <li key={i}>
              <button
                type="button"
                onClick={() => setOpen(i)}
                aria-label={`${i + 1}-р хуудсыг томруулж харах`}
                className="group relative flex aspect-[3/4] w-full items-center justify-center overflow-hidden rounded-xl border border-line bg-panel transition hover:border-brand-bright focus-visible:ring-2 focus-visible:ring-brand-bright"
              >
                {url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={url} alt="" className="h-full w-full object-cover" draggable={false} />
                ) : (
                  <FileImage
                    className={cn("size-7 text-ink-dim/50", state.status === "loading" && "animate-pulse motion-reduce:animate-none")}
                    aria-hidden
                  />
                )}
                <span className="absolute bottom-1 left-1 rounded-md bg-ink/70 px-1.5 text-xs font-bold tabular-nums text-bg">
                  {i + 1}
                </span>
                {last ? (
                  <span className="absolute inset-0 flex items-center justify-center bg-ink/55 text-lg font-bold tabular-nums text-bg">
                    +{extra}
                  </span>
                ) : (
                  <Maximize2
                    className="absolute right-1 top-1 size-6 rounded-md bg-ink/60 p-1 text-bg opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100"
                    aria-hidden
                  />
                )}
              </button>
            </li>
          );
        })}
      </ul>
      {open !== null && (
        <PageViewer keys={keys} pages={total} start={open} title={title} subtitle={subtitle} onClose={() => setOpen(null)} />
      )}
    </>
  );
}
