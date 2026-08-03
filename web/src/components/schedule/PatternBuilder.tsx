"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarPlus, CircleAlert, Repeat } from "lucide-react";
import { api } from "@/lib/api";
import { getClassroomColor } from "@/lib/classroomColor";
import InfoHint from "@/components/ui/InfoHint";
import {
  formatMinutes,
  ROOMS,
  SUBJECT_LABEL,
  timeToMinutes,
  todayUBKey,
  WEEKDAY_LABELS,
  WEEKDAY_PRESETS,
  WORKWEEK_ORDER,
  type ClassroomLite,
  type TeacherLite,
} from "./types";

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : "Алдаа гарлаа";
}

const inputCls =
  "w-full rounded-lg border border-line bg-bg px-3 py-2 text-sm outline-none focus:border-brand";
const primaryBtn =
  "inline-flex items-center gap-2 rounded-lg bg-brand-bright px-4 py-2 text-sm font-bold text-on-brand transition hover:opacity-90 disabled:opacity-50";

const SUBJECT_OPTIONS = ["MATH", "SOCIAL_STUDIES"] as const;

// ROOMS жагсаалт аль хэдийн САЛБАРААР эрэмбэлэгдсэн тул давхардсан branch-уудыг
// цуваа дараалалтайгаар нь гаргаж авбал <optgroup>-ийн харагдах эрэмбэ мөн
// адил (Баруун 4 → Зүүн 4 → Зайнаас) болно.
const ROOM_BRANCHES = Array.from(new Set(ROOMS.map((r) => r.branch)));

/** Хоёр weekday олонлог ЯГ ижил эсэх (дараалалгүйгээр) */
function sameDays(a: number[], b: readonly number[]): boolean {
  return a.length === b.length && b.every((d) => a.includes(d));
}

/**
 * Давтагддаг хуваарийг НЭГ удаагийн үйлдлээр үүсгэх маягт.
 *
 * Яагаад тусдаа байдаг вэ: эзний дүрмээр бүлэг бүр 7 хоног бүр ижил
 * цагтаа, тогтмол өдрүүдэд (12-р анги 1,3,5,6 эсвэл 2,4,6,7; 9–11-р анги
 * 1,3,5 эсвэл 2,4,6) ордог. Тиймээс мөр мөрөөр 4 удаа маягт бөглөхийн
 * оронд загварыг нэг товшилтоор сонгоод бүх өдрийг зэрэг үүсгэнэ
 * (POST /schedule/bulk — нэг transaction, аль нэг өдөр давхцвал бүгд
 * цуцлагдана).
 */
