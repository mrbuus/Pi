"use client";

import { useState } from "react";
import { CheckCircle2, Circle, Clock, History, Minus, NotebookPen, Plus, RotateCcw, Undo2 } from "lucide-react";
import { api } from "@/lib/api";
import { Meta } from "@/components/ui/Meta";
import { formatMinutes, type WeekEntry } from "@/components/schedule/types";
import { clockUB, dismissalOpen, NOTE_MAX, shiftClock, stampUB, type LessonNote, type LessonRecord } from "./types";

type Panel = "detail" | "note" | "dismissal" | null;

interface Props {
  entry: WeekEntry;
  date: string;
  today: string;
  record: LessonRecord | null;
  note: LessonNote | null;
  dismissalAt: string | null;
  onRecord: (r: LessonRecord | null) => void;
  onNote: (n: LessonNote | null) => void;
  onDismissal: (classroomId: string, iso: string) => void;
  onHistory: () => void;
}

const chip =
  "inline-flex min-h-11 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-semibold transition disabled:opacity-50";

/**
 * Өдрийн хуваарийн мөрийн үйлдлүүд (эзэн 2026-10-08, 2026-10-11):
 * тарсан цаг, багшийн тайлбар (зөвхөн ажилтанд), ангийн түүх — жижиг дүрс
 * товч, «Батлах» нь МӨРИЙН ТӨГСГӨЛД (Ахлах/Туслах багшийн дараа): багшаа
 * оноогоод нэг мөрөн дээрээ батална.
 *
 * Эцэг grid-д ГУРВАН хүүхэд өгнө: (1) дүрс товчнууд (sm: 2-р мөр, 1-р багана),
 * (2) Батлах (sm: 1-р мөр, 4-р багана — `sm:grid-cols-[… auto]`),
 * (3) нээгдсэн самбар / тайлбарын мөр (col-span-full).
 */
