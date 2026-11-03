"use client";

import Link from "next/link";
import { ArrowLeft, CircleCheck, CircleMinus, Clock, Lock, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/cn";
import { formatMnDateTime } from "@/lib/dateMn";
import { CHECK_META } from "./CheckMark";
import HomeworkReviewCard from "./HomeworkReviewCard";
import PhotoButton from "./PhotoButton";
import type { CheckResult, HwAnswers, HwProblem, HwReviewPayload, HwScore } from "./types";

/** Хариуны түлхүүргүй бодлого — сервер дүгнээгүй (results-д байхгүй), оноонд орохгүй */
const UNGRADED = { label: "Дүгнэгдээгүй", icon: CircleMinus, cls: "border-dashed border-line bg-surface text-ink-dim" };

/** «зөв/нийт» дугуй — тойргийн дүүрэлт нь зөв бодлогын хувь */
function ScoreRing({ correct, total, pct }: { correct: number; total: number; pct: number }) {
  const r = 30;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative size-[4.5rem] shrink-0 sm:size-20" role="img" aria-label={`${total} бодлогоос ${correct} зөв`}>
      <svg viewBox="0 0 72 72" className="size-full -rotate-90" aria-hidden>
        <circle cx="36" cy="36" r={r} fill="none" strokeWidth="7" className="stroke-line" />
        <circle
          cx="36"
          cy="36"
          r={r}
          fill="none"
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct / 100)}
          className="stroke-brand-bright"
        />
      </svg>
      <span className="absolute inset-0 flex flex-col items-center justify-center font-display font-extrabold leading-none tabular-nums text-ink">
        <span className="text-base sm:text-lg">
          {correct}/{total}
        </span>
        <span className="mt-0.5 text-[10px] font-semibold text-ink-dim">{pct}%</span>
      </span>
    </div>
  );
}

/**
 * Илгээсний дараах дүн: «зөв/нийт» оноо, бодлого бүрийн зөв/буруу, нэгээс олон алдсан бол алдаагаа
 * засах сануулга, алдсан бодлого бүрийн зөв хариу + бодолт (эзэн 2026-11-03).
 */
export default function HomeworkResult({
  title,
  score,
  results,
  problems,
  answers,
  review,
  classroomId,
  date,
  backHref,
  showPhoto = true,
}: {
  title: string;
  score: HwScore | null;
  results: Record<string, CheckResult> | null;
  problems: HwProblem[];
  answers: HwAnswers;
  review: HwReviewPayload | null;
  classroomId: string;
  date: string;
  backHref: string;
  /** Дэвтрийн зураг илгээх товч (дахин бодох үед үгүй) */
  showPhoto?: boolean;
}) {
  const problemIds = problems.map((p) => p.id);
  const hasUngraded = !!results && problemIds.some((id) => !results[id]);
  const missed = problems.filter((p) => results?.[p.id] === "WRONG" || results?.[p.id] === "BLANK");
  const opensAt = review?.opensAt ? formatMnDateTime(review.opensAt, { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }) : null;
  const total = score?.total ?? problemIds.length;
  const correct = score?.correct ?? 0;
  const wrong = missed.filter((p) => results?.[p.id] === "WRONG").length;
  const blank = missed.length - wrong;
  const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <section className="rounded-2xl border border-line bg-surface p-4 elev-1 sm:p-5" aria-labelledby="hw-res-title">
        <div className="flex items-center gap-4">
          <ScoreRing correct={correct} total={total} pct={pct} />
          <div className="min-w-0">
            <h1 id="hw-res-title" className="cyrillic-heading flex items-center gap-1.5 text-lg font-extrabold text-ink sm:text-xl">
              <CircleCheck className="size-5 shrink-0 text-success" aria-hidden />
              Даалгавар илгээгдлээ
            </h1>
            <p className="truncate text-sm text-ink-dim">{title}</p>
            {results && (
              <p className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-sm tabular-nums">
                <span className="font-semibold text-success">{correct} зөв</span>
                {wrong > 0 && <span className="font-semibold text-error">{wrong} буруу</span>}
                {blank > 0 && <span className="font-semibold text-ink-dim">{blank} хариулаагүй</span>}
              </p>
            )}
          </div>
        </div>

        {results && problemIds.length > 0 && (
          <>
            <ul className="mt-4 grid grid-cols-[repeat(auto-fill,minmax(3rem,1fr))] gap-1.5" aria-label="Бодлого бүрээр">
              {problemIds.map((id, i) => {
                const r = results[id];
                const m = r ? CHECK_META[r] : UNGRADED;
                const Icon = m.icon;
                return (
                  <li
                    key={id}
                    className={cn("flex h-11 items-center justify-center gap-1 rounded-lg border text-sm font-bold tabular-nums", m.cls)}
                    aria-label={`${i + 1}-р бодлого, ${m.label}`}
                  >
                    {i + 1}
                    <Icon className="size-3.5" aria-hidden />
                  </li>
                );
              })}
            </ul>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-dim">
              {(["CORRECT", "WRONG", "BLANK"] as const).map((k) => {
                const Icon = CHECK_META[k].icon;
                return (
                  <span key={k} className="inline-flex items-center gap-1">
                    <Icon className="size-3.5" aria-hidden />
                    {CHECK_META[k].label}
                  </span>
                );
              })}
              {hasUngraded && (
                <span className="inline-flex items-center gap-1">
                  <CircleMinus className="size-3.5" aria-hidden />
                  {UNGRADED.label}
                </span>
              )}
            </div>
          </>
        )}
      </section>

      {missed.length > 1 && (
        <p role="status" className="flex items-start gap-2 rounded-xl border border-warning/40 bg-warning/10 p-3 text-sm font-semibold text-ink">
          <TriangleAlert className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
          {missed.length} бодлого алдсан байна. Доорх зөв хариуг харж алдаагаа засаарай
        </p>
      )}

      {missed.length > 0 && review?.locked && (
        <p role="status" className="flex items-start gap-2 rounded-xl border border-line bg-panel p-3 text-sm text-ink-dim">
          <Lock className="mt-0.5 size-4 shrink-0" aria-hidden />
          Зөв хариу удахгүй нээгдэнэ
        </p>
      )}

      {missed.length > 0 && review && !review.locked && (
        <section aria-labelledby="hw-missed-title" className="space-y-3">
          <h2 id="hw-missed-title" className="font-bold text-brand-soft">
            Алдсан бодлогууд
          </h2>
          {opensAt && (
            <p className="flex items-start gap-2 text-sm text-ink-dim">
              <Clock className="mt-0.5 size-4 shrink-0" aria-hidden />
              Хариулаагүй бодлогын зөв хариу {opensAt}-с нээгдэнэ
            </p>
          )}
          <ol className="space-y-3">
            {problems.map((p, i) =>
              results?.[p.id] === "WRONG" || results?.[p.id] === "BLANK" ? (
                <li key={p.id}>
                  <HomeworkReviewCard
                    n={i + 1}
                    problem={p}
                    mine={answers[p.id]}
                    review={review.items[p.id]}
                    blank={results[p.id] === "BLANK"}
                  />
                </li>
              ) : null,
            )}
          </ol>
        </section>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Link
          href={backHref}
          className="btn-3d inline-flex min-h-12 items-center gap-2 rounded-2xl bg-brand-bright px-5 text-sm font-bold text-on-brand"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Жагсаалт руу
        </Link>
        {showPhoto && (
          <span className="ml-auto">
            <PhotoButton classroomId={classroomId} date={date} />
          </span>
        )}
      </div>
    </div>
  );
}
