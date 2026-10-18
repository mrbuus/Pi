"use client";

import { ChevronLeft, ChevronRight, TriangleAlert } from "lucide-react";
import { Fragment, type CSSProperties } from "react";
import RoomShape from "@/components/schedule/RoomShape";
import { getClassroomColor } from "@/lib/classroomColor";
import { cn } from "@/lib/cn";
import { ROOMS, WEEKDAYS_SHORT, classById, fromKey, longLabel, type DemoLesson } from "../world";
import { BRANCHES, roomOf, weekRangeLabel } from "./util";

interface Props {
  startKey: string;
  weekKeys: string[];
  lessonsByDay: DemoLesson[][];
  today: string;
  selected: string;
  onPickDay: (key: string) => void;
  onShift: (delta: number) => void;
}

/**
 * Танхим × гараг: сонгосон 7 хоногт аль анги аль танхимд хэдэн цагт орохыг (ангийн бодит хуваарь),
 * мөн сурагч/суудлын дүүргэлтийг нүд бүрт харуулна. Бодит: ClassSchedule(room, weekday, start, end) + Enrollment-ийн тоо.
 */
export default function WeekGrid({ startKey, weekKeys, lessonsByDay, today, selected, onPickDay, onShift }: Props) {
  const cells = new Map<string, DemoLesson[]>();
  lessonsByDay.forEach((list, day) => {
    for (const l of list) {
      const k = `${l.slot.room}|${day}`;
      cells.set(k, [...(cells.get(k) ?? []), l]);
    }
  });
  for (const list of cells.values()) list.sort((a, b) => a.slot.start.localeCompare(b.slot.start));

  return (
    <section aria-labelledby="sch-week" className="rounded-xl border border-line bg-surface">
      <header className="flex items-center justify-between gap-x-3 border-b border-line px-3 py-1.5">
        <h2 id="sch-week" className="sr-only text-sm font-bold text-ink sm:not-sr-only">
          Танхимын 7 хоног
        </h2>
        <div className="-mx-1.5 flex w-full items-center justify-between sm:mx-0 sm:-mr-1.5 sm:w-auto sm:justify-start">
          <button
            type="button"
            aria-label="Өмнөх 7 хоног"
            onClick={() => onShift(-1)}
            className="inline-flex size-11 items-center justify-center rounded-lg text-ink-dim hover:bg-ink/5 hover:text-ink sm:size-9"
          >
            <ChevronLeft className="size-5" aria-hidden />
          </button>
          <span className="cyrillic-tight min-w-[8.5rem] text-center text-sm font-bold tabular-nums text-ink" aria-live="polite">
            {weekRangeLabel(startKey)}
          </span>
          <button
            type="button"
            aria-label="Дараах 7 хоног"
            onClick={() => onShift(1)}
            className="inline-flex size-11 items-center justify-center rounded-lg text-ink-dim hover:bg-ink/5 hover:text-ink sm:size-9"
          >
            <ChevronRight className="size-5" aria-hidden />
          </button>
        </div>
      </header>

      <div className="relative overflow-x-auto">
        <table className="w-full min-w-[58rem] table-fixed border-separate border-spacing-0 text-left">
          <caption className="sr-only">Танхим бүрийн 7 хоногийн хуваарь: анги, цаг, сурагч ба суудлын харьцаа</caption>
          <colgroup>
            <col className="w-[5.5rem]" />
            {weekKeys.map((k) => (
              <col key={k} />
            ))}
          </colgroup>
          <thead>
            <tr>
              <th scope="col" className="sticky left-0 z-20 border-b border-line bg-surface px-2 py-2 text-xs font-semibold text-ink-dim shadow-[1px_0_0_0_var(--line)]">
                Танхим
              </th>
              {weekKeys.map((key, i) => {
                const d = fromKey(key);
                const isToday = key === today;
                const isSel = key === selected;
                return (
                  <th key={key} scope="col" className={cn("border-b border-line p-0 font-normal", i > 0 && "border-l", isSel && "bg-brand-bright/10")}>
                    <button
                      type="button"
                      aria-current={isToday ? "date" : undefined}
                      aria-label={`${longLabel(d)}${isToday ? ", өнөөдөр" : ""}: өдрөөр харах`}
                      onClick={() => onPickDay(key)}
                      className="flex min-h-[4.25rem] w-full flex-col items-center justify-center gap-0.5 px-1 py-1.5 hover:bg-ink/5"
                    >
                      <span className="text-xs font-semibold text-ink-dim">{WEEKDAYS_SHORT[i]}</span>
                      <span
                        className={cn(
                          "flex size-7 items-center justify-center rounded-full text-sm font-bold tabular-nums",
                          isToday ? "bg-brand-bright text-on-brand" : "text-ink",
                        )}
                      >
                        {d.getDate()}
                      </span>
                      <span className="text-[11px] font-medium tabular-nums text-ink-dim">{lessonsByDay[i].length} хичээл</span>
                    </button>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {BRANCHES.map((branch) => (
              <Fragment key={branch}>
                <tr>
                  <th scope="colgroup" colSpan={8} className="border-b border-line bg-bg p-0 text-left">
                    <span className="sticky left-0 inline-block px-2 py-1.5 text-xs font-bold text-ink">{branch}</span>
                  </th>
                </tr>
                {ROOMS.filter((r) => r.branch === branch).map((room) => (
                  <tr key={room.id}>
                    <th scope="row" className="sticky left-0 z-10 border-b border-line bg-surface p-2 align-top font-normal shadow-[1px_0_0_0_var(--line)]">
                      <span className="flex items-center gap-1.5 text-ink">
                        <RoomShape room={room.id} size={18} />
                        <span className="text-sm font-bold tabular-nums">{room.id}</span>
                      </span>
                      <span className="mt-0.5 block text-[11px] leading-tight text-ink-dim">{room.capacity} суудал</span>
                      {room.makeupOnly && <span className="block whitespace-nowrap text-[11px] leading-tight text-ink-dim">нөхөх хичээл</span>}
                    </th>
                    {weekKeys.map((key, i) => (
                      <td key={key} className={cn("border-b border-line p-1 align-top", i > 0 && "border-l", key === selected && "bg-brand-bright/[0.06]")}>
                        <div className="space-y-1">
                          {(cells.get(`${room.id}|${i}`) ?? []).map((l) => (
                            <Block key={l.id} lesson={l} />
                          ))}
                        </div>
                      </td>
                    ))}
                  </tr>
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Block({ lesson }: { lesson: DemoLesson }) {
  const cls = classById(lesson.classId);
  const capacity = roomOf(lesson.slot.room)?.capacity ?? 0;
  if (!cls) return null;
  const students = cls.students.length;
  const over = capacity > 0 && students > capacity;
  const pct = capacity ? Math.min(100, Math.round((students / capacity) * 100)) : 0;
  const now = lesson.status === "now";
  return (
    <div
      title={`${cls.name}, ${lesson.slot.start}–${lesson.slot.end}, ${students} сурагч, ${capacity} суудал${now ? ", явагдаж байна" : ""}`}
      style={{ "--cls": getClassroomColor(cls.id) } as CSSProperties}
      className={cn("class-row rounded-md bg-bg py-1 pl-1.5 pr-1.5", now && "ring-1 ring-brand-bright")}
    >
      <p className="text-[11px] leading-tight tabular-nums text-ink-dim">
        {lesson.slot.start}–{lesson.slot.end}
      </p>
      <p className="flex items-center justify-between gap-1">
        <span className="shrink-0 text-sm font-bold text-ink">{cls.label}</span>
        <span className={cn("inline-flex shrink-0 items-center gap-0.5 text-xs font-semibold tabular-nums", over ? "text-warning" : "text-ink-dim")}>
          {over && <TriangleAlert className="size-3" aria-hidden />}
          {students}/{capacity}
          {over && <span className="sr-only">, суудлаас илүү</span>}
        </span>
      </p>
      <span aria-hidden className="mt-1 block h-1 overflow-hidden rounded-full bg-ink/10">
        <span className={cn("block h-full rounded-full", over ? "bg-warning" : "bg-brand-bright")} style={{ width: `${pct}%` }} />
      </span>
    </div>
  );
}
