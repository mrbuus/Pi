"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import {
  formatMinutes,
  SUBJECT_LABEL,
  timeToMinutes,
  todayUBKey,
  WEEKDAY_LABELS,
  type ClassroomLite,
  type ScheduleEntry,
  type TeacherLite,
} from "./types";

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : "Алдаа гарлаа";
}

const inputCls =
  "rounded-lg border border-line bg-bg px-3 py-2 text-sm outline-none focus:border-brand";
const primaryBtn =
  "rounded-lg bg-brand-bright px-4 py-2 text-sm font-bold text-on-brand transition disabled:opacity-50";
const outlineBtn =
  "rounded-lg border border-line px-3 py-1.5 text-xs transition hover:border-brand disabled:opacity-50";

const SUBJECT_OPTIONS = ["MATH", "SOCIAL_STUDIES"] as const;

type FormState = {
  classroomId: string;
  weekday: number;
  startTime: string;
  endTime: string;
  teacherId: string;
  room: string;
  subject: "" | (typeof SUBJECT_OPTIONS)[number];
  effectiveFrom: string;
  effectiveTo: string;
};

function emptyForm(classroomId: string): FormState {
  return {
    classroomId,
    weekday: 1,
    startTime: "09:00",
    endTime: "10:30",
    teacherId: "",
    room: "",
    subject: "",
    effectiveFrom: todayUBKey(),
    effectiveTo: "",
  };
}

/**
 * ADMIN/TEACHER_PLUS-ын хичээлийн хуваарь удирдах хэсэг — давтагддаг долоо
 * хоногийн хуваарийн мөр нэмэх/засах/устгах (SPEC: хуваарь бараг өөрчлөгддөггүй
 * тул энэ хэсгийг ховор ашиглана, харин анх удаа тохируулахад чухал).
 */
