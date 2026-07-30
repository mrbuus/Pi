"use client";

import { ChevronRight, User } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { addDaysToKey } from "@/components/schedule/types";
import AttendanceCalendar from "@/components/attendance/AttendanceCalendar";
import { FrequencyBadge } from "@/components/attendance/FrequencyBadge";
import { NoteAutocomplete } from "@/components/attendance/NoteAutocomplete";
import { StatusPills } from "@/components/attendance/StatusPills";
import {
  LateRangePicker,
  type LateRangeValue,
} from "@/components/attendance/LateRangePicker";

interface StudentAttendance {
  id: string;
  firstName: string;
  lastName: string;
  color?: string;
}

interface MarkerLite {
  id: string;
  firstName: string;
  lastName: string;
}

interface RosterRow {
  student: StudentAttendance;
  status: string | null;
  // Доорх талбарууд зөвхөн `classroomId` дамжуулагдсан үед — өөрөөр хэлбэл
  // энэ компонент өдрийн бичлэгийг API-аас ШИНЭЭР татсан үед — ирнэ.
  // `classroomId` дамжуулаагүй legacy горимд undefined хэвээр байна.
  note?: string | null;
  markedBy?: MarkerLite | null;
  unmarkedLastTwoClassDays?: boolean;
  /** Зөвхөн status="LATE" үед утгатай. */
  lateRange?: LateRangeValue | null;
}

interface HistoryRow {
  student: { id: string; firstName: string; lastName: string };
  late: number;
  absent: number;
}

interface AttendanceSectionProps {
  /** Parent-ийн эхлээд ачаалсан ӨНӨӨДРИЙН жагсаалт (fallback/эхний render) */
  roster: RosterRow[];
  marks: Record<string, string>;
  onMarkChange: (studentId: string, status: string) => void;
  // ⚠️ Зөвхөн `classroomId` дамжуулаагүй legacy горимд ашиглагдана — тэр үед
  // тайлбар API руу хадгалагдахгүй, зөвхөн локал төлөвт байна.
  notes: Record<string, string>;
  onNoteChange: (studentId: string, note: string) => void;
  onSave: () => void | Promise<void>;
  today: string;
  /**
   * 🆕 Өгөгдвөл: хуанлиар өмнөх өдрүүдийг сонгох, тайлбарыг бодитоор
   * хадгалах (API дэмждэг болсон), хэн тэмдэглэснийг харуулах, давтамжийн
   * анхааруулга зэрэг бүгд идэвхжинэ — компонент өөрөө API дуудна.
   * Өгөөгүй бол зөвхөн өнөөдрийн энгийн (parent удирдсан) горим ажиллана.
   *
   * Wiring todo (parent, энэ файлын хамрах хүрээнээс гадуур):
   *   <AttendanceSection classroomId={selected} ... />
   */
  classroomId?: string;
  /** 🆕 Өгөгдвөл: огноог ЭНЭ prop-оор удирдана (жишээ нь Нүүр таб дээрх
   * НЭГ ерөнхий огнооны хяналт). Өгөөгүй бол `today`-гоос эхэлж дотоод
   * төлөвтэйгээр удирдана (Ирц sub-tab-ын хуучин зан үйл, хуанлиар өөрчилнө). */
  selectedDate?: string;
  /** 🆕 true бол дотоод хуанли болон "· огноо" бичвэрийг нуух — эцэг
   * компонент өөрийн ГАНЦ ерөнхий огнооны хяналттай үед давхардал
   * үүсгэхгүйн тулд. */
  hideDateHeader?: boolean;
}

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : "Алдаа гарлаа";
}

