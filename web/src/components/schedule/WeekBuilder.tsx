"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  DoorOpen,
  Palmtree,
} from "lucide-react";
import { api } from "@/lib/api";
import { LoadingState, ErrorState } from "@/components/ui/StateBlock";
import { getClassroomColor } from "@/lib/classroomColor";
import RoomShape from "./RoomShape";
import EntryActionPanel from "./EntryActionPanel";
import {
  addDaysToKey,
  formatMinutes,
  SUBJECT_LABEL,
  todayUBKey,
  WEEKDAY_LABELS,
  type WeekDay,
  type WeekEntry,
  type WeekResponse,
} from "./types";

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : "Алдаа гарлаа";
}

/** Өгөгдсөн огнооны 7 хоногийн Даваа гарагийн огноог олно. */
function mondayOf(dateKey: string): string {
  const d = new Date(`${dateKey}T00:00:00.000Z`);
  const weekday = d.getUTCDay(); // 0=Ням…6=Бямба
  const diffToMonday = weekday === 0 ? -6 : 1 - weekday;
  return addDaysToKey(dateKey, diffToMonday);
}

function shortDate(dateKey: string): string {
  const [, month, day] = dateKey.split("-");
  return `${month}.${day}`;
}

function EntryRow({
  entry,
  faded,
  onClick,
}: {
  entry: WeekEntry;
  faded: boolean;
  onClick: () => void;
}) {
  const color = getClassroomColor(entry.classroomId);
  // Ангийн нэрээс " (Баруун 4)" / " (Зүүн 4)" салбарыг хасаж харуул
  const displayName = entry.classroomName.replace(/\s*\([^)]*\)$/, "");

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2 rounded-lg border border-line bg-surface px-3 py-2 text-left text-xs transition hover:border-brand ${
        faded ? "opacity-60" : ""
      }`}
      style={{ borderLeftColor: color, borderLeftWidth: 3 }}
      title={entry.classroomName}
    >
      {/* цаг */}
      <span className="shrink-0 font-bold text-brand-soft min-w-[50px]">
        {formatMinutes(entry.startMinute)}–{formatMinutes(entry.endMinute)}
      </span>

      {/* Танхимын дүрс — БУДАЛТГҮЙ, ink өнгөөр (эзний дүрэм). Ангийн өнгө нь
          дээрх зүүн зурвас (borderLeftColor) дээр аль хэдийн байгаа. */}
      {entry.room && (
        <div className="shrink-0 text-ink">
          <RoomShape room={entry.room} size={16} />
        </div>
      )}

      {/* танхимын дугаар жижгээр */}
      {entry.room && (
        <span className="shrink-0 text-ink-dim font-medium">{entry.room}</span>
      )}

      {/* ангийн нэр (салбарын нэр нь ХАСАГДСАН) */}
      <span className="truncate font-semibold text-ink">{displayName}</span>

      {/* зөөгдсөн / сэдэвтэй байвал жижиг тэмдэг */}
      <div className="ml-auto flex shrink-0 items-center gap-1">
        {entry.exception?.kind === "MOVED" && (
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-warning" aria-hidden title="Зөөгдсөн" />
        )}
        {entry.subject && (
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-brand-soft" aria-hidden title="Сэдэвтэй" />
        )}
      </div>
    </button>
  );
}

function DayColumn({
  day,
  isToday,
  onEntryClick,
}: {
  day: WeekDay;
  isToday: boolean;
  onEntryClick: (entry: WeekEntry) => void;
}) {
  return (
    <div
      className={`flex min-w-[230px] shrink-0 snap-start flex-col rounded-2xl border p-2 ${
        day.isHoliday
          ? "border-warning/40 bg-warning/5"
          : isToday
            ? "border-brand-bright bg-brand-bright/5"
            : "border-line bg-panel"
      }`}
    >
      {/* Байрлалын хэргэлэл. Өдрийн нэр, огноо, өнөөдрийн тэмдэг */}
      <div className="mb-2 flex items-center justify-between gap-1 px-1">
        <div>
          <p className={`text-sm font-bold ${isToday ? "text-brand-soft" : ""}`}>
            {WEEKDAY_LABELS[day.weekday]}
          </p>
          <p className="text-xs text-ink-dim">{shortDate(day.date)}</p>
        </div>
        {isToday && (
          <span className="rounded-full bg-brand-bright px-1.5 py-0.5 text-[10px] font-bold text-on-brand">
            ӨНӨӨДӨР
          </span>
        )}
      </div>

      {/* Амралтын өдөр тэмдэглэл */}
      {day.isHoliday && (
        <p className="mb-2 flex items-center gap-1 rounded-lg bg-warning/15 px-2 py-1 text-[11px] font-semibold text-warning">
          <Palmtree className="h-3 w-3 shrink-0" aria-hidden />
          Амралтын өдөр
        </p>
      )}

      {/* Хичээлийн мөрүүд */}
      <div className="flex flex-col gap-1">
        {day.entries.length === 0 ? (
          <p className="px-1 py-1 text-xs text-ink-dim">Хичээл товлоогдоогүй</p>
        ) : (
          day.entries.map((entry) => (
            <EntryRow
              key={`${entry.scheduleId}-${entry.startMinute}`}
              entry={entry}
              faded={day.isHoliday}
              onClick={() => onEntryClick(entry)}
            />
          ))
        )}
      </div>
    </div>
  );
}

/**
 * Хичээлийн долоо хоногийн бодит хуваарь — GET /schedule/week-ээс ГАНЦ
 * дуудлагаар авсан 7 өдрийг харуулна (цуцлагдсан хасагдсан, зөөгдсөн
 * шилжсэн, сэдэвтэй бол хавсарсан). Мөр дээр товшиход тухайн НЭГ
 * тохиолдлыг өөрчлөх самбар нээгдэнэ.
 */
export default function WeekBuilder() {
  const [weekStart, setWeekStart] = useState(() => mondayOf(todayUBKey()));
  const [data, setData] = useState<WeekResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Сонголтыг ХУУЛБАР болгож хадгалахгүй, зөвхөн ТҮЛХҮҮРИЙГ нь хадгална.
  // Хуулбар хадгалбал самбар дотор сэдэв хадгалсны дараа хуучин (хоосон
  // сэдэвтэй) хуулбар руугаа буцаж, өөрчлөлт хийгдээгүй мэт харагдана.
  const [selectedKey, setSelectedKey] = useState<{
    scheduleId: string;
    date: string;
  } | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    api<WeekResponse>(`/schedule/week?start=${weekStart}`)
      .then(setData)
      .catch((e) => setError(errMsg(e)))
      .finally(() => setLoading(false));
  }, [weekStart]);
  useEffect(load, [load]);

  // Сүүлд ачаалсан өгөгдлөөс сонгосон тохиолдлыг ШИНЭЭР олно. Цуцлагдсан
  // тохиолдол долоо хоногоос алга болдог тул энэ нь null болж, самбар
  // өөрөө хаагдана — яг хүсэж буй зан төлөв.
  const selectedEntry = useMemo<WeekEntry | null>(() => {
    if (!selectedKey || !data) return null;
    const day = data.days.find((d) => d.date === selectedKey.date);
    return day?.entries.find((e) => e.scheduleId === selectedKey.scheduleId) ?? null;
  }, [data, selectedKey]);

  const today = todayUBKey();
  const todayMonday = mondayOf(today);

  return (
    <section className="rounded-2xl border border-line bg-panel p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-5 w-5 text-brand-soft" aria-hidden />
          <h2 className="font-bold text-brand-soft">Хичээлийн хуваарь</h2>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setWeekStart((w) => addDaysToKey(w, -7))}
            aria-label="Өмнөх долоо хоног"
            className="rounded-lg border border-line p-1.5 transition hover:border-brand"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => setWeekStart(todayMonday)}
            disabled={weekStart === todayMonday}
            className="rounded-lg border border-line px-3 py-1.5 text-sm font-semibold transition hover:border-brand disabled:opacity-50"
          >
            Энэ долоо хоног
          </button>
          <button
            type="button"
            onClick={() => setWeekStart((w) => addDaysToKey(w, 7))}
            aria-label="Дараагийн долоо хоног"
            className="rounded-lg border border-line p-1.5 transition hover:border-brand"
          >
            <ChevronRight className="h-4 w-4" aria-hidden />
          </button>
        </div>
      </div>

      {data && (
        <p className="mb-3 text-sm text-ink-dim">
          {shortDate(data.days[0].date)} – {shortDate(data.days[6].date)}
        </p>
      )}

      {loading && <LoadingState rows={7} />}
      {error && <ErrorState message={error} onRetry={load} />}

      {!loading && !error && data && (
        <div className="overflow-x-auto">
          <div className="flex gap-3 snap-x snap-mandatory">
            {data.days.map((day) => (
              <DayColumn
                key={day.date}
                day={day}
                isToday={day.date === today}
                onEntryClick={(entry) =>
                  setSelectedKey({ scheduleId: entry.scheduleId, date: day.date })
                }
              />
            ))}
          </div>
        </div>
      )}

      <EntryActionPanel
        open={selectedEntry !== null}
        entry={selectedEntry}
        date={selectedKey?.date ?? ""}
        dayEntries={selectedKey?.date ? data?.days.find((d) => d.date === selectedKey.date)?.entries ?? [] : []}
        onClose={() => setSelectedKey(null)}
        onChanged={load}
      />
    </section>
  );
}
