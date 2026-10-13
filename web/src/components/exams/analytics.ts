"use client";

/* ============================================================================
 * «Тойм», «Бодлого» табын анализ — API: GET /exams/:id/analytics?classroomId=
 * (SHALGALT-TOLOVLOGOO §3). Хоёр таб нэг хариуг хуваалцана: (тест, анги)-аар
 * санах ойд хадгалж, дүн хадгалагдахад invalidateExamAnalytics() цэвэрлэнэ.
 * ========================================================================== */

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { errorText, type ExamClassChip } from "./types";

export type ItemStatus = "CORRECT" | "WRONG" | "BLANK";
export type DiscriminationLabel = "GOOD" | "WEAK" | "PROBLEM";
export type ReliabilityLevel = "GOOD" | "FAIR" | "LOW";

export interface ChoiceDistribution {
  counts: Record<string, number>;
  blank: number;
  total: number;
  correct: string | null;
  mostWrong: { letter: string; count: number; note: string | null } | null;
}

export interface ItemAnalytics {
  key: string;
  label: string;
  part: 1 | 2;
  points: number;
  order: number;
  problemId: string;
  group: string | null;
  marked: number;
  correct: number;
  blank: number;
  percent: number | null;
  choices: ChoiceDistribution | null;
  discrimination: { value: number; label: DiscriminationLabel | null } | null;
}

export interface TopicMastery {
  key: string;
  name: string;
  items: number;
  earned: number;
  max: number;
  percent: number;
}

export interface StaffProblem {
  problemId: string;
  order: number;
  format: "CHOICE" | "FILL_NUMBER" | "OPEN";
  points: number;
  statementText: string | null;
  imageKey: string | null;
  choices: { letter: string; text: string; image?: string | null }[] | null;
  correctAnswer: unknown;
  solution: string | null;
  solutionVerified: boolean;
  answerNeedsCheck: boolean;
  youtube: { url: string; embedUrl: string } | null;
  topics: string[];
}

export interface ExamAnalytics {
  test: { id: string; title: string; type: string };
  classroomId: string | null;
  chips: ExamClassChip[];
  canEditContent: boolean;
  summary: {
    students: number;
    absent: number;
    taken: number;
    pending: number;
    avg: number | null;
    median: number | null;
    max: number | null;
    min: number | null;
  };
  histogram: number[];
  classes: { id: string; name: string; students: number; taken: number; avg: number | null }[];
  reliability: { value: number; level: ReliabilityLevel } | null;
  topics: TopicMastery[];
  items: ItemAnalytics[];
  attention: string[];
  markedStudents: number;
  onlineStudents: number;
  problems: StaffProblem[];
}

export interface StudentSummary {
  student: { id: string; firstName: string; lastName: string };
  absent: boolean;
  result: { totalScore: number; maxScore: number; percent: number } | null;
  parts: { part1: number; part1Max: number; part2: number; part2Max: number } | null;
  topics: TopicMastery[];
  wrong: { key: string; label: string; part: 1 | 2; points: number; status: ItemStatus }[];
  trend: { testId: string; title: string; type: string; at: string; percent: number; current: boolean }[];
}

/** Зөв хувийн өнгө: ногоон ≥70, шар 40–70, улаан <40 (өнгөнөөс гадна тоо үргэлж харагдана). */
export function correctTone(percent: number | null): "success" | "warning" | "danger" | "neutral" {
  if (percent === null) return "neutral";
  if (percent >= 70) return "success";
  if (percent >= 40) return "warning";
  return "danger";
}

export const BAR_FILL: Record<ReturnType<typeof correctTone>, string> = {
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-error",
  neutral: "bg-line",
};

export const DISCRIMINATION_TEXT: Record<DiscriminationLabel, string> = {
  GOOD: "Сайн ялгадаг",
  WEAK: "Сул ялгадаг",
  PROBLEM: "Асуудалтай",
};

export const RELIABILITY_TEXT: Record<ReliabilityLevel, string> = {
  GOOD: "Найдвартай",
  FAIR: "Дунд зэрэг",
  LOW: "Сул",
};

// ---------------------------------------------------------------------------

/** Өөр ажилтан дүн шивсэн байж болох тул санасан хариуг 1 минутаас удаан хэрэглэхгүй. */
const TTL_MS = 60_000;
const cache = new Map<string, { at: number; promise: Promise<ExamAnalytics> }>();
const listeners = new Set<(testId: string) => void>();

function cacheKey(testId: string, classId: string) {
  return `${testId}:${classId}`;
}

/** Дүн хадгалагдсан, бодлого засагдсан үед — дараагийн харалт шинээр ачаална. */
export function invalidateExamAnalytics(testId: string) {
  for (const key of [...cache.keys()]) if (key.startsWith(`${testId}:`)) cache.delete(key);
  for (const fn of listeners) fn(testId);
}

function fetchAnalytics(testId: string, classId: string): Promise<ExamAnalytics> {
  const key = cacheKey(testId, classId);
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.promise;
  const entry = {
    at: Date.now(),
    promise: api<ExamAnalytics>(
      `/exams/${encodeURIComponent(testId)}/analytics?classroomId=${encodeURIComponent(classId)}`,
    ),
  };
  cache.set(key, entry);
  // Алдаатай хариуг санахгүй — «Дахин оролдох» шинээр дуудна.
  entry.promise.catch(() => {
    if (cache.get(key) === entry) cache.delete(key);
  });
  return entry.promise;
}

export function useExamAnalytics(testId: string, classId: string) {
  const [state, setState] = useState<{ key: string; data: ExamAnalytics | null; error: string }>({
    key: "",
    data: null,
    error: "",
  });
  const [version, setVersion] = useState(0);
  const key = cacheKey(testId, classId);

  useEffect(() => {
    const fn = (id: string) => {
      if (id === testId) setVersion((v) => v + 1);
    };
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  }, [testId]);

  useEffect(() => {
    let alive = true;
    fetchAnalytics(testId, classId)
      .then((data) => alive && setState({ key, data, error: "" }))
      .catch((e) => alive && setState({ key, data: null, error: errorText(e, "Анализ ачаалж чадсангүй") }));
    return () => {
      alive = false;
    };
  }, [testId, classId, key, version]);

  const retry = useCallback(() => {
    cache.delete(key);
    setVersion((v) => v + 1);
  }, [key]);

  const current = state.key === key;
  return {
    data: current ? state.data : null,
    error: current ? state.error : "",
    retry,
  };
}
