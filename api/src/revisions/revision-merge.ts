import {
  ProblemChoiceSnapshot,
  ProblemSnapshot,
  ProblemTagSnapshot,
  sameJson,
  TestProblemSnapshot,
  TestSnapshot,
} from './revision-snapshot';

/**
 * Зэрэг засварын автомат нэгтгэл (3-way merge) — docs/v2/ZEREG-ZASVAR-TOLOVLOGOO.md §2.
 *
 *   base   — багшийн засварлагч ачаалсан хувилбар (ContentRevision-оос)
 *   theirs — одоогийн төлөв (тэр хооронд бусдын хадгалсан)
 *   mine   — энэ хадгалалтын дараах төлөв (theirs дээр энэ багшийн DTO бичигдсэн)
 *
 * Талбар бүрд: mine = base → theirs (энэ багш өөрчлөөгүй — хуучин утгаа дахин илгээсэн
 * ч бусдынхыг дарахгүй); theirs = base → mine; mine = theirs → тэр; эс бөгөөс ЗӨРЧИЛ
 * (талбарын монгол нэр). Цэвэр функц — ӨС-гүй (revision-merge.spec.ts).
 */

export interface MergeOutcome<S> {
  merged: S;
  /** Хоёулаа өөр утгаар өөрчилсөн талбарууд (монгол нэр, давхардалгүй) */
  conflicts: string[];
}

class Conflicts {
  readonly list: string[] = [];
  add(label: string) {
    if (!this.list.includes(label)) this.list.push(label);
  }
}

function pick<T>(base: T, mine: T, theirs: T, label: string, c: Conflicts): T {
  if (sameJson(mine, theirs)) return mine;
  if (sameJson(mine, base)) return theirs;
  if (sameJson(theirs, base)) return mine;
  c.add(label);
  return mine;
}

/** Олонлог: аль нэг тал хассан бол хасагдана, аль нэг тал нэмсэн бол нэмэгдэнэ. */
export function mergeSet(
  base: readonly string[],
  mine: readonly string[],
  theirs: readonly string[],
): string[] {
  const b = new Set(base);
  const m = new Set(mine);
  const t = new Set(theirs);
  const out: string[] = [];
  for (const x of new Set([...base, ...mine, ...theirs])) {
    if (b.has(x) ? m.has(x) && t.has(x) : m.has(x) || t.has(x)) out.push(x);
  }
  return out.sort();
}

// ======================= Бодлого =======================

type ChoiceBody = Omit<ProblemChoiceSnapshot, 'label' | 'isCorrect'>;

function bodyOf(c: ProblemChoiceSnapshot): ChoiceBody {
  return {
    text: c.text,
    mistakeType: c.mistakeType,
    mistakeNote: c.mistakeNote,
    imageKey: c.imageKey ?? null,
    order: c.order,
  };
}

const correctLabels = (list: ProblemChoiceSnapshot[]) =>
  list
    .filter((c) => c.isCorrect)
    .map((c) => c.label)
    .sort();

/**
 * Сонголтыг ҮСГЭЭР нэгтгэнэ (текст, алдааны тайлбар, дараалал тус тусдаа).
 * Зөв хариу = НЭГ талбар — нэг нь B, нөгөө нь C-г зөв болговол давхар зөв биш, зөрчил.
 * Аль нэг тал сонголт нэмсэн/хассан эсвэл дахин үсэглэсэн бол (агуулгын засварлагч
 * байрлалаар A, B, C… дахин олгодог) үсгээр тулгах найдваргүй — жагсаалт бүхэлдээ
 * нэг талбар («Сонголтууд»): хоёулаа өөрчилсөн бол зөрчил.
 */
