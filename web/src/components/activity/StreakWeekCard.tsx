"use client";

import { Check, ChevronDown, Sparkles, Target, Trophy } from "lucide-react";
import Flame from "@/components/illustrations/Flame";
import { useEffect, useMemo, useState } from "react";
import { ErrorState, LoadingState } from "@/components/ui/StateBlock";
import { api } from "@/lib/api";
import ActivityHeatmap from "./ActivityHeatmap";
import type { ActivityDay, StreakResponse, YearActivityResponse } from "./types";

/* ============================================================================
 * Сурагчийн самбарын «энэ долоо хоног» карт (шинэ дизайн, 2026-09-26).
 *
 * Эзэн жилийн heatmap-д дургүй байсан — жижиг нүднүүд утсан дээр уншигдахгүй,
 * урам өгдөггүй. Оронд нь: дараалсан өдрийн тоо (streak) том, 7 хоногийн
 * дугуй тууз, урам өгөх үг. Жилийн heatmap устаагүй — «Бүтэн жилийн түүх»
 * дотор нээхэд л ачаална.
 *
 * Долоо хоног Даваагаас эхэлнэ (эзний дугаарлалт 1=Даваа…7=Ням).
 * ========================================================================== */

const DAY_SHORT = ["Да", "Мя", "Лх", "Пү", "Ба", "Бя", "Ня"];

