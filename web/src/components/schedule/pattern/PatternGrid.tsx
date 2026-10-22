"use client";

import { CalendarClock, TriangleAlert } from "lucide-react";
import { Fragment, type CSSProperties } from "react";
import { getClassroomColor } from "@/lib/classroomColor";
import { cn } from "@/lib/cn";
import RoomBadge from "../RoomBadge";
import { roomCapacityOf, ROOMS, SUBJECT_LABEL, WEEKDAY_LABELS, WEEKDAY_SHORT } from "../types";
import { bySlotTime, dateLabel, NO_ROOM, OPTIONAL_GROUPS, ROOM_GROUPS, timeRange, WEEK_ORDER, type Slot } from "./model";

/*
 * Танхим × гараг тор (демогийн WeekGrid-ийн бүтэц): мөр = танхим (Баруун 4 дээр,
 * Зүүн 4 доор), багана = Да…Ня. ОГНООГҮЙ — 7 хоног бүр давтагдах тогтмол хуваарь.
 * Утсан дээр зөвхөн картын дотор хэвтээ гүйлгэнэ, танхимын багана наалттай.
 *
 * Дараа нь чирж зөөх (drag-and-drop) нэмэх бол: SlotBlock-ийг draggable болгож,
 * <td>-д onDrop → onMove(slot, { room, weekday }) дуудаад SlotDialog-ийг
 * шинэ танхим/гарагаар урьдчилж бөглөсөн байдлаар нээнэ (баталгаажуулалт хэвээр).
 */

export interface PatternGridProps {
  slots: Slot[];
  caption: string;
  /** "all" = бүх танхим тогтмол дараалалтай; "used" = зөвхөн хичээлтэй танхим */
  rooms?: "all" | "used";
  todayWeekday?: number;
  showDayCounts?: boolean;
  showOccupancy?: boolean;
  showTeacher?: boolean;
  /** Өгвөл тухайн хичээл товчлуур болно (засах эрхтэй бол л) */
  onSelect?: (slot: Slot) => void;
  canSelect?: (slot: Slot) => boolean;
  /** Тухайн хичээлийн мөрийг засах, устгах (WeeklyGrid-ийн хуучин боломж) */
  onDelete?: (slot: Slot) => void;
  today?: string;
}

interface RoomRow {
  key: string;
  room: string | null;
}

function buildRows(slots: Slot[], mode: "all" | "used"): { title: string; rows: RoomRow[] }[] {
  const used = new Set(slots.map((s) => s.room ?? NO_ROOM));
  const groups: { title: string; rows: RoomRow[] }[] = [];
  for (const g of ROOM_GROUPS) {
    const rooms = g.rooms.filter((r) => (mode === "all" && !OPTIONAL_GROUPS.has(g.title)) || used.has(r));
    if (rooms.length) groups.push({ title: g.title, rows: rooms.map((r) => ({ key: r, room: r })) });
  }
  const known = new Set(ROOMS.map((r) => r.value));
  const other = [...used].filter((r) => !known.has(r)).sort((a, b) => (a === NO_ROOM ? 1 : b === NO_ROOM ? -1 : a.localeCompare(b)));
  if (other.length) groups.push({ title: "Бусад", rows: other.map((r) => ({ key: r || "—", room: r || null })) });
  return groups;
}

