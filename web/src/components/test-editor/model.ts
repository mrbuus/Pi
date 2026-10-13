/* ============================================================================
 * «Тест засах» — 40 блок (docs/v2/TEST-ZASAH-BLOK.md). ЦЭВЭР логик: React/DOM-гүй,
 * tests/test-editor-model.test.cjs. Хуудас (app/app/tests/[id]/edit) нэг
 * useUndoable төлөвт тохиргоо + бодлогын дараалал/оноо + блокийн агуулгын
 * ноорогийг хадгална — Cmd+Z, ↶ ↷ бүгдэд нэгэн зэрэг ажиллана, нэг «Хадгалах».
 * ========================================================================== */

import { parseFillSlots, slotsTotalLength } from "@/components/exam/fillSlots";

export type ProblemFormat = "CHOICE" | "FILL_NUMBER" | "OPEN" | string;

export interface EditorChoice {
  text: string;
  isCorrect: boolean;
  /** Сонголтын зураг (StoredFile key) — график хариу */
  imageKey?: string | null;
}

/** Блокийн агуулга — серверийнхтэй харьцуулж зөвхөн өөрчлөгдсөнийг илгээнэ. */
export interface BlockContent {
  statement: string;
  imageKey: string | null;
  format: ProblemFormat;
  /** CHOICE: сонголтууд (дараалал = A, B, C…) */
  choices: EditorChoice[];
  /** FILL_NUMBER: нүднүүдийн цифр бодлогын дарааллаар ("_" = хоосон) */
  fill: string;
}

export interface BlockItem {
  /** Тогтвортой түлхүүр: байгаа бодлого — problemId, шинэ — "new-…" */
  key: string;
  /** null — шинэ бодлого (хадгалахад үүснэ) */
  problemId: string | null;
  /** Тест дэх оноо */
  points: number;
}

export interface TestSettings {
  title: string;
  type: string;
  gradingMode: string;
  chapterId: string;
  subject: string;
  timeLimit: string;
  groupKey: string;
  variantLabel: string;
  pdfKey: string;
  price: string;
}

export interface EditorState {
  settings: TestSettings;
  items: BlockItem[];
  classes: string[];
  /** Засварласан эсвэл шинэ блокийн агуулга (item.key → агуулга) */
  drafts: Record<string, BlockContent>;
}

/** GET /tests/:id-ийн бодлого (ажилтны хувилбар). */
export interface ServerProblem {
  id: string;
  token: string;
  format: string;
  statementText?: string | null;
  imageKey?: string | null;
  choices?: unknown;
  correctAnswer?: unknown;
  points?: number;
  chapterId?: string | null;
  version?: number;
  choiceOptions?: { order: number; text: string; isCorrect: boolean; label?: string; imageKey?: string | null }[];
  tags?: { tag: { id: string; type: string; name: string } }[];
  analysis?: { answerKeyStatus?: string; topic?: string | null; subtopic?: string | null } | null;
}

export const LETTERS = "ABCDEFGH";

// ======================= Сервер → засварлагч =======================

/** correctAnswer → нүдний цифрүүд (стринг/тоо/үсгээр түлхүүрлэсэн объект). */
export function fillAnswerOf(correctAnswer: unknown, statement: string): string {
  if (correctAnswer === null || correctAnswer === undefined) return "";
  if (typeof correctAnswer === "string") return correctAnswer.trim();
  if (typeof correctAnswer === "number") return String(correctAnswer);
  if (typeof correctAnswer === "object" && !Array.isArray(correctAnswer)) {
    const obj = correctAnswer as Record<string, unknown>;
    let out = "";
    for (const group of parseFillSlots(statement)) {
      const whole = obj[group.key];
      if (typeof whole === "string" || typeof whole === "number") {
        out += String(whole).padEnd(group.length, "_").slice(0, group.length);
        continue;
      }
      for (const letter of group.key) {
        const v = obj[letter];
        out += typeof v === "string" || typeof v === "number" ? String(v).slice(0, 1) || "_" : "_";
      }
    }
    return out.replace(/_+$/, "");
  }
  return "";
}

/**
 * Хуучин загвар (`choices` текстийн массив + `correctAnswer` = «A» үсэг эсвэл
 * зөв хариуны текст) → сонголтын жагсаалт. ProblemChoice мөргүй ~7500 бодлогод.
 */
export function legacyChoiceList(choices: unknown, correctAnswer: unknown): EditorChoice[] {
  if (!Array.isArray(choices)) return [];
  const texts = choices.map((t) => (typeof t === "string" ? t : String(t ?? "")));
  const raw = typeof correctAnswer === "string" || typeof correctAnswer === "number" ? String(correctAnswer).trim() : "";
  const byLetter = /^[A-Ha-h]$/.test(raw) ? LETTERS.indexOf(raw.toUpperCase()) : -1;
  const correct = byLetter >= 0 && byLetter < texts.length ? byLetter : texts.findIndex((t) => t.trim() === raw);
  return texts.map((text, i) => ({ text, isCorrect: i === correct }));
}

