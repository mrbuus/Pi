"use client";

import { BookOpenCheck } from "lucide-react";
import { Badge } from "@/components/ui/kit/badge";
import { Meta } from "@/components/ui/Meta";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/StateBlock";
import { formatMnDate } from "@/lib/dateMn";
import { useSection } from "../progress/useSection";

// api/src/lesson-records/lesson-records.service.ts studentHistory()-тэй тохирно
interface LessonRow {
  id: string;
  date: string;
  classroomName: string;
  startMinute: number;
  endMinute: number;
  room: string | null;
  topic: string | null;
  leadTeacherName: string | null;
  assistantTeacherName: string | null;
  testCount: number;
  presentCount: number;
  enrolledCount: number;
  attendance: string | null;
}

const ATTENDANCE: Record<string, { text: string; tone: "success" | "warning" | "danger" | "info" }> = {
  PRESENT: { text: "Ирсэн", tone: "success" },
  LATE: { text: "Хоцорсон", tone: "warning" },
  ABSENT: { text: "Тасалсан", tone: "danger" },
  EXCUSED: { text: "Чөлөөтэй", tone: "info" },
};

function hhmm(minute: number): string {
  return `${String(Math.floor(minute / 60)).padStart(2, "0")}:${String(minute % 60).padStart(2, "0")}`;
}

/** «Хичээлийн түүх» — тухайн сурагчийн оролцсон, батлагдсан хичээлүүд. */
export default function LessonHistoryTab({ studentId }: { studentId: string }) {
  const q = useSection<LessonRow[]>(`/lesson-records/student/${encodeURIComponent(studentId)}?limit=120`, []);
  const rows = q.data;

  if (q.status === "loading") return <LoadingState rows={5} label="Хичээлийн түүх" />;
  if (q.status === "error") return <ErrorState message={q.error} onRetry={q.reload} />;
  if (rows.length === 0)
    return (
      <EmptyState
        icon={BookOpenCheck}
        title="Батлагдсан хичээл алга"
        hint="Багш хичээлээ хуваарь дээрээс баталгаажуулахад энд гарна."
      />
    );

  const attended = rows.filter((r) => r.attendance === "PRESENT" || r.attendance === "LATE").length;

  return (
    <section className="chunky p-4 md:p-6">
      <div className="mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2 className="font-bold text-brand-soft">Хичээлийн түүх</h2>
        <Meta className="text-sm text-ink-dim" items={[`${rows.length} хичээл`, `${attended} ирсэн`]} />
      </div>
      <ul className="divide-y divide-line">
        {rows.map((r) => {
          const att = r.attendance ? ATTENDANCE[r.attendance] : null;
          return (
            <li key={r.id} className="flex items-start gap-3 py-2.5">
              <div className="w-20 shrink-0 text-sm">
                <p className="font-semibold tabular-nums text-ink">{formatMnDate(r.date, { month: "2-digit", day: "2-digit" })}</p>
                <p className="text-xs tabular-nums text-ink-dim">{hhmm(r.startMinute)}</p>
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-ink">{r.topic || r.classroomName}</p>
                <Meta
                  className="text-xs text-ink-dim"
                  items={[r.topic ? r.classroomName : null, r.leadTeacherName, r.room, r.testCount > 0 && `${r.testCount} тест`]}
                />
              </div>
              {att ? <Badge tone={att.tone}>{att.text}</Badge> : <Badge tone="neutral">Тэмдэглээгүй</Badge>}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
