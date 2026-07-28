"use client";

import { useMemo, useState } from "react";

/* ============================================================================
 * Огнооны туслах функцууд — Улаанбаатарын цагийн бүсэд суурилсан.
 *
 * `ubDateKey` нь бодит мөч (жишээ нь Assignment.createdAt, UTC timestamp)-ийг
 * УБ-ын лаборын өдрийн түлхүүр рүү хөрвүүлдэг ("YYYY-MM-DD").
 *
 * Харин хуанлийн торыг байгуулахдаа бид "лаборын өдөр"-үүдтэй (жинхэнэ мөч
 * биш) ажилладаг тул `keyOf`/`weekdayIndexMon0`/`daysInMonth` нь Date.UTC-г
 * зөвхөн ХУАНЛИЙН тооцоололд (сар/өдөр normalize хийхэд) ашигладаг —
 * хэрэглэгчийн browser-ийн цагийн бүсээс бүрэн хамааралгүй тул хуудас хаанаас
 * ч нээгдсэн хуанли зөв харагдана.
 * ========================================================================== */

const UB_TZ = "Asia/Ulaanbaatar";

export function ubDateKey(input: Date | string): string {
  const d = typeof input === "string" ? new Date(input) : input;
  return new Intl.DateTimeFormat("en-CA", { timeZone: UB_TZ }).format(d);
}

export function ubToday(): string {
  return ubDateKey(new Date());
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

// Сар/өдрийг normalize хийнэ (ж: сарын 0 → өмнөх сарын сүүлийн өдөр).
// Зөвхөн хуанлийн арифметик — жинхэнэ цагийн бүстэй холбоогүй.
function keyOf(year: number, month0: number, day: number): string {
  const norm = new Date(Date.UTC(year, month0, day));
  return `${norm.getUTCFullYear()}-${pad2(norm.getUTCMonth() + 1)}-${pad2(norm.getUTCDate())}`;
}

function weekdayIndexMon0(year: number, month0: number, day: number): number {
  const dow = new Date(Date.UTC(year, month0, day)).getUTCDay(); // 0=Ням
  return (dow + 6) % 7; // 0=Даваа
}

function daysInMonth(year: number, month0: number): number {
  return new Date(Date.UTC(year, month0 + 1, 0)).getUTCDate();
}

// dateKey нь аль хэдийн шийдэгдсэн лаборын өдөр тул "UTC" гэж format хийнэ —
// дахин цагийн бүсийн хөрвүүлэлт хийхгүй.
export function ubWeekdayFull(dateKey: string): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d, 12));
  return new Intl.DateTimeFormat("mn-MN", {
    weekday: "long",
    timeZone: "UTC",
  }).format(dt);
}

export function formatMnDate(dateKey: string): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d, 12));
  return new Intl.DateTimeFormat("mn-MN", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  }).format(dt);
}

