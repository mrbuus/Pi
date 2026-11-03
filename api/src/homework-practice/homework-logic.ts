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
// Шалгалтын төрлүүд гэрийн даалгавар болохгүй (CHAPTER_EXAM-ийн B хувилбар нь
// өөр ангийн/дараагийн шалгалтад нөөцлөгдсөн байж болно — аюулгүй байдлын шалгалт 2026-10-29)
export const EXCLUDED_TYPES = ['THOUSAND', 'EESH_MOCK', 'CHAPTER_EXAM'] as const;

/** «Дахин бодох» (эзэн 2026-11-03): хичээлээс хойш ингэж олон хичээл өнгөрсний дараа А, Б нээгдэнэ */
export const REDO_LESSONS = 2;
/** Дахин бодох оролдлогын дугаар (нэг удаа) */
export const REDO_ROUND = 2;

/**
 * Хичээл `date`-ээс хойш `today`-аас ӨМНӨ болсон хичээлийн тоо (өнөөдрийн хичээл өнгөрсөнд
 * тооцогдохгүй — хамгаалах талаар). `lessonDates` — тухайн ангийн хичээлийн бүх өдөр «YYYY-MM-DD».
 */
export function lessonsPassedAfter(
  lessonDates: readonly string[],
  date: string,
  today: string,
): number {
  return new Set(lessonDates.filter((d) => d > date && d < today)).size;
}

/** Хичээлээс хойш REDO_LESSONS хичээл өнгөрсөн үү */
export function redoOpen(
  lessonDates: readonly string[],
  date: string,
  today: string,
): boolean {
  return lessonsPassedAfter(lessonDates, date, today) >= REDO_LESSONS;
}

/** Хугацааны хязгаараас хойш зөвшөөрөх сүлжээний зай (секунд) */
export const TIME_GRACE_SEC = 60;

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
  /**
   * Тухайн ангид танхимд бодогдох (ClassTestSession, аль ч өдөр) эсвэл ирээдүйд оноогдсон
   * (TestAccess.assignedAt > одоо) тестүүд — тэр ангийн гэрийн даалгавар болохгүй.
   */
  reserved?: { classroomId: string; testId: string }[];
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
  const out: HomeworkSlot[] = [];
  for (const e of input.enrollments) {
    const reserved = new Set(
      (input.reserved ?? [])
        .filter((r) => r.classroomId === e.classroomId)
        .map((r) => r.testId),
    );
    const siblings = input.siblings.filter((t) => !reserved.has(t.id));
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

/* ───────── Идэвхийн хяналт (эзэн 2026-11-03) ───────── */

export interface ActivityState {
  /** Хуудас нүдэнд харагдаж байсан нийт секунд (бодож байх хугацаа) */
  activeSec: number;
  /** Вэбээс (таб/апп) гарсан нийт секунд */
  awaySec: number;
  /** Вэбээс гарсан тоо */
  leaveCount: number;
  /** Даалгаврыг нээсэн (эхлүүлсэн/үргэлжлүүлсэн) тоо — сервер өсгөнө */
  openCount: number;
}

export const ACTIVITY_MAX_LEAVES = 5000;

function wholeNonNegative(v: unknown): number | null {
  if (typeof v !== 'number' || !Number.isFinite(v) || v < 0) return null;
  return Math.floor(v);
}

/**
 * Клиентийн хэмжсэн идэвхийг хадгалсан утгатай нэгтгэнэ: ЗӨВХӨН өснө (дахин ачаалахад тоолуур
 * 0-ээс эхлэх вий), бодит хугацаанаас (эхэлснээс хойших секунд) хэтрэхгүй. Буруу утгыг үл тооно.
 * `openCount`-ыг клиент өөрчлөхгүй.
 */
export function mergeActivity(
  current: ActivityState,
  incoming: unknown,
  startedAt: Date,
  now: Date = new Date(),
): ActivityState {
  if (!incoming || typeof incoming !== 'object' || Array.isArray(incoming))
    return current;
  const inc = incoming as Record<string, unknown>;
  const wall = Math.max(
    0,
    Math.floor((now.getTime() - startedAt.getTime()) / 1000),
  );
  const pick = (cur: number, v: unknown, cap: number) => {
    const n = wholeNonNegative(v);
    return n === null ? cur : Math.max(cur, Math.min(n, cap));
  };
  return {
    activeSec: pick(current.activeSec, inc.activeSec, wall),
    awaySec: pick(current.awaySec, inc.awaySec, wall),
    leaveCount: pick(current.leaveCount, inc.leaveCount, ACTIVITY_MAX_LEAVES),
    openCount: current.openCount,
  };
}

/* ───────── Хариуг үзүүлэх (илгээсний дараа / багшид) ───────── */

export type AnswerView = string | Record<string, string> | null;

/** Сурагчийн хадгалсан хариу → үзүүлэх хэлбэр (хоосон бол null) */
export function myAnswerView(raw: unknown): AnswerView {
  if (isBlank(raw)) return null;
  if (typeof raw === 'string') return raw.trim();
  if (typeof raw === 'number') return String(raw);
  if (raw && typeof raw === 'object' && !Array.isArray(raw))
    return Object.fromEntries(
      Object.entries(raw as Record<string, unknown>).map(([k, v]) => [
        k,
        isBlankAnswer(v) ? '' : String(v).trim(),
      ]),
    );
  return null;
}

/**
 * Зөв хариу (илгээсний дараа л хэрэглэнэ): сонголттой бол үсэг (A, B, …), нөхөх бодлого бол
 * нүд бүрийн утга, бусад нь мөр. Хариуны түлхүүр байхгүй бодлого → null.
 */
export function correctAnswerView(row: HomeworkProblemRow): AnswerView {
  const g = toGradable(row);
  if (!hasKnownAnswer(g)) return null;
  const mode = choiceModeOf(g);
  const c = row.problem.correctAnswer;
  if (mode === 'TEXT') {
    const opts = row.problem.choiceOptions;
    if (opts.length > 0) {
      const sorted = [...opts].sort((a, b) => a.order - b.order);
      const idx = sorted.findIndex((o) => o.isCorrect);
      return idx >= 0 ? letter(idx) : null;
    }
    if (typeof c === 'string') return c.trim().toUpperCase();
    if (typeof c === 'number' && Number.isInteger(c)) return letter(c);
    return null;
  }
  if (mode === 'LETTER') return String(c ?? '').trim().toUpperCase();
  if (c && typeof c === 'object' && !Array.isArray(c))
    return Object.fromEntries(
      Object.entries(c as Record<string, unknown>).map(([k, v]) => [
        k,
        String(v ?? '').trim(),
      ]),
    );
  return String(c ?? '').trim();
}
