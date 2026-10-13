/**
 * Буцаах ба өөрчлөлтийн түүх — ЦЭВЭР логик (ӨС-гүй, бүрэн тесттэй).
 * docs/v2/BUTSAAH-TUUKH-TOLOVLOGOO.md
 *
 * Snapshot = сэргээж болох БҮРЭН төлөв (ContentRevision.snapshot). Энд:
 *   - ӨС-ийн мөрийг snapshot болгох (эрэмбэ тогтвортой — харьцуулалт найдвартай)
 *   - хоёр snapshot ижил эсэх
 *   - монгол товч тайлбар («B сонголтыг зөв болгосон»)
 *   - түүхийн цонхонд харуулах ялгаа (ID-гүй)
 *   - сэргээх төлөвлөгөө (түгжээ, эрх)
 */

export type RevisionEntityName = 'PROBLEM' | 'TEST';
export type RevisionActionName = 'CREATE' | 'UPDATE' | 'RESTORE' | 'IMPORT';

// ======================= Төрлүүд =======================

export interface ProblemChoiceSnapshot {
  label: string;
  text: string;
  isCorrect: boolean;
  mistakeType: string;
  mistakeNote: string | null;
  /** Сонголтын зураг (StoredFile key) — хуучин snapshot-д байхгүй (= null) */
  imageKey?: string | null;
  order: number;
}

export interface ProblemTagSnapshot {
  id: string;
  type: string;
  name: string;
}

export interface ProblemSnapshot {
  statementText: string | null;
  imageKey: string | null;
  format: string;
  points: number;
  /** Хуучин загварын сонголт (A–E placeholder гэх мэт JSON) */
  choices: unknown;
  correctAnswer: unknown;
  choiceOptions: ProblemChoiceSnapshot[];
  scoringGroups: unknown;
  youtubeUrl: string | null;
  tags: ProblemTagSnapshot[];
  analysis: { solutionOutline: string | null; answerKeyStatus: string } | null;
}

export interface TestProblemSnapshot {
  problemId: string;
  order: number;
  points: number;
}

export interface TestSnapshot {
  title: string;
  type: string;
  gradingMode: string;
  timeLimitMin: number | null;
  price: number | null;
  chapterId: string | null;
  pdfKey: string | null;
  groupKey: string | null;
  variantLabel: string | null;
  problems: TestProblemSnapshot[];
  classroomIds: string[];
}

export type AnySnapshot = ProblemSnapshot | TestSnapshot;

/** ӨС-ээс уншсан бодлогын мөр (revision-store.ts PROBLEM_SNAPSHOT_SELECT). */
export interface ProblemSnapshotRow {
  statementText: string | null;
  imageKey: string | null;
  format: string;
  points: number;
  choices: unknown;
  correctAnswer: unknown;
  scoringGroups?: unknown;
  youtubeUrl?: string | null;
  choiceOptions?: {
    label: string;
    text: string;
    isCorrect: boolean;
    mistakeType?: string | null;
    mistakeNote?: string | null;
    imageKey?: string | null;
    order: number;
  }[];
  tags?: { tag: { id: string; type: string; name: string } }[];
  analysis?: { solutionOutline: string | null; answerKeyStatus: string } | null;
}

export interface TestSnapshotRow {
  title: string;
  type: string;
  gradingMode: string;
  timeLimitMin: number | null;
  price?: number | null;
  chapterId?: string | null;
  pdfKey?: string | null;
  groupKey?: string | null;
  variantLabel?: string | null;
  problems?: { problemId: string; order: number; points: number }[];
  access?: { classroomId: string }[];
}

// ======================= JSON туслахууд =======================

/** Түлхүүрийг эрэмбэлсэн JSON — jsonb түлхүүрийн дарааллаас үл хамаарах харьцуулалт. */
export function stableStringify(value: unknown): string {
  return JSON.stringify(canonical(value));
}

function canonical(value: unknown): unknown {
  if (value === undefined) return null;
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    return Object.fromEntries(
      Object.keys(obj)
        .sort()
        .map((k) => [k, canonical(obj[k])]),
    );
  }
  return value;
}

/** JSON утгыг гүн хуулна (Prisma Json-д шууд бичихэд аюулгүй). */
function cloneJson(value: unknown): unknown {
  if (value === undefined || value === null) return null;
  return JSON.parse(JSON.stringify(value)) as unknown;
}

export function sameJson(a: unknown, b: unknown): boolean {
  return stableStringify(a) === stableStringify(b);
}

// ======================= Мөр → snapshot =======================

export function problemSnapshotOf(row: ProblemSnapshotRow): ProblemSnapshot {
  const choiceOptions = [...(row.choiceOptions ?? [])]
    .sort((a, b) => a.order - b.order || a.label.localeCompare(b.label))
    .map((c) => ({
      label: c.label,
      text: c.text,
      isCorrect: !!c.isCorrect,
      mistakeType: c.mistakeType ?? 'NONE',
      mistakeNote: c.mistakeNote ?? null,
      imageKey: c.imageKey ?? null,
      order: c.order,
    }));
  const tags = (row.tags ?? [])
    .map((t) => ({ id: t.tag.id, type: t.tag.type, name: t.tag.name }))
    .sort(
      (a, b) =>
        a.type.localeCompare(b.type) ||
        a.name.localeCompare(b.name) ||
        a.id.localeCompare(b.id),
    );
  return {
    statementText: row.statementText ?? null,
    imageKey: row.imageKey ?? null,
    format: row.format,
    points: row.points,
    choices: cloneJson(row.choices),
    correctAnswer: cloneJson(row.correctAnswer),
    choiceOptions,
    scoringGroups: cloneJson(row.scoringGroups),
    youtubeUrl: row.youtubeUrl ?? null,
    tags,
    analysis: row.analysis
      ? {
          solutionOutline: row.analysis.solutionOutline ?? null,
          answerKeyStatus: row.analysis.answerKeyStatus,
        }
      : null,
  };
}

