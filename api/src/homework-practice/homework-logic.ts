// Гэрийн даалгаврын онлайн бодолтын ЦЭВЭР логик (эзэн 2026-10-29) — ӨС-гүй, unit тестэд бүрэн ордог.
// Аль тест аль өдрийн даалгавар вэ (A → B, board-logic.homeworkVariants), хугацаа,
// хариу цэвэрлэх, дүгнэх (tests/grading.ts — шалгалттай ИЖИЛ дүрэм, STATUS §7.4).

import {
  homeworkVariants,
  normalizeVariant,
  type VariantTest,
} from '../attendance/board-logic';
import {
  choiceImagesOf,
  choiceModeOf,
  choiceTextsOf,
  fillSlotKeys,
  gradeAnswer,
  hasKnownAnswer,
  isBlankAnswer,
  type GradableProblem,
} from '../tests/grading';

export const MAX_CHECKS = 2;
export const DEFAULT_DAYS = 14;
export const MAX_DAYS = 31;
/** Гэрийн даалгаварт хэзээ ч орохгүй төрөл (өөрийн эргэн харалтын дүрэмтэй) */
export const EXCLUDED_TYPES = ['THOUSAND', 'EESH_MOCK'] as const;

export type CheckResult = 'CORRECT' | 'WRONG' | 'BLANK';

/** Хичээлийн өдрийн (УБ) эхлэл: «2026-10-29» → 2026-10-28T16:00:00Z */
export function ubDayStart(key: string): Date {
  return new Date(`${key}T00:00:00+08:00`);
}

export interface HomeworkTest extends VariantTest {
  title: string;
  timeLimitMin: number | null;
  problemCount: number;
}

export interface SlotInput {
  enrollments: { classroomId: string; classroomName: string; joinedKey: string }[];
  /** Ангиудын ClassTestSession (from-оос хойш, ирээдүйнх ч орж болно — хугацаанд) */
  sessions: { classroomId: string; date: string; testId: string | null }[];
  /** Ангид хийсэн тестүүд (устгагдаагүй, хасагдах төрөлгүй) */
  done: VariantTest[];
  /** Ижил groupKey-тэй, онлайнаар дүгнэгдэх (AUTO, бодлоготой) тестүүд */
  siblings: HomeworkTest[];
  fromKey: string;
  toKey: string;
}

export interface HomeworkSlot {
  classroomId: string;
  classroomName: string;
  date: string;
  /** Дараагийн хичээлийн өдөр (ClassTestSession-оор) — багшийн тэмдэглэгээ энэ өдөр */
  nextLessonDate: string | null;
  deadlineAt: Date | null;
  items: (HomeworkTest & { fromTestId: string })[];
}

/**
 * Анги + өдөр бүрийн гэрийн даалгавар: тэр өдөр ангид хийсэн тест бүрийн нөгөө хувилбар.
 * Сурагч ангид орохоос өмнөх өдөр, цонхноос гадуурх өдөр алгасагдана. Шинэ нь эхэнд.
 */
export function buildSlots(input: SlotInput): HomeworkSlot[] {
  const doneById = new Map(input.done.map((t) => [t.id, t]));
  const siblings = input.siblings;
  const out: HomeworkSlot[] = [];
  for (const e of input.enrollments) {
    const mine = input.sessions.filter((s) => s.classroomId === e.classroomId);
    const days = [
      ...new Set(
        mine
          .filter(
            (s) =>
              s.testId &&
              s.date >= input.fromKey &&
              s.date <= input.toKey &&
              s.date >= e.joinedKey,
          )
          .map((s) => s.date),
      ),
    ].sort((a, b) => (a < b ? 1 : -1));
    for (const date of days) {
      const ordered = [
        ...new Set(
          mine
            .filter((s) => s.date === date && s.testId)
            .map((s) => s.testId as string),
        ),
      ]
        .map((id) => doneById.get(id))
        .filter((t): t is VariantTest => !!t);
      const byId = new Map(siblings.map((t) => [t.id, t]));
      const items = homeworkVariants(ordered, siblings).flatMap((p) => {
        const t = byId.get(p.testId);
        return t ? [{ ...t, fromTestId: p.fromTestId }] : [];
      });
      if (!items.length) continue;
      const next = mine
        .map((s) => s.date)
        .filter((d) => d > date)
        .sort()[0];
      out.push({
        classroomId: e.classroomId,
        classroomName: e.classroomName,
        date,
        nextLessonDate: next ?? null,
        deadlineAt: next ? ubDayStart(next) : null,
        items,
      });
    }
  }
  return out.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}

