"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, ClipboardList, Users } from "lucide-react";
import InfoHint from "@/components/ui/InfoHint";
import { SkeletonRows } from "@/components/ui/Skeleton";
import { EmptyState, ErrorState } from "@/components/ui/StateBlock";
import { api } from "@/lib/api";
import { monthLabel } from "./meta";
import { ExamGrid, IndependentGrid, MarkGrid } from "./MonthGrids";
import { Segmented } from "./parts";
import StudentFocus from "./StudentFocus";
import type { MonthData, MonthMetric } from "./types";

export const METRICS: { value: MonthMetric; label: string }[] = [
  { value: "attendance", label: "Ирц" },
  { value: "homework", label: "Даалгавар" },
  { value: "exams", label: "Шалгалт" },
  { value: "independent", label: "Бие даасан" },
];

const HINT: Record<MonthMetric, string> = {
  attendance:
    "Багана бүр хуваарийн бодит хичээлийн өдөр (цуцалсан, зөөсөн, амралтыг тооцсон). Хувь: ирсэн ба хоцорсон / тэмдэглэсэн, чөлөөтэйг тооцохгүй. Доогуур зураастай огноо — батлагдсан хичээл",
  homework: "Багана бүр хичээлийн өдөр. Хувь: хийсэн, дутуу нь хагаст тооцогдоно",
  exams: "Энэ сард ангид оноосон шалгалт. Баганын толгой дээр дарж тархалт, байрыг харна",
  independent:
    "Шалгалтаас гадуур өөрөө бодсон бодлого (Бодлого бодох, оройн тэмдэглэгээ, лаборатори, давтлага) ба ангид оноогоогүй тест, 7 хоногоор. Ангийн дундаж бүх сурагчаар",
};

/**
 * Сарын явц (эзэн 2026-10-13): өмнөх/дараагийн сар, 4 хэмжүүр, сурагч бүр
 * ангийн дундажтай. Нэр дээр дарахад тухайн хүүхдийн товч самбар.
 */
export default function MonthView({
  classroomId,
  metric,
  onMetric,
}: {
  classroomId: string;
  metric: MonthMetric;
  onMetric: (m: MonthMetric) => void;
}) {
  const [month, setMonth] = useState<string | null>(null);
  const [data, setData] = useState<MonthData | null>(null);
  const [error, setError] = useState("");
  const [focusId, setFocusId] = useState<string | null>(null);
  const cache = useRef(new Map<string, MonthData>());

  const load = useCallback(
    async (m: string | null) => {
      const key = m ?? "";
      const hit = cache.current.get(key);
      if (hit) {
        setData(hit);
        return;
      }
      setError("");
      setData(null);
      try {
        const q = m ? `?month=${encodeURIComponent(m)}` : "";
        const res = await api<MonthData>(`/class-dashboard/classes/${encodeURIComponent(classroomId)}/month${q}`);
        cache.current.set(key, res);
        cache.current.set(res.month, res);
        setData(res);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Сарын мэдээллийг ачаалж чадсангүй");
      }
    },
    [classroomId],
  );

  useEffect(() => {
    const t = window.setTimeout(() => void load(month), 0);
    return () => window.clearTimeout(t);
  }, [load, month]);

  const shown = data && (!month || data.month === month) ? data : null;

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <nav className="flex items-center gap-1" aria-label="Сар сонгох">
          <button
            type="button"
            onClick={() => shown && setMonth(shown.prev)}
            disabled={!shown}
            className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-line bg-surface text-ink hover:bg-panel focus-visible:outline-2 focus-visible:outline-brand disabled:opacity-40"
            aria-label="Өмнөх сар"
          >
            <ChevronLeft className="h-5 w-5" aria-hidden />
          </button>
          <p className="min-w-[9.5rem] text-center font-bold text-ink" aria-live="polite">
            {shown ? monthLabel(shown.month) : month ? monthLabel(month) : "Энэ сар"}
          </p>
          <button
            type="button"
            onClick={() => shown?.next && setMonth(shown.next)}
            disabled={!shown?.next}
            className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-line bg-surface text-ink hover:bg-panel focus-visible:outline-2 focus-visible:outline-brand disabled:opacity-40"
            aria-label="Дараагийн сар"
          >
            <ChevronRight className="h-5 w-5" aria-hidden />
          </button>
          {shown && shown.month !== shown.current && (
            <button
              type="button"
              onClick={() => setMonth(shown.current)}
              className="ml-1 inline-flex min-h-11 items-center rounded-xl px-2 text-sm font-semibold text-brand hover:underline focus-visible:outline-2 focus-visible:outline-brand"
            >
              Энэ сар
            </button>
          )}
        </nav>
        <div className="flex items-center gap-1.5">
          <Segmented label="Хэмжүүр" value={metric} onChange={onMetric} options={METRICS} />
          <InfoHint>{HINT[metric]}</InfoHint>
        </div>
      </div>

      {error && <ErrorState message={error} onRetry={() => void load(month)} />}
      {!shown && !error && (
        <div role="status" aria-label="Сарын мэдээлэл ачаалж байна">
          <SkeletonRows rows={8} />
        </div>
      )}

      {shown && shown.students.length === 0 && (
        <EmptyState icon={Users} title="Энэ ангид сурагч алга" hint="Ангийн бүртгэлээс сурагч нэмэхэд энд гарна" />
      )}

      {shown && shown.students.length > 0 && (
        <>
          {(metric === "attendance" || metric === "homework") &&
            (shown.days.length === 0 ? (
              <EmptyState
                icon={ClipboardList}
                title="Энэ сард хичээлийн өдөр алга"
                hint="Хуваарьт хичээл оруулах эсвэл ирц, даалгавар тэмдэглэхэд энд өдрөөр гарна"
              />
            ) : (
              <MarkGrid key={`${metric}-${shown.month}`} kind={metric} data={shown} onFocus={setFocusId} />
            ))}
          {metric === "exams" &&
            (shown.exams.length === 0 ? (
              <EmptyState icon={ClipboardList} title="Энэ сард шалгалт оноогоогүй" hint="Өмнөх сар руу шилжиж эсвэл «Шалгалт» хэсгээс ангид шалгалт оноогоорой" />
            ) : (
              <ExamGrid key={shown.month} data={shown} onFocus={setFocusId} />
            ))}
          {metric === "independent" && <IndependentGrid key={shown.month} data={shown} onFocus={setFocusId} />}
          <StudentFocus data={shown} studentId={focusId} onClose={() => setFocusId(null)} />
        </>
      )}
    </div>
  );
}
