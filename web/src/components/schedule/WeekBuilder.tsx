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
  dayDate,
  onClick,
}: {
  entry: WeekEntry;
  faded: boolean;
  /** Энэ мөр харагдаж буй өдрийн огноо — «Зөөгдсөн»/«Өөрчилсөн» ялгахад */
  dayDate: string;
  onClick: () => void;
}) {
  const color = getClassroomColor(entry.classroomId);
  // Ангийн нэрээс " (Баруун 4)" / " (Зүүн 4)" салбарыг хасаж харуул
  const displayName = entry.classroomName.replace(/\s*\([^)]*\)$/, "");

  /*
   * СЭДЭВ ТЭРГҮҮНД. Энэ таб нь «Ерөнхий хуваарь»-ийн давталт биш, тухайн
   * 7 хоногийн СЭДЭВ ТӨЛӨВЛӨГЧ. Өмнө нь цаг/танхим/анги л харагдаад сэдэв
   * нь 1.5px цэг байсан тул хоёр таб ялгаагүй харагдаж байв (эзний гомдол
   * 2026-08-08). Мөн тэр цэг нь entry.subject (хичээлийн ТӨРӨЛ — бараг
   * үргэлж утгатай) талбарыг шалгадаг алдаатай байсан — жинхэнэ талбар нь
   * entry.topic.
   */
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col gap-1 rounded-lg border border-line bg-surface px-3 py-2 text-left text-xs transition hover:border-brand ${
        faded ? "opacity-60" : ""
      }`}
      style={{ borderLeftColor: color, borderLeftWidth: 3 }}
      title={entry.classroomName}
    >
      {/* Дээд мөр: цаг, танхим, анги — туслах мэдээлэл, жижгээр */}
      <span className="flex w-full items-center gap-2">
        <span className="shrink-0 font-mono font-bold text-brand-soft">
          {formatMinutes(entry.startMinute)}–{formatMinutes(entry.endMinute)}
        </span>
        {/* Танхимын дүрс — БУДАЛТГҮЙ, ink өнгөөр (эзний дүрэм). Ангийн өнгө
            нь зүүн зурвас (borderLeftColor) дээр аль хэдийн байгаа. */}
        {entry.room && (
          <span className="flex shrink-0 items-center gap-1 text-ink">
            <RoomShape room={entry.room} size={14} />
            <span className="font-medium text-ink-dim">{entry.room}</span>
          </span>
        )}
        <span className="truncate font-semibold text-ink">{displayName}</span>
        {/* Огноо нь солигдсон бол «Зөөгдсөн», ижил өдөртөө танхим/цаг нь л
            өөрчлөгдсөн бол «Өөрчилсөн» — хоёр өөр ойлголтыг нэг шошгоор
            хэлбэл багш андуурна. */}
        {entry.exception?.kind === "MOVED" && (
          <span
            className="ml-auto shrink-0 rounded bg-warning/15 px-1.5 py-0.5 text-[10px] font-bold text-warning"
            title={
              entry.exception.originalDate !== dayDate
                ? "Өөр өдрөөс зөөгдсөн"
                : "Танхим эсвэл цаг нь өөрчлөгдсөн"
            }
          >
            {entry.exception.originalDate !== dayDate ? "Зөөгдсөн" : "Өөрчилсөн"}
          </span>
        )}
      </span>

      {/* Гол мөр: СЭДЭВ — төлөвлөгчийн жинхэнэ агуулга */}
      {entry.topic ? (
        <span className="w-full truncate text-[13px] font-medium leading-snug text-ink">
          {entry.topic}
        </span>
      ) : (
        <span className="w-full text-[12px] italic text-ink-dim">
          Сэдэв зоогоогүй — дарж зооно
        </span>
      )}
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
              dayDate={day.date}
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

  // Сэдвийн явц: амралтын бус өдрүүдийн хичээлээс хэд нь сэдэвтэй вэ.
  // Энэ тоо л «энэ 7 хоногийн төлөвлөлт дууссан уу» гэдгийг шууд хэлнэ.
  const topicProgress = useMemo(() => {
    if (!data) return null;
    let total = 0;
    let withTopic = 0;
    for (const day of data.days) {
      if (day.isHoliday) continue;
      for (const e of day.entries) {
        total += 1;
        if (e.topic) withTopic += 1;
      }
    }
    return { total, withTopic };
  }, [data]);

  return (
    <section className="rounded-2xl border border-line bg-panel p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-brand-soft" aria-hidden />
            {/* «Хичээлийн хуваарь» гэдэг нэр хуудасны h1-тэй давхцаж, 1-р
                табтай ижил сэтгэгдэл төрүүлдэг байсан — зорилгоор нь нэрлэв */}
            <h2 className="font-bold text-brand-soft">
              Долоо хоногийн сэдэв төлөвлөлт
            </h2>
          </div>
          {topicProgress && topicProgress.total > 0 && (
            <span
              className={`rounded-full px-3 py-1 text-xs font-bold ${
                topicProgress.withTopic === topicProgress.total
                  ? "bg-success/15 text-success"
                  : "bg-warning/15 text-warning"
              }`}
            >
              Сэдэвтэй {topicProgress.withTopic}/{topicProgress.total}
            </span>
          )}
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