export function testSnapshotOf(row: TestSnapshotRow): TestSnapshot {
  return {
    title: row.title,
    type: row.type,
    gradingMode: row.gradingMode,
    timeLimitMin: row.timeLimitMin ?? null,
    price: row.price ?? null,
    chapterId: row.chapterId ?? null,
    pdfKey: row.pdfKey ?? null,
    groupKey: row.groupKey ?? null,
    variantLabel: row.variantLabel ?? null,
    problems: [...(row.problems ?? [])]
      .map((p) => ({ problemId: p.problemId, order: p.order, points: p.points }))
      .sort((a, b) => a.order - b.order || a.problemId.localeCompare(b.problemId)),
    classroomIds: [...new Set((row.access ?? []).map((a) => a.classroomId))].sort(),
  };
}

/** ContentRevision.snapshot (jsonb) → төрөлтэй snapshot. Дутуу талбарыг нөхнө. */
export function parseProblemSnapshot(value: unknown): ProblemSnapshot {
  const v = asRecord(value);
  return problemSnapshotOf({
    statementText: asStringOrNull(v.statementText),
    imageKey: asStringOrNull(v.imageKey),
    format: typeof v.format === 'string' ? v.format : 'CHOICE',
    points: typeof v.points === 'number' ? v.points : 1,
    choices: v.choices ?? null,
    correctAnswer: v.correctAnswer ?? null,
    scoringGroups: v.scoringGroups ?? null,
    youtubeUrl: asStringOrNull(v.youtubeUrl),
    choiceOptions: (Array.isArray(v.choiceOptions) ? v.choiceOptions : []).map(
      (raw: unknown, i: number) => {
        const c = asRecord(raw);
        return {
          label: typeof c.label === 'string' ? c.label : String.fromCharCode(65 + i),
          text: typeof c.text === 'string' ? c.text : '',
          isCorrect: c.isCorrect === true,
          mistakeType: typeof c.mistakeType === 'string' ? c.mistakeType : 'NONE',
          mistakeNote: asStringOrNull(c.mistakeNote),
          imageKey: asStringOrNull(c.imageKey),
          order: typeof c.order === 'number' ? c.order : i + 1,
        };
      },
    ),
    tags: (Array.isArray(v.tags) ? v.tags : [])
      .map((raw: unknown) => asRecord(raw))
      .filter((t) => typeof t.name === 'string' && typeof t.type === 'string')
      .map((t) => ({
        tag: {
          id: typeof t.id === 'string' ? t.id : '',
          type: t.type as string,
          name: t.name as string,
        },
      })),
    analysis:
      v.analysis && typeof v.analysis === 'object'
        ? {
            solutionOutline: asStringOrNull(asRecord(v.analysis).solutionOutline),
            answerKeyStatus:
              typeof asRecord(v.analysis).answerKeyStatus === 'string'
                ? (asRecord(v.analysis).answerKeyStatus as string)
                : 'VERIFIED',
          }
        : null,
  });
}

export function parseTestSnapshot(value: unknown): TestSnapshot {
  const v = asRecord(value);
  return testSnapshotOf({
    title: typeof v.title === 'string' ? v.title : '',
    type: typeof v.type === 'string' ? v.type : 'CUSTOM',
    gradingMode: typeof v.gradingMode === 'string' ? v.gradingMode : 'AUTO',
    timeLimitMin: typeof v.timeLimitMin === 'number' ? v.timeLimitMin : null,
    price: typeof v.price === 'number' ? v.price : null,
    chapterId: asStringOrNull(v.chapterId),
    pdfKey: asStringOrNull(v.pdfKey),
    groupKey: asStringOrNull(v.groupKey),
    variantLabel: asStringOrNull(v.variantLabel),
    problems: (Array.isArray(v.problems) ? v.problems : [])
      .map((raw: unknown) => asRecord(raw))
      .filter((p) => typeof p.problemId === 'string')
      .map((p, i) => ({
        problemId: p.problemId as string,
        order: typeof p.order === 'number' ? p.order : i + 1,
        points: typeof p.points === 'number' ? p.points : 1,
      })),
    access: (Array.isArray(v.classroomIds) ? v.classroomIds : [])
      .filter((id: unknown): id is string => typeof id === 'string')
      .map((classroomId: string) => ({ classroomId })),
  });
}

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === 'object' && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : {};
}

function asStringOrNull(v: unknown): string | null {
  return typeof v === 'string' ? v : null;
}

// ======================= Харьцуулалт =======================

export function snapshotsEqual(a: AnySnapshot | null, b: AnySnapshot | null): boolean {
  return stableStringify(a) === stableStringify(b);
}

/** Хариуны түлхүүр (дүгнэлтэд нөлөөлөх хэсэг) — сурагч өгсөн тестэд анхааруулна. */
export function answerKeyOf(s: ProblemSnapshot): string {
  return stableStringify({
    format: s.format,
    correctAnswer: s.correctAnswer,
    choices: s.choices,
    options: s.choiceOptions.map((c) => ({ text: c.text, isCorrect: c.isCorrect, order: c.order })),
  });
}

