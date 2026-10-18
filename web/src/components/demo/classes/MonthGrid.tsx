"use client";

import { CalendarOff } from "lucide-react";
import { useMemo } from "react";
import { EmptyState } from "@/components/ui/StateBlock";
import { cn } from "@/lib/cn";
import { ATT_META, HW_META, RiskMark, TONE_SELECTED, TONE_TEXT } from "../shell/status";
import {
  LATE_RANGE_LABEL,
  WEEKDAYS_SHORT,
  dayRecord,
  fromKey,
  lessonDateKeys,
  lessonOn,
  mondayIndex,
  toKey,
  todayKey,
  type AttStatus,
  type DemoClass,
  type HwStatus,
  type LateRange,
} from "../world";
import { AttRate, HwRate, Legend, LegendItem, MonthNav, StudentLink, type YM } from "./common";
import { shortDay } from "./format";
import type { StudentStat } from "./stats";

export type GridKind = "att" | "hw";

interface Col {
  key: string;
  wd: string;
  day: number;
  today: boolean;
  upcoming: boolean;
  label: string;
}

type Cell =
  | { t: "pre" }
  | { t: "soon" }
  | { t: "none" }
  | { t: "att"; v: AttStatus; note: string; range: LateRange | null }
  | { t: "hw"; v: HwStatus; note: string };

function CellView({ cell }: { cell: Cell }) {
  switch (cell.t) {
    case "pre":
      return (
        <span title="Хичээлд орохоос өмнө" className="mx-auto block size-6 rounded-md bg-ink/[0.05]">
          <span className="sr-only">Бүртгэгдээгүй</span>
        </span>
      );
    case "soon":
      return (
        <span title="Хичээл болоогүй" className="mx-auto block size-1.5 rounded-full bg-line">
          <span className="sr-only">Хичээл болоогүй</span>
        </span>
      );
    case "none":
      return (
        <span title="Тэмдэглээгүй" className="mx-auto block h-0.5 w-2.5 rounded-full bg-ink-dim/40">
          <span className="sr-only">Тэмдэглээгүй</span>
        </span>
      );
    case "att": {
      const m = ATT_META[cell.v];
      const Icon = m.icon;
      const detail = [m.label, cell.range ? LATE_RANGE_LABEL[cell.range] : "", cell.note].filter(Boolean).join(", ");
      return (
        <span
          title={detail}
          className={cn(
            "mx-auto flex size-6 items-center justify-center rounded-md",
            cell.v === "present" ? cn(TONE_TEXT[m.tone], "opacity-60") : cn("border", TONE_SELECTED[m.tone]),
          )}
        >
          <Icon className="size-3.5" />
          <span className="sr-only">{detail}</span>
        </span>
      );
    }
    case "hw": {
      const m = HW_META[cell.v];
      const Icon = m.icon;
      const detail = [m.label, cell.note].filter(Boolean).join(", ");
      return (
        <span
          title={detail}
          className={cn(
            "mx-auto flex size-6 items-center justify-center rounded-md",
            cell.v === "done" ? cn(TONE_TEXT[m.tone], "opacity-60") : cn("border", TONE_SELECTED[m.tone]),
          )}
        >
          <Icon className="size-3.5" />
          <span className="sr-only">{detail}</span>
        </span>
      );
    }
  }
}

/**
 * Сарын тор: сурагч (мөр) × хичээлийн өдөр (багана). Нэрийн багана зүүн талд «наалттай»,
 * тор нь зөвхөн картын дотор хэвтээ/босоо гүйнэ (хуудас биш).
 */
