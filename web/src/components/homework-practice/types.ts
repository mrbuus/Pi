/**
 * Гэрийн даалгавар (сурагч) — API гэрээ (AGENT-RULES.md «Homework API contract»).
 * Сервер хэзээ ч correctAnswer / isCorrect / solution илгээхгүй.
 */

import type { HomeworkStatus } from "@/components/attendance/marks";

export type HwItemStatus = "NOT_STARTED" | "IN_PROGRESS" | "SUBMITTED";
export type CheckResult = "CORRECT" | "WRONG" | "BLANK";

export interface HwScore {
  correct: number;
  total: number;
}

export interface HwItem {
  testId: string;
  title: string;
  variantLabel: string | null;
  problemCount: number;
  timeLimitMin: number | null;
  status: HwItemStatus;
  attemptId: string | null;
  checksUsed: number;
  maxChecks: number;
  score: HwScore | null;
  submittedAt: string | null;
  late: boolean;
}

export interface HwPhoto {
  id: string;
  fileKey: string;
  pages: number;
  uploadedAt: string;
}

/** V2 (SURAGCH-V2-GEREE): хичээлийн ӨДӨР БҮР ирнэ, `items` хоосон байж болно */
export interface HwDay {
  date: string; // YYYY-MM-DD
  classroomId: string;
  classroomName: string;
  deadlineAt: string | null;
  items: HwItem[];
  photo: HwPhoto | null;
  /** Багшийн тэмдэглэгээ (дараагийн хичээлийн өдөр тавьдаг) */
  mark: HomeworkStatus | null;
  /** Багшийн тайлбар (V2) */
  markComment?: string | null;
  /** Сэдэв (V2) */
  topic?: string | null;
  /** Ирэх 7 хоногийн хичээл — зургаа урьдчилан илгээнэ (эзэн 2026-10-31) */
  upcoming?: boolean;
}

export interface HwMyResponse {
  days: HwDay[];
}

export interface HwChoice {
  label: string;
  text: string;
  imageKey: string | null;
}

export interface HwProblem {
  id: string;
  order: number;
  format: string; // CHOICE | FILL_NUMBER | ...
  statementText: string | null;
  imageKey: string | null;
  choices: HwChoice[] | null;
  fillSlots?: unknown;
}

/** Хариу: CHOICE → сонголтын `label`, FILL_NUMBER/бусад → мөр */
export type HwAnswers = Record<string, unknown>;

export interface HwAttempt {
  attemptId: string;
  status: HwItemStatus;
  startedAt: string;
  deadlineAt: string | null;
  remainingSec: number | null;
  checksUsed: number;
  maxChecks: number;
  /** Илгээсэн бол серверийн эцсийн оноо, үгүй бол null */
  score: HwScore | null;
  problems: HwProblem[];
  answers: HwAnswers;
  lastCheck: Record<string, CheckResult> | null;
}

export interface HwCheckResponse {
  checksUsed: number;
  results: Record<string, CheckResult>;
  correct: number;
  total: number;
}

export interface HwSubmitResponse {
  score: HwScore;
  results: Record<string, CheckResult>;
  submittedAt: string;
}