/** Багш (TEACHER) зөвхөн сонголт (ангиллын цонх) ба ангилал засна. */
export type ProblemFieldGroup =
  | 'content'
  | 'choices'
  | 'tags'
  | 'scoringGroups'
  | 'youtubeUrl'
  | 'analysis';

export function changedProblemGroups(a: ProblemSnapshot, b: ProblemSnapshot): ProblemFieldGroup[] {
  const out: ProblemFieldGroup[] = [];
  if (
    a.statementText !== b.statementText ||
    a.imageKey !== b.imageKey ||
    a.format !== b.format ||
    a.points !== b.points ||
    !sameJson(a.choices, b.choices) ||
    !sameJson(a.correctAnswer, b.correctAnswer)
  )
    out.push('content');
  if (!sameJson(a.choiceOptions, b.choiceOptions)) out.push('choices');
  if (!sameJson(a.tags.map(tagKey), b.tags.map(tagKey))) out.push('tags');
  if (!sameJson(a.scoringGroups, b.scoringGroups)) out.push('scoringGroups');
  if (a.youtubeUrl !== b.youtubeUrl) out.push('youtubeUrl');
  if (!sameJson(a.analysis, b.analysis)) out.push('analysis');
  return out;
}

function tagKey(t: ProblemTagSnapshot): string {
  return `${t.type}:${t.name}`;
}

// ======================= Монгол нэршил =======================

export const FORMAT_LABEL: Record<string, string> = {
  CHOICE: 'Сонгох',
  FILL_NUMBER: 'Тоо нөхөх',
  OPEN: 'Задгай',
};

export const MISTAKE_LABEL: Record<string, string> = {
  INCOMPLETE_STEP: 'Үйлдэл дутуу',
  CALC_ERROR_NEAR: 'Ойролцоо хариу',
  SIGN_ERROR: 'Тэмдэг (+/-)',
  CONCEPT_GAP: 'Ухагдахуун',
  UNRELATED_GUESS: 'Буудсан',
  OTHER: 'Бусад',
};

export const ANSWER_STATUS_LABEL: Record<string, string> = {
  VERIFIED: 'Баталгаажсан',
  MISSING: 'Хариу дутуу',
  REVIEW_REQUIRED: 'Шалгах шаардлагатай',
};

export const TEST_TYPE_LABEL: Record<string, string> = {
  DAILY: 'Өдрийн тест',
  CHAPTER_EXAM: 'Сэдвийн шалгалт',
  EESH_MOCK: 'ЭЕШ сорил',
  CUSTOM: 'Бусад',
  THEORY: 'Онолын тест',
  THOUSAND: '1000 бодлого',
};

export const GRADING_LABEL: Record<string, string> = {
  AUTO: 'Авто дүн',
  MANUAL: 'Багшийн дүн',
};

/** «Б. Баасанжав» — овгийн эхний үсэг + нэр. */
export function shortName(user: { firstName?: string | null; lastName?: string | null } | null | undefined): string {
  if (!user) return 'Тодорхойгүй хэрэглэгч';
  const first = (user.firstName ?? '').trim();
  const last = (user.lastName ?? '').trim();
  if (!first && !last) return 'Тодорхойгүй хэрэглэгч';
  if (!last) return first;
  if (!first) return last;
  return `${last.charAt(0).toUpperCase()}. ${first}`;
}

/** Хариуг хүн уншихуйц мөр болгоно (JSON объект → «a = 1, b = 2»). */
export function answerText(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return value.map((v) => answerText(v) ?? '').join(', ');
  if (typeof value === 'object') {
    const rec = value as Record<string, unknown>;
    if (rec.manualReview === true) return 'Гараар шалгана';
    return Object.keys(rec)
      .sort()
      .map((k) => `${k} = ${answerText(rec[k]) ?? ''}`)
      .join(', ');
  }
  return String(value);
}

export function scoringGroupsText(value: unknown): string | null {
  if (!Array.isArray(value) || value.length === 0) return null;
  return value
    .map((raw) => {
      const g = asRecord(raw);
      const boxes = Array.isArray(g.boxes) ? g.boxes.join(', ') : '';
      const label = typeof g.label === 'string' ? g.label : '';
      const points = typeof g.points === 'number' ? g.points : 0;
      return `${label}${boxes ? `: ${boxes}` : ''} (${points} оноо)`;
    })
    .join('; ');
}

// ======================= Товч тайлбар =======================

const CYRILLIC_UPPER = /^[А-ЯЁӨҮ]/;

/** Хэсгүүдийг нэг өгүүлбэр болгоно: 3-аас олон бол «… бусад N өөрчлөлт». */
export function joinSummary(parts: string[], fallback = 'Өөрчилсөн'): string {
  const unique = [...new Set(parts.filter(Boolean))];
  if (unique.length === 0) return fallback;
  const shown = unique.length > 3 ? unique.slice(0, 2) : unique;
  const tail = unique.length > 3 ? [`бусад ${unique.length - 2} өөрчлөлт`] : [];
  return [...shown, ...tail]
    .map((p, i) =>
      i > 0 && CYRILLIC_UPPER.test(p) && !/^[А-ЯЁӨҮ]\./.test(p)
        ? p.charAt(0).toLowerCase() + p.slice(1)
        : p,
    )
    .join(', ');
}

