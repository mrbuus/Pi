"use client";

import { ChevronDown, TrendingUp, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { ErrorState, LoadingState } from "@/components/ui/StateBlock";
import { api } from "@/lib/api";
import ClassActivityHeatmap from "./ClassActivityHeatmap";
import type { ClassActivityDay, ClassYearActivityResponse } from "./types";

/* ============================================================================
 * Багшийн самбарын «Ангийн энэ долоо хоног» карт (шинэ дизайн, 2026-09-26).
 *
 * Жилийн heatmap-ийн оронд: Даваа → Ням, өдөр бүр ангийн хэдэн хувь
 * бодлого хийснийг босоо баганаар. Сурагч тус бүрийн рэйтинг ХЭЗЭЭ Ч
 * гаргахгүй (ClassActivityHeatmap-ийн зарчим хэвээр) — зөвхөн нэгдсэн хувь.
 * Жилийн heatmap устаагүй, «Бүтэн жилийн түүх»-ээр нээгдэнэ.
 * ========================================================================== */

const DAY_SHORT = ["Да", "Мя", "Лх", "Пү", "Ба", "Бя", "Ня"];

function localIso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

type Status = "loading" | "ready" | "error";

export default function ClassWeekCard({ classroomId }: { classroomId: string }) {
  const [data, setData] = useState<ClassYearActivityResponse | null>(null);
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState("");
  const [tick, setTick] = useState(0);
  const [showYear, setShowYear] = useState(false);
  // Анги солигдоход ачааллын төлөвийг render үед шинэчилнэ (effect дотор
  // synchronous setState хийхгүй).
  const [loadedFor, setLoadedFor] = useState(classroomId);
  if (loadedFor !== classroomId) {
    setLoadedFor(classroomId);
    setStatus("loading");
    setShowYear(false);
  }

  useEffect(() => {
    let alive = true;
    api<ClassYearActivityResponse>(`/activity/classroom/${classroomId}?year=${new Date().getFullYear()}`)
      .then((res) => {
        if (!alive) return;
        setData(res);
        setStatus("ready");
      })
      .catch((e) => {
        if (!alive) return;
        setError(e instanceof Error ? e.message : "Ачаалахад алдаа гарлаа");
        setStatus("error");
      });
    return () => {
      alive = false;
    };
  }, [classroomId, tick]);

  const week = useMemo(() => {
    const byDate = new Map<string, ClassActivityDay>();
    for (const d of data?.days ?? []) byDate.set(d.date, d);
    const today = new Date();
    const mondayOffset = (today.getDay() + 6) % 7;
    const todayIso = localIso(today);
    return DAY_SHORT.map((label, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() - mondayOffset + i);
      const iso = localIso(d);
      const day = byDate.get(iso);
      return {
        label,
        iso,
        percent: day?.percent ?? 0,
        active: day?.activeStudents ?? 0,
        isHoliday: day?.isHoliday ?? false,
        isToday: iso === todayIso,
        isFuture: iso > todayIso,
      };
    });
  }, [data]);

  if (status === "loading") {
    return (
      <section className="chunky p-5">
        <LoadingState rows={3} label="Ангийн идэвх" />
      </section>
    );
  }
  if (status === "error") {
    return (
      <ErrorState
        message={error}
        onRetry={() => {
          setStatus("loading");
          setTick((t) => t + 1);
        }}
      />
    );
  }

  const past = week.filter((d) => !d.isFuture && !d.isHoliday);
  const avg = past.length ? Math.round(past.reduce((s, d) => s + d.percent, 0) / past.length) : 0;
  const todayRow = week.find((d) => d.isToday);

  return (
    <section aria-labelledby="class-week-title" className="overflow-hidden chunky">
      <div className="flex flex-wrap items-center gap-4 bg-accent-teal/10 p-5">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-accent-teal/15 text-accent-teal">
          <TrendingUp className="h-8 w-8" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h2 id="class-week-title" className="text-sm font-semibold text-ink-dim">
            Ангийн идэвх, энэ долоо хоног
          </h2>
          <p className="font-display text-3xl font-bold leading-tight tabular-nums text-ink">
            {avg}% <span className="text-base font-bold text-ink-dim">дундаж</span>
          </p>
        </div>
        {todayRow && (
          <p className="flex w-full items-center justify-center gap-1.5 rounded-full bg-panel/70 px-3 py-1.5 text-sm font-semibold text-ink sm:w-auto">
            <Users className="h-4 w-4 text-accent-teal" aria-hidden />
            Өнөөдөр {todayRow.active}/{data?.totalStudents ?? 0}
          </p>
        )}
      </div>

      <div className="p-5">
        <ol className="grid h-40 grid-cols-7 items-end gap-2" aria-label="Өдөр бүрийн идэвхтэй сурагчийн хувь">
          {week.map((d) => (
            <li
              key={d.iso}
              className="flex h-full flex-col items-center justify-end gap-1"
              aria-label={`${d.label}: ${d.isFuture ? "ирээгүй" : d.isHoliday ? "амралт" : `${d.percent}%`}${d.isToday ? " (өнөөдөр)" : ""}`}
            >
              <span aria-hidden className="text-xs font-bold tabular-nums text-ink-dim">
                {d.isFuture || d.isHoliday ? "" : `${d.percent}%`}
              </span>
              <div aria-hidden className="flex w-full flex-1 items-end justify-center">
                <span
                  aria-hidden
                  className={`w-full max-w-10 rounded-t-lg transition-[height] motion-reduce:transition-none ${
                    d.isHoliday
                      ? "border border-dashed border-line"
                      : d.isToday
                        ? "bg-brand-bright"
                        : "bg-accent-teal"
                  } ${d.isFuture ? "opacity-30" : ""}`}
                  style={{ height: `${Math.max(d.isHoliday || d.isFuture ? 6 : 4, d.percent)}%` }}
                />
              </div>
              <span aria-hidden className={`text-xs ${d.isToday ? "font-bold text-brand-soft" : "text-ink-dim"}`}>
                {d.label}
              </span>
            </li>
          ))}
        </ol>

        <button
          type="button"
          onClick={() => setShowYear((v) => !v)}
          aria-expanded={showYear}
          className="mt-4 flex min-h-11 w-full items-center justify-center gap-1.5 rounded-xl text-sm font-semibold text-brand-soft transition hover:bg-brand-bright/10"
        >
          {showYear ? "Жилийн түүхийг хаах" : "Бүтэн жилийн түүх"}
          <ChevronDown
            className={`h-4 w-4 transition-transform motion-reduce:transition-none ${showYear ? "rotate-180" : ""}`}
            aria-hidden
          />
        </button>
      </div>
      {showYear && (
        <div className="border-t border-line">
          <ClassActivityHeatmap classroomId={classroomId} />
        </div>
      )}
    </section>
  );
}
