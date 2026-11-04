/**
 * Гэрийн даалгавар (сурагч) — API гэрээ (AGENT-RULES.md «Homework API contract»).
 * Бодож байх (IN_PROGRESS, «Шалгах» ч) үед сервер correctAnswer / isCorrect / solution ХЭЗЭЭ Ч илгээхгүй.
 * Илгээсний дараа л `review` (алдсан бодлогын зөв хариу, баталгаажсан бодолт, бичлэг) ирнэ (эзэн 2026-11-03).
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
  /** Дараагийн хичээлээс хойш илгээсэн */
  late?: boolean;
}

/** V2 (SURAGCH-V2-GEREE): хичээлийн ӨДӨР БҮР ирнэ, `items` хоосон байж болно */
export interface HwDay {
  date: string; // YYYY-MM-DD
  classroomId: string;
  classroomName: string;
  deadlineAt: string | null;
  /** false = багш «хугацаа дуусахад хаагдана» гэж тохируулсан (эзэн 2026-11-05) */
  allowLate?: boolean;
  /** Хаагдсан: хугацаа өнгөрсөн, хоцорч илгээхийг зөвшөөрөөгүй */
  closed?: boolean;
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

/** Дахин бодох (эзэн 2026-11-03): хичээлээс хойш 2 хичээл өнгөрсний дараа А (ангид), Б (гэртээ) нэг удаа */
export interface HwRedoRound {
  /** 1 = гэрийн даалгавар, 2 = дахин бодсон */
  round: number;
  attemptId: string;
  status: HwItemStatus;
  score: HwScore | null;
  submittedAt: string | null;
}

export interface HwRedoItem {
  testId: string;
  title: string;
  variantLabel: string | null;
  /** CLASS = ангид бодсон (А), HOME = гэртээ (Б) */
  kind: "CLASS" | "HOME";
  problemCount: number;
  timeLimitMin: number | null;
  /** Бусад ангид бодогдох хүлээгдэж байгаа — түр хаалттай */
  locked: boolean;
  rounds: HwRedoRound[];
}

export interface HwRedoDay {
  date: string;
  classroomId: string;
  classroomName: string;
  topic: string | null;
  opened: boolean;
  /** Нээгдэхэд үлдсэн хичээлийн тоо */
  lessonsLeft: number;
  items: HwRedoItem[];
}

export interface HwRedoResponse {
  lessonsToOpen: number;
  days: HwRedoDay[];
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

/** Идэвхийн тоолуур (эзэн 2026-11-03): бодож байх хугацаа, вэбээс гарсан тоо/хугацаа */
export interface HwActivity {
  activeSec: number;
  awaySec: number;
  leaveCount: number;
  openCount: number;
}

export type HwAnswerView = string | Record<string, string> | null;

/** Илгээсний дараах нэг (алдсан) бодлогын зөв хариу, бодолт */
export interface HwReview {
  correct: HwAnswerView;
  solution: string | null;
  video: { url: string; embedUrl: string } | null;
}

export interface HwReviewPayload {
  /** Тест ангид бодогдох тул зөв хариу нээгдэхгүй */
  locked: boolean;
  /** Хариулаагүй бодлогын зөв хариу нээгдэх цаг (нууж байгаа үед) */
  opensAt: string | null;
  items: Record<string, HwReview>;
}

export interface HwAttempt {
  attemptId: string;
  /** 1 = гэрийн даалгавар, 2 = дахин бодсон */
  round?: number;
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
  activity: HwActivity;
  /** Илгээсэн бол алдсан бодлогын зөв хариу; бодож байгаа бол null */
  review: HwReviewPayload | null;
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
  review: HwReviewPayload;
}