function plural(n: number, one: string, many: (n: number) => string): string {
  return n === 1 ? one : many(n);
}

export interface ChoicePairing {
  pairs: [ProblemChoiceSnapshot, ProblemChoiceSnapshot][];
  added: ProblemChoiceSnapshot[];
  removed: ProblemChoiceSnapshot[];
}

/**
 * Хоёр хувилбарын сонголтыг тулгана. «Агуулга засах» цонх сонголтыг байрлалаар
 * дахин шошголдог (B-г хасвал C → B) тул зөвхөн шошгоор тулгавал «B-ийн текст
 * өөрчлөгдсөн» гэж буруу тайлбарлана. Дараалал: шошго+текст → текст → шошго.
 */
export function pairChoices(a: ProblemChoiceSnapshot[], b: ProblemChoiceSnapshot[]): ChoicePairing {
  const left = [...a];
  const right = [...b];
  const pairs: [ProblemChoiceSnapshot, ProblemChoiceSnapshot][] = [];
  const take = (match: (x: ProblemChoiceSnapshot, y: ProblemChoiceSnapshot) => boolean) => {
    for (let i = 0; i < right.length; ) {
      const j = left.findIndex((x) => match(x, right[i]));
      if (j >= 0) {
        pairs.push([left[j], right[i]]);
        left.splice(j, 1);
        right.splice(i, 1);
      } else i += 1;
    }
  };
  take((x, y) => x.label === y.label && x.text === y.text);
  take((x, y) => x.text === y.text);
  take((x, y) => x.label === y.label);
  return { pairs, added: right, removed: left };
}

export function summarizeProblemChange(a: ProblemSnapshot | null, b: ProblemSnapshot): string {
  if (!a) return 'Бодлого нэмсэн';
  const parts: string[] = [];

  if (a.statementText !== b.statementText) parts.push('Бодлогын текст засварласан');
  if (a.format !== b.format)
    parts.push(`Хэлбэрийг «${FORMAT_LABEL[b.format] ?? b.format}» болгосон`);

  // ---- Сонголт ----
  const { pairs, added, removed } = pairChoices(a.choiceOptions, b.choiceOptions);
  const correctAfter = b.choiceOptions.filter((c) => c.isCorrect);
  const correctChanged =
    pairs.some(([x, y]) => x.isCorrect !== y.isCorrect) ||
    added.some((c) => c.isCorrect) ||
    removed.some((c) => c.isCorrect);
  const textChanged = pairs
    .filter(([x, y]) => x.text !== y.text || (x.imageKey ?? null) !== (y.imageKey ?? null))
    .map(([, y]) => y);
  const mistakeChanged = pairs
    .filter(
      ([x, y]) =>
        !x.isCorrect &&
        !y.isCorrect &&
        (x.mistakeType !== y.mistakeType || (x.mistakeNote ?? '') !== (y.mistakeNote ?? '')),
    )
    .map(([, y]) => y);
  const relabeled = pairs.some(([x, y]) => x.label !== y.label);

  if (correctChanged) {
    if (correctAfter.length === 1) parts.push(`${correctAfter[0].label} сонголтыг зөв болгосон`);
    else if (correctAfter.length === 0) parts.push('Зөв хариуг арилгасан');
    else parts.push('Зөв хариуг өөрчилсөн');
  }
  if (added.length)
    parts.push(plural(added.length, `${added[0].label} сонголт нэмсэн`, (n) => `${n} сонголт нэмсэн`));
  if (removed.length)
    parts.push(plural(removed.length, `${removed[0].label} сонголтыг хассан`, (n) => `${n} сонголт хассан`));
  if (textChanged.length)
    parts.push(
      plural(
        textChanged.length,
        `${textChanged[0].label} сонголтын текстийг засварласан`,
        () => 'Сонголтуудын текстийг засварласан',
      ),
    );
  if (mistakeChanged.length)
    parts.push(
      plural(
        mistakeChanged.length,
        `${mistakeChanged[0].label} сонголтын алдааны шалтгааныг өөрчилсөн`,
        () => 'Алдааны шалтгаануудыг өөрчилсөн',
      ),
    );
  if (relabeled && !added.length && !removed.length) parts.push('Сонголтын шошгыг өөрчилсөн');
  const choicesExplained =
    correctChanged || added.length > 0 || removed.length > 0 || textChanged.length > 0 ||
    mistakeChanged.length > 0 || relabeled;
  if (!choicesExplained && !sameJson(a.choiceOptions, b.choiceOptions))
    parts.push('Сонголтын дарааллыг өөрчилсөн');

  // ---- Хуучин загварын хариу/сонголт ----
  // Шинэ загварт correctAnswer = зөв сонголтын текст (хүн уншихад) — сонголтоор тайлбарлагдсан
  if (!sameJson(a.correctAnswer, b.correctAnswer) && !(choicesExplained && b.choiceOptions.length > 0))
    parts.push('Зөв хариуг өөрчилсөн');
  if (!sameJson(a.choices, b.choices) && !choicesExplained) parts.push('Сонголтыг өөрчилсөн');

  if (a.points !== b.points) parts.push(`Оноог ${b.points} болгосон`);
  if (a.imageKey !== b.imageKey)
    parts.push(!a.imageKey ? 'Зураг нэмсэн' : !b.imageKey ? 'Зураг хассан' : 'Зураг сольсон');

  // ---- Ангилал ----
  const tagsBefore = new Set(a.tags.map(tagKey));
  const tagsAfter = new Set(b.tags.map(tagKey));
  const tagAdded = b.tags.filter((t) => !tagsBefore.has(tagKey(t)));
  const tagRemoved = a.tags.filter((t) => !tagsAfter.has(tagKey(t)));
  if (tagAdded.length === 1 && tagRemoved.length === 0)
    parts.push(`«${tagAdded[0].name}» ангилал нэмсэн`);
  else if (tagRemoved.length === 1 && tagAdded.length === 0)
    parts.push(`«${tagRemoved[0].name}» ангиллыг хассан`);
  else if (tagAdded.length || tagRemoved.length) parts.push('Ангиллыг өөрчилсөн');

  if (!sameJson(a.scoringGroups, b.scoringGroups)) {
    const had = Array.isArray(a.scoringGroups) && a.scoringGroups.length > 0;
    const has = Array.isArray(b.scoringGroups) && b.scoringGroups.length > 0;
    parts.push(!had ? 'Алхмын багц тохируулсан' : !has ? 'Алхмын багцыг цуцалсан' : 'Алхмын багцыг өөрчилсөн');
  }
  if (a.youtubeUrl !== b.youtubeUrl)
    parts.push(
      !a.youtubeUrl
        ? 'YouTube холбоос нэмсэн'
        : !b.youtubeUrl
          ? 'YouTube холбоосыг хассан'
          : 'YouTube холбоосыг сольсон',
    );
  if ((a.analysis?.solutionOutline ?? null) !== (b.analysis?.solutionOutline ?? null))
    parts.push('Бодолтыг засварласан');
  if ((a.analysis?.answerKeyStatus ?? null) !== (b.analysis?.answerKeyStatus ?? null))
    parts.push('Хариуны төлөвийг өөрчилсөн');

  return joinSummary(parts);
}