export default function LessonRowActions({
  entry,
  date,
  today,
  record,
  note,
  dismissalAt,
  onRecord,
  onNote,
  onDismissal,
  onHistory,
}: Props) {
  const [panel, setPanel] = useState<Panel>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [clock, setClock] = useState("");

  const past = date <= today;
  const canDismiss = dismissalOpen(date, today);

  function toggle(p: Panel) {
    setError(null);
    if (p === "note") setDraft(note?.body ?? "");
    if (p === "dismissal") setClock(dismissalAt ? clockUB(dismissalAt) : formatMinutes(entry.endMinute));
    setPanel((cur) => (cur === p ? null : p));
  }

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Хадгалж чадсангүй");
    } finally {
      setBusy(false);
    }
  }

  const confirm = () =>
    run(async () => {
      const r = await api<LessonRecord>(`/lesson-records/${entry.scheduleId}/confirm`, {
        method: "PUT",
        body: { date },
      });
      onRecord(r);
    });

  const unconfirm = () =>
    run(async () => {
      await api(`/lesson-records/${entry.scheduleId}/confirm?date=${date}`, {
        method: "DELETE",
      });
      onRecord(null);
      setPanel(null);
    });

  const saveNote = () =>
    run(async () => {
      const r = await api<{ note: Omit<LessonNote, "scheduleId"> | null }>(`/lesson-records/${entry.scheduleId}/note`, {
        method: "PUT",
        body: { date, body: draft },
      });
      onNote(r.note ? { scheduleId: entry.scheduleId, ...r.note } : null);
      setPanel(null);
    });

  const saveDismissal = () =>
    run(async () => {
      const path = `/learning-lab/classrooms/${entry.classroomId}/dismissal?date=${date}`;
      // /app/dismissal хуудсанд оруулсан сүүлийн сурагчийн цаг, тайлбарыг дарж устгахгүй
      const prev = await api<{
        lastLeftAt: string | null;
        note: string | null;
      } | null>(path);
      const r = await api<{ approximateAt: string }>(path, {
        method: "PUT",
        body: {
          approximateTime: clock,
          ...(prev?.lastLeftAt ? { lastLeftTime: clockUB(prev.lastLeftAt) } : {}),
          ...(prev?.note ? { note: prev.note } : {}),
        },
      });
      onDismissal(entry.classroomId, r.approximateAt);
      setPanel(null);
    });

  const recordTitle = record
    ? [
        `Тест ${record.testCount}`,
        record.attendanceMarked > 0
          ? `Ирсэн ${record.presentCount}/${record.enrolledCount}`
          : `${record.enrolledCount} сурагч`,
      ].join(" — ")
    : undefined;
  const iconBtn = `${chip} min-w-11 justify-center`;

  return (
    <>
      {/* Жижиг дүрс товч — гар утсанд Батлахын зүүн талд, том дэлгэцэд ангийн нэрийн доор */}
      <div className="flex flex-wrap items-center gap-1.5 sm:col-start-1 sm:row-start-2">
        {canDismiss && (
          <button
            type="button"
            onClick={() => toggle("dismissal")}
            aria-expanded={panel === "dismissal"}
            aria-label={dismissalAt ? `Тарсан ${clockUB(dismissalAt)}` : "Тарсан цаг"}
            title={dismissalAt ? `Тарсан ${clockUB(dismissalAt)}` : "Тарсан цаг"}
            className={`${iconBtn} ${dismissalAt ? "border-info/40 bg-info/10 text-info" : "border-line bg-panel text-ink-dim hover:border-brand"}`}
          >
            <Clock className="h-4 w-4" aria-hidden />
            {dismissalAt && <span className="tabular-nums">{clockUB(dismissalAt)}</span>}
          </button>
        )}

        <button
          type="button"
          onClick={() => toggle("note")}
          aria-expanded={panel === "note"}
          aria-label="Нэмэлт тайлбар"
          title={note ? note.body : "Нэмэлт тайлбар"}
          className={`${iconBtn} ${note ? "border-brand/40 bg-brand-bright/10 text-brand-soft" : "border-line bg-panel text-ink-dim hover:border-brand"}`}
        >
          <NotebookPen className="h-4 w-4" aria-hidden />
        </button>

        <button
          type="button"
          onClick={onHistory}
          aria-label="Ангийн хийсэн хичээлүүд"
          title="Ангийн хийсэн хичээлүүд"
          className={`${iconBtn} border-line bg-panel text-ink-dim hover:border-brand`}
        >
          <History className="h-4 w-4" aria-hidden />
        </button>
      </div>

      <div className="flex items-center justify-end sm:col-start-4 sm:row-start-1">
        {past &&
          (record ? (
            <button
              type="button"
              onClick={() => toggle("detail")}
              aria-expanded={panel === "detail"}
              title={recordTitle}
              className={`${chip} border-success/40 bg-success/10 text-success`}
            >
              <CheckCircle2 className="h-4 w-4" aria-hidden />
              Батлагдсан
            </button>
          ) : (
            <button
              type="button"
              onClick={confirm}
              disabled={busy}
              className={`${chip} border-line bg-panel text-ink hover:border-success hover:text-success`}
            >
              <Circle className="h-4 w-4" aria-hidden />
              Батлах
            </button>
          ))}
      </div>

      {(error || panel || note) && (
        <div className="col-span-full flex flex-col gap-2">
          {note && panel !== "note" && (
            <p className="flex min-w-0 items-center gap-1.5 text-xs text-ink-dim">
              <NotebookPen className="h-3.5 w-3.5 shrink-0" aria-hidden />
              <span className="truncate">{note.body}</span>
            </p>
          )}

          {error && (
            <p role="alert" className="rounded-lg bg-error/10 px-3 py-2 text-xs text-error">
              {error}
            </p>
          )}

          {panel === "detail" && record && (
            <div className="rounded-lg border border-line bg-bg p-3 text-sm">
              <p className="text-xs text-ink-dim">
                <Meta items={[record.confirmedByName, stampUB(record.confirmedAt)]} />
              </p>
              <dl className="mt-2 grid grid-cols-[6rem_1fr] gap-x-2 gap-y-1">
                <dt className="text-ink-dim">Сэдэв</dt>
                <dd className="font-medium">{record.topic ?? "—"}</dd>
                <dt className="text-ink-dim">Багш</dt>
                <dd>
                  <Meta items={[record.leadTeacherName, record.assistantTeacherName]} />
                  {!record.leadTeacherName && !record.assistantTeacherName && "—"}
                </dd>
                <dt className="text-ink-dim">Ирц</dt>
                <dd>
                  {record.attendanceMarked > 0 ? (
                    <Meta
                      items={[
                        `Ирсэн ${record.presentCount}`,
                        `Ирээгүй ${record.absentCount}`,
                        `Нийт ${record.enrolledCount}`,
                      ]}
                    />
                  ) : (
                    <span className="text-ink-dim">Бүртгээгүй</span>
                  )}
                </dd>
                <dt className="text-ink-dim">Тест</dt>
                <dd>
                  {record.tests.length ? (
                    <ul className="space-y-0.5">
                      {record.tests.map((t) => (
                        <li key={t.id}>{t.title}</li>
                      ))}
                    </ul>
                  ) : (
                    <span className="text-ink-dim">—</span>
                  )}
                </dd>
              </dl>
              <div className="mt-3 flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={confirm}
                  disabled={busy}
                  className={`${chip} border-line bg-panel hover:border-brand`}
                >
                  <RotateCcw className="h-4 w-4" aria-hidden />
                  Шинэчлэх
                </button>
                <button
                  type="button"
                  onClick={unconfirm}
                  disabled={busy}
                  className={`${chip} border-error/40 text-error hover:bg-error/10`}
                >
                  <Undo2 className="h-4 w-4" aria-hidden />
                  Батламж цуцлах
                </button>
              </div>
            </div>
          )}

          {panel === "note" && (
            <div className="rounded-lg border border-line bg-bg p-3">
              <label htmlFor={`note-${entry.scheduleId}`} className="sr-only">
                Нэмэлт тайлбар
              </label>
              <textarea
                id={`note-${entry.scheduleId}`}
                value={draft}
                maxLength={NOTE_MAX}
                rows={3}
                autoFocus
                onChange={(ev) => setDraft(ev.target.value.slice(0, NOTE_MAX))}
                placeholder="Нэмэлт тайлбар"
                className="w-full resize-y rounded-lg border border-line bg-surface p-2 text-sm"
              />
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <span
                  className={`mr-auto text-xs tabular-nums ${draft.length >= NOTE_MAX ? "text-warning" : "text-ink-dim"}`}
                >
                  {draft.length}/{NOTE_MAX}
                </span>
                <button type="button" onClick={() => setPanel(null)} className={`${chip} border-line bg-panel`}>
                  Болих
                </button>
                <button
                  type="button"
                  onClick={saveNote}
                  disabled={busy}
                  className={`${chip} border-brand-bright bg-brand-bright text-on-brand`}
                >
                  Хадгалах
                </button>
              </div>
            </div>
          )}

          {panel === "dismissal" && (
            <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-line bg-bg p-3">
              <button
                type="button"
                onClick={() => setClock((c) => shiftClock(c, -10))}
                aria-label="10 минут хасах"
                className={`${chip} min-w-11 justify-center border-line bg-panel`}
              >
                <Minus className="h-4 w-4" aria-hidden />
              </button>
              <label htmlFor={`dis-${entry.scheduleId}`} className="sr-only">
                Тарсан цаг
              </label>
              <input
                id={`dis-${entry.scheduleId}`}
                type="time"
                value={clock}
                onChange={(ev) => ev.target.value && setClock(ev.target.value)}
                className="min-h-11 rounded-lg border border-line bg-surface px-2 font-mono text-sm"
              />
              <button
                type="button"
                onClick={() => setClock((c) => shiftClock(c, 10))}
                aria-label="10 минут нэмэх"
                className={`${chip} min-w-11 justify-center border-line bg-panel`}
              >
                <Plus className="h-4 w-4" aria-hidden />
              </button>
              <button
                type="button"
                onClick={saveDismissal}
                disabled={busy || !clock}
                className={`${chip} ml-auto border-brand-bright bg-brand-bright text-on-brand`}
              >
                Хадгалах
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
}
