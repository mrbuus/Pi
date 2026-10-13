import katex from 'katex';
import { ProblemFormat, TagType } from '../generated/prisma/enums';
import { gradeAnswer, type GradableProblem } from '../tests/grading';

/**
 * «Дотоод» ноорогийн ЦЭВЭР логик (I/O-гүй, бүрэн тесттэй — draft-model.spec.ts).
 *
 * Нэг блок = нэг бодлого. Нийтлэх үед яг ямар Problem болохыг (formatOf,
 * problemInput) болон «Бодох» горимын шалгалтыг (checkBlock) ЭНД л
 * тодорхойлно — шалгалтын хөдөлгүүрийн `gradeAnswer`-ийг ашигладаг тул ажилтны
 * туршилт сурагчийн дүгнэлттэй ЯГ адил (STATUS §7.4).
 */

export const DRAFT_KINDS = ['CHOICE', 'NUMERIC'] as const;
export type DraftKind = (typeof DRAFT_KINDS)[number];
export const LETTERS = ['A', 'B', 'C', 'D', 'E'] as const;
export const MIN_CHOICES = 2;
export const MAX_CHOICES = 5;

export interface DraftBlockLike {
  id: string;
  kind: string;
  statement: string;
  choices: string[];
  answer: string | null;
  solution: string | null;
  imageKey: string | null;
  tag: string | null;
  points: number;
}

/**
 * Хориотой юникод математик тэмдэгт (эзний дүрэм §3.1) — LaTeX-ээр бичнэ.
 * Кирилл/латин үсэг, энгийн цэг таслал хамаарахгүй.
 */
const UNICODE_MATH =
  /[π²³¹⁰⁴⁵⁶⁷⁸⁹ⁿ√∛·⋅×÷≤≥≠±∓∞½⅓⅔¼¾∠°αβγδθλμσφωΔΣ∑∫→⇒⇔∈∉⊂⊆∪∩∅≈≡′″−₀₁₂₃₄₅₆₇₈₉]/gu;

export function unicodeMathGlyphs(text: string | null | undefined): string[] {
  return [...new Set(String(text ?? '').match(UNICODE_MATH) ?? [])];
}

/** MathText-тэй ижил: эхлээд $$…$$ (display), дараа нь $…$ (inline). */
const MATH_RE = /\$\$([\s\S]+?)\$\$|\$([^$]+?)\$/g;

