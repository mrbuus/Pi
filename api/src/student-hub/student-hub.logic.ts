// Танхимын сурагчийн V2 самбарын ЦЭВЭР логик (гэрээ docs/v2/SURAGCH-V2-GEREE.md) — ӨС-гүй,
// unit тестэд бүрэн ордог. Хичээлийн өдрийн нэгдэл, D → D' даалгаврын тэмдэглэгээ, сарын
// хил, хувь, тест нээх дүрэм, хайлт, бодлогын харагдац.

import { addDaysKey, monthRange } from '../attendance/board-logic';
import { RELEASE_EXCLUDED_TYPES } from '../common/access';
import {
  problemView,
  toGradable,
  type HomeworkProblemRow,
} from '../homework-practice/homework-logic';
import { answerText } from '../revisions/revision-snapshot';
import {
  resolveWeek,
  type ResolvedEntry,
  type ResolverException,
  type ResolverSchedule,
} from '../schedule/week-resolver';
import { choiceModeOf, hasKnownAnswer } from '../tests/grading';

/** Онолын болон гэрийн даалгаврын зураг илгээх цонх: өнөөдөр ба өмнөх 13 хоног */
export const UPLOAD_WINDOW_DAYS = 14;
/** Сурагчийн сарын жагсаалтын хамгийн эрт сар */
export const MIN_MONTH = '2026-09';
/** D'-ийг олохын тулд сарын төгсгөлөөс хойш унших хоног (урт амралтыг ч багтаана) */
export const MARK_LOOKAHEAD_DAYS = 35;
/** /student-hub/theory: q-гүй үеийн өгөгдмөл хүрээ */
export const THEORY_DEFAULT_DAYS = 60;
/** /student-hub/theory: хүрээний дээд хэмжээ */
export const THEORY_MAX_RANGE_DAYS = 400;
/** Хайлтын үгийн дээд урт */
export const MAX_QUERY_LENGTH = 100;

export type AttendanceStatus = 'PRESENT' | 'LATE' | 'ABSENT' | 'EXCUSED';
export type HomeworkStatus = 'DONE' | 'PARTIAL' | 'NOT_DONE';

/** «анги|огноо» түлхүүр */
export function dayKey(classroomId: string, date: string): string {
  return `${classroomId}|${date}`;
}

/** D нь [өнөөдөр − 13, өнөөдөр] цонхонд байгаа эсэх (зураг илгээх эрх) */
export function inUploadWindow(date: string, today: string): boolean {
  return date <= today && date >= addDaysKey(today, -(UPLOAD_WINDOW_DAYS - 1));
}

/* ───────── Сар ───────── */

/** «2026-10» + n сар */
export function shiftMonth(month: string, n: number): string {
  const [y, m] = month.split('-').map(Number);
  const total = y * 12 + (m - 1) + n;
  const yy = Math.floor(total / 12);
  const mm = (total % 12) + 1;
  return `${yy}-${String(mm).padStart(2, '0')}`;
}

export interface MonthWindow {
  month: string;
  /** Сарын эхний өдөр */
  from: string;
  /** Сарын сүүлийн өдөр, өнөөдрөөр хязгаарлагдсан */
  to: string;
  prevMonth: string | null;
  nextMonth: string | null;
}

/**
 * ?month=YYYY-MM → сарын хил. Өгөгдөөгүй бол одоогийн сар. 2026-09-ээс өмнөх, ирээдүйн
 * эсвэл буруу хэлбэртэй бол null (дуудагч 400 өгнө).
 */
export function monthWindow(raw: string | undefined, today: string): MonthWindow | null {
  const current = today.slice(0, 7);
  const month = raw === undefined || raw === '' ? current : raw;
  const range = monthRange(month);
  if (!range || month < MIN_MONTH || month > current) return null;
  return {
    month,
    from: range.from,
    to: range.to < today ? range.to : today,
    prevMonth: month > MIN_MONTH ? shiftMonth(month, -1) : null,
    nextMonth: month < current ? shiftMonth(month, 1) : null,
  };
}

/* ───────── Хичээлийн өдрийн нэгдэл ───────── */

export interface LessonDayEvidence {
  classroomId: string;
  date: string;
}

/**
 * Ангийн хичээлийн өдрүүд = Attendance (өөрийн) ∪ LessonTopic ∪ ClassTestSession ∪
 * LessonRecord (цуцлаагүй) — `toKey`-оос хойшхийг хасна. Анги бүрд өсөх дарааллаар.
 */
export function lessonDaysByClass(
  evidence: LessonDayEvidence[],
  toKey: string,
): Map<string, string[]> {
  const sets = new Map<string, Set<string>>();
  for (const e of evidence) {
    if (e.date > toKey) continue;
    const set = sets.get(e.classroomId) ?? new Set<string>();
    set.add(e.date);
    sets.set(e.classroomId, set);
  }
  const out = new Map<string, string[]>();
  for (const [id, set] of sets) out.set(id, [...set].sort());
  return out;
}

