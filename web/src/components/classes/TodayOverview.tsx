"use client";

import Link from "next/link";
import { BadgeCheck, CalendarCheck, CalendarOff, ChevronLeft, ChevronRight, TriangleAlert } from "lucide-react";
import type { CSSProperties } from "react";
import { useState } from "react";
import RoomBadge from "@/components/schedule/RoomBadge";
import { addDaysToKey, formatMinutes, todayUBKey, WEEKDAY_LABELS } from "@/components/schedule/types";
import { useSection } from "@/components/students/progress/useSection";
import { Meta } from "@/components/ui/Meta";
import { SkeletonRows } from "@/components/ui/Skeleton";
import { EmptyState, ErrorState } from "@/components/ui/StateBlock";
import { getClassroomColor } from "@/lib/classroomColor";
import { cn } from "@/lib/cn";

/** GET /attendance/day-summary */
interface DaySummary {
  date: string;
  classes: {
    id: string;
    name: string;
    startMinute: number;
    room: string | null;
    students: number;
    attendance: { present: number; late: number; absent: number; excused: number; unmarked: number };
    homework: { done: number; partial: number; notDone: number; unmarked: number } | null;
    confirmed: boolean;
  }[];
}

const shortClass = (name: string) => name.replace(/\s*\([^)]*\)$/, "");
const weekday = (key: string) => WEEKDAY_LABELS[new Date(`${key}T00:00:00.000Z`).getUTCDay()];

/**
 * «Ангиуд» → «Өнөөдөр» (эзэн 2026-10-31): тухайн өдөр хичээлтэй анги бүрийн ирц,
 * даалгаврын явц — цөөн, ойлгомжтой тоо. Мөр дээр дарахад тэр ангийн самбар.
 */
