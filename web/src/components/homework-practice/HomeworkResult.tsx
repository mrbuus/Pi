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
}) {
  const problemIds = problems.map((p) => p.id);
  const hasUngraded = !!results && problemIds.some((id) => !results[id]);
  const missed = problems.filter((p) => results?.[p.id] === "WRONG" || results?.[p.id] === "BLANK");
  const opensAt = review?.opensAt ? formatMnDateTime(review.opensAt, { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }) : null;
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <section className="rounded-xl border border-line bg-surface p-5 text-center elev-1 sm:p-6">
        <CircleCheck className="mx-auto size-10 text-success" aria-hidden />
        <h1 className="cyrillic-heading mt-2 text-xl font-extrabold text-ink">Даалгавар илгээгдлээ</h1>
        <p className="mt-1 truncate text-sm text-ink-dim">{title}</p>
        {score && (
          <p className="mt-4 font-display text-4xl font-extrabold tabular-nums text-ink">
            {score.correct}/{score.total}
            <span className="ml-2 text-base font-semibold text-ink-dim">зөв</span>
          </p>
        )}
      </section>

      {results && problemIds.length > 0 && (
        <section className="rounded-xl border border-line bg-surface p-4 elev-1 sm:p-5" aria-labelledby="hw-res-title">
          <h2 id="hw-res-title" className="mb-3 font-bold text-brand-soft">
            Бодлого бүрээр
          </h2>
          <ul className="grid grid-cols-5 gap-2 sm:grid-cols-8">
            {problemIds.map((id, i) => {
              const r = results[id];
              const m = r ? CHECK_META[r] : UNGRADED;
              const Icon = m.icon;
              return (
                <li
                  key={id}
                  className={cn("flex h-14 flex-col items-center justify-center gap-0.5 rounded-lg border", m.cls)}
                  aria-label={`${i + 1}-р бодлого, ${m.label}`}
                >
                  <span className="text-xs font-bold tabular-nums">{i + 1}</span>
                  <Icon className="size-4" aria-hidden />
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
        </section>
      )}

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
        <span className="ml-auto">
          <PhotoButton classroomId={classroomId} date={date} />
        </span>
      </div>
    </div>
  );
}
