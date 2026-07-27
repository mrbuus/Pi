"use client";

import type { ClassroomRow } from "./types";

// Оролцооны хувиар өнгө сонгоно — гэхдээ өнгө дангаараа утга илэрхийлэхгүй,
// хувь тоо болон "Хоцорч байна" гэсэн шошго үргэлж хамт харагдана.
function band(rate: number): { colorClass: string; label: string | null } {
  if (rate < 0.5) return { colorClass: "bg-error", label: "Хоцорч байна" };
  if (rate < 0.75) return { colorClass: "bg-warning", label: "Анхаарах" };
  return { colorClass: "bg-success", label: null };
}

function pct(v: number): string {
  return `${Math.round(v * 100)}%`;
}

export default function ClassroomTable({ rows }: { rows: ClassroomRow[] }) {
  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-line px-3 py-4 text-sm text-ink-dim">
        Идэвхтэй анги алга.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[560px] text-left text-sm">
        <thead>
          <tr className="text-xs text-ink-dim">
            <th className="px-2 py-2 font-semibold">Анги</th>
            <th className="px-2 py-2 font-semibold">Элссэн</th>
            <th className="px-2 py-2 font-semibold">Идэвхтэй</th>
            <th className="px-2 py-2 font-semibold">Оролцооны хувь</th>
            <th className="px-2 py-2 font-semibold">
              Дундаж бодлого/сурагч
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const { colorClass, label } = band(r.participationRate);
            return (
              <tr key={r.classroomId} className="border-t border-line">
                <td className="px-2 py-2 font-medium text-ink">
                  {r.classroomName}
                </td>
                <td className="px-2 py-2 text-ink-dim">{r.enrolled}</td>
                <td className="px-2 py-2 text-ink-dim">{r.active}</td>
                <td className="px-2 py-2">
                  <div className="flex items-center gap-2">
                    <div
                      className="h-2 w-24 overflow-hidden rounded-full bg-line/60"
                      role="img"
                      aria-label={`Оролцооны хувь ${pct(r.participationRate)}`}
                    >
                      <div
                        className={`h-full rounded-full ${colorClass}`}
                        style={{ width: pct(r.participationRate) }}
                      />
                    </div>
                    <span className="text-xs font-semibold text-ink">
                      {pct(r.participationRate)}
                    </span>
                    {label && (
                      <span className="text-[11px] text-ink-dim">{label}</span>
                    )}
                  </div>
                </td>
                <td className="px-2 py-2 text-ink-dim">
                  {r.avgProblemsPerActiveStudent.toFixed(1)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
