"use client";

import { ArrowLeftRight, TriangleAlert } from "lucide-react";
import { useId, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/kit/button";
import { api } from "@/lib/api";
import { getClassroomColor } from "@/lib/classroomColor";
import { cn } from "@/lib/cn";
import RoomBadge from "../RoomBadge";
import { formatMinutes, ROOMS, timeToMinutes, WEEKDAY_LABELS, WEEKDAY_SHORT } from "../types";
import {
  classLabelOf,
  dateLabel,
  findConflicts,
  friendlyError,
  isEffectiveOn,
  WEEK_ORDER,
  weekdayOf,
  type ClassInfo,
  type Conflict,
  type Slot,
} from "./model";
import Sheet, { Field, FIELD } from "./Sheet";
import { ConflictList } from "./SlotDialog";

/*
 * Ангийн 7 хоногийг нэг дор засах (эзэн 2026-10-23): гараг бүрийг асааж/унтрааж,
 * идэвхтэй өдрийн эхлэх, дуусах цаг ба танхим; ангийн нэр, салбар; «хэзээнээс».
 * Хадгалахад PUT /schedule/classrooms/:id/pattern (нэг транзакц) — хассан өдөр
 * өмнөх өдрөөр хаагдана, өөрчлөгдсөн өдөр хуваагдана, түүх хэвээр.
 * «Шинэ анги» горимд POST /schedule/classrooms (анги + 7 хоног хамт).
 */

export const BRANCHES = ["Баруун 4", "Зүүн 4"] as const;
const ROOM_BRANCHES = Array.from(new Set(ROOMS.map((r) => r.branch)));

/** Эзний түгээмэл цагууд: ажлын өдөр 15:00–17:30, 17:30–19:30; амралтын өдөр 10–12, 13–15, 16–18 */
const WEEKDAY_TIMES: [string, string][] = [
  ["15:00", "17:30"],
  ["17:30", "19:30"],
];
const WEEKEND_TIMES: [string, string][] = [
  ["10:00", "12:00"],
  ["13:00", "15:00"],
  ["16:00", "18:00"],
];
const presetsFor = (wd: number) => (wd === 0 || wd === 6 ? WEEKEND_TIMES : WEEKDAY_TIMES);

interface DayState {
  on: boolean;
  start: string;
  end: string;
  room: string;
  /** Одоо мөрдөгдөж буй мөр (засах горимд) */
  orig: Slot | null;
}

type DayStatus = "keep" | "change" | "add" | "remove" | "off";

/** УБ-ын одоогийн минут */
function nowMinuteUB(): number {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Ulaanbaatar", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date());
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);
  return get("hour") * 60 + get("minute");
}

/** «Хэзээнээс»: өнөөдрийн хичээл эхлээгүй бол өнөөдөр, эс бөгөөс маргааш */
export function defaultEffectiveFrom(today: string, slots: Slot[], addDays: (k: string, n: number) => string): string {
  const wd = weekdayOf(today);
  const todays = slots.filter((s) => s.weekday === wd && isEffectiveOn(s, today));
  if (todays.length === 0) return today;
  const earliest = Math.min(...todays.map((s) => s.startMinute));
  return nowMinuteUB() < earliest ? today : addDays(today, 1);
}

export function splitName(full: string): { label: string; branch: string } {
  const m = full.match(/^(.*?)\s*\(([^)]+)\)\s*$/);
  return m ? { label: m[1].trim(), branch: m[2].trim() } : { label: full.trim(), branch: "" };
}

export function composeName(label: string, branch: string): string {
  const clean = splitName(label.replace(/\s+/g, " ")).label;
  return branch ? `${clean} (${branch})` : clean;
}

