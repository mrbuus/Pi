"use client";

import { Check, Clock, X, ChevronLeft, ChevronRight, type LucideIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { ATTENDANCE_OPTIONS } from "@/components/attendance/StatusPills";
import { LATE_RANGE_OPTIONS, type LateRangeValue } from "@/components/attendance/LateRangePicker";
import { HOMEWORK_MARK_OPTIONS, type HomeworkMark } from "@/components/homework/HomeworkMarkPills";
import { ubToday } from "@/components/homework/homeworkDate";
import { Meta } from "@/components/ui/Meta";
import { cn } from "@/lib/cn";
import { monthRangeFor } from "./dateRange";
import { SectionEmpty, SectionError, SectionLoading } from "./ProgressSectionStatus";
import { useSection } from "./useSection";
import MakeupHistory from "@/components/makeup-visits/MakeupHistory";

// api/src/attendance/attendance.service.ts byStudent()-тэй яг тохирсон хэлбэр
interface AttendanceRow {
  date: string;
  status: "PRESENT" | "LATE" | "ABSENT" | "EXCUSED";
  note: string | null;
  lateRange: LateRangeValue | null;
  classroom: { id: string; name: string };
}

// api/src/assignments/homework-marks.service.ts byStudent()-тэй яг тохирсон хэлбэр
interface HomeworkMarkRow {
  date: string;
  status: HomeworkMark | null;
  comment: string | null;
  updatedAt: string | null;
  classroom: { id: string; name: string };
}

/** Нэг хичээлийн өдөр: ирц ба даалгаврын тэмдэглэгээ нэг мөрөнд */
interface LessonDay {
  key: string;
  date: string;
  classroom: string;
  attendance: AttendanceRow | null;
  homework: HomeworkMarkRow | null;
}

// Бүх хугацаа = бүртгэл эхэлснээс хойш. Огнооны доод хязгаар нь системийн эхлэлээс өмнө.
const ALL_FROM = "2020-01-01";
const WEEKDAY = ["Ня", "Да", "Мя", "Лх", "Пү", "Ба", "Бя"];
const attendanceIcons: Record<string, LucideIcon> = { check: Check, clock: Clock, x: X };

function attendanceBadge(status: AttendanceRow["status"]) {
  return (
    ATTENDANCE_OPTIONS.find((o) => o.value === status) ?? {
      label: status,
      icon: "",
      selectedClass: "bg-ink/10 text-ink-dim",
    }
  );
}

function lateRangeLabel(value: LateRangeValue | null): string | null {
  if (!value) return null;
  return LATE_RANGE_OPTIONS.find((o) => o.value === value)?.label ?? null;
}

function homeworkBadge(status: HomeworkMark | null) {
  if (!status) {
    return { label: "Тэмдэглээгүй", icon: null, selectedClass: "bg-ink/10 text-ink-dim" };
  }
  return (
    HOMEWORK_MARK_OPTIONS.find((o) => o.value === status) ?? {
      label: status,
      icon: null,
      selectedClass: "bg-ink/10 text-ink-dim",
    }
  );
}

function percent(n: number, total: number): number | null {
  return total > 0 ? Math.round((n / total) * 100) : null;
}

// Сурагчийн нүүрийн хураангуйтай ижил томьёо (api/src/student-hub/student-hub.logic.ts):
// ирц = (ирсэн + хоцорсон) / нийт, даалгавар = (хийсэн + дутуу×0.5) / тэмдэглэсэн
function summarize(attendance: AttendanceRow[], homework: HomeworkMarkRow[]) {
  const a = { PRESENT: 0, LATE: 0, ABSENT: 0, EXCUSED: 0 };
  for (const row of attendance) a[row.status] += 1;
  const h = { DONE: 0, PARTIAL: 0, NOT_DONE: 0 };
  for (const row of homework) if (row.status) h[row.status] += 1;
  const marked = h.DONE + h.PARTIAL + h.NOT_DONE;
  return {
    attendance: { ...a, total: attendance.length, rate: percent(a.PRESENT + a.LATE, attendance.length) },
    homework: { ...h, total: marked, rate: percent(h.DONE + h.PARTIAL * 0.5, marked) },
  };
}

function dayLabel(date: string): string {
  const key = date.slice(0, 10);
  const [, m, d] = key.split("-");
  return `${m}.${d} ${WEEKDAY[new Date(`${key}T12:00:00Z`).getUTCDay()]}`;
}

function monthLabel(monthKey: string): string {
  const [y, m] = monthKey.split("-").map(Number);
  return `${y} оны ${m}-р сар`;
}

function RateTile({
  title,
  rate,
  tone,
  items,
}: {
  title: string;
  rate: number | null;
  tone: string;
  items: (string | false)[];
}) {
  return (
    <div className="rounded-xl border border-line bg-panel p-3 md:p-4">
      <p className="text-xs text-ink-dim">{title}</p>
      <p className={cn("text-2xl font-bold tabular-nums", tone)}>{rate !== null ? `${rate}%` : "—"}</p>
      <Meta className="text-xs text-ink-dim" items={items} />
    </div>
  );
}

/**
 * "Ангийн явц" таб (эзэн 2026-11-05: «хүүхдийн бүх хугацааны ирц, даалгавар
 * харагдах ёстой»). Өгөгдмөл нь БҮХ ХУГАЦАА: нийт дүгнэлт, сар бүрийн тойм,
 * хичээлийн өдөр бүрийн ирц + даалгавар нэг мөрөнд. «Сараар» горимд сүүлийн
 * 30 хоног болон өмнөх сарууд руу шилжинэ.
 */
export default function ClassProgressTab({ studentId }: { studentId: string }) {
  const [mode, setMode] = useState<"all" | "month">("all");
  const [monthsBack, setMonthsBack] = useState(0);
  const month = monthRangeFor(monthsBack);
  const from = mode === "all" ? ALL_FROM : month.from;
  const to = mode === "all" ? ubToday() : month.to;

  const attendanceQ = useSection<AttendanceRow[]>(
    `/students/${studentId}/attendance?from=${from}&to=${to}`,
  );
  const homeworkQ = useSection<HomeworkMarkRow[]>(
    `/students/${studentId}/homework-marks?from=${from}&to=${to}`,
  );

  const bothReady = attendanceQ.status === "ready" && homeworkQ.status === "ready";
  const loading = attendanceQ.status === "loading" || homeworkQ.status === "loading";
  const error = attendanceQ.status === "error" ? attendanceQ : homeworkQ.status === "error" ? homeworkQ : null;

  const { days, months, total } = useMemo(() => {
    const attendance = attendanceQ.data ?? [];
    const homework = homeworkQ.data ?? [];
    const byKey = new Map<string, LessonDay>();
    const slot = (date: string, classroom: { id: string; name: string }) => {
      const key = `${date.slice(0, 10)}|${classroom.id}`;
      let day = byKey.get(key);
      if (!day) {
        day = { key, date: date.slice(0, 10), classroom: classroom.name, attendance: null, homework: null };
        byKey.set(key, day);
      }
      return day;
    };
    for (const row of attendance) slot(row.date, row.classroom).attendance = row;
    for (const row of homework) slot(row.date, row.classroom).homework = row;
    const days = [...byKey.values()].sort((a, b) => b.date.localeCompare(a.date));

    const monthKeys = [...new Set(days.map((d) => d.date.slice(0, 7)))];
    const months = monthKeys.map((key) => ({
      key,
      ...summarize(
        attendance.filter((r) => r.date.startsWith(key)),
        homework.filter((r) => r.date.startsWith(key)),
      ),
    }));
    return { days, months, total: summarize(attendance, homework) };
  }, [attendanceQ.data, homeworkQ.data]);

  const multiClass = new Set(days.map((d) => d.classroom)).size > 1;

  return (
    <div className="space-y-5">
      {/* Хугацаа: бүх хугацаа эсвэл сараар */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-surface p-3 md:p-4">
        <div className="flex gap-1.5" role="group" aria-label="Хугацаа">
          {(["all", "month"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              aria-pressed={mode === m}
              className={cn(
                "min-h-11 rounded-full border px-4 text-sm font-semibold transition-colors",
                mode === m ? "border-brand-bright bg-brand-bright/15 text-brand-soft" : "border-line text-ink-dim hover:text-ink",
              )}
            >
              {m === "all" ? "Бүх хугацаа" : "Сараар"}
            </button>
          ))}
        </div>
        {mode === "month" && (
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setMonthsBack((n) => n + 1)}
              aria-label="Өмнөх сар"
              className="flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-line transition hover:bg-ink/5"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden />
            </button>
            <span className="min-w-32 text-center text-sm font-semibold text-ink">{month.label}</span>
            <button
              type="button"
              onClick={() => setMonthsBack((n) => Math.max(0, n - 1))}
              disabled={monthsBack === 0}
              aria-label="Дараагийн сар"
              className="flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-line transition hover:bg-ink/5 disabled:opacity-40"
            >
              <ChevronRight className="h-4 w-4" aria-hidden />
            </button>
          </div>
        )}
      </div>

      {loading && <SectionLoading label="Ирц, даалгавар" />}
      {error && <SectionError message={error.error} onRetry={error.reload} />}

      {bothReady && (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <RateTile
              title={`Ирц, ${total.attendance.total} хичээл`}
              rate={total.attendance.rate}
              tone="text-success"
              items={[
                `${total.attendance.PRESENT} ирсэн`,
                total.attendance.LATE > 0 && `${total.attendance.LATE} хоцорсон`,
                total.attendance.ABSENT > 0 && `${total.attendance.ABSENT} тасалсан`,
                total.attendance.EXCUSED > 0 && `${total.attendance.EXCUSED} чөлөөтэй`,
              ]}
            />
            <RateTile
              title={`Гэрийн даалгавар, ${total.homework.total} тэмдэглэгээ`}
              rate={total.homework.rate}
              tone="text-info"
              items={[
                `${total.homework.DONE} хийсэн`,
                total.homework.PARTIAL > 0 && `${total.homework.PARTIAL} дутуу`,
                total.homework.NOT_DONE > 0 && `${total.homework.NOT_DONE} хийгээгүй`,
              ]}
            />
          </div>

          {mode === "all" && months.length > 1 && (
            <section className="chunky p-4 md:p-6">
              <h2 className="mb-3 font-bold text-brand-soft">Сар бүрээр</h2>
              <ul className="divide-y divide-line">
                {months.map((m) => (
                  <li key={m.key} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-2.5 text-sm">
                    <span className="font-semibold text-ink">{monthLabel(m.key)}</span>
                    <span className="flex gap-4 tabular-nums text-ink-dim">
                      <span>
                        Ирц <b className="text-ink">{m.attendance.rate ?? "—"}{m.attendance.rate !== null && "%"}</b>
                      </span>
                      <span>
                        Даалгавар <b className="text-ink">{m.homework.rate ?? "—"}{m.homework.rate !== null && "%"}</b>
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <MakeupHistory
            studentId={studentId}
            wrap={(list, n) => (
              <section className="chunky p-4 md:p-6">
                <h2 className="mb-3 font-bold text-brand-soft">Нөхөлт, {n} удаа</h2>
                {list}
              </section>
            )}
          />

          <section className="chunky p-4 md:p-6">
            <h2 className="mb-3 font-bold text-brand-soft">Хичээл бүрээр</h2>
            {days.length === 0 && <SectionEmpty text="Энэ хугацаанд ирц, даалгаврын бүртгэл алга байна" />}
            {days.length > 0 && (
              <ul className="space-y-2">
                {days.map((day) => {
                  const att = day.attendance ? attendanceBadge(day.attendance.status) : null;
                  const AttIcon = att ? attendanceIcons[att.icon] : null;
                  const late = day.attendance ? lateRangeLabel(day.attendance.lateRange) : null;
                  const hw = homeworkBadge(day.homework?.status ?? null);
                  const HwIcon = hw.icon;
                  const notes = [day.attendance?.note, day.homework?.comment].filter(Boolean);
                  return (
                    <li key={day.key} className="rounded-lg border border-line px-3 py-2.5 text-sm md:px-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="w-20 shrink-0 tabular-nums text-ink-dim">{dayLabel(day.date)}</span>
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium",
                            att ? att.selectedClass : "bg-ink/10 text-ink-dim",
                          )}
                        >
                          {AttIcon && <AttIcon className="h-3 w-3" aria-hidden />}
                          {att ? att.label : "Ирц алга"}
                          {late && <span className="font-normal">({late})</span>}
                        </span>
                        <span className={cn("inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium", hw.selectedClass)}>
                          {HwIcon && <HwIcon className="h-3 w-3" aria-hidden />}
                          {hw.label}
                        </span>
                        {multiClass && <span className="text-xs text-ink-dim">{day.classroom}</span>}
                      </div>
                      {notes.length > 0 && <p className="mt-1.5 text-xs text-ink-dim">{notes.join(" / ")}</p>}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}
