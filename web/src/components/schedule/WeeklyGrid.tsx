"use client";

import { useMemo, useSyncExternalStore } from "react";
import { getRole } from "@/lib/api";
import PatternGrid from "./pattern/PatternGrid";
import { toSlot } from "./pattern/model";
import { todayUBKey, type ScheduleEntry } from "./types";

interface Props {
  entries: ScheduleEntry[];
  todayWeekday: number;
  /** Өгвөл тухайн хичээл дээр дарж засна */
  onEdit?: (entry: ScheduleEntry) => void;
  onDelete?: (entry: ScheduleEntry) => void;
  emptyLabel?: string;
}

/**
 * Нэг анги эсвэл нэг багшийн 7 хоногийн давтагддаг хуваарь — Ерөнхий хуваарьтай
 * ИЖИЛ тор (танхим × Да…Ня), зөвхөн хичээлтэй танхимын мөрүүдээр. Огноогүй.
 * Сурагч, эцэг эхэд суудлын дүүргэлт харуулахгүй (ажилтны мэдээлэл).
 */
export default function WeeklyGrid({ entries, todayWeekday, onEdit, onDelete, emptyLabel = "Хичээл товлоогдоогүй" }: Props) {
  const role = useSyncExternalStore(
    () => () => {},
    getRole,
    () => null,
  );
  const slots = useMemo(() => entries.map((e) => toSlot(e)), [entries]);
  const byId = useMemo(() => new Map(entries.map((e) => [e.id, e])), [entries]);
  const staff = role === "ADMIN" || role === "TEACHER_PLUS" || role === "TEACHER";

  if (entries.length === 0) {
    return <p className="rounded-xl border border-dashed border-line px-4 py-6 text-center text-sm text-ink-dim">{emptyLabel}</p>;
  }

  return (
    <div className="rounded-xl border border-line bg-surface">
      <PatternGrid
        slots={slots}
        rooms="used"
        caption="7 хоногийн хуваарь: танхим, гараг, цаг"
        todayWeekday={todayWeekday}
        today={todayUBKey()}
        showOccupancy={staff}
        showTeacher
        onSelect={onEdit ? (s) => onEdit(byId.get(s.id)!) : undefined}
        onDelete={onDelete ? (s) => onDelete(byId.get(s.id)!) : undefined}
      />
    </div>
  );
}
