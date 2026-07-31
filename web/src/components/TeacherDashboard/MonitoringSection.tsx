"use client";

import { ChevronRight, MessageSquare } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";

/**
 * Ирцийн өгөгдөл — AttendanceSection-ийн RosterRow адил
 */
interface AttendanceRow {
  student: { id: string; firstName: string; lastName: string };
  status: string | null;
  note?: string | null;
  lateRange?: string | null;
}

/**
 * Даалгаврын өгөгдөл — AssignmentsSection-ийн HomeworkMarkRow адил
 */
interface HomeworkRow {
  student: { id: string; firstName: string; lastName: string };
  status: "DONE" | "PARTIAL" | "NOT_DONE" | null;
  comment: string | null;
}

interface MonitoringSectionProps {
  /** Ангийн ID */
  classroomId: string;
  /** Сонгосон өдрийн огноо (YYYY-MM-DD хэлбэр) */
  date: string;
}

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : "Алдаа гарлаа";
}

/**
 * Хяналтын нэг мөрөнд оюутан ба түүний ирц + даалгавар нэгэн зэрэг харагдана.
 * Зөвхөн харах зорилготой учраас цомхон — засах боломжгүй, зөвхөн статусаас өнгө ялгаруулна.
 *
 * Props:
 *  - classroomId: Ангийн ID (оролцох ирц + даалгаврын API дуудахад ашиглана)
 *  - date: Сонгосон өдрийн огноо (YYYY-MM-DD хэлбэр)
 *
 * Рендэр:
 *  - Дээр нь легенд + дүн мөр
 *  - Оюутан бүр НЭГЖ мөрөнд: Нэр (линк) | Ирцийн chip | Даалгаврын chip | Комментын icon (байвал)
 *  - Мөрүүд py-1.5, text-sm хэмжээтэй, зөвхөн нарийн зураасаар тусгаарлагдана
 *  - Loading/error төлвүүд: бусад section-уудтай адил
 */