export default function TodayOverview() {
  const [today] = useState(todayUBKey);
  const [date, setDate] = useState(today);
  const { data, status, error, reload } = useSection<DaySummary | null>(`/attendance/day-summary?date=${date}`, null);
  const shown = data?.date === date ? data : null;
  const classes = [...(shown?.classes ?? [])].sort(
    (a, b) => a.startMinute - b.startMinute || a.name.localeCompare(b.name, "mn", { numeric: true }),
  );
  const sum = classes.reduce(
    (t, c) => ({
      students: t.students + c.students,
      came: t.came + c.attendance.present + c.attendance.late,
      hwBase: t.hwBase + (c.homework ? c.students : 0),
      done: t.done + (c.homework?.done ?? 0),
    }),
    { students: 0, came: 0, hwBase: 0, done: 0 },
  );
  const nav = "inline-flex size-11 items-center justify-center rounded-lg text-ink-dim hover:bg-ink/5 hover:text-ink";

  return (
    <section aria-label="Өнөөдрийн ангиуд" className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center rounded-xl border border-line bg-surface p-1">
          <button type="button" onClick={() => setDate((d) => addDaysToKey(d, -1))} aria-label="Өмнөх өдөр" className={nav}>
            <ChevronLeft className="size-5" aria-hidden />
          </button>
          <span className="min-w-[7.5rem] text-center text-sm font-bold tabular-nums text-ink">
            {weekday(date)}, {date.slice(5).replace("-", ".")}
          </span>
          <button type="button" onClick={() => setDate((d) => addDaysToKey(d, 1))} aria-label="Дараагийн өдөр" className={nav}>
            <ChevronRight className="size-5" aria-hidden />
          </button>
        </div>
        {date !== today && (
          <button
            type="button"
            onClick={() => setDate(today)}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-line bg-surface px-3 text-sm font-semibold text-ink hover:bg-ink/5"
          >
            <CalendarCheck className="size-4" aria-hidden />
            Өнөөдөр
          </button>
        )}
        {classes.length > 0 && (
          <Meta
            className="text-sm text-ink-dim sm:ml-auto"
            items={[
              `${classes.length} анги`,
              `ирсэн ${sum.came}/${sum.students}`,
              sum.hwBase ? `даалгавар ${sum.done}/${sum.hwBase}` : null,
            ]}
          />
        )}
      </div>

      {status === "loading" && !shown && <SkeletonRows rows={6} />}
      {status === "error" && !shown && <ErrorState message={error} onRetry={reload} />}
      {shown && classes.length === 0 && (
        <EmptyState icon={CalendarOff} title="Энэ өдөр хичээлтэй анги алга" hint="Өөр өдөр сонгоно уу" />
      )}

      {classes.length > 0 && (
        <ul className="space-y-2">
          {classes.map((c) => {
            const came = c.attendance.present + c.attendance.late;
            const away = c.attendance.absent + c.attendance.excused;
            const started = date < today || (date === today && minuteNow() >= c.startMinute);
            const unmarked = c.attendance.unmarked;
            return (
              <li key={c.id}>
                <Link
                  href={`/app/teacher?class=${encodeURIComponent(c.id)}&date=${date}`}
                  className="class-row class-row-interactive grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 rounded-xl border border-line bg-surface px-3 py-2.5 sm:grid-cols-[12rem_minmax(0,1fr)_minmax(0,1fr)_7rem]"
                  style={{ "--cls": getClassroomColor(c.id) } as CSSProperties}
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <RoomBadge room={c.room} size="md" />
                    <span className="min-w-0">
                      <span className="block truncate text-base font-bold text-ink">{shortClass(c.name)}</span>
                      <span className="block text-xs tabular-nums text-ink-dim">
                        <Meta items={[formatMinutes(c.startMinute), `${c.students} сурагч`]} />
                      </span>
                    </span>
                  </span>

                  <span className="flex justify-end sm:order-last">
                    {c.confirmed ? (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-success">
                        <BadgeCheck className="size-4" aria-hidden />
                        Батлагдсан
                      </span>
                    ) : started && unmarked > 0 ? (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-warning">
                        <TriangleAlert className="size-4" aria-hidden />
                        {unmarked} тэмдэглээгүй
                      </span>
                    ) : null}
                  </span>

                  <Progress
                    label="Ирсэн"
                    value={came}
                    total={c.students}
                    note={away > 0 ? `${away} ирээгүй` : null}
                    className="col-span-2 sm:col-span-1"
                  />
                  {c.homework ? (
                    <Progress
                      label="Даалгавар хийсэн"
                      value={c.homework.done}
                      total={c.students}
                      note={c.homework.notDone + c.homework.partial > 0 ? `${c.homework.notDone + c.homework.partial} дутуу, хийгээгүй` : null}
                      className="col-span-2 sm:col-span-1"
                    />
                  ) : (
                    <span className="col-span-2 text-xs text-ink-dim sm:col-span-1">Онлайн анги</span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

function minuteNow(): number {
  const ub = new Date(Date.now() + 8 * 3600_000);
  return ub.getUTCHours() * 60 + ub.getUTCMinutes();
}

/** Нэг үзүүлэлт: «Ирсэн 35/40» + нимгэн зурвас; ирээгүй, дутуу нь жижгээр */
function Progress({
  label,
  value,
  total,
  note,
  className,
}: {
  label: string;
  value: number;
  total: number;
  note: string | null;
  className?: string;
}) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <span className={cn("min-w-0", className)}>
      <span className="flex items-baseline justify-between gap-2 text-xs">
        <span className="text-ink-dim">{label}</span>
        <span className="font-bold tabular-nums text-ink">
          {value}/{total}
        </span>
      </span>
      <span
        className="mt-1 block h-1.5 overflow-hidden rounded-full bg-ink/[0.07]"
        role="meter"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={value}
      >
        <span className="block h-full rounded-full bg-brand-bright" style={{ width: `${pct}%` }} />
      </span>
      {note && <span className="mt-0.5 block truncate text-[11px] text-ink-dim">{note}</span>}
    </span>
  );
}
