"use client";

import { ClipboardCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { TONE_SELECTED } from "@/components/attendance/marks";
import { api } from "@/lib/api";
import { cn } from "@/lib/cn";
import { formatPercent, formatScore, meanPercent, percentTone, quizPercent, quizTone } from "@/lib/quizScore";

/** Сурагчийн drawer-ийн сарын хайрцагт шалгалтын оноо (эзэн 2026-11-08) */
export interface QuizDayRow {
  date: string;
  score: number;
  problemCount: number;
}

/** Энэ ангийн тухайн сарын шалгалтын оноо; алдаа гарвал хоосон (drawer-ийн бусад хэсэгт саад болохгүй) */
export function useQuizMonth(classId: string, studentId: string, month: string, enabled: boolean) {
  const [state, setState] = useState<{ key: string; rows: QuizDayRow[] } | null>(null);
  const key = `${classId}|${studentId}|${month}`;
  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    api<QuizDayRow[]>(
      `/classrooms/${encodeURIComponent(classId)}/homework-quiz/students/${encodeURIComponent(studentId)}?month=${month}`,
    )
      .then((rows) => alive && setState({ key, rows: Array.isArray(rows) ? rows : [] }))
      .catch(() => alive && setState({ key, rows: [] }));
    return () => {
      alive = false;
    };
  }, [classId, studentId, month, enabled, key]);
  return state?.key === key ? state.rows : [];
}

/** Хайрцаг доторх жижиг хувь: өнгө нь онооны мужаар (самбарын талбартай ижил) */
export function QuizPctBadge({ row }: { row: QuizDayRow }) {
  const tone = quizTone(row.score, row.problemCount);
  const pct = quizPercent(row.score, row.problemCount);
  if (!tone || pct === null) return null;
  return (
    <span aria-hidden className={cn("rounded border px-0.5 text-[10px] font-bold leading-[14px] tabular-nums", TONE_SELECTED[tone])}>
      {formatPercent(pct)}
    </span>
  );
}

/** Дэлгэц уншигч / title-д: «шалгалт 8/10, 80%» */
export function quizDayText(row: QuizDayRow): string {
  const pct = quizPercent(row.score, row.problemCount);
  return `шалгалт ${formatScore(row.score)}/${row.problemCount}${pct === null ? "" : `, ${formatPercent(pct)}`}`;
}

/** Сарын «Даалгавар» мөрийн төгсгөлд: «Шалгалт 3 удаа, дундаж 76%» */
export function QuizMonthItem({ rows }: { rows: QuizDayRow[] }) {
  const avg = meanPercent(rows);
  if (avg === null) return null;
  const tone = percentTone(avg)!;
  const text = `Шалгалт ${rows.length} удаа, дундаж ${formatPercent(avg)}`;
  return (
    <li title={text} className="inline-flex items-center gap-1 whitespace-nowrap leading-5">
      <ClipboardCheck className="size-3.5 shrink-0 text-brand" aria-hidden />
      <span aria-hidden className="text-ink-dim">Шалгалт</span>
      <b aria-hidden className="font-bold tabular-nums text-ink">{rows.length}</b>
      <span aria-hidden className="text-ink-dim">дундаж</span>
      <span aria-hidden className={cn("rounded border px-1 text-[11px] font-bold leading-4 tabular-nums", TONE_SELECTED[tone])}>
        {formatPercent(avg)}
      </span>
      <span className="sr-only">{text}</span>
    </li>
  );
}