export function contentOf(p: ServerProblem): BlockContent {
  const statement = p.statementText ?? "";
  let choices: EditorChoice[] = [];
  if (p.format === "CHOICE") {
    if (p.choiceOptions && p.choiceOptions.length > 0) {
      choices = [...p.choiceOptions]
        .sort((a, b) => a.order - b.order)
        .map((c) => ({ text: c.text, isCorrect: c.isCorrect, ...(c.imageKey ? { imageKey: c.imageKey } : {}) }));
    } else {
      choices = legacyChoiceList(p.choices, p.correctAnswer);
    }
  }
  return {
    statement,
    imageKey: p.imageKey ?? null,
    format: p.format,
    choices,
    fill: p.format === "FILL_NUMBER" ? fillAnswerOf(p.correctAnswer, statement) : "",
  };
}

export function newContent(format: ProblemFormat): BlockContent {
  return {
    statement: "",
    imageKey: null,
    format,
    // Зөв хариуг багш заавал өөрөө сонгоно — анхнаасаа A-г зөв болговол андуурна
    choices: format === "CHOICE" ? Array.from({ length: 5 }, () => ({ text: "", isCorrect: false })) : [],
    fill: "",
  };
}

// ======================= Шалгалт =======================

const FILL_CELL = /^[0-9-]$/;

/** "" — зөв; эс бөгөөс багшид харуулах товч алдаа. */
export function validateContent(c: BlockContent): string {
  if (!c.statement.trim() && !c.imageKey) return "Бодлогын текст хоосон байна";
  if (c.format === "CHOICE") {
    if (c.choices.length < 2) return "Дор хаяж 2 сонголт хэрэгтэй";
    if (c.choices.some((ch) => !ch.text.trim() && !ch.imageKey)) return "Хоосон сонголт байна";
    const correct = c.choices.filter((ch) => ch.isCorrect).length;
    if (correct !== 1) return "Зөв хариуг сонгоно уу";
  }
  if (c.format === "FILL_NUMBER") {
    const total = slotsTotalLength(parseFillSlots(c.statement));
    if (total === 0) {
      if (!c.fill.trim()) return "Хариуг оруулна уу";
    } else {
      const cells = Array.from({ length: total }, (_, i) => c.fill[i] ?? "");
      if (cells.some((ch) => !FILL_CELL.test(ch))) return `Хариуны ${total} нүдийг бүгдийг бөглөнө үү`;
    }
  }
  return "";
}

// ======================= Дараалал =======================

