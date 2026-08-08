"use client";

import { DoorOpen, Palmtree, AlertTriangle } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { Meta } from "@/components/ui/Meta";
import {
  addDaysToKey,
  CALENDAR_TYPE_ICON,
  CALENDAR_TYPE_LABEL,
  formatMinutes,
  SUBJECT_LABEL,
  todayUBKey,
  WEEKDAY_LABELS,
  type DayExpansion,
} from "./types";

interface Props {
  classroomId?: string;
  teacherId?: string;
  days?: number;
  title?: string;
}

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : "Алдаа гарлаа";
}

function dayLabel(dateKey: string): string {
  const weekday = new Date(`${dateKey}T00:00:00.000Z`).getUTCDay();
  const [, month, day] = dateKey.split("-");
  return `${month}.${day} — ${WEEKDAY_LABELS[weekday]}`;
}

/**
 * Ойрын N хоногийн БОДИТ хичээлтэй өдрүүд — GET /schedule/days-ээс шууд
 * авна (давтагдах хэв маягийг задалж, амралт/завсарлагыг хассан эцсийн
 * үр дүн). Амралтын өдрийг "хоосон зай" биш, тодорхой тэмдэглэгээтэй харуулна.
 */
export default function UpcomingAgenda({
  classroomId,
  teacherId,
  days = 14,
  title = "Ойрын өдрүүд",
}: Props) {
  const [data, setData] = useState<DayExpansion[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    const from = todayUBKey();
    const to = addDaysToKey(from, days - 1);
    const params = new URLSearchParams({ from, to });
    if (classroomId) params.set("classroomId", classroomId);
    if (teacherId) params.set("teacherId", teacherId);
    api<DayExpansion[]>(`/schedule/days?${params.toString()}`)
      .then((d) => {
        if (!alive) return;
        setData(d);
      })
      .catch((e) => {
        if (!alive) return;
        setError(errMsg(e));
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [classroomId, teacherId, days]);

  if (loading) {
    return (
      <p className="animate-pulse text-sm text-ink-dim" role="status">
        {title} ачаалж байна…
      </p>
    );
  }
  if (error) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-error/30 bg-error/5 px-4 py-3 text-sm text-error">
        <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
        {error}
      </div>
    );
  }
  if (!data || data.length === 0) {
    return <p className="text-sm text-ink-dim">Мэдээлэл алга</p>;
  }

  return (
    <div className="space-y-2">
      {data.map((day) => (
        <div
          key={day.date}
          className={`rounded-xl border p-3 text-sm ${
            day.holiday
              ? "border-warning/40 bg-warning/5"
              : "border-line bg-surface"
          }`}
        >
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-bold">{dayLabel(day.date)}</p>
            {day.holiday && (
              <span className="inline-flex items-center gap-1 rounded-full bg-warning/20 px-2 py-0.5 text-xs font-semibold text-warning">
                {(() => {
                  const Icon = CALENDAR_TYPE_ICON[day.holiday.type] ?? Palmtree;
                  return <Icon className="h-3.5 w-3.5" aria-hidden />;
                })()}
                {CALENDAR_TYPE_LABEL[day.holiday.type] ?? day.holiday.type}
              </span>
            )}
          </div>
          {day.holiday ? (
            <p className="mt-1 text-ink-dim">
              <Meta items={[
                <>
                  {day.holiday.title}
                  {day.holiday.note && ` — ${day.holiday.note}`}
                </>,
                "энэ өдөр хичээл ЯВАГДАХГҮЙ"
              ]} />
            </p>
          ) : day.classes.length === 0 ? (
            <p className="mt-1 text-ink-dim">Энэ өдөр хуваарьт хичээл алга</p>
          ) : (
            <div className="mt-2 space-y-1.5">
              {day.classes.map((c) => (
                <div
                  key={c.id}
                  className="flex flex-wrap items-center gap-2 rounded-lg border border-line bg-panel px-2.5 py-1.5 text-xs"
                >
                  <span className="font-bold text-brand-soft">
                    {formatMinutes(c.startMinute)}–{formatMinutes(c.endMinute)}
                  </span>
                  <span className="font-semibold">{c.classroomName}</span>
                  <span className="text-ink-dim">
                    {c.teacherName ?? "Багш товлогдоогүй"}
                  </span>
                  {c.room && (
                    <span className="inline-flex items-center gap-1 text-ink-dim">
                      <DoorOpen className="h-3 w-3" aria-hidden /> {c.room}
                    </span>
                  )}
                  {c.subject && (
                    <span className="rounded-full bg-brand-bright/15 px-2 py-0.5 text-brand-soft">
                      {SUBJECT_LABEL[c.subject] ?? c.subject}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
