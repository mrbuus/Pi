"use client";

import { useMemo } from "react";
import { Presentation } from "lucide-react";
import MathText from "@/components/MathText";
import { FORMULA_WIDGETS, WIDGET_TITLES } from "@/components/formulas/widgets";
import { cn } from "@/lib/cn";
import { inlineMath, type SheetFormula } from "./formulaSheet.ts";

/* ============================================================================
 * «Хөдөлгөөнтөөр харах»: /app/formulas/widgets-ийн бэлэн үзүүлэнгүүд.
 * Үзүүлэн бүр зөвхөн өөрийн төлөвтэй, сүлжээнд хандахгүй (шалгасан) тул
 * нэвтрэлтгүй хүнд ч аюулгүй. Доор нь тухайн үзүүлэнтэй холбогдох томьёонууд.
 * ========================================================================== */

export const WIDGET_KEYS = Object.keys(FORMULA_WIDGETS).filter((k) => WIDGET_TITLES[k]);

export default function WidgetPanel({
  selected,
  onSelect,
  formulas,
  onProject,
}: {
  selected: string;
  onSelect: (k: string) => void;
  formulas: SheetFormula[];
  onProject: (list: SheetFormula[], index: number) => void;
}) {
  const key = FORMULA_WIDGETS[selected] ? selected : WIDGET_KEYS[0];
  const Widget = FORMULA_WIDGETS[key];
  const related = useMemo(() => formulas.filter((f) => f.widget === key), [formulas, key]);

  return (
    <div className="grid gap-4 lg:grid-cols-[300px_minmax(0,1fr)]">
      <nav aria-label="Хөдөлгөөнт томьёо" className="rounded-2xl border border-line bg-surface p-3 lg:sticky lg:top-20 lg:self-start">
        <h3 className="mb-2 px-1 text-sm font-semibold text-ink">Үзүүлэн сонгох</h3>
        <ul className="flex flex-wrap gap-1.5 lg:flex-col lg:flex-nowrap">
          {WIDGET_KEYS.map((k) => {
            const on = k === key;
            return (
              <li key={k}>
                <button
                  type="button"
                  aria-pressed={on}
                  onClick={() => onSelect(k)}
                  className={cn(
                    "min-h-11 w-full rounded-xl border px-3 text-left text-sm font-medium transition-colors duration-[var(--dur-micro)]",
                    on ? "border-brand-bright bg-brand-bright text-on-brand" : "border-line bg-surface text-ink-dim hover:text-ink",
                  )}
                >
                  {WIDGET_TITLES[k]}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="min-w-0 space-y-4">
        <section className="min-w-0 rounded-2xl border border-line bg-surface p-4" aria-label={WIDGET_TITLES[key]}>
          <h3 className="mb-3 text-lg font-semibold text-ink cyrillic-heading">{WIDGET_TITLES[key]}</h3>
          {Widget && <Widget key={key} />}
        </section>
        {related.length > 0 && (
          <section className="rounded-2xl border border-line bg-surface p-4">
            <h3 className="mb-2 text-sm font-semibold text-ink">Холбогдох томьёо</h3>
            <ul className="divide-y divide-line">
              {related.map((f, i) => (
                <li key={f.slug} className="flex min-w-0 items-center gap-2 py-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-ink">{f.title}</p>
                    <div className="overflow-x-auto text-ink-dim">
                      <MathText>{inlineMath(f.latex)}</MathText>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onProject(related, i)}
                    className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-line text-ink-dim hover:text-ink"
                    aria-label={`${f.title} томруулж харах`}
                  >
                    <Presentation className="h-4 w-4" aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}
