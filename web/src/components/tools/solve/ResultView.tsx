"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, ChevronUp, CircleAlert, ListOrdered } from "lucide-react";
import MathText from "@/components/MathText";
import { cn } from "@/lib/cn";
import MiniGraph from "./MiniGraph";
import NumberLine from "./NumberLine";
import StepsView from "./StepsView";
import { displayOf, tidyTex, tidyText } from "./display";
import type { Solution } from "./steps";

/* ============================================================================
 * Хариу (Photomath маяг): эхэнд ТОМ цэвэр хариу, ойролцоо утга саарал жижиг,
 * функц/тэгшитгэлд жижиг график. «Алхамаар харах» дарвал алхам НЭГ НЭГЭЭР
 * (богино гарчиг + томьёо, урт тайлбар «Яагаад?» дотор хураагдмал).
 * data-solve-print — хэвлэхэд зөвхөн энэ хэсэг гарна (бүх алхамтай).
 * ========================================================================== */

export default function ResultView({
  sol,
  stale,
  graphExprs,
  onOpenGraph,
  stepsOpen,
  onSteps,
  compact,
  headline,
}: {
  sol: Solution;
  stale?: boolean;
  /** Жижиг график зурах илэрхийллүүд (байхгүй бол зурахгүй) */
  graphExprs?: string[];
  onOpenGraph?: () => void;
  stepsOpen: boolean;
  onSteps: (open: boolean) => void;
  /** Утсан дээр гар нээлттэй үеийн урьдчилсан жижиг карт (дарвал бүрэн бодолт) */
  compact?: boolean;
  /** Жижиг картын гол мөр (функцэд y = …); байхгүй бол хариу */
  headline?: string;
}) {
  const d = displayOf(sol);
  const many = d.main.length > 3;
  const total = sol.steps.length + d.alt.length;
  const [shown, setShown] = useState(1);
  const showGraph = !!graphExprs?.length && (sol.ok || !!sol.graph?.length);

  if (compact) {
    const lines = headline ? [headline] : d.main.slice(0, 2);
    return (
      <button
        type="button"
        onClick={() => onSteps(true)}
        aria-label="Бүрэн бодолтыг харах"
        className={cn(
          "block w-full overflow-hidden rounded-2xl border border-line bg-surface p-4 text-left transition-opacity duration-[var(--dur-base)] active:bg-ink/[0.03]",
          stale && "opacity-50",
        )}
      >
        <span className={cn("flex items-center gap-1.5 text-xs font-semibold", sol.ok ? "text-ink-dim" : "text-warning")}>
          {!sol.ok && <CircleAlert className="h-4 w-4" aria-hidden />}
          {sol.title}
        </span>
        {lines.length > 0 ? (
          <span className="mt-1.5 block space-y-1 text-2xl text-ink">
            {lines.map((a, i) => (
              <span key={i} className="block overflow-hidden whitespace-nowrap py-0.5 [mask-image:linear-gradient(to_right,black_88%,transparent)]">
                <MathText>{`$\\displaystyle ${a}$`}</MathText>
              </span>
            ))}
          </span>
        ) : (
          sol.notes?.[0] && <MathText className="mt-1.5 block text-sm text-ink-dim">{tidyText(sol.notes[0])}</MathText>
        )}
        <span className="mt-2 flex items-center gap-1 text-sm font-semibold text-brand">
          {total > 0 ? "Алхамаар харах" : "Дэлгэрэнгүй"}
          <ChevronRight className="h-4 w-4" aria-hidden />
        </span>
      </button>
    );
  }

  return (
    <article
      data-solve-print
      aria-live="polite"
      className={cn("overflow-hidden rounded-2xl border border-line bg-surface transition-opacity duration-[var(--dur-base)]", stale && "opacity-50")}
    >
      <div className="space-y-3 p-4">
        <p className={cn("flex items-center gap-1.5 text-xs font-semibold", sol.ok ? "text-ink-dim" : "text-warning")}>
          {!sol.ok && <CircleAlert className="h-4 w-4" aria-hidden />}
          {sol.title}
        </p>

        {sol.problem && (
          <div className="overflow-x-auto overflow-y-hidden py-0.5 text-sm text-ink-dim [scrollbar-width:thin]">
            <MathText>{`$${tidyTex(sol.problem)}$`}</MathText>
          </div>
        )}

        {d.main.length > 0 &&
          (d.inline ? (
            <div className="flex flex-wrap items-baseline gap-x-7 gap-y-2 text-[26px] text-ink">
              {d.main.map((a, i) => (
                <span key={i} className="inline-block max-w-full overflow-x-auto overflow-y-hidden py-1 [scrollbar-width:thin]">
                  <MathText>{`$\\displaystyle ${a}$`}</MathText>
                </span>
              ))}
            </div>
          ) : (
            <div className={cn("space-y-2 text-ink", many ? "text-lg" : "text-[26px]")}>
              {d.main.map((a, i) => (
                <div key={i} className="overflow-x-auto overflow-y-hidden py-1 [scrollbar-width:thin]">
                  <MathText>{`$\\displaystyle ${a}$`}</MathText>
                </div>
              ))}
            </div>
          ))}

        {d.approx.length > 0 && (
          <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-ink-dim">
            {d.approx.map((a, i) => (
              <span key={i} className="inline-block max-w-full overflow-x-auto overflow-y-hidden py-0.5">
                <MathText>{`$${a}$`}</MathText>
              </span>
            ))}
          </div>
        )}

        {sol.notes?.map((note, i) => (
          <MathText key={i} className="block text-sm text-ink-dim">
            {tidyText(note)}
          </MathText>
        ))}

        {sol.numberLine && (
          <div className="rounded-xl border border-line p-2">
            <NumberLine data={sol.numberLine} label="Тэнцэтгэл бишийн шийд тооны шулуун дээр" />
          </div>
        )}

        {showGraph && (
          <div className="max-w-xl" data-print-hide>
            <MiniGraph exprs={graphExprs!} onOpen={onOpenGraph} />
          </div>
        )}
      </div>

      {total > 0 && !stepsOpen && (
        <button
          type="button"
          onClick={() => {
            setShown(1);
            onSteps(true);
          }}
          data-print-hide
          className="flex min-h-12 w-full items-center justify-center gap-2 border-t border-line bg-brand-bright/5 px-4 text-sm font-semibold text-brand transition-colors duration-[var(--dur-micro)] hover:bg-brand-bright/10"
        >
          <ListOrdered className="h-4 w-4" aria-hidden />
          Алхамаар харах
        </button>
      )}

      {total > 0 && (
        <div className={cn("border-t border-line p-4", !stepsOpen && "hidden print:block")}>
          <StepsView steps={sol.steps} extra={d.alt} shown={stepsOpen ? shown : total} />
          {stepsOpen && (
            <div className="mt-4 flex flex-wrap items-center gap-2" data-print-hide>
              {shown < total && (
                <>
                  <button
                    type="button"
                    onClick={() => setShown((s) => s + 1)}
                    className="inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-brand-bright px-4 text-sm font-semibold text-on-brand transition-opacity duration-[var(--dur-micro)] hover:opacity-95"
                  >
                    <ChevronDown className="h-4 w-4" aria-hidden />
                    Дараагийн алхам
                  </button>
                  <button type="button" onClick={() => setShown(total)} className="min-h-11 rounded-xl px-3 text-sm font-semibold text-brand hover:bg-brand-bright/5">
                    Бүгдийг харах
                  </button>
                </>
              )}
              <button type="button" onClick={() => onSteps(false)} className="ml-auto inline-flex min-h-11 items-center gap-1 rounded-xl px-3 text-sm font-medium text-ink-dim hover:bg-ink/5 hover:text-ink">
                <ChevronUp className="h-4 w-4" aria-hidden />
                Хураах
              </button>
            </div>
          )}
        </div>
      )}
    </article>
  );
}
