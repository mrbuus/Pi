"use client";

import { HOLIDAY_HATCH_STYLE } from "./types";

export interface HeatmapCell {
  date: string; // "YYYY-MM-DD"
  colorClass: string;
  isHoliday: boolean;
  ariaLabel: string;
}

interface HeatmapGridProps {
  /** Тухайн жилийн 1-р сарын 1-нээс 12-р сарын 31 хүртэл, дараалалтай. */
  cells: HeatmapCell[];
  cellSize?: number;
}

const MONTH_LABELS = [
  "1-р сар",
  "2-р сар",
  "3-р сар",
  "4-р сар",
  "5-р сар",
  "6-р сар",
  "7-р сар",
  "8-р сар",
  "9-р сар",
  "10-р сар",
  "11-р сар",
  "12-р сар",
];

// 0=Ням, 1=Даваа, 2=Мягмар, 3=Лхагва, 4=Пүрэв, 5=Баасан, 6=Бямба
const WEEKDAY_LABELS = ["Ня", "Да", "Мя", "Лх", "Пү", "Ба", "Бя"];
// GitHub-ийн жишгээр орон зайг хэмнэхийн тулд ганц мөр дутуутайгаар (Даваа/Лхагва/Баасан) л шошголно
const VISIBLE_WEEKDAY_ROWS = new Set([1, 3, 5]);

const GAP = 3;

/**
 * GitHub-ийн contribution graph маягийн 53 (эсвэл 54) багана × 7 мөрийн тор.
 * Cell бүр title/aria-label-тай тул дэлгэцийн уншигч, hover хоёулаа ойлгоно —
 * өнгө дангаараа утга илэрхийлдэггүй.
 */
export default function HeatmapGrid({ cells, cellSize = 13 }: HeatmapGridProps) {
  if (cells.length === 0) return null;

  const firstWeekday = new Date(`${cells[0].date}T00:00:00Z`).getUTCDay();
  const padded: (HeatmapCell | null)[] = [
    ...Array(firstWeekday).fill(null),
    ...cells,
  ];
  while (padded.length % 7 !== 0) padded.push(null);
  const weekCount = padded.length / 7;
  const colWidth = cellSize + GAP;

  const monthLabels: { weekIndex: number; label: string }[] = [];
  let lastMonth = -1;
  for (let w = 0; w < weekCount; w++) {
    const weekCells = padded.slice(w * 7, w * 7 + 7);
    const firstReal = weekCells.find((c): c is HeatmapCell => c !== null);
    if (!firstReal) continue;
    const month = new Date(`${firstReal.date}T00:00:00Z`).getUTCMonth();
    if (month !== lastMonth) {
      monthLabels.push({ weekIndex: w, label: MONTH_LABELS[month] });
      lastMonth = month;
    }
  }

  return (
    <div className="inline-flex gap-2">
      {/* Долоо хоногийн өдрийн шошго */}
      <div className="flex flex-col gap-[3px] pt-[18px]" aria-hidden>
        {WEEKDAY_LABELS.map((label, i) => (
          <div
            key={label + i}
            className="text-[10px] text-ink-dim"
            style={{ height: cellSize, lineHeight: `${cellSize}px` }}
          >
            {VISIBLE_WEEKDAY_ROWS.has(i) ? label : ""}
          </div>
        ))}
      </div>

      <div>
        {/* Сарын шошго */}
        <div
          className="relative mb-1 h-[14px] text-[10px] text-ink-dim"
          style={{ width: weekCount * colWidth }}
        >
          {monthLabels.map((m) => (
            <span
              key={m.weekIndex}
              className="absolute top-0 whitespace-nowrap"
              style={{ left: m.weekIndex * colWidth }}
            >
              {m.label}
            </span>
          ))}
        </div>

        {/* Тор — багана бүр 1 долоо хоног, мөр бүр 1 гараг */}
        <div
          className="grid"
          style={{
            gridTemplateRows: `repeat(7, ${cellSize}px)`,
            gridAutoFlow: "column",
            gridAutoColumns: `${cellSize}px`,
            gap: `${GAP}px`,
          }}
        >
          {padded.map((cell, i) =>
            cell ? (
              <div
                key={cell.date}
                role="img"
                aria-label={cell.ariaLabel}
                title={cell.ariaLabel}
                tabIndex={0}
                className={`rounded-[3px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand ${cell.colorClass} ${
                  cell.isHoliday ? "border border-dashed border-line" : ""
                }`}
                style={cell.isHoliday ? HOLIDAY_HATCH_STYLE : undefined}
              />
            ) : (
              <div key={`pad-${i}`} aria-hidden />
            ),
          )}
        </div>
      </div>
    </div>
  );
}
