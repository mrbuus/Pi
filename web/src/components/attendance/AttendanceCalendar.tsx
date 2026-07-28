"use client";

import { useState } from "react";
import { WEEKDAY_LABELS, WEEKDAY_SHORT } from "@/components/schedule/types";

interface AttendanceCalendarProps {
  /** Сонгосон огноо "YYYY-MM-DD" */
  value: string;
  /** Өнөөдөр "YYYY-MM-DD" — ирээдүйн өдөр сонгохоос сэргийлнэ */
  today: string;
  onChange: (date: string) => void;
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}
function toKey(y: number, m: number, d: number): string {
  return `${y}-${pad2(m)}-${pad2(d)}`;
}
function daysInMonth(y: number, m: number): number {
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}
// JS getUTCDay()-той нийцүүлж (0=Ням) — сарын эхний өдрийн долоо хоногийн индекс
function firstWeekdayOfMonth(y: number, m: number): number {
  return new Date(Date.UTC(y, m - 1, 1)).getUTCDay();
}
function weekdayOf(key: string): number {
  return new Date(`${key}T00:00:00.000Z`).getUTCDay();
}

/**
 * Компакт сарын хуанли — багш өмнөх өдрүүдийн ирцийг харах/засахаар сонгоно.
 * Утсан дэлгэц дээр багтахуйц хэмжээтэй.
 *
 * Owner-ийн шаардлага: "ард 7 хоногийн хэддэх өдөр гэдэг нь сайн мэдэгдэж
 * байх ёстой" — тул толгой мөрөнд Ня/Да/Мя/Лх/Пү/Ба/Бя-г тод үсгээр, мөн
 * доор нь сонгосон өдрийн БҮТЭН гарагийн нэрийг тод бичвэрээр давхар
 * харуулна.
 */
export default function AttendanceCalendar({
  value,
  today,
  onChange,
}: AttendanceCalendarProps) {
  const [viewY, setViewY] = useState(() => Number(value.slice(0, 4)));
  const [viewM, setViewM] = useState(() => Number(value.slice(5, 7)));

  const first = firstWeekdayOfMonth(viewY, viewM);
  const total = daysInMonth(viewY, viewM);
  const cells: (number | null)[] = [
    ...Array.from({ length: first }, () => null),
    ...Array.from({ length: total }, (_, i) => i + 1),
  ];

  const viewKey = `${viewY}-${pad2(viewM)}`;
  const canGoNext = viewKey < today.slice(0, 7);

  function changeMonth(delta: number) {
    let m = viewM + delta;
    let y = viewY;
    if (m < 1) {
      m = 12;
      y -= 1;
    } else if (m > 12) {
      m = 1;
      y += 1;
    }
    setViewY(y);
    setViewM(m);
  }

  return (
    <div className="rounded-xl border border-line bg-surface p-3">
      {/* Сар сэлгэх */}
      <div className="mb-2 flex items-center justify-between">
        <button
          type="button"
          onClick={() => changeMonth(-1)}
          aria-label="Өмнөх сар"
          className="flex min-h-11 min-w-11 items-center justify-center rounded-lg text-lg text-ink-dim transition hover:bg-ink/5"
        >
          ‹
        </button>
        <span className="text-sm font-bold">
          {viewY} оны {viewM} сар
        </span>
        <button
          type="button"
          onClick={() => changeMonth(1)}
          disabled={!canGoNext}
          aria-label="Дараах сар"
          className="flex min-h-11 min-w-11 items-center justify-center rounded-lg text-lg text-ink-dim transition hover:bg-ink/5 disabled:opacity-30"
        >
          ›
        </button>
      </div>

      {/* Долоо хоногийн өдрүүдийн толгой — тод, амарч ойлгомжтой */}
      <div className="grid grid-cols-7 gap-1 text-center text-xs font-extrabold text-ink-dim">
        {WEEKDAY_SHORT.map((w, i) => (
          <span key={w} className={i === 0 ? "text-error" : undefined}>
            {w}
          </span>
        ))}
      </div>

      {/* Өдрүүдийн сүлжээ */}
      <div className="mt-1 grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          if (day === null) return <span key={`empty-${i}`} aria-hidden />;
          const key = toKey(viewY, viewM, day);
          const isFuture = key > today;
          const isSelected = key === value;
          const isToday = key === today;
          return (
            <button
              key={key}
              type="button"
              disabled={isFuture}
              onClick={() => onChange(key)}
              aria-current={isToday ? "date" : undefined}
              aria-label={`${WEEKDAY_LABELS[weekdayOf(key)]} гараг, ${viewM} сарын ${day}${isSelected ? " — сонгогдсон" : ""}`}
              className={`min-h-11 rounded-lg text-sm transition disabled:cursor-not-allowed disabled:opacity-30 ${
                isSelected
                  ? "bg-brand-bright font-bold text-on-brand"
                  : isToday
                    ? "border border-brand font-semibold text-brand-soft"
                    : "text-ink hover:bg-ink/5"
              }`}
            >
              {day}
            </button>
          );
        })}
      </div>

      {/* Сонгосон өдрийн бүтэн гарагийн нэр — жижиг тоонуудаас гадна тод
          унших боломжтой давхар илэрхийлэл */}
      <p className="mt-2 text-center text-base font-bold text-brand-soft">
        {WEEKDAY_LABELS[weekdayOf(value)]} гараг · {value}
      </p>
    </div>
  );
}