// Орон нутгийн (Улаанбаатар) огноо — toISOString() нь UTC тул өглөө 8-аас
// өмнө өчигдрийг буцаана.
function localIso(d: Date): string {
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

function cheer(streak: number, activeToday: boolean): string {
  if (streak === 0) return "Өнөөдөр ганц бодлогоор эхлээрэй — дараалал эндээс эхэлнэ.";
  if (!activeToday) return `${streak} өдрийн дараалал хүлээж байна — өнөөдөр ч бас бодоорой!`;
  if (streak < 3) return "Сайн эхлэл! Маргааш ч үргэлжлүүлээрэй.";
  if (streak < 7) return "Гайхалтай хэмнэл байна. Долоо хоногийг бүтэн болгоё!";
  return "Зогсоох аргагүй! Энэ хэмнэлээрээ шалгалтдаа бэлэн болно.";
}

type Status = "loading" | "ready" | "error";

export default function StreakWeekCard() {
  const [year, setYear] = useState<YearActivityResponse | null>(null);
  const [streak, setStreak] = useState<StreakResponse | null>(null);
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState("");
  const [tick, setTick] = useState(0);
  const [showYear, setShowYear] = useState(false);

  useEffect(() => {
    let alive = true;
    const now = new Date();
    Promise.all([
      api<YearActivityResponse>(`/activity/me?year=${now.getFullYear()}`),
      api<StreakResponse>("/activity/streak"),
    ])
      .then(([y, s]) => {
        if (!alive) return;
        setYear(y);
        setStreak(s);
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
  }, [tick]);

  // Энэ долоо хоногийн Даваа → Ням. Жилийн эхэнд өмнөх оны өдрүүд
  // өгөгдөлд байхгүй тул «өгөгдөлгүй» гэж харагдана (0 бодлого).
  const week = useMemo(() => {
    const byDate = new Map<string, ActivityDay>();
    for (const d of year?.days ?? []) byDate.set(d.date, d);
    const today = new Date();
    const mondayOffset = (today.getDay() + 6) % 7; // JS 0=Ням → Даваа=0
    const todayIso = localIso(today);
    return DAY_SHORT.map((label, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() - mondayOffset + i);
      const iso = localIso(d);
      const day = byDate.get(iso);
      return {
        label,
        iso,
        count: day?.count ?? 0,
        isHoliday: day?.isHoliday ?? false,
        isToday: iso === todayIso,
        isFuture: iso > todayIso,
      };
    });
  }, [year]);

  function reload() {
    setStatus("loading");
    setTick((t) => t + 1);
  }

  if (status === "loading") {
    return (
      <section className="chunky p-5">
        <LoadingState rows={3} label="Идэвх" />
      </section>
    );
  }
  if (status === "error") {
    return <ErrorState message={error} onRetry={reload} />;
  }

  const current = streak?.currentStreak ?? 0;
  const activeToday = week.some((d) => d.isToday && d.count > 0);
  const weekProblems = week.reduce((sum, d) => sum + d.count, 0);
  const weekActiveDays = week.filter((d) => d.count > 0).length;

  return (
    <section
      aria-labelledby="streak-title"
      className="overflow-hidden chunky"
    >
      <div className="flex items-center gap-4 bg-accent-gold/10 p-5">
        <span className="flex h-20 w-20 shrink-0 items-center justify-center rounded-3xl bg-surface/70">
          <Flame lit={current > 0} className="h-14 w-14" />
        </span>
        <div className="min-w-0">
          <h2 id="streak-title" className="text-sm font-semibold text-ink-dim">
            Дараалсан өдөр
          </h2>
          <p className="font-display text-3xl font-bold leading-tight text-ink tabular-nums">
            {current} <span className="text-lg font-bold">өдөр</span>
          </p>
          <p className="mt-0.5 text-sm text-ink-dim">{cheer(current, activeToday)}</p>
        </div>
      </div>

      <div className="p-5">
        <ol className="grid grid-cols-7 gap-1.5" aria-label="Энэ долоо хоногийн идэвх">
          {week.map((d) => {
            const done = d.count > 0;
            const aria = `${d.label}: ${
              d.isFuture ? "ирээгүй" : done ? `${d.count} бодлого` : d.isHoliday ? "амралт" : "идэвхгүй"
            }${d.isToday ? " (өнөөдөр)" : ""}`;
            return (
              <li key={d.iso} className="flex flex-col items-center gap-1" aria-label={aria}>
                <span
                  className={`flex h-10 w-10 items-center justify-center rounded-full border-2 text-xs font-bold transition-colors ${
                    done
                      ? "border-accent-teal bg-accent-teal text-on-teal"
                      : d.isToday
                        ? "border-brand-bright bg-brand-bright/10 text-brand-soft"
                        : d.isHoliday
                          ? "border-dashed border-line text-ink-dim"
                          : "border-line text-ink-dim"
                  } ${d.isFuture ? "opacity-50" : ""}`}
                >
                  {done ? <Check className="h-5 w-5" strokeWidth={3} aria-hidden /> : null}
                </span>
                <span
                  className={`text-xs ${d.isToday ? "font-bold text-brand-soft" : "text-ink-dim"}`}
                  aria-hidden
                >
                  {d.label}
                </span>
              </li>
            );
          })}
        </ol>

        <dl className="mt-5 grid grid-cols-3 gap-2 text-center">
          <div className="flex flex-col rounded-2xl bg-accent-teal/10 px-2 py-3">
            <dt className="order-last text-xs text-ink-dim">бодлого энэ 7 хоногт</dt>
            <dd className="text-xl font-extrabold tabular-nums text-ink [&>svg]:mb-1">
              <Target className="mx-auto h-5 w-5 text-accent-teal" aria-hidden />
              {weekProblems}
            </dd>
          </div>
          <div className="flex flex-col rounded-2xl bg-accent-violet/10 px-2 py-3">
            <dt className="order-last text-xs text-ink-dim">идэвхтэй өдөр</dt>
            <dd className="text-xl font-extrabold tabular-nums text-ink [&>svg]:mb-1">
              <Sparkles className="mx-auto h-5 w-5 text-accent-violet" aria-hidden />
              {weekActiveDays}/7
            </dd>
          </div>
          <div className="flex flex-col rounded-2xl bg-accent-gold/10 px-2 py-3">
            <dt className="order-last text-xs text-ink-dim">хамгийн урт дараалал</dt>
            <dd className="text-xl font-extrabold tabular-nums text-ink [&>svg]:mb-1">
              <Trophy className="mx-auto h-5 w-5 text-accent-gold" aria-hidden />
              {streak?.longestStreak ?? 0}
            </dd>
          </div>
        </dl>

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
          <ActivityHeatmap />
        </div>
      )}
    </section>
  );
}
