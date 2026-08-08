"use client";

import { ChevronRight, MessageSquare, CheckCircle2, Clock, XCircle, HelpCircle } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { LoadingState, ErrorState, EmptyState } from "@/components/ui/StateBlock";
import { Card, SectionHeader } from "@/components/ui/Surface";
import { Dot } from "@/components/ui/Meta";

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
    <Card>
      <SectionHeader title="Хяналт" />

      {/* Legend */}
      <div className="mb-4 grid grid-cols-2 gap-2 rounded-lg border border-line/30 bg-surface/50 p-3 text-xs md:grid-cols-4 md:gap-3 md:p-4">
        {/* Ирцийн өнгөнүүд */}
        <div className="space-y-1">
          <div className="font-semibold text-ink-dim">Ирц</div>
          <div className="flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3 text-success" aria-hidden />
            <span className="text-ink-dim">Ирсэн</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3 text-warning" aria-hidden />
            <span className="text-ink-dim">Хоцорсон</span>
          </div>
          <div className="flex items-center gap-1">
            <XCircle className="h-3 w-3 text-error" aria-hidden />
            <span className="text-ink-dim">Тасалсан</span>
          </div>
        </div>

        {/* Чөлөөтэй / тэмдэглээгүй */}
        <div className="space-y-1">
          <div className="font-semibold text-ink-dim" />
          <div className="flex items-center gap-1">
            <HelpCircle className="h-3 w-3 text-info" aria-hidden />
            <span className="text-ink-dim">Чөлөөтэй</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="h-3 w-3 rounded-full border border-line/50" aria-hidden />
            <span className="text-ink-dim">Тэмдэглээгүй</span>
          </div>
        </div>

        {/* Даалгаврын өнгөнүүд */}
        <div className="space-y-1">
          <div className="font-semibold text-ink-dim">Даалгавар</div>
          <div className="flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3 text-success" aria-hidden />
            <span className="text-ink-dim">Хийсэн</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3 text-warning" aria-hidden />
            <span className="text-ink-dim">Дутуу</span>
          </div>
          <div className="flex items-center gap-1">
            <XCircle className="h-3 w-3 text-error" aria-hidden />
            <span className="text-ink-dim">Хийгээгүй</span>
          </div>
        </div>

        {/* Даалгаврын тэмдэглээгүй */}
        <div className="space-y-1">
          <div className="font-semibold text-ink-dim" />
          <div className="flex items-center gap-1">
            <div className="h-3 w-3 rounded-full border border-line/50" aria-hidden />
            <span className="text-ink-dim">Тэмдэглээгүй</span>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="mb-4 rounded-lg border border-line/30 bg-surface/50 px-3 py-2 text-sm text-ink-dim md:px-4 md:py-3">
        <span className="font-semibold text-ink">
          Ирсэн{" "}
          <span className="value-bump inline-block" key={`att-${attendanceStats.present + attendanceStats.late}`}>
            {attendanceStats.present + attendanceStats.late}
          </span>
          /{attendanceRows.length}
        </span>
        <Dot />
        <span className="font-semibold text-ink">
          Даалгавар хийсэн{" "}
          <span className="value-bump inline-block" key={`hw-${homeworkStats.done}`}>
            {homeworkStats.done}
          </span>
          /{homeworkRows.length}
        </span>
      </div>

      {/* States */}
      {error && <ErrorState message={error} onRetry={loadData} />}

      {!error && loading && <LoadingState rows={6} label="Хяналтын өгөгдөл ачаалж байна" />}

      {!error && !loading && attendanceRows.length === 0 && homeworkRows.length === 0 && (
        <EmptyState
          icon={HelpCircle}
          title="Сурагч байхгүй"
          hint="Энэ ангид сурагчийн өгөгдөл байхгүй эсвэл ачаалагдсангүй байна"
        />
      )}

      {/* Monitoring List */}
      {!error && !loading && (attendanceRows.length > 0 || homeworkRows.length > 0) && (
        <div className="space-y-0">
          {studentIds.map((studentId) => {
            const attRow = attendanceMap[studentId];
            const hwRow = homeworkMap[studentId];
            const student =
              attRow?.student || hwRow?.student || { id: studentId, firstName: "", lastName: "" };
            const studentLabel = `${student.firstName} ${student.lastName}`;

            const attStatus = attRow?.status;
            const hwStatus = hwRow?.status;

            // Ирцийн дүрс болон өнгө
            const getAttendanceIcon = () => {
              if (attStatus === "PRESENT") return { Icon: CheckCircle2, color: "bg-success", label: "Ирсэн" };
              if (attStatus === "LATE") return { Icon: Clock, color: "bg-warning", label: "Хоцорсон" };
              if (attStatus === "ABSENT") return { Icon: XCircle, color: "bg-error", label: "Тасалсан" };
              if (attStatus === "EXEMPT") return { Icon: HelpCircle, color: "bg-info", label: "Чөлөөтэй" };
              return { Icon: HelpCircle, color: "border border-line", label: "—" };
            };

            // Даалгаврын дүрс болон өнгө
            const getHomeworkIcon = () => {
              if (hwStatus === "DONE") return { Icon: CheckCircle2, color: "bg-success", label: "Хийсэн" };
              if (hwStatus === "PARTIAL") return { Icon: Clock, color: "bg-warning", label: "Дутуу" };
              if (hwStatus === "NOT_DONE") return { Icon: XCircle, color: "bg-error", label: "Хийгээгүй" };
              return { Icon: HelpCircle, color: "border border-line", label: "—" };
            };

            const attIcon = getAttendanceIcon();
            const hwIcon = getHomeworkIcon();
            const AttIcon = attIcon.Icon;
            const HwIcon = hwIcon.Icon;

            return (
              <div
                key={studentId}
                className="flex items-center justify-between gap-2 border-b border-line/30 px-3 py-1 text-xs last:border-b-0 md:gap-3 md:px-4 md:py-1.5"
                style={{ minHeight: "var(--row-compact)" }}
              >
                {/* Нэр + линк */}
                <div className="flex min-w-0 items-center gap-1 flex-1">
                  <span className="truncate font-medium text-ink text-xs">{studentLabel}</span>
                  <Link
                    href={`/app/students/${student.id}`}
                    onClick={(e) => e.stopPropagation()}
                    aria-label={`${studentLabel} — дэлгэрэнгүй явц харах`}
                    className="shrink-0 text-ink-dim transition hover:text-brand-soft"
                  >
                    <ChevronRight className="h-3 w-3" aria-hidden />
                  </Link>
                </div>

                {/* Ирцийн chip: icon + color */}
                <div
                  className={`shrink-0 inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-xs font-medium ${
                    attStatus ? `${attIcon.color} text-on-brand` : "border border-line bg-transparent text-ink-dim"
                  }`}
                  title={attIcon.label}
                >
                  <AttIcon className="h-2.5 w-2.5" aria-hidden />
                  <span className="hidden sm:inline">{attIcon.label}</span>
                </div>

                {/* Даалгаврын chip: icon + color */}
                <div
                  className={`shrink-0 inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-xs font-medium ${
                    hwStatus ? `${hwIcon.color} text-on-brand` : "border border-line bg-transparent text-ink-dim"
                  }`}
                  title={hwIcon.label}
                >
                  <HwIcon className="h-2.5 w-2.5" aria-hidden />
                  <span className="hidden sm:inline">{hwIcon.label}</span>
                </div>

                {/* Комментын icon (байвал) */}
                {(attRow?.note || hwRow?.comment) && (
                  <div className="shrink-0 text-ink-dim" title={attRow?.note || hwRow?.comment || "Коммент"}>
                    <MessageSquare className="h-3 w-3" aria-hidden />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
