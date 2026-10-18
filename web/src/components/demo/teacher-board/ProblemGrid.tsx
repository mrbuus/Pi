import { Check, Minus, X, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";
import type { ProblemState, TestResult } from "../world";
import { Legend, LegendItem } from "./parts";

const STATE: Record<ProblemState, { label: string; icon: LucideIcon; cls: string }> = {
  correct: { label: "Зөв", icon: Check, cls: "border-success/50 bg-success/15 text-success" },
  wrong: { label: "Буруу", icon: X, cls: "border-error/50 bg-error/15 text-error" },
  skipped: { label: "Бодоогүй", icon: Minus, cls: "border-line bg-ink/[0.04] text-ink-dim" },
};

/** «14 бодлогоос 9 зөв, 3 буруу, 2 бодоогүй, 17 оролдлого» */
export function resultSentence(r: TestResult): string {
  return `${r.problems.length} бодлогоос ${r.correct} зөв, ${r.wrong} буруу, ${r.skipped} бодоогүй, ${r.attempts} оролдлого`;
}

/**
 * Бодлого бүрийн дүн: дугаартай жижиг дөрвөлжин (зөв / буруу / бодоогүй),
 * 1-ээс олон оролдлого бол буланд нь тоо. Тайлбар нь ДООР.
 */
export default function ProblemGrid({ result }: { result: TestResult }) {
  return (
    <div>
      <ol aria-label="Бодлого бүрийн дүн" className="grid grid-cols-[repeat(auto-fill,minmax(2.25rem,1fr))] gap-x-1.5 gap-y-2">
        {result.problems.map((p) => {
          const st = STATE[p.state];
          const Icon = st.icon;
          return (
            <li key={p.n} className="flex flex-col items-center gap-0.5" title={`${p.n}-р бодлого: ${st.label}${p.attempts > 1 ? `, ${p.attempts} оролдлого` : ""}`}>
              <span className={cn("relative flex size-8 items-center justify-center rounded-md border", st.cls)}>
                <Icon className="size-4" aria-hidden />
                {p.attempts > 1 && (
                  <span
                    aria-hidden
                    className="absolute -right-1.5 -top-1.5 min-w-4 rounded-full border border-line bg-surface px-1 text-center text-[9px] font-bold leading-[14px] tabular-nums text-ink"
                  >
                    {p.attempts}
                  </span>
                )}
              </span>
              <span className="text-[10px] leading-none tabular-nums text-ink-dim">
                <span className="sr-only">{p.n}-р бодлого: {st.label}{p.attempts > 1 ? `, ${p.attempts} оролдлого` : ""}</span>
                <span aria-hidden>{p.n}</span>
              </span>
            </li>
          );
        })}
      </ol>
      <Legend label="Бодлогын тэмдэг" className="mt-2.5 gap-x-3 text-[11px]">
        {(Object.keys(STATE) as ProblemState[]).map((k) => {
          const Icon = STATE[k].icon;
          return (
            <LegendItem
              key={k}
              icon={
                <span className={cn("inline-flex size-4 items-center justify-center rounded border", STATE[k].cls)}>
                  <Icon className="size-3" aria-hidden />
                </span>
              }
            >
              {STATE[k].label}
            </LegendItem>
          );
        })}
        <LegendItem
          icon={
            <span className="min-w-4 rounded-full border border-line bg-surface px-1 text-center text-[9px] font-bold leading-[14px] tabular-nums text-ink">
              2
            </span>
          }
        >
          Оролдлогын тоо
        </LegendItem>
      </Legend>
    </div>
  );
}
