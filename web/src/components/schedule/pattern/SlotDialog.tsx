"use client";

import { ArrowLeft, ArrowLeftRight, ArrowRight, CalendarOff, PencilLine, RotateCcw, TriangleAlert } from "lucide-react";
import { useId, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/kit/button";
import { Meta } from "@/components/ui/Meta";
import { api } from "@/lib/api";
import { cn } from "@/lib/cn";
import RoomBadge from "../RoomBadge";
import { addDaysToKey, formatMinutes, ROOMS, timeToMinutes, WEEKDAY_LABELS } from "../types";
import {
  chainOf,
  dateLabel,
  findConflicts,
  friendlyError,
  lastBefore,
  nextOnOrAfter,
  personName,
  timeRange,
  WEEK_ORDER,
  type ClassInfo,
  type Conflict,
  type Planned,
  type Slot,
  type TeacherOption,
} from "./model";
import Sheet, { Field, FIELD } from "./Sheet";

type Mode = "change" | "end" | "resume";
type Scope = "from" | "all";

const ROOM_BRANCHES = Array.from(new Set(ROOMS.map((r) => r.branch)));

/**
 * Нэг ангийн НЭГ давтагддаг цагийг засах (эзэн 2026-10-18):
 *  - Гараг / цаг / танхим / багш солих: «X өдрөөс эхлэн» (POST /schedule/:id/split —
 *    өмнөх хичээлүүд хуучнаараа) эсвэл «анхнаас нь засах» (PATCH — алдаа засвар)
 *  - Энэ цагийг X өдрөөс хасах (PATCH effectiveTo = X − 1; эхлээгүй бол DELETE)
 * Хадгалахаас өмнө өөрчлөлтийн хураангуй + давхцлын анхааруулга заавал харагдана.
 */
export default function SlotDialog({
  slot,
  planned,
  slots,
  classes,
  teachers,
  today,
  onClose,
  onSaved,
}: {
  slot: Slot;
  /** Төлөвлөсөн өөрчлөлтийн жагсаалтаас нээсэн бол */
  planned: Planned | null;
  slots: Slot[];
  classes: Map<string, ClassInfo>;
  teachers: TeacherOption[];
  today: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const id = useId();
  const future = slot.from > today;
  const classInfo = classes.get(slot.classroomId);
  const classTeacher = classInfo?.teacherName ?? null;
  // Ижил утгатай залгаа мөрүүд нэг цуврал — үйлдэл бүгдэд нь үйлчилнэ
  const chain = useMemo(() => chainOf(slot, slots), [slot, slots]);
  const seriesTo = chain[chain.length - 1].to;
  const segAt = (d: string) => Math.max(0, chain.findIndex((x) => x.from <= d && (x.to === null || x.to >= d)));

  // Огнооны хязгаар: өнгөрсөн түүхийг «X өдрөөс» горимоор өөрчлөхгүй
  const minDate = future ? slot.from : today;
  const maxDate = seriesTo ?? undefined;
  const clamp = (d: string) => (maxDate && d > maxDate ? maxDate : d < minDate ? minDate : d);
  const defaultFrom = clamp(nextOnOrAfter(slot.weekday, addDaysToKey(today, 1)));

  const [mode, setMode] = useState<Mode>(planned?.kind === "end" ? "resume" : "change");
  const [weekday, setWeekday] = useState(slot.weekday);
  const [start, setStart] = useState(formatMinutes(slot.startMinute));
  const [end, setEnd] = useState(formatMinutes(slot.endMinute));
  const [room, setRoom] = useState(slot.room ?? "");
  const [teacherId, setTeacherId] = useState(slot.teacherId ?? "");
  const [scope, setScope] = useState<Scope>(future ? "all" : "from");
  const [fromDate, setFromDate] = useState(defaultFrom);
  const [endFrom, setEndFrom] = useState(future ? slot.from : defaultFrom);
  const [step, setStep] = useState<"form" | "confirm">("form");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [swapWanted, setSwapWanted] = useState(false);

  // Split-ээр үүссэн ирээдүйн мөрийг устгавал өмнөх мөр нь дууссан тул цоорхой үүснэ —
  // түүнийг «Өөрчлөлтийг цуцлах»-аар л буцаана
  const options: { mode: Mode; label: string; icon: ReactNode }[] = [
    ...(planned?.kind === "end" ? [{ mode: "resume" as Mode, label: "Үргэлжлүүлэх", icon: <RotateCcw aria-hidden /> }] : []),
    { mode: "change", label: "Өөрчлөх", icon: <PencilLine aria-hidden /> },
    ...(planned?.kind === "change" ? [] : [{ mode: "end" as Mode, label: future ? "Цуцлах" : "Хасах", icon: <CalendarOff aria-hidden /> }]),
  ];

  const startMinute = timeToMinutes(start);
  const endMinute = timeToMinutes(end);
  const newRoom = room || null;
  const newTeacher = teacherId || null;

  const teacherLabel = (tid: string | null) =>
    tid ? (personName(teachers.find((t) => t.id === tid)) ?? (tid === slot.teacherId ? slot.teacherName : null) ?? "Сонгосон багш") : `Ангийн багш${classTeacher ? ` (${classTeacher})` : ""}`;

  const effFrom = scope === "from" && !future ? fromDate : slot.from;
  const conflicts = useMemo(
    () =>
      mode === "change"
        ? findConflicts(
            { ignoreIds: chain.map((x) => x.id), classroomId: slot.classroomId, weekday, startMinute, endMinute, room: newRoom, teacherId: newTeacher, from: effFrom, to: seriesTo },
            slots,
            classes,
            slot.students,
          ).filter((c) => c.kind !== "capacity" || newRoom !== slot.room)
        : [],
    [mode, slot, chain, seriesTo, weekday, startMinute, endMinute, newRoom, newTeacher, effFrom, slots, classes],
  );
  // Өөр ангитай танхим давхцсан бол хадгалахыг ХААНА — «Танхим солих»-оор л шийдэгдэнэ
  // (хоёр анги танхимаа солино). Хоёр талд бодит танхим байх ёстой.
  const roomClash = conflicts.find((c) => c.kind === "room" && c.other && newRoom !== slot.room)?.other ?? null;
  const swapPossible = !!roomClash && !!slot.room && slot.room !== "Онлайн" && !!roomClash.room && roomClash.room !== "Онлайн";
  const swap = swapPossible && swapWanted;
  const blocking = conflicts.some((c) => c.blocking) || (!!roomClash && !swap);
  const otherStudents = roomClash ? (classes.get(roomClash.classroomId)?.students ?? roomClash.students ?? null) : null;
  const slotCap = slot.room ? (ROOMS.find((r) => r.value === slot.room)?.capacity ?? null) : null;
  const otherOver = swap && otherStudents != null && slotCap != null && otherStudents > slotCap ? otherStudents - slotCap : 0;
  // «Танхим» давхцлыг тусгай карт болгож харуулна — жагсаалтаас хасна
  const shownConflicts: Conflict[] = [
    ...conflicts.filter((c) => c.kind !== "room" || !c.other || newRoom === slot.room),
    ...(otherOver > 0 ? [{ kind: "capacity" as const, blocking: false, text: `${roomClash?.classLabel}: сурагчдын тоо суудлаас ${otherOver}-ээр хэтэрнэ` }] : []),
  ];

  const changes = useMemo(() => {
    const out: { key: string; label: string; before: ReactNode; after: ReactNode }[] = [];
    if (weekday !== slot.weekday) out.push({ key: "wd", label: "Гараг", before: WEEKDAY_LABELS[slot.weekday], after: WEEKDAY_LABELS[weekday] });
    if (startMinute !== slot.startMinute || endMinute !== slot.endMinute)
      out.push({ key: "time", label: "Цаг", before: timeRange(slot), after: timeRange({ startMinute, endMinute }) });
    if (newRoom !== (slot.room ?? null))
      out.push({ key: "room", label: "Танхим", before: <RoomCell room={slot.room} />, after: <RoomCell room={newRoom} /> });
    if (swap && roomClash)
      out.push({ key: "swap", label: `Танхим (${roomClash.classLabel})`, before: <RoomCell room={roomClash.room} />, after: <RoomCell room={slot.room} /> });
    if (newTeacher !== (slot.teacherId ?? null))
      out.push({ key: "teacher", label: "Багш", before: teacherLabel(slot.teacherId), after: teacherLabel(newTeacher) });
    return out;
    // teacherLabel нь teachers-ээс хамаарна
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekday, startMinute, endMinute, newRoom, newTeacher, slot, teachers, swap, roomClash]);

  const problem = (() => {
    if (mode === "change") {
      if (!start || !end) return "Цагаа бөглөнө үү";
      if (endMinute <= startMinute) return "Дуусах цаг эхлэх цагаас хойш байх ёстой";
      if (changes.length === 0) return "Өөрчлөх утгаа сонгоно уу";
      if (scope === "from" && !future && (!fromDate || fromDate < minDate || (maxDate && fromDate > maxDate))) return "Огноо хүчинтэй хугацаанд байх ёстой";
    }
    if (mode === "end" && (!endFrom || endFrom < minDate || (maxDate && endFrom > maxDate))) return "Огноо хүчинтэй хугацаанд байх ёстой";
    return null;
  })();

  function changeStart(v: string) {
    const dur = endMinute - startMinute;
    setStart(v);
    if (dur > 0 && v) {
      const next = timeToMinutes(v) + dur;
      if (next < 24 * 60) setEnd(formatMinutes(next));
    }
  }

  function restorePrevious() {
    const p = planned?.previous;
    if (!p) return;
    setMode("change");
    setWeekday(p.weekday);
    setStart(formatMinutes(p.startMinute));
    setEnd(formatMinutes(p.endMinute));
    setRoom(p.room ?? "");
    setTeacherId(p.teacherId ?? "");
    setScope("all");
    setError(null);
    setStep("confirm");
  }

  // Хадгалах үйлдэл: аль endpoint, ямар үр дагавартай
  const deletes = mode === "end" && endFrom <= chain[0].from;
  const splits = mode === "change" && scope === "from" && !future && fromDate > slot.from;

  async function save() {
    setSaving(true);
    setError(null);
    const body = { weekday, startMinute, endMinute, room: newRoom, teacherId: newTeacher };
    const patch = (rowId: string, b: object) => api(`/schedule/${rowId}`, { method: "PATCH", body: b });
    try {
      if (mode === "change" && swap && roomClash) {
        // «Танхим солих»: хоёр ангийн танхимыг НЭГ дуудлагаар (атомар) солино
        await api(`/schedule/${chain[segAt(effFrom)].id}/swap-room`, {
          method: "POST",
          body: { otherId: roomClash.id, from: effFrom, ...body },
        });
      } else if (mode === "resume") {
        await patch(chain[chain.length - 1].id, { effectiveTo: null });
      } else if (mode === "end") {
        // Тухайн өдрийг агуулсан хэсгийг хаана, түүнээс хойших (ирээдүйн) хэсгүүдийг устгана
        const k = segAt(endFrom);
        for (const later of chain.slice(k + 1).reverse()) await api(`/schedule/${later.id}`, { method: "DELETE" });
        if (endFrom <= chain[k].from) await api(`/schedule/${chain[k].id}`, { method: "DELETE" });
        else await patch(chain[k].id, { effectiveTo: addDaysToKey(endFrom, -1) });
      } else if (splits) {
        const k = segAt(fromDate);
        if (fromDate > chain[k].from) await api(`/schedule/${chain[k].id}/split`, { method: "POST", body: { from: fromDate, ...body } });
        else await patch(chain[k].id, body);
        for (const later of chain.slice(k + 1)) await patch(later.id, body);
      } else {
        // «Анхнаас нь» — PATCH (split-ийн REPLACE_ALL нь null-ийг цэвэрлэдэггүй тул PATCH)
        for (const part of chain) await patch(part.id, body);
      }
      toast.success(
        mode === "change" && swap && roomClash
          ? `${slot.classLabel} ба ${roomClash.classLabel}: танхим солигдлоо`
          : mode === "resume"
          ? `${slot.classLabel}: хуваарь цаашид үргэлжилнэ`
          : mode === "end"
            ? `${slot.classLabel}: ${deletes ? "цаг устлаа" : `${dateLabel(endFrom, today)} гарагаас хасагдлаа`}`
            : `${slot.classLabel}: ${splits ? `${dateLabel(fromDate, today)} гарагаас өөрчлөгдөнө` : "засагдлаа"}`,
      );
      onSaved();
    } catch (e) {
      setError(friendlyError(e instanceof Error ? e.message : "Хадгалж чадсангүй"));
    } finally {
      setSaving(false);
    }
  }

  const lastOld = splits ? lastBefore(slot.weekday, fromDate, slot.from) : null;
  const firstNew = splits ? nextOnOrAfter(weekday, fromDate) : null;
  const lastEnd = mode === "end" && !deletes ? lastBefore(slot.weekday, endFrom, slot.from) : null;

  const title = `${slot.classLabel} анги`;
  const description = (
    <Meta
      items={[
        WEEKDAY_LABELS[slot.weekday],
        <span key="t" className="tabular-nums">{timeRange(slot)}</span>,
        slot.room ? `${slot.room} танхим` : "Танхимгүй",
        future ? `${dateLabel(slot.from, today)} гарагаас эхэлнэ` : seriesTo ? `${dateLabel(seriesTo, today, false)} хүртэл` : null,
      ]}
    />
  );

  const footer =
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
        <Button
          size="sm"
          type="button"
          variant={mode === "end" ? "danger" : "default"}
          disabled={saving || blocking}
          onClick={save}
        >
          {saving ? "Хадгалж байна…" : mode === "end" ? (deletes ? "Устгах" : "Хасах") : "Хадгалах"}
        </Button>
      </>
    );

  return (
    <Sheet open onOpenChange={(o) => !o && !saving && onClose()} title={title} description={description} footer={footer}>
      {step === "form" ? (
        <div className="space-y-4">
          {options.length > 1 && (
            <div role="group" aria-label="Юу хийх вэ" className={cn("grid gap-1 rounded-2xl bg-bg p-1", options.length === 3 ? "grid-cols-3" : "grid-cols-2")}>
              {options.map((o) => (
                <Seg key={o.mode} active={mode === o.mode} onClick={() => { setMode(o.mode); setError(null); }} icon={o.icon}>
                  {o.label}
                </Seg>
              ))}
            </div>
          )}

          {planned?.previous && mode !== "end" && (
            <div className="rounded-2xl border border-line p-3 text-sm">
              <p className="text-ink-dim">
                Өмнө нь: <span className="font-semibold text-ink">{WEEKDAY_LABELS[planned.previous.weekday]} {timeRange(planned.previous)}</span>
                {planned.previous.room ? `, ${planned.previous.room} танхим` : ""}
              </p>
              <Button variant="secondary" size="sm" type="button" className="mt-2" onClick={restorePrevious}>
                <RotateCcw aria-hidden />
                Өөрчлөлтийг цуцлах
              </Button>
            </div>
          )}

          {mode === "resume" && (
            <p className="text-sm text-ink">
              Энэ цаг <b>{dateLabel(seriesTo ?? slot.to ?? today, today)}</b> гарагт дуусахаар төлөвлөгдсөн
            </p>
          )}

          {mode === "change" && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Гараг" htmlFor={`${id}-wd`}>
                  <select id={`${id}-wd`} value={weekday} onChange={(e) => setWeekday(Number(e.target.value))} className={FIELD}>
                    {WEEK_ORDER.map((d) => (
                      <option key={d} value={d}>
                        {WEEKDAY_LABELS[d]}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Танхим" htmlFor={`${id}-room`}>
                  <div className="flex items-center gap-2">
                    <select id={`${id}-room`} value={room} onChange={(e) => setRoom(e.target.value)} className={FIELD}>
                      {room && !ROOMS.some((r) => r.value === room) && <option value={room}>{room}</option>}
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
                    <RoomBadge room={newRoom} size="sm" />
                  </div>
                </Field>
                <Field label="Эхлэх цаг" htmlFor={`${id}-start`}>
                  <input id={`${id}-start`} type="time" value={start} onChange={(e) => changeStart(e.target.value)} className={cn(FIELD, "tabular-nums")} />
                </Field>
                <Field label="Багш" htmlFor={`${id}-teacher`} wide>
                  <select id={`${id}-teacher`} value={teacherId} onChange={(e) => setTeacherId(e.target.value)} className={FIELD}>
                    <option value="">{teacherLabel(null)}</option>
                    {slot.teacherId && !teachers.some((t) => t.id === slot.teacherId) && (
                      <option value={slot.teacherId}>{slot.teacherName ?? "Одоогийн багш"}</option>
                    )}
                    {teachers.map((t) => (
                      <option key={t.id} value={t.id}>
                        {personName(t)}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>

              {future ? (
                <p className="text-sm text-ink-dim">Энэ цаг хараахан эхлээгүй тул шууд засагдана</p>
              ) : (
                <fieldset className="space-y-2">
                  <legend className="mb-1 text-sm text-ink-dim">Хэзээнээс</legend>
                  <ScopeOption checked={scope === "from"} onChange={() => setScope("from")} name={`${id}-scope`} title="Тодорхой өдрөөс эхлэн" hint="Өмнөх хичээлүүд хуучнаараа үлдэнэ">
                    {scope === "from" && (
                      <input
                        type="date"
                        aria-label="Өөрчлөлт эхлэх өдөр"
                        value={fromDate}
                        min={minDate}
                        max={maxDate}
                        onChange={(e) => setFromDate(e.target.value)}
                        className={cn(FIELD, "mt-2")}
                      />
                    )}
                  </ScopeOption>
                  <ScopeOption checked={scope === "all"} onChange={() => setScope("all")} name={`${id}-scope`} title="Анхнаас нь засах" hint="Буруу оруулсныг засахад — өнгөрсөн хичээлүүд ч шинэ утгаар харагдана" />
                </fieldset>
              )}
              {roomClash && (
                <SwapCard
                  clash={roomClash}
                  ownRoom={slot.room}
                  newRoom={newRoom}
                  possible={swapPossible}
                  checked={swap}
                  onChange={setSwapWanted}
                />
              )}
              <ConflictList conflicts={shownConflicts} />
            </>
          )}

          {mode === "end" && (
            <div className="space-y-2">
              <label htmlFor={`${id}-endfrom`} className="block text-sm text-ink-dim">
                Хэдний өдрөөс эхлэн хичээлгүй болох
              </label>
              <input id={`${id}-endfrom`} type="date" value={endFrom} min={minDate} max={maxDate} onChange={(e) => setEndFrom(e.target.value)} className={FIELD} />
              {endFrom && !problem && (
                <p className="text-sm text-ink-dim">
                  {deletes ? "Энэ цаг огт болоогүй тул бүр мөсөн устгана" : lastEnd ? `Сүүлийн хичээл: ${dateLabel(lastEnd, today)}` : "Энэ өдрөөс эхлэн хичээлгүй"}
                </p>
              )}
            </div>
          )}

          {problem && (mode !== "change" || changes.length > 0) && <p className="text-sm text-error">{problem}</p>}
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm font-semibold text-ink">Хадгалахаас өмнө шалгана уу</p>
          {mode === "change" && (
            <div className="overflow-hidden rounded-2xl border border-line">
              <table className="w-full text-sm">
                <caption className="sr-only">Өөрчлөлт</caption>
                <thead className="bg-bg text-xs text-ink-dim">
                  <tr>
                    <th scope="col" className="px-3 py-2 text-left font-semibold"> </th>
                    <th scope="col" className="px-3 py-2 text-left font-semibold">Одоо</th>
                    <th scope="col" className="px-3 py-2 text-left font-semibold">Шинэ</th>
                  </tr>
                </thead>
                <tbody>
                  {changes.map((c) => (
                    <tr key={c.key} className="border-t border-line">
                      <th scope="row" className="px-3 py-2 text-left font-normal text-ink-dim">{c.label}</th>
                      <td className="px-3 py-2 tabular-nums text-ink-dim line-through decoration-ink/30">{c.before}</td>
                      <td className="px-3 py-2 font-semibold tabular-nums text-ink">{c.after}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <ul className="space-y-1.5 text-sm text-ink">
            {mode === "change" && splits && (
              <>
                <li>Хэзээнээс: <b>{dateLabel(fromDate, today)}</b></li>
                <li className="text-ink-dim">{lastOld ? `Хуучин цагийн сүүлийн хичээл: ${dateLabel(lastOld, today)}` : "Хуучин цагаар өөр хичээл болохгүй"}</li>
                {firstNew && (!maxDate || firstNew <= maxDate) && <li className="text-ink-dim">Шинэ цагийн эхний хичээл: {dateLabel(firstNew, today)}</li>}
              </>
            )}
            {mode === "change" && !splits && (
              <li>{future ? "Төлөвлөсөн цаг шууд засагдана" : "Анхнаас нь засна — өнгөрсөн хичээлүүд ч шинэ утгаар харагдана"}</li>
            )}
            {mode === "end" && (
              <li>
                {deletes
                  ? "Энэ цаг бүр мөсөн устгагдана — сэдэв, багшийн оноолт хамт устна"
                  : `${dateLabel(endFrom, today)} гарагаас эхлэн энэ цаг хуваариас хасагдана${lastEnd ? `, сүүлийн хичээл ${dateLabel(lastEnd, today)}` : ""}`}
              </li>
            )}
            {mode === "resume" && <li>Дуусах огноог арилгаж, энэ цаг цаашид 7 хоног бүр үргэлжилнэ</li>}
            <li className="text-ink-dim">Ангийн сурагч, багш нарт мэдэгдэл очно</li>
          </ul>
          <ConflictList conflicts={shownConflicts} />
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

function SwapCard({
  clash,
  ownRoom,
  newRoom,
  possible,
  checked,
  onChange,
}: {
  clash: Slot;
  ownRoom: string | null;
  newRoom: string | null;
  possible: boolean;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div role="group" aria-label="Танхим давхцаж байна" className={cn("space-y-2 rounded-2xl border p-3", checked ? "border-brand-bright bg-brand-bright/[0.05]" : "border-line bg-bg")}>
      <p className="text-sm text-ink">
        {newRoom} танхимд {WEEKDAY_LABELS[clash.weekday]} {timeRange(clash)} цагт <b>{clash.classLabel}</b> анги орно
      </p>
      {possible ? (
        <Button type="button" size="sm" variant={checked ? "default" : "outline"} aria-pressed={checked} onClick={() => onChange(!checked)}>
          <ArrowLeftRight aria-hidden />
          Танхим солих
        </Button>
      ) : (
        <p className="text-xs text-ink-dim">Танхимгүй эсвэл онлайн ангитай танхим солих боломжгүй — өөр танхим эсвэл цаг сонгоно уу</p>
      )}
      {possible && (
        <p className="text-xs text-ink-dim">
          {checked
            ? `${clash.classLabel} анги ${ownRoom} танхимд, энэ анги ${newRoom} танхимд орно — сонгосон огнооноос эхлэн`
            : "Солихгүй бол хадгалах боломжгүй — өөр танхим эсвэл цаг сонгоно уу"}
        </p>
      )}
    </div>
  );
}

function RoomCell({ room }: { room: string | null }) {
  if (!room) return <span>Танхимгүй</span>;
  return <RoomBadge room={room} size="sm" />;
}

function Seg({ active, onClick, icon, children }: { active: boolean; onClick: () => void; icon: ReactNode; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl px-2 text-sm font-semibold transition [&_svg]:size-4",
        active ? "bg-surface text-ink shadow-sm ring-1 ring-line" : "text-ink-dim hover:text-ink",
      )}
    >
      {icon}
      {children}
    </button>
  );
}

function ScopeOption({
  checked,
  onChange,
  name,
  title,
  hint,
  children,
}: {
  checked: boolean;
  onChange: () => void;
  name: string;
  title: string;
  hint: string;
  children?: ReactNode;
}) {
  return (
    <div className={cn("rounded-2xl border p-3", checked ? "border-brand-bright bg-brand-bright/[0.05]" : "border-line")}>
      <label className="flex cursor-pointer items-start gap-2.5">
        <input type="radio" name={name} checked={checked} onChange={onChange} className="mt-1 size-4 accent-[var(--brand-bright)]" />
        <span>
          <span className="block text-sm font-semibold text-ink">{title}</span>
          <span className="block text-xs text-ink-dim">{hint}</span>
        </span>
      </label>
      {children}
    </div>
  );
}

export function ConflictList({ conflicts }: { conflicts: { text: string; blocking: boolean }[] }) {
  const seen = new Set<string>();
  conflicts = conflicts.filter((c) => !seen.has(c.text) && !!seen.add(c.text));
  if (conflicts.length === 0) return null;
  return (
    <ul className="space-y-1.5" aria-label="Анхааруулга">
      {conflicts.map((c, i) => (
        <li
          key={i}
          className={cn(
            "flex items-start gap-2 rounded-xl px-3 py-2 text-sm",
            c.blocking ? "border border-error/30 bg-error/5 text-error" : "bg-warning/10 text-warning",
          )}
        >
          <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>
            {c.text}
            {c.blocking ? <span className="block text-xs">Ингэж хадгалах боломжгүй — цагаа өөрчилнө үү</span> : null}
          </span>
        </li>
      ))}
    </ul>
  );
}
