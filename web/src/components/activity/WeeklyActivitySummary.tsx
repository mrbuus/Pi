"use client";

import { TrendingUp, TrendingDown } from "lucide-react";
import { useMemo } from "react";
import { Meta, Dot } from "@/components/ui/Meta";
import MathText from "@/components/MathText";

interface WeeklyStats {
  /** Сургуулийн долоо хоногийн өдөр (1=Даваа…7=Ням). Ямар өдөр байгаа. */
  dayOfWeek: number;
  /** Тэр өдөр хийсэн бодлого / хичээл оссон үе. */
  problemsCompleted: number;
  testsSubmitted: number;
  minutesSpent: number;
  /** Алдаа, дахь оролдлого байсан уу */
  hasErrors: boolean;
  /** Амралт, завсарлагын өдөр эсэх. */
  isHoliday: boolean;
}

interface WeeklyActivitySummaryProps {
  week: WeeklyStats[];
  /** Өнгөрсөн долоо хоногтой харьцуулалт */
  previousWeek?: WeeklyStats[];
  studentId?: string;
}

// Сургуулийн өдрийн монгол нэр
const WEEKDAY_NAMES: Record<number, string> = {
  1: "Дав",
  2: "Лхб",
  3: "Пүв",
  4: "Баа",
  5: "Бис",
  6: "Бяа",
  7: "Ням",
};

function getActivityLevel(completed: number): "high" | "medium" | "low" | "none" {
  if (completed >= 5) return "high";
  if (completed >= 3) return "medium";
  if (completed >= 1) return "low";
  return "none";
}

function getLevelColor(level: "high" | "medium" | "low" | "none"): string {
  switch (level) {
    case "high":
      return "bg-accent-teal/80";
    case "medium":
      return "bg-accent-teal/50";
    case "low":
      return "bg-accent-teal/25";
    case "none":
      return "bg-line";
  }
}

function getBarHeight(level: "high" | "medium" | "low" | "none"): string {
  switch (level) {
    case "high":
      return "h-16";
    case "medium":
      return "h-10";
    case "low":
      return "h-6";
    case "none":
      return "h-2";
  }
}