export default function MonthGrid({
  cls,
  kind,
  rows,
  view,
  onView,
}: {
  cls: DemoClass;
  kind: GridKind;
  rows: StudentStat[];
  view: YM;
  onView: (v: YM) => void;
}) {
  const cols = useMemo<Col[]>(() => {
    const first = toKey(new Date(view.y, view.m, 1));
    const last = toKey(new Date(view.y, view.m + 1, 0));
    const today = todayKey();
    const out: Col[] = [];
    for (const key of lessonDateKeys(cls, first, last)) {
      const lesson = lessonOn(cls, key);
      if (!lesson) continue;
      const d = fromKey(key);
      out.push({
        key,
        wd: WEEKDAYS_SHORT[mondayIndex(d)],
        day: d.getDate(),
        today: key === today,
        upcoming: lesson.status === "upcoming",
        label: `${shortDay(key)}, ${lesson.topic}`,
      });
    }
    return out;
  }, [cls, view.y, view.m]);

  const body = useMemo(
    () =>
      rows.map((stat) => {
        const s = stat.student;
        let marked = 0;
        let good = 0;
        const cells: Cell[] = cols.map((c) => {
          if (c.key < s.joinedOn) return { t: "pre" };
          if (c.upcoming) return { t: "soon" };
          const rec = dayRecord(cls, c.key, s);
          if (kind === "att") {
            if (!rec.att) return { t: "none" };
            marked++;
            if (rec.att === "present" || rec.att === "late") good++;
            return { t: "att", v: rec.att, note: rec.attNote, range: rec.lateRange };
          }
          if (!rec.hw) return { t: "none" };
          marked++;
          good += rec.hw === "done" ? 1 : rec.hw === "partial" ? 0.5 : 0;
          return { t: "hw", v: rec.hw, note: rec.hwNote };
        });
        return { stat, cells, rate: marked ? Math.round((good / marked) * 100) : null };
      }),
    [rows, cols, cls, kind],
  );

  const legend = Object.values(kind === "att" ? ATT_META : HW_META);
  const what = kind === "att" ? "Ирц" : "Даалгавар";

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <MonthNav view={view} onView={onView} className="-ml-2" />
        <span className="text-sm text-ink-dim">{cols.length} хичээл</span>
      </div>

      {cols.length === 0 ? (
        <EmptyState icon={CalendarOff} title="Энэ сард хичээл байхгүй" hint="Өөр сар сонгоно уу" />
      ) : (
        <div
          role="region"
          aria-label={`${what}, ${cls.label}, сарын тор`}
          tabIndex={0}
          className="relative max-h-[70dvh] overflow-auto overscroll-x-contain rounded-xl border border-line outline-none focus-visible:ring-2 focus-visible:ring-brand-bright/60"
        >
          <table className="w-max min-w-full border-separate border-spacing-0 text-xs">
            <caption className="sr-only">
              {what}: сурагч бүрийн хичээл тус бүрийн төлөв
            </caption>
            <thead>
              <tr>
                <th
                  scope="col"
                  className="sticky left-0 top-0 z-30 h-12 w-[8.75rem] min-w-[8.75rem] border-b border-r border-line bg-surface px-2 text-left text-xs font-semibold text-ink-dim sm:w-[14rem] sm:min-w-[14rem]"
                >
                  Сурагч
                </th>
                {cols.map((c) => (
                  <th
                    key={c.key}
                    scope="col"
                    title={c.label}
                    className={cn(
                      "sticky top-0 z-20 h-12 w-8 min-w-8 border-b border-line bg-surface px-0 text-center font-normal",
                      c.today && "bg-brand-bright/10",
                    )}
                  >
                    <span className="block text-[10px] leading-3 text-ink-dim">{c.wd}</span>
                    <span className={cn("block text-xs font-semibold tabular-nums", c.today ? "text-brand" : "text-ink")}>{c.day}</span>
                  </th>
                ))}
                <th scope="col" className="sticky top-0 z-20 h-12 w-14 min-w-14 border-b border-l border-line bg-surface px-1 text-center text-xs font-semibold text-ink-dim">
                  Нийт
                </th>
              </tr>
            </thead>
            <tbody>
              {body.map(({ stat, cells, rate }) => (
                <tr key={stat.student.id}>
                  <th scope="row" className="sticky left-0 z-10 h-11 border-b border-r border-line bg-surface px-2 text-left font-normal sm:h-9">
                    <span className="flex items-center gap-1.5 sm:gap-2">
                      <span className="hidden w-5 shrink-0 text-right tabular-nums text-ink-dim sm:inline">{stat.student.index}</span>
                      <RiskMark flags={stat.flags} />
                      <StudentLink id={stat.student.id} className="min-w-0 truncate text-[13px] font-medium after:absolute after:inset-0 after:content-['']">
                        {stat.student.name}
                      </StudentLink>
                    </span>
                  </th>
                  {cells.map((cell, i) => (
                    <td key={cols[i].key} className={cn("h-11 border-b border-line/60 p-0 text-center sm:h-9", cols[i].today && "bg-brand-bright/[0.06]")}>
                      <CellView cell={cell} />
                    </td>
                  ))}
                  <td className="h-11 border-b border-l border-line/60 px-1 text-center text-xs sm:h-9">
                    {kind === "att" ? <AttRate value={rate} /> : <HwRate value={rate} />}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Legend>
        {legend.map((m) => {
          const Icon = m.icon;
          return (
            <LegendItem key={m.label}>
              <Icon className={cn("size-3.5", TONE_TEXT[m.tone])} />
              {m.label}
            </LegendItem>
          );
        })}
        <LegendItem>
          <span aria-hidden className="block h-0.5 w-2.5 rounded-full bg-ink-dim/40" />
          Тэмдэглээгүй
        </LegendItem>
        <LegendItem>
          <span aria-hidden className="block size-1.5 rounded-full bg-line" />
          Хичээл болоогүй
        </LegendItem>
        <LegendItem>
          <span aria-hidden className="block size-3.5 rounded bg-ink/[0.05]" />
          Хичээлд орохоос өмнө
        </LegendItem>
      </Legend>
    </div>
  );
}
