"use client";

import { ArrowRight, Check, NotebookPen } from "lucide-react";
import { useEffect, useRef, useState, type MouseEvent } from "react";
import { cn } from "@/lib/cn";
import { fullTestTitle, type DayEntry, type TestInfo } from "./types";

interface Item {
  key: string;
  short: string;
  full: string;
  excluded: number[];
}

/** Хассан бодлогын дугаар — жижиг улаан тоо (утга нь доорх тэмдэглэгээнд) */
export function Excluded({ numbers }: { numbers: number[] }) {
  if (!numbers.length) return null;
  return (
    <span
      className="ml-0.5 align-super text-[10px] font-bold leading-none tabular-nums text-error"
      title={`Хассан бодлого: ${numbers.join(", ")}`}
    >
      <span className="sr-only">хассан бодлого </span>
      {numbers.join(",")}
    </span>
  );
}

function itemsOf(
  list: { testId: string | null; excludedNumbers: number[]; manualTitle?: string | null }[],
  tests: Record<string, TestInfo>,
): Item[] {
  return list.map((x, i) => {
    const t = x.testId ? tests[x.testId] : undefined;
    const short = t?.short ?? x.manualTitle ?? "Тест";
    return { key: `${x.testId ?? "m"}-${i}`, short, full: t ? fullTestTitle(t) : short, excluded: x.excludedNumbers };
  });
}

/**
 * Мөрийн «замын зураг»: өмнөх хичээлийн тест → өнөөдрийн (хийсэн эсвэл
 * төлөвлөсөн) тест + бодлогын санд байхгүй, багшийн бичсэн сэдвүүд.
 */
export function roadOf(entry: DayEntry, tests: Record<string, TestInfo>) {
  const previous = itemsOf(entry.previous?.tests ?? [], tests);
  const doneToday = entry.done.length > 0;
  const today = doneToday
    ? itemsOf(entry.done, tests)
    : itemsOf((entry.plan?.testIds ?? []).map((testId) => ({ testId, excludedNumbers: [] })), tests);
  const topics = entry.plan?.customTopics ?? [];
  return { previous, today, doneToday, topics };
}

/**
 * Өмнөх → өнөөдөр. Хулганаар заахад (title) эсвэл удаан дарахад бүтэн нэр
 * (ном, хувилбар) гарна. Энгийн товшилт мөрийн цонхыг нээнэ.
 */
export default function RoadMap({
  entry,
  tests,
  emptyLabel,
  className,
}: {
  entry: DayEntry;
  tests: Record<string, TestInfo>;
  emptyLabel: string;
  className?: string;
}) {
  const { previous, today, doneToday, topics } = roadOf(entry, tests);
  const [open, setOpen] = useState(false);
  const timer = useRef<number | null>(null);
  const pressed = useRef(false);
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (ev: PointerEvent) => {
      if (!wrap.current?.contains(ev.target as Node)) setOpen(false);
    };
    const t = window.setTimeout(() => setOpen(false), 6000);
    document.addEventListener("pointerdown", close);
    return () => {
      window.clearTimeout(t);
      document.removeEventListener("pointerdown", close);
    };
  }, [open]);

  const all = [
    ...previous.map((x) => `Өмнөх: ${x.full}${x.excluded.length ? ` (хассан ${x.excluded.join(", ")})` : ""}`),
    ...today.map((x) => `${doneToday ? "Хийсэн" : "Өнөөдөр"}: ${x.full}${x.excluded.length ? ` (хассан ${x.excluded.join(", ")})` : ""}`),
    ...topics.map((t) => `Сэдэв: ${t}`),
  ];
  const cancel = () => {
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = null;
  };

  return (
    <div
      ref={wrap}
      className={cn("relative flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5 text-sm", className)}
      title={all.join("\n") || undefined}
      onPointerDown={(e) => {
        pressed.current = false;
        if (e.pointerType !== "touch" || !all.length) return;
        cancel();
        timer.current = window.setTimeout(() => {
          pressed.current = true;
          setOpen(true);
        }, 450);
      }}
      onPointerUp={cancel}
      onPointerLeave={cancel}
      onPointerCancel={cancel}
      onContextMenu={(e) => all.length && e.preventDefault()}
      onClickCapture={(e: MouseEvent) => {
        // Удаан дарсны дараах товшилт цонх нээхгүй
        if (pressed.current) {
          e.stopPropagation();
          e.preventDefault();
          pressed.current = false;
        }
      }}
    >
      {previous.length > 0 && (
        <>
          <span className="flex min-w-0 flex-wrap items-center gap-x-1.5 text-ink-dim">
            <span className="sr-only">Өмнөх хичээл:</span>
            {previous.map((x) => (
              <span key={x.key} className="whitespace-nowrap">
                {x.short}
                <Excluded numbers={x.excluded} />
              </span>
            ))}
          </span>
          <ArrowRight className="size-3.5 shrink-0 text-ink-dim" aria-label="дараа нь" />
        </>
      )}
      {today.length > 0 || topics.length > 0 ? (
        <span className="flex min-w-0 flex-wrap items-center gap-x-1.5 font-semibold text-ink">
          <span className="sr-only">{doneToday ? "Хийсэн:" : "Өнөөдөр:"}</span>
          {today.map((x) => (
            <span key={x.key} className="inline-flex items-center gap-0.5 whitespace-nowrap">
              {doneToday && <Check className="size-3.5 text-success" aria-hidden />}
              {x.short}
              <Excluded numbers={x.excluded} />
            </span>
          ))}
          {topics.map((t) => (
            <span key={`topic-${t}`} className="inline-flex min-w-0 items-center gap-1" title="Бодлогын санд байхгүй сэдэв">
              <NotebookPen className="size-3.5 shrink-0 text-ink-dim" aria-hidden />
              <span className="min-w-0">{t}</span>
            </span>
          ))}
        </span>
      ) : entry.topic ? (
        <span className="font-semibold text-ink">{entry.topic}</span>
      ) : (
        <span className="text-ink-dim">{emptyLabel}</span>
      )}
      {open && (
        <span
          role="tooltip"
          className="elev-2 absolute left-0 top-full z-20 mt-1 w-max max-w-[min(20rem,85vw)] space-y-0.5 rounded-lg border border-line bg-surface px-3 py-2 text-xs font-normal text-ink"
        >
          {all.map((line) => (
            <span key={line} className="block">
              {line}
            </span>
          ))}
        </span>
      )}
    </div>
  );
}
