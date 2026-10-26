"use client";

import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, Copy, Maximize2, Minus, Plus, X } from "lucide-react";
import MathText from "@/components/MathText";
import { Toggle } from "../core/ToolFrame";
import { copyLatex } from "./FormulaCard";
import { conditionMath, displayMath, type SheetFormula } from "./formulaSheet.ts";

/* ============================================================================
 * Проектор: нэг томьёог дэлгэц дүүрэн, том үсгээр. Сум/товчоор дараагийнх руу.
 * role="dialog", Escape хаана, фокус дотроо эргэлдэнэ.
 * ========================================================================== */

const SIZES = [2, 2.75, 3.5, 4.5, 5.75, 7];

const btn =
  "inline-flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-xl border border-line bg-surface px-3 text-sm font-medium text-ink-dim hover:text-ink disabled:opacity-40";

export default function ProjectorView({
  list,
  start,
  onClose,
}: {
  list: SheetFormula[];
  start: number;
  onClose: () => void;
}) {
  const [i, setI] = useState(Math.min(Math.max(0, start), list.length - 1));
  const [size, setSize] = useState(3);
  const [cond, setCond] = useState(true);
  const [example, setExample] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const f = list[i];

  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = overflow;
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
      prev?.focus?.();
    };
  }, []);

  const go = useCallback((d: number) => setI((v) => Math.min(list.length - 1, Math.max(0, v + d))), [list.length]);

  const onKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    } else if (e.key === "ArrowRight" || e.key === "PageDown") {
      e.preventDefault();
      go(1);
    } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
      e.preventDefault();
      go(-1);
    } else if (e.key === "+" || e.key === "=") setSize((s) => Math.min(SIZES.length - 1, s + 1));
    else if (e.key === "-") setSize((s) => Math.max(0, s - 1));
    else if (e.key === "Tab" && root.current) {
      const els = Array.from(root.current.querySelectorAll<HTMLElement>("button, a[href], input, [tabindex='0']")).filter((el) => !el.hasAttribute("disabled"));
      if (!els.length) return;
      const first = els[0];
      const last = els[els.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  };

  const full = () => {
    const el = root.current;
    if (!el) return;
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else el.requestFullscreen?.().catch(() => {});
  };

  if (!f) return null;
  const ex = f.examples[0];

  return createPortal(
    <div
      ref={root}
      role="dialog"
      aria-modal="true"
      aria-labelledby="formula-projector-title"
      onKeyDown={onKey}
      className="fixed inset-0 z-[70] flex flex-col bg-surface text-ink"
    >
      <div className="flex flex-wrap items-center gap-2 border-b border-line px-3 py-2">
        <h2 id="formula-projector-title" className="min-w-0 flex-1 truncate text-base font-semibold sm:text-lg">
          {f.title}
        </h2>
        <span className="text-sm tabular-nums text-ink-dim" aria-live="polite">
          {i + 1} / {list.length}
        </span>
        <div className="flex flex-wrap items-center gap-1.5">
          {f.conditions.length > 0 && (
            <Toggle on={cond} onChange={setCond}>
              Нөхцөл
            </Toggle>
          )}
          {ex && (
            <Toggle on={example} onChange={setExample}>
              Жишээ
            </Toggle>
          )}
          <button type="button" className={btn} onClick={() => setSize((s) => Math.max(0, s - 1))} disabled={size === 0} aria-label="Жижигрүүлэх">
            <Minus className="h-4 w-4" aria-hidden />
          </button>
          <button type="button" className={btn} onClick={() => setSize((s) => Math.min(SIZES.length - 1, s + 1))} disabled={size === SIZES.length - 1} aria-label="Томруулах">
            <Plus className="h-4 w-4" aria-hidden />
          </button>
          <button type="button" className={btn} onClick={() => copyLatex(f.latex)} aria-label="LaTeX хуулах">
            <Copy className="h-4 w-4" aria-hidden />
          </button>
          <button type="button" className={`${btn} hidden sm:inline-flex`} onClick={full} aria-label="Дүүрэн дэлгэц">
            <Maximize2 className="h-4 w-4" aria-hidden />
          </button>
          <button ref={closeRef} type="button" className={btn} onClick={onClose} aria-label="Хаах">
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-6 overflow-auto px-4 py-6">
        <div
          className="max-w-full overflow-x-auto text-center [&_.katex-display]:!my-0"
          style={{ fontSize: `clamp(1.25rem, ${SIZES[size] * 1.6}vw, ${SIZES[size]}rem)` }}
        >
          <MathText>{displayMath(f.latex)}</MathText>
        </div>
        {cond && f.conditions.length > 0 && (
          <p className="max-w-4xl text-center text-lg text-ink-dim sm:text-2xl">
            {f.conditions.map((c, k) => (
              <span key={k}>
                {k > 0 && ", "}
                <MathText>{conditionMath(c)}</MathText>
              </span>
            ))}
          </p>
        )}
        {example && ex && (
          <div className="max-w-4xl rounded-2xl border border-line bg-bg p-4 text-lg sm:text-2xl">
            <MathText className="block">{ex.problem}</MathText>
            {ex.answer && (
              <p className="mt-2 font-semibold">
                Хариу: <MathText>{ex.answer}</MathText>
              </p>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-line px-3 py-2">
        <button type="button" className={btn} onClick={() => go(-1)} disabled={i === 0}>
          <ChevronLeft className="h-5 w-5" aria-hidden />
          Өмнөх
        </button>
        <button type="button" className={btn} onClick={() => go(1)} disabled={i === list.length - 1}>
          Дараах
          <ChevronRight className="h-5 w-5" aria-hidden />
        </button>
      </div>
    </div>,
    document.body,
  );
}
