"use client";

import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import HomeworkCommentField from "@/components/homework/HomeworkCommentField";
import HomeworkMarkPills, {
  type HomeworkMark,
} from "@/components/homework/HomeworkMarkPills";
import {
  addDaysToDateKey,
  mnDayOrdinalLabel,
  ubToday,
} from "@/components/homework/homeworkDate";
import { api } from "@/lib/api";

interface HomeworkMarkRow {
  student: { id: string; firstName: string; lastName: string };
  status: HomeworkMark | null;
  comment: string | null;
  updatedAt: string | null;
}

interface AssignmentsSectionProps {
  /** Эцэг компонентын дээд талд (sub-tab-уудын гадна) байрлах анги сонгогч
   * аль хэдийн энэ классын ID-г тодорхойлдог тул энд дахин сонгогч
   * барихгүй, зөвхөн дамжуулагдсан ангиар ажиллана. */
  classroomId: string;
  /** 🆕 Өгөгдвөл: огноог ЭНЭ prop-оор удирдана (жишээ нь Нүүр таб дээрх
   * НЭГ ерөнхий огнооны хяналт). Өгөөгүй бол компонент өөрөө дотоод
   * төлөвтэйгээр огноог удирдана (Даалгавар sub-tab-ын хуучин зан үйл). */
  selectedDate?: string;
  /** 🆕 true бол дотоод огнооны толгойг (гарчиг + өмнөх/дараагийн товч)
   * харуулахгүй — эцэг компонент өөрийн ГАНЦ ерөнхий огнооны хяналттай
   * үед давхардал үүсгэхгүйн тулд. */
  hideDateHeader?: boolean;
}

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : "Алдаа гарлаа";
}

/**
 * Даалгаврын хурдан өдөр тутмын тэмдэглэгээний тор (owner-ийн #1 хүсэлт).
 *
 * UX:
 *  1. Анги сонгох — эцэг компонентын дээд талд (энэ хэсгийн гадна) байрлана.
 *  2. Өнөөдрийн огноо монгол хэлбэрээр автоматаар харагдана, өмнөх/дараагийн
 *     өдөр рүү шилжих боломжтой.
 *  3. Ангийн бүх сурагч нэрээр эрэмбэлэгдэж босоогоор жагсаана.
 *  4. Нэрний баруун талд НЭГ товшилтоор өнгө тэмдэглэнэ: хийсэн (ногоон),
 *     дутуу (шар), хийгээгүй (улаан), тэмдэглээгүй бол цагаан/хоосон.
 *  5. Сурагч тус бүрт цэнхэр чөлөөт тайлбарын талбар (debounce-той хадгална).
 *
 * Гүйцэтгэл: товшилт бүр ОПТИМИСТ шинэчлэгддэг (сервер хариу хүлээхгүйгээр
 * шууд UI дээр харагдана), алдаа гарвал өмнөх утга руугаа буцаана.
 */