function mergeChoices(
  base: ProblemChoiceSnapshot[],
  mine: ProblemChoiceSnapshot[],
  theirs: ProblemChoiceSnapshot[],
  c: Conflicts,
): ProblemChoiceSnapshot[] {
  if (sameJson(mine, theirs) || sameJson(theirs, base)) return mine;
  if (sameJson(mine, base)) return theirs;

  const labelsOf = (list: ProblemChoiceSnapshot[]) =>
    list.map((ch) => ch.label).sort();
  if (
    !sameJson(labelsOf(mine), labelsOf(base)) ||
    !sameJson(labelsOf(theirs), labelsOf(base))
  )
    return pick(base, mine, theirs, 'Сонголтууд', c);

  // Гурван талд ижил үсгүүд — сонголт бүрийг шинжээр нь нэгтгэнэ
  const byLabel = (list: ProblemChoiceSnapshot[]) =>
    new Map(list.map((ch) => [ch.label, ch]));
  const M = byLabel(mine);
  const T = byLabel(theirs);
  const bodies = base.map((b) => {
    const m = M.get(b.label)!;
    const t = T.get(b.label)!;
    return {
      label: b.label,
      text: pick(b.text, m.text, t.text, `${b.label} сонголтын текст`, c),
      mistakeType: pick(
        b.mistakeType,
        m.mistakeType,
        t.mistakeType,
        `${b.label} сонголтын алдааны тайлбар`,
        c,
      ),
      mistakeNote: pick(
        b.mistakeNote,
        m.mistakeNote,
        t.mistakeNote,
        `${b.label} сонголтын алдааны тайлбар`,
        c,
      ),
      imageKey: pick(
        b.imageKey ?? null,
        m.imageKey ?? null,
        t.imageKey ?? null,
        `${b.label} сонголтын зураг`,
        c,
      ),
      order: pick(b.order, m.order, t.order, 'Сонголтын дараалал', c),
    };
  });

  const correct = new Set(
    pick(
      correctLabels(base),
      correctLabels(mine),
      correctLabels(theirs),
      'Зөв хариу',
      c,
    ),
  );

  bodies.sort((a, b) => a.order - b.order || a.label.localeCompare(b.label));
  const orders = bodies.map((b) => b.order);
  const renumber = new Set(orders).size !== orders.length;
  return bodies.map((b, i) => ({
    label: b.label,
    text: b.text,
    isCorrect: correct.has(b.label),
    mistakeType: b.mistakeType,
    mistakeNote: b.mistakeNote,
    imageKey: b.imageKey,
    order: renumber ? i + 1 : b.order,
  }));
}

function tagKey(t: ProblemTagSnapshot): string {
  return t.id || `${t.type}:${t.name}`;
}

function mergeTags(
  base: ProblemTagSnapshot[],
  mine: ProblemTagSnapshot[],
  theirs: ProblemTagSnapshot[],
): ProblemTagSnapshot[] {
  if (sameJson(mine, theirs) || sameJson(theirs, base)) return mine;
  if (sameJson(mine, base)) return theirs;
  const all = new Map([...base, ...theirs, ...mine].map((t) => [tagKey(t), t]));
  return mergeSet(base.map(tagKey), mine.map(tagKey), theirs.map(tagKey))
    .map((k) => all.get(k)!)
    .sort(
      (a, b) =>
        a.type.localeCompare(b.type) ||
        a.name.localeCompare(b.name) ||
        a.id.localeCompare(b.id),
    );
}

function mergeAnalysis(
  base: ProblemSnapshot['analysis'],
  mine: ProblemSnapshot['analysis'],
  theirs: ProblemSnapshot['analysis'],
  c: Conflicts,
): ProblemSnapshot['analysis'] {
  if (!base || !mine || !theirs) return pick(base, mine, theirs, 'Бодолт', c);
  return {
    solutionOutline: pick(
      base.solutionOutline,
      mine.solutionOutline,
      theirs.solutionOutline,
      'Бодолт',
      c,
    ),
    answerKeyStatus: pick(
      base.answerKeyStatus,
      mine.answerKeyStatus,
      theirs.answerKeyStatus,
      'Хариуны төлөв',
      c,
    ),
  };
}