export function variantOf(t: { variantLabel: string | null }): string | null {
  return normalizeVariant(t.variantLabel);
}

/* ───────── Бодлого: сурагчид очих харагдац (зөв хариугүй) ───────── */

export interface HomeworkProblemRow {
  problemId: string;
  order: number;
  problem: {
    id: string;
    format: GradableProblem['format'];
    statementText: string | null;
    imageKey: string | null;
    choices: unknown;
    correctAnswer: unknown;
    choiceOptions: {
      order: number;
      text: string;
      isCorrect: boolean;
      imageKey?: string | null;
    }[];
  };
}

export function toGradable(row: HomeworkProblemRow): GradableProblem {
  return {
    id: row.problem.id,
    format: row.problem.format,
    choices: row.problem.choices,
    correctAnswer: row.problem.correctAnswer,
    choiceOptions: row.problem.choiceOptions,
    statementText: row.problem.statementText,
  };
}

const letter = (i: number) => String.fromCharCode(65 + i);

/**
 * Сурагчид очих бодлого — correctAnswer/isCorrect/бодолт/token ОГТ орохгүй. Сонголтууд
 * эх дарааллаар, үсэгтэй (A, B, …); хариуг үсгээр нь хадгална.
 */
export function problemView(row: HomeworkProblemRow) {
  const g = toGradable(row);
  const mode = choiceModeOf(g);
  let choices: { label: string; text: string; imageKey: string | null }[] | null =
    null;
  if (mode === 'TEXT') {
    const images = choiceImagesOf(g);
    choices = choiceTextsOf(g).map((text, i) => ({
      label: letter(i),
      text,
      imageKey: images?.[i] ?? null,
    }));
  } else if (mode === 'LETTER') {
    choices = choiceTextsOf(g).map((t) => ({
      label: t.trim().toUpperCase(),
      text: t.trim().toUpperCase(),
      imageKey: null,
    }));
  }
  const view: {
    id: string;
    order: number;
    format: string;
    statementText: string | null;
    imageKey: string | null;
    choices: typeof choices;
    fillSlots?: string[];
  } = {
    id: row.problem.id,
    order: row.order,
    format: row.problem.format,
    statementText: row.problem.statementText,
    imageKey: row.problem.imageKey,
    choices,
  };
  if (row.problem.format === 'FILL_NUMBER')
    view.fillSlots = fillSlotKeys(row.problem.statementText);
  return view;
}

/* ───────── Хариу цэвэрлэх / нэгтгэх ───────── */

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === 'object' && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : {};
}

const BAD_KEYS = ['__proto__', 'constructor', 'prototype'];

/**
 * Хадгалсан хариу дээр шинийг нэгтгэнэ: зөвхөн тестийн бодлогын түлхүүр; null/'' = арилгах;
 * стринг ≤1000, бодит тоо, FILL_NUMBER-т нүдний объект (түлхүүрийн нүднүүд л).
 */
