"use client";

import { CircleAlert, TriangleAlert, type LucideIcon } from "lucide-react";

type AttentionSeverity = "danger" | "warning";

interface AttentionFlag {
  type: string;
  severity: AttentionSeverity;
  title: string;
  detail: string;
}

interface AttentionRow {
  student: {
    id: string;
    firstName: string;
    lastName: string;
    name: string;
  };
  flags: AttentionFlag[];
}

interface AttentionResponse {
  date: string;
  windowDays: number;
  rows: AttentionRow[];
  totals: {
    flagged: number;
    students: number;
  };
}

interface AttentionSectionProps {
  attention: AttentionResponse | null;
}

const SEVERITY_CLASS: Record<AttentionSeverity, string> = {
  danger: "border-error/40 bg-error/10 text-error",
  warning: "border-warning/40 bg-warning/10 text-warning",
};
// Өнгө дангаараа утга илэрхийлэхгүй байхын тулд ноцтой байдал бүрд ДҮРС нэмнэ
// (өнгө ялгадаггүй хэрэглэгчид өнгө нь юу ч хэлэхгүй — DESIGN.md §6).
const SEVERITY_ICON: Record<AttentionSeverity, LucideIcon> = {
  danger: CircleAlert,
  warning: TriangleAlert,
};

export type { AttentionResponse };

export default function AttentionSection({ attention }: AttentionSectionProps) {
  return (
    <section className="rounded-2xl border border-line bg-panel p-4 md:p-6">
      <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="font-bold text-brand-soft">Анхаарах</h2>
          <p className="text-xs text-ink-dim">
            Ирц ба {attention?.windowDays ?? 3} өдрийн оройн тэмдэглэгээ
          </p>
        </div>
        {attention && (
          <span className="text-xs text-ink-dim">
            {attention.totals.flagged}/{attention.totals.students}
          </span>
        )}
      </div>

      {!attention && (
        <p className="text-sm text-ink-dim">Анхаарах мэдээлэл ачаалагдсангүй.</p>
      )}

      {attention && attention.rows.length === 0 && (
        <div className="rounded-lg border border-success/20 bg-success/10 px-3 py-2 text-sm text-success">
          Одоогоор онцгой анхаарах сурагч алга.
        </div>
      )}

      {attention && attention.rows.length > 0 && (
        <div className="space-y-3">
          {attention.rows.slice(0, 12).map((row) => (
            <div
              key={row.student.id}
              className="border-b border-line pb-3 last:border-b-0 last:pb-0"
            >
              <p className="text-sm font-semibold">{row.student.name}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {row.flags.map((flag) => (
                  <span
                    key={`${row.student.id}-${flag.type}-${flag.title}`}
                    className={`rounded-lg border px-2.5 py-1 text-xs ${SEVERITY_CLASS[flag.severity]}`}
                    title={flag.detail}
                  >
                    {(() => {
                      const Icon = SEVERITY_ICON[flag.severity];
                      return <Icon className="mr-1 inline h-3 w-3" aria-hidden />;
                    })()}
                    {flag.title}
                  </span>
                ))}
              </div>
              <p className="mt-1.5 text-xs text-ink-dim">
                {row.flags.map((flag) => flag.detail).join(" · ")}
              </p>
            </div>
          ))}
          {attention.rows.length > 12 && (
            <p className="text-xs text-ink-dim">
              +{attention.rows.length - 12} сурагч
            </p>
          )}
        </div>
      )}
    </section>
  );
}
