// «Шалгалт» хэсгийн анализ (SHALGALT-TOLOVLOGOO §3) — ЦЭВЭР логик, I/O байхгүй,
// бүрэн тесттэй (exam-analytics.spec.ts). Эх өгөгдөл нь TestItemMark (онлайн,
// гар шивэлт, Excel, OMR бүгд ижил түлхүүрээр) + TestResult-ийн нийт оноо +
// TestAbsence. Дэлгэцэн дээрх нэр томьёо энгийн монгол үгээр («Зөв хувь»,
// «Сайн ялгадаг») — «p-value», «discrimination» гэж хэзээ ч бичихгүй.

import { choiceModeOf, choiceTextsOf, GradableProblem } from '../tests/grading';
import { ExamItem, gradeProblemItems, ItemStatus } from '../tests/exam-items';

export const HISTOGRAM_BINS = 5;
/** Найдвартай байдал, ялгах чадвар — үүнээс цөөн сурагчтай үед бодохгүй. */
export const MIN_STUDENTS_FOR_STATS = 10;
/** Дээд/доод бүлэг — сурагчдын 27% (сонгодог дүрэм). */
export const GROUP_SHARE = 0.27;
/** Ялгах чадвар үүнээс доош бол «Сул». */
export const GOOD_DISCRIMINATION = 0.3;
/** Эргэн харалт нээгдэхээс өмнө сэдэв дор хаяж ийм олон зүйлтэй байж харагдана. */
export const MIN_TOPIC_ITEMS_BEFORE_REVIEW = 3;
export const ATTENTION_COUNT = 5;

export type ReliabilityLevel = 'GOOD' | 'FAIR' | 'LOW';
export type DiscriminationLabel = 'GOOD' | 'WEAK' | 'PROBLEM';

// ============ Энгийн статистик ============

export function percentOf(
  earned: number | null | undefined,
  max: number | null | undefined,
): number | null {
  if (earned === null || earned === undefined || !max || max <= 0) return null;
  return (earned / max) * 100;
}