function monthLabel(year: number, month0: number): string {
  const dt = new Date(Date.UTC(year, month0, 1, 12));
  return new Intl.DateTimeFormat("mn-MN", {
    year: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(dt);
}

const WEEKDAY_SHORT = ["Да", "Мя", "Лх", "Пү", "Ба", "Бя", "Ня"];

interface CalendarAssignment {
  createdAt: string;
}

interface TeacherHomeworkCalendarProps {
  assignments: CalendarAssignment[];
  selectedDate: string; // YYYY-MM-DD
  onSelectDate: (date: string) => void;
}

/**
 * 📅 Багшийн даалгаврын хуанли — сар/өдрөөр сонгож, өмнөх хичээлүүдийн
 * даалгаврыг эргэн харах боломжтой. Долоо хоногийн өдөр ТОДОРХОЙ харагдана.
 */
export default function TeacherHomeworkCalendar({
  assignments,
  selectedDate,
  onSelectDate,
}: TeacherHomeworkCalendarProps) {
  const [sy, sm] = selectedDate.split("-").map(Number);
  const [viewYear, setViewYear] = useState(sy);
  const [viewMonth, setViewMonth] = useState(sm - 1);

  const countByDay = useMemo(() => {
    const map = new Map<string, number>();
    for (const a of assignments) {
      const key = ubDateKey(a.createdAt);
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return map;
  }, [assignments]);

  const today = ubToday();

  const cells = useMemo(() => {
    const total = daysInMonth(viewYear, viewMonth);
    const leadOffset = weekdayIndexMon0(viewYear, viewMonth, 1);
    const list: { key: string; day: number; inMonth: boolean }[] = [];
    for (let i = 0; i < leadOffset; i++) {
      const day = i - leadOffset + 1;
      const key = keyOf(viewYear, viewMonth, day);
      list.push({ key, day: Number(key.slice(8, 10)), inMonth: false });
    }
    for (let day = 1; day <= total; day++) {
      list.push({ key: keyOf(viewYear, viewMonth, day), day, inMonth: true });
    }
    let extra = 1;
    while (list.length % 7 !== 0) {
      const key = keyOf(viewYear, viewMonth, total + extra);
      list.push({ key, day: Number(key.slice(8, 10)), inMonth: false });
      extra++;
    }
    return list;
  }, [viewYear, viewMonth]);

  function goPrevMonth() {
    if (viewMonth === 0) {
      setViewYear((y) => y - 1);
      setViewMonth(11);
    } else {
      setViewMonth((m) => m - 1);
    }
  }
  function goNextMonth() {
    if (viewMonth === 11) {
      setViewYear((y) => y + 1);
      setViewMonth(0);
    } else {
      setViewMonth((m) => m + 1);
    }
  }
  function goToday() {
    const [ty, tm] = today.split("-").map(Number);
    setViewYear(ty);
    setViewMonth(tm - 1);
    onSelectDate(today);
  }

  return (
    <div className="rounded-xl border border-line bg-surface p-3">
      {/* Сар шилжүүлэх удирдлага */}
      <div className="mb-3 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={goPrevMonth}
          aria-label="Өмнөх сар"
          className="flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-line text-lg transition hover:bg-ink/5"
        >
          ‹
        </button>
        <span className="text-sm font-bold text-brand-soft">
          {monthLabel(viewYear, viewMonth)}
        </span>
        <button
          type="button"
          onClick={goNextMonth}
          aria-label="Дараагийн сар"
          className="flex min-h-11 min-w-11 items-center justify-center rounded-lg border border-line text-lg transition hover:bg-ink/5"
        >
          ›
        </button>
      </div>

      {/* Долоо хоногийн өдрүүдийн толгой — эхлэл Даваа */}
      <div className="mb-1 grid grid-cols-7 gap-1">
        {WEEKDAY_SHORT.map((w, i) => (
          <div
            key={w}
            className={`text-center text-xs font-bold ${
              i >= 5 ? "text-brand" : "text-ink-dim"
            }`}
          >
            {w}
          </div>
        ))}
      </div>

      {/* Өдрүүдийн тор */}
      <div className="grid grid-cols-7 gap-1">
        {cells.map((c) => {
          const count = countByDay.get(c.key) ?? 0;
          const isSelected = c.key === selectedDate;
          const isToday = c.key === today;
          return (
            <button
              key={c.key}
              type="button"
              onClick={() => onSelectDate(c.key)}
              aria-current={isToday ? "date" : undefined}
              aria-label={`${formatMnDate(c.key)}${count > 0 ? `, ${count} тест` : ""}`}
              className={`relative flex min-h-11 flex-col items-center justify-center rounded-lg text-sm transition ${
                !c.inMonth ? "text-ink-dim/40" : "text-ink"
              } ${
                isSelected
                  ? "bg-brand-bright font-bold text-on-brand"
                  : isToday
                    ? "border border-brand font-semibold text-brand-soft"
                    : "hover:bg-ink/5"
              }`}
            >
              <span>{c.day}</span>
              {count > 0 && (
                <span
                  aria-hidden="true"
                  className={`text-[10px] font-bold leading-none ${
                    isSelected ? "text-on-brand" : "text-brand-soft"
                  }`}
                >
                  {count} тест
                </span>
              )}
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={goToday}
        className="mt-3 min-h-11 w-full rounded-lg border border-line text-sm font-semibold text-brand-soft transition hover:bg-ink/5"
      >
        Өнөөдөр рүү очих
      </button>
    </div>
  );
}
