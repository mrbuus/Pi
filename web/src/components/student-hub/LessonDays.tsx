"use client";

import { CalendarDays, Camera, ChevronLeft, ChevronRight, ClipboardCheck, LoaderCircle } from "lucide-react";
import { useState } from "react";
import { EmptyState, ErrorState } from "@/components/ui/StateBlock";
import { Meta } from "@/components/ui/Meta";
import { cn } from "@/lib/cn";
import { AttendanceMark, HomeworkMark } from "./Marks";
import { currentMonth, dayKey, dayTitle, loadMonth, monthTitle, todayKey, useMonthDays, weekdayShort } from "./lib";
import type { HubDay } from "./types";

/** «Хичээлүүд» таб: сараар, хичээлийн өдөр бүр нэг мөр — дарахад дэлгэрэнгүй цонх */
export default function LessonDays({ onOpen }: { onOpen: (day: HubDay) => void }) {
  const [month, setMonth] = useState(currentMonth);
  const state = useMonthDays(month);
  const data = state?.data?.month === month ? state.data : undefined;
  const loading = !state || (state.status === "loading" && !data);
  const today = todayKey();
  const multiClass = new Set(data?.days.map((d) => d.classroomId)).size > 1;

  const nav = (dir: -1 | 1) => {
    const target = dir === -1 ? data?.prevMonth : data?.nextMonth;
    return (
      <button
        type="button"
        onClick={() => target && setMonth(target)}
        disabled={!target}
        aria-label={dir === -1 ? "Өмнөх сар" : "Дараагийн сар"}
        className="inline-flex size-11 shrink-0 items-center justify-center rounded-lg text-ink hover:bg-ink/5 disabled:opacity-30"
      >
        {dir === -1 ? <ChevronLeft className="size-5" aria-hidden /> : <ChevronRight className="size-5" aria-hidden />}
      </button>
    );
  };

  return (
    <section aria-labelledby="lesson-month" className="space-y-3">
      <div className="flex items-center gap-1 rounded-xl border border-line bg-surface px-1 elev-1">
        {nav(-1)}
        <h2 id="lesson-month" className="cyrillic-heading flex min-w-0 flex-1 items-center justify-center gap-1.5 text-sm font-bold text-ink">
          {monthTitle(month)}
          {state?.status === "loading" && (
            <LoaderCircle className="size-3.5 animate-spin text-brand motion-reduce:animate-none" aria-label="Ачаалж байна" />
          )}
        </h2>
        {nav(1)}
      </div>

      {loading ? (
        <div aria-busy="true" aria-label="Ачаалж байна" className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="flex items-center gap-3 px-3 py-3">
              <div className="skeleton h-10 w-10 rounded-lg" />
              <div className="flex-1 space-y-1.5">
                <div className="skeleton h-3.5 w-3/5 rounded" />
                <div className="skeleton h-3 w-2/5 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : state?.status === "error" && !data ? (
        <ErrorState message={state.error ?? "Мэдээлэл ачаалагдсангүй"} onRetry={() => loadMonth(month, true)} />
      ) : !data?.days.length ? (
        <EmptyState
          icon={CalendarDays}
          title="Энэ сард хичээл алга"
          hint={data?.prevMonth ? "Өмнөх сарын хичээлийг сумаар харна" : undefined}
        />
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface elev-1">
          {data.days.map((d) => (
            <li key={`${d.date}-${d.classroomId}`}>
              <DayRow day={d} today={today} showClass={multiClass} onOpen={onOpen} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function DayRow({
  day,
  today,
  showClass,
  onOpen,
}: {
  day: HubDay;
  today: string;
  showClass?: boolean;
  onOpen: (day: HubDay) => void;
}) {
  const key = dayKey(day.date);
  const isToday = key === today;
  return (
    <button
      type="button"
      onClick={() => onOpen(day)}
      aria-current={isToday ? "date" : undefined}
      className="row-interactive flex min-h-16 w-full items-center gap-3 px-3 py-2.5 text-left"
    >
      <span
        className={cn(
          "flex w-11 shrink-0 flex-col items-center rounded-lg py-1",
          isToday ? "bg-brand-bright/15 text-brand-soft" : "text-ink",
        )}
      >
        <span aria-hidden className="font-display text-lg font-bold leading-none tabular-nums">{Number(key.slice(8, 10))}</span>
        <span aria-hidden className={cn("mt-0.5 text-[11px] font-semibold", isToday ? "text-brand-soft" : "text-ink-dim")}>
          {weekdayShort(key)}
        </span>
        <span className="sr-only">{dayTitle(key)}</span>
      </span>
      <span className="min-w-0 flex-1">
        <span className={cn("cyrillic-tight block truncate font-semibold", day.topic ? "text-ink" : "text-ink-dim")}>
          {day.topic ?? "Сэдэв оруулаагүй"}
        </span>
        <Meta
          className="mt-0.5 text-xs text-ink-dim"
          items={[
            showClass ? day.classroomName : null,
            day.tests.length ? (
              <span key="t" className="inline-flex items-center gap-1">
                <ClipboardCheck className="size-3.5" aria-hidden />
                {day.tests.length} тест
              </span>
            ) : null,
            day.theory.count ? (
              <span key="p" className="inline-flex items-center gap-1">
                <Camera className="size-3.5" aria-hidden />
                {day.theory.count} зураг
              </span>
            ) : null,
          ]}
        />
      </span>
      <span className="flex shrink-0 items-center gap-2.5 sm:gap-4">
        <AttendanceMark att={day.attendance} compact="sm" />
        <HomeworkMark status={day.homework.status} compact="sm" />
      </span>
      <ChevronRight className="size-4 shrink-0 text-ink-dim" aria-hidden />
    </button>
  );
}