export default function AssignmentsSection({
  classroomId,
  selectedDate: controlledDate,
  hideDateHeader = false,
}: AssignmentsSectionProps) {
  const [internalDate, setInternalDate] = useState(ubToday);
  const selectedDate = controlledDate ?? internalDate;
  const [rows, setRows] = useState<HomeworkMarkRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Сурагч тус бүрийн хамгийн сүүлийн амжилттай хадгалсан утга — алдаа
  // гарвал үүн рүү буцаана (optimistic rollback). ref ашигласан нь async
  // callback дотор "stale closure" (хуучирсан утга) авахаас сэргийлнэ.
  const lastSavedRef = useRef<Record<string, HomeworkMarkRow>>({});

  // Анги солигдоход өнөөдөр рүү буцна (AttendanceSection-той адил хэв маяг).
  // Огноог эцэг компонент удирдаж байвал (controlledDate) энд оролцохгүй.
  useEffect(() => {
    if (controlledDate === undefined) setInternalDate(ubToday());
  }, [classroomId, controlledDate]);

  const loadDay = useCallback(() => {
    if (!classroomId) return;
    setLoading(true);
    setError(null);
    api<HomeworkMarkRow[]>(
      `/classrooms/${classroomId}/homework-marks?date=${selectedDate}`,
    )
      .then((data) => {
        setRows(data);
        lastSavedRef.current = Object.fromEntries(
          data.map((r) => [r.student.id, r]),
        );
      })
      .catch((e) => setError(errMsg(e)))
      .finally(() => setLoading(false));
  }, [classroomId, selectedDate]);
  useEffect(() => {
    loadDay();
  }, [loadDay]);

  async function saveMark(
    studentId: string,
    patch: { status?: HomeworkMark | null; comment?: string | null },
  ) {
    // 1) Оптимист: шууд UI-г шинэчилнэ
    setRows((prev) =>
      prev.map((r) => (r.student.id === studentId ? { ...r, ...patch } : r)),
    );
    setError(null);
    try {
      const res = await api<{
        status: HomeworkMark | null;
        comment: string | null;
        updatedAt: string;
      }>(`/classrooms/${classroomId}/homework-marks/${studentId}`, {
        method: "PATCH",
        body: { date: selectedDate, ...patch },
      });
      setRows((prev) =>
        prev.map((r) =>
          r.student.id === studentId
            ? { ...r, status: res.status, comment: res.comment, updatedAt: res.updatedAt }
            : r,
        ),
      );
      lastSavedRef.current = {
        ...lastSavedRef.current,
        [studentId]: {
          ...(lastSavedRef.current[studentId] ?? {
            student: { id: studentId, firstName: "", lastName: "" },
          }),
          status: res.status,
          comment: res.comment,
          updatedAt: res.updatedAt,
        },
      };
    } catch (e) {
      // 2) Алдаа гарвал сүүлд амжилттай хадгалсан утга руу буцаана
      const fallback = lastSavedRef.current[studentId];
      setRows((prev) =>
        prev.map((r) => (r.student.id === studentId ? (fallback ?? r) : r)),
      );
      setError(errMsg(e));
    }
  }

  const isToday = selectedDate === ubToday();

  return (
    <section className="rounded-2xl border border-line bg-panel p-4 md:p-6">
      {/* Огноо шилжүүлэх толгой — эцэг компонент өөрийн ГАНЦ ерөнхий
          огнооны хяналттай үед (hideDateHeader) энд харагдахгүй. */}
      {!hideDateHeader && (
        <div className="mb-4 flex flex-col items-start justify-between gap-3 md:flex-row md:items-center">
          <div>
            <h2 className="font-bold text-brand-soft">Гэрийн даалгавар</h2>
            <p className="text-sm text-ink-dim">{mnDayOrdinalLabel(selectedDate)}</p>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setInternalDate((d) => addDaysToDateKey(d, -1))}
              aria-label="Өмнөх өдөр"
              className="flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-line text-lg transition hover:bg-ink/5"
            >
              ‹
            </button>
            {!isToday && (
              <button
                type="button"
                onClick={() => setInternalDate(ubToday())}
                className="min-h-11 rounded-lg border border-line px-3 text-sm font-semibold text-brand-soft transition hover:bg-ink/5"
              >
                Өнөөдөр
              </button>
            )}
            <button
              type="button"
              onClick={() => setInternalDate((d) => addDaysToDateKey(d, 1))}
              aria-label="Дараагийн өдөр"
              className="flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-line text-lg transition hover:bg-ink/5"
            >
              ›
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-error/30 bg-error/10 px-3 py-2 text-sm text-error">
          <span>⚠ {error}</span>
          <button
            onClick={loadDay}
            className="rounded-lg border border-error/40 px-2 py-1 text-xs font-semibold transition hover:bg-error/10"
          >
            Дахин ачаалах
          </button>
        </div>
      )}

      {!classroomId ? (
        <p className="text-sm text-ink-dim">Эхлээд анги сонгоно уу</p>
      ) : loading ? (
        <p className="animate-pulse text-sm text-ink-dim" role="status">
          Ачаалж байна…
        </p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-ink-dim">Энэ ангид сурагч алга байна</p>
      ) : (
        <div className="space-y-2">
          {rows.map((r) => {
            const label = `${r.student.firstName} ${r.student.lastName}`;
            return (
              <div
                key={r.student.id}
                className="flex flex-col gap-3 rounded-lg border border-line px-3 py-3 md:flex-row md:items-center md:gap-3 md:px-4 md:py-2.5"
              >
                <div className="flex items-center gap-1 md:w-44 md:shrink-0">
                  <span className="text-sm font-medium">{label}</span>
                  <Link
                    href={`/app/students/${r.student.id}`}
                    onClick={(e) => e.stopPropagation()}
                    aria-label={`${label} — дэлгэрэнгүй явц харах`}
                    className="text-ink-dim transition hover:text-brand-soft"
                  >
                    <ChevronRight className="h-4 w-4" aria-hidden />
                  </Link>
                </div>

                <HomeworkMarkPills
                  studentLabel={label}
                  value={r.status}
                  onChange={(status) => saveMark(r.student.id, { status })}
                />

                <div className="md:flex-1">
                  <HomeworkCommentField
                    id={`homework-comment-${r.student.id}`}
                    label={`${label} — тайлбар`}
                    value={r.comment ?? ""}
                    onSave={(comment) =>
                      saveMark(r.student.id, { comment: comment.trim() || null })
                    }
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
