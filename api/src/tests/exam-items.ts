// Шалгалтын «зүйл» (item) — дүнгийн хүснэгтийн нэг багана: сонгох бодлого эсвэл
// 2-р хэсгийн алхмын багц. Онлайн дүгнэлт, гар шивэлт, Excel, OMR бүгд ЭНЭ
// модулийн жагсаалт, түлхүүрээр TestItemMark бичнэ (SHALGALT-TOLOVLOGOO §0.3).
// ЦЭВЭР логик — I/O байхгүй, бүрэн тесттэй (exam-items.spec.ts).

import {
  answerToken,
  FILL_EMPTY,
  fillSlotKeys,
  gradeAnswer,
  GradableProblem,
  hasKnownAnswer,
  isBlankAnswer,
  tokensMatch,
} from './grading';

export interface ScoringGroup {
  label: string;
  boxes: string[];
  points: number;
}

export type ItemStatus = 'CORRECT' | 'WRONG' | 'BLANK';

export interface ExamItem {
  /** "p:<problemId>" эсвэл "g:<problemId>:<label>" */
  key: string;
  /** Хүснэгтийн баганын нэр: "1".."36", "1-1".."4-3" */
  label: string;
  part: 1 | 2;
  problemId: string;
  order: number;
  points: number;
  group: ScoringGroup | null;
}

export interface ExamItemSource {
  problemId: string;
  order: number;
  points: number;
  problem: {
    format: string;
    statementText: string | null;
    scoringGroups?: unknown;
  };
}

const MAX_LABEL = 12;
const MAX_GROUPS = 12;

// web/src/components/exam/fillSlots.ts ба prisma/import-1000.cjs-тэй ИЖИЛ дүрэм:
// [a], [bc] (эсвэл \lbrack a\rbrack) бүлгүүд гарсан дарааллаар, давхардлыг нэг удаа.
export function slotGroups(statement: string | null | undefined): string[] {
  return fillSlotKeys(statement);
}

/** Нүд бүрийн үсэг (нэг үсэг = нэг цифр) — шалгалтын нүдний дараалал. */
export function slotLetters(statement: string | null | undefined): string[] {
  return slotGroups(statement).flatMap((key) => key.split(''));
}

export function itemKey(problemId: string, groupLabel?: string | null): string {
  return groupLabel ? `g:${problemId}:${groupLabel}` : `p:${problemId}`;
}

/**
 * Problem.scoringGroups-ийг бүтцээр нь шалгана. Буруу бол null (бодлого
 * бүхэлдээ нэг зүйл болж дүгнэгдэнэ — буруу тохиргоо дүнг эвдэхгүй).
 */
export function parseScoringGroups(value: unknown): ScoringGroup[] | null {
  if (!Array.isArray(value) || value.length === 0 || value.length > MAX_GROUPS)
    return null;
  const labels = new Set<string>();
  const boxes = new Set<string>();
  const out: ScoringGroup[] = [];
  for (const raw of value) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
    const g = raw as Record<string, unknown>;
    const label = typeof g.label === 'string' ? g.label.trim() : '';
    const points = g.points;
    if (!label || label.length > MAX_LABEL || labels.has(label)) return null;
    if (
      typeof points !== 'number' ||
      !Number.isInteger(points) ||
      points < 0 ||
      points > 100
    )
      return null;
    // Нүдгүй багц зөвшөөрнө — бодлогын текстэд [a] тэмдэглэгээгүй (Word-оос
    // орсон) бодлогод зөвхөн гар/Excel шивэлтэд хэрэглэгдэнэ.
    if (!Array.isArray(g.boxes) || g.boxes.length > 16) return null;
    const groupBoxes: string[] = [];
    for (const b of g.boxes) {
      if (
        typeof b !== 'string' ||
        !/^[a-zA-Zа-яА-ЯёЁ]$/.test(b) ||
        boxes.has(b)
      )
        return null;
      boxes.add(b);
      groupBoxes.push(b);
    }
    labels.add(label);
    out.push({ label, boxes: groupBoxes, points });
  }
  return out;
}

/**
 * Тухайн тестэд үйлчлэх алхмын багцууд. Зөвхөн FILL_NUMBER, нийлбэр нь
 * тестийн оноотой тэнцүү үед; 0 оноотой багцыг хасна. Бусад үед null —
 * бодлого бүхэлдээ нэг зүйл.
 *   [a]… нүдтэй бодлого: багц бүр нүдтэй, бүх нүд бодлогын нүдэнд байх.
 *   Нүдгүй бодлого (Word импорт): багцууд нүдгүй (зөвхөн шошго, оноо) — гар,
 *   Excel шивэлтэд; онлайнаар бодлогын бүхэл дүн бүх багцад хэрэглэгдэнэ.
 */