function roundOrNull(value: number | null): number | null {
  return value === null ? null : Math.round(value);
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export function mean(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

export function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/** Хүн амын (N-д хуваасан) дисперс — KR-20-ийн p·q-тэй нэг хэмжүүр. */
export function variance(values: number[]): number {
  const m = mean(values);
  if (m === null) return 0;
  return values.reduce((s, v) => s + (v - m) ** 2, 0) / values.length;
}

/**
 * 0–100%-ийг 5 баганад (0–20, 20–40, 40–60, 60–80, 80–100). Хил нь дээд
 * баганад (20% → 2-р багана); 100% сүүлийн баганад.
 */
export function histogram(percents: number[], bins = HISTOGRAM_BINS): number[] {
  const out = Array.from({ length: bins }, () => 0);
  const width = 100 / bins;
  for (const p of percents) {
    if (!Number.isFinite(p)) continue;
    const clamped = Math.min(100, Math.max(0, p));
    out[Math.min(bins - 1, Math.floor(clamped / width + 1e-9))] += 1;
  }
  return out;
}

// ============ Сурагч бүрийн зүйлсийн төлөв ============

export interface StudentMarks {
  studentId: string;
  /** TestResult-ийн нийт хувь (0–100) — эрэмбэ, ялгах чадварт */
  percent: number;
  statuses: ReadonlyMap<string, ItemStatus>;
}

export interface ItemCorrectness {
  /** Төлөвтэй сурагчийн тоо */
  marked: number;
  correct: number;
  blank: number;
}

export function itemCorrectness(
  items: Pick<ExamItem, 'key'>[],
  students: Pick<StudentMarks, 'statuses'>[],
): Map<string, ItemCorrectness> {
  const out = new Map<string, ItemCorrectness>();
  for (const item of items) {
    const c: ItemCorrectness = { marked: 0, correct: 0, blank: 0 };
    for (const s of students) {
      const status = s.statuses.get(item.key);
      if (!status) continue;
      c.marked += 1;
      if (status === 'CORRECT') c.correct += 1;
      else if (status === 'BLANK') c.blank += 1;
    }
    out.set(item.key, c);
  }
  return out;
}

/** Зүйлийн мэдээлэлтэй сурагчдыг хувиар (их → бага), тэнцвэл ID-аар эрэмбэлнэ. */
function rankForGroups(students: StudentMarks[]): StudentMarks[] {
  return students
    .filter((s) => s.statuses.size > 0 && Number.isFinite(s.percent))
    .sort(
      (a, b) => b.percent - a.percent || a.studentId.localeCompare(b.studentId),
    );
}

/**
 * Ялгах чадвар = дээд 27%-ийн зөв хувь − доод 27%-ийн зөв хувь (-1…1).
 * MIN_STUDENTS_FOR_STATS-аас цөөн сурагчтай бол бүгд null (санамсаргүй шуугиан).
 */
export function discriminationIndex(
  items: Pick<ExamItem, 'key'>[],
  students: StudentMarks[],
): Map<string, number | null> {
  const ranked = rankForGroups(students);
  const out = new Map<string, number | null>();
  if (ranked.length < MIN_STUDENTS_FOR_STATS) {
    for (const item of items) out.set(item.key, null);
    return out;
  }
  const size = Math.max(1, Math.round(ranked.length * GROUP_SHARE));
  const upper = ranked.slice(0, size);
  const lower = ranked.slice(ranked.length - size);
  const rate = (group: StudentMarks[], key: string): number | null => {
    let marked = 0;
    let correct = 0;
    for (const s of group) {
      const status = s.statuses.get(key);
      if (!status) continue;
      marked += 1;
      if (status === 'CORRECT') correct += 1;
    }
    return marked ? correct / marked : null;
  };
  for (const item of items) {
    const u = rate(upper, item.key);
    const l = rate(lower, item.key);
    out.set(item.key, u === null || l === null ? null : u - l);
  }
  return out;
}

/**
 * «Сайн ялгадаг / Сул / Асуудалтай». Бүгд зөв хариулсан зүйлд ялгах мэдээлэл
 * байхгүй (хялбар бодлого) — «Асуудалтай» гэж андуурахгүйн тулд null.
 */
export function discriminationLabel(
  value: number | null,
  allCorrect: boolean,
): DiscriminationLabel | null {
  if (value === null || allCorrect) return null;
  if (value <= 0) return 'PROBLEM';
  if (value < GOOD_DISCRIMINATION) return 'WEAK';
  return 'GOOD';
}

/**
 * Найдвартай байдал — KR-20. Онооны жинтэй зүйлсэд Кронбахын α (KR-20-ийн
 * ерөнхий хэлбэр; бүх зүйл 1 оноотой бол яг KR-20). Бүх сурагчид төлөвтэй
 * зүйлсээр бодно. Цөөн сурагч, < 2 зүйл, тэг дисперс → null.
 */
export function reliability(
  items: Pick<ExamItem, 'key' | 'points'>[],
  students: Pick<StudentMarks, 'statuses'>[],
): number | null {
  const pool = students.filter((s) => s.statuses.size > 0);
  if (pool.length < MIN_STUDENTS_FOR_STATS) return null;
  const scored = items.filter((item) =>
    pool.every((s) => s.statuses.has(item.key)),
  );
  const k = scored.length;
  if (k < 2) return null;
  const rows = pool.map((s) =>
    scored.map((item) =>
      s.statuses.get(item.key) === 'CORRECT' ? item.points : 0,
    ),
  );
  const totalVar = variance(rows.map((r) => r.reduce((a, b) => a + b, 0)));
  if (totalVar <= 0) return null;
  const itemVar = scored.reduce(
    (sum, _, j) => sum + variance(rows.map((r) => r[j])),
    0,
  );
  return (k / (k - 1)) * (1 - itemVar / totalVar);
}

export function reliabilityLevel(value: number): ReliabilityLevel {
  if (value >= 0.7) return 'GOOD';
  if (value >= 0.5) return 'FAIR';
  return 'LOW';
}

// ============ Сэдвийн эзэмшил ============

export interface TopicRef {
  key: string;
  name: string;
}

export interface TopicMastery extends TopicRef {
  /** Сэдэвт хамаарах зүйлсийн тоо */
  items: number;
  earned: number;
  max: number;
  percent: number;
}

/**
 * Сэдэв бүр: Σавсан / Σболомжит (зүйлийн оноогоор). Сурагчийн төлөвгүй зүйл
 * хуваарьт орохгүй. Сул сэдэв эхэнд (хувь өсөхөөр, тэнцвэл нэрээр).
 */
export function topicMastery(
  items: Pick<ExamItem, 'key' | 'points' | 'problemId'>[],
  students: Pick<StudentMarks, 'statuses'>[],
  topicsOf: (problemId: string) => TopicRef[],
): TopicMastery[] {
  const acc = new Map<string, TopicMastery>();
  const itemKeys = new Map<string, Set<string>>();
  for (const item of items) {
    for (const topic of topicsOf(item.problemId)) {
      const row = acc.get(topic.key) ?? {
        key: topic.key,
        name: topic.name,
        items: 0,
        earned: 0,
        max: 0,
        percent: 0,
      };
      const keys = itemKeys.get(topic.key) ?? new Set<string>();
      if (!keys.has(item.key)) {
        keys.add(item.key);
        row.items += 1;
      }
      itemKeys.set(topic.key, keys);
      for (const s of students) {
        const status = s.statuses.get(item.key);
        if (!status) continue;
        row.max += item.points;
        if (status === 'CORRECT') row.earned += item.points;
      }
      acc.set(topic.key, row);
    }
  }
  return [...acc.values()]
    .filter((t) => t.max > 0)
    .map((t) => ({ ...t, percent: Math.round((t.earned / t.max) * 100) }))
    .sort(
      (a, b) =>
        a.earned / a.max - b.earned / b.max ||
        a.name.localeCompare(b.name, 'mn'),
    );
}

/** Сул сэдвүүд: 100%-иас доош, хамгийн сул нь эхэнд. */
export function weakestTopics<T extends TopicMastery>(
  topics: T[],
  count: number,
): T[] {
  return topics.filter((t) => t.earned < t.max).slice(0, count);
}

// ============ Сонголт (A–E) ============

export function letterOf(index: number): string {
  return String.fromCharCode(65 + index);
}

export interface ChoiceKey {
  /** Сонголтын үсгүүд канон дарааллаар (A, B, …) */
  letters: string[];
  correct: string | null;
  /** Буруу сонголт бүрийн багшийн тайлбар (ProblemChoice.mistakeNote) */
  notes: Record<string, string>;
}

/** Сонгох бодлогын үсэг, зөв үсэг — TEXT (бүтэцтэй) ба LETTER (placeholder) горим. */
export function choiceKeyOf(
  p: GradableProblem & {
    choiceOptions?: {
      order: number;
      text: string;
      isCorrect: boolean;
      mistakeNote?: string | null;
    }[];
  },
): ChoiceKey | null {
  const mode = choiceModeOf(p);
  if (!mode) return null;
  if (mode === 'TEXT') {
    if (p.choiceOptions && p.choiceOptions.length > 0) {
      const sorted = [...p.choiceOptions].sort((a, b) => a.order - b.order);
      const notes: Record<string, string> = {};
      sorted.forEach((o, i) => {
        const note = o.mistakeNote?.trim();
        if (note && !o.isCorrect) notes[letterOf(i)] = note;
      });
      const idx = sorted.findIndex((o) => o.isCorrect);
      return {
        letters: sorted.map((_, i) => letterOf(i)),
        correct: idx >= 0 ? letterOf(idx) : null,
        notes,
      };
    }
    const texts = choiceTextsOf(p);
    const letters = texts.map((_, i) => letterOf(i));
    const c = typeof p.correctAnswer === 'string' ? p.correctAnswer.trim() : '';
    return {
      letters,
      correct: letters.includes(c.toUpperCase()) ? c.toUpperCase() : null,
      notes: {},
    };
  }
  const letters = choiceTextsOf(p).map((c) => c.trim().toUpperCase());
  const c =
    typeof p.correctAnswer === 'string'
      ? p.correctAnswer.trim().toUpperCase()
      : '';
  return { letters, correct: letters.includes(c) ? c : null, notes: {} };
}

/**
 * Онлайн хариунаас сурагчийн сонгосон КАНОН үсэг. TEXT горимд display индекс
 * сессийн choiceOrder-оор эх индекс болно. Хариулаагүй/танигдахгүй → ''.
 */
export function chosenLetter(
  p: GradableProblem,
  raw: unknown,
  choiceOrder?: number[],
): string {
  const mode = choiceModeOf(p);
  if (mode === 'TEXT') {
    if (typeof raw !== 'number' || !Number.isInteger(raw)) return '';
    const orig = choiceOrder ? choiceOrder[raw] : raw;
    const n = choiceTextsOf(p).length;
    return orig !== undefined && orig >= 0 && orig < n ? letterOf(orig) : '';
  }
  if (mode === 'LETTER') {
    if (typeof raw !== 'string') return '';
    const letter = raw.trim().toUpperCase();
    return choiceTextsOf(p)
      .map((c) => c.trim().toUpperCase())
      .includes(letter)
      ? letter
      : '';
  }
  return '';
}

export interface ChoiceDistribution {
  /** Үсэг бүрийг сонгосон сурагчийн тоо */
  counts: Record<string, number>;
  /** Онлайнаар өгөөд энэ бодлогыг хоосон орхисон */
  blank: number;
  /** Онлайн хариутай сурагчийн тоо (хоосон орно) */
  total: number;
  correct: string | null;
  mostWrong: { letter: string; count: number; note: string | null } | null;
}

/** chosen: сурагч бүрийн үсэг ('' = хоосон). Гар шивэлтийн сурагч энд орохгүй. */
export function choiceDistribution(
  key: ChoiceKey,
  chosen: string[],
): ChoiceDistribution {
  const counts: Record<string, number> = {};
  for (const letter of key.letters) counts[letter] = 0;
  let blank = 0;
  for (const c of chosen) {
    if (c && c in counts) counts[c] += 1;
    else blank += 1;
  }
  let mostWrong: ChoiceDistribution['mostWrong'] = null;
  if (key.correct) {
    for (const letter of key.letters) {
      if (letter === key.correct || counts[letter] === 0) continue;
      if (!mostWrong || counts[letter] > mostWrong.count) {
        mostWrong = {
          letter,
          count: counts[letter],
          note: key.notes[letter] ?? null,
        };
      }
    }
  }
  return {
    counts,
    blank,
    total: chosen.length,
    correct: key.correct,
    mostWrong,
  };
}

// ============ Онлайн сессээс төлөв (TestItemMark-аас өмнөх дүн) ============

export interface SessionProblem extends GradableProblem {
  statementText: string | null;
}

/**
 * TestItemMark нэвтрэхээс өмнө онлайнаар илгээсэн дүн: сессийн хариуг
 * илгээх үеийн дүрмээр (gradeProblemItems) дахин дүгнэнэ. Хариуны түлхүүргүй
 * бодлогын зүйлс төлөвгүй (finalize-тэй ижил — дүнд тооцогдоогүй).
 */
export function statusesFromSession(
  items: ExamItem[],
  problems: ReadonlyMap<string, SessionProblem>,
  answers: Record<string, unknown>,
  choiceOrder: Record<string, number[]>,
  isKnown: (p: SessionProblem) => boolean,
): Map<string, ItemStatus> {
  const byProblem = new Map<string, ExamItem[]>();
  for (const item of items) {
    byProblem.set(item.problemId, [
      ...(byProblem.get(item.problemId) ?? []),
      item,
    ]);
  }
  const out = new Map<string, ItemStatus>();
  for (const [problemId, list] of byProblem) {
    const p = problems.get(problemId);
    if (!p || !isKnown(p)) continue;
    const graded = gradeProblemItems(
      p,
      list,
      answers[problemId],
      choiceOrder[problemId],
    );
    for (const item of list) {
      out.set(item.key, graded.statuses.get(item.key) ?? 'BLANK');
    }
  }
  return out;
}

// ============ Нэгтгэсэн анализ ============

export interface AnalyticsStudent {
  studentId: string;
  classroomId: string;
  absent: boolean;
  result: { total: number; max: number } | null;
  /** Зүйл бүрийн төлөв; нийт оноо л байгаа (Excel «нийт») бол null */
  statuses: ReadonlyMap<string, ItemStatus> | null;
  /** Онлайн хариу: problemId → үсэг ('' = хоосон). Гар шивэлт бол null */
  choices: ReadonlyMap<string, string> | null;
}

export interface AnalyticsProblem {
  problemId: string;
  choice: ChoiceKey | null;
  topics: TopicRef[];
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
  /** Зөв хувь (0–100), төлөвтэй сурагчгүй бол null */
  percent: number | null;
  choices: ChoiceDistribution | null;
  discrimination: { value: number; label: DiscriminationLabel | null } | null;
}

export interface ExamAnalytics {
  summary: {
    /** Хүрээний (ангиудын) идэвхтэй сурагч */
    students: number;
    absent: number;
    /** Дүнтэй (ирээгүйг оруулахгүй) */
    taken: number;
    /** Дүнгүй, ирээгүй гэж тэмдэглээгүй */
    pending: number;
    avg: number | null;
    median: number | null;
    max: number | null;
    min: number | null;
  };
  histogram: number[];
  classes: {
    id: string;
    name: string;
    students: number;
    taken: number;
    avg: number | null;
  }[];
  reliability: { value: number; level: ReliabilityLevel } | null;
  topics: TopicMastery[];
  items: ItemAnalytics[];
  /** «Анхаарах 5 бодлого» — хамгийн бага зөв хувьтай зүйлсийн түлхүүр */
  attention: string[];
  /** Зүйлийн төлөвтэй сурагч (нийт оноо л байгааг оруулахгүй) */
  markedStudents: number;
  /** Онлайн хариутай сурагч — A–E тархалтын суурь */
  onlineStudents: number;
}

export function buildExamAnalytics(input: {
  items: ExamItem[];
  problems: ReadonlyMap<string, AnalyticsProblem>;
  students: AnalyticsStudent[];
  classes: { id: string; name: string }[];
  withReliability: boolean;
}): ExamAnalytics {
  const { items, problems, classes } = input;
  const present = input.students.filter((s) => !s.absent);
  const taken = present.filter((s) => s.result);
  const percentBy = new Map<string, number>();
  for (const s of taken) {
    const p = percentOf(s.result!.total, s.result!.max);
    percentBy.set(s.studentId, p ?? 0);
  }
  const percents = [...percentBy.values()];
  const marked: StudentMarks[] = taken
    .filter((s) => s.statuses && s.statuses.size > 0)
    .map((s) => ({
      studentId: s.studentId,
      percent: percentBy.get(s.studentId) ?? 0,
      statuses: s.statuses!,
    }));
  const online = taken.filter((s) => s.choices);

  const correctness = itemCorrectness(items, marked);
  const disc = discriminationIndex(items, marked);
  const itemRows: ItemAnalytics[] = items.map((item) => {
    const c = correctness.get(item.key) ?? { marked: 0, correct: 0, blank: 0 };
    const meta = problems.get(item.problemId);
    const d = disc.get(item.key) ?? null;
    const choices =
      meta?.choice && !item.group && online.length > 0
        ? choiceDistribution(
            meta.choice,
            online.map((s) => s.choices!.get(item.problemId) ?? ''),
          )
        : null;
    return {
      key: item.key,
      label: item.label,
      part: item.part,
      points: item.points,
      order: item.order,
      problemId: item.problemId,
      group: item.group?.label ?? null,
      marked: c.marked,
      correct: c.correct,
      blank: c.blank,
      percent: c.marked ? Math.round((c.correct / c.marked) * 100) : null,
      choices,
      discrimination:
        d === null
          ? null
          : {
              value: round2(d),
              label: discriminationLabel(d, c.correct === c.marked),
            },
    };
  });

  const byClass = new Map<string, { students: number; percents: number[] }>();
  for (const s of input.students) {
    const row = byClass.get(s.classroomId) ?? { students: 0, percents: [] };
    row.students += 1;
    const p = percentBy.get(s.studentId);
    if (!s.absent && p !== undefined) row.percents.push(p);
    byClass.set(s.classroomId, row);
  }

  const rel = input.withReliability ? reliability(items, marked) : null;
  const attention = itemRows
    .filter((i) => i.percent !== null)
    .sort(
      (a, b) =>
        (a.percent ?? 0) - (b.percent ?? 0) ||
        a.order - b.order ||
        a.label.localeCompare(b.label),
    )
    .slice(0, ATTENTION_COUNT)
    .map((i) => i.key);

  return {
    summary: {
      students: input.students.length,
      absent: input.students.filter((s) => s.absent).length,
      taken: taken.length,
      pending: present.length - taken.length,
      avg: roundOrNull(mean(percents)),
      median: roundOrNull(median(percents)),
      max: percents.length ? Math.round(Math.max(...percents)) : null,
      min: percents.length ? Math.round(Math.min(...percents)) : null,
    },
    histogram: histogram(percents),
    classes: classes
      .filter((c) => byClass.has(c.id))
      .map((c) => {
        const row = byClass.get(c.id)!;
        return {
          id: c.id,
          name: c.name,
          students: row.students,
          taken: row.percents.length,
          avg: roundOrNull(mean(row.percents)),
        };
      }),
    reliability:
      rel === null
        ? null
        : { value: round2(rel), level: reliabilityLevel(rel) },
    topics: topicMastery(
      items,
      marked,
      (problemId) => problems.get(problemId)?.topics ?? [],
    ),
    items: itemRows,
    attention,
    markedStudents: marked.length,
    onlineStudents: online.length,
  };
}

// ============ Нэг сурагчийн задаргаа ============

export interface StudentBreakdown {
  part1: number;
  part1Max: number;
  part2: number;
  part2Max: number;
  topics: TopicMastery[];
  /** Буруу/хоосон зүйлс (бодлогын дарааллаар) */
  wrong: {
    key: string;
    label: string;
    part: 1 | 2;
    points: number;
    problemId: string;
    status: ItemStatus;
  }[];
}

export function studentBreakdown(
  items: ExamItem[],
  statuses: ReadonlyMap<string, ItemStatus>,
  topicsOf: (problemId: string) => TopicRef[],
): StudentBreakdown {
  const t = { part1: 0, part1Max: 0, part2: 0, part2Max: 0 };
  const wrong: StudentBreakdown['wrong'] = [];
  for (const item of items) {
    const status = statuses.get(item.key);
    if (!status) continue;
    const earned = status === 'CORRECT' ? item.points : 0;
    if (item.part === 1) {
      t.part1 += earned;
      t.part1Max += item.points;
    } else {
      t.part2 += earned;
      t.part2Max += item.points;
    }
    if (status !== 'CORRECT') {
      wrong.push({
        key: item.key,
        label: item.label,
        part: item.part,
        points: item.points,
        problemId: item.problemId,
        status,
      });
    }
  }
  return {
    ...t,
    topics: topicMastery(items, [{ statuses }], topicsOf),
    wrong,
  };
}

/**
 * Эргэн харалт нээгдэхээс өмнө цөөн зүйлтэй сэдвийг нуух — 1–2 бодлоготой
 * сэдвийн хувь нь тухайн бодлогын зөв/бурууг (тэгэхээр зөв хариуг) задална.
 */
export function visibleTopics<T extends TopicMastery>(
  topics: T[],
  reviewOpen: boolean,
): T[] {
  return reviewOpen
    ? topics
    : topics.filter((t) => t.items >= MIN_TOPIC_ITEMS_BEFORE_REVIEW);
}

// ============ Сурагчийн дүнгийн дэлгэцийн бодлого ============

export type ReviewLevelValue = 'NONE' | 'PROBLEMS' | 'FULL';

export interface StudentReviewPolicy {
  /** Буруу бодлогын жагсаалт (зүйл бүрийн зөв/буруу) харагдах эсэх */
  open: boolean;
  /** Буруу бодлогын текст, зураг, сурагчийн өөрийн хариу */
  problems: boolean;
  correctAnswer: boolean;
  /** ALL — бодолтын ноорог ч гэсэн; VERIFIED — багш баталгаажуулсан л */
  solutions: 'ALL' | 'VERIFIED' | 'NONE';
  youtube: boolean;
}

/**
 * 1000 бодлого: одоо байгаа эргэн харалтын хаалт (thousand/review-gate) —
 * бодлого бүрийн зөв/буруу, зөв хариу, бодолт, бичлэг зөвхөн FULL үед
 * (PROBLEMS түвшинд зөв/буруу харагдвал зөв хариу задарна). Бусад шалгалт:
 * хаалтгүй — онлайн эргэн харалттай ижил (зөв хариу биш, баталгаажсан бодолт).
 */
export function studentReviewPolicy(
  type: string,
  level: ReviewLevelValue,
): StudentReviewPolicy {
  if (type === 'THOUSAND') {
    const full = level === 'FULL';
    return {
      open: full,
      problems: full,
      correctAnswer: full,
      solutions: full ? 'ALL' : 'NONE',
      youtube: full,
    };
  }
  return {
    open: true,
    problems: true,
    correctAnswer: false,
    solutions: 'VERIFIED',
    youtube: true,
  };
}

// ============ Сэдвийн нэр ============

/**
 * «Интеграл · Тест 3» → «Интеграл». Номын бүлгүүд «<сэдэв> · Тест N» гэж
 * нэрлэгддэг тул нэг сэдвийн бүлгүүд нэг сэдэвт нийлнэ.
 */
export function chapterTopicName(title: string): string {
  const trimmed = title.trim();
  const base = trimmed
    .replace(/\s*[·:-]\s*(Тест|тест)\s*\d+(\s*-\s*[A-Za-zА-Яа-я])?\s*$/u, '')
    .trim();
  return base || trimmed;
}

export interface TopicSource {
  tags: { id: string; name: string }[];
  chapter: {
    title: string;
    topic: { id: string; name: string } | null;
  } | null;
}

/**
 * Бодлогын сэдэв — схемд байгаа хамгийн нарийн ангиллаар: багшийн өгсөн
 * дэд сэдэв (SUBTOPIC шошго) → БҮТ-ийн агуулгын муж (Chapter.topic) →
 * бүлгийн нэр («· Тест N»-гүй).
 */
export function problemTopics(source: TopicSource): TopicRef[] {
  if (source.tags.length > 0) {
    return source.tags.map((t) => ({ key: `tag:${t.id}`, name: t.name }));
  }
  if (source.chapter?.topic) {
    return [
      {
        key: `topic:${source.chapter.topic.id}`,
        name: source.chapter.topic.name,
      },
    ];
  }
  if (source.chapter?.title) {
    const name = chapterTopicName(source.chapter.title);
    return [{ key: `ch:${name}`, name }];
  }
  return [];
}
