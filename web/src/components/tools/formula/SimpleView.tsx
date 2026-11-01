"use client";

import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { ChevronDown, Lightbulb, TriangleAlert } from "lucide-react";
import MathText from "@/components/MathText";
import { cn } from "@/lib/cn";
import type { SheetSimple } from "./formulaSheet.ts";

/* ============================================================================
 * Томьёоны энгийн тайлбар — математикийн мэдлэггүй хүнд (эзэн 2026-11-02).
 *
 * Анх харагдах: өнгөтэй томьёо, нэг өгүүлбэр, үсэг бүрийн утга (өнгөөр холбогдоно).
 * «Алхамаар ойлгох»: дугаартай алхам, жижиг тоотой жишээ, анхаарах зүйл.
 * Өнгө нь \colA{…}–\colD{…} — дэлгэцийн горимын токеноос (хөх, ягаан, ногоон,
 * нил ягаан; шар ХОРИОТОЙ). KaTeX-ийн \textcolor нь trust шаарддаггүй.
 * ========================================================================== */

const VARS: Record<string, string> = { A: "--brand", B: "--rose", C: "--teal", D: "--violet" };
const FALLBACK: Record<string, string> = { A: "#1D4ED8", B: "#BE123C", C: "#0F766E", D: "#6D28D9" };

function palette(): Record<string, string> {
  if (typeof window === "undefined") return FALLBACK;
  const css = getComputedStyle(document.documentElement);
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(VARS)) out[k] = css.getPropertyValue(v).trim() || FALLBACK[k];
  return out;
}

/** \colA{x} → \textcolor{#hex}{x} — горимын (цагаан/хар) токены өнгөөр */
export function colorize(src: string, pal = palette()): string {
  return src.replace(/\\col([A-D])\{/g, (_m, c: string) => `\\textcolor{${pal[c]}}{`);
}

/** Өнгөт тэмдэглэгээг арилгана (хэвлэх, LaTeX хуулах) */
export function plainColors(src: string): string {
  return src.replace(/\\col[A-D]\{/g, "{");
}

/** Урт томьёог хайрцгийн өргөнд багтаана: тасарч, хэвтээ гүйхгүй (доод хязгаар 60%) */
export function FitWidth({ children, className }: { children: ReactNode; className?: string }) {
  const box = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);
  const [k, setK] = useState(1);
  useLayoutEffect(() => {
    const b = box.current, i = inner.current;
    if (!b || !i) return;
    const fit = () => {
      // scrollWidth нь одоогийн масштабаар — анхны өргөнийг гаргаж тооцно
      const cur = parseFloat(i.style.fontSize) || 1;
      const natural = i.scrollWidth / cur;
      const next = Math.max(0.6, Math.min(1, (b.clientWidth - 2) / Math.max(1, natural)));
      setK((p) => (Math.abs(p - next) > 0.01 ? next : p));
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(b);
    return () => ro.disconnect();
  }, [children]);
  return (
    <div ref={box} className={cn("overflow-hidden", className)}>
      <div ref={inner} className="inline-block min-w-full" style={{ fontSize: `${k}em` }}>
        {children}
      </div>
    </div>
  );
}

export default function SimpleView({ s, big }: { s: SheetSimple; big?: boolean }) {
  const [open, setOpen] = useState(false);
  const pal = palette();
  const c = (t: string) => colorize(t, pal);
  return (
    <div className="space-y-3">
      <FitWidth className={cn("py-1 text-center [&_.katex-display]:!my-1", big ? "text-2xl" : "text-xl")}>
        <MathText>{`$$${c(s.formula)}$$`}</MathText>
      </FitWidth>
      <p className="text-base leading-relaxed text-ink">
        <MathText>{c(s.say)}</MathText>
      </p>
      {s.parts.length > 0 && (
        <ul className="grid gap-1.5 sm:grid-cols-2" aria-label="Үсэг бүрийн утга">
          {s.parts.map((p, i) => (
            <li key={i} className="flex min-w-0 items-baseline gap-2 rounded-xl bg-bg px-3 py-2 text-sm">
              <span className="shrink-0 text-base font-semibold">
                <MathText>{`$${c(p.tex)}$`}</MathText>
              </span>
              <span className="min-w-0 text-ink-dim">
                <MathText>{c(p.mean)}</MathText>
              </span>
            </li>
          ))}
        </ul>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-brand-bright/10 px-3 text-sm font-semibold text-brand-soft transition-colors duration-[var(--dur-micro)] hover:bg-brand-bright/15"
      >
        <Lightbulb className="h-4 w-4" aria-hidden />
        {open ? "Алхмуудыг хураах" : "Алхамаар ойлгох"}
        <ChevronDown className={cn("h-4 w-4 transition-transform duration-[var(--dur-base)]", open && "rotate-180")} aria-hidden />
      </button>

      {open && (
        <div className="space-y-4">
          <ol className="space-y-2" aria-label="Хэрхэн хэрэглэх вэ">
            {s.steps.map((t, i) => (
              <li key={i} className="flex gap-3">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-bright text-xs font-bold text-on-brand" aria-hidden>
                  {i + 1}
                </span>
                <span className="min-w-0 text-base leading-relaxed text-ink">
                  <MathText>{c(t)}</MathText>
                </span>
              </li>
            ))}
          </ol>

          <section className="rounded-2xl border border-line bg-bg p-3" aria-label="Жишээ">
            <h4 className="mb-1 text-xs font-semibold text-ink-dim">Жишээ</h4>
            <p className="text-base text-ink">
              <MathText>{c(s.example.problem)}</MathText>
            </p>
            <ol className="mt-2 space-y-1 border-l-2 border-line pl-3">
              {s.example.steps.map((t, i) => (
                <li key={i} className="overflow-x-auto overflow-y-hidden text-base text-ink [scrollbar-width:none]">
                  <MathText>{c(t)}</MathText>
                </li>
              ))}
            </ol>
            <p className="mt-2 inline-flex flex-wrap items-baseline gap-2 rounded-xl bg-success/10 px-3 py-1.5 text-base font-semibold text-ink">
              <span className="text-sm font-medium text-success">Хариу</span>
              <MathText>{c(s.example.answer)}</MathText>
            </p>
          </section>

          {s.watch && (
            <p className="flex gap-2 rounded-xl border border-line bg-bg px-3 py-2 text-sm text-ink">
              <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-error" aria-hidden />
              <span>
                <MathText>{c(s.watch)}</MathText>
              </span>
            </p>
          )}
        </div>
      )}
    </div>
  );
}
