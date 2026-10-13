"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { MetaTitle } from "@/components/ui/Meta";
import { ErrorState, LoadingState } from "@/components/ui/StateBlock";
import { cn } from "@/lib/cn";
import { BAR_FILL, correctTone, type StudentSummary as Summary } from "./analytics";
import { errorText } from "./types";

/**
 * «Дүн» табын сурагчийн мөр дэлгэрэхэд: хэсэг/сэдвийн задаргаа, алдсан
 * бодлогууд, бусад шалгалтын дүнгийн явц (жижиг шугам).
 */
export default function StudentSummary({ testId, studentId }: { testId: string; studentId: string }) {
  const [data, setData] = useState<Summary | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setError("");
    try {
      setData(
        await api<Summary>(
          `/exams/${encodeURIComponent(testId)}/students/${encodeURIComponent(studentId)}`,
        ),
      );
    } catch (e) {
      setError(errorText(e, "Сурагчийн задаргааг ачаалж чадсангүй"));
    }
  }, [testId, studentId]);
  useEffect(() => {
    const t = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(t);
  }, [load]);

  if (error) return <ErrorState message={error} onRetry={() => void load()} />;
  if (!data) return <LoadingState rows={2} label="Сурагчийн задаргаа ачаалж байна" />;

  const part = (label: string, got: number, max: number) =>
    max > 0 ? (
      <span className="rounded-lg border border-line bg-surface px-2 py-1 text-sm tabular-nums text-ink">
        {label}: <span className="font-bold">{got}</span>/{max}
      </span>
    ) : null;

  return (
    <div className="space-y-3 rounded-xl border border-line bg-panel/60 p-3 text-sm">
      {data.parts && (
        <div className="flex flex-wrap gap-2">
          {part("I хэсэг", data.parts.part1, data.parts.part1Max)}
          {part("II хэсэг", data.parts.part2, data.parts.part2Max)}
        </div>
      )}
      {!data.parts && data.result && (
        <p className="text-ink-dim">Зөвхөн нийт оноо орсон — бодлогын задаргаа алга.</p>
      )}
      {data.absent && <p className="text-ink-dim">Энэ шалгалтад ирээгүй.</p>}

      {data.topics.length > 1 && (
        <ul className="space-y-1">
          {data.topics.map((t) => (
            <li key={t.key} className="flex items-center gap-2">
              <span className="w-28 shrink-0 truncate text-ink sm:w-40">
                <MetaTitle>{t.name}</MetaTitle>
              </span>
              <span className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-line/40">
                <span
                  className={cn("block h-full rounded-full", BAR_FILL[correctTone(t.percent)])}
                  style={{ width: `${t.percent}%` }}
                />
              </span>
              <span className="w-10 shrink-0 text-right tabular-nums text-ink">{t.percent}%</span>
            </li>
          ))}
        </ul>
      )}

      {data.wrong.length > 0 && (
        <div>
          <p className="mb-1 text-xs font-semibold text-ink-dim">Алдсан бодлого ({data.wrong.length})</p>
          <div className="flex flex-wrap gap-1">
            {data.wrong.map((w) => (
              <span
                key={w.key}
                className={cn(
                  "rounded-md border px-1.5 py-0.5 text-xs tabular-nums",
                  w.status === "BLANK" ? "border-line text-ink-dim" : "border-error/40 text-error",
                )}
                title={w.status === "BLANK" ? "Хариулаагүй" : "Буруу"}
              >
                {w.part === 1 ? `#${w.label}` : w.label}
              </span>
            ))}
          </div>
        </div>
      )}

      <Trend points={data.trend} />
    </div>
  );
}

function Trend({ points }: { points: Summary["trend"] }) {
  if (points.length < 2) {
    return <p className="text-xs text-ink-dim">Бусад шалгалтын дүн хараахан алга.</p>;
  }
  const w = 200;
  const h = 40;
  const pad = 5;
  const step = (w - pad * 2) / (points.length - 1);
  const xy = points.map((p, i) => [pad + i * step, h - pad - (p.percent / 100) * (h - pad * 2)] as const);
  const first = points[0];
  const last = points[points.length - 1];
  return (
    <div>
      <p className="mb-1 text-xs font-semibold text-ink-dim">Сүүлийн {points.length} шалгалтын явц</p>
      <svg
        viewBox={`0 0 ${w} ${h}`}
        preserveAspectRatio="xMinYMid meet"
        className="h-12 w-full max-w-md text-brand-bright"
        role="img"
        aria-label={`Сүүлийн ${points.length} шалгалтын хувь: ${points.map((p) => `${p.percent}%`).join(", ")}`}
      >
        <polyline
          points={xy.map(([x, y]) => `${x},${y}`).join(" ")}
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          vectorEffect="non-scaling-stroke"
          strokeLinejoin="round"
        />
        {xy.map(([x, y], i) => (
          <circle
            key={points[i].testId}
            cx={x}
            cy={y}
            r={points[i].current ? 3.5 : 2.2}
            className={points[i].current ? "fill-brand" : "fill-current"}
            vectorEffect="non-scaling-stroke"
          >
            <title>{`${points[i].title.replace(/\s+·\s+/g, " — ")}: ${points[i].percent}%`}</title>
          </circle>
        ))}
      </svg>
      <p className="mt-1 flex flex-wrap justify-between gap-2 text-xs text-ink-dim">
        <span>
          <MetaTitle>{first.title}</MetaTitle> {first.percent}%
        </span>
        <span>
          <MetaTitle>{last.title}</MetaTitle> {last.percent}%
        </span>
      </p>
    </div>
  );
}
