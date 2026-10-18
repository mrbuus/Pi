"use client";

import { CalendarCheck, ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useMemo, useRef, type ReactNode } from "react";
import { Button } from "@/components/ui/kit/button";
import { cn } from "@/lib/cn";
import {
  WEEKDAYS_SHORT,
  daysOfMonth,
  isLessonDay,
  longLabel,
  mondayIndex,
  monthLabel,
  toKey,
} from "../world";

export interface YearMonth {
  y: number;
  m: number;
}

interface Props {
  /** Зурвасын доор харагдах мөр (ж: сонгосон өдрийн хичээлийн цаг) */
  footer?: ReactNode;
  todayKey: string;
  lessonDays: number[];
  selectedKey: string;
  view: YearMonth;
  onView: (v: YearMonth) => void;
  onSelect: (key: string) => void;
}

/**
 * Нэг мөрний огнооны зурвас: сар + ‹ › + хэвтээ гүйдэг өдрийн чип.
 * Хичээлтэй өдөр цэгтэй, хичээлгүй өдөр бүдэг боловч сонгох боломжтой.
 */
export default function DateStrip({ footer, todayKey, lessonDays, selectedKey, view, onView, onSelect }: Props) {
  const scroller = useRef<HTMLDivElement>(null);
  const first = useRef(true);
  const days = useMemo(() => daysOfMonth(view.y, view.m), [view.y, view.m]);

  const shift = (delta: number) => {
    const d = new Date(view.y, view.m + delta, 1);
    onView({ y: d.getFullYear(), m: d.getMonth() });
  };

  // Сонгосон өдрийг (байхгүй бол өнөөдрийг) зурвасын голд гүйлгэнэ — хуудсыг биш, зөвхөн зурвасыг
  useEffect(() => {
    const sc = scroller.current;
    if (!sc) return;
    const target =
      sc.querySelector<HTMLElement>('[data-selected="true"]') ?? sc.querySelector<HTMLElement>('[data-today="true"]');
    const left = target ? target.offsetLeft - (sc.clientWidth - target.clientWidth) / 2 : 0;
    const calm = first.current || window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    first.current = false;
    sc.scrollTo({ left: Math.max(0, left), behavior: calm ? "auto" : "smooth" });
  }, [view.y, view.m, selectedKey]);

  return (
    <nav aria-label="Огноо сонгох" className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-xl border border-line bg-surface p-1.5">
      <div className="order-1 flex items-center">
        <button
          type="button"
          aria-label="Өмнөх сар"
          onClick={() => shift(-1)}
          className="inline-flex size-11 items-center justify-center rounded-lg text-ink-dim hover:bg-ink/5 hover:text-ink sm:size-9"
        >
          <ChevronLeft className="size-5" aria-hidden />
        </button>
        <span className="cyrillic-tight min-w-[7.75rem] text-center text-sm font-bold tabular-nums text-ink" aria-live="polite">
          {monthLabel(view.y, view.m)}
        </span>
        <button
          type="button"
          aria-label="Дараах сар"
          onClick={() => shift(1)}
          className="inline-flex size-11 items-center justify-center rounded-lg text-ink-dim hover:bg-ink/5 hover:text-ink sm:size-9"
        >
          <ChevronRight className="size-5" aria-hidden />
        </button>
      </div>

      <Button
        variant="outline"
        size="sm"
        onClick={() => onSelect(todayKey)}
        className="order-2 ml-auto min-h-11 rounded-lg px-3 sm:order-3 sm:ml-0 sm:min-h-9"
      >
        <CalendarCheck aria-hidden />
        Өнөөдөр
      </Button>

      <div
        ref={scroller}
        className="relative order-3 basis-full overflow-x-auto py-1 [scrollbar-width:thin] sm:order-2 sm:min-w-0 sm:flex-1 sm:basis-0"
      >
        <ul className="flex w-max gap-1">
          {days.map((d) => {
            const key = toKey(d);
            const wd = mondayIndex(d);
            const lesson = isLessonDay(d, lessonDays);
            const selected = key === selectedKey;
            const today = key === todayKey;
            return (
              <li key={key} className={cn(wd === 0 && d.getDate() !== 1 && "ml-1.5 border-l border-line pl-1.5")}>
                <button
                  type="button"
                  data-selected={selected}
                  data-today={today}
                  aria-pressed={selected}
                  aria-current={today ? "date" : undefined}
                  aria-label={`${longLabel(d)}${lesson ? ", хичээлтэй" : ", хичээлгүй"}${today ? ", өнөөдөр" : ""}`}
                  onClick={() => onSelect(key)}
                  className={cn(
                    "relative flex h-14 w-11 shrink-0 flex-col items-center justify-center gap-0.5 rounded-lg text-center transition-colors",
                    selected
                      ? "bg-brand-bright text-on-brand"
                      : lesson
                        ? "bg-brand-bright/10 text-ink hover:bg-brand-bright/20"
                        : "text-ink-dim/80 hover:bg-ink/5",
                    today && "ring-2 ring-brand-bright ring-offset-1 ring-offset-surface",
                  )}
                >
                  <span className="text-[10px] font-medium leading-none">{WEEKDAYS_SHORT[wd]}</span>
                  <span className={cn("text-base leading-none tabular-nums", lesson || selected ? "font-bold" : "font-medium")}>
                    {d.getDate()}
                  </span>
                  <span
                    aria-hidden
                    className={cn("size-1.5 rounded-full", lesson ? (selected ? "bg-on-brand" : "bg-brand-bright") : "bg-transparent")}
                  />
                </button>
              </li>
            );
          })}
        </ul>
      </div>
      {footer && <div className="order-last basis-full border-t border-line/60 px-1 pt-1.5 text-xs text-ink-dim">{footer}</div>}
    </nav>
  );
}
