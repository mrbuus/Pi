"use client";

import { DoorOpen } from "lucide-react";
import {
  formatMinutes,
  SUBJECT_LABEL,
  WEEKDAY_LABELS,
  type ScheduleEntry,
} from "./types";

interface Props {
  entries: ScheduleEntry[];
  todayWeekday: number;
  /** Багш/админ горимд мөр бүрд засах/устгах товч үзүүлнэ */
  onEdit?: (entry: ScheduleEntry) => void;
  onDelete?: (entry: ScheduleEntry) => void;
  emptyLabel?: string;
}

function entriesByWeekday(entries: ScheduleEntry[]): ScheduleEntry[][] {
  const grouped: ScheduleEntry[][] = [[], [], [], [], [], [], []];
  for (const e of entries) {
    grouped[e.weekday]?.push(e);
  }
  for (const day of grouped) {
    day.sort((a, b) => a.startMinute - b.startMinute);
  }
  return grouped;
}

function EntryCard({
  entry,
  onEdit,
  onDelete,
}: {
  entry: ScheduleEntry;
  onEdit?: (entry: ScheduleEntry) => void;
  onDelete?: (entry: ScheduleEntry) => void;
}) {
  return (
    <div className="rounded-xl border border-line bg-surface p-3 text-sm">
      <p className="font-bold text-brand-soft">
        {formatMinutes(entry.startMinute)}–{formatMinutes(entry.endMinute)}
      </p>
      <p className="mt-1 font-semibold">{entry.classroom.name}</p>
      <p className="mt-0.5 text-ink-dim">
        {entry.teacher
          ? `${entry.teacher.firstName} ${entry.teacher.lastName}`
          : "Багш товлогдоогүй"}
      </p>
      <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs">
        {entry.room && (
          <span className="inline-flex items-center gap-1 rounded-full border border-line px-2 py-0.5 text-ink-dim">
            <DoorOpen className="h-3 w-3" aria-hidden /> {entry.room}
          </span>
        )}
        {entry.subject && (
          <span className="rounded-full bg-brand-bright/15 px-2 py-0.5 text-brand-soft">
            {SUBJECT_LABEL[entry.subject] ?? entry.subject}
          </span>
        )}
      </div>
      {(onEdit || onDelete) && (
        <div className="mt-2 flex gap-2 border-t border-line pt-2">
          {onEdit && (
            <button
              type="button"
              onClick={() => onEdit(entry)}
              className="rounded-lg border border-line px-2 py-1 text-xs transition hover:border-brand"
            >
              ✎ Засах
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              onClick={() => onDelete(entry)}
              className="rounded-lg border border-error/40 px-2 py-1 text-xs text-error transition hover:bg-error/10"
            >
              ✕ Устгах
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * 7 хоногийн давтагддаг хуваарийн тор. Дэлгэц том дээр 7 багана (өдөр тус
 * бүр багана), жижиг дэлгэцэд (mobile) 7 баганыг шахахын оронд өдөр өдрөөр
 * жагссан жагсаалт болгож задална.
 */
export default function WeeklyGrid({
  entries,
  todayWeekday,
  onEdit,
  onDelete,
  emptyLabel = "Хичээл товлоогдоогүй",
}: Props) {
  const grouped = entriesByWeekday(entries);

  return (
    <div>
      {/* ---- Desktop/tablet: 7 баганатай тор ---- */}
      <div className="hidden gap-3 sm:grid sm:grid-cols-7">
        {WEEKDAY_LABELS.map((label, weekday) => {
          const isToday = weekday === todayWeekday;
          return (
            <div
              key={label}
              className={`rounded-2xl border p-2 ${
                isToday
                  ? "border-brand-bright bg-brand-bright/5"
                  : "border-line bg-panel"
              }`}
            >
              <div className="mb-2 flex items-center justify-between gap-1 px-1">
                <p className={`text-sm font-bold ${isToday ? "text-brand-soft" : ""}`}>
                  {label}
                </p>
                {isToday && (
                  <span className="rounded-full bg-brand-bright px-1.5 py-0.5 text-[10px] font-bold text-on-brand">
                    ӨНӨӨДӨР
                  </span>
                )}
              </div>
              <div className="space-y-2">
                {grouped[weekday].length === 0 ? (
                  <p className="px-1 text-xs text-ink-dim">{emptyLabel}</p>
                ) : (
                  grouped[weekday].map((entry) => (
                    <EntryCard
                      key={entry.id}
                      entry={entry}
                      onEdit={onEdit}
                      onDelete={onDelete}
                    />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* ---- Mobile: өдөр өдрөөр жагссан жагсаалт ---- */}
      <div className="space-y-4 sm:hidden">
        {WEEKDAY_LABELS.map((label, weekday) => {
          const isToday = weekday === todayWeekday;
          return (
            <div
              key={label}
              className={`rounded-2xl border p-3 ${
                isToday
                  ? "border-brand-bright bg-brand-bright/5"
                  : "border-line bg-panel"
              }`}
            >
              <div className="mb-2 flex items-center gap-2">
                <p className={`font-bold ${isToday ? "text-brand-soft" : ""}`}>
                  {label}
                </p>
                {isToday && (
                  <span className="rounded-full bg-brand-bright px-1.5 py-0.5 text-[10px] font-bold text-on-brand">
                    ӨНӨӨДӨР
                  </span>
                )}
              </div>
              <div className="space-y-2">
                {grouped[weekday].length === 0 ? (
                  <p className="text-xs text-ink-dim">{emptyLabel}</p>
                ) : (
                  grouped[weekday].map((entry) => (
                    <EntryCard
                      key={entry.id}
                      entry={entry}
                      onEdit={onEdit}
                      onDelete={onDelete}
                    />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