export function effectiveGroups(
  problem: ExamItemSource['problem'],
  points: number,
): ScoringGroup[] | null {
  if (problem.format !== 'FILL_NUMBER') return null;
  const groups = parseScoringGroups(problem.scoringGroups);
  if (!groups) return null;
  const letters = new Set(slotLetters(problem.statementText));
  if (letters.size === 0) {
    if (groups.some((g) => g.boxes.length > 0)) return null;
  } else if (
    groups.some(
      (g) => g.boxes.length === 0 || g.boxes.some((b) => !letters.has(b)),
    )
  ) {
    return null;
  }
  if (groups.reduce((s, g) => s + g.points, 0) !== points) return null;
  const positive = groups.filter((g) => g.points > 0);
  return positive.length ? positive : null;
}

/** Тестийн бүх зүйл — хүснэгтийн багануудын дараалал (TestProblem.order-оор). */
export function buildExamItems(rows: ExamItemSource[]): ExamItem[] {
  const sorted = [...rows].sort((a, b) => a.order - b.order);
  const items: ExamItem[] = [];
  for (const row of sorted) {
    const part: 1 | 2 = row.problem.format === 'FILL_NUMBER' ? 2 : 1;
    const groups = effectiveGroups(row.problem, row.points);
    if (!groups) {
      items.push({
        key: itemKey(row.problemId),
        label: String(row.order),
        part,
        problemId: row.problemId,
        order: row.order,
        points: row.points,
        group: null,
      });
      continue;
    }
    for (const group of groups) {
      items.push({
        key: itemKey(row.problemId, group.label),
        label: group.label,
        part,
        problemId: row.problemId,
        order: row.order,
        points: group.points,
        group,
      });
    }
  }
  // Баганын нэр давхцвал (өөр эх сурвалжийн бодлогууд «1-1» гэх мэт) бодлогын
  // дугаараар ялгана — Excel-ийн багана хоёрдмол утгатай болохоос сэргийлнэ.
  const counts = new Map<string, number>();
  for (const item of items)
    counts.set(item.label, (counts.get(item.label) ?? 0) + 1);
  return items.map((item) =>
    (counts.get(item.label) ?? 0) > 1
      ? { ...item, label: `${item.order}:${item.label}` }
      : item,
  );
}

// ============ Онлайн хариунаас зүйл бүрийн төлөв ============

/**
 * Нөхөх хариуг нүд (үсэг) бүрээр задлана. Хөдөлгүүр нүднүүдийн цифрийг нэг
 * стринг болгон илгээдэг ("354"), импортлосон зарим түлхүүр объект
 * ({ a: '3', bc: '54' }). Задлах боломжгүй бол null.
 */
export function boxValues(
  value: unknown,
  statement: string | null | undefined,
  strictLength: boolean,
): Map<string, string> | null {
  const keys = slotGroups(statement);
  const letters = keys.flatMap((k) => k.split(''));
  if (letters.length === 0) return null;
  const out = new Map<string, string>();
  if (value === null || value === undefined) return out;
  if (typeof value === 'object' && !Array.isArray(value)) {
    const obj = value as Record<string, unknown>;
    for (const key of keys) {
      const whole = obj[key];
      if (key.length === 1) {
        if (whole !== undefined && whole !== null)
          out.set(key, String(whole).trim());
        continue;
      }
      if (whole !== undefined && whole !== null) {
        const text = String(whole).trim();
        if (text.length !== key.length) {
          if (strictLength) return null;
          continue;
        }
        key.split('').forEach((letter, i) => out.set(letter, text[i]));
        continue;
      }
      for (const letter of key.split('')) {
        const v = obj[letter];
        if (v !== undefined && v !== null) out.set(letter, String(v).trim());
      }
    }
    return out;
  }
  if (typeof value === 'string' || typeof value === 'number') {
    const text = String(value).trim();
    if (strictLength && text.length !== letters.length) return null;
    letters.forEach((letter, i) => {
      // FILL_EMPTY = сурагч энэ нүдийг хоосон орхисон (байрлал хадгалагдана)
      if (i < text.length && text[i] !== FILL_EMPTY) out.set(letter, text[i]);
    });
    return out;
  }
  return null;
}

