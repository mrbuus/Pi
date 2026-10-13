"use client";

import { Gauge, GraduationCap, type LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/kit/badge";
import InfoHint from "@/components/ui/InfoHint";
import { Meta } from "@/components/ui/Meta";
import { formatMnDate } from "@/lib/dateMn";
import { cn } from "@/lib/cn";

/**
 * «Түвшин, чадварын оноо» ба «ЭЕШ-ийн таамаг оноо» — эзэн алгоритмаа дараа
 * нэмнэ (2026-10-12). Одоохондоо өгөгдөл ирэхгүй тул «Тун удахгүй» төлөвтэй.
 * Бодит тоо ирэхэд зөвхөн `skill` / `prediction` props-ыг дамжуулахад хангалттай.
 */

/** Цаг хугацааны нэг цэг — жижиг явцын графикт */
export interface ScoreTrendPoint {
  /** ISO огноо */
  at: string;
  value: number;
}

/** Түвшин, чадварын оноо (ж: 0–100) */
export interface SkillScoreData {
  score: number;
  max: number;
  /** «Дунд», «Ахисан» гэх мэт түвшний нэр */
  level?: string | null;
  trend?: ScoreTrendPoint[];
  updatedAt?: string | null;
}

/** ЭЕШ-ийн таамаг оноо (ж: 200–800), итгэлцлийн мужтай */
export interface ExamPredictionData {
  predicted: number;
  max: number;
  low?: number | null;
  high?: number | null;
  trend?: ScoreTrendPoint[];
  updatedAt?: string | null;
}

export interface InsightScoreCardsProps {
  /** null/undefined — «Тун удахгүй» */
  skill?: SkillScoreData | null;
  prediction?: ExamPredictionData | null;
}

export default function InsightScoreCards({ skill, prediction }: InsightScoreCardsProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <ScoreCard
        icon={Gauge}
        title="Түвшин, чадварын оноо"
        hint="Шалгалт, даалгавар, бодлогын гүйцэтгэлээс тооцсон сурагчийн одоогийн түвшин."
        value={skill ? String(skill.score) : null}
        max={skill?.max}
        caption={skill?.level ?? null}
        trend={skill?.trend}
        updatedAt={skill?.updatedAt}
      />
      <ScoreCard
        icon={GraduationCap}
        title="ЭЕШ-ийн таамаг оноо"
        hint="Одоогийн хэмнэлээрээ үргэлжлүүлбэл ЭЕШ-д авах магадлалтай оноо."
        value={prediction ? String(prediction.predicted) : null}
        max={prediction?.max}
        caption={
          prediction && prediction.low != null && prediction.high != null
            ? `${prediction.low}–${prediction.high}`
            : null
        }
        trend={prediction?.trend}
        updatedAt={prediction?.updatedAt}
      />
    </div>
  );
}

function ScoreCard({
  icon: Icon,
  title,
  hint,
  value,
  max,
  caption,
  trend,
  updatedAt,
}: {
  icon: LucideIcon;
  title: string;
  hint: string;
  value: string | null;
  max?: number;
  caption: string | null;
  trend?: ScoreTrendPoint[];
  updatedAt?: string | null;
}) {
  const soon = value === null;
  return (
    <div
      className={cn(
        "min-w-0 rounded-2xl border p-4",
        soon ? "border-dashed border-line bg-bg/60" : "border-line bg-surface",
      )}
    >
      <div className="flex items-center gap-2">
        <Icon className={cn("h-4 w-4 shrink-0", soon ? "text-ink-dim" : "text-brand-soft")} aria-hidden />
        <p className="min-w-0 flex-1 truncate text-sm font-semibold text-ink">{title}</p>
        <InfoHint>{hint}</InfoHint>
        {soon && <Badge tone="neutral">Тун удахгүй</Badge>}
      </div>
      {soon ? (
        // Тоо зохиохгүй — зөвхөн ирээдүйн байрлалын сүүдэр
        <div className="mt-3 flex items-end justify-between gap-3" aria-hidden>
          <span className="h-8 w-20 rounded-lg bg-ink/5" />
          <span className="inline-flex h-8 items-end gap-0.5">
            {[30, 45, 40, 60, 55, 70].map((h, i) => (
              <span key={i} className="w-2 rounded-sm bg-ink/8" style={{ height: `${h}%` }} />
            ))}
          </span>
        </div>
      ) : (
        <div className="mt-2 flex items-end justify-between gap-3">
          <div>
            <p className="font-display text-3xl font-bold tabular-nums text-ink">
              {value}
              {max != null && <span className="text-base font-semibold text-ink-dim">/{max}</span>}
            </p>
            <Meta
              className="text-xs text-ink-dim"
              items={[caption, updatedAt && formatMnDate(updatedAt)]}
            />
          </div>
          {trend && trend.length > 1 && <MiniTrend points={trend} max={max} />}
        </div>
      )}
    </div>
  );
}

function MiniTrend({ points, max }: { points: ScoreTrendPoint[]; max?: number }) {
  const top = max ?? Math.max(...points.map((p) => p.value), 1);
  return (
    <span className="inline-flex h-8 items-end gap-0.5" aria-label="Явц">
      {points.slice(-8).map((p) => (
        <span
          key={p.at}
          className="w-2 rounded-sm bg-brand-bright/70"
          style={{ height: `${Math.max(8, Math.round((p.value / top) * 100))}%` }}
        />
      ))}
    </span>
  );
}