/** Томьёоны эхний алдаа (KaTeX parse) эсвэл хосгүй $ — алдаагүй бол null. */
export function latexError(text: string | null | undefined): string | null {
  const source = String(text ?? '');
  for (const m of source.matchAll(MATH_RE)) {
    const tex = m[1] ?? m[2];
    try {
      katex.renderToString(tex, {
        throwOnError: true,
        displayMode: m[1] !== undefined,
        strict: 'ignore',
        trust: false,
        maxSize: 20,
        maxExpand: 1000,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return message.replace(/^KaTeX parse error:\s*/, '').slice(0, 160);
    }
  }
  const rest = source.replace(MATH_RE, '');
  if (rest.includes('$')) return '$ тэмдэгт хосгүй байна';
  return null;
}

/** Тоон хариуг канон хэлбэрт: «4,5» → «4.5», «$12$» → «12», «x = 3» → «3». */
export function normalizeNumeric(raw: string | null | undefined): string | null {
  if (raw === null || raw === undefined) return null;
  let value = String(raw).replace(/\$/g, '').trim();
  if (value.includes('=')) value = value.slice(value.lastIndexOf('=') + 1);
  value = value.replace(/\s+/g, '').replace(/^(-?\d+),(\d+)$/, '$1.$2');
  return /^[-+]?\d+(\.\d+)?$/.test(value) ? value.replace(/^\+/, '') : null;
}

export interface BlockIssue {
  code:
    | 'EMPTY_STATEMENT'
    | 'FEW_CHOICES'
    | 'EMPTY_CHOICES'
    | 'MIXED_CHOICES'
    | 'NO_ANSWER'
    | 'BAD_ANSWER'
    | 'UNICODE'
    | 'LATEX'
    | 'PLACEHOLDER'
    | 'KIND';
  message: string;
}

const IMAGE_PLACEHOLDER = /\[\s*Зураг[^\]]*\]/i;
const FORMULA_PLACEHOLDER = '[Томьёог гараар шалгана уу]';

function filledChoices(b: DraftBlockLike) {
  return b.choices.filter((c) => c.trim() !== '').length;
}

/** Нийтлэхэд саад болох бүх зүйл — хоосон бол бэлэн. */
export function blockIssues(b: DraftBlockLike): BlockIssue[] {
  const issues: BlockIssue[] = [];
  if (!(DRAFT_KINDS as readonly string[]).includes(b.kind))
    issues.push({ code: 'KIND', message: 'Бодлогын төрөл тодорхойгүй' });
  if (!b.statement.trim() && !b.imageKey)
    issues.push({
      code: 'EMPTY_STATEMENT',
      message: 'Бодлогын өгүүлбэр хоосон',
    });
  if (b.kind === 'CHOICE') {
    const n = b.choices.length;
    const filled = filledChoices(b);
    if (n < MIN_CHOICES || n > MAX_CHOICES)
      issues.push({
        code: 'FEW_CHOICES',
        message: '2–5 сонголттой байна',
      });
    else if (filled === 0 && !b.imageKey)
      issues.push({
        code: 'EMPTY_CHOICES',
        message: 'Сонголтуудыг бичих эсвэл зураг хавсаргана',
      });
    else if (filled > 0 && filled < n)
      issues.push({
        code: 'MIXED_CHOICES',
        message: 'Хоосон сонголтыг бөглөх эсвэл хасна',
      });
    if (!b.answer) issues.push({ code: 'NO_ANSWER', message: 'Зөв хариуг сонгоно' });
    else {
      const index = LETTERS.indexOf(b.answer as (typeof LETTERS)[number]);
      if (index < 0 || index >= n)
        issues.push({ code: 'BAD_ANSWER', message: 'Зөв хариу сонголтуудад алга' });
    }
  } else if (b.kind === 'NUMERIC') {
    if (!b.answer?.trim())
      issues.push({ code: 'NO_ANSWER', message: 'Тоон хариуг бичнэ' });
    else if (normalizeNumeric(b.answer) === null)
      issues.push({ code: 'BAD_ANSWER', message: 'Хариу зөвхөн тоо байна' });
  }
  const texts = [
    b.statement,
    ...(b.kind === 'CHOICE' ? b.choices : []),
    b.solution ?? '',
  ];
  const glyphs = [...new Set(texts.flatMap(unicodeMathGlyphs))];
  if (glyphs.length)
    issues.push({
      code: 'UNICODE',
      message: `Юникод тэмдэгтийг LaTeX болгоно: ${glyphs.join(' ')}`,
    });
  for (const text of texts) {
    const error = latexError(text);
    if (error) {
      issues.push({ code: 'LATEX', message: `Томьёо алдаатай: ${error}` });
      break;
    }
  }
  if (texts.some((t) => IMAGE_PLACEHOLDER.test(t)))
    issues.push({
      code: 'PLACEHOLDER',
      message: b.imageKey
        ? '[Зураг] бичвэрийг устгана'
        : 'Зураг хавсаргаж, [Зураг] бичвэрийг устгана',
    });
  if (texts.some((t) => t.includes(FORMULA_PLACEHOLDER)))
    issues.push({ code: 'PLACEHOLDER', message: 'Word-оос ирсэн томьёог засна' });
  return issues;
}

/** Нийтлэх үед Problem.format */
export function formatOf(b: DraftBlockLike): ProblemFormat {
  return b.kind === 'NUMERIC' ? ProblemFormat.FILL_NUMBER : ProblemFormat.CHOICE;
}

/**
 * Шалгалтын хөдөлгүүрийн хэлбэр. Сонголтын текстгүй (зурагт байгаа) бол
 * LETTER горим: placeholder ["A".."E"] + үсгэн түлхүүр — байрлал хөдлөхгүй.
 */
export function toGradable(b: DraftBlockLike): GradableProblem {
  if (b.kind === 'NUMERIC')
    return {
      id: b.id,
      format: ProblemFormat.FILL_NUMBER,
      choices: null,
      correctAnswer: normalizeNumeric(b.answer) ?? b.answer ?? null,
      statementText: b.statement,
    };
  if (filledChoices(b) === 0)
    return {
      id: b.id,
      format: ProblemFormat.CHOICE,
      choices: LETTERS.slice(0, b.choices.length),
      correctAnswer: b.answer,
      choiceOptions: [],
    };
  return {
    id: b.id,
    format: ProblemFormat.CHOICE,
    choices: null,
    correctAnswer: null,
    choiceOptions: b.choices.map((text, i) => ({
      order: i + 1,
      text,
      isCorrect: LETTERS[i] === b.answer,
    })),
  };
}

export interface CheckResult {
  blockId: string;
  given: string | null;
  /** null — түлхүүр дутуу тул дүгнэхгүй */
  correct: boolean | null;
  key: string | null;
}

/**
 * «Бодох» горим: ажилтны хариуг түлхүүртэй тулгана. given нь CHOICE-д үсэг
 * ("B"), NUMERIC-т утга. Сурагчийн дүгнэлттэй ижил `gradeAnswer`.
 */
export function checkBlock(b: DraftBlockLike, given: unknown): CheckResult {
  const raw = typeof given === 'string' ? given.trim() : '';
  const keyed = !blockIssues(b).some(
    (i) =>
      i.code === 'NO_ANSWER' || i.code === 'BAD_ANSWER' || i.code === 'KIND',
  );
  const key =
    b.kind === 'NUMERIC' ? (normalizeNumeric(b.answer) ?? b.answer) : b.answer;
  if (!keyed) return { blockId: b.id, given: raw || null, correct: null, key };
  if (!raw) return { blockId: b.id, given: null, correct: false, key };
  const problem = toGradable(b);
  let answer: unknown = raw;
  if (b.kind === 'CHOICE' && (problem.choiceOptions?.length ?? 0) > 0)
    answer = LETTERS.indexOf(raw.toUpperCase() as (typeof LETTERS)[number]);
  else if (b.kind === 'CHOICE') answer = raw.toUpperCase();
  return {
    blockId: b.id,
    given: raw,
    correct: gradeAnswer(problem, answer).correct,
    key,
  };
}

/** Нийтлэх үеийн Problem.token — давтан нийтэлбэл publishNo өснө. */
export function problemToken(setId: string, publishNo: number, index: number) {
  return `ND-${setId.slice(-6).toUpperCase()}-${publishNo}-${String(index + 1).padStart(2, '0')}`;
}

/** ContentService.createProblem-ийн оролт (CreateProblemDto-той ижил хэлбэр). */
export function problemInput(
  b: DraftBlockLike,
  chapterId: string,
  token: string,
) {
  const base = {
    chapterId,
    token,
    format: formatOf(b),
    statementText: b.statement.trim(),
    imageKey: b.imageKey ?? undefined,
    points: Math.max(1, b.points || 1),
    tags: b.tag?.trim()
      ? [{ type: TagType.SUBTOPIC, name: b.tag.trim() }]
      : undefined,
  };
  if (b.kind === 'NUMERIC')
    return { ...base, correctAnswer: normalizeNumeric(b.answer) ?? b.answer };
  if (filledChoices(b) === 0)
    return {
      ...base,
      choices: LETTERS.slice(0, b.choices.length),
      correctAnswer: b.answer,
    };
  return {
    ...base,
    choiceOptions: b.choices.map((text, i) => ({
      text: text.trim(),
      isCorrect: LETTERS[i] === b.answer,
    })),
  };
}

const FIELD_LABEL: Record<string, string> = {
  kind: 'төрөл',
  statement: 'өгүүлбэр',
  choices: 'сонголт',
  answer: 'хариу',
  solution: 'бодолт',
  imageKey: 'зураг',
  tag: 'сэдэв',
  points: 'оноо',
};

/** Өөрчлөгдсөн талбарууд (түүхийн товч бичвэрт). */
export function changedFields(
  before: Partial<DraftBlockLike>,
  after: Partial<DraftBlockLike>,
): string[] {
  return Object.keys(FIELD_LABEL).filter((field) => {
    if (!(field in after)) return false;
    const a = before[field as keyof DraftBlockLike];
    const b = after[field as keyof DraftBlockLike];
    return JSON.stringify(a ?? null) !== JSON.stringify(b ?? null);
  });
}

/** «3-р бодлогын өгүүлбэр, хариуг зассан» */
export function editSummary(n: number, fields: string[]): string {
  const names = [...new Set(fields)]
    .map((f) => FIELD_LABEL[f])
    .filter(Boolean);
  if (!names.length) return `${n}-р бодлогыг зассан`;
  return `${n}-р бодлогын ${names.join(', ')} зассан`.slice(0, 300);
}

/** editSummary-ийн эсрэг: «… өгүүлбэр, хариу зассан» → ['statement', 'answer'] */
export function fieldsFromSummary(summary: string): string[] {
  const m = /бодлогын (.+) зассан$/.exec(summary);
  if (!m) return [];
  const names = m[1].split(', ');
  return Object.entries(FIELD_LABEL)
    .filter(([, label]) => names.includes(label))
    .map(([field]) => field);
}

/** «О. Баасанжав» — овгийн эхний үсэг + нэр. */
export function shortPersonName(firstName: string, lastName: string): string {
  const last = lastName.trim();
  const initial = last ? (last.endsWith('.') ? last : `${last[0]}.`) : '';
  return [initial, firstName.trim()].filter(Boolean).join(' ') || 'Ажилтан';
}
