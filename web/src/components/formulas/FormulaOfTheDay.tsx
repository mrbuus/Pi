"use client";
import { useState } from "react";
import { Sparkles } from "lucide-react";
import {
  EmptyState,
  ErrorState,
  LoadingState,
} from "@/components/ui/StateBlock";
import { FormulaCard } from "./FormulaCard";
import { dailyFormula } from "./dailyFormula";
import { useFormulaRequest } from "./useFormulaRequest";
import type { FormulaSummary } from "./types";
export function FormulaOfTheDay() {
  const result = useFormulaRequest<FormulaSummary[]>("/formulas?level=CORE");
  const [today] = useState(() => new Date());
  const formula = dailyFormula(result.data ?? [], today);
  return (
    <section className="min-w-0 space-y-3 [&_button]:min-h-11">
      <h2 className="flex items-center gap-2 text-lg font-bold">
        <Sparkles className="size-5 text-accent-gold" aria-hidden />
        Өдрийн томьёо
      </h2>
      {result.loading ? (
        <LoadingState rows={2} />
      ) : result.error ? (
        <ErrorState message={result.error} onRetry={result.retry} />
      ) : formula ? (
        <FormulaCard formula={formula} />
      ) : (
        <EmptyState title="Өдрийн томьёо хараахан нэмэгдээгүй байна" />
      )}
    </section>
  );
}
export default FormulaOfTheDay;