export default function MonitoringSection({
  classroomId,
  date,
}: MonitoringSectionProps) {
  const [attendanceRows, setAttendanceRows] = useState<AttendanceRow[]>([]);
  const [homeworkRows, setHomeworkRows] = useState<HomeworkRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(() => {
    setLoading(true);
    setError(null);

    // Зэрэг хоёр API дуудна
    Promise.all([
      api<AttendanceRow[]>(`/classrooms/${classroomId}/attendance?date=${date}`),
      api<HomeworkRow[]>(
        `/classrooms/${classroomId}/homework-marks?date=${date}`,
      ),
    ])
      .then(([attRows, hwRows]) => {
        setAttendanceRows(attRows);
        setHomeworkRows(hwRows);
      })
      .catch((e) => setError(errMsg(e)))
      .finally(() => setLoading(false));
  }, [classroomId, date]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Нэгтгэлтийн хүснэгт байгуулах (оюутан ID-аар индекс)
  const attendanceMap = Object.fromEntries(
    attendanceRows.map((r) => [r.student.id, r]),
  );
  const homeworkMap = Object.fromEntries(
    homeworkRows.map((r) => [r.student.id, r]),
  );

  // Хоёулаа гүйцэтгэсэн оюутнуудын нэгдсэн жагсаалт (нэрний дарaalах дараалалтай)
  const allStudents = [
    ...attendanceRows.map((r) => r.student),
    ...homeworkRows
      .filter((hw) => !attendanceMap[hw.student.id])
      .map((hw) => hw.student),
  ];
  const studentIds = [...new Set(allStudents.map((s) => s.id))];

  // Ирцийн статус chip-ийг дүн болгон тооцох
  const attendanceStats = {
    present: attendanceRows.filter((r) => r.status === "PRESENT").length,
    late: attendanceRows.filter((r) => r.status === "LATE").length,
    absent: attendanceRows.filter((r) => r.status === "ABSENT").length,
  };

  // Даалгаврын статус chip-ийг дүн болгон тооцох
  const homeworkStats = {
    done: homeworkRows.filter((r) => r.status === "DONE").length,
    partial: homeworkRows.filter((r) => r.status === "PARTIAL").length,
    notDone: homeworkRows.filter((r) => r.status === "NOT_DONE").length,
  };

  return (
    <section className="rounded-2xl border border-line bg-panel p-4 md:p-6">
      {/* Header */}
      <h2 className="mb-4 font-bold text-brand-soft">Хяналт</h2>

      {/* Legend */}
      <div className="mb-4 grid grid-cols-2 gap-3 rounded-lg border border-line/30 bg-surface/50 p-3 text-xs md:grid-cols-4 md:p-4">
        {/* Ирцийн өнгөнүүд */}
        <div className="space-y-1">
          <div className="font-semibold text-ink-dim">Ирц</div>
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full bg-success" />
            <span className="text-ink-dim">Ирсэн</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full bg-warning" />
            <span className="text-ink-dim">Хоцорсон</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full bg-error" />
            <span className="text-ink-dim">Тасалсан</span>
          </div>
        </div>

        {/* Чөлөөтэй / тэмдэглээгүй */}
        <div className="space-y-1">
          <div className="font-semibold text-ink-dim" />
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full bg-info" />
            <span className="text-ink-dim">Чөлөөтэй</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full border border-line/50 bg-transparent" />
            <span className="text-ink-dim">Тэмдэглээгүй</span>
          </div>
        </div>

        {/* Даалгаврын өнгөнүүд */}
        <div className="space-y-1">
          <div className="font-semibold text-ink-dim">Даалгавар</div>
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full bg-success" />
            <span className="text-ink-dim">Хийсэн</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full bg-warning" />
            <span className="text-ink-dim">Дутуу</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full bg-error" />
            <span className="text-ink-dim">Хийгээгүй</span>
          </div>
        </div>

        {/* Даалгаврын тэмдэглээгүй */}
        <div className="space-y-1">
          <div className="font-semibold text-ink-dim" />
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full border border-line/50 bg-transparent" />
            <span className="text-ink-dim">Тэмдэглээгүй</span>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="mb-4 rounded-lg border border-line/30 bg-surface/50 px-3 py-2 text-sm text-ink-dim md:px-4 md:py-3">
        <span className="font-semibold text-ink">
          Ирсэн {attendanceStats.present + attendanceStats.late}/
          {attendanceRows.length}
        </span>
        {" · "}
        <span className="font-semibold text-ink">
          Даалгавар хийсэн {homeworkStats.done}/
          {homeworkRows.length}
        </span>
      </div>

      {/* Error State */}
      {error && (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-error/30 bg-error/10 px-3 py-2 text-sm text-error">
          <span>⚠ {error}</span>
          <button
            onClick={loadData}
            className="rounded-lg border border-error/40 px-2 py-1 text-xs font-semibold transition hover:bg-error/10"
          >
            Дахин ачаалах
          </button>
        </div>
      )}

      {/* Monitoring List */}
      <div className="space-y-0">
        {loading ? (
          <p className="animate-pulse text-sm text-ink-dim" role="status">
            Ачаалж байна…
          </p>
        ) : attendanceRows.length === 0 && homeworkRows.length === 0 ? (
          <p className="text-sm text-ink-dim">Сурагч байхгүй эсвэл өгөгдөл ачаалагдсангүй</p>
        ) : (
          studentIds.map((studentId, idx) => {
            const attRow = attendanceMap[studentId];
            const hwRow = homeworkMap[studentId];
            const student =
              attRow?.student || hwRow?.student || { id: studentId, firstName: "", lastName: "" };
            const studentLabel = `${student.firstName} ${student.lastName}`;

            const attStatus = attRow?.status;
            const hwStatus = hwRow?.status;

            // Ирцийн chip-ийн өнгө болон текст
            const getAttendanceDisplay = () => {
              if (attStatus === "PRESENT")
                return { color: "bg-success", label: "Ирсэн" };
              if (attStatus === "LATE")
                return { color: "bg-warning", label: "Хоцорсон" };
              if (attStatus === "ABSENT")
                return { color: "bg-error", label: "Тасалсан" };
              if (attStatus === "EXEMPT")
                return { color: "bg-info", label: "Чөлөөтэй" };
              return { color: "border border-line", label: "—" };
            };

            // Даалгаврын chip-ийн өнгө болон текст
            const getHomeworkDisplay = () => {
              if (hwStatus === "DONE")
                return { color: "bg-success", label: "Хийсэн" };
              if (hwStatus === "PARTIAL")
                return { color: "bg-warning", label: "Дутуу" };
              if (hwStatus === "NOT_DONE")
                return { color: "bg-error", label: "Хийгээгүй" };
              return { color: "border border-line", label: "—" };
            };

            const attDisplay = getAttendanceDisplay();
            const hwDisplay = getHomeworkDisplay();

            return (
              <div
                key={studentId}
                className={`flex items-center justify-between gap-3 border-b border-line/30 px-3 py-1.5 text-sm last:border-b-0 md:gap-4 md:px-4`}
              >
                {/* Нэр + линк */}
                <div className="flex min-w-0 items-center gap-1.5 flex-1">
                  <span className="truncate font-medium text-ink">{studentLabel}</span>
                  <Link
                    href={`/app/students/${student.id}`}
                    onClick={(e) => e.stopPropagation()}
                    aria-label={`${studentLabel} — дэлгэрэнгүй явц харах`}
                    className="shrink-0 text-ink-dim transition hover:text-brand-soft"
                  >
                    <ChevronRight className="h-3.5 w-3.5" aria-hidden />
                  </Link>
                </div>

                {/* Ирцийн chip */}
                <div
                  className={`shrink-0 inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium ${
                    attStatus ? attDisplay.color : attDisplay.color + " bg-surface"
                  } ${attStatus ? "text-white" : "text-ink-dim"}`}
                  title={attDisplay.label}
                >
                  {attDisplay.label}
                </div>

                {/* Даалгаврын chip */}
                <div
                  className={`shrink-0 inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium ${
                    hwStatus ? hwDisplay.color : hwDisplay.color + " bg-surface"
                  } ${hwStatus ? "text-white" : "text-ink-dim"}`}
                  title={hwDisplay.label}
                >
                  {hwDisplay.label}
                </div>

                {/* Комментын icon (байвал) */}
                {(attRow?.note || hwRow?.comment) && (
                  <div
                    className="shrink-0 text-ink-dim"
                    title={attRow?.note || hwRow?.comment || "Коммент"}
                  >
                    <MessageSquare className="h-3.5 w-3.5" aria-hidden />
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
