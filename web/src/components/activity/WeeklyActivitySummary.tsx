"use client";
import { useMemo } from "react";
interface WeeklyStats {
  dayOfWeek: number;
  problemsCompleted: number;
  testsSubmitted: number;
  minutesSpent: number;
  hasErrors: boolean;
  isHoliday: boolean;
}
interface WeeklyActivitySummaryProps {
  week: WeeklyStats[];
  previousWeek?: WeeklyStats[];
  studentId?: string;
}
const WEEKDAY: Record<number, string> = {
  1: "Даваа",
  2: "Мягмар",
  3: "Лхагва",
  4: "Пүрэв",
  5: "Баасан",
  6: "Бямба",
  7: "Ням",
};
export default function WeeklyActivitySummary({
  week,
  previousWeek,
}: WeeklyActivitySummaryProps) {
  const stats = useMemo(
    () => ({
      total: week.reduce((n, d) => n + d.problemsCompleted, 0),
      minutes: week.reduce((n, d) => n + d.minutesSpent, 0),
      tests: week.reduce((n, d) => n + d.testsSubmitted, 0),
      active: week.filter(
        (d) =>
          d.problemsCompleted > 0 || d.testsSubmitted > 0 || d.minutesSpent > 0,
      ).length,
    }),
    [week],
  );
  const previous = previousWeek?.reduce((n, d) => n + d.problemsCompleted, 0);
  return (
    <section className="rounded-2xl border border-line bg-surface p-4 sm:p-6">
      <h2 className="font-bold text-brand-soft">Долоо хоногийн идэвх</h2>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Бодсон бодлого", value: stats.total },
          { label: "Идэвхтэй өдөр", value: `${stats.active}/${week.length}` },
          { label: "Илгээсэн шалгалт", value: stats.tests },
          {
            label: "Зарцуулсан хугацаа",
            value: `${Math.floor(stats.minutes / 60)} цаг ${Math.round(stats.minutes % 60)} мин`,
          },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-xl border border-line bg-panel p-3"
          >
            <p className="text-xs text-ink-dim">{s.label}</p>
            <p className="mt-1 text-lg font-bold">{s.value}</p>
          </div>
        ))}
      </div>
      {previous !== undefined && (
        <p className="mt-3 text-sm text-ink-dim">
          Өмнөх долоо хоног: {previous} бодлого. Энэ долоо хоног: {stats.total}{" "}
          бодлого.
        </p>
      )}
      <details className="mt-4 rounded-xl border border-line">
        <summary className="min-h-11 cursor-pointer px-3 py-3 text-sm font-semibold">
          Өдөр бүрийн мэдээлэл
        </summary>
        <div className="border-t border-line p-3">
          <p className="mb-3 text-sm text-ink-dim">
            Өдөрт дунджаар{" "}
            {week.length ? Math.round(stats.total / week.length) : 0} бодлого.
          </p>
          <div
            className="flex h-32 items-end gap-2"
            role="img"
            aria-label={`Өдрийн бодлогын тоо: ${week.map((d) => `${WEEKDAY[d.dayOfWeek]} ${d.problemsCompleted}`).join(", ")}`}
          >
            {week.map((d) => (
              <div
                key={d.dayOfWeek}
                className="flex min-w-0 flex-1 flex-col items-center justify-end gap-2"
              >
                <span className="text-xs tabular-nums text-ink">
                  {d.problemsCompleted}
                </span>
                <div
                  aria-hidden
                  className={`w-full max-w-8 rounded-t-md ${d.problemsCompleted ? "bg-brand" : "bg-line"}`}
                  style={{
                    height: `${Math.max(3, (d.problemsCompleted / Math.max(1, ...week.map((day) => day.problemsCompleted))) * 70)}px`,
                  }}
                />
                <span className="text-[10px] text-ink-dim">
                  {WEEKDAY[d.dayOfWeek]?.slice(0, 2)}
                </span>
              </div>
            ))}
          </div>
        </div>
        <div className="overflow-x-auto border-t border-line">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">
              Долоо хоногийн өдөр бүрийн суралцах идэвх
            </caption>
            <thead>
              <tr className="border-b border-line">
                <th scope="col" className="p-3">
                  Гараг
                </th>
                <th scope="col" className="p-3">
                  Бодлого
                </th>
                <th scope="col" className="p-3">
                  Шалгалт
                </th>
                <th scope="col" className="p-3">
                  Минут
                </th>
              </tr>
            </thead>
            <tbody>
              {week.map((d) => (
                <tr key={d.dayOfWeek} className="border-b border-line">
                  <th scope="row" className="p-3 font-medium">
                    {WEEKDAY[d.dayOfWeek] ?? "Өдөр"}
                    {d.isHoliday && (
                      <span className="block text-xs font-normal text-ink-dim">
                        Амралт
                      </span>
                    )}
                  </th>
                  <td className="p-3">{d.problemsCompleted}</td>
                  <td className="p-3">{d.testsSubmitted}</td>
                  <td className="p-3">{d.minutesSpent}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </section>
  );
}
