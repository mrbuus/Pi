"use client";

import { useState } from "react";

/* ============================================================================
 * ExamTimer — шалгалтын дээд баруун буланд байрлах тогтмол цаг.
 *
 * Судалгаанд үндэслэсэн зарчим (ACM Mensch-und-Computer 2025):
 *   - Цаг үргэлж НЭГ байрлалд, 100 минутын турш хөдлөхгүй (сурагч урьдчилан
 *     хаанаас харахаа мэддэг байх ёстой).
 *   - Зөвхөн 10 мин (шар), 5 мин, 1 мин (улаан) үед өнгө/бичвэр өөрчлөгдөнө —
 *     дуу, чичрэлт, popup ХЭЗЭЭ Ч ашиглахгүй (Olipas & Luciano 2020: сэрэмжлүүлэг
 *     дуу/донжуургаа түгшүүрийг эрс нэмэгдүүлдэг).
 *   - "Нүд" товч дарахад цифрийг явцын сегмент багана болгон сольдог — цагийн
 *     тик-тиктэй тоог зарим сурагч түгшдэг тул хараагаа хянах эрхийг өгнө.
 * ========================================================================== */

export type TimerTier = "normal" | "warn" | "danger" | "critical";

export function timerTier(secondsLeft: number | null): TimerTier {
  if (secondsLeft === null) return "normal";
  if (secondsLeft <= 60) return "critical";
  if (secondsLeft <= 300) return "danger";
  if (secondsLeft <= 600) return "warn";
  return "normal";
}

/** mm:ss эсвэл (10 минутаас дээш үед) h:mm — SPEC-ийн шаардсан яг форматоор. */
export function formatRemaining(secondsLeft: number): string {
  const s = Math.max(0, Math.floor(secondsLeft));
  if (s < 600) {
    const m = Math.floor(s / 60);
    const ss = s % 60;
    return `${String(m).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
  }
  const totalMin = Math.floor(s / 60);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return `${h}:${String(m).padStart(2, "0")}`;
}

const TIER_COPY: Record<TimerTier, string | null> = {
  normal: null,
  warn: "10 минутын дотор дуусна",
  danger: "5 минутын дотор дуусна",
  critical: "1 минутын дотор дуусна!",
};

const TIER_BOX: Record<TimerTier, string> = {
  normal: "border-line bg-panel text-ink",
  warn: "border-warning/60 bg-warning/10 text-warning",
  danger: "border-error/60 bg-error/10 text-error",
  critical: "border-error bg-error/15 text-error",
};

const SEGMENTS = 10;

function SegmentedBar({
  secondsLeft,
  totalSec,
  tier,
}: {
  secondsLeft: number;
  totalSec: number;
  tier: TimerTier;
}) {
  const fraction = totalSec > 0 ? Math.max(0, Math.min(1, secondsLeft / totalSec)) : 0;
  const filled = Math.ceil(fraction * SEGMENTS);
  const barColor =
    tier === "critical" || tier === "danger"
      ? "bg-error"
      : tier === "warn"
        ? "bg-warning"
        : "bg-brand";
  return (
    <div
      className="flex items-center gap-0.5"
      role="img"
      aria-label={`Үлдсэн хугацаа ойролцоогоор ${Math.round(fraction * 100)} хувь`}
    >
      {Array.from({ length: SEGMENTS }, (_, i) => (
        <span
          key={i}
          className={`h-4 w-1.5 rounded-sm sm:w-2 ${i < filled ? barColor : "bg-line"}`}
        />
      ))}
    </div>
  );
}

export default function ExamTimer({
  secondsLeft,
  totalSec,
}: {
  secondsLeft: number | null;
  totalSec: number | null;
}) {
  const [showBar, setShowBar] = useState(false);

  if (secondsLeft === null) return null;
  const tier = timerTier(secondsLeft);
  const copy = TIER_COPY[tier];

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => setShowBar((v) => !v)}
          aria-pressed={showBar}
          aria-label={
            showBar ? "Цагийн тоо руу солих" : "Явцын хэмжүүр рүү солих (тоог нуух)"
          }
          title={showBar ? "Цагийн тоо руу солих" : "Явцын хэмжүүр рүү солих"}
          className="rounded-lg border border-line px-2 py-2 text-sm leading-none text-ink-dim transition hover:text-ink"
        >
          {showBar ? "🙈" : "👁"}
        </button>
        <div
          className={`min-w-[4.75rem] rounded-xl border px-3 py-2 text-center font-mono text-lg font-bold tabular-nums transition-colors ${TIER_BOX[tier]}`}
          role="timer"
          aria-label={`Үлдсэн хугацаа ${formatRemaining(secondsLeft)}`}
          aria-live={tier === "critical" ? "assertive" : "off"}
        >
          {showBar && totalSec ? (
            <SegmentedBar secondsLeft={secondsLeft} totalSec={totalSec} tier={tier} />
          ) : (
            formatRemaining(secondsLeft)
          )}
        </div>
      </div>
      {copy && (
        <p
          className={`flex items-center gap-1 text-xs font-semibold ${tier === "warn" ? "text-warning" : "text-error"}`}
        >
          <span aria-hidden>{tier === "warn" ? "⏳" : "⚠"}</span>
          {copy}
        </p>
      )}
    </div>
  );
}