export interface MergeOptions {
  /**
   * «Миний хувилбарыг хадгалах»: зөрчилтэй талбарт миний утга (бусад талбарт
   * нэгтгэнэ). Хэлбэрийн зөрчил эсвэл нэгтгэлээс зөв сонголтгүй болох үед л миний
   * сонголтын жагсаалтыг бүтнээр нь авна.
   */
  preferMine?: boolean;
}

export function mergeProblemSnapshots(
  base: ProblemSnapshot,
  mine: ProblemSnapshot,
  theirs: ProblemSnapshot,
  opts: MergeOptions = {},
): MergeOutcome<ProblemSnapshot> {
  const c = new Conflicts();
  const f = <K extends keyof ProblemSnapshot>(key: K, label: string) =>
    pick(base[key], mine[key], theirs[key], label, c);

  // Хэлбэр (сонгох/нөхөх…) солигдвол сонголт, хариуны утга өөр болно — нөгөө тал
  // хариу/сонголтыг засварласан бол автоматаар нийлүүлэхгүй.
  const answerTouched = (s: ProblemSnapshot) =>
    !sameJson(s.choiceOptions, base.choiceOptions) ||
    !sameJson(s.choices, base.choices) ||
    !sameJson(s.correctAnswer, base.correctAnswer);
  if (
    (mine.format !== base.format && answerTouched(theirs)) ||
    (theirs.format !== base.format && answerTouched(mine))
  )
    c.add('Бодлогын хэлбэр');

  const merged: ProblemSnapshot = {
    statementText: f('statementText', 'Бодлогын текст'),
    imageKey: f('imageKey', 'Зураг'),
    format: f('format', 'Бодлогын хэлбэр'),
    points: f('points', 'Оноо'),
    choices: f('choices', 'Сонголт'),
    correctAnswer: f('correctAnswer', 'Зөв хариу'),
    choiceOptions: mergeChoices(
      base.choiceOptions,
      mine.choiceOptions,
      theirs.choiceOptions,
      c,
    ),
    scoringGroups: f('scoringGroups', 'Алхмын багц'),
    youtubeUrl: f('youtubeUrl', 'YouTube холбоос'),
    tags: mergeTags(base.tags, mine.tags, theirs.tags),
    analysis: mergeAnalysis(base.analysis, mine.analysis, theirs.analysis, c),
  };
  if (opts.preferMine) {
    if (c.list.includes('Бодлогын хэлбэр')) {
      merged.format = mine.format;
      merged.choices = mine.choices;
      merged.correctAnswer = mine.correctAnswer;
      merged.choiceOptions = mine.choiceOptions;
    } else if (
      correctLabels(merged.choiceOptions).length === 0 &&
      correctLabels(mine.choiceOptions).length > 0
    ) {
      // Зөв сонголт нь нөгөө талд хасагдсан — хагас нэгтгэлээс зөв хариугүй бодлого
      // үүсгэхгүйн тулд миний жагсаалтыг бүтнээр. Шинжийн (текст/тайлбар) зөрчилд
      // pick аль хэдийн миний утгыг авсан, бусад сонголтын бусдын засвар хэвээр.
      merged.choiceOptions = mine.choiceOptions;
    }
  }
  return { merged, conflicts: c.list };
}

// ======================= Тест =======================

/**
 * Тестийн бодлого: бүрэлдэхүүн — олонлогоор, оноо — бодлого бүрээр, дараалал —
 * хоёулаа өөрөөр зөөсөн бол зөрчил, эс бөгөөс зөөсөн талынх (нөгөө талын нэмсэн
 * бодлого өмнөх хөршийнхөө ард орно).
 */
