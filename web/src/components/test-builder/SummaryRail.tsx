"use client";

import { AlertTriangle, Check } from "lucide-react";
import { Dot, Meta } from "@/components/ui/Meta";
import {
  EESH_CHOICE_COUNT,
  EESH_FILL_COUNT,
  EESH_LIKE_TYPES,
  EESH_TIME_LIMIT_MIN,
  EESH_TOTAL_POINTS,
} from "./types";

export interface StepStatus {
  label: string;
  done: boolean;
}

/**
 * Багш хаана явж байгаагаа алдахгүй байх зорилготой "тогтмол" (sticky) хураангуй.
 * Алхам бүрийн явц + шууд харагдах бүтэц/оноо/хугацаа + ЭЕШ загвараас
 * ХАЗАЙВАЛ ЗӨВХӨН АНХААРУУЛНА (блоклохгүй) — SPEC-ийн шаардлагын дагуу.
 */
export default function SummaryRail({
  steps,
  choiceCount,
  fillCount,
  openCount,
  totalPoints,
  timeLimitMin,
  testType,
  missingAnswerCount,
  reviewNeededCount,
}: {
  steps: StepStatus[];
  choiceCount: number;
  fillCount: number;
  openCount: number;
  totalPoints: number;
  timeLimitMin: number | undefined;
  testType: string;
  missingAnswerCount: number;
  reviewNeededCount: number;
}) {
  const selectedTotal = choiceCount + fillCount + openCount;
  const isEeshLike = EESH_LIKE_TYPES.has(testType);

  const deviations: string[] = [];
  if (isEeshLike && selectedTotal > 0) {
    if (choiceCount !== EESH_CHOICE_COUNT || fillCount !== EESH_FILL_COUNT || openCount > 0) {
      deviations.push(
        `ЭЕШ стандарт бүтэц ${EESH_CHOICE_COUNT} сонголт + ${EESH_FILL_COUNT} нөхөх — одоо ${choiceCount} сонголт + ${fillCount} нөхөх${
          openCount ? ` + ${openCount} задгай` : ""
        } байна`,
      );
    }
    if (totalPoints !== EESH_TOTAL_POINTS) {
      deviations.push(`Нийт оноо ${EESH_TOTAL_POINTS} байх ёстой, одоо ${totalPoints}`);
    }
    if (timeLimitMin !== EESH_TIME_LIMIT_MIN) {
      deviations.push(`Хугацаа ${EESH_TIME_LIMIT_MIN} мин байх ёстой, одоо ${timeLimitMin ?? "тодорхойгүй"}`);
    }
  }

  return (
    // top-14 (56px) — апп-ийн толгой хэсэг (header) h-14 өндөртэй, sticky
    // header-тэй давхцахгүйн тулд яг доор нь наалдана.
    <div className="sticky top-14 z-20 mb-4 space-y-2 rounded-2xl border border-line bg-panel p-4 shadow-sm">
      <div className="flex flex-wrap items-center gap-1.5">
        {steps.map((s, i) => (
          <span
            key={s.label}
            className={`rounded-full border px-2.5 py-1 text-sm font-semibold ${
              s.done
                ? "border-success/40 bg-success/10 text-success"
                : "border-line text-ink-dim"
            }`}
          >
            <span className="flex items-center gap-1">
              <span>{i + 1}. {s.label}</span>
              {s.done && <Check size={14} aria-hidden />}
            </span>
          </span>
        ))}
      </div>

      <p className="text-base font-bold text-ink">
        <Meta
          items={[
            `${choiceCount} сонголт + ${fillCount} нөхөх${openCount ? ` + ${openCount} задгай` : ""}`,
            `нийт ${totalPoints} оноо`,
            `${timeLimitMin ?? "?"} минут`,
          ]}
        />
      </p>

      {deviations.length > 0 && (
        <p
          role="status"
          className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-sm text-warning"
        >
          <AlertTriangle size={16} className="shrink-0 mt-0.5" aria-hidden />
          <span>
            <Meta items={deviations} />
          </span>
        </p>
      )}

      {missingAnswerCount > 0 && (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-error/30 bg-error/10 px-3 py-2 text-sm font-semibold text-error"
        >
          <AlertTriangle size={16} className="shrink-0 mt-0.5" aria-hidden />
          <span>{missingAnswerCount} бодлого хариугүй — эдгээр онооны нийлбэрт орохгүй</span>
        </p>
      )}
      {reviewNeededCount > 0 && (
        <p
          role="status"
          className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-sm text-warning"
        >
          <AlertTriangle size={16} className="shrink-0 mt-0.5" aria-hidden />
          <span>{reviewNeededCount} бодлогын хариу шалгах шаардлагатай гэж тэмдэглэгдсэн</span>
        </p>
      )}
    </div>
  );
}
