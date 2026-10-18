"use client";

import { ArrowRight, CalendarClock, ChevronRight } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";
import { getClassroomColor } from "@/lib/classroomColor";
import { cn } from "@/lib/cn";
import RoomBadge from "../RoomBadge";
import { WEEKDAY_LABELS } from "../types";
import { dateLabel, effectiveDate, timeRange, type Planned, type Slot } from "./model";

/**
 * Тор нь ӨНӨӨДӨР мөрдөгдөж буй хуваарийг л харуулна. «X өдрөөс» хийсэн өөрчлөлт,
 * дуусах огноотой цаг, ирээдүйд эхлэх шинэ цаг энд жагсагдана — ингэснээр
 * хадгалсан өөрчлөлт «алга болсон» мэт санагдахгүй. Засах эрхтэй бол мөр дээр
 * дарж засна/цуцална.
 */
export default function PlannedChanges({
  items,
  today,
  canSelect,
  onSelect,
}: {
  items: Planned[];
  today: string;
  canSelect: (slot: Slot) => boolean;
  onSelect: (item: Planned) => void;
}) {
  if (items.length === 0) return null;
  return (
    <section aria-labelledby="planned-title" className="rounded-xl border border-line bg-surface">
      <h3 id="planned-title" className="flex items-center gap-2 border-b border-line px-3 py-2 text-sm font-bold text-ink">
        <CalendarClock className="size-4 text-ink-dim" aria-hidden />
        Төлөвлөсөн өөрчлөлт
      </h3>
      <ul className="divide-y divide-line">
        {items.map((p) => {
          const editable = canSelect(p.slot);
          const content = (
            <>
              <span className="w-full shrink-0 text-xs font-semibold tabular-nums text-ink-dim sm:w-56">
                {dateLabel(effectiveDate(p), today)} гарагаас
              </span>
              <span className="min-w-0 flex-1 text-sm text-ink">
                <b className="mr-1.5">{p.slot.classLabel}</b>
                <Describe item={p} />
              </span>
              {editable && <ChevronRight className="size-4 shrink-0 text-ink-dim" aria-hidden />}
            </>
          );
          const style = { "--cls": getClassroomColor(p.slot.classroomId) } as CSSProperties;
          const cls = "class-row flex w-full flex-wrap items-center gap-x-3 gap-y-0.5 px-3 py-2 text-left sm:flex-nowrap";
          return (
            <li key={`${p.kind}-${p.slot.id}`}>
              {editable ? (
                <button type="button" onClick={() => onSelect(p)} style={style} className={cn(cls, "class-row-interactive min-h-11")}>
                  {content}
                </button>
              ) : (
                <div style={style} className={cls}>
                  {content}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function SlotText({ slot }: { slot: Slot }) {
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5 align-middle">
      {WEEKDAY_LABELS[slot.weekday]} <span className="tabular-nums">{timeRange(slot)}</span>
      {slot.room ? <RoomBadge room={slot.room} size="sm" /> : null}
    </span>
  );
}

function Describe({ item }: { item: Planned }): ReactNode {
  if (item.kind === "end") {
    return (
      <span className="inline-flex flex-wrap items-center gap-1.5">
        <SlotText slot={item.slot} />
        <span className="text-ink-dim">хуваариас хасагдана</span>
      </span>
    );
  }
  if (item.previous) {
    return (
      <span className="inline-flex flex-wrap items-center gap-1.5">
        <SlotText slot={item.previous} />
        <ArrowRight className="size-3.5 text-ink-dim" aria-label="болно" />
        <SlotText slot={item.slot} />
      </span>
    );
  }
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      <span className="text-ink-dim">{item.kind === "new" ? "шинэ цаг" : "шинэ утга"}</span>
      <SlotText slot={item.slot} />
    </span>
  );
}
