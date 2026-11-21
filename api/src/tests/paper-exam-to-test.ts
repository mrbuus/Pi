// Цаасан Нэгдсэн шалгалтын guide JSON (prisma/data/paper-exam-guides/*.json) → онлайн Test-ийн
// төлөвлөгөө. ЦЭВЭР логик — I/O-гүй, тесттэй (paper-exam-to-test.spec.ts). Санд бичих хэсэг нь
// prisma/paper-exam-to-test.cjs (dry-run анхдагч).
//
// Конвенц (одоо байгаа бодлогуудтай ижил):
//   - statementText = guide-ийн `statement` мөрүүдийг "\n"-ээр нийлүүлсэн, LaTeX нь `$…$`-тэй.
//   - Сонголт (ProblemChoice.text) нь `$…$`-оор боосон LaTeX (guide-д `$`-гүй ирдэг).
//   - Нөхөх: нүд `[a]`, `[ef]` (tests/grading.ts FILL_SLOT_RE), correctAnswer = { a: '2', ef: '18' },
//     scoringGroups = guide-ийн `parts` ба `fields.part` (цаасны оноотой яг ижил).
//   - Цаасан `[1d]` (тогтмол цифр + нүд) нь онлайн нүдний дүрэмд таарахгүй → `1[d]`.

export const CHOICE_LETTERS = ['A', 'B', 'C', 'D', 'E'] as const;

export interface GuideField {
  key: string;
  value: string;
  part: number;
}

export interface GuideContent {
  kind: 'choice' | 'fill';
  points: number;
  statement: string[];
  choices?: string[];
  answer?: string;
  parts?: { points: number }[];
  fields?: GuideField[];
  topic?: string;
  image?: string;
}

export interface GuideEntry {
  label: string;
  number: number | null;
  order: number;
  content: GuideContent;
}

export interface GuideDoc {
  examTitle: string;
  variants: Record<string, GuideEntry[]>;
}

/** { variants: { A: { "<label>": { "<үсэг>": "тайлбар" } } } } */
export interface MistakesDoc {
  examTitle?: string;
  variants: Record<string, Record<string, Record<string, string>>>;
}

/** { items: [{ number, topic }] } — 1..N сонгох, дараагийнх нь 2-р хэсгийн хэсгүүд дарааллаар */
export interface TopicsDoc {
  examTitle?: string;
  items: { number: number; topic: string }[];
}

export interface PlannedChoice {
  label: string;
  order: number;
  text: string;
  isCorrect: boolean;
  mistakeNote: string | null;
}

export interface PlannedImage {
  key: string;
  mime: string;
  base64: string;
  bytes: number;
}

export interface PlannedProblem {
  token: string;
  label: string;
  order: number; // TestProblem.order (1..)
  number: number;
  points: number;
  format: 'CHOICE' | 'FILL_NUMBER';
  statementText: string;
  correctAnswer: string | Record<string, string>;
  scoringGroups: { label: string; boxes: string[]; points: number }[] | null;
  choices: PlannedChoice[];
  image: PlannedImage | null;
  topics: string[];
  normalized: string[];
}

export interface PlannedTest {
  variant: string;
  title: string;
  groupKey: string;
  variantLabel: string;
  timeLimitMin: number;
  totalPoints: number;
  paperPoints: number;
  problems: PlannedProblem[];
}

export interface PaperExamPlan {
  examTitle: string;
  tests: PlannedTest[];
  errors: string[];
  warnings: string[];
}

const SLOT_RE = /\[([a-zA-Z]{1,8})\]/g;
const MIME_EXT: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
};

/** Нүдний бүлгүүд гарсан дарааллаар, давхардлыг нэг удаа (grading.ts fillSlotKeys-тэй ижил). */
export function slotKeysOf(statement: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const m of statement.matchAll(SLOT_RE)) {
    if (!seen.has(m[1])) {
      seen.add(m[1]);
      out.push(m[1]);
    }
  }
  return out;
}

/** Цаасны `[1d]` / `[d1]` (тогтмол цифртэй нүд) → `1[d]` / `[d]1`. Өөрчилсөн хэсгүүдийг буцаана. */
export function normalizeSlots(statement: string): { text: string; changed: string[] } {
  const changed: string[] = [];
  const text = statement
    .replace(/\[(\d+)([a-zA-Z]{1,8})\]/g, (m, digits: string, letters: string) => {
      changed.push(m);
      return `${digits}[${letters}]`;
    })
    .replace(/\[([a-zA-Z]{1,8})(\d+)\]/g, (m, letters: string, digits: string) => {
      changed.push(m);
      return `[${letters}]${digits}`;
    });
  return { text, changed };
}

