"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { ATTENDANCE_OPTIONS } from "@/components/attendance/StatusPills";
import { LATE_RANGE_OPTIONS, type LateRangeValue } from "@/components/attendance/LateRangePicker";
import { HOMEWORK_MARK_OPTIONS, type HomeworkMark } from "@/components/homework/HomeworkMarkPills";
import { monthRangeFor } from "./dateRange";
import { SectionEmpty, SectionError, SectionLoading } from "./ProgressSectionStatus";
import { useSection } from "./useSection";

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
    return { label: "Тэмдэглээгүй", icon: "", selectedClass: "bg-ink/10 text-ink-dim" };
  }
  return (
    HOMEWORK_MARK_OPTIONS.find((o) => o.value === status) ?? {
      label: status,
      icon: "",
      selectedClass: "bg-ink/10 text-ink-dim",
    }
  );
}

/**
 * "Ангийн явц" таб: сонгосон огнооны мужид (өгөгдмөл сүүлийн 30 хоног,
 * өмнөх/дараагийн сараар шилжинэ) тухайн сурагчийн ирц + өдөр тутмын
 * гэрийн даалгаврын тэмдэглэгээний ТҮҮХ, дээд талд нь товч дүгнэлт.
 */
export default function ClassProgressTab({ studentId }: { studentId: string }) {
  const [monthsBack, setMonthsBack] = useState(0);
  const { from, to, label } = monthRangeFor(monthsBack);

  const attendanceQ = useSection<AttendanceRow[]>(
    `/students/${studentId}/attendance?from=${from}&to=${to}`,
  );
  const homeworkQ = useSection<HomeworkMarkRow[]>(
    `/students/${studentId}/homework-marks?from=${from}&to=${to}`,
  );

  const attendance = attendanceQ.data ?? [];
  const homework = homeworkQ.data ?? [];

  const bothReady = attendanceQ.status === "ready" && homeworkQ.status === "ready";

  const presentCount = attendance.filter((a) => a.status === "PRESENT").length;
  const lateCount = attendance.filter((a) => a.status === "LATE").length;
  const attendanceRate =
    attendance.length > 0 ? Math.round((presentCount / attendance.length) * 100) : null;

  const markedHomework = homework.filter((h) => h.status !== null);
  const doneCount = markedHomework.filter((h) => h.status === "DONE").length;
  const homeworkRate =
    markedHomework.length > 0 ? Math.round((doneCount / markedHomework.length) * 100) : null;

  return (
    <div className="space-y-6">
      {/* Огнооны мужийн хяналт — ирц + даалгаврын түүх хоёуланд нэгэн адил хамаарна */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-surface p-3 md:p-4">
        <span className="text-sm font-semibold text-ink">{label}</span>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setMonthsBack((n) => n + 1)}
            aria-label="Өмнөх сар"
            className="flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-line transition hover:bg-ink/5"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden />
          </button>
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
      </div>

      {/* Дүгнэлтийн товч мөр */}
      {bothReady && (
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-line bg-panel p-3">
            <p className="text-xs text-ink-dim">Ирц</p>
            <p className="text-lg font-bold text-success">
              {attendanceRate !== null ? `${attendanceRate}%` : "—"}
            </p>
          </div>
          <div className="rounded-xl border border-line bg-panel p-3">
            <p className="text-xs text-ink-dim">Хоцролтын тоо</p>
            <p className="text-lg font-bold text-warning">{lateCount}</p>
          </div>
          <div className="rounded-xl border border-line bg-panel p-3">
            <p className="text-xs text-ink-dim">Даалгавар гүйцэтгэл</p>
            <p className="text-lg font-bold text-info">
              {homeworkRate !== null ? `${homeworkRate}%` : "—"}
            </p>
          </div>
        </div>
      )}

      {/* Ирцийн түүх */}
      <section className="rounded-2xl border border-line bg-panel p-4 md:p-6">
        <h2 className="mb-4 font-bold text-brand-soft">Ирцийн түүх</h2>
        {attendanceQ.status === "loading" && <SectionLoading label="Ирц" />}
        {attendanceQ.status === "error" && (
          <SectionError message={attendanceQ.error} onRetry={attendanceQ.reload} />
        )}
        {attendanceQ.status === "ready" && attendance.length === 0 && (
          <SectionEmpty text="Энэ хугацаанд ирцийн бүртгэл алга байна" />
        )}
        {attendanceQ.status === "ready" && attendance.length > 0 && (
          <div className="space-y-2">
            {attendance.map((row, i) => {
              const badge = attendanceBadge(row.status);
              const late = lateRangeLabel(row.lateRange);
              return (
                <div
                  key={`${row.date}-${row.classroom.id}-${i}`}
                  className="flex flex-wrap items-center gap-2 rounded-lg border border-line px-4 py-2.5 text-sm"
                >
                  <span className="w-24 shrink-0 text-ink-dim">{row.date.slice(0, 10)}</span>
                  <span className={`rounded-lg px-2.5 py-1 text-xs font-medium ${badge.selectedClass}`}>
                    {badge.icon ? `${badge.icon} ` : ""}
                    {badge.label}
                  </span>
                  {late && <span className="text-xs text-ink-dim">({late})</span>}
                  <span className="text-xs text-ink-dim">{row.classroom.name}</span>
                  {row.note && (
                    <span className="w-full text-xs text-ink-dim md:w-auto md:flex-1 md:text-right">
                      {row.note}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Гэрийн даалгаврын түүх */}
      <section className="rounded-2xl border border-line bg-panel p-4 md:p-6">
        <h2 className="mb-4 font-bold text-brand-soft">Гэрийн даалгаврын түүх</h2>
        {homeworkQ.status === "loading" && <SectionLoading label="Гэрийн даалгавар" />}
        {homeworkQ.status === "error" && (
          <SectionError message={homeworkQ.error} onRetry={homeworkQ.reload} />
        )}
        {homeworkQ.status === "ready" && homework.length === 0 && (
          <SectionEmpty text="Энэ хугацаанд гэрийн даалгаврын тэмдэглэгээ алга байна" />
        )}
        {homeworkQ.status === "ready" && homework.length > 0 && (
          <div className="space-y-2">
            {homework.map((row, i) => {
              const badge = homeworkBadge(row.status);
              return (
                <div
                  key={`${row.date}-${row.classroom.id}-${i}`}
                  className="flex flex-wrap items-center gap-2 rounded-lg border border-line px-4 py-2.5 text-sm"
                >
                  <span className="w-24 shrink-0 text-ink-dim">{row.date.slice(0, 10)}</span>
                  <span className={`rounded-lg px-2.5 py-1 text-xs font-medium ${badge.selectedClass}`}>
                    {badge.icon ? `${badge.icon} ` : ""}
                    {badge.label}
                  </span>
                  <span className="text-xs text-ink-dim">{row.classroom.name}</span>
                  {row.comment && (
                    <span className="w-full text-xs text-ink-dim md:w-auto md:flex-1 md:text-right">
                      {row.comment}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