export interface GradedProblem {
  /** Хариуны түлхүүр мэдэгдэж байгаа эсэх — мэдэгдэхгүй бол дүнд тооцохгүй */
  known: boolean;
  answered: boolean;
  /** Бодлого БҮХЭЛДЭЭ зөв (Attempt.autoCorrect, бодлогын статистикт) */
  correct: boolean;
  canonicalAnswer: unknown;
  statuses: Map<string, ItemStatus>;
}

/**
 * Онлайн хариу → зүйл бүрийн төлөв. Алхмын багцтай бодлогод: багцын бүх нүд
 * зөв → CORRECT, бүгд хоосон → BLANK, бусад → WRONG. Нүдээр задлах боломжгүй
 * бол (түлхүүрийн хэлбэр таарахгүй) бодлогын бүхэл дүнг багц бүрт хэрэглэнэ.
 */
export function gradeProblemItems(
  problem: GradableProblem & { statementText: string | null },
  items: ExamItem[],
  raw: unknown,
  choiceOrder?: number[],
): GradedProblem {
  const known = hasKnownAnswer(problem);
  const answered = raw !== undefined && raw !== null && answerToken(raw) !== '';
  const { correct, canonicalAnswer } = gradeAnswer(problem, raw, choiceOrder);
  const wholeStatus: ItemStatus = !answered
    ? 'BLANK'
    : correct
      ? 'CORRECT'
      : 'WRONG';
  const statuses = new Map<string, ItemStatus>();
  const grouped = items.filter((i) => i.group);
  if (grouped.length === 0) {
    for (const item of items) statuses.set(item.key, wholeStatus);
    return {
      known,
      answered,
      correct: answered && correct,
      canonicalAnswer,
      statuses,
    };
  }
  const expected = boxValues(
    problem.correctAnswer,
    problem.statementText,
    true,
  );
  const given = boxValues(raw, problem.statementText, false);
  for (const item of items) {
    const boxes = item.group?.boxes ?? [];
    if (!expected || !given || boxes.length === 0) {
      statuses.set(item.key, wholeStatus);
      continue;
    }
    const values = boxes.map((b) => given.get(b) ?? '');
    if (values.every((v) => isBlankAnswer(v))) {
      statuses.set(item.key, 'BLANK');
      continue;
    }
    const ok = boxes.every((b, i) => {
      const want = expected.get(b);
      return (
        !isBlankAnswer(want) &&
        !isBlankAnswer(values[i]) &&
        tokensMatch(want, values[i])
      );
    });
    statuses.set(item.key, ok ? 'CORRECT' : 'WRONG');
  }
  return {
    known,
    answered,
    correct: answered && correct,
    canonicalAnswer,
    statuses,
  };
}

// ============ Нийлбэр ============

export interface ItemTotals {
  total: number;
  max: number;
  part1: number;
  part1Max: number;
  part2: number;
  part2Max: number;
}

/** Зүйлсийн төлөвөөс оноо. Төлөвгүй зүйлийг (тооцохгүй) нийлбэрт оруулахгүй. */
export function totalsOf(
  items: ExamItem[],
  statuses: Map<string, ItemStatus> | Record<string, ItemStatus>,
): ItemTotals {
  const get = (key: string): ItemStatus | undefined =>
    statuses instanceof Map ? statuses.get(key) : statuses[key];
  const t: ItemTotals = {
    total: 0,
    max: 0,
    part1: 0,
    part1Max: 0,
    part2: 0,
    part2Max: 0,
  };
  for (const item of items) {
    const status = get(item.key);
    if (!status) continue;
    const earned = status === 'CORRECT' ? item.points : 0;
    t.max += item.points;
    t.total += earned;
    if (item.part === 1) {
      t.part1Max += item.points;
      t.part1 += earned;
    } else {
      t.part2Max += item.points;
      t.part2 += earned;
    }
  }
  return t;
}

/**
 * Гар шивэлт (эзний Excel-ийн дүрэм): хоосон = зөв, 0 = буруу. Зөвхөн буруу
 * зүйлсийн түлхүүрийг хүлээн авч бүх зүйлийн төлөвийг гаргана.
 */
export function manualStatuses(
  items: ExamItem[],
  wrong: Iterable<string>,
): Map<string, ItemStatus> {
  const wrongSet = new Set(wrong);
  return new Map(
    items.map((item) => [
      item.key,
      wrongSet.has(item.key) ? 'WRONG' : 'CORRECT',
    ]),
  );
}