/** Сонголтын LaTeX-ийг `$…$`-оор боох (аль хэдийн `$`-тэй бол хэвээр). */
export function wrapMath(text: string): string {
  const t = text.trim();
  return t.includes('$') ? t : `$${t}$`;
}

export function parseDataUri(uri: string): { mime: string; base64: string } | null {
  const m = /^data:([a-z/+.-]+);base64,([A-Za-z0-9+/=\s]+)$/.exec(uri.trim());
  if (!m) return null;
  return { mime: m[1], base64: m[2].replace(/\s+/g, '') };
}

export function slugOf(title: string): string {
  return title
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-');
}

/**
 * Guide JSON-ийг хувилбар бүрийн Test төлөвлөгөө болгоно. Агуулгын алдаа (`errors`) нэг ч
 * байвал скрипт юу ч бичихгүй. `imageHash` — зургийн байтын хэш (I/O-гүй байхын тулд гаднаас).
 */
export function planPaperExam(
  doc: GuideDoc,
  opts: {
    timeLimitMin?: number;
    mistakes?: MistakesDoc | null;
    topics?: TopicsDoc | null;
    imageHash?: (base64: string) => string;
  } = {},
): PaperExamPlan {
  const errors: string[] = [];
  const warnings: string[] = [];
  const timeLimitMin = opts.timeLimitMin ?? 100;
  const examTitle = typeof doc?.examTitle === 'string' ? doc.examTitle.trim() : '';
  if (!examTitle) errors.push('examTitle хоосон');
  const variants = Object.entries(doc?.variants ?? {});
  if (variants.length === 0) errors.push('Хувилбар алга');
  const slug = slugOf(examTitle || 'paper-exam');

  // Түгээмэл алдаа: label → үсэг → тайлбар
  if (opts.mistakes?.examTitle && opts.mistakes.examTitle !== examTitle) {
    errors.push(`Тайлбарын файлын шалгалт «${opts.mistakes.examTitle}» нь «${examTitle}» биш`);
  }
  if (opts.topics?.examTitle && opts.topics.examTitle !== examTitle) {
    errors.push(`Сэдвийн файлын шалгалт «${opts.topics.examTitle}» нь «${examTitle}» биш`);
  }
  const topicBy = new Map<number, string>();
  for (const t of opts.topics?.items ?? []) {
    if (!Number.isInteger(t.number) || typeof t.topic !== 'string' || !t.topic.trim()) {
      errors.push(`Сэдвийн файлд буруу мөр: ${JSON.stringify(t)}`);
      continue;
    }
    topicBy.set(t.number, t.topic.trim());
  }

  const tests: PlannedTest[] = [];
  for (const [variant, entries] of variants) {
    const vid = (s: string) => `${variant}/${s}`;
    if (!/^[A-ZА-Я]$/.test(variant)) errors.push(`Хувилбарын нэр «${variant}» нэг том үсэг биш`);
    if (!Array.isArray(entries) || entries.length === 0) {
      errors.push(`${variant}: бодлого алга`);
      continue;
    }
    const sorted = [...entries].sort((a, b) => a.order - b.order);
    const labels = new Set<string>();
    const orders = new Set<number>();
    const notes = opts.mistakes?.variants?.[variant] ?? {};
    const usedNotes = new Set<string>();
    const problems: PlannedProblem[] = [];
    let choiceCount = 0;
    let fillPartIndex = 0;
    let paperPoints = 0;
    sorted.forEach((entry, idx) => {
      const id = vid(String(entry?.label));
      const c = entry?.content;
      if (!entry || typeof entry.label !== 'string' || !entry.label) {
        errors.push(`${id}: label хоосон`);
        return;
      }
      if (labels.has(entry.label)) errors.push(`${id}: label давхардсан`);
      labels.add(entry.label);
      if (!Number.isInteger(entry.order) || orders.has(entry.order)) errors.push(`${id}: order буруу/давхардсан`);
      orders.add(entry.order);
      if (!c || (c.kind !== 'choice' && c.kind !== 'fill')) {
        errors.push(`${id}: kind нь choice/fill биш`);
        return;
      }
      if (!Number.isInteger(c.points) || c.points <= 0) errors.push(`${id}: оноо эерэг бүхэл биш`);
      paperPoints += Number(c.points) || 0;
      if (!Array.isArray(c.statement) || c.statement.length === 0 || c.statement.some((s) => typeof s !== 'string' || !s.trim())) {
        errors.push(`${id}: statement хоосон`);
        return;
      }
      const number = idx + 1;
      const token = `${slug}:${variant}:${entry.label}`;
      let image: PlannedImage | null = null;
      if (c.image !== undefined && c.image !== null) {
        const parsed = typeof c.image === 'string' ? parseDataUri(c.image) : null;
        if (!parsed || !MIME_EXT[parsed.mime]) {
          errors.push(`${id}: зураг data URI (png/jpeg/webp) биш`);
        } else {
          const hash = opts.imageHash ? opts.imageHash(parsed.base64) : String(parsed.base64.length);
          image = {
            key: `${slug}-${variant.toLowerCase()}-${entry.label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${hash}.${MIME_EXT[parsed.mime]}`,
            mime: parsed.mime,
            base64: parsed.base64,
            bytes: Math.floor((parsed.base64.length * 3) / 4) - (parsed.base64.endsWith('==') ? 2 : parsed.base64.endsWith('=') ? 1 : 0),
          };
        }
      }

      if (c.kind === 'choice') {
        choiceCount += 1;
        const statementText = c.statement.join('\n');
        if (slotKeysOf(statementText).length) warnings.push(`${id}: сонгох бодлогын өгүүлбэрт [x] нүдний тэмдэглэгээ байна`);
        const choices = Array.isArray(c.choices) ? c.choices : [];
        if (choices.length !== CHOICE_LETTERS.length || choices.some((x) => typeof x !== 'string' || !x.trim())) {
          errors.push(`${id}: 5 сонголт (A–E) байх ёстой`);
          return;
        }
        if (!CHOICE_LETTERS.includes(c.answer as (typeof CHOICE_LETTERS)[number])) {
          errors.push(`${id}: зөв хариу «${c.answer}» A–E биш`);
          return;
        }
        const wrapped = choices.map(wrapMath);
        if (new Set(wrapped).size !== wrapped.length) errors.push(`${id}: давхардсан сонголт`);
        const byLetter = notes[entry.label] ?? {};
        if (Object.keys(byLetter).length) usedNotes.add(entry.label);
        for (const [letter, note] of Object.entries(byLetter)) {
          if (!CHOICE_LETTERS.includes(letter as (typeof CHOICE_LETTERS)[number])) errors.push(`${id}: тайлбарын үсэг «${letter}» A–E биш`);
          else if (letter === c.answer) errors.push(`${id}: ${letter} нь зөв хариу — тайлбар бичихгүй`);
          else if (typeof note !== 'string' || !note.trim()) errors.push(`${id}: ${letter} тайлбар хоосон`);
        }
        const topic = topicBy.get(entry.number ?? choiceCount) ?? c.topic?.trim();
        problems.push({
          token,
          label: entry.label,
          order: number,
          number,
          points: c.points,
          format: 'CHOICE',
          statementText,
          correctAnswer: c.answer!,
          scoringGroups: null,
          choices: wrapped.map((text, order) => ({
            label: CHOICE_LETTERS[order],
            order,
            text,
            isCorrect: CHOICE_LETTERS[order] === c.answer,
            mistakeNote: byLetter[CHOICE_LETTERS[order]]?.trim() || null,
          })),
          image,
          topics: topic ? [topic] : [],
          normalized: [],
        });
        return;
      }

      // ---- Нөхөх (II хэсэг) ----
      if (notes[entry.label]) errors.push(`${id}: нөхөх бодлогод түгээмэл алдаа бичихгүй`);
      const parts = Array.isArray(c.parts) ? c.parts : [];
      const fields = Array.isArray(c.fields) ? c.fields : [];
      if (parts.length === 0 || fields.length === 0) {
        errors.push(`${id}: parts/fields хоосон`);
        return;
      }
      const lines = c.statement.map((line) => normalizeSlots(line));
      const statementText = lines.map((l) => l.text).join('\n');
      const normalized = lines.flatMap((l) => l.changed);
      const slots = slotKeysOf(statementText);
      const slotLetters = slots.flatMap((k) => k.split(''));
      if (new Set(slotLetters).size !== slotLetters.length) errors.push(`${id}: нэг үсэг хоёр өөр нүдний бүлэгт байна`);
      const correctAnswer: Record<string, string> = {};
      const fieldLetters: string[] = [];
      for (const f of fields) {
        if (!f || typeof f.key !== 'string' || !/^[a-z]{1,8}$/.test(f.key)) {
          errors.push(`${id}: нүдний түлхүүр «${f?.key}» буруу`);
          continue;
        }
        if (typeof f.value !== 'string' || !/^\d+$/.test(f.value) || f.value.length !== f.key.length) {
          errors.push(`${id}: [${f.key}] утга «${f?.value}» нүдний тоотой (${f.key.length} цифр) таарахгүй`);
        }
        if (!Number.isInteger(f.part) || f.part < 0 || f.part >= parts.length) errors.push(`${id}: [${f.key}] хэсгийн дугаар буруу`);
        if (!slots.includes(f.key)) errors.push(`${id}: [${f.key}] нүд өгүүлбэрт алга`);
        if (correctAnswer[f.key] !== undefined) errors.push(`${id}: [${f.key}] давхардсан`);
        correctAnswer[f.key] = f.value;
        fieldLetters.push(...f.key.split(''));
      }
      const extra = slots.filter((k) => !fields.some((f) => f.key === k));
      if (extra.length) errors.push(`${id}: өгүүлбэрийн нүд түлхүүргүй: ${extra.map((k) => `[${k}]`).join(', ')}`);
      if (new Set(fieldLetters).size !== fieldLetters.length) errors.push(`${id}: нүдний үсэг давхардсан`);
      const scoringGroups = parts.map((p, i) => ({
        label: `${entry.label}-${i + 1}`,
        boxes: fields.filter((f) => f.part === i).flatMap((f) => String(f.key).split('')),
        points: p?.points,
      }));
      scoringGroups.forEach((g) => {
        if (!Number.isInteger(g.points) || g.points <= 0) errors.push(`${id}: ${g.label} хэсгийн оноо буруу`);
        if (g.boxes.length === 0) errors.push(`${id}: ${g.label} хэсэгт нүд алга`);
        if (g.label.length > 12) errors.push(`${id}: ${g.label} шошго 12 тэмдэгтээс урт`);
      });
      const groupSum = scoringGroups.reduce((s, g) => s + (Number(g.points) || 0), 0);
      if (groupSum !== c.points) errors.push(`${id}: хэсгийн онооны нийлбэр ${groupSum}, бодлогын оноо ${c.points}`);
      // Сэдэв: сонгох бодлогын дараах дугаарууд 2-р хэсгийн хэсгүүд дарааллаар
      const partTopics = parts
        .map((_p, i) => topicBy.get(choiceCountTotal(entries) + fillPartIndex + i + 1))
        .filter((t): t is string => !!t);
      fillPartIndex += parts.length;
      const topics = partTopics.length
        ? [...new Set(partTopics)]
        : c.topic?.trim()
          ? [c.topic.trim()]
          : [];
      problems.push({
        token,
        label: entry.label,
        order: number,
        number,
        points: c.points,
        format: 'FILL_NUMBER',
        statementText,
        correctAnswer,
        scoringGroups,
        choices: [],
        image,
        topics,
        normalized,
      });
    });
    for (const label of Object.keys(notes)) {
      if (!labels.has(label)) errors.push(`${vid(label)}: тайлбарын файлд байгаа ч guide-д ийм бодлого алга`);
    }
    const totalPoints = problems.reduce((s, p) => s + p.points, 0);
    if (totalPoints !== paperPoints) errors.push(`${variant}: оноон нийлбэр ${totalPoints}, цаасных ${paperPoints}`);
    if (opts.topics && topicBy.size && topicBy.size !== choiceCount + fillPartIndex) {
      errors.push(`${variant}: сэдвийн файлд ${topicBy.size} мөр, шалгалтад ${choiceCount + fillPartIndex} зүйл`);
    }
    tests.push({
      variant,
      title: `${examTitle}-${variant}`,
      groupKey: examTitle,
      variantLabel: variant,
      timeLimitMin,
      totalPoints,
      paperPoints,
      problems,
    });
  }

  // Хувилбарууд ижил бүтэцтэй байх ёстой (цаас шиг: дугаар бүрийн төрөл, оноо)
  if (tests.length > 1) {
    const shape = (t: PlannedTest) => t.problems.map((p) => `${p.format}:${p.points}`).join(',');
    const first = shape(tests[0]);
    for (const t of tests.slice(1)) {
      if (shape(t) !== first) errors.push(`${t.variant}: бүтэц (төрөл, оноо) ${tests[0].variant} хувилбартай зөрж байна`);
    }
  }
  return { examTitle, tests, errors, warnings };
}

function choiceCountTotal(entries: GuideEntry[]): number {
  return entries.filter((e) => e?.content?.kind === 'choice').length;
}

/**
 * Импортын --commit-ийн хамгаалалт: DATABASE_URL-ийн хост 127.0.0.1 / localhost биш бол
 * --confirm-host=<яг тэр хост> заавал (андуурч прод руу бичихээс сэргийлнэ). Зөв бол null.
 */
export function commitHostError(
  databaseUrl: string | undefined,
  confirmHost: string | undefined,
): string | null {
  let host: string;
  try {
    host = new URL(databaseUrl ?? '').hostname;
  } catch {
    return 'DATABASE_URL буруу байна';
  }
  if (['127.0.0.1', 'localhost', '::1', '[::1]'].includes(host)) return null;
  if (confirmHost && confirmHost === host) return null;
  return `Локал бус сан (${host}) руу бичихгүй: --confirm-host=${host} нэмж баталгаажуулна уу`;
}
