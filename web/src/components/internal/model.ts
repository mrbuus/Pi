/* ============================================================================
 * «Дотоод» ноорогийн клиент талын төрөл, цэвэр туслахууд.
 * Сервер (api/src/internal-drafts/draft-model.ts) нийтлэхийн өмнө бүрэн
 * шалгадаг; энд засварлах зуур шууд харагдах шалгалт л.
 * ========================================================================== */
import katex from "katex";
import { LETTERS, unicodeGlyphs, type DraftKind } from "./parse";

export { LETTERS };
export type { DraftKind };

export interface DraftIssue {
  code: string;
  message: string;
}

export interface BlockContent {
  kind: DraftKind;
  statement: string;
  choices: string[];
  answer: string | null;
  solution: string | null;
  imageKey: string | null;
  tag: string | null;
  points: number;
}

export interface DraftBlock extends BlockContent {
  id: string;
  order: number;
  version: number;
  publishedProblemId: string | null;
  updatedByName: string;
  updatedAt: string;
  issues: DraftIssue[];
}

export interface DraftChapter {
  id: string;
  title: string;
  bookCode: string | null;
  bookTitle: string | null;
}

export type Subject = "MATH" | "SOCIAL_STUDIES" | "SAT";

export interface DraftSetSummary {
  id: string;
  title: string;
  subject: Subject;
  chapterId: string | null;
  chapter: DraftChapter | null;
  topic: string | null;
  count: number;
  status: "DRAFT" | "PUBLISHED";
  publishedAt: string | null;
  publishCount: number;
  publishedTestId: string | null;
  changedSincePublish: boolean;
  createdByName: string;
  createdAt: string;
  updatedByName: string;
  updatedAt: string;
}

export interface DraftEvent {
  id: string;
  actorName: string;
  summary: string;
  at: string;
}

export interface DraftSetFull extends DraftSetSummary {
  blocks: DraftBlock[];
  events: DraftEvent[];
}

export const SUBJECT_LABEL: Record<Subject, string> = {
  MATH: "Математик",
  SOCIAL_STUDIES: "Нийгмийн ухаан",
  SAT: "SAT",
};

export const KIND_LABEL: Record<DraftKind, string> = {
  CHOICE: "Сонгох",
  NUMERIC: "Тоон хариу",
};

const FIELDS = ["kind", "statement", "choices", "answer", "solution", "imageKey", "tag", "points"] as const;

export function contentOf(b: BlockContent): BlockContent {
  return {
    kind: b.kind,
    statement: b.statement,
    choices: [...b.choices],
    answer: b.answer,
    solution: b.solution,
    imageKey: b.imageKey,
    tag: b.tag,
    points: b.points,
  };
}

/** b-д a-аас өөр болсон талбарууд */
export function diffContent(a: BlockContent, b: BlockContent): Partial<BlockContent> {
  const out: Partial<BlockContent> = {};
  for (const f of FIELDS) {
    if (JSON.stringify(a[f] ?? null) !== JSON.stringify(b[f] ?? null)) {
      (out as Record<string, unknown>)[f] = b[f];
    }
  }
  return out;
}

export function sameContent(a: BlockContent, b: BlockContent): boolean {
  return Object.keys(diffContent(a, b)).length === 0;
}

/** $…$ томьёоны эхний алдаа (KaTeX) эсвэл хосгүй $ */
export function latexError(text: string | null | undefined): string | null {
  const source = String(text ?? "");
  const re = /\$\$([\s\S]+?)\$\$|\$([^$]+?)\$/g;
  for (const m of source.matchAll(re)) {
    try {
      katex.renderToString(m[1] ?? m[2], {
        throwOnError: true,
        displayMode: m[1] !== undefined,
        strict: "ignore",
        trust: false,
        maxSize: 20,
        maxExpand: 1000,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return message.replace(/^KaTeX parse error:\s*/, "").slice(0, 120);
    }
  }
  if (source.replace(re, "").includes("$")) return "$ тэмдэгт хосгүй";
  return null;
}

export function normalizeNumeric(raw: string | null | undefined): string | null {
  if (raw === null || raw === undefined) return null;
  let value = String(raw).replace(/\$/g, "").trim();
  if (value.includes("=")) value = value.slice(value.lastIndexOf("=") + 1);
  value = value.replace(/\s+/g, "").replace(/^(-?\d+),(\d+)$/, "$1.$2");
  return /^[-+]?\d+(\.\d+)?$/.test(value) ? value.replace(/^\+/, "") : null;
}

const IMAGE_MARK = /\[\s*Зураг[^\]]*\]/i;

/** Засварлах зуур шууд харагдах шалгалт (серверийн blockIssues-тэй ижил дүрэм) */
export function liveIssues(c: BlockContent): string[] {
  const out: string[] = [];
  if (!c.statement.trim() && !c.imageKey) out.push("Бодлогын өгүүлбэр хоосон");
  if (c.kind === "CHOICE") {
    const n = c.choices.length;
    const filled = c.choices.filter((x) => x.trim()).length;
    if (n < 2 || n > 5) out.push("2–5 сонголттой байна");
    else if (filled === 0 && !c.imageKey) out.push("Сонголтуудыг бичих эсвэл зураг хавсаргана");
    else if (filled > 0 && filled < n) out.push("Хоосон сонголтыг бөглөх эсвэл хасна");
    if (!c.answer) out.push("Зөв хариуг сонгоно");
    else if (LETTERS.indexOf(c.answer as (typeof LETTERS)[number]) >= n) out.push("Зөв хариу сонголтуудад алга");
  } else {
    if (!c.answer?.trim()) out.push("Тоон хариуг бичнэ");
    else if (normalizeNumeric(c.answer) === null) out.push("Хариу зөвхөн тоо байна");
  }
  const texts = [c.statement, ...(c.kind === "CHOICE" ? c.choices : []), c.solution ?? ""];
  const glyphs = [...new Set(texts.flatMap(unicodeGlyphs))];
  if (glyphs.length) out.push("Юникод тэмдэгтийг LaTeX болгоно");
  for (const t of texts) {
    const error = latexError(t);
    if (error) {
      out.push(`Томьёо алдаатай: ${error}`);
      break;
    }
  }
  if (texts.some((t) => IMAGE_MARK.test(t)))
    out.push(c.imageKey ? "[Зураг] бичвэрийг устгана" : "Зураг хавсаргаж, [Зураг] бичвэрийг устгана");
  if (texts.some((t) => t.includes("[Томьёог гараар шалгана уу]"))) out.push("Word-оос ирсэн томьёог засна");
  return out;
}

/** Зураг хавсаргасны дараа «[Зураг]» орлуулгыг өгүүлбэрээс авна */
export function stripImageMark(statement: string): string {
  return statement.replace(/[ \t]*\[\s*Зураг[^\]]*\][ \t]*/gi, " ").replace(/ {2,}/g, " ").trim();
}

export function emptyContent(kind: DraftKind = "CHOICE"): BlockContent {
  return {
    kind,
    statement: "",
    choices: kind === "CHOICE" ? ["", "", "", "", ""] : [],
    answer: null,
    solution: null,
    imageKey: null,
    tag: null,
    points: 1,
  };
}