/** Өсөх дараалалтай `days`-ээс `date`-ээс ХОЙШХИ эхний хичээлийн өдөр (D') */
export function nextLessonDay(days: readonly string[], date: string): string | null {
  for (const d of days) if (d > date) return d;
  return null;
}

/**
 * Сурагчид харагдах өдөр: ангид орсон өдрөөс хойш (Enrollment.joinedAt), эсвэл тэр өдөр
 * өөрийн ирцийн мөртэй (joinedAt хожуу бичигдсэн ч өөрийн ирц харагдана).
 */
export function visibleDay(date: string, joinedKey: string, ownAttendance: boolean): boolean {
  return ownAttendance || date >= joinedKey;
}

export interface MarkRow {
  status: HomeworkStatus | null;
  comment: string | null;
}

export interface HomeworkView {
  status: HomeworkStatus | null;
  comment: string | null;
  /** D' — багш тэмдэглэх (тэмдэглэсэн) өдөр; хараахан болоогүй бол null */
  checkedOn: string | null;
}

/**
 * D өдрийн даалгаврын тэмдэглэгээ = D' (дараагийн хичээлийн өдөр) дээрх DailyHomeworkMark
 * (homework-practice `nextLessonDate`-ийн конвенц). D' болоогүй бол бүгд null («Шалгаагүй»).
 */
export function homeworkFor(
  classroomId: string,
  date: string,
  classDays: readonly string[],
  marks: Map<string, MarkRow>,
): HomeworkView {
  const next = nextLessonDay(classDays, date);
  if (!next) return { status: null, comment: null, checkedOn: null };
  const m = marks.get(dayKey(classroomId, next));
  return { status: m?.status ?? null, comment: m?.comment ?? null, checkedOn: next };
}

/* ───────── Хувь ───────── */

/** 0..100 бүхэл; хуваагч 0 бол 0 */
export function percent(num: number, den: number): number {
  return den > 0 ? Math.round((num / den) * 100) : 0;
}

export interface AttendanceSummary {
  total: number;
  PRESENT: number;
  LATE: number;
  ABSENT: number;
  EXCUSED: number;
  /** (PRESENT + LATE) / total */
  rate: number;
}

export interface HomeworkSummary {
  total: number;
  DONE: number;
  PARTIAL: number;
  NOT_DONE: number;
  /** (DONE + PARTIAL·0.5) / total */
  rate: number;
}

export function attendanceSummary(
  counts: { status: AttendanceStatus; count: number }[],
): AttendanceSummary {
  const out = { PRESENT: 0, LATE: 0, ABSENT: 0, EXCUSED: 0 };
  for (const c of counts) out[c.status] += c.count;
  const total = out.PRESENT + out.LATE + out.ABSENT + out.EXCUSED;
  return { total, ...out, rate: percent(out.PRESENT + out.LATE, total) };
}

/** Төлөвгүй (null — багш тэмдэглээгүй) мөр тооцогдохгүй */
export function homeworkSummary(
  counts: { status: HomeworkStatus | null; count: number }[],
): HomeworkSummary {
  const out = { DONE: 0, PARTIAL: 0, NOT_DONE: 0 };
  for (const c of counts) if (c.status) out[c.status] += c.count;
  const total = out.DONE + out.PARTIAL + out.NOT_DONE;
  return { total, ...out, rate: percent(out.DONE + out.PARTIAL * 0.5, total) };
}

/* ───────── Тест нээх дүрэм ───────── */

/**
 * Анги ClassTestSession-оор хийсэн тест гарсан өдрийн МАРГААШ нээгдэнэ (`date < today`,
 * classroomRelease-тэй ижил). Устгасан эсвэл өөрийн эргэн харалтын дүрэмтэй төрөл
 * (1000 бодлого, ЭЕШ сорил) хэзээ ч нээгдэхгүй. Гараар бичсэн (testId-гүй) мөр нээгдэхгүй.
 */
export function testOpen(
  date: string,
  today: string,
  test: { deletedAt: Date | null; type: string } | null | undefined,
): boolean {
  if (!test || test.deletedAt) return false;
  if ((RELEASE_EXCLUDED_TYPES as readonly string[]).includes(test.type)) return false;
  return date < today;
}

/* ───────── Сэдэв, хайлт ───────── */

/** LessonRecord.topic → LessonTopic.title → Chapter.title → null (хоосон мөрийг алгасна) */
export function topicOf(...candidates: (string | null | undefined)[]): string | null {
  for (const c of candidates) {
    const t = c?.trim();
    if (t) return t;
  }
  return null;
}

/** Хайлтын үгс (том жижиг үсэг ялгахгүй); хоосон бол [] */
export function queryWords(q: string | undefined): string[] {
  return (q ?? '')
    .slice(0, MAX_QUERY_LENGTH)
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 6);
}