export function summarizeTestChange(
  a: TestSnapshot | null,
  b: TestSnapshot,
  classNames: ReadonlyMap<string, string> = new Map(),
): string {
  if (!a) return 'Тест үүсгэсэн';
  const parts: string[] = [];
  if (a.title !== b.title) parts.push('Нэрийг өөрчилсөн');
  if (a.type !== b.type) parts.push('Төрлийг өөрчилсөн');
  if (a.gradingMode !== b.gradingMode)
    parts.push(`Дүгнэх горимыг «${GRADING_LABEL[b.gradingMode] ?? b.gradingMode}» болгосон`);
  if (a.timeLimitMin !== b.timeLimitMin)
    parts.push(b.timeLimitMin === null ? 'Хугацааг хассан' : `Хугацааг ${b.timeLimitMin} минут болгосон`);
  if (a.price !== b.price) parts.push('Үнийг өөрчилсөн');
  if (a.chapterId !== b.chapterId) parts.push('Бүлэг сэдвийг өөрчилсөн');
  if (a.groupKey !== b.groupKey || a.variantLabel !== b.variantLabel) parts.push('Хувилбарыг өөрчилсөн');
  if (a.pdfKey !== b.pdfKey) parts.push('PDF файлыг өөрчилсөн');

  const beforeIds = new Map(a.problems.map((p) => [p.problemId, p]));
  const afterIds = new Map(b.problems.map((p) => [p.problemId, p]));
  const pAdded = b.problems.filter((p) => !beforeIds.has(p.problemId)).length;
  const pRemoved = a.problems.filter((p) => !afterIds.has(p.problemId)).length;
  if (pAdded) parts.push(`${pAdded} бодлого нэмсэн`);
  if (pRemoved) parts.push(`${pRemoved} бодлого хассан`);
  const kept = b.problems.filter((p) => beforeIds.has(p.problemId));
  const keptBeforeOrder = a.problems.filter((p) => afterIds.has(p.problemId)).map((p) => p.problemId);
  if (!sameJson(kept.map((p) => p.problemId), keptBeforeOrder)) parts.push('Бодлогын дарааллыг өөрчилсөн');
  if (kept.some((p) => beforeIds.get(p.problemId)!.points !== p.points)) parts.push('Бодлогын оноог өөрчилсөн');

  const cBefore = new Set(a.classroomIds);
  const cAfter = new Set(b.classroomIds);
  const cAdded = b.classroomIds.filter((id) => !cBefore.has(id));
  const cRemoved = a.classroomIds.filter((id) => !cAfter.has(id));
  const names = (ids: string[]) =>
    ids.length <= 2 && ids.every((id) => classNames.has(id))
      ? ids.map((id) => classNames.get(id)!).join(', ')
      : null;
  if (cAdded.length) {
    const n = names(cAdded);
    parts.push(n ? `${n} ангид оноосон` : `${cAdded.length} ангид оноосон`);
  }
  if (cRemoved.length) {
    const n = names(cRemoved);
    parts.push(n ? `${n} ангиас хассан` : `${cRemoved.length} ангиас хассан`);
  }
  return joinSummary(parts);
}

// ======================= Ялгаа (түүхийн цонх) =======================

export interface ChoiceView {
  text: string;
  isCorrect: boolean;
  mistake: string | null;
  note: string | null;
  image: string | null;
}

export interface ChoiceDiffRow {
  label: string;
  status: 'added' | 'removed' | 'changed' | 'same';
  before: ChoiceView | null;
  after: ChoiceView | null;
}

export interface ProblemDiffRow {
  status: 'added' | 'removed' | 'moved' | 'points';
  order: number;
  beforeOrder: number | null;
  points: number;
  beforePoints: number | null;
  statement: string | null;
}

