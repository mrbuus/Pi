"use client";

import { Check, ChevronRight, ImageOff } from "lucide-react";
import { useState } from "react";
import MathText from "@/components/MathText";
import { cn } from "@/lib/cn";
import { draftImageUrl } from "./draftApi";
import { LETTERS, type BlockContent } from "./model";

/** Ноорогийн зураг — ноорогийн тусгай маршрутаар (бусад Багш+ ч харна) */
export function DraftImage({ imageKey, className }: { imageKey: string; className?: string }) {
  const [failed, setFailed] = useState(false);
  const url = draftImageUrl(imageKey);
  if (failed || !url)
    return (
      <div className={cn("flex items-center gap-2 rounded-xl border border-dashed border-line px-4 py-6 text-sm text-ink-dim", className)}>
        <ImageOff className="size-4" aria-hidden /> Зураг ачаалагдсангүй
      </div>
    );
  return (
    // eslint-disable-next-line @next/next/no-img-element -- токентой хувийн зураг, next/image кэшлэх ёсгүй
    <img
      src={url}
      alt="Бодлогын зураг"
      onError={() => setFailed(true)}
      className={cn("max-h-72 w-auto max-w-full rounded-xl border border-line bg-surface object-contain p-1.5", className)}
    />
  );
}

/**
 * Сурах бичгийн хэв маягаар — өгүүлбэр, зураг, сонголт (A–E), тоон хариу.
 * showKey: ажилтанд зөв хариуг тодруулна (сурагчид хэзээ ч ашиглахгүй).
 */
export default function ProblemView({
  content,
  showKey = true,
  dense = false,
  className,
}: {
  content: BlockContent;
  showKey?: boolean;
  /** Жижиг харагдац (гарын авлага, импортын жагсаалт) */
  dense?: boolean;
  className?: string;
}) {
  const choices = content.kind === "CHOICE" ? content.choices : [];
  const textless = choices.length > 0 && choices.every((c) => !c.trim());
  const wide = choices.some((c) => c.length > 28);
  return (
    <div className={cn("min-w-0 space-y-3", className)}>
      {content.statement.trim() ? (
        <div className={cn("selectable leading-relaxed text-ink", dense ? "text-[15px]" : "text-[17px]")}>
          <MathText showErrorInTeacherView>{content.statement}</MathText>
        </div>
      ) : (
        <p className="text-sm text-ink-dim">Бодлогын өгүүлбэр бичээгүй</p>
      )}
      {content.imageKey && <DraftImage imageKey={content.imageKey} />}
      {content.kind === "CHOICE" && (
        <ol
          className={cn(
            "grid gap-x-6 gap-y-1.5",
            textless ? "grid-cols-5 sm:max-w-sm" : wide ? "grid-cols-1" : dense ? "grid-cols-2 sm:grid-cols-3" : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-5",
            dense && "text-[15px]",
          )}
          aria-label="Сонголтууд"
        >
          {choices.map((text, i) => {
            const correct = showKey && content.answer === LETTERS[i];
            return (
              <li
                key={i}
                className={cn(
                  "flex min-w-0 items-baseline gap-2 rounded-lg px-2 py-1",
                  correct && "bg-success/10 ring-1 ring-success/40",
                )}
              >
                <span className={cn("shrink-0 font-bold", correct ? "text-success" : "text-brand-soft")}>{LETTERS[i]}.</span>
                <span className="min-w-0 break-words text-ink">
                  {text.trim() ? <MathText showErrorInTeacherView>{text}</MathText> : null}
                </span>
                {correct && <Check className="ml-auto size-4 shrink-0 self-center text-success" aria-label="Зөв хариу" />}
              </li>
            );
          })}
        </ol>
      )}
      {content.kind === "NUMERIC" && showKey && (
        <p className="flex items-center gap-2 text-sm">
          <span className="text-ink-dim">Хариу</span>
          {content.answer?.trim() ? (
            <span className="rounded-lg bg-success/10 px-2.5 py-0.5 font-bold text-success ring-1 ring-success/40">
              {content.answer}
            </span>
          ) : (
            <span className="text-ink-dim">бичээгүй</span>
          )}
        </p>
      )}
    </div>
  );
}

/** Бодолт — нээж хаадаг */
export function SolutionView({ solution }: { solution: string | null }) {
  if (!solution?.trim()) return null;
  return (
    <details className="group">
      <summary className="inline-flex min-h-9 cursor-pointer list-none items-center gap-1.5 rounded-lg pr-2 text-sm font-semibold text-brand-soft">
        <ChevronRight className="size-4 transition group-open:rotate-90" aria-hidden />
        Бодолт
      </summary>
      <div className="selectable mt-1 rounded-xl border border-line bg-bg px-4 py-3 text-[15px] leading-relaxed text-ink">
        <MathText showErrorInTeacherView>{solution}</MathText>
      </div>
    </details>
  );
}
