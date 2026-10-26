"use client";

import { useState } from "react";
import { ChevronDown, CircleAlert } from "lucide-react";
import MathText from "@/components/MathText";
import { Badge } from "@/components/ui/kit/badge";
import { cn } from "@/lib/cn";
import MiniGraph from "./MiniGraph";
import NumberLine from "./NumberLine";
import StepsView from "./StepsView";
import { displayOf, tidyTex, tidyText } from "./display";
import type { Solution } from "./steps";

/* ============================================================================
 * Хариу (Photomath маяг): эхэнд ТОМ цэвэр хариу, ойролцоо утга саарал жижиг,
 * доор нь жижиг график, «Дэлгэрэнгүй бодолт» дарвал алхмууд.
 * data-solve-print — хэвлэхэд зөвхөн энэ хэсэг гарна.
 * ========================================================================== */

export default function ResultView({
  sol,
  stale,
  graphExprs,
  onOpenGraph,
}: {
  sol: Solution;
  stale?: boolean;
  /** Жижиг график зурах илэрхийллүүд (байхгүй бол зурахгүй) */
  graphExprs?: string[];
  onOpenGraph?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const d = displayOf(sol);
  const many = d.main.length > 3;
  const hasSteps = sol.steps.length > 0 || d.alt.length > 0;

  return (
    <article data-solve-print aria-live="polite" className={cn("overflow-hidden rounded-2xl border bg-surface transition-opacity duration-[var(--dur-base)]", sol.ok ? "border-brand-bright/30" : "border-line", stale && "opacity-55")}>
      <div className="space-y-3 p-4">
        <div className="flex flex-wrap items-center gap-2">
          {sol.ok ? (
            <Badge tone="brand">{sol.title}</Badge>
          ) : (
            <Badge tone="warning">
              <CircleAlert aria-hidden />
              {sol.title}
            </Badge>
          )}
        </div>

        {sol.problem && (
          <div className="overflow-x-auto overflow-y-hidden py-0.5 text-sm text-ink-dim [scrollbar-width:thin]">
            <MathText>{`$${tidyTex(sol.problem)}$`}</MathText>
          </div>
        )}

        {d.main.length > 0 &&
          (d.inline ? (
            <div className="flex flex-wrap items-baseline gap-x-7 gap-y-2 text-2xl text-ink">
              {d.main.map((a, i) => (
                <span key={i} className="inline-block max-w-full overflow-x-auto overflow-y-hidden py-1 [scrollbar-width:thin]">
                  <MathText>{`$\\displaystyle ${a}$`}</MathText>
                </span>
              ))}
            </div>
          ) : (
            <div className={cn("space-y-2 text-ink", many ? "text-lg" : "text-2xl")}>
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

        {sol.notes?.map((n, i) => (
          <MathText key={i} className="block text-sm text-ink-dim">
            {tidyText(n)}
          </MathText>
        ))}

        {sol.numberLine && (
          <div className="rounded-xl border border-line p-2">
            <NumberLine data={sol.numberLine} label="Тэнцэтгэл бишийн шийд тооны шулуун дээр" />
          </div>
        )}

        {sol.ok && graphExprs && graphExprs.length > 0 && (
          <div className="max-w-xl" data-print-hide>
            <MiniGraph exprs={graphExprs} onOpen={onOpenGraph} />
          </div>
        )}
      </div>

      {hasSteps && (
        <>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            data-print-hide
            className="flex min-h-12 w-full items-center justify-between gap-2 border-t border-line px-4 text-sm font-semibold text-brand transition-colors duration-[var(--dur-micro)] hover:bg-brand-bright/5"
          >
            {open ? "Бодолтыг хураах" : "Дэлгэрэнгүй бодолт"}
            <ChevronDown className={cn("h-4 w-4 transition-transform duration-[var(--dur-micro)]", open && "rotate-180")} aria-hidden />
          </button>
          <div className={cn("border-t border-line p-4", !open && "hidden print:block")}>
            <StepsView steps={sol.steps} extra={d.alt} />
          </div>
        </>
      )}
    </article>
  );
}