export function mergeAnswers(
  problems: { problemId: string; problem: { format: string; correctAnswer: unknown } }[],
  current: unknown,
  incoming: unknown,
): Record<string, unknown> {
  const defs = new Map(problems.map((p) => [p.problemId, p.problem]));
  const out: Record<string, unknown> = {};
  for (const [pid, v] of Object.entries(asRecord(current)))
    if (defs.has(pid)) out[pid] = v;
  for (const [pid, v] of Object.entries(asRecord(incoming))) {
    const def = defs.get(pid);
    if (!def || BAD_KEYS.includes(pid)) continue;
    if (v === null || v === undefined || v === '') delete out[pid];
    else if (
      (typeof v === 'number' && Number.isFinite(v)) ||
      (typeof v === 'string' && v.length <= 1000)
    )
      out[pid] = v;
    else if (v && typeof v === 'object' && !Array.isArray(v)) {
      if (def.format !== 'FILL_NUMBER') continue;
      const allowed = new Set(Object.keys(asRecord(def.correctAnswer)));
      const entries = Object.entries(v as Record<string, unknown>);
      if (
        !entries.length ||
        entries.length > 32 ||
        entries.some(
          ([slot, val]) =>
            !allowed.has(slot) ||
            BAD_KEYS.includes(slot) ||
            !(
              (typeof val === 'string' && val.length <= 1000) ||
              (typeof val === 'number' && Number.isFinite(val))
            ),
        )
      )
        continue;
      out[pid] = Object.fromEntries(entries);
    }
  }
  return out;
}

/* ───────── Дүгнэлт ───────── */

function isBlank(v: unknown): boolean {
  if (isBlankAnswer(v)) return true;
  if (v && typeof v === 'object' && !Array.isArray(v))
    return Object.values(v as Record<string, unknown>).every(isBlankAnswer);
  return false;
}

/** Үсгэн хариуг ("B") grading.ts-ийн хүлээх хэлбэрт (TEXT горимд индекс) буулгана */
export function gradingInput(g: GradableProblem, raw: unknown): unknown {
  if (choiceModeOf(g) !== 'TEXT') return raw;
  if (typeof raw === 'number') return raw;
  if (typeof raw === 'string' && /^[A-Za-z]$/.test(raw.trim()))
    return raw.trim().toUpperCase().charCodeAt(0) - 65;
  return null;
}

/**
 * Бодлого бүр CORRECT/WRONG/BLANK. Хариуны түлхүүргүй бодлого (hasKnownAnswer=false)
 * results-д орохгүй, total-д тооцогдохгүй — сурагч авах боломжгүй оноо алдахгүй.
 */
export function gradeHomework(
  rows: HomeworkProblemRow[],
  answers: Record<string, unknown>,
): { results: Record<string, CheckResult>; correct: number; total: number } {
  const results: Record<string, CheckResult> = {};
  let correct = 0;
  let total = 0;
  for (const row of rows) {
    const g = toGradable(row);
    if (!hasKnownAnswer(g)) continue;
    total++;
    const raw = answers[row.problemId];
    if (isBlank(raw)) {
      results[row.problemId] = 'BLANK';
      continue;
    }
    const ok = gradeAnswer(g, gradingInput(g, raw)).correct;
    results[row.problemId] = ok ? 'CORRECT' : 'WRONG';
    if (ok) correct++;
  }
  return { results, correct, total };
}

export function remainingSec(
  timeLimitMin: number | null,
  startedAt: Date,
  now = new Date(),
): number | null {
  if (!timeLimitMin) return null;
  const left = timeLimitMin * 60 - Math.floor((now.getTime() - startedAt.getTime()) / 1000);
  return Math.max(0, left);
}

export function isLate(submittedAt: Date | null, deadlineAt: Date | null): boolean {
  return !!submittedAt && !!deadlineAt && submittedAt.getTime() > deadlineAt.getTime();
}

export function clampDays(raw: unknown): number {
  const n = typeof raw === 'string' ? Number(raw) : typeof raw === 'number' ? raw : NaN;
  if (!Number.isInteger(n) || n < 1) return DEFAULT_DAYS;
  return Math.min(n, MAX_DAYS);
}
