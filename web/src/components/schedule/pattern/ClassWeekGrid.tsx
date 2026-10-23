"use client";

import { type CSSProperties } from "react";
import { getClassroomColor } from "@/lib/classroomColor";
import { cn } from "@/lib/cn";
import RoomBadge from "../RoomBadge";
import { formatMinutes, WEEKDAY_LABELS, WEEKDAY_SHORT } from "../types";
import { bySlotTime, WEEK_ORDER, type Slot } from "./model";

/*
 * Анги × гараг тор (эзэн 2026-10-23): мөр = анги (9-1, 10-1, 11-1, 11-2, … 12-12,
 * 13-1, дараа нь НИЙГЭМ мэт нэртэй анги), багана = Да…Ня. Нүдэнд зөвхөн танхимын
 * дүрс (дугаартай) ба ЭХЛЭХ цаг — дуусах цаг, суудлын тоо харуулахгүй.
 * Хичээлгүй өдөр хоосон. Танхимын тор (PatternGrid)-той ижил эрхээр хичээл дээр
 * дарахад ижил SlotDialog нээгдэнэ; эрхгүй бол зөвхөн харна.
 */

export interface ClassWeekGridProps {
  slots: Slot[];
  caption: string;
  todayWeekday?: number;
  onSelect?: (slot: Slot) => void;
  canSelect?: (slot: Slot) => boolean;
  /** Ангийн нэр дээр дарахад ангийн 7 хоногийг нэг дор засах цонх (эзэн 2026-10-23) */
  onSelectClass?: (classroomId: string) => void;
  canSelectClass?: (classroomId: string) => boolean;
}

interface ClassRow {
  classroomId: string;
  label: string;
  className: string;
}

/** «12-3» → [12, 3]; тоон бус нэр (НИЙГЭМ) → null — тэд тоотой ангиудын ард */
function gradeKey(label: string): [number, number] | null {
  const m = label.trim().match(/^(\d+)\s*[-–]\s*(\d+)/);
  return m ? [Number(m[1]), Number(m[2])] : null;
}

export function byClassLabel(a: { label: string; className: string }, b: { label: string; className: string }): number {
  const ka = gradeKey(a.label);
  const kb = gradeKey(b.label);
  if (ka && kb) return ka[0] - kb[0] || ka[1] - kb[1] || a.className.localeCompare(b.className, "mn", { numeric: true });
  if (ka) return -1;
  if (kb) return 1;
  return a.label.localeCompare(b.label, "mn", { numeric: true }) || a.className.localeCompare(b.className, "mn", { numeric: true });
}

export default function ClassWeekGrid({ slots, caption, todayWeekday, onSelect, canSelect, onSelectClass, canSelectClass }: ClassWeekGridProps) {
  const cells = new Map<string, Slot[]>();
  const rowsById = new Map<string, ClassRow>();
  for (const s of slots) {
    const k = `${s.classroomId}|${s.weekday}`;
    cells.set(k, [...(cells.get(k) ?? []), s]);
    if (!rowsById.has(s.classroomId)) rowsById.set(s.classroomId, { classroomId: s.classroomId, label: s.classLabel, className: s.className });
  }
  for (const list of cells.values()) list.sort(bySlotTime);
  const rows = [...rowsById.values()].sort(byClassLabel);
  // Ижил товч нэртэй хоёр анги (жишээ нь өөр салбарт) байвал бүтэн нэрийг харуулна
  const labelCount = new Map<string, number>();
  for (const r of rows) labelCount.set(r.label, (labelCount.get(r.label) ?? 0) + 1);

  return (
    <div className="relative overflow-x-auto">
      <table className="w-full min-w-[38rem] table-fixed border-separate border-spacing-0 text-left">
        <caption className="sr-only">{caption}</caption>
        <colgroup>
          <col className="w-[4.75rem]" />
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
              Анги
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
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const label = (labelCount.get(row.label) ?? 0) > 1 ? row.className : row.label;
            const style = { "--cls": getClassroomColor(row.classroomId) } as CSSProperties;
            return (
              <tr key={row.classroomId}>
                <th
                  scope="row"
                  style={style}
                  className="class-row sticky left-0 z-10 border-b border-line bg-surface px-2 py-1.5 text-left align-middle text-sm font-bold text-ink shadow-[1px_0_0_0_var(--line)]"
                >
                  {onSelectClass && (!canSelectClass || canSelectClass(row.classroomId)) ? (
                    <button
                      type="button"
                      onClick={() => onSelectClass(row.classroomId)}
                      aria-label={`${label} анги — гараг, цаг, нэр засах`}
                      title="Гараг, цаг, нэр засах"
                      className="row-interactive -mx-1 flex min-h-11 w-[calc(100%+0.5rem)] cursor-pointer items-center rounded-md px-1 text-left underline decoration-line decoration-dotted underline-offset-4 hover:bg-bg hover:decoration-ink-dim"
                    >
                      <span className="block break-words leading-tight">{label}</span>
                    </button>
                  ) : (
                    <span className="block break-words leading-tight">{label}</span>
                  )}
                </th>
                {WEEK_ORDER.map((wd, i) => {
                  const list = cells.get(`${row.classroomId}|${wd}`) ?? [];
                  return (
                    <td
                      key={wd}
                      className={cn("border-b border-line p-1 align-middle", i > 0 && "border-l", wd === todayWeekday && "bg-brand-bright/[0.04]")}
                    >
                      {list.length > 0 && (
                        <div className="flex flex-col items-stretch gap-1">
                          {list.map((s) => (
                            <ClassCell
                              key={s.id}
                              slot={s}
                              label={label}
                              onSelect={onSelect && (!canSelect || canSelect(s)) ? onSelect : undefined}
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
        </tbody>
      </table>
    </div>
  );
}

function ClassCell({ slot, label, onSelect }: { slot: Slot; label: string; onSelect?: (slot: Slot) => void }) {
  const start = formatMinutes(slot.startMinute);
  const text = [`${label} анги`, `${WEEKDAY_LABELS[slot.weekday]} ${start}`, slot.room ? `${slot.room} танхим` : "Танхимгүй"].join(" — ");
  const body = (
    <>
      {slot.room ? <RoomBadge room={slot.room} size="sm" /> : <span className="text-[11px] font-semibold leading-tight text-ink-dim">Танхимгүй</span>}
      <span className="text-xs font-semibold leading-tight tabular-nums text-ink">{start}</span>
    </>
  );
  const base = "flex w-full flex-col items-center justify-center gap-0.5 rounded-md py-1";
  if (onSelect) {
    return (
      <button
        type="button"
        onClick={() => onSelect(slot)}
        aria-label={`${text} — засах`}
        title={text}
        className={cn(base, "row-interactive min-h-11 cursor-pointer hover:bg-bg")}
      >
        <span aria-hidden className="contents">
          {body}
        </span>
      </button>
    );
  }
  return (
    <div title={text} className={base}>
      <span className="sr-only">{text}</span>
      <span aria-hidden className="contents">
        {body}
      </span>
    </div>
  );
}