/** Үг бүр бичвэрүүдийн аль нэгэнд агуулагдана (AND); үггүй бол үнэн */
export function matchesWords(words: string[], texts: (string | null | undefined)[]): boolean {
  if (!words.length) return true;
  const hay = texts
    .filter((t): t is string => !!t)
    .join('\n')
    .toLowerCase();
  return words.every((w) => hay.includes(w));
}

/* ───────── Хуваарь: өдрийн цаг, танхим ───────── */

/**
 * [fromKey, toKey] хүрээний хуваарийн тохиолдлууд (цуцалсан/зөөсөн exception-тэй,
 * week-resolver-ийн дүрмээр) → «анги|огноо» бүрд эхлэх цагаар эрэмбэлсэн жагсаалт.
 */
export function resolveRange(
  fromKey: string,
  toKey: string,
  schedules: ResolverSchedule[],
  exceptions: ResolverException[],
): Map<string, ResolvedEntry[]> {
  const out = new Map<string, ResolvedEntry[]>();
  if (!schedules.length || fromKey > toKey) return out;
  for (let start = fromKey; start <= toKey; start = addDaysKey(start, 7)) {
    const week = resolveWeek({ weekStart: start, schedules, exceptions, topics: [], holidays: [] });
    for (const day of week) {
      if (day.date > toKey) continue;
      for (const e of day.entries) {
        const k = dayKey(e.classroomId, day.date);
        out.set(k, [...(out.get(k) ?? []), e]);
      }
    }
  }
  return out;
}

/** Өнөөдрийн хичээлүүдээс: дуусаагүй эхнийх, бүгд дууссан бол сүүлийнх */
export function pickToday<T extends { startMinute: number; endMinute: number }>(
  entries: T[],
  nowMinute: number,
): T | null {
  if (!entries.length) return null;
  const sorted = [...entries].sort((a, b) => a.startMinute - b.startMinute);
  return sorted.find((e) => e.endMinute > nowMinute) ?? sorted[sorted.length - 1];
}

/** УБ цагаар шөнө дундаас хойшхи минут */
export function ubMinuteOfDay(now = new Date()): number {
  const ub = new Date(now.getTime() + 8 * 60 * 60 * 1000);
  return ub.getUTCHours() * 60 + ub.getUTCMinutes();
}

/* ───────── Бодлого (анги хийсэн, нээгдсэн тест) ───────── */

const letter = (i: number) => String.fromCharCode(65 + i);

/**
 * Зөв хариуг хүн уншихуйц мөр болгоно: сонголтод үсэг («B», олон зөв бол «B, D»),
 * нөхөх бодлогод «a = 1, b = 2», хариу тодорхойгүй (ANSWER_KEY_MISSING г.м.) бол null.
 * Үсэг нь `problemView`-ийн сонголтын шошготой ижил (эх дараалал).
 */
export function correctAnswerOf(row: HomeworkProblemRow): string | null {
  const g = toGradable(row);
  if (!hasKnownAnswer(g)) return null;
  const mode = choiceModeOf(g);
  if (mode === 'TEXT') {
    if (g.choiceOptions && g.choiceOptions.length > 0) {
      const sorted = [...g.choiceOptions].sort((a, b) => a.order - b.order);
      const letters = sorted.flatMap((o, i) => (o.isCorrect ? [letter(i)] : []));
      return letters.length ? letters.join(', ') : null;
    }
    const c = g.correctAnswer;
    if (typeof c === 'number') return letter(c);
    return typeof c === 'string' ? c.trim().toUpperCase() : null;
  }
  if (mode === 'LETTER')
    return typeof g.correctAnswer === 'string' ? g.correctAnswer.trim().toUpperCase() : null;
  return answerText(g.correctAnswer);
}

export interface HubProblemRow extends HomeworkProblemRow {
  problem: HomeworkProblemRow['problem'] & { youtubeUrl: string | null };
}

export interface HubProblem {
  id: string;
  order: number;
  stem: string | null;
  imageKey: string | null;
  choices: { label: string; text: string; imageKey: string | null }[];
  correctAnswer: string | null;
  /** YouTube бодолттой эсэх — холбоосыг өөрийг нь ХЭЗЭЭ Ч буцаахгүй */
  hasVideo: boolean;
}

/** Нээгдсэн тестийн бодлого: асуулт, сонголт, зөв хариу; YouTube холбоосгүй */
export function hubProblem(row: HubProblemRow): HubProblem {
  const view = problemView(row);
  return {
    id: view.id,
    order: view.order,
    stem: view.statementText,
    imageKey: view.imageKey,
    choices: view.choices ?? [],
    correctAnswer: correctAnswerOf(row),
    hasVideo: !!row.problem.youtubeUrl?.trim(),
  };
}