/**
 * Ирцийг заавал нэмнэ. Оюутан бүрийн ирцийн статус (Ирсэн/Хоцорсон/
 * Тасалсан/Чөлөөтэй), тайлбар зэргийг өөрчлөх, хадгалах үйлдлүүдийг хийнэ.
 *
 * `classroomId` дамжуулбал компонент "ухаалаг" горимд орж: хуанлиар өмнөх
 * өдрүүдийг сонгож болно, тайлбар бодитоор API руу хадгалагдана (note
 * багана нэмэгдсэн), хэн тэмдэглэснийг харуулна, сүүлийн 30 хоногийн
 * хоцролт/тасалдалын давтамж болон "сүүлийн 2 хичээлээр тэмдэглээгүй"
 * анхааруулгыг харуулна.
 */
export default function AttendanceSection({
  roster,
  marks,
  onMarkChange,
  notes,
  onNoteChange,
  onSave,
  today,
  classroomId,
  selectedDate: controlledDate,
  hideDateHeader = false,
}: AttendanceSectionProps) {
  const [isSaving, setIsSaving] = useState(false);

  // ---- Сонгосон огноо (зөвхөн classroomId үед хуанли идэвхтэй) ----
  const [internalDate, setInternalDate] = useState(today);
  useEffect(() => {
    if (controlledDate === undefined) setInternalDate(today);
  }, [today, controlledDate]);
  const selectedDate = controlledDate ?? internalDate;
  const isToday = selectedDate === today;

  // ---- Сонгосон өдрийн жагсаалт: classroomId байвал API-аас өөрөө татна ----
  const [dayRows, setDayRows] = useState<RosterRow[] | null>(null);
  const [dayLoading, setDayLoading] = useState(false);
  const [dayError, setDayError] = useState<string | null>(null);

  const loadDay = useCallback(() => {
    if (!classroomId) return;
    setDayLoading(true);
    setDayError(null);
    api<RosterRow[]>(
      `/classrooms/${classroomId}/attendance?date=${selectedDate}`,
    )
      .then(setDayRows)
      .catch((e) => setDayError(errMsg(e)))
      .finally(() => setDayLoading(false));
  }, [classroomId, selectedDate]);
  useEffect(() => {
    loadDay();
  }, [loadDay]);

  // ---- Давтамжийн түүх (сүүлийн 30 хоног) — зөвхөн classroomId үед ----
  const [history, setHistory] = useState<
    Record<string, { late: number; absent: number }>
  >({});
  useEffect(() => {
    if (!classroomId) return;
    const from = addDaysToKey(today, -29);
    api<HistoryRow[]>(
      `/classrooms/${classroomId}/attendance/history?from=${from}&to=${today}`,
    )
      .then((rows) =>
        setHistory(
          Object.fromEntries(
            rows.map((r) => [r.student.id, { late: r.late, absent: r.absent }]),
          ),
        ),
      )
      .catch(() => {
        // Түүх зөвхөн badge-д ашиглагддаг — алдаа гарвал гол ирцийн
        // урсгалыг блоклохгүйгээр чимээгүй орхино.
      });
  }, [classroomId, today]);

  // Харагдаж буй мөрүүд: classroomId байвал сонгосон өдрийн API өгөгдөл,
  // эс бөгөөс parent-ийн өгсөн (зөвхөн өнөөдрийн) roster.
  const activeRows: RosterRow[] = classroomId ? (dayRows ?? []) : roster;

  // ---- Тэмдэглэгээ/тайлбар: classroomId үед энэ компонент өөрөө удирдана
  // (API note дэмждэг болсон тул бодитоор хадгална); үгүй бол хуучин ёсоор
  // parent-ийн marks/notes/callback-уудыг ашиглана. ----
  const [localMarks, setLocalMarks] = useState<Record<string, string>>({});
  const [localNotes, setLocalNotes] = useState<Record<string, string>>({});
  // Хоцролтын хугацаа — зөвхөн status="LATE" үед утгатай. classroomId
  // байгаа эсэхээс үл хамааран локол state-д хадгална (API руу зөвхөн
  // classroomId горимд хадгалагдана — доорх handleSave-ийг үз); legacy
  // (classroomId-гүй) горимд `note`-той адил зөвхөн локал үлдэнэ.
  const [lateRanges, setLateRanges] = useState<Record<string, LateRangeValue | "">>(
    {},
  );
  useEffect(() => {
    if (!classroomId || !dayRows) return;
    setLocalMarks(
      Object.fromEntries(dayRows.map((r) => [r.student.id, r.status ?? "PRESENT"])),
    );
    setLocalNotes(
      Object.fromEntries(dayRows.map((r) => [r.student.id, r.note ?? ""])),
    );
    setLateRanges(
      Object.fromEntries(dayRows.map((r) => [r.student.id, r.lateRange ?? ""])),
    );
  }, [classroomId, dayRows]);

  const effMarks = classroomId ? localMarks : marks;
  const effNotes = classroomId ? localNotes : notes;
  const handleMarkChange = (studentId: string, status: string) => {
    if (classroomId) {
      setLocalMarks((m) => ({ ...m, [studentId]: status }));
    } else {
      onMarkChange(studentId, status);
    }
    // Статус LATE-ээс өөр болвол сонгосон хугацааны интервалыг цэвэрлэнэ —
    // өмнөх сонголт "хагас нуугдсан" хэвээр үлдэхгүйн тулд.
    if (status !== "LATE") {
      setLateRanges((m) => (m[studentId] ? { ...m, [studentId]: "" } : m));
    }
  };
  const handleNoteChange = classroomId
    ? (studentId: string, note: string) =>
        setLocalNotes((n) => ({ ...n, [studentId]: note }))
    : onNoteChange;
  const handleLateRangeChange = (studentId: string, value: LateRangeValue) =>
    setLateRanges((m) => ({ ...m, [studentId]: value }));

  const handleSave = async () => {
    setIsSaving(true);
    try {
      if (classroomId) {
        await api(`/classrooms/${classroomId}/attendance`, {
          method: "POST",
          body: {
            date: selectedDate,
            entries: activeRows.map((r) => ({
              studentId: r.student.id,
              status: effMarks[r.student.id] ?? "PRESENT",
              note: effNotes[r.student.id]?.trim() || undefined,
              lateRange:
                effMarks[r.student.id] === "LATE"
                  ? lateRanges[r.student.id] || undefined
                  : undefined,
            })),
          },
        });
        loadDay();
        // Parent-ийн дашбоард (дүгнэлт/анхаарах жагсаалт г.м) sync хийхийг
        // оролдоно — алдаа гарсан ч дээрх хадгалалт амжилттай хэвээр.
        try {
          await onSave();
        } catch {
          /* parent sync нь дайвар үйлдэл — үндсэн хадгалалтад нөлөөлөхгүй */
        }
      } else {
        await onSave();
      }
    } catch (e) {
      setDayError(errMsg(e));
    } finally {
      setIsSaving(false);
    }
  };

  const listLoading = classroomId ? dayLoading && dayRows === null : false;

  return (
    <section className="rounded-2xl border border-line bg-panel p-4 md:p-6">
      {/* Header */}
      <div className="mb-4 flex flex-col items-start justify-between gap-3 md:flex-row md:items-center">
        <h2 className="font-bold text-brand-soft">
          {isToday ? "Өнөөдрийн ирц" : "Ирц"}
          {!hideDateHeader && (
            <>
              {" "}
              ·{" "}
              <span className="text-sm text-ink-dim">{selectedDate}</span>
            </>
          )}
        </h2>
        <button
          onClick={handleSave}
          disabled={isSaving || dayLoading}
          className="rounded-lg bg-brand-bright px-4 py-2 text-sm font-bold text-on-brand transition disabled:opacity-50"
        >
          {isSaving ? "Хадгалаж байна..." : "Хадгалах"}
        </button>
      </div>

      {/* Хуанли — өмнөх өдрүүдийг харах/засах (зөвхөн classroomId үед, мөн
          эцэг компонент өөрийн ГАНЦ ерөнхий огнооны хяналттай үед нуугдана) */}
      {classroomId && !hideDateHeader && (
        <div className="mb-4">
          <AttendanceCalendar
            value={selectedDate}
            today={today}
            onChange={setInternalDate}
          />
        </div>
      )}

      {dayError && (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-error/30 bg-error/10 px-3 py-2 text-sm text-error">
          <span>⚠ {dayError}</span>
          <button
            onClick={loadDay}
            className="rounded-lg border border-error/40 px-2 py-1 text-xs font-semibold transition hover:bg-error/10"
          >
            Дахин ачаалах
          </button>
        </div>
      )}

      {/* Attendance List */}
      <div className="space-y-2">
        {listLoading ? (
          <p className="animate-pulse text-sm text-ink-dim" role="status">
            Ачаалж байна…
          </p>
        ) : activeRows.length === 0 ? (
          <p className="text-sm text-ink-dim">Сурагч байхгүй</p>
        ) : (
          activeRows.map((r) => {
            const h = history[r.student.id];
            const status = effMarks[r.student.id];
            const isPresent = status === "PRESENT";
            const isLate = status === "LATE";
            const studentLabel = `${r.student.firstName} ${r.student.lastName}`;
            return (
              <div
                key={r.student.id}
                className="flex flex-col gap-3 rounded-lg border border-line px-3 py-3 md:flex-row md:items-start md:gap-3 md:px-4 md:py-2.5"
              >
                {/* Student Name + meta */}
                <div className="md:w-44 md:shrink-0">
                  <div className="flex items-center gap-1">
                    <span className="text-sm font-medium">{studentLabel}</span>
                    <Link
                      href={`/app/students/${r.student.id}`}
                      onClick={(e) => e.stopPropagation()}
                      aria-label={`${studentLabel} — дэлгэрэнгүй явц харах`}
                      className="text-ink-dim transition hover:text-brand-soft"
                    >
                      <ChevronRight className="h-4 w-4" aria-hidden />
                    </Link>
                  </div>
                  {classroomId && (
                    <div className="mt-1">
                      <FrequencyBadge
                        lateCount={h?.late ?? 0}
                        absentCount={h?.absent ?? 0}
                        unmarkedLastTwoClassDays={r.unmarkedLastTwoClassDays}
                      />
                    </div>
                  )}
                  {r.markedBy && (
                    <p className="mt-1 inline-flex items-center gap-1 text-xs text-ink-dim">
                      <User className="h-3 w-3" aria-hidden />
                      Тэмдэглэсэн: {r.markedBy.firstName} {r.markedBy.lastName}
                    </p>
                  )}
                </div>

                {/* Attendance Buttons */}
                <div className="flex flex-col gap-2">
                  <StatusPills
                    studentLabel={studentLabel}
                    value={status}
                    onChange={(next) => handleMarkChange(r.student.id, next)}
                  />
                  {/* Хоцролтын хугацаа — зөвхөн "Хоцорсон" сонгогдоход, нэг
                      товшилтоор хурдан сонгоно (owner: ангийн өмнө зогсоод
                      хэрэглэнэ). */}
                  {isLate && (
                    <LateRangePicker
                      studentLabel={studentLabel}
                      value={lateRanges[r.student.id] || null}
                      onChange={(v) => handleLateRangeChange(r.student.id, v)}
                    />
                  )}
                </div>

                {/* Тайлбар — "Ирсэн" төлөвт огт харагдахгүй (owner: ирснийг
                    нэг товшилтоор, тайлбаргүйгээр тэмдэглэх ёстой). */}
                {!isPresent && (
                  <div className="md:flex-1">
                    <NoteAutocomplete
                      id={`attendance-note-${r.student.id}`}
                      label={`${studentLabel} — тайлбар`}
                      value={effNotes[r.student.id] ?? ""}
                      onChange={(v) => handleNoteChange(r.student.id, v)}
                    />
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
