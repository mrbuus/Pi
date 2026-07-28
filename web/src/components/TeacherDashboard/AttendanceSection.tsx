"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { addDaysToKey } from "@/components/schedule/types";
import AttendanceCalendar from "@/components/attendance/AttendanceCalendar";
import { FrequencyBadge } from "@/components/attendance/FrequencyBadge";
import { NoteAutocomplete } from "@/components/attendance/NoteAutocomplete";
import { StatusPills } from "@/components/attendance/StatusPills";

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
}: AttendanceSectionProps) {
  const [isSaving, setIsSaving] = useState(false);

  // ---- Сонгосон огноо (зөвхөн classroomId үед хуанли идэвхтэй) ----
  const [selectedDate, setSelectedDate] = useState(today);
  useEffect(() => {
    setSelectedDate(today);
  }, [today]);
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
  useEffect(() => {
    if (!classroomId || !dayRows) return;
    setLocalMarks(
      Object.fromEntries(dayRows.map((r) => [r.student.id, r.status ?? "PRESENT"])),
    );
    setLocalNotes(
      Object.fromEntries(dayRows.map((r) => [r.student.id, r.note ?? ""])),
    );
  }, [classroomId, dayRows]);

  const effMarks = classroomId ? localMarks : marks;
  const effNotes = classroomId ? localNotes : notes;
  const handleMarkChange = classroomId
    ? (studentId: string, status: string) =>
        setLocalMarks((m) => ({ ...m, [studentId]: status }))
    : onMarkChange;
  const handleNoteChange = classroomId
    ? (studentId: string, note: string) =>
        setLocalNotes((n) => ({ ...n, [studentId]: note }))
    : onNoteChange;

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
          {isToday ? "Өнөөдрийн ирц" : "Ирц"} ·{" "}
          <span className="text-sm text-ink-dim">{selectedDate}</span>
        </h2>
        <button
          onClick={handleSave}
          disabled={isSaving || dayLoading}
          className="rounded-lg bg-brand-bright px-4 py-2 text-sm font-bold text-on-brand transition disabled:opacity-50"
        >
          {isSaving ? "Хадгалаж байна..." : "Хадгалах"}
        </button>
      </div>

      {/* Хуанли — өмнөх өдрүүдийг харах/засах (зөвхөн classroomId үед) */}
      {classroomId && (
        <div className="mb-4">
          <AttendanceCalendar
            value={selectedDate}
            today={today}
            onChange={setSelectedDate}
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
            return (
              <div
                key={r.student.id}
                className="flex flex-col gap-3 rounded-lg border border-line px-3 py-3 md:flex-row md:items-start md:gap-3 md:px-4 md:py-2.5"
              >
                {/* Student Name + meta */}
                <div className="md:w-44 md:shrink-0">
                  <span className="text-sm font-medium">
                    {r.student.firstName} {r.student.lastName}
                  </span>
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
                    <p className="mt-1 text-xs text-ink-dim">
                      👤 Тэмдэглэсэн: {r.markedBy.firstName} {r.markedBy.lastName}
                    </p>
                  )}
                </div>

                {/* Attendance Buttons */}
                <StatusPills
                  studentLabel={`${r.student.firstName} ${r.student.lastName}`}
                  value={effMarks[r.student.id]}
                  onChange={(status) => handleMarkChange(r.student.id, status)}
                />

                {/* Note — стек mobile дээр, inline desktop дээр */}
                <div className="md:flex-1">
                  <NoteAutocomplete
                    id={`attendance-note-${r.student.id}`}
                    label={`${r.student.firstName} ${r.student.lastName} — тайлбар`}
                    value={effNotes[r.student.id] ?? ""}
                    onChange={(v) => handleNoteChange(r.student.id, v)}
                  />
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
