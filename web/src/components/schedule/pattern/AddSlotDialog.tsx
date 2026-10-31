"use client";

import { ArrowLeft, ArrowRight, TriangleAlert } from "lucide-react";
import { useId, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/kit/button";
import { api } from "@/lib/api";
import { getClassroomColor } from "@/lib/classroomColor";
import { cn } from "@/lib/cn";
import RoomBadge from "../RoomBadge";
import { formatMinutes, ROOMS, SUBJECT_LABEL, timeToMinutes, WEEKDAY_LABELS, WEEKDAY_PRESETS, WEEKDAY_SHORT } from "../types";
import { classLabelOf, dateLabel, findConflicts, friendlyError, personName, WEEK_ORDER, type ClassInfo, type Conflict, type Slot, type TeacherOption } from "./model";
import Sheet, { Field, FIELD } from "./Sheet";
import { ConflictList } from "./SlotDialog";

const ROOM_BRANCHES = Array.from(new Set(ROOMS.map((r) => r.branch)));
const SUBJECTS = ["MATH", "SOCIAL_STUDIES"] as const;

/**
 * Шинэ давтагддаг цаг: нэг анги, нэг цаг, нэг эсвэл хэд хэдэн гарагт
 * (POST /schedule/bulk — нэг transaction, аль нэг гараг давхцвал бүгд цуцлагдана).
 * Хуучин «Хуваарь зохиох» табын маягтын бүх талбар энд байна.
 */
export default function AddSlotDialog({
  classOptions,
  slots,
  classes,
  teachers,
  today,
  onClose,
  onSaved,
}: {
  classOptions: ClassInfo[];
  slots: Slot[];
  classes: Map<string, ClassInfo>;
  teachers: TeacherOption[];
  today: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const id = useId();
  const [classroomId, setClassroomId] = useState("");
  const [weekdays, setWeekdays] = useState<number[]>([]);
  const [start, setStart] = useState("15:00");
  const [end, setEnd] = useState("17:00");
  const [room, setRoom] = useState("");
  const [teacherId, setTeacherId] = useState("");
  const [subject, setSubject] = useState("");
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState("");
  const [step, setStep] = useState<"form" | "confirm">("form");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startMinute = timeToMinutes(start);
  const endMinute = timeToMinutes(end);
  const cls = classes.get(classroomId);
  const days = WEEK_ORDER.filter((d) => weekdays.includes(d));

  const conflicts = useMemo(() => {
    if (!classroomId || endMinute <= startMinute) return [] as Conflict[];
    const out: Conflict[] = [];
    for (const wd of days) {
      out.push(
        ...findConflicts(
          { ignoreIds: [], classroomId, weekday: wd, startMinute, endMinute, room: room || null, teacherId: teacherId || null, from, to: to || null },
          slots,
          classes,
          null,
        ),
      );
    }
    const cap = ROOMS.find((r) => r.value === room)?.capacity ?? null;
    if (cap != null && cls?.students != null && cls.students > cap)
      out.push({ kind: "capacity", blocking: false, text: `${cls.students} сурагч, ${room} танхимд ${cap} суудал` });
    return out;
  }, [classroomId, days, startMinute, endMinute, room, teacherId, from, to, slots, classes, cls]);
  const blocking = conflicts.some((c) => c.blocking);

  const problem = !classroomId
    ? "Анги сонгоно уу"
    : days.length === 0
      ? "Дор хаяж нэг гараг сонгоно уу"
      : !start || !end || endMinute <= startMinute
        ? "Дуусах цаг эхлэх цагаас хойш байх ёстой"
        : !from
          ? "Эхлэх огноо сонгоно уу"
          : to && to < from
            ? "Дуусах огноо эхлэхээс хойш байх ёстой"
            : null;

  function changeStart(v: string) {
    const dur = endMinute - startMinute;
    setStart(v);
    if (dur > 0 && v) {
      const next = timeToMinutes(v) + dur;
      if (next < 24 * 60) setEnd(formatMinutes(next));
    }
  }

  async function save() {
    setSaving(true);
    setError(null);
    try {
      await api("/schedule/bulk", {
        method: "POST",
        body: {
          classroomId,
          weekdays: days,
          startMinute,
          endMinute,
          ...(teacherId ? { teacherId } : {}),
          ...(room ? { room } : {}),
          ...(subject ? { subject } : {}),
          effectiveFrom: from,
          ...(to ? { effectiveTo: to } : {}),
        },
      });
      toast.success(`${cls ? classLabelOf(cls.name) : "Анги"}: ${days.length} цаг нэмэгдлээ`);
      onSaved();
    } catch (e) {
      setError(friendlyError(e instanceof Error ? e.message : "Хадгалж чадсангүй"));
    } finally {
      setSaving(false);
    }
  }

  const teacherText = teacherId
    ? personName(teachers.find((t) => t.id === teacherId)) ?? "Сонгосон багш"
    : `Ангийн багш${cls?.teacherName ? ` (${cls.teacherName})` : ""}`;

  return (
    <Sheet
      open
      onOpenChange={(o) => !o && !saving && onClose()}
      title="Шинэ цаг нэмэх"
      description="7 хоног бүр сонгосон гарагуудад ижил цагт давтагдана"
      footer={
        step === "form" ? (
          <>
            <Button variant="outline" size="sm" type="button" onClick={onClose}>
              Болих
            </Button>
            <Button size="sm" type="button" disabled={problem !== null} onClick={() => { setError(null); setStep("confirm"); }}>
              Үргэлжлүүлэх
              <ArrowRight aria-hidden />
            </Button>
          </>
        ) : (
          <>
            <Button variant="outline" size="sm" type="button" disabled={saving} onClick={() => setStep("form")}>
              <ArrowLeft aria-hidden />
              Буцах
            </Button>
            <Button size="sm" type="button" disabled={saving || blocking} onClick={save}>
              {saving ? "Хадгалж байна…" : `${days.length} цаг нэмэх`}
            </Button>
          </>
        )
      }
    >
      {step === "form" ? (
        <div className="grid grid-cols-2 gap-3">
          <Field label="Анги" htmlFor={`${id}-class`} wide>
            <div className="flex items-center gap-2">
              <span aria-hidden className="h-8 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: classroomId ? getClassroomColor(classroomId) : "transparent" }} />
              <select id={`${id}-class`} value={classroomId} onChange={(e) => setClassroomId(e.target.value)} className={FIELD}>
                <option value="">Сонгох</option>
                {classOptions.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                    {c.students != null ? ` — ${c.students} сурагч` : ""}
                  </option>
                ))}
              </select>
            </div>
          </Field>

          <fieldset className="col-span-2">
            <legend className="mb-1 text-sm text-ink-dim">Гараг</legend>
            <div className="flex flex-wrap gap-1.5">
              {WEEK_ORDER.map((d) => {
                const on = weekdays.includes(d);
                return (
                  <button
                    key={d}
                    type="button"
                    aria-pressed={on}
                    aria-label={WEEKDAY_LABELS[d]}
                    onClick={() => setWeekdays((w) => (on ? w.filter((x) => x !== d) : [...w, d]))}
                    className={cn(
                      "inline-flex size-11 items-center justify-center rounded-xl border text-sm font-bold transition",
                      on ? "border-brand-bright bg-brand-bright text-on-brand" : "border-line text-ink hover:border-brand",
                    )}
                  >
                    {WEEKDAY_SHORT[d]}
                  </button>
                );
              })}
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {WEEKDAY_PRESETS.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  title={p.hint}
                  onClick={() => setWeekdays([...p.weekdays])}
                  className="min-h-9 rounded-lg border border-line px-2.5 text-xs font-semibold tabular-nums text-ink-dim hover:border-brand hover:text-ink"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </fieldset>

          <Field label="Эхлэх цаг" htmlFor={`${id}-start`}>
            <input id={`${id}-start`} type="time" value={start} onChange={(e) => changeStart(e.target.value)} className={cn(FIELD, "tabular-nums")} />
          </Field>
          <Field label="Танхим" htmlFor={`${id}-room`}>
            <div className="flex items-center gap-2">
              <select id={`${id}-room`} value={room} onChange={(e) => setRoom(e.target.value)} className={FIELD}>
                <option value="">Танхимгүй</option>
                {ROOM_BRANCHES.map((b) => (
                  <optgroup key={b} label={b}>
                    {ROOMS.filter((r) => r.branch === b).map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.value}
                        {r.capacity ? ` — ${r.capacity} суудал` : ""}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
              <RoomBadge room={room || null} size="sm" />
            </div>
          </Field>
          <Field label="Багш" htmlFor={`${id}-teacher`}>
            <select id={`${id}-teacher`} value={teacherId} onChange={(e) => setTeacherId(e.target.value)} className={FIELD}>
              <option value="">{`Ангийн багш${cls?.teacherName ? ` (${cls.teacherName})` : ""}`}</option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {personName(t)}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Эхлэх огноо" htmlFor={`${id}-from`}>
            <input id={`${id}-from`} type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={FIELD} />
          </Field>
          <Field label="Дуусах огноо (заавал биш)" htmlFor={`${id}-to`}>
            <input id={`${id}-to`} type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} className={FIELD} />
          </Field>
          <Field label="Хичээл (заавал биш)" htmlFor={`${id}-subject`} wide>
            <select id={`${id}-subject`} value={subject} onChange={(e) => setSubject(e.target.value)} className={FIELD}>
              <option value="">Сонгоогүй</option>
              {SUBJECTS.map((s) => (
                <option key={s} value={s}>
                  {SUBJECT_LABEL[s]}
                </option>
              ))}
            </select>
          </Field>
          {classroomId && days.length > 0 && (
            <div className="col-span-2">
              <ConflictList conflicts={conflicts} />
            </div>
          )}
          {problem && classroomId && <p className="col-span-2 text-sm text-ink-dim">{problem}</p>}
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm font-semibold text-ink">Хадгалахаас өмнө шалгана уу</p>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 rounded-2xl border border-line p-3 text-sm">
            <dt className="text-ink-dim">Анги</dt>
            <dd className="font-semibold text-ink">{cls?.name}</dd>
            <dt className="text-ink-dim">Гараг</dt>
            <dd className="text-ink">{days.map((d) => WEEKDAY_LABELS[d]).join(", ")}</dd>
            <dt className="text-ink-dim">Цаг</dt>
            <dd className="tabular-nums text-ink">
              {formatMinutes(startMinute)}
            </dd>
            <dt className="text-ink-dim">Танхим</dt>
            <dd className="text-ink">{room ? <RoomBadge room={room} size="sm" /> : "Танхимгүй"}</dd>
            <dt className="text-ink-dim">Багш</dt>
            <dd className="text-ink">{teacherText}</dd>
            <dt className="text-ink-dim">Хугацаа</dt>
            <dd className="text-ink">
              {dateLabel(from, today)} гарагаас{to ? ` ${dateLabel(to, today)} хүртэл` : ""}
            </dd>
            {subject && (
              <>
                <dt className="text-ink-dim">Хичээл</dt>
                <dd className="text-ink">{SUBJECT_LABEL[subject]}</dd>
              </>
            )}
          </dl>
          <ConflictList conflicts={conflicts} />
          {error && (
            <div role="alert" className="flex items-start gap-2 rounded-xl border border-error/30 bg-error/5 px-3 py-2 text-sm text-error">
              <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
              <span>{error}</span>
            </div>
          )}
        </div>
      )}
    </Sheet>
  );
}