export default function ClassPatternDialog({
  classroomId,
  slots,
  classes,
  today,
  defaultFrom,
  onClose,
  onSaved,
}: {
  /** null = «Шинэ анги» */
  classroomId: string | null;
  slots: Slot[];
  classes: Map<string, ClassInfo>;
  today: string;
  defaultFrom: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const id = useId();
  const creating = classroomId === null;
  const cls = classroomId ? classes.get(classroomId) : undefined;
  const classSlots = useMemo(() => (classroomId ? slots.filter((s) => s.classroomId === classroomId) : []), [slots, classroomId]);
  const fullName = cls?.name ?? classSlots[0]?.className ?? "";
  const initialName = splitName(fullName);

  const [label, setLabel] = useState(initialName.label);
  const [branch, setBranch] = useState<string>(initialName.branch || (creating ? "" : ""));
  const [grade, setGrade] = useState("");
  const [from, setFrom] = useState(defaultFrom);
  const [days, setDays] = useState<Record<number, DayState>>(() => {
    const out: Record<number, DayState> = {};
    for (const wd of WEEK_ORDER) {
      const orig = classSlots.find((s) => s.weekday === wd && isEffectiveOn(s, today)) ?? null;
      const [s, e] = presetsFor(wd)[0];
      out[wd] = orig
        ? { on: true, start: formatMinutes(orig.startMinute), end: formatMinutes(orig.endMinute), room: orig.room ?? "", orig }
        : { on: false, start: s, end: e, room: "", orig: null };
    }
    return out;
  });
  const [swaps, setSwaps] = useState<Record<number, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ignoreIds = useMemo(() => classSlots.map((s) => s.id), [classSlots]);
  const futurePlanned = classSlots.some((s) => s.from > from);
  const students = cls?.students ?? null;

  function update(wd: number, patch: Partial<DayState>) {
    setDays((cur) => ({ ...cur, [wd]: { ...cur[wd], ...patch } }));
  }
  function toggle(wd: number) {
    const d = days[wd];
    if (d.on) return update(wd, { on: false });
    // Сүүлд сонгосон танхимыг санал болгоно
    const lastRoom = WEEK_ORDER.map((x) => days[x]).find((x) => x.on && x.room)?.room ?? "";
    update(wd, d.orig ? { on: true, start: formatMinutes(d.orig.startMinute), end: formatMinutes(d.orig.endMinute), room: d.orig.room ?? "" } : { on: true, room: d.room || lastRoom });
  }

  const statusOf = (wd: number): DayStatus => {
    const d = days[wd];
    if (!d.on) return d.orig ? "remove" : "off";
    if (!d.orig) return "add";
    const same =
      timeToMinutes(d.start) === d.orig.startMinute && timeToMinutes(d.end) === d.orig.endMinute && (d.room || null) === (d.orig.room ?? null);
    return same ? "keep" : "change";
  };

  // Гараг бүрийн давхцал: танхим давхцвал хадгалахыг хаана («Танхим солих» боломжтой бол сонгоно)
  const perDay = useMemo(() => {
    const out = new Map<number, { conflicts: Conflict[]; clash: Slot | null; swapPossible: boolean }>();
    for (const wd of WEEK_ORDER) {
      const d = days[wd];
      const st = statusOf(wd);
      if (!d.on || st === "keep") continue;
      const s = timeToMinutes(d.start);
      const e = timeToMinutes(d.end);
      if (!d.start || !d.end || e <= s) continue;
      const conflicts = findConflicts(
        { ignoreIds, classroomId: classroomId ?? "__new__", weekday: wd, startMinute: s, endMinute: e, room: d.room || null, teacherId: d.orig?.teacherId ?? null, from, to: null },
        slots,
        classes,
        students,
      ).filter((c) => c.kind !== "capacity" || (d.room || null) !== (d.orig?.room ?? null));
      const clash = conflicts.find((c) => c.kind === "room" && c.other)?.other ?? null;
      const swapPossible =
        !creating && !!clash && !!d.orig?.room && d.orig.room !== "Онлайн" && !!clash.room && clash.room !== "Онлайн" && d.room !== d.orig.room;
      out.set(wd, { conflicts, clash, swapPossible });
    }
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days, from, slots, classes, ignoreIds, classroomId, students, creating]);

  const name = composeName(label, branch);
  const nameChanged = !creating && name !== fullName;
  const dupName = [...classes.values()].some((c) => c.id !== classroomId && c.name.trim().toLowerCase() === name.trim().toLowerCase());
  const activeDays = WEEK_ORDER.filter((wd) => days[wd].on);
  const badTime = activeDays.find((wd) => {
    const d = days[wd];
    return !d.start || !d.end || timeToMinutes(d.end) <= timeToMinutes(d.start);
  });
  const statuses = WEEK_ORDER.map((wd) => statusOf(wd));
  const patternChanged = statuses.some((s) => s === "change" || s === "add" || s === "remove");
  const roomBlocked = [...perDay.entries()].some(([wd, p]) => p.clash && !(p.swapPossible && swaps[wd]));

  const problem = !splitName(label).label
    ? "Ангийн нэр оруулна уу"
    : creating && !branch
      ? "Салбар сонгоно уу"
      : dupName
        ? "Ийм нэртэй анги аль хэдийн байна"
        : !from
          ? "Хэзээнээс гэдгийг сонгоно уу"
          : from < today
            ? "Өнгөрсөн өдрөөс өөрчлөх боломжгүй"
            : badTime !== undefined
              ? `${WEEKDAY_LABELS[badTime]}: дуусах цаг эхлэх цагаас хойш байх ёстой`
              : creating && activeDays.length === 0
                ? "Дор хаяж нэг гараг сонгоно уу"
                : !creating && !patternChanged && !nameChanged
                  ? "Өөрчлөлт алга"
                  : null;

  const payloadDays = activeDays.map((wd) => ({
    weekday: wd,
    startMinute: timeToMinutes(days[wd].start),
    endMinute: timeToMinutes(days[wd].end),
    room: days[wd].room || null,
  }));

  async function save() {
    setSaving(true);
    setError(null);
    try {
      if (creating) {
        await api("/schedule/classrooms", {
          method: "POST",
          body: { name: label, branch, ...(grade ? { grade: Number(grade) } : {}), effectiveFrom: from, days: payloadDays },
        });
        toast.success(`${name} анги нэмэгдлээ`);
      } else {
        // «Танхим солих»: тухайн өдөр хоёр анги танхимаа солино (одоо байгаа үйлдэл)
        for (const [wd, p] of perDay) {
          if (!(p.swapPossible && swaps[wd] && p.clash && days[wd].orig)) continue;
          await api(`/schedule/${days[wd].orig!.id}/swap-room`, {
            method: "POST",
            body: { otherId: p.clash.id, from, weekday: wd, startMinute: timeToMinutes(days[wd].start), endMinute: timeToMinutes(days[wd].end) },
          });
        }
        await api(`/schedule/classrooms/${classroomId}/pattern`, {
          method: "PUT",
          body: { effectiveFrom: from, days: payloadDays, ...(nameChanged ? { name: label, ...(branch ? { branch } : {}) } : {}) },
        });
        toast.success(`${name}: хуваарь шинэчлэгдлээ`);
      }
      onSaved();
    } catch (e) {
      setError(friendlyError(e instanceof Error ? e.message : "Хадгалж чадсангүй"));
    } finally {
      setSaving(false);
    }
  }

  const title = creating ? "Шинэ анги" : `${classLabelOf(fullName)} анги`;

  return (
    <Sheet
      open
      onOpenChange={(o) => !o && !saving && onClose()}
      title={title}
      description={creating ? "Анги ба түүний 7 хоногийн хуваарь" : "Гараг, цаг, танхим ба нэрийг засна. Өмнөх түүх хэвээр үлдэнэ"}
      footer={
        <>
          <Button variant="outline" size="sm" type="button" disabled={saving} onClick={onClose}>
            Болих
          </Button>
          <Button size="sm" type="button" disabled={saving || problem !== null || roomBlocked} onClick={save}>
            {saving ? "Хадгалж байна…" : creating ? "Анги нэмэх" : "Хадгалах"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Ангийн нэр" htmlFor={`${id}-name`}>
            <div className="flex items-center gap-2">
              {classroomId && <span aria-hidden className="h-8 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: getClassroomColor(classroomId) }} />}
              <input
                id={`${id}-name`}
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="13-5"
                maxLength={40}
                autoComplete="off"
                className={FIELD}
              />
            </div>
          </Field>
          <Field label="Салбар" htmlFor={`${id}-branch`}>
            <select id={`${id}-branch`} value={branch} onChange={(e) => setBranch(e.target.value)} className={FIELD}>
              {(creating || !initialName.branch) && <option value="">{creating ? "Сонгох" : "Салбаргүй"}</option>}
              {BRANCHES.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </Field>
          {creating && (
            <Field label="Анги (заавал биш)" htmlFor={`${id}-grade`}>
              <select id={`${id}-grade`} value={grade} onChange={(e) => setGrade(e.target.value)} className={FIELD}>
                <option value="">Нэрээс</option>
                {Array.from({ length: 13 }, (_, i) => i + 1).map((g) => (
                  <option key={g} value={g}>
                    {g}-р анги
                  </option>
                ))}
              </select>
            </Field>
          )}
          <Field label="Хэзээнээс" htmlFor={`${id}-from`}>
            <input id={`${id}-from`} type="date" value={from} min={today} onChange={(e) => setFrom(e.target.value)} className={FIELD} />
          </Field>
        </div>
        {(nameChanged || creating) && splitName(label).label && (
          <p className="text-sm text-ink-dim">
            Нэр: <span className="font-semibold text-ink">{name}</span>
          </p>
        )}

        <fieldset className="space-y-2">
          <legend className="mb-1 text-sm text-ink-dim">Хичээлтэй гараг</legend>
          {WEEK_ORDER.map((wd) => (
            <DayRow
              key={wd}
              id={id}
              wd={wd}
              day={days[wd]}
              status={statuses[WEEK_ORDER.indexOf(wd)]}
              check={perDay.get(wd)}
              swap={!!swaps[wd]}
              onSwap={(v) => setSwaps((s) => ({ ...s, [wd]: v }))}
              onToggle={() => toggle(wd)}
              onChange={(patch) => update(wd, patch)}
            />
          ))}
        </fieldset>

        {futurePlanned && (
          <p className="flex items-start gap-2 rounded-xl bg-warning/10 px-3 py-2 text-sm text-warning">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
            <span>Энэ ангид {dateLabel(from, today, false)}-аас хойш төлөвлөсөн өөрчлөлт байна — «Төлөвлөсөн өөрчлөлт»-өөс шийдэх эсвэл хойших огноо сонгоно уу</span>
          </p>
        )}
        {problem && problem !== "Өөрчлөлт алга" && <p className="text-sm text-ink-dim">{problem}</p>}
        {error && (
          <div role="alert" className="flex items-start gap-2 rounded-xl border border-error/30 bg-error/5 px-3 py-2 text-sm text-error">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
            <span>{error}</span>
          </div>
        )}
      </div>
    </Sheet>
  );
}

const STATUS_TEXT: Record<DayStatus, string | null> = {
  keep: null,
  off: null,
  change: "Өөрчлөгдөнө",
  add: "Шинэ",
  remove: "Хасагдана",
};

function DayRow({
  id,
  wd,
  day,
  status,
  check,
  swap,
  onSwap,
  onToggle,
  onChange,
}: {
  id: string;
  wd: number;
  day: DayState;
  status: DayStatus;
  check?: { conflicts: Conflict[]; clash: Slot | null; swapPossible: boolean };
  swap: boolean;
  onSwap: (v: boolean) => void;
  onToggle: () => void;
  onChange: (patch: Partial<DayState>) => void;
}) {
  const base = `${id}-d${wd}`;
  const tag = STATUS_TEXT[status];
  const presets = presetsFor(wd);
  // Танхим давхцлыг тусгай мөрөөр харуулна (солих боломжтой бол сонголттой)
  const others = (check?.conflicts ?? []).filter((c) => !(c.kind === "room" && c.other));
  const clash = check?.clash ?? null;
  return (
    <div className={cn("rounded-2xl border px-3 py-2", day.on ? "border-line bg-surface" : "border-dashed border-line")}>
      <div className="flex min-h-11 items-center gap-2">
        <button
          type="button"
          aria-pressed={day.on}
          aria-label={`${WEEKDAY_LABELS[wd]} — ${day.on ? "хичээлтэй" : "хичээлгүй"}`}
          onClick={onToggle}
          className={cn(
            "inline-flex size-11 shrink-0 items-center justify-center rounded-xl border text-sm font-bold transition",
            day.on ? "border-brand-bright bg-brand-bright text-on-brand" : "border-line text-ink hover:border-brand",
          )}
        >
          {WEEKDAY_SHORT[wd]}
        </button>
        <span className="cyrillic-tight min-w-0 flex-1 text-sm font-semibold text-ink">{WEEKDAY_LABELS[wd]}</span>
        {tag && (
          <span
            className={cn(
              "shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold",
              status === "remove" ? "bg-error/10 text-error" : status === "add" ? "bg-success/10 text-success" : "bg-info/10 text-info",
            )}
          >
            {tag}
          </span>
        )}
        {!day.on && !tag && <span className="text-xs text-ink-dim">Хичээлгүй</span>}
      </div>
      {day.on && (
        <div className="mt-2 grid grid-cols-2 gap-2 pb-1">
          <div className="col-span-2 flex flex-wrap gap-1.5">
            {presets.map(([s, e]) => {
              const active = day.start === s && day.end === e;
              return (
                <button
                  key={s}
                  type="button"
                  aria-pressed={active}
                  onClick={() => onChange({ start: s, end: e })}
                  className={cn(
                    "min-h-9 rounded-lg border px-2.5 text-xs font-semibold tabular-nums",
                    active ? "border-brand text-brand" : "border-line text-ink-dim hover:border-brand hover:text-ink",
                  )}
                >
                  {s}–{e}
                </button>
              );
            })}
          </div>
          <div>
            <label htmlFor={`${base}-s`} className="mb-1 block text-xs text-ink-dim">
              Эхлэх
            </label>
            <input id={`${base}-s`} type="time" value={day.start} onChange={(e) => onChange({ start: e.target.value })} className={cn(FIELD, "tabular-nums")} />
          </div>
          <div>
            <label htmlFor={`${base}-e`} className="mb-1 block text-xs text-ink-dim">
              Дуусах
            </label>
            <input id={`${base}-e`} type="time" value={day.end} onChange={(e) => onChange({ end: e.target.value })} className={cn(FIELD, "tabular-nums")} />
          </div>
          <div className="col-span-2">
            <label htmlFor={`${base}-r`} className="mb-1 block text-xs text-ink-dim">
              Танхим
            </label>
            <div className="flex items-center gap-2">
              <select id={`${base}-r`} value={day.room} onChange={(e) => onChange({ room: e.target.value })} className={FIELD}>
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
              <RoomBadge room={day.room || null} size="sm" />
            </div>
          </div>
          {clash && (
            <div className="col-span-2 space-y-1.5">
              <ConflictList
                conflicts={[{ text: `${day.room} танхимд ${WEEKDAY_LABELS[wd]} ${formatMinutes(clash.startMinute)}–${formatMinutes(clash.endMinute)} цагт ${clash.classLabel} анги орно`, blocking: !swap }]}
              />
              {check?.swapPossible && (
                <label className="flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-line px-3 text-sm text-ink">
                  <input type="checkbox" checked={swap} onChange={(e) => onSwap(e.target.checked)} className="size-4 accent-brand" />
                  <ArrowLeftRight className="size-4 shrink-0 text-ink-dim" aria-hidden />
                  <span>
                    Танхим солих — {clash.classLabel} анги {day.orig?.room} танхимд орно
                  </span>
                </label>
              )}
            </div>
          )}
          {others.length > 0 && (
            <div className="col-span-2">
              <ConflictList conflicts={others} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