function mergeTestProblems(
  base: TestProblemSnapshot[],
  mine: TestProblemSnapshot[],
  theirs: TestProblemSnapshot[],
  c: Conflicts,
): TestProblemSnapshot[] {
  if (sameJson(mine, theirs) || sameJson(theirs, base)) return mine;
  if (sameJson(mine, base)) return theirs;

  const ids = (list: TestProblemSnapshot[]) => list.map((p) => p.problemId);
  const map = (list: TestProblemSnapshot[]) =>
    new Map(list.map((p) => [p.problemId, p]));
  const B = map(base);
  const M = map(mine);
  const T = map(theirs);
  const members = new Set(mergeSet(ids(base), ids(mine), ids(theirs)));

  for (const [id, b] of B) {
    const m = M.get(id);
    const t = T.get(id);
    // нэг тал хасаж, нөгөө нь оноог нь өөрчилсөн
    if (
      (!m && t && t.points !== b.points) ||
      (!t && m && m.points !== b.points)
    )
      c.add('Бодлогын жагсаалт');
  }

  const points = new Map<string, number>();
  for (const id of members) {
    const m = M.get(id);
    const t = T.get(id);
    if (!m || !t) {
      points.set(id, (m ?? t)!.points);
      continue;
    }
    points.set(
      id,
      pick(
        B.get(id)?.points ?? null,
        m.points,
        t.points,
        `${m.order}-р бодлогын оноо`,
        c,
      ) ?? m.points,
    );
  }

  const common = (list: TestProblemSnapshot[]) =>
    ids(list).filter((id) => B.has(id) && M.has(id) && T.has(id));
  const mineMoved = !sameJson(common(mine), common(base));
  const theirsMoved = !sameJson(common(theirs), common(base));
  if (mineMoved && theirsMoved && !sameJson(common(mine), common(theirs)))
    c.add('Бодлогын дараалал');

  const primary = ids(mineMoved || !theirsMoved ? mine : theirs);
  const secondary = ids(mineMoved || !theirsMoved ? theirs : mine);
  const seq = primary.filter((id) => members.has(id));
  secondary.forEach((id, i) => {
    if (!members.has(id) || seq.includes(id)) return;
    const prev = secondary
      .slice(0, i)
      .reverse()
      .find((x) => seq.includes(x));
    seq.splice(prev ? seq.indexOf(prev) + 1 : 0, 0, id);
  });

  // Дараалал аль нэг талынхтай яг ижил бол тэр талын дугаарыг хадгална (хоосон зөрөө үүсгэхгүй)
  const sameSeq = (list: TestProblemSnapshot[]) => sameJson(ids(list), seq);
  const orderOf = sameSeq(mine) ? M : sameSeq(theirs) ? T : null;
  return seq.map((id, i) => ({
    problemId: id,
    order: orderOf ? orderOf.get(id)!.order : i + 1,
    points: points.get(id)!,
  }));
}

export function mergeTestSnapshots(
  base: TestSnapshot,
  mine: TestSnapshot,
  theirs: TestSnapshot,
  opts: MergeOptions = {},
): MergeOutcome<TestSnapshot> {
  const c = new Conflicts();
  const f = <K extends keyof TestSnapshot>(key: K, label: string) =>
    pick(base[key], mine[key], theirs[key], label, c);
  const merged: TestSnapshot = {
    title: f('title', 'Нэр'),
    type: f('type', 'Төрөл'),
    gradingMode: f('gradingMode', 'Дүгнэх горим'),
    timeLimitMin: f('timeLimitMin', 'Хугацаа'),
    price: f('price', 'Үнэ'),
    chapterId: f('chapterId', 'Бүлэг сэдэв'),
    pdfKey: f('pdfKey', 'PDF файл'),
    groupKey: f('groupKey', 'Хувилбар'),
    variantLabel: f('variantLabel', 'Хувилбар'),
    problems: mergeTestProblems(
      base.problems,
      mine.problems,
      theirs.problems,
      c,
    ),
    classroomIds: mergeSet(
      base.classroomIds,
      mine.classroomIds,
      theirs.classroomIds,
    ),
  };
  // «Миний хувилбар»: нэг тал хасаж нөгөө нь оноог нь өөрчилсөн бол миний жагсаалт
  if (opts.preferMine && c.list.includes('Бодлогын жагсаалт'))
    merged.problems = mine.problems;
  return { merged, conflicts: c.list };
}