export type DiffEntry =
  | { field: string; label: string; kind: 'math' | 'text' | 'image'; before: string | null; after: string | null }
  | { field: string; label: string; kind: 'choices'; rows: ChoiceDiffRow[] }
  | { field: string; label: string; kind: 'set'; added: string[]; removed: string[] }
  | { field: string; label: string; kind: 'problems'; rows: ProblemDiffRow[] };

function choiceView(c: ProblemChoiceSnapshot): ChoiceView {
  return {
    text: c.text,
    isCorrect: c.isCorrect,
    mistake: c.isCorrect ? null : (MISTAKE_LABEL[c.mistakeType] ?? null),
    note: c.mistakeNote,
    image: c.imageKey ?? null,
  };
}

export function diffProblem(a: ProblemSnapshot | null, b: ProblemSnapshot): DiffEntry[] {
  if (!a) return [];
  const out: DiffEntry[] = [];
  const text = (
    field: string,
    label: string,
    kind: 'math' | 'text' | 'image',
    x: string | null,
    y: string | null,
  ) => {
    if (x !== y) out.push({ field, label, kind, before: x, after: y });
  };
  text('statementText', 'Бодлогын текст', 'math', a.statementText, b.statementText);
  text('imageKey', 'Зураг', 'image', a.imageKey, b.imageKey);
  text('format', 'Хэлбэр', 'text', FORMAT_LABEL[a.format] ?? a.format, FORMAT_LABEL[b.format] ?? b.format);
  text('points', 'Оноо', 'text', String(a.points), String(b.points));

  if (!sameJson(a.choiceOptions, b.choiceOptions)) {
    const { pairs, added, removed } = pairChoices(a.choiceOptions, b.choiceOptions);
    const rows: (ChoiceDiffRow & { sort: number })[] = [
      ...pairs.map(([x, y]) => {
        const vx = choiceView(x);
        const vy = choiceView(y);
        return {
          label: y.label,
          status: (sameJson(vx, vy) ? 'same' : 'changed') as ChoiceDiffRow['status'],
          before: vx,
          after: vy,
          sort: y.order,
        };
      }),
      ...added.map((y) => ({
        label: y.label,
        status: 'added' as const,
        before: null,
        after: choiceView(y),
        sort: y.order,
      })),
      ...removed.map((x) => ({
        label: x.label,
        status: 'removed' as const,
        before: choiceView(x),
        after: null,
        sort: x.order + 0.5,
      })),
    ];
    out.push({
      field: 'choiceOptions',
      label: 'Сонголт',
      kind: 'choices',
      rows: rows
        .sort((x, y) => x.sort - y.sort)
        .map((r) => ({ label: r.label, status: r.status, before: r.before, after: r.after })),
    });
  }
  if (!sameJson(a.correctAnswer, b.correctAnswer))
    out.push({
      field: 'correctAnswer',
      label: 'Зөв хариу',
      kind: 'math',
      before: answerText(a.correctAnswer),
      after: answerText(b.correctAnswer),
    });
  if (!sameJson(a.choices, b.choices))
    out.push({
      field: 'choices',
      label: 'Сонголт (хуучин хэлбэр)',
      kind: 'math',
      before: answerText(a.choices),
      after: answerText(b.choices),
    });
  const tagsBefore = new Set(a.tags.map(tagKey));
  const tagsAfter = new Set(b.tags.map(tagKey));
  const added = b.tags.filter((t) => !tagsBefore.has(tagKey(t))).map((t) => t.name);
  const removed = a.tags.filter((t) => !tagsAfter.has(tagKey(t))).map((t) => t.name);
  if (added.length || removed.length)
    out.push({ field: 'tags', label: 'Ангилал', kind: 'set', added, removed });
  if (!sameJson(a.scoringGroups, b.scoringGroups))
    out.push({
      field: 'scoringGroups',
      label: 'Алхмын багц',
      kind: 'text',
      before: scoringGroupsText(a.scoringGroups),
      after: scoringGroupsText(b.scoringGroups),
    });
  text('youtubeUrl', 'YouTube холбоос', 'text', a.youtubeUrl, b.youtubeUrl);
  text(
    'solutionOutline',
    'Бодолт',
    'math',
    a.analysis?.solutionOutline ?? null,
    b.analysis?.solutionOutline ?? null,
  );
  const st = (s: ProblemSnapshot) =>
    s.analysis ? (ANSWER_STATUS_LABEL[s.analysis.answerKeyStatus] ?? s.analysis.answerKeyStatus) : null;
  text('answerKeyStatus', 'Хариуны төлөв', 'text', st(a), st(b));
  return out;
}

export interface TestDiffResolvers {
  classNames?: ReadonlyMap<string, string>;
  chapterTitles?: ReadonlyMap<string, string>;
  problemStatements?: ReadonlyMap<string, string | null>;
  /** Үнийг зөвхөн админд харуулна */
  showPrice?: boolean;
}