export default function PatternBuilder({
  role,
  onCreated,
}: {
  role: string;
  onCreated: () => void;
}) {
  const [classrooms, setClassrooms] = useState<ClassroomLite[]>([]);
  const [teachers, setTeachers] = useState<TeacherLite[]>([]);

  const [classroomId, setClassroomId] = useState("");
  const [weekdays, setWeekdays] = useState<number[]>([...WEEKDAY_PRESETS[0].weekdays]);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:30");
  const [teacherId, setTeacherId] = useState("");
  const [room, setRoom] = useState("");
  const [subject, setSubject] = useState<"" | (typeof SUBJECT_OPTIONS)[number]>("");
  const [effectiveFrom, setEffectiveFrom] = useState(todayUBKey());
  const [effectiveTo, setEffectiveTo] = useState("");

  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ kind: "success" | "error"; text: string } | null>(
    null,
  );

  useEffect(() => {
    api<ClassroomLite[]>("/classrooms")
      .then((rows) => {
        setClassrooms(rows);
        setClassroomId((id) => id || (rows[0]?.id ?? ""));
      })
      .catch((e) => setMsg({ kind: "error", text: errMsg(e) }));
    if (role === "ADMIN" || role === "TEACHER_PLUS") {
      api<TeacherLite[]>("/schedule/teachers")
        .then(setTeachers)
        .catch(() => setTeachers([]));
    }
  }, [role]);

  // Эхлэх цагийг өөрчлөхөд хичээлийн ҮРГЭЛЖЛЭХ ХУГАЦААГ хэвээр хадгална —
  // хэрэглэгч ихэвчлэн "мөн 90 минут, гэхдээ нэг цагаар хойшлуулъя" гэж
  // боддог тул дуусах цагийг гараар дахин бөглүүлэх нь илүүц алхам.
  function changeStart(value: string) {
    const prevDuration = timeToMinutes(endTime) - timeToMinutes(startTime);
    setStartTime(value);
    if (prevDuration > 0) {
      const nextEnd = timeToMinutes(value) + prevDuration;
      if (nextEnd < 24 * 60) setEndTime(formatMinutes(nextEnd));
    }
  }

  function toggleWeekday(day: number) {
    setWeekdays((days) =>
      days.includes(day) ? days.filter((d) => d !== day) : [...days, day],
    );
  }

  const startMinute = timeToMinutes(startTime);
  const endMinute = timeToMinutes(endTime);
  const classroom = classrooms.find((c) => c.id === classroomId);

  const problem = useMemo(() => {
    if (!classroomId) return "Анги сонгоно уу";
    if (weekdays.length === 0) return "Дор хаяж нэг өдөр сонгоно уу";
    if (endMinute <= startMinute) return "Дуусах цаг эхлэх цагаас хойш байх ёстой";
    if (effectiveTo && effectiveTo < effectiveFrom)
      return "Дуусах огноо эхлэх огнооноос хойш байх ёстой";
    return null;
  }, [classroomId, weekdays, startMinute, endMinute, effectiveFrom, effectiveTo]);

  async function submit() {
    if (problem) {
      setMsg({ kind: "error", text: problem });
      return;
    }
    setSaving(true);
    setMsg(null);
    try {
      await api("/schedule/bulk", {
        method: "POST",
        body: {
          classroomId,
          weekdays,
          startMinute,
          endMinute,
          ...(teacherId ? { teacherId } : {}),
          ...(room.trim() ? { room: room.trim() } : {}),
          ...(subject ? { subject } : {}),
          effectiveFrom,
          ...(effectiveTo ? { effectiveTo } : {}),
        },
      });
      setMsg({
        kind: "success",
        text: `${classroom?.name ?? "Анги"} — ${weekdays.length} өдрийн хуваарь үүслээ`,
      });
      onCreated();
    } catch (e) {
      setMsg({ kind: "error", text: errMsg(e) });
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-2xl border border-line bg-panel p-6">
      <div className="mb-4 flex items-center gap-2">
        <Repeat className="h-5 w-5 text-brand-soft" aria-hidden />
        <h2 className="font-bold text-brand-soft">Давтагддаг хуваарь үүсгэх</h2>
        <InfoHint label="Давтамжийн тухай">
          Энд үүсгэсэн хуваарь 7 хоног бүр ИЖИЛ өдрүүдэд, ижил цагт давтагдана.
          Ганц удаагийн өөрчлөлт (цуцлах, зөөх) хэрэгтэй бол долоо хоногийн
          торон дахь тухайн хичээл дээр товшино.
        </InfoHint>
      </div>

      {/* --- 1. Анги --- */}
      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="pb-classroom" className="text-xs text-ink-dim">
            Анги
          </label>
          <div className="flex items-center gap-2">
            <span
              className="h-6 w-1.5 shrink-0 rounded-full"
              style={{
                backgroundColor: classroomId
                  ? getClassroomColor(classroomId)
                  : "transparent",
              }}
              aria-hidden
            />
            <select
              id="pb-classroom"
              value={classroomId}
              onChange={(e) => setClassroomId(e.target.value)}
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
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="pb-start" className="text-xs text-ink-dim">
            Эхлэх цаг
          </label>
          <input
            id="pb-start"
            type="time"
            value={startTime}
            onChange={(e) => changeStart(e.target.value)}
            className={inputCls}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="pb-end" className="text-xs text-ink-dim">
            Дуусах цаг
          </label>
          <input
            id="pb-end"
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            className={inputCls}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="pb-from" className="text-xs text-ink-dim">
            Хэрэгжиж эхлэх огноо
          </label>
          <input
            id="pb-from"
            type="date"
            value={effectiveFrom}
            onChange={(e) => setEffectiveFrom(e.target.value)}
            className={inputCls}
          />
        </div>
      </div>

      {/* --- 2. Давтамж: бэлэн загвар эсвэл гараар --- */}
      <fieldset className="mb-4 rounded-xl border border-line bg-surface p-4">
        <legend className="px-1 text-xs text-ink-dim">Давтамж</legend>
        <div className="flex flex-wrap gap-2">
          {WEEKDAY_PRESETS.map((preset) => {
            const active = sameDays(weekdays, preset.weekdays);
            return (
              <button
                key={preset.label}
                type="button"
                aria-pressed={active}
                onClick={() => setWeekdays([...preset.weekdays])}
                title={preset.hint}
                className={`rounded-lg border px-3 py-1.5 text-sm font-bold transition ${
                  active
                    ? "border-brand-bright bg-brand-bright text-on-brand"
                    : "border-line text-ink hover:border-brand"
                }`}
              >
                {preset.label}
              </button>
            );
          })}
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {WORKWEEK_ORDER.map((day) => {
            const active = weekdays.includes(day);
            return (
              <button
                key={day}
                type="button"
                aria-pressed={active}
                onClick={() => toggleWeekday(day)}
                className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                  active
                    ? "border-brand-bright bg-brand-bright/15 text-brand-soft"
                    : "border-line text-ink-dim hover:border-brand"
                }`}
              >
                {WEEKDAY_LABELS[day]}
              </button>
            );
          })}
        </div>
      </fieldset>

      {/* --- 3. Нэмэлт (сонголтоор) --- */}
      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="pb-teacher" className="text-xs text-ink-dim">
            Багш
          </label>
          <select
            id="pb-teacher"
            value={teacherId}
            onChange={(e) => setTeacherId(e.target.value)}
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
        <div className="flex flex-col gap-1">
          <label htmlFor="pb-room" className="text-xs text-ink-dim">
            Өрөө
          </label>
          <select
            id="pb-room"
            value={room}
            onChange={(e) => setRoom(e.target.value)}
            className={inputCls}
          >
            <option value="">— танхим сонгох —</option>
            {ROOM_BRANCHES.map((branch) => (
              <optgroup key={branch} label={branch}>
                {ROOMS.filter((r) => r.branch === branch).map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.value}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="pb-subject" className="text-xs text-ink-dim">
            Хичээл
          </label>
          <select
            id="pb-subject"
            value={subject}
            onChange={(e) =>
              setSubject(e.target.value as "" | (typeof SUBJECT_OPTIONS)[number])
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
          <label htmlFor="pb-to" className="text-xs text-ink-dim">
            Дуусах огноо
          </label>
          <input
            id="pb-to"
            type="date"
            value={effectiveTo}
            onChange={(e) => setEffectiveTo(e.target.value)}
            className={inputCls}
          />
        </div>
      </div>

      {/* --- 4. Урьдчилсан харагдац + хадгалах --- */}
      <div className="flex flex-wrap items-center gap-4">
        <button onClick={submit} disabled={saving || problem !== null} className={primaryBtn}>
          <CalendarPlus className="h-4 w-4" aria-hidden />
          {saving ? "Үүсгэж байна…" : `${weekdays.length} хичээл үүсгэх`}
        </button>
        {!problem && classroom && (
          <p className="text-sm text-ink-dim">
            <span className="font-semibold text-ink">{classroom.name}</span>
            {" · "}
            {WORKWEEK_ORDER.filter((d) => weekdays.includes(d))
              .map((d) => WEEKDAY_LABELS[d])
              .join(", ")}
            {" · "}
            {formatMinutes(startMinute)}–{formatMinutes(endMinute)}
          </p>
        )}
        {problem && <p className="text-sm text-ink-dim">{problem}</p>}
      </div>

      {msg && (
        <div
          role="status"
          className={`mt-4 flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${
            msg.kind === "error"
              ? "bg-error/10 text-error"
              : "bg-success/10 text-success"
          }`}
        >
          {msg.kind === "error" ? (
            <CircleAlert className="h-4 w-4 shrink-0" aria-hidden />
          ) : (
            <div className="h-4 w-4 shrink-0 rounded-full border-2 border-success bg-success/20" aria-hidden />
          )}
          {msg.text}
        </div>
      )}
    </section>
  );
}
