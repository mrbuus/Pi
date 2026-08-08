"use client";

import { useEffect, useId, useMemo, useState } from "react";
import {
  AlertTriangle,
  BookOpen,
  CalendarClock,
  DoorOpen,
  Ban,
  CalendarRange,
  Settings2,
  Trash2,
  X,
} from "lucide-react";
import { api } from "@/lib/api";
import { getClassroomColor } from "@/lib/classroomColor";
import { Meta, Dot } from "@/components/ui/Meta";
import RoomShape from "./RoomShape";
import {
  formatMinutes,
  ROOMS,
  roomShapeOf,
  SUBJECT_LABEL,
  timeToMinutes,
  WEEKDAY_LABELS,
  WORKWEEK_ORDER,
  type BookLite,
  type ChapterLite,
  type TeacherLite,
  type WeekEntry,
} from "./types";

/**
 * Танхимын сонголт — чөлөөт текст биш тогтмол жагсаалт (types.ts дахь ROOMS).
 * Хуучин бичлэгт жагсаалтад байхгүй танхим байвал утга нь чимээгүй алдагдахгүйн
 * тулд түүнийг нэмэлт сонголт болгож эхэнд оруулна.
 */
function RoomSelect({
  id,
  value,
  onChange,
  className,
}: {
  id: string;
  value: string;
  onChange: (next: string) => void;
  className: string;
}) {
  const known = ROOMS.some((r) => r.value === value);
  const branches = [...new Set(ROOMS.map((r) => r.branch))];
  return (
    <select id={id} value={value} onChange={(e) => onChange(e.target.value)} className={className}>
      <option value="">— танхим сонгох —</option>
      {value && !known && <option value={value}>{value} (жагсаалтад алга)</option>}
      {branches.map((branch) => (
        <optgroup key={branch} label={branch}>
          {ROOMS.filter((r) => r.branch === branch).map((r) => (
            <option key={r.value} value={r.value}>
              {r.value}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : "Алдаа гарлаа";
}

/**
 * Тухайн цагт ЗЭРЭГ хичээллэх бусад ангиуд аль танхимд байгааг нэг мөрөөр
 * харуулна — танхим сонгохдоо давхцал гаргахаас сэргийлэх гол мэдээлэл.
 */
function SameTimeHint({ entries }: { entries: WeekEntry[] }) {
  if (!entries.length) return null;
  return (
    <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-ink-dim">
      Энэ цагт:
      {entries.map((e) => (
        <span key={e.scheduleId} className="inline-flex items-center gap-1">
          {/* Ангийн өнгө = жижиг цэг, дүрс = танхим (будалтгүй). Ангийн нэр
              хажууд нь бичигдсэн тул өнгө дангаараа мэдээлэл дамжуулахгүй. */}
          <span
            className="inline-block h-2 w-2 shrink-0 rounded-full"
            style={{ backgroundColor: getClassroomColor(e.classroomId) }}
            aria-hidden
          />
          <Meta items={[
            e.room && <>
              <RoomShape room={e.room} size={11} />
              {e.room}
            </>,
            e.classroomName.replace(/\s*\([^)]*\)$/, "")
          ]} />
        </span>
      ))}
    </p>
  );
}

const inputCls =
  "w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm outline-none focus:border-brand";
const primaryBtn =
  "rounded-lg bg-brand-bright px-3 py-1.5 text-sm font-bold text-on-brand transition hover:opacity-90 disabled:opacity-50";
const outlineBtn =
  "rounded-lg border border-line px-3 py-1.5 text-sm font-semibold text-ink transition hover:border-brand disabled:opacity-50";

/**
 * НЭГ тохиолдол (occurrence) дээр товшиход нээгдэх удирдлагын самбар.
 *
 * SPEC-ийн хамгийн чухал UX дэлгэрэнгүй нь энд: "энэ тохиолдол"-д хамаарах
 * үйлдлүүд (сэдэв, цуцлах, зөөх) болон "бүх давтамжид" хамаарах устгах
 * үйлдлийг ЯЛГААТАЙ, тод тусгаарласан хэсэгт байрлуулна (Google Calendar-ийн
 * "this event" vs "the whole series" конвенц).
 */
export default function EntryActionPanel({
  open,
  entry,
  date,
  dayEntries,
  onClose,
  onChanged,
}: {
  open: boolean;
  entry: WeekEntry | null;
  /** Энэ тохиолдол харагдаж буй долоо хоногийн торон дахь огноо */
  date: string;
  /** Тухайн өдрийн бүх бичлэгүүд — танхимын давхцлыг харахад */
  dayEntries: WeekEntry[];
  onClose: () => void;
  onChanged: () => void;
}) {
  const titleId = useId();

  // Exception upsert/topic upsert бүгд АНХНЫ (натурал) тохиолдлын огноог
  // түлхүүр болгодог тул зөвхөн зөвлөгдсөн энд тооцоолно.
  const originalDate = entry?.exception ? entry.exception.originalDate : date;

  const [showSettings, setShowSettings] = useState(false);

  const [topicTitle, setTopicTitle] = useState("");
  const [topicOpen, setTopicOpen] = useState(false);
  const [topicSaving, setTopicSaving] = useState(false);
  const [topicError, setTopicError] = useState<string | null>(null);

  const [showChapterPicker, setShowChapterPicker] = useState(false);
  const [subject, setSubject] = useState<string>("");
  const [books, setBooks] = useState<BookLite[]>([]);
  const [bookId, setBookId] = useState("");
  const [chapters, setChapters] = useState<ChapterLite[]>([]);
  const [chapterId, setChapterId] = useState("");

  const [cancelArmed, setCancelArmed] = useState(false);
  const [cancelSaving, setCancelSaving] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const [moveOpen, setMoveOpen] = useState(false);
  const [moveDate, setMoveDate] = useState("");
  const [moveStart, setMoveStart] = useState("");
  const [moveEnd, setMoveEnd] = useState("");
  const [moveRoom, setMoveRoom] = useState("");
  const [moveNote, setMoveNote] = useState("");
  const [moveSaving, setMoveSaving] = useState(false);
  const [moveError, setMoveError] = useState<string | null>(null);

  // "Энэ ба цаашдын бүх" — цувралыг энэ огнооноос салгаж өөрчилнө
  const [splitOpen, setSplitOpen] = useState(false);
  const [splitWeekday, setSplitWeekday] = useState<number>(1);
  const [splitStart, setSplitStart] = useState("");
  const [splitEnd, setSplitEnd] = useState("");
  const [splitRoom, setSplitRoom] = useState("");
  const [splitTeacherId, setSplitTeacherId] = useState("");
  const [splitSaving, setSplitSaving] = useState(false);
  const [splitError, setSplitError] = useState<string | null>(null);
  const [teachers, setTeachers] = useState<TeacherLite[]>([]);

  const [deleteArmStep, setDeleteArmStep] = useState(0);
  const [deleteSaving, setDeleteSaving] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Танхим солих — эзний хүсэлт (2026-08-09): «Зөөх»-өөс тусдаа, огноо/цаг
  // хөндөхгүйгээр зөвхөн танхимыг л сольдог хялбар урсгал.
  const [roomOpen, setRoomOpen] = useState(false);
  const [roomValue, setRoomValue] = useState("");
  const [roomScope, setRoomScope] = useState<"once" | "always">("once");
  const [roomSaving, setRoomSaving] = useState(false);
  const [roomError, setRoomError] = useState<string | null>(null);

  useEffect(() => {
    if (!entry) return;
    setShowSettings(false);
    setTopicTitle(entry.topic ?? "");
    setTopicOpen(false);
    setShowChapterPicker(false);
    setSubject(entry.subject ?? "");
    setBookId("");
    setChapterId("");
    setBooks([]);
    setChapters([]);
    setCancelArmed(false);
    setCancelError(null);
    setMoveOpen(false);
    setMoveDate(date);
    setMoveStart(formatMinutes(entry.startMinute));
    setMoveEnd(formatMinutes(entry.endMinute));
    setMoveRoom(entry.room ?? "");
    setMoveNote("");
    setMoveError(null);
    setDeleteArmStep(0);
    setDeleteError(null);
    setSplitOpen(false);
    setSplitError(null);
    // Салгах маягтын анхны утга = ОДООГИЙН тохиргоо. Багш ихэвчлэн ганц
    // талбарыг л (жишээ нь цагийг) солино — бусдыг нь дахин бөглөх шаардлагагүй.
    setSplitWeekday(new Date(`${date}T00:00:00.000Z`).getUTCDay());
    setSplitStart(formatMinutes(entry.startMinute));
    setSplitEnd(formatMinutes(entry.endMinute));
    setSplitRoom(entry.room ?? "");
    setSplitTeacherId(entry.teacherId ?? "");
    setRoomOpen(false);
    setRoomValue(entry.room ?? "");
    setRoomScope("once");
    setRoomError(null);
  }, [entry, date]);

  // Багшийн жагсаалтыг зөвхөн салгах маягт нээгдэх үед татна — самбар нээх
  // бүрд шаардлагагүй хүсэлт явуулахгүй.
  useEffect(() => {
    if (!splitOpen || teachers.length) return;
    api<TeacherLite[]>("/schedule/teachers")
      .then(setTeachers)
      .catch(() => setTeachers([]));
  }, [splitOpen, teachers.length]);

  useEffect(() => {
    if (!showChapterPicker) return;
    const qs = subject ? `?subject=${subject}` : "";
    api<BookLite[]>(`/books${qs}`)
      .then(setBooks)
      .catch(() => setBooks([]));
  }, [showChapterPicker, subject]);

  useEffect(() => {
    if (!bookId) {
      setChapters([]);
      return;
    }
    api<ChapterLite[]>(`/chapters?bookId=${bookId}`)
      .then(setChapters)
      .catch(() => setChapters([]));
  }, [bookId]);

  const weekdayLabel = useMemo(
    () => WEEKDAY_LABELS[new Date(`${date}T00:00:00.000Z`).getUTCDay()],
    [date],
  );

  // Энэ бичлэгтэй ЦАГ ДАВХЦАЖ буй тухайн өдрийн бусад ангиуд — танхим
  // сонгох маягтуудад "аль танхим эзэлттэй вэ" гэдгийг харуулна.
  const sameTime = useMemo<WeekEntry[]>(
    () =>
      entry
        ? dayEntries.filter(
            (e) =>
              e.scheduleId !== entry.scheduleId &&
              e.startMinute < entry.endMinute &&
              entry.startMinute < e.endMinute,
          )
        : [],
    [dayEntries, entry],
  );

  if (!open || !entry) return null;

  async function saveTopic() {
    if (!entry) return;
    const title = topicTitle.trim();
    if (!title) {
      setTopicError("Сэдвийн нэрийг бичнэ үү");
      return;
    }
    setTopicSaving(true);
    setTopicError(null);
    try {
      await api(`/schedule/${entry.scheduleId}/topic`, {
        method: "PATCH",
        body: { date: originalDate, title, chapterId: chapterId || undefined },
      });
      setTopicOpen(false);
      onChanged();
    } catch (e) {
      setTopicError(errMsg(e));
    } finally {
      setTopicSaving(false);
    }
  }

  async function clearTopic() {
    if (!entry) return;
    setTopicSaving(true);
    setTopicError(null);
    try {
      await api(`/schedule/${entry.scheduleId}/topic`, {
        method: "DELETE",
        body: { date: originalDate },
      });
      setTopicTitle("");
      setTopicOpen(false);
      onChanged();
    } catch (e) {
      setTopicError(errMsg(e));
    } finally {
      setTopicSaving(false);
    }
  }

  async function cancelOccurrence() {
    if (!entry) return;
    setCancelSaving(true);
    setCancelError(null);
    try {
      await api(`/schedule/${entry.scheduleId}/exceptions`, {
        method: "POST",
        body: { date: originalDate, kind: "CANCELLED" },
      });
      onChanged();
      onClose();
    } catch (e) {
      setCancelError(errMsg(e));
      setCancelSaving(false);
    }
  }

  async function moveOccurrence() {
    if (!entry) return;
    if (!moveDate && !moveStart && !moveEnd) {
      setMoveError("Шинэ огноо эсвэл шинэ цаг зааж өгнө үү");
      return;
    }
    const newStartMinute = timeToMinutes(moveStart);
    const newEndMinute = timeToMinutes(moveEnd);
    if (newStartMinute >= newEndMinute) {
      setMoveError("Дуусах цаг эхлэх цагаас хойш байх ёстой");
      return;
    }
    setMoveSaving(true);
    setMoveError(null);
    try {
      await api(`/schedule/${entry.scheduleId}/exceptions`, {
        method: "POST",
        body: {
          date: originalDate,
          kind: "MOVED",
          newDate: moveDate !== date ? moveDate : undefined,
          newStartMinute,
          newEndMinute,
          newRoom: moveRoom.trim() || undefined,
          note: moveNote.trim() || undefined,
        },
      });
      onChanged();
      onClose();
    } catch (e) {
      setMoveError(errMsg(e));
      setMoveSaving(false);
    }
  }

  /**
   * Танхим солино. Хоёр хамрах хүрээтэй:
   *   «Зөвхөн энэ өдөр» — MOVED exception, огноо/цаг ХЭВЭЭРЭЭ, зөвхөн
   *     newRoom өөрчлөгдөнө (серверийн валидаци цаг шаарддаг тул одоогийн
   *     цагийг нь дамжуулна).
   *   «Энэ өдрөөс хойш байнга» — split ашиглана: хуучин мөр өмнөх өдрөөр
   *     хаагдаж шинэ танхимтай мөр эхэлнэ. PATCH хийвэл ӨНГӨРСӨН түүх ч
   *     шинэ танхимаар харагдах байсан тул санаатайгаар split сонгосон.
   */
  async function changeRoom() {
    if (!entry) return;
    if (!roomValue.trim()) {
      setRoomError("Шинэ танхимаа сонгоно уу");
      return;
    }
    if (roomValue === entry.room) {
      setRoomError("Одоогийн танхимтай ижил байна — өөр танхим сонгоно уу");
      return;
    }
    setRoomSaving(true);
    setRoomError(null);
    try {
      if (roomScope === "once") {
        await api(`/schedule/${entry.scheduleId}/exceptions`, {
          method: "POST",
          body: {
            date: originalDate,
            kind: "MOVED",
            newStartMinute: entry.startMinute,
            newEndMinute: entry.endMinute,
            newRoom: roomValue,
            note: "Танхим сольсон",
          },
        });
      } else {
        await api(`/schedule/${entry.scheduleId}/split`, {
          method: "POST",
          body: {
            from: originalDate,
            weekday: new Date(`${originalDate}T00:00:00.000Z`).getUTCDay(),
            startMinute: entry.startMinute,
            endMinute: entry.endMinute,
            room: roomValue,
            teacherId: entry.teacherId ?? null,
          },
        });
      }
      onChanged();
      onClose();
    } catch (e) {
      setRoomError(errMsg(e));
      setRoomSaving(false);
    }
  }

  /**
   * Энэ огнооноос эхлэн цувралыг өөрчилнө. Сервер хуучин мөрийг өмнөх өдөр
   * дуусгаж, шинэ утгатай мөрийг эндээс эхлүүлнэ — өнгөрсөн түүх хэвээр үлдэнэ.
   */
  async function splitSeries() {
    if (!entry) return;
    const startMinute = timeToMinutes(splitStart);
    const endMinute = timeToMinutes(splitEnd);
    if (startMinute >= endMinute) {
      setSplitError("Дуусах цаг эхлэх цагаас хойш байх ёстой");
      return;
    }
    setSplitSaving(true);
    setSplitError(null);
    try {
      await api(`/schedule/${entry.scheduleId}/split`, {
        method: "POST",
        body: {
          from: originalDate,
          weekday: splitWeekday,
          startMinute,
          endMinute,
          // Хоосон мөрийг null болгож явуулна — сервер дээр "утга ирээгүй"
          // (хэвээр үлдээ) болон "цэвэрлэ" хоёрыг ялгах ёстой.
          room: splitRoom || null,
          teacherId: splitTeacherId || null,
        },
      });
      onChanged();
      onClose();
    } catch (e) {
      setSplitError(errMsg(e));
      setSplitSaving(false);
    }
  }

  async function deleteSeries() {
    if (!entry) return;
    setDeleteSaving(true);
    setDeleteError(null);
    try {
      await api(`/schedule/${entry.scheduleId}`, { method: "DELETE" });
      onChanged();
      onClose();
    } catch (e) {
      setDeleteError(errMsg(e));
      setDeleteSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/15 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="enter-pop elev-3 flex max-h-[80vh] w-full max-w-sm flex-col overflow-y-auto rounded-2xl border border-line bg-surface p-4"
      >
        {/* ---- Толгой: ангийн нэр, огноо, цаг, RoomShape, танхим, багш ---- */}
        <div className="mb-3 pb-3 border-b border-line">
          <h2 id={titleId} className="text-sm font-bold text-ink">
            {entry.classroomName.replace(/\s*\([^)]*\)$/, "")}
          </h2>
          <p className="mt-0.5 text-xs text-ink-dim">
            <Meta items={[
              `${weekdayLabel}, ${date}`,
              `${formatMinutes(entry.startMinute)}–${formatMinutes(entry.endMinute)}`
            ]} />
          </p>
          {entry.room && (
            <p className="mt-1 flex items-center gap-1.5 text-xs text-ink-dim">
              <RoomShape room={entry.room} size={14} className="text-ink" />
              {entry.room} тоот
            </p>
          )}
          {entry.exception?.kind === "MOVED" && (
            <p className="mt-1 text-xs text-warning">
              Зөөгдсөн ({entry.exception.originalDate})
              {entry.exception.note ? ` — ${entry.exception.note}` : ""}
            </p>
          )}
          <p className="mt-1 text-xs text-ink-dim">
            <Meta items={[
              entry.teacherName ?? "Багш товлогдоогүй",
              entry.subject && (SUBJECT_LABEL[entry.subject] ?? entry.subject)
            ]} />
          </p>
        </div>

        {/* ---- Гурван үйлдлийн товч (Сэдэв, Зөөх, Цуцлах) + Settings icon ---- */}
        <div className="mb-3 flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setTopicOpen((v) => !v)}
            className="rounded-lg border border-line px-2.5 py-1.5 text-xs font-semibold text-ink transition hover:border-brand"
          >
            <BookOpen className="mr-1 inline h-3 w-3" aria-hidden />
            Сэдэв
          </button>
          <button
            type="button"
            onClick={() => setMoveOpen((v) => !v)}
            className="rounded-lg border border-line px-2.5 py-1.5 text-xs font-semibold text-ink transition hover:border-brand"
          >
            <CalendarClock className="mr-1 inline h-3 w-3" aria-hidden />
            Зөөх
          </button>
          <button
            type="button"
            onClick={() => setRoomOpen((v) => !v)}
            className="rounded-lg border border-line px-2.5 py-1.5 text-xs font-semibold text-ink transition hover:border-brand"
          >
            <DoorOpen className="mr-1 inline h-3 w-3" aria-hidden />
            Танхим солих
          </button>
          <button
            type="button"
            onClick={() => setCancelArmed((v) => !v)}
            className="rounded-lg border border-warning/40 px-2.5 py-1.5 text-xs font-semibold text-warning transition hover:bg-warning/10"
          >
            <Ban className="mr-1 inline h-3 w-3" aria-hidden />
            Цуцлах
          </button>
          <button
            type="button"
            onClick={() => setShowSettings((v) => !v)}
            aria-label="Тохиргоо"
            className="ml-auto rounded-lg border border-line p-1.5 text-ink-dim transition hover:border-brand hover:text-ink"
          >
            <Settings2 className="h-4 w-4" aria-hidden />
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Хаах"
            className="rounded-lg border border-line p-1.5 text-ink-dim transition hover:border-brand hover:text-ink"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </div>

        {/* ---- Сэдэв маягт (товч дарахад задарна) ---- */}
        {topicOpen && (
          <div className="mb-3 space-y-2 rounded-lg border border-line bg-panel p-3">
            <label htmlFor="panel-topic-title" className="sr-only">
              Сэдвийн нэр
            </label>
            <input
              id="panel-topic-title"
              value={topicTitle}
              onChange={(e) => setTopicTitle(e.target.value)}
              placeholder="Жишээ: Квадрат тэгшитгэл"
              className={inputCls}
              autoFocus
            />
            {!showChapterPicker ? (
              <button
                type="button"
                onClick={() => setShowChapterPicker(true)}
                className="text-xs font-semibold text-brand-soft hover:underline"
              >
                Ном/бүлэгтэй холбох (заавал биш)
              </button>
            ) : (
              <div className="grid gap-2 grid-cols-3">
                <select
                  value={subject}
                  onChange={(e) => {
                    setSubject(e.target.value);
                    setBookId("");
                    setChapterId("");
                  }}
                  className={inputCls}
                >
                  <option value="">Бүх хичээл</option>
                  <option value="MATH">Математик</option>
                  <option value="SOCIAL_STUDIES">Нийгмийн ухаан</option>
                  <option value="SAT">SAT</option>
                </select>
                <select
                  value={bookId}
                  onChange={(e) => {
                    setBookId(e.target.value);
                    setChapterId("");
                  }}
                  className={inputCls}
                >
                  <option value="">— ном —</option>
                  {books.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.title}
                    </option>
                  ))}
                </select>
                <select
                  value={chapterId}
                  onChange={(e) => setChapterId(e.target.value)}
                  disabled={!bookId}
                  className={inputCls}
                >
                  <option value="">— бүлэг —</option>
                  {chapters.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {topicError && (
              <div className="flex items-center gap-2 rounded-lg bg-error/10 px-3 py-2 text-xs text-error">
                <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
                {topicError}
              </div>
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={saveTopic}
                disabled={topicSaving}
                className={primaryBtn}
              >
                {topicSaving ? "…" : "Хадгалах"}
              </button>
              <button
                type="button"
                onClick={clearTopic}
                disabled={topicSaving || !entry.topic}
                className="rounded-lg border border-error/40 px-2.5 py-1.5 text-xs font-semibold text-error transition hover:bg-error/10 disabled:opacity-50"
              >
                Хасах
              </button>
            </div>
          </div>
        )}

        {/* ---- Танхим солих маягт (товч дарахад задарна) ---- */}
        {roomOpen && entry && (
          <div className="mb-3 space-y-2 rounded-lg border border-line bg-panel p-3">
            <div className="flex flex-col gap-1">
              <label htmlFor="panel-room-value" className="text-xs text-ink-dim">
                Шинэ танхим (одоо: {entry.room ?? "тодорхойгүй"})
              </label>
              <div className="flex items-center gap-2">
                <RoomSelect
                  id="panel-room-value"
                  value={roomValue}
                  onChange={setRoomValue}
                  className={`${inputCls} flex-1`}
                />
                {roomValue && (
                  <RoomShape room={roomValue} size={16} className="shrink-0 text-ink" />
                )}
              </div>
              <SameTimeHint entries={sameTime} />
            </div>
            <fieldset className="flex flex-col gap-1.5">
              <legend className="sr-only">Хамрах хүрээ</legend>
              <label className="flex items-center gap-2 text-xs text-ink">
                <input
                  type="radio"
                  name="panel-room-scope"
                  checked={roomScope === "once"}
                  onChange={() => setRoomScope("once")}
                />
                Зөвхөн энэ өдөр ({date})
              </label>
              <label className="flex items-center gap-2 text-xs text-ink">
                <input
                  type="radio"
                  name="panel-room-scope"
                  checked={roomScope === "always"}
                  onChange={() => setRoomScope("always")}
                />
                Энэ өдрөөс хойш байнга (өнгөрсөн түүх хэвээр үлдэнэ)
              </label>
            </fieldset>
            {roomError && <p className="text-xs text-error">{roomError}</p>}
            <div className="flex justify-end">
              <button
                type="button"
                onClick={changeRoom}
                disabled={roomSaving}
                className="rounded-lg bg-brand-bright px-4 py-1.5 text-xs font-bold text-on-brand transition hover:opacity-90 disabled:opacity-50"
              >
                {roomSaving ? "…" : "Танхим солих"}
              </button>
            </div>
          </div>
        )}

        {/* ---- Зөөх маягт (товч дарахад задарна) ---- */}
        {moveOpen && (
          <div className="mb-3 space-y-2 rounded-lg border border-line bg-panel p-3">
            <div className="grid gap-2">
              <div className="flex flex-col gap-1">
                <label htmlFor="panel-move-date" className="text-xs text-ink-dim">
                  Шинэ огноо
                </label>
                <input
                  id="panel-move-date"
                  type="date"
                  value={moveDate}
                  onChange={(e) => setMoveDate(e.target.value)}
                  className={inputCls}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor="panel-move-room" className="text-xs text-ink-dim">
                  Шинэ танхим (заавал биш)
                </label>
                <div className="flex items-center gap-2">
                  <RoomSelect
                    id="panel-move-room"
                    value={moveRoom}
                    onChange={setMoveRoom}
                    className={`${inputCls} flex-1`}
                  />
                  {moveRoom && (
                    // Дүрс = танхим, будалтгүй ink. Анги нь самбарын толгойд
                    // нэрээрээ бичигдсэн тул энд өнгө давхардуулах шаардлагагүй.
                    <RoomShape room={moveRoom} size={16} className="shrink-0 text-ink" />
                  )}
                </div>
                <SameTimeHint entries={sameTime} />
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor="panel-move-start" className="text-xs text-ink-dim">
                  Шинэ эхлэх цаг
                </label>
                <input
                  id="panel-move-start"
                  type="time"
                  value={moveStart}
                  onChange={(e) => setMoveStart(e.target.value)}
                  className={inputCls}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor="panel-move-end" className="text-xs text-ink-dim">
                  Шинэ дуусах цаг
                </label>
                <input
                  id="panel-move-end"
                  type="time"
                  value={moveEnd}
                  onChange={(e) => setMoveEnd(e.target.value)}
                  className={inputCls}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor="panel-move-note" className="text-xs text-ink-dim">
                  Тэмдэглэл (заавал биш)
                </label>
                <input
                  id="panel-move-note"
                  value={moveNote}
                  onChange={(e) => setMoveNote(e.target.value)}
                  placeholder="Жишээ: Багшийн хүсэлтээр"
                  className={inputCls}
                />
              </div>
            </div>
            {moveError && (
              <div className="flex items-center gap-2 rounded-lg bg-error/10 px-3 py-2 text-xs text-error">
                <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
                {moveError}
              </div>
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={moveOccurrence}
                disabled={moveSaving}
                className={primaryBtn}
              >
                {moveSaving ? "…" : "Зөөх"}
              </button>
            </div>
          </div>
        )}

        {/* ---- Цуцлах баталгаа (товч дарахад задарна) ---- */}
        {cancelArmed && (
          <div className="mb-3 space-y-2 rounded-lg border border-warning/40 bg-warning/5 p-3">
            <p className="text-xs text-warning">Энэ өдрийг цуцлах уу?</p>
            {cancelError && (
              <div className="flex items-center gap-2 rounded-lg bg-error/10 px-3 py-2 text-xs text-error">
                <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
                {cancelError}
              </div>
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={cancelOccurrence}
                disabled={cancelSaving}
                className="flex-1 rounded-lg bg-warning px-2.5 py-1.5 text-xs font-bold text-on-warning transition hover:opacity-90 disabled:opacity-50"
              >
                {cancelSaving ? "…" : "Тийм"}
              </button>
              <button
                type="button"
                onClick={() => setCancelArmed(false)}
                className="flex-1 rounded-lg border border-line px-2.5 py-1.5 text-xs font-semibold text-ink transition hover:border-brand"
              >
                Үгүй
              </button>
            </div>
          </div>
        )}

        {/* ---- Settings: Энэ ба цаашдын бүх + Бүх давтамж (Settings icon нээх) ---- */}
        {showSettings && (
          <div className="space-y-3">
            {/* ---- Энэ ба цаашдын бүх (цуврал салгах) ---- */}
            <section className="rounded-lg border border-brand-bright/40 bg-brand-bright/5 p-3">
              <p className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-brand-soft">
                <CalendarRange className="h-3.5 w-3.5" aria-hidden />
                Энэ ба цаашдын бүх
              </p>

              {!splitOpen ? (
                <p className="text-xs text-ink-dim">{date}-ээс хойшх бүх долоо хоногт үйлчилнэ</p>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-ink-dim">
                    <span className="font-semibold text-ink">{date}</span>-ээс эхлэн шинэ
                    тохиргоо үйлчилнэ.
                  </p>

                  <div className="grid gap-2">
                    <div className="flex flex-col gap-1">
                      <label htmlFor="panel-split-weekday" className="text-xs text-ink-dim">
                        Гараг
                      </label>
                      <select
                        id="panel-split-weekday"
                        value={splitWeekday}
                        onChange={(e) => setSplitWeekday(Number(e.target.value))}
                        className={inputCls}
                      >
                        {WORKWEEK_ORDER.map((d) => (
                          <option key={d} value={d}>
                            {WEEKDAY_LABELS[d]}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex flex-col gap-1">
                      <label htmlFor="panel-split-room" className="text-xs text-ink-dim">
                        Танхим
                      </label>
                      <div className="flex items-center gap-2">
                        <RoomSelect
                          id="panel-split-room"
                          value={splitRoom}
                          onChange={setSplitRoom}
                          className={`${inputCls} flex-1`}
                        />
                        {splitRoom && (
                          <RoomShape room={splitRoom} size={14} className="shrink-0 text-ink" />
                        )}
                      </div>
                      <SameTimeHint entries={sameTime} />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label htmlFor="panel-split-start" className="text-xs text-ink-dim">
                        Эхлэх цаг
                      </label>
                      <input
                        id="panel-split-start"
                        type="time"
                        value={splitStart}
                        onChange={(e) => setSplitStart(e.target.value)}
                        className={inputCls}
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label htmlFor="panel-split-end" className="text-xs text-ink-dim">
                        Дуусах цаг
                      </label>
                      <input
                        id="panel-split-end"
                        type="time"
                        value={splitEnd}
                        onChange={(e) => setSplitEnd(e.target.value)}
                        className={inputCls}
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label htmlFor="panel-split-teacher" className="text-xs text-ink-dim">
                        Багш
                      </label>
                      <select
                        id="panel-split-teacher"
                        value={splitTeacherId}
                        onChange={(e) => setSplitTeacherId(e.target.value)}
                        className={inputCls}
                      >
                        <option value="">— ангийн үндсэн багш —</option>
                        {teachers.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.lastName} {t.firstName}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {splitError && (
                    <div className="flex items-center gap-2 rounded-lg bg-error/10 px-3 py-2 text-xs text-error">
                      <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
                      {splitError}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={splitSeries}
                      disabled={splitSaving}
                      className={primaryBtn}
                    >
                      {splitSaving ? "…" : "Хадгалах"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setSplitOpen(false)}
                      className={outlineBtn}
                    >
                      Болих
                    </button>
                  </div>
                </div>
              )}

              {!splitOpen && (
                <button type="button" onClick={() => setSplitOpen(true)} className={outlineBtn}>
                  Өөрчлөх
                </button>
              )}
            </section>

            {/* ---- Бүх давтамж (destructive/global) ---- */}
            <section className="rounded-lg border border-error/30 bg-error/5 p-3">
              <p className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-error">
                <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
                Бүх давтамжид нөлөөлнө
              </p>
              {deleteArmStep === 0 ? (
                <button
                  type="button"
                  onClick={() => setDeleteArmStep(1)}
                  className="rounded-lg border border-error/40 px-2.5 py-1.5 text-xs font-semibold text-error transition hover:bg-error/10"
                >
                  <Trash2 className="mr-1 inline h-3 w-3" aria-hidden />
                  Устгах
                </button>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-error">БҮХ долоо хоногийн тохиолдол устана.</p>
                  {deleteError && (
                    <div className="flex items-center gap-2 rounded-lg bg-error/10 px-3 py-2 text-xs text-error">
                      <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
                      {deleteError}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={deleteSeries}
                      disabled={deleteSaving}
                      className="flex-1 rounded-lg bg-error px-2.5 py-1.5 text-xs font-bold text-on-error transition hover:opacity-90 disabled:opacity-50"
                    >
                      {deleteSaving ? "…" : "Тийм"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteArmStep(0)}
                      className="flex-1 rounded-lg border border-line px-2.5 py-1.5 text-xs font-semibold text-ink transition hover:border-brand"
                    >
                      Үгүй
                    </button>
                  </div>
                </div>
              )}
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