export function moveItem(items: BlockItem[], key: string, toIndex: number): BlockItem[] {
  const from = items.findIndex((i) => i.key === key);
  if (from < 0) return items;
  const to = Math.max(0, Math.min(items.length - 1, toIndex));
  if (to === from) return items;
  const next = [...items];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

export function insertItems(items: BlockItem[], index: number, added: BlockItem[]): BlockItem[] {
  const fresh = added.filter((a) => !items.some((i) => i.key === a.key));
  const at = Math.max(0, Math.min(items.length, index));
  return [...items.slice(0, at), ...fresh, ...items.slice(at)];
}

export function removeItem(items: BlockItem[], key: string): BlockItem[] {
  return items.filter((i) => i.key !== key);
}

// ======================= Хадгалах төлөвлөгөө =======================

function positiveInt(value: string): number | null {
  if (!value.trim()) return null;
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
}

/** «1000-S22A-12» → «1000-S22A»; хөршгүй бол «T» */
export function tokenPrefix(neighbors: string[]): string {
  for (const t of neighbors) {
    const i = t.lastIndexOf("-");
    if (i > 0) return t.slice(0, i);
  }
  return "T";
}

export interface SaveContext {
  originals: Record<string, ServerProblem>;
  /** Тест засах горим: LIMITED — сурагч өгсөн (зөвхөн нэр, хугацаа) */
  mode: "FULL" | "LIMITED";
  isAdmin: boolean;
  /** 1000 бодлогын тест: анги «Шалгалт → Тохиргоо»-оос, төрөл түгжээтэй */
  thousand: boolean;
  /** Шинэ бодлогын бүлэг (тестийн бүлэг) */
  chapterId: string | null;
  /** Шинэ бодлогын token (давхардвал сервер 409 — дахин оролдоно) */
  makeToken: (item: BlockItem, index: number) => string;
}

export interface SavePlan {
  creates: { key: string; body: Record<string, unknown> }[];
  updates: { key: string; problemId: string; body: Record<string, unknown>; expectedVersion?: number }[];
  /** null — тестийн өөрчлөлтгүй. problems[].problemId нь шинэ бодлогод түлхүүр (key) байна */
  test: Record<string, unknown> | null;
}

function choiceBody(choices: EditorChoice[]) {
  // imageKey зөвхөн байвал — хоосон бол сервер мөрийг зураггүй үүсгэнэ (хасах = орхих)
  return choices.map((c) => ({
    text: c.text.trim(),
    isCorrect: c.isCorrect,
    ...(c.imageKey ? { imageKey: c.imageKey } : {}),
  }));
}

/** Байгаа бодлогын агуулгын ялгаа → PATCH /problems/:id */
export function contentPatch(original: BlockContent, draft: BlockContent): Record<string, unknown> {
  const body: Record<string, unknown> = {};
  if (draft.statement !== original.statement) body.statementText = draft.statement;
  if (draft.imageKey !== original.imageKey) body.imageKey = draft.imageKey;
  if (draft.format === "CHOICE") {
    const a = JSON.stringify(choiceBody(original.choices));
    const b = JSON.stringify(choiceBody(draft.choices));
    if (a !== b) body.choiceOptions = choiceBody(draft.choices);
  }
  if (draft.format === "FILL_NUMBER" && draft.fill !== original.fill) body.correctAnswer = draft.fill;
  return body;
}

function createBody(c: BlockContent, item: BlockItem, ctx: SaveContext, index: number) {
  return {
    chapterId: ctx.chapterId,
    token: ctx.makeToken(item, index),
    format: c.format,
    statementText: c.statement,
    ...(c.imageKey ? { imageKey: c.imageKey } : {}),
    ...(c.format === "CHOICE" ? { choiceOptions: choiceBody(c.choices) } : { correctAnswer: c.fill }),
    points: item.points,
  };
}

function settingsPatch(a: TestSettings, b: TestSettings, ctx: SaveContext): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (a.title !== b.title) out.title = b.title.trim();
  if (a.timeLimit !== b.timeLimit) out.timeLimitMin = positiveInt(b.timeLimit);
  if (ctx.mode === "LIMITED") return out;
  if (a.type !== b.type && !ctx.thousand) out.type = b.type;
  if (a.gradingMode !== b.gradingMode) out.gradingMode = b.gradingMode;
  if (a.chapterId !== b.chapterId) out.chapterId = b.chapterId || null;
  if (a.groupKey !== b.groupKey) out.groupKey = b.groupKey.trim() || null;
  if (a.variantLabel !== b.variantLabel) out.variantLabel = b.variantLabel.trim() || null;
  if (a.pdfKey !== b.pdfKey) out.pdfKey = b.pdfKey.trim() || null;
  if (ctx.isAdmin && a.price !== b.price) out.price = b.price.trim() ? Number(b.price) : null;
  return out;
}

const sameItems = (a: BlockItem[], b: BlockItem[]) =>
  a.length === b.length && a.every((x, i) => x.key === b[i].key && x.points === b[i].points);

export function planSave(state: EditorState, baseline: EditorState, ctx: SaveContext): SavePlan {
  const creates: SavePlan["creates"] = [];
  const updates: SavePlan["updates"] = [];
  state.items.forEach((item, index) => {
    const draft = state.drafts[item.key];
    if (!item.problemId) {
      if (draft) creates.push({ key: item.key, body: createBody(draft, item, ctx, index) });
      return;
    }
    const original = ctx.originals[item.problemId];
    if (!draft || !original) return;
    const body = contentPatch(contentOf(original), draft);
    if (Object.keys(body).length === 0) return;
    updates.push({ key: item.key, problemId: item.problemId, body, expectedVersion: original.version });
  });

  const test = settingsPatch(baseline.settings, state.settings, ctx);
  if (ctx.mode === "FULL") {
    if (creates.length > 0 || !sameItems(baseline.items, state.items)) {
      test.problems = state.items.map((item, i) => ({
        problemId: item.problemId ?? item.key,
        order: i + 1,
        points: item.points,
      }));
    }
    const classesChanged =
      [...baseline.classes].sort().join(",") !== [...state.classes].sort().join(",");
    if (!ctx.thousand && classesChanged) test.classroomIds = state.classes;
  }
  return { creates, updates, test: Object.keys(test).length > 0 ? test : null };
}

// ======================= Тоо =======================

export function statsOf(items: BlockItem[], formatOf: (item: BlockItem) => string) {
  let choice = 0;
  let fill = 0;
  let open = 0;
  let points = 0;
  for (const item of items) {
    const f = formatOf(item);
    if (f === "CHOICE") choice += 1;
    else if (f === "FILL_NUMBER") fill += 1;
    else open += 1;
    points += item.points;
  }
  return { choice, fill, open, points };
}
