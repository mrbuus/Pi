"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Meta } from "@/components/ui/Meta";
import { EmptyState } from "@/components/ui/StateBlock";
import { CalendarOff, ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";
import { AttRate, Legend, LegendItem, MonthNav, type YM } from "../classes/common";
import { boardHref, shortDay } from "../classes/format";
import { ATT_META, TONE_TEXT, type Tone } from "../shell/status";
import {
  LATE_RANGE_LABEL,
  WEEKDAYS_SHORT,
  dayRecord,
  daysOfMonth,
  lessonOn,
  mondayIndex,
  toKey,
  todayKey,
  type AttStatus,
  type DayRecord,
  type DemoClass,
  type DemoLesson,
  type DemoStudent,
} from "../world";

const CELL_TONE: Record<Tone, string> = {
  success: "bg-success/10 text-success",
  warning: "bg-warning/15 text-warning",
  error: "bg-error/15 text-error",
  info: "bg-info/15 text-info",
};

interface Day {
  key: string;
  date: number;
  lesson: DemoLesson | null;
  rec: DayRecord | null;
}

/** Сарын ирцийн хуанли: хичээлтэй өдөр бүр төлвийн дүрстэй; доор сарын нэгтгэл ба хичээл тус бүрийн жагсаалт */
export default function AttendanceTab({ cls, student, view, onView }: { cls: DemoClass; student: DemoStudent; view: YM; onView: (v: YM) => void }) {
  const days = useMemo<Day[]>(
    () =>
      daysOfMonth(view.y, view.m).map((d) => {
        const key = toKey(d);
        const lesson = lessonOn(cls, key);
        const rec = lesson && key >= student.joinedOn && lesson.status !== "upcoming" ? dayRecord(cls, key, student) : null;
        return { key, date: d.getDate(), lesson, rec };
      }),
    [cls, student, view.y, view.m],
  );
  const lead = mondayIndex(new Date(view.y, view.m, 1));
  const today = todayKey();
  const lessons = days.filter((d) => d.lesson && d.key >= student.joinedOn);
  const held = lessons.filter((d) => d.lesson?.status !== "upcoming");

  const counts = useMemo(() => {
    const c: Record<AttStatus, number> = { present: 0, late: 0, absent: 0, excused: 0 };
    for (const d of days) if (d.rec?.att) c[d.rec.att]++;
    return c;
  }, [days]);
  const marked = counts.present + counts.late + counts.absent + counts.excused;
  const rate = marked ? Math.round(((counts.present + counts.late) / marked) * 100) : null;

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <MonthNav view={view} onView={onView} className="-ml-2" />
        <span className="text-sm text-ink-dim">
          <Meta items={[`${lessons.length} хичээл`, <span key="r">Ирц <AttRate value={rate} /></span>]} />
        </span>
      </div>

      {lessons.length === 0 ? (
        <EmptyState icon={CalendarOff} title="Энэ сард хичээл байхгүй" hint="Өөр сар сонгоно уу" />
      ) : (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] lg:items-start">
          <div aria-hidden className="grid grid-cols-7 gap-1 sm:gap-1.5">
            {WEEKDAYS_SHORT.map((w) => (
              <span key={w} className="pb-0.5 text-center text-[11px] font-semibold text-ink-dim">
                {w}
              </span>
            ))}
            {Array.from({ length: lead }, (_, i) => (
              <span key={`b${i}`} />
            ))}
            {days.map((d) => {
              const att = d.rec?.att ? ATT_META[d.rec.att] : null;
              const Icon = att?.icon;
              const isLesson = !!d.lesson && d.key >= student.joinedOn;
              return (
                <span
                  key={d.key}
                  className={cn(
                    "relative flex aspect-[1/0.92] items-center justify-center rounded-lg text-xs",
                    att ? CELL_TONE[att.tone] : isLesson ? "border border-dashed border-line" : "text-ink-dim/60",
                    d.key === today && "ring-2 ring-brand-bright ring-offset-1 ring-offset-surface",
                  )}
                >
                  <span className={cn("absolute left-1 top-0.5 text-[10px] tabular-nums leading-none", att ? "opacity-80" : "text-ink-dim")}>{d.date}</span>
                  {Icon && <Icon className="size-[18px]" />}
                  {!att && isLesson && d.lesson?.status === "upcoming" && <span className="size-1.5 rounded-full bg-line" />}
                </span>
              );
            })}
          </div>

          <ul className="divide-y divide-line rounded-xl border border-line" hidden={held.length === 0}>
            {[...held].reverse().map((d) => {
              const a = d.rec?.att ? ATT_META[d.rec.att] : null;
              const Icon = a?.icon;
              const extra = [d.rec?.lateRange ? LATE_RANGE_LABEL[d.rec.lateRange] : "", d.rec?.attNote ?? ""].filter(Boolean);
              return (
                <li key={d.key}>
                  <Link
                    href={boardHref(cls.id, d.key)}
                    aria-label={`${shortDay(d.key)}, ирц ба даалгаврын самбар руу`}
                    className="flex min-h-12 items-center gap-3 px-3 py-2 text-sm outline-none transition-colors hover:bg-ink/[0.04] focus-visible:bg-ink/[0.06]"
                  >
                    <span className={cn("flex size-7 shrink-0 items-center justify-center rounded-md", a ? CELL_TONE[a.tone] : "border border-dashed border-line text-ink-dim")}>
                      {Icon ? <Icon className="size-4" /> : null}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium text-ink">{shortDay(d.key)}</span>
                      <span className="block truncate text-xs text-ink-dim">{d.lesson?.topic}</span>
                    </span>
                    <span className="shrink-0 text-right text-xs">
                      <span className={cn("block font-semibold", a ? TONE_TEXT[a.tone] : "text-ink-dim")}>{a ? a.label : d.lesson?.status === "upcoming" ? "Хичээл болоогүй" : "Тэмдэглээгүй"}</span>
                      {extra.length > 0 && <span className="block text-ink-dim">{extra.join(", ")}</span>}
                    </span>
                    <ChevronRight className="size-4 shrink-0 text-ink-dim" aria-hidden />
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <Legend>
        {(Object.keys(ATT_META) as AttStatus[]).map((k) => {
          const m = ATT_META[k];
          const Icon = m.icon;
          return (
            <LegendItem key={k}>
              <Icon className={cn("size-3.5", TONE_TEXT[m.tone])} />
              {m.label} <span className="font-semibold tabular-nums text-ink">{counts[k]}</span>
            </LegendItem>
          );
        })}
        <LegendItem>
          <span aria-hidden className="block size-3.5 rounded border border-dashed border-line" />
          Тэмдэглээгүй
        </LegendItem>
      </Legend>
    </div>
  );
}
