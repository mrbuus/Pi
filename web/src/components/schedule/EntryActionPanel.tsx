"use client";

import { useEffect, useId, useMemo, useState } from "react";
import {
  AlertTriangle,
  BookOpen,
  CalendarClock,
  Ban,
  CalendarRange,
  Trash2,
  X,
} from "lucide-react";
import { api } from "@/lib/api";
import {
  formatMinutes,
  ROOMS,
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
  onClose,
  onChanged,
}: {
  open: boolean;
  entry: WeekEntry | null;
  /** Энэ тохиолдол харагдаж буй долоо хоногийн торон дахь огноо */
  date: string;
  onClose: () => void;
  onChanged: () => void;
}) {
  const titleId = useId();

  // Exception upsert/topic upsert бүгд АНХНЫ (натурал) тохиолдлын огноог
  // түлхүүр болгодог тул зөвхөн зөвлөгдсөн энд тооцоолно.
  const originalDate = entry?.exception ? entry.exception.originalDate : date;

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

  useEffect(() => {
    if (!entry) return;
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-y-auto rounded-2xl border border-line bg-surface p-5"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id={titleId} className="text-base font-bold text-ink">
              {entry.classroomName}
            </h2>
            <p className="mt-0.5 text-sm text-ink-dim">
              {weekdayLabel}, {date} · {formatMinutes(entry.startMinute)}–
              {formatMinutes(entry.endMinute)}
              {entry.room ? ` · ${entry.room} тоот` : ""}
            </p>
            {entry.exception?.kind === "MOVED" && (
              <p className="mt-1 text-xs text-warning">
                Энэ тохиолдол {entry.exception.originalDate}-с зөөгдсөн
                {entry.exception.note ? ` — ${entry.exception.note}` : ""}
              </p>
            )}
            <p className="mt-1 text-xs text-ink-dim">
              {entry.teacherName ?? "Багш товлогдоогүй"}
              {entry.subject ? ` · ${SUBJECT_LABEL[entry.subject] ?? entry.subject}` : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Хаах"
            className="rounded-lg p-1.5 text-ink-dim transition hover:bg-panel hover:text-ink"
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>

        {/* ---- Сэдэв ---- */}
        <section className="mt-4 rounded-xl border border-line bg-panel p-3">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-brand-soft" aria-hidden />
            <h3 className="text-sm font-bold">Өнөөдөр орох сэдэв</h3>
          </div>
          {!topicOpen ? (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <p className="flex-1 text-sm text-ink">
                {entry.topic ?? <span className="text-ink-dim">Сэдэв тохируулаагүй</span>}
              </p>
              <button type="button" onClick={() => setTopicOpen(true)} className={outlineBtn}>
                {entry.topic ? "Засах" : "Сэдэв оруулах"}
              </button>
              {entry.topic && (
                <button
                  type="button"
                  onClick={clearTopic}
                  disabled={topicSaving}
                  className="rounded-lg border border-error/40 px-3 py-1.5 text-sm text-error transition hover:bg-error/10 disabled:opacity-50"
                >
                  Хасах
                </button>
              )}
            </div>
          ) : (
            <div className="mt-2 space-y-2">
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
                <div className="grid gap-2 sm:grid-cols-3">
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
              {topicError && <p className="text-sm text-error">{topicError}</p>}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={saveTopic}
                  disabled={topicSaving}
                  className={primaryBtn}
                >
                  {topicSaving ? "Хадгалж байна…" : "Хадгалах"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTopicOpen(false);
                    setTopicTitle(entry.topic ?? "");
                    setTopicError(null);
                  }}
                  className={outlineBtn}
                >
                  Болих
                </button>
              </div>
            </div>
          )}
        </section>

        {/* ---- Энэ тохиолдол (occurrence-only) ---- */}
        <section className="mt-3 rounded-xl border border-line bg-panel p-3">
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-dim">
            Зөвхөн энэ өдөр
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setMoveOpen((v) => !v)}
              className={outlineBtn}
            >
              <CalendarClock className="mr-1.5 inline h-4 w-4" aria-hidden />
              Энэ өдрийг зөөх
            </button>
            {!cancelArmed ? (
              <button
                type="button"
                onClick={() => setCancelArmed(true)}
                className="rounded-lg border border-warning/40 px-3 py-1.5 text-sm font-semibold text-warning transition hover:bg-warning/10"
              >
                <Ban className="mr-1.5 inline h-4 w-4" aria-hidden />
                Энэ өдрийг цуцлах
              </button>
            ) : (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-warning">Энэ өдрийг цуцлах уу?</span>
                <button
                  type="button"
                  onClick={cancelOccurrence}
                  disabled={cancelSaving}
                  className="rounded-lg bg-warning px-3 py-1.5 text-sm font-bold text-on-warning transition hover:opacity-90 disabled:opacity-50"
                >
                  {cancelSaving ? "…" : "Тийм, цуцлах"}
                </button>
                <button type="button" onClick={() => setCancelArmed(false)} className={outlineBtn}>
                  Үгүй
                </button>
              </div>
            )}
          </div>
          {cancelError && <p className="mt-2 text-sm text-error">{cancelError}</p>}

          {moveOpen && (
            <div className="mt-3 grid gap-2 border-t border-line pt-3 sm:grid-cols-2">
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
                <RoomSelect
                  id="panel-move-room"
                  value={moveRoom}
                  onChange={setMoveRoom}
                  className={inputCls}
                />
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
              <div className="flex flex-col gap-1 sm:col-span-2">
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
              {moveError && <p className="text-sm text-error sm:col-span-2">{moveError}</p>}
              <div className="flex gap-2 sm:col-span-2">
                <button
                  type="button"
                  onClick={moveOccurrence}
                  disabled={moveSaving}
                  className={primaryBtn}
                >
                  {moveSaving ? "Зөөж байна…" : "Зөөх"}
                </button>
                <button type="button" onClick={() => setMoveOpen(false)} className={outlineBtn}>
                  Болих
                </button>
              </div>
            </div>
          )}
        </section>

        {/* ---- Энэ ба цаашдын бүх (цуврал салгах) ---- */}
        <section className="mt-3 rounded-xl border border-brand-bright/40 bg-brand-bright/5 p-3">
          <p className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-brand-soft">
            <CalendarRange className="h-3.5 w-3.5" aria-hidden />
            Энэ ба цаашдын бүх
          </p>

          {!splitOpen ? (
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={() => setSplitOpen(true)} className={outlineBtn}>
                Цагийг нь бүрмөсөн өөрчлөх
              </button>
              <p className="text-xs text-ink-dim">
                {date}-ээс хойшх бүх долоо хоногт үйлчилнэ
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-ink-dim">
                <span className="font-semibold text-ink">{date}</span>-ээс эхлэн шинэ
                тохиргоо үйлчилнэ. Түүнээс өмнөх ирц, даалгавар, сэдвийн бүртгэл
                хэвээр үлдэнэ.
              </p>

              <div className="grid gap-2 sm:grid-cols-2">
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
                  <RoomSelect
                    id="panel-split-room"
                    value={splitRoom}
                    onChange={setSplitRoom}
                    className={inputCls}
                  />
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
                <div className="flex flex-col gap-1 sm:col-span-2">
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

              {splitError && <p className="text-sm text-error">{splitError}</p>}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={splitSeries}
                  disabled={splitSaving}
                  className={primaryBtn}
                >
                  {splitSaving ? "Хадгалж байна…" : "Энэ өдрөөс эхлэн хадгалах"}
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
        </section>

        {/* ---- Бүх давтамж (destructive/global) ---- */}
        <section className="mt-3 rounded-xl border border-error/30 bg-error/5 p-3">
          <p className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-error">
            <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
            Бүх давтамжид нөлөөлнө
          </p>
          {deleteArmStep === 0 ? (
            <button
              type="button"
              onClick={() => setDeleteArmStep(1)}
              className="rounded-lg border border-error/40 px-3 py-1.5 text-sm font-semibold text-error transition hover:bg-error/10"
            >
              <Trash2 className="mr-1.5 inline h-4 w-4" aria-hidden />
              Бүх давтамжийг устгах
            </button>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-error">
                Энэ хуваарийн БҮХ долоо хоногийн тохиолдол (өнгөрсөн, ирээдүйн аль ч
                өдөр) устана. Зөвхөн нэг өдрийг өөрчлөх бол дээрх &ldquo;Зөвхөн энэ
                өдөр&rdquo; хэсгийг ашиглана уу.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={deleteSeries}
                  disabled={deleteSaving}
                  className="rounded-lg bg-error px-3 py-1.5 text-sm font-bold text-on-error transition hover:opacity-90 disabled:opacity-50"
                >
                  {deleteSaving ? "Устгаж байна…" : "Тийм, бүгдийг устга"}
                </button>
                <button type="button" onClick={() => setDeleteArmStep(0)} className={outlineBtn}>
                  Үгүй, болих
                </button>
              </div>
              {deleteError && <p className="text-sm text-error">{deleteError}</p>}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