export function diffTest(a: TestSnapshot | null, b: TestSnapshot, r: TestDiffResolvers = {}): DiffEntry[] {
  if (!a) return [];
  const out: DiffEntry[] = [];
  const text = (field: string, label: string, x: string | null, y: string | null) => {
    if (x !== y) out.push({ field, label, kind: 'text', before: x, after: y });
  };
  text('title', 'Нэр', a.title, b.title);
  text('type', 'Төрөл', TEST_TYPE_LABEL[a.type] ?? a.type, TEST_TYPE_LABEL[b.type] ?? b.type);
  text('gradingMode', 'Дүгнэх горим', GRADING_LABEL[a.gradingMode] ?? a.gradingMode, GRADING_LABEL[b.gradingMode] ?? b.gradingMode);
  const minutes = (m: number | null) => (m === null ? 'Хугацаагүй' : `${m} минут`);
  text('timeLimitMin', 'Хугацаа', minutes(a.timeLimitMin), minutes(b.timeLimitMin));
  if (r.showPrice) {
    const price = (p: number | null) => (p === null ? 'Үнэгүй' : `${p} төгрөг`);
    text('price', 'Үнэ', price(a.price), price(b.price));
  }
  const chapter = (id: string | null) =>
    id === null ? 'Бүлэггүй' : (r.chapterTitles?.get(id) ?? 'Бүлэг сэдэв');
  if (a.chapterId !== b.chapterId) text('chapterId', 'Бүлэг сэдэв', chapter(a.chapterId), chapter(b.chapterId));
  text('groupKey', 'Хувилбарын бүлэг', a.groupKey, b.groupKey);
  text('variantLabel', 'Хувилбар', a.variantLabel, b.variantLabel);
  const pdf = (k: string | null) => (k ? 'Файлтай' : 'Файлгүй');
  if (a.pdfKey !== b.pdfKey) text('pdfKey', 'PDF файл', a.pdfKey && b.pdfKey ? 'Өмнөх файл' : pdf(a.pdfKey), b.pdfKey && a.pdfKey ? 'Шинэ файл' : pdf(b.pdfKey));

  if (!sameJson(a.problems, b.problems)) {
    const before = new Map(a.problems.map((p) => [p.problemId, p]));
    const after = new Map(b.problems.map((p) => [p.problemId, p]));
    const statement = (id: string) => r.problemStatements?.get(id) ?? null;
    const rows: ProblemDiffRow[] = [];
    for (const p of b.problems) {
      const old = before.get(p.problemId);
      if (!old)
        rows.push({ status: 'added', order: p.order, beforeOrder: null, points: p.points, beforePoints: null, statement: statement(p.problemId) });
      else if (old.points !== p.points)
        rows.push({ status: 'points', order: p.order, beforeOrder: old.order, points: p.points, beforePoints: old.points, statement: statement(p.problemId) });
      else if (old.order !== p.order)
        rows.push({ status: 'moved', order: p.order, beforeOrder: old.order, points: p.points, beforePoints: old.points, statement: statement(p.problemId) });
    }
    for (const p of a.problems) {
      if (!after.has(p.problemId))
        rows.push({ status: 'removed', order: p.order, beforeOrder: p.order, points: p.points, beforePoints: p.points, statement: statement(p.problemId) });
    }
    rows.sort((x, y) => x.order - y.order);
    out.push({ field: 'problems', label: 'Бодлого', kind: 'problems', rows });
  }
  const cBefore = new Set(a.classroomIds);
  const cAfter = new Set(b.classroomIds);
  const name = (id: string) => r.classNames?.get(id) ?? 'Анги';
  const cAdded = b.classroomIds.filter((id) => !cBefore.has(id)).map(name);
  const cRemoved = a.classroomIds.filter((id) => !cAfter.has(id)).map(name);
  if (cAdded.length || cRemoved.length)
    out.push({ field: 'classroomIds', label: 'Анги', kind: 'set', added: cAdded, removed: cRemoved });
  return out;
}

// ======================= Сэргээх төлөвлөгөө =======================

export interface ProblemRestorePlan {
  /** Сэргээх хэсгүүд */
  groups: ProblemFieldGroup[];
  /** Түгжээтэй тул сэргээхгүй хэсгүүд (монгол нэр) */
  skipped: string[];
  /** Сурагч өгсөн тестийн бодлогын хариу өөрчлөгдөнө — confirm шаардана */
  answerChanges: boolean;
  /** Багш (TEACHER) энэ хэсгийг засах эрхгүй */
  forbidden: ProblemFieldGroup[];
}

export const PROBLEM_GROUP_LABEL: Record<ProblemFieldGroup, string> = {
  content: 'Бодлогын агуулга',
  choices: 'Сонголт',
  tags: 'Ангилал',
  scoringGroups: 'Алхмын багц',
  youtubeUrl: 'YouTube холбоос',
  analysis: 'Бодолт',
};

const TEACHER_PROBLEM_GROUPS: ReadonlySet<ProblemFieldGroup> = new Set(['choices', 'tags']);

export function planProblemRestore(
  current: ProblemSnapshot,
  target: ProblemSnapshot,
  ctx: { taken: boolean; contentEditor: boolean },
): ProblemRestorePlan {
  const changed = changedProblemGroups(current, target);
  const skipped: string[] = [];
  const groups = changed.filter((g) => {
    // Алхмын багц: бодлого орсон шалгалтыг сурагч өгсөн бол дүнгийн бүтэц түгжээтэй
    if (g === 'scoringGroups' && ctx.taken) {
      skipped.push(PROBLEM_GROUP_LABEL.scoringGroups);
      return false;
    }
    return true;
  });
  const forbidden = ctx.contentEditor ? [] : groups.filter((g) => !TEACHER_PROBLEM_GROUPS.has(g));
  return {
    groups,
    skipped,
    answerChanges: ctx.taken && answerKeyOf(current) !== answerKeyOf(target),
    forbidden,
  };
}

