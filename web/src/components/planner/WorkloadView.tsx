"use client";

import { STATUS_META, STATUS_ORDER, fullName, initials } from "./statusMeta";
import type { WorkloadRow } from "./types";

// Хэт ачаалалтай гэж үзэх босго (нээлттэй — PLANNED+IN_PROGRESS+BLOCKED тоо)
const OVERLOAD_THRESHOLD = 5;

/**
 * АЧААЛАЛ (workload) харагдац — ажилтан бүрийн нээлттэй даалгаврын тоо,
 * тооцоолсон нийт цаг, төлөв тус бүрийн задаргааг нэг дор харуулж
 * "хэн хэт ачаалалтай байна" гэдгийг НЭГ ХАРАЦААР ойлгуулна.
 */
export default function WorkloadView({
  rows,
  year,
  onYearChange,
}: {
  rows: WorkloadRow[];
  year: number;
  onYearChange: (year: number) => void;
}) {
  const maxHours = Math.max(1, ...rows.map((r) => r.totalEstimateHours));

  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <button
          type="button"
          onClick={() => onYearChange(year - 1)}
          aria-label="Өмнөх жил"
          className="rounded-lg border border-line px-2.5 py-1.5 text-sm text-ink-dim transition hover:text-ink"
        >
          ‹
        </button>
        <span className="min-w-16 text-center text-base font-bold text-ink">{year}</span>
        <button
          type="button"
          onClick={() => onYearChange(year + 1)}
          aria-label="Дараагийн жил"
          className="rounded-lg border border-line px-2.5 py-1.5 text-sm text-ink-dim transition hover:text-ink"
        >
          ›
        </button>
        <p className="ml-2 text-sm text-ink-dim">
          {year} оны даалгавруудад суурилсан ачааллын тойм
        </p>
      </div>

      {rows.length === 0 ? (
        <p className="rounded-xl border border-line bg-panel px-4 py-6 text-center text-sm text-ink-dim">
          Ажилтны мэдээлэл алга.
        </p>
      ) : (
        <div className="space-y-3">
          {rows.map((row) => {
            const overloaded = row.openCount >= OVERLOAD_THRESHOLD;
            const barWidth = (row.totalEstimateHours / maxHours) * 100;
            return (
              <div
                key={row.user.id}
                className="rounded-xl border border-line bg-surface p-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-bright/20 text-xs font-bold text-brand-soft">
                      {initials(row.user.firstName, row.user.lastName)}
                    </span>
                    <span className="text-sm font-semibold text-ink">
                      {fullName(row.user)}
                    </span>
                    {overloaded && (
                      <span className="flex items-center gap-1 rounded-full border border-warning/40 bg-warning/10 px-2 py-0.5 text-xs font-semibold text-warning">
                        ⚠ Ачаалал ихтэй
                      </span>
                    )}
                  </div>
                  <span className="text-sm font-bold text-ink">
                    {row.totalEstimateHours} ц · {row.openCount} нээлттэй
                  </span>
                </div>

                <div
                  className="mt-2 h-3 w-full overflow-hidden rounded-full bg-panel"
                  role="img"
                  aria-label={`${fullName(row.user)}: ${row.totalEstimateHours} цаг тооцоолсон`}
                >
                  <div
                    className="bar-fill h-full rounded-full bg-brand"
                    style={{ width: `${Math.max(barWidth, row.totalEstimateHours > 0 ? 4 : 0)}%` }}
                  />
                </div>

                <div className="mt-2 flex flex-wrap gap-2 text-xs">
                  {STATUS_ORDER.map((s) => {
                    const meta = STATUS_META[s];
                    const count = row.counts[s];
                    if (count === 0) return null;
                    return (
                      <span
                        key={s}
                        className={`flex items-center gap-1 rounded-full border border-line px-2 py-0.5 ${meta.colorClass}`}
                      >
                        <span aria-hidden>{meta.icon}</span>
                        {meta.label}: {count}
                      </span>
                    );
                  })}
                  {STATUS_ORDER.every((s) => row.counts[s] === 0) && (
                    <span className="text-ink-dim">Энэ хугацаанд даалгавар алга</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
