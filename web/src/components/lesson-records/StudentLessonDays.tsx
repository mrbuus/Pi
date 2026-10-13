"use client";

import { useState } from "react";
import { Palmtree } from "lucide-react";
import { useSection } from "@/components/students/progress/useSection";
import { ErrorState, LoadingState } from "@/components/ui/StateBlock";
import { Meta } from "@/components/ui/Meta";
import RoomShape from "@/components/schedule/RoomShape";
import {
  addDaysToKey,
  formatMinutes,
  todayUBKey,
  WEEKDAY_LABELS,
  type WeekResponse,
} from "@/components/schedule/types";

function mondayOf(key: string): string {
  const wd = new Date(`${key}T00:00:00.000Z`).getUTCDay();
  return addDaysToKey(key, wd === 0 ? -6 : 1 - wd);
}

/**
 * Сурагч: өөрийн ангийн өдөр бүрийн хичээл — цаг, танхим, СЭДЭВ, багш.
 * /schedule/week нь сурагчид зөвхөн өөрийн ангийг буцаана; багшийн тайлбар
 * тэр хариунд огт байхгүй.
 */
export default function StudentLessonDays() {
  const today = todayUBKey();
  const [day, setDay] = useState(today);
  const { data, status, error, reload } = useSection<WeekResponse | null>(
    `/schedule/week?start=${mondayOf(day)}`,
    null,
  );
  const days = Array.from({ length: 7 }, (_, i) => addDaysToKey(mondayOf(day), i));
  const dayData = data?.days.find((d) => d.date === day);
  const entries = [...(dayData?.entries ?? [])].sort((a, b) => a.startMinute - b.startMinute);

  return (
    <div>
      <div role="tablist" aria-label="Өдөр" className="mb-3 grid grid-cols-7 gap-1">
        {days.map((k) => {
          const wd = new Date(`${k}T00:00:00.000Z`).getUTCDay();
          return (
            <button
              key={k}
              type="button"
              role="tab"
              aria-selected={k === day}
              onClick={() => setDay(k)}
              className={`flex min-h-11 flex-col items-center justify-center rounded-lg border text-xs font-semibold transition ${
                k === day
                  ? "border-brand-bright bg-brand-bright text-on-brand"
                  : k === today
                    ? "border-brand text-ink"
                    : "border-line bg-panel text-ink"
              }`}
            >
              <span>{WEEKDAY_LABELS[wd].slice(0, 2)}</span>
              <span className="font-normal opacity-75">{k.slice(8)}</span>
            </button>
          );
        })}
      </div>
      {status === "loading" && <LoadingState rows={2} />}
      {status === "error" && <ErrorState message={error} onRetry={reload} />}
      {status === "ready" && dayData?.isHoliday && (
        <p className="flex items-center gap-1.5 rounded-lg bg-warning/15 px-3 py-2 text-sm font-semibold text-warning">
          <Palmtree className="h-4 w-4 shrink-0" aria-hidden /> Амралтын өдөр
        </p>
      )}
      {status === "ready" && !dayData?.isHoliday && entries.length === 0 && (
        <p className="rounded-lg border border-line bg-panel px-3 py-3 text-sm text-ink-dim">Энэ өдөр хичээлгүй.</p>
      )}
      {status === "ready" && entries.length > 0 && (
        <ul className="divide-y divide-line/60 rounded-xl border border-line">
          {entries.map((e) => (
            <li key={`${e.scheduleId}-${e.startMinute}`} className="grid grid-cols-[4.75rem_1fr] gap-x-3 px-3 py-2.5 text-sm">
              <span className="font-mono text-xs font-bold text-brand-soft">
                {formatMinutes(e.startMinute)}–{formatMinutes(e.endMinute)}
              </span>
              <div className="min-w-0">
                <p className="font-medium">
                  {e.topic ?? <span className="font-normal italic text-ink-dim">Сэдэв удахгүй</span>}
                </p>
                <p className="mt-0.5 flex items-center gap-1.5 text-xs text-ink-dim">
                  <RoomShape room={e.room} size={14} />
                  <Meta items={[e.room, e.leadTeacher?.name ?? e.teacherName, e.assistantTeacher?.name]} />
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
