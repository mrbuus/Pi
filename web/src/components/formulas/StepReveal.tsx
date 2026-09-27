"use client";
import { useId, useState } from "react";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/kit/button";
import { FormulaMath } from "./FormulaMath";
export function StepReveal({
  steps,
  answer,
}: {
  steps: string[];
  answer?: string;
}) {
  const [shown, setShown] = useState(0);
  const id = useId();
  const done = shown >= Math.max(steps.length, 1);
  return (
    <div className="space-y-3">
      <div id={id} aria-live="polite" aria-atomic="false">
        <ol className="space-y-3">
          {steps.slice(0, shown).map((step, i) => (
            <li key={i} className="flex min-w-0 gap-3">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-bright/15 text-sm font-bold text-brand-soft">
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <FormulaMath text={step} />
                {i === shown - 1 && !done && (
                  <button
                    type="button"
                    className="min-h-11 text-sm font-semibold text-brand-soft underline underline-offset-4"
                    onClick={() => setShown((n) => n + 1)}
                  >
                    Дараагийн алхмыг нээх
                  </button>
                )}
              </div>
            </li>
          ))}
        </ol>
        {done && answer && (
          <div className="mt-4 rounded-xl border border-success/30 bg-success/10 p-4">
            <h3 className="font-bold">Хариу</h3>
            <FormulaMath text={answer} />
          </div>
        )}
      </div>
      {!done && (
        <div className="flex flex-wrap gap-2 print:hidden">
          <Button
            variant="outline"
            onClick={() => setShown((n) => n + 1)}
            aria-controls={id}
          >
            <ChevronDown aria-hidden />
            {shown === 0 ? "Алхам харах" : "Дараагийн алхам"}
          </Button>
          <Button
            variant="ghost"
            onClick={() => setShown(Math.max(steps.length, 1))}
            aria-controls={id}
          >
            Бүгдийг харах
          </Button>
        </div>
      )}
      <div className="hidden print:block">
        <ol>
          {steps.slice(shown).map((step, i) => (
            <li key={i}>
              <FormulaMath text={step} />
            </li>
          ))}
        </ol>
        {!done && answer && <FormulaMath text={`Хариу: ${answer}`} />}
      </div>
    </div>
  );
}