export default function PatternGrid({
  slots,
  caption,
  rooms = "all",
  todayWeekday,
  showDayCounts = false,
  showOccupancy = true,
  showTeacher = false,
  onSelect,
  canSelect,
  onDelete,
  today,
}: PatternGridProps) {
  const cells = new Map<string, Slot[]>();
  for (const s of slots) {
    const k = `${s.room ?? NO_ROOM}|${s.weekday}`;
    cells.set(k, [...(cells.get(k) ?? []), s]);
  }
  for (const list of cells.values()) list.sort(bySlotTime);
  const groups = buildRows(slots, rooms);
  const perDay = (wd: number) => slots.filter((s) => s.weekday === wd).length;

  return (
    <div className="relative overflow-x-auto">
      <table className={cn("w-full table-fixed border-separate border-spacing-0 text-left", rooms === "all" ? "min-w-[54rem]" : "min-w-[46rem]")}>
        <caption className="sr-only">{caption}</caption>
        <colgroup>
          <col className="w-[5.25rem]" />
          {WEEK_ORDER.map((wd) => (
            <col key={wd} />
          ))}
        </colgroup>
        <thead>
          <tr>
            <th
              scope="col"
              className="sticky left-0 z-20 border-b border-line bg-surface px-2 py-2 text-xs font-semibold text-ink-dim shadow-[1px_0_0_0_var(--line)]"
            >
              Танхим
            </th>
            {WEEK_ORDER.map((wd, i) => {
              const isToday = wd === todayWeekday;
              return (
                <th
                  key={wd}
                  scope="col"
                  className={cn("border-b border-line px-1 py-2 text-center font-normal", i > 0 && "border-l", isToday && "bg-brand-bright/[0.07]")}
                >
                  <abbr
                    title={WEEKDAY_LABELS[wd]}
                    className={cn("block text-sm font-bold no-underline", isToday ? "text-brand" : "text-ink")}
                  >
                    {WEEKDAY_SHORT[wd]}
                  </abbr>
                  {isToday && <span className="sr-only">, өнөөдөр</span>}
                  {showDayCounts && (
                    <span className="mt-0.5 block text-[11px] font-medium tabular-nums text-ink-dim">{perDay(wd)} хичээл</span>
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {groups.map((g) => (
            <Fragment key={g.title}>
              {groups.length > 1 || rooms === "all" ? (
                <tr>
                  <th scope="colgroup" colSpan={8} className="border-b border-line bg-bg p-0 text-left">
                    <span className="sticky left-0 inline-block px-2 py-1.5 text-xs font-bold text-ink">{g.title}</span>
                  </th>
                </tr>
              ) : null}
              {g.rows.map((row) => {
                const cap = roomCapacityOf(row.room);
                return (
                  <tr key={row.key}>
                    <th
                      scope="row"
                      className="sticky left-0 z-10 border-b border-line bg-surface p-1.5 text-center align-middle font-normal shadow-[1px_0_0_0_var(--line)]"
                    >
                      {/* Дүрс + суудлын тоо: нүдний ГОЛД, босоо ба хэвтээ (эзэн 2026-10-18) */}
                      <span className="flex flex-col items-center justify-center gap-0.5">
                        {row.room ? (
                          <RoomBadge room={row.room} size="md" />
                        ) : (
                          <span className="text-xs font-semibold text-ink-dim">Танхимгүй</span>
                        )}
                        {cap != null && <span className="block whitespace-nowrap text-[11px] leading-tight text-ink-dim">{cap} суудал</span>}
                      </span>
                    </th>
                    {WEEK_ORDER.map((wd, i) => {
                      const list = cells.get(`${row.room ?? NO_ROOM}|${wd}`) ?? [];
                      return (
                        <td
                          key={wd}
                          className={cn("border-b border-line p-1 align-top", i > 0 && "border-l", wd === todayWeekday && "bg-brand-bright/[0.04]")}
                        >
                          {list.length > 0 && (
                            <div className="space-y-1">
                              {list.map((s) => (
                                <SlotBlock
                                  key={s.id}
                                  slot={s}
                                  showOccupancy={showOccupancy}
                                  showTeacher={showTeacher}
                                  today={today}
                                  onSelect={onSelect && (!canSelect || canSelect(s)) ? onSelect : undefined}
                                  onDelete={onDelete}
                                />
                              ))}
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SlotBlock({
  slot,
  showOccupancy,
  showTeacher,
  onSelect,
  onDelete,
  today,
}: {
  slot: Slot;
  showOccupancy: boolean;
  showTeacher: boolean;
  onSelect?: (slot: Slot) => void;
  onDelete?: (slot: Slot) => void;
  today?: string;
}) {
  const capacity = roomCapacityOf(slot.room);
  const students = slot.students;
  const occ = showOccupancy && students != null && capacity != null;
  const over = occ && students! > capacity!;
  const endKey = slot.seriesTo !== undefined ? slot.seriesTo : slot.to;
  const ends = endKey ? `${dateLabel(endKey, today, false)} хүртэл` : null;
  const label = [
    `${slot.classLabel} анги`,
    `${WEEKDAY_LABELS[slot.weekday]} ${timeRange(slot)}`,
    slot.room ? `${slot.room} танхим` : null,
    occ ? `${students} сурагч, ${capacity} суудал${over ? ", суудал дутна" : ""}` : null,
    ends,
  ]
    .filter(Boolean)
    .join(" — ");

  const body = (
    <>
      <span className="flex items-center gap-1 text-[11px] leading-tight tabular-nums text-ink-dim">
        {timeRange(slot)}
        {ends && <CalendarClock className="size-3 shrink-0 text-ink-dim" aria-hidden />}
      </span>
      <span className="flex flex-wrap items-center justify-between gap-x-1">
        <span className="shrink-0 text-sm font-bold text-ink">{slot.classLabel}</span>
        {occ && (
          <span className={cn("inline-flex shrink-0 items-center gap-0.5 text-xs tabular-nums", over ? "font-bold text-ink" : "font-semibold text-ink-dim")}>
            {over && <TriangleAlert className="size-3 text-warning" aria-hidden />}
            {students}/{capacity}
          </span>
        )}
      </span>
      {(showTeacher && slot.teacherName) || slot.subject ? (
        <span className="block truncate text-[11px] leading-tight text-ink-dim">
          {[slot.subject ? (SUBJECT_LABEL[slot.subject] ?? slot.subject) : null, showTeacher ? slot.teacherName : null].filter(Boolean).join(", ")}
        </span>
      ) : null}
    </>
  );

  const style = { "--cls": getClassroomColor(slot.classroomId) } as CSSProperties;
  // Суудлаас хэтэрсэн анги: зөөлөн `warning` дэвсгэр (дүүргэлтийн зурвас байхгүй, зөвхөн тоо).
  // Дизайны «шар хориотой» дүрмийн цорын ганц зөвшөөрөгдсөн үл хамаарал (эзэн 2026-10-22).
  const base = cn("class-row block w-full rounded-md py-1 pl-1.5 pr-1.5 text-left", over ? "bg-warning/[0.13]" : "bg-bg");
  const block = onSelect ? (
    <button
      type="button"
      onClick={() => onSelect(slot)}
      aria-label={`${label} — засах`}
      title={label}
      style={style}
      className={cn(base, "class-row-interactive min-h-11 cursor-pointer")}
    >
      {body}
    </button>
  ) : (
    <div title={label} style={style} className={base}>
      <span className="sr-only">{label}</span>
      <span aria-hidden>{body}</span>
    </div>
  );
  if (!onDelete) return block;
  return (
    <div className="space-y-0.5">
      {block}
      <button
        type="button"
        onClick={() => onDelete(slot)}
        className="min-h-8 w-full rounded-md text-[11px] font-semibold text-error hover:bg-error/10"
      >
        Устгах
      </button>
    </div>
  );
}