export default function ScheduleAdmin({ role }: { role: string }) {
  const [classrooms, setClassrooms] = useState<ClassroomLite[]>([]);
  const [teachers, setTeachers] = useState<TeacherLite[]>([]);
  const [entries, setEntries] = useState<ScheduleEntry[]>([]);
  const [filterClassroomId, setFilterClassroomId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ kind: "success" | "error"; text: string } | null>(
    null,
  );

  const [form, setForm] = useState<FormState>(emptyForm(""));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [armedDelete, setArmedDelete] = useState<string | null>(null);

  useEffect(() => {
    api<ClassroomLite[]>("/classrooms")
      .then((rows) => {
        setClassrooms(rows);
        setForm((f) => (f.classroomId ? f : emptyForm(rows[0]?.id ?? "")));
      })
      .catch((e) => setError(errMsg(e)));
    // /users/teachers нь зөвхөн ADMIN-д нээлттэй — TEACHER_PLUS-д 403 өгвөл
    // зүгээр л багш сонгох талбарыг далдлана (ангийн үндсэн багшаар орлоно)
    if (role === "ADMIN") {
      api<TeacherLite[]>("/users/teachers")
        .then(setTeachers)
        .catch(() => {});
    }
  }, [role]);

  const loadEntries = useCallback(() => {
    setLoading(true);
    setError(null);
    const qs = filterClassroomId ? `?classroomId=${filterClassroomId}` : "";
    api<ScheduleEntry[]>(`/schedule${qs}`)
      .then(setEntries)
      .catch((e) => setError(errMsg(e)))
      .finally(() => setLoading(false));
  }, [filterClassroomId]);
  useEffect(loadEntries, [loadEntries]);

  function startEdit(entry: ScheduleEntry) {
    setEditingId(entry.id);
    setForm({
      classroomId: entry.classroomId,
      weekday: entry.weekday,
      startTime: formatMinutes(entry.startMinute),
      endTime: formatMinutes(entry.endMinute),
      teacherId: entry.teacherId ?? "",
      room: entry.room ?? "",
      subject: (entry.subject as FormState["subject"]) ?? "",
      effectiveFrom: entry.effectiveFrom.slice(0, 10),
      effectiveTo: entry.effectiveTo ? entry.effectiveTo.slice(0, 10) : "",
    });
    setMsg(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(emptyForm(filterClassroomId || classrooms[0]?.id || ""));
  }

  async function submit() {
    if (!form.classroomId) {
      setMsg({ kind: "error", text: "Анги сонгоно уу" });
      return;
    }
    const startMinute = timeToMinutes(form.startTime);
    const endMinute = timeToMinutes(form.endTime);
    setSaving(true);
    setMsg(null);
    try {
      // Хоосон талбарыг PATCH-д ЯГ null болгож илгээнэ (undefined биш) —
      // эс бөгөөс сервер "утга ирээгүй" гэж ойлгоод хуучин утгыг хэвээр
      // үлдээнэ, хэрэглэгч талбарыг цэвэрлэсэн нь бодит болохгүй.
      const body = {
        classroomId: form.classroomId,
        weekday: form.weekday,
        startMinute,
        endMinute,
        teacherId: form.teacherId || null,
        room: form.room.trim() || null,
        subject: form.subject || null,
        effectiveFrom: form.effectiveFrom,
        effectiveTo: form.effectiveTo || null,
      };
      if (editingId) {
        await api(`/schedule/${editingId}`, { method: "PATCH", body });
        setMsg({ kind: "success", text: "✓ Хуваарь шинэчлэгдлээ" });
      } else {
        await api("/schedule", { method: "POST", body });
        setMsg({ kind: "success", text: "✓ Хуваарь нэмэгдлээ" });
      }
      cancelEdit();
      loadEntries();
    } catch (e) {
      setMsg({ kind: "error", text: errMsg(e) });
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    try {
      await api(`/schedule/${id}`, { method: "DELETE" });
      setArmedDelete(null);
      loadEntries();
    } catch (e) {
      setMsg({ kind: "error", text: errMsg(e) });
    }
  }

  return (
    <section className="rounded-2xl border border-line bg-panel p-6">
      <h2 className="mb-1 font-bold text-brand-soft">Хичээлийн хуваарь удирдах</h2>
      <p className="mb-4 text-xs text-ink-dim">
        Долоо хоног бүр давтагддаг хэв маяг — тодорхой огноо биш, ӨДӨР (Ням…
        Бямба) дээр тохируулна.
      </p>

      {msg && (
        <div
          role="status"
          className={`mb-4 rounded-lg px-3 py-2 text-sm ${
            msg.kind === "error"
              ? "bg-error/10 text-error"
              : "bg-success/10 text-success"
          }`}
        >
          {msg.kind === "error" ? "⚠ " : "✓ "}
          {msg.text}
        </div>
      )}

      <div className="mb-6 grid gap-3 rounded-xl border border-line bg-surface p-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="sch-classroom" className="text-xs text-ink-dim">
            Анги
          </label>
          <select
            id="sch-classroom"
            value={form.classroomId}
            onChange={(e) => setForm((f) => ({ ...f, classroomId: e.target.value }))}
            className={inputCls}
          >
            <option value="">— сонгох —</option>
            {classrooms.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="sch-weekday" className="text-xs text-ink-dim">
            Өдөр
          </label>
          <select
            id="sch-weekday"
            value={form.weekday}
            onChange={(e) =>
              setForm((f) => ({ ...f, weekday: Number(e.target.value) }))
            }
            className={inputCls}
          >
            {WEEKDAY_LABELS.map((label, i) => (
              <option key={label} value={i}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="sch-start" className="text-xs text-ink-dim">
            Эхлэх цаг
          </label>
          <input
            id="sch-start"
            type="time"
            value={form.startTime}
            onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))}
            className={inputCls}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="sch-end" className="text-xs text-ink-dim">
            Дуусах цаг
          </label>
          <input
            id="sch-end"
            type="time"
            value={form.endTime}
            onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))}
            className={inputCls}
          />
        </div>

        {teachers.length > 0 && (
          <div className="flex flex-col gap-1">
            <label htmlFor="sch-teacher" className="text-xs text-ink-dim">
              Багш (сонголтоор)
            </label>
            <select
              id="sch-teacher"
              value={form.teacherId}
              onChange={(e) => setForm((f) => ({ ...f, teacherId: e.target.value }))}
              className={inputCls}
            >
              <option value="">— ангийн үндсэн багш —</option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.firstName} {t.lastName}
                </option>
              ))}
            </select>
          </div>
        )}
        <div className="flex flex-col gap-1">
          <label htmlFor="sch-room" className="text-xs text-ink-dim">
            Өрөө (сонголтоор)
          </label>
          <input
            id="sch-room"
            value={form.room}
            onChange={(e) => setForm((f) => ({ ...f, room: e.target.value }))}
            placeholder="Жишээ: 301"
            className={inputCls}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="sch-subject" className="text-xs text-ink-dim">
            Хичээл (сонголтоор)
          </label>
          <select
            id="sch-subject"
            value={form.subject}
            onChange={(e) =>
              setForm((f) => ({ ...f, subject: e.target.value as FormState["subject"] }))
            }
            className={inputCls}
          >
            <option value="">—</option>
            {SUBJECT_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {SUBJECT_LABEL[s]}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="sch-from" className="text-xs text-ink-dim">
            Хэрэгжиж эхлэх огноо
          </label>
          <input
            id="sch-from"
            type="date"
            value={form.effectiveFrom}
            onChange={(e) =>
              setForm((f) => ({ ...f, effectiveFrom: e.target.value }))
            }
            className={inputCls}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="sch-to" className="text-xs text-ink-dim">
            Дуусах огноо (сонголтоор)
          </label>
          <input
            id="sch-to"
            type="date"
            value={form.effectiveTo}
            onChange={(e) => setForm((f) => ({ ...f, effectiveTo: e.target.value }))}
            className={inputCls}
          />
        </div>

        <div className="flex items-end gap-2">
          <button onClick={submit} disabled={saving} className={primaryBtn}>
            {saving ? "Хадгалж байна…" : editingId ? "Хадгалах" : "Нэмэх"}
          </button>
          {editingId && (
            <button onClick={cancelEdit} className={outlineBtn}>
              Цуцлах
            </button>
          )}
        </div>
      </div>

      <div className="mb-3 flex items-center gap-2">
        <label htmlFor="sch-filter" className="text-xs text-ink-dim">
          Жагсаалт шүүх:
        </label>
        <select
          id="sch-filter"
          value={filterClassroomId}
          onChange={(e) => setFilterClassroomId(e.target.value)}
          className={inputCls}
        >
          <option value="">Бүх анги</option>
          {classrooms.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {loading && (
        <p className="animate-pulse text-sm text-ink-dim" role="status">
          Ачаалж байна…
        </p>
      )}
      {error && (
        <div className="rounded-lg border border-error/30 bg-error/5 px-3 py-2 text-sm text-error">
          ⚠ {error}
        </div>
      )}
      {!loading && !error && entries.length === 0 && (
        <p className="text-sm text-ink-dim">Хуваарийн бичлэг алга байна</p>
      )}
      {!loading && !error && entries.length > 0 && (
        <div className="space-y-2">
          {entries.map((entry) => (
            <div
              key={entry.id}
              className="flex flex-wrap items-center gap-3 rounded-xl border border-line bg-surface px-4 py-2.5 text-sm"
            >
              <span className="rounded-full bg-brand-bright/15 px-2 py-0.5 text-xs font-bold text-brand-soft">
                {WEEKDAY_LABELS[entry.weekday]}
              </span>
              <span className="font-mono text-xs">
                {formatMinutes(entry.startMinute)}–{formatMinutes(entry.endMinute)}
              </span>
              <span className="font-semibold">{entry.classroom.name}</span>
              <span className="text-ink-dim">
                {entry.teacher
                  ? `${entry.teacher.firstName} ${entry.teacher.lastName}`
                  : "Ангийн үндсэн багш"}
              </span>
              {entry.room && <span className="text-ink-dim">🚪 {entry.room}</span>}
              {entry.subject && (
                <span className="text-ink-dim">
                  {SUBJECT_LABEL[entry.subject] ?? entry.subject}
                </span>
              )}
              <span className="text-xs text-ink-dim">
                {entry.effectiveFrom.slice(0, 10)}
                {entry.effectiveTo ? ` – ${entry.effectiveTo.slice(0, 10)}` : " –"}
              </span>
              <div className="ml-auto flex gap-2">
                <button onClick={() => startEdit(entry)} className={outlineBtn}>
                  ✎ Засах
                </button>
                {armedDelete === entry.id ? (
                  <>
                    <span className="text-xs text-error">Устгах уу?</span>
                    <button
                      onClick={() => remove(entry.id)}
                      className="rounded-lg border border-error/40 px-3 py-1.5 text-xs font-semibold text-error transition hover:bg-error/10"
                    >
                      Тийм
                    </button>
                    <button
                      onClick={() => setArmedDelete(null)}
                      className={outlineBtn}
                    >
                      Үгүй
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setArmedDelete(entry.id)}
                    className="rounded-lg border border-error/40 px-3 py-1.5 text-xs text-error transition hover:bg-error/10"
                  >
                    ✕ Устгах
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

