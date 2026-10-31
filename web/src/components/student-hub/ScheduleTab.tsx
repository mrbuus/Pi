"use client";

import { CalendarDays } from "lucide-react";
import UpcomingAgenda from "@/components/schedule/UpcomingAgenda";
import WeeklyGrid from "@/components/schedule/WeeklyGrid";
import { todayUBKey, type ScheduleMeResponse } from "@/components/schedule/types";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/StateBlock";
import { useApi } from "./lib";

/**
 * «Хуваарь» таб — өмнөх /app/schedule (сурагч) хуудасны 7 хоногийн хуваарь ба ойрын
 * өдрүүд. Хийсэн хичээлийн түүх «Хичээлүүд» табд шилжсэн тул энд давхардуулахгүй.
 */
export default function ScheduleTab() {
  const me = useApi<ScheduleMeResponse>("/schedule/me");
  if (me.status === "loading") return <LoadingState rows={4} label="Хуваарь" />;
  if (me.status === "error") return <ErrorState message={me.error} onRetry={me.reload} />;
  if (!me.data?.classroomId) {
    return <EmptyState icon={CalendarDays} title="Идэвхтэй анги алга" hint="Ангид элссэний дараа хуваарь энд харагдана" />;
  }
  const weekday = new Date(`${todayUBKey()}T00:00:00.000Z`).getUTCDay();
  return (
    <div className="space-y-6">
      <section>
        <h2 className="mb-3 font-bold text-brand-soft">7 хоногийн хуваарь</h2>
        <WeeklyGrid entries={me.data.entries} todayWeekday={weekday} />
      </section>
      <section>
        <h2 className="mb-3 font-bold text-brand-soft">Ойрын өдрүүд</h2>
        <UpcomingAgenda classroomId={me.data.classroomId} />
      </section>
    </div>
  );
}