export interface TestRestorePlan {
  data: Partial<Pick<TestSnapshot, 'title' | 'type' | 'gradingMode' | 'timeLimitMin' | 'price' | 'chapterId' | 'pdfKey' | 'groupKey' | 'variantLabel'>>;
  problems: TestProblemSnapshot[] | null;
  addClassIds: string[];
  removeClassIds: string[];
  skipped: string[];
}

export function planTestRestore(
  current: TestSnapshot,
  target: TestSnapshot,
  ctx: { taken: boolean; isAdmin: boolean; manageableClassIds: ReadonlySet<string> | null },
): TestRestorePlan {
  const plan: TestRestorePlan = { data: {}, problems: null, addClassIds: [], removeClassIds: [], skipped: [] };
  const skip = (label: string) => {
    if (!plan.skipped.includes(label)) plan.skipped.push(label);
  };
  if (current.title !== target.title) plan.data.title = target.title;
  if (current.timeLimitMin !== target.timeLimitMin) plan.data.timeLimitMin = target.timeLimitMin;

  const locked: [keyof TestRestorePlan['data'], string][] = [
    ['type', 'Төрөл'],
    ['gradingMode', 'Дүгнэх горим'],
    ['chapterId', 'Бүлэг сэдэв'],
    ['pdfKey', 'PDF файл'],
    ['groupKey', 'Хувилбар'],
    ['variantLabel', 'Хувилбар'],
  ];
  for (const [field, label] of locked) {
    if (current[field] === target[field]) continue;
    if (ctx.taken) skip(label);
    else (plan.data as Record<string, unknown>)[field] = target[field];
  }
  if (current.price !== target.price) {
    if (ctx.taken) skip('Үнэ');
    else if (!ctx.isAdmin) skip('Үнэ');
    else plan.data.price = target.price;
  }
  if (!sameJson(current.problems, target.problems)) {
    if (ctx.taken) skip('Бодлого');
    else plan.problems = target.problems;
  }
  const cur = new Set(current.classroomIds);
  const tgt = new Set(target.classroomIds);
  const add = target.classroomIds.filter((id) => !cur.has(id));
  const remove = current.classroomIds.filter((id) => !tgt.has(id));
  if (add.length || remove.length) {
    if (ctx.taken) skip('Анги');
    else {
      const ok = (id: string) => ctx.manageableClassIds === null || ctx.manageableClassIds.has(id);
      plan.addClassIds = add.filter(ok);
      plan.removeClassIds = remove.filter(ok);
      if (plan.addClassIds.length !== add.length || plan.removeClassIds.length !== remove.length)
        skip('Бусад багшийн анги');
    }
  }
  return plan;
}

export function testPlanIsEmpty(plan: TestRestorePlan): boolean {
  return (
    Object.keys(plan.data).length === 0 &&
    plan.problems === null &&
    plan.addClassIds.length === 0 &&
    plan.removeClassIds.length === 0
  );
}

// ======================= Харуулах snapshot (ID-гүй) =======================

export interface ProblemSnapshotView {
  statementText: string | null;
  imageKey: string | null;
  format: string;
  points: number;
  choices: (ChoiceView & { label: string })[];
  correctAnswer: string | null;
  legacyChoices: string | null;
  scoringGroups: string | null;
  youtubeUrl: string | null;
  tags: string[];
  solution: string | null;
  answerKeyStatus: string | null;
}

export function problemView(s: ProblemSnapshot): ProblemSnapshotView {
  return {
    statementText: s.statementText,
    imageKey: s.imageKey,
    format: FORMAT_LABEL[s.format] ?? s.format,
    points: s.points,
    choices: s.choiceOptions.map((c) => ({ label: c.label, ...choiceView(c) })),
    correctAnswer: s.choiceOptions.length ? null : answerText(s.correctAnswer),
    legacyChoices: s.choiceOptions.length ? null : answerText(s.choices),
    scoringGroups: scoringGroupsText(s.scoringGroups),
    youtubeUrl: s.youtubeUrl,
    tags: s.tags.map((t) => t.name),
    solution: s.analysis?.solutionOutline ?? null,
    answerKeyStatus: s.analysis
      ? (ANSWER_STATUS_LABEL[s.analysis.answerKeyStatus] ?? s.analysis.answerKeyStatus)
      : null,
  };
}

export interface TestSnapshotView {
  title: string;
  type: string;
  gradingMode: string;
  timeLimitMin: number | null;
  price?: number | null;
  chapter: string | null;
  hasPdf: boolean;
  problems: { order: number; points: number; statement: string | null }[];
  classes: string[];
}

export function testView(s: TestSnapshot, r: TestDiffResolvers = {}): TestSnapshotView {
  return {
    title: s.title,
    type: TEST_TYPE_LABEL[s.type] ?? s.type,
    gradingMode: GRADING_LABEL[s.gradingMode] ?? s.gradingMode,
    timeLimitMin: s.timeLimitMin,
    ...(r.showPrice ? { price: s.price } : {}),
    chapter: s.chapterId ? (r.chapterTitles?.get(s.chapterId) ?? null) : null,
    hasPdf: !!s.pdfKey,
    problems: s.problems.map((p) => ({
      order: p.order,
      points: p.points,
      statement: r.problemStatements?.get(p.problemId) ?? null,
    })),
    classes: s.classroomIds.map((id) => r.classNames?.get(id) ?? 'Анги'),
  };
}