export default function WeeklyActivitySummary({
  week,
  previousWeek,
  studentId,
}: WeeklyActivitySummaryProps) {
  const stats = useMemo(() => {
    const total = week.reduce((sum, day) => sum + day.problemsCompleted, 0);
    const avgPerDay = week.length > 0 ? Math.round(total / week.length) : 0;
    const daysActive = week.filter((d) => d.problemsCompleted > 0 && !d.isHoliday).length;
    const totalMinutes = week.reduce((sum, day) => sum + day.minutesSpent, 0);

    // Өнгөрсөн долоо хоногтой харьцуулалт
    const prevTotal = previousWeek
      ? previousWeek.reduce((sum, day) => sum + day.problemsCompleted, 0)
      : null;
    const change = prevTotal !== null ? total - prevTotal : null;
    const percentChange = prevTotal && prevTotal > 0 ? Math.round(((change ?? 0) / prevTotal) * 100) : null;

    return {
      total,
      avgPerDay,
      daysActive,
      totalMinutes,
      prevTotal,
      change,
      percentChange,
    };
  }, [week, previousWeek]);

  const daysWithoutHoliday = week.filter((d) => !d.isHoliday);

  return (
    <section className="rounded-2xl border border-line bg-panel p-4 md:p-6">
      {/* Гарчиг */}
      <div className="mb-6 flex flex-col gap-2">
        <h2 className="font-bold text-brand-soft">Энэ долоо хоногийн идэвх</h2>
        <p className="text-sm text-ink-dim">
          Таны сургалтын явцыг нэг харц нь ойлгоход туслах байдал.
        </p>
      </div>

      {/* Үндсэн тоо */}
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        {/* Нийт бодлого */}
        <div className="rounded-lg bg-accent-teal/10 px-3 py-3">
          <p className="text-xs text-ink-dim">Нийт бодлого</p>
          <p className="text-xl font-bold text-ink">{stats.total}</p>
          {stats.change !== null && (
            <div
              className={`mt-1 flex items-center gap-1 text-xs ${
                stats.change > 0 ? "text-accent-gold" : stats.change < 0 ? "text-error" : "text-ink-dim"
              }`}
            >
              {stats.change > 0 ? (
                <TrendingUp className="h-3 w-3" aria-hidden />
              ) : stats.change < 0 ? (
                <TrendingDown className="h-3 w-3" aria-hidden />
              ) : null}
              <span>
                {stats.change > 0 ? "+" : ""}
                {stats.change}{" "}
                {stats.percentChange !== null && `(${stats.percentChange > 0 ? "+" : ""}${stats.percentChange}%)`}
              </span>
            </div>
          )}
        </div>

        {/* Идэвхтэй өдөр */}
        <div className="rounded-lg bg-accent-gold/10 px-3 py-3">
          <p className="text-xs text-ink-dim">Идэвхтэй өдөр</p>
          <p className="text-xl font-bold text-ink">
            {stats.daysActive}
            <span className="text-xs text-ink-dim">/7</span>
          </p>
          <p className="mt-1 text-xs text-ink-dim">
            {stats.daysActive === 7 ? "Төгс долоо хоног!" : `${7 - stats.daysActive} өдөр үлдэв`}
          </p>
        </div>

        {/* Дунджаа өдөрт */}
        <div className="rounded-lg bg-accent-purple/10 px-3 py-3">
          <p className="text-xs text-ink-dim">Дунджаа/өдөр</p>
          <p className="text-xl font-bold text-ink">
            <MathText>x</MathText> ≈ {stats.avgPerDay}
          </p>
          <p className="mt-1 text-xs text-ink-dim">сургалтын цаг</p>
        </div>

        {/* Нийт цаг */}
        <div className="rounded-lg bg-accent-green/10 px-3 py-3">
          <p className="text-xs text-ink-dim">Нийт цаг</p>
          <p className="text-xl font-bold text-ink">{Math.round(stats.totalMinutes / 60)}h</p>
          <p className="mt-1 text-xs text-ink-dim">{stats.totalMinutes % 60}м</p>
        </div>
      </div>

      {/* Гол диаграм — хичээлийн долоо хоног */}
      <div className="mb-6 rounded-lg bg-bg-secondary p-4">
        <p className="mb-3 text-xs font-semibold text-ink-dim">ДОЛОО ХОНОГИЙН ГРАФИК</p>

        <div className="flex items-end justify-between gap-2" role="img" aria-label={`Идэвхийн диаграмм: ${stats.total} бодлого`}>
          {week.map((day) => {
            const level = getActivityLevel(day.problemsCompleted);
            const barColor = getLevelColor(level);
            const barHeight = getBarHeight(level);

            return (
              <div key={day.dayOfWeek} className="flex flex-col items-center gap-2">
                {/* Баар */}
                <div
                  className={`w-8 rounded-t-md transition ${barColor} ${barHeight} flex items-end justify-center pb-1`}
                  title={
                    day.isHoliday
                      ? `${WEEKDAY_NAMES[day.dayOfWeek]} (амралт): ${day.problemsCompleted} бодлого`
                      : `${WEEKDAY_NAMES[day.dayOfWeek]}: ${day.problemsCompleted} бодлого`
                  }
                >
                  {day.problemsCompleted > 0 && (
                    <span className="text-xs font-bold text-ink">{day.problemsCompleted}</span>
                  )}
                </div>

                {/* Өдрийн нэр */}
                <p className="text-xs font-semibold text-ink-dim">{WEEKDAY_NAMES[day.dayOfWeek]}</p>

                {/* Амралтын заалт */}
                {day.isHoliday && (
                  <span
                    className="h-1.5 w-1.5 rounded-full bg-line"
                    aria-label="амралтын өдөр"
                    title="Амралтын өдөр"
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Тайлбар */}
        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-ink-dim">
          <span>Өндрийн утга:</span>
          <Meta
            items={[
              <span key="high" className="flex items-center gap-1">
                <span className="inline-block h-3 w-3 rounded-sm bg-accent-teal/80" aria-hidden />
                <span>их идэвх</span>
              </span>,
              <span key="medium" className="flex items-center gap-1">
                <span className="inline-block h-3 w-3 rounded-sm bg-accent-teal/50" aria-hidden />
                <span>дундаж</span>
              </span>,
              <span key="low" className="flex items-center gap-1">
                <span className="inline-block h-3 w-3 rounded-sm bg-accent-teal/25" aria-hidden />
                <span>бага</span>
              </span>,
            ]}
          />
        </div>
      </div>

      {/* Сөнгөгний ухаалгуудлага */}
      <div className="text-xs text-ink-dim">
        <p className="mb-2 font-semibold">Ухаалгуудлага:</p>
        <ul className="list-disc pl-5 space-y-1 pl-4">
          <li>Долоо хоног бүрийн идэвх нь сургалтын хүчтэй байдлын үзүүлэлт.
          </li>
          <li>Амралтын өдөрт бодлого хийвэл та <strong>сунгалтаас давж байна!</strong>
          </li>
          <li><MathText>x \approx 5</MathText> бодлого/өдөрт бол хотон сонголтын идэвхийн түвшин.
          </li>
        </ul>
      </div>
    </section>
  );
}
