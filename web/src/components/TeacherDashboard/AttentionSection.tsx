"use client";

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
  danger: "border-red-400/40 bg-red-400/10 text-red-200",
  warning: "border-amber-400/40 bg-amber-400/10 text-amber-200",
};

export type { AttentionResponse };

export default function AttentionSection({ attention }: AttentionSectionProps) {
  return (
    <section className="rounded-2xl border border-white/8 bg-[#0b142e] p-4 md:p-6">
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
        <div className="rounded-lg border border-teal-400/20 bg-teal-400/10 px-3 py-2 text-sm text-teal-200">
          Одоогоор онцгой анхаарах сурагч алга.
        </div>
      )}

      {attention && attention.rows.length > 0 && (
        <div className="space-y-3">
          {attention.rows.slice(0, 12).map((row) => (
            <div
              key={row.student.id}
              className="border-b border-white/8 pb-3 last:border-b-0 last:pb-0"
            >
              <p className="text-sm font-semibold">{row.student.name}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {row.flags.map((flag) => (
                  <span
                    key={`${row.student.id}-${flag.type}-${flag.title}`}
                    className={`rounded-lg border px-2.5 py-1 text-xs ${SEVERITY_CLASS[flag.severity]}`}
                    title={flag.detail}
                  >
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
