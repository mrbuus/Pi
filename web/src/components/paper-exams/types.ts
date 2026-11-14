/* ============================================================================
 * Нэгдсэн шалгалт — төвийн цаасан шалгалт (OMR / Excel) — API-ийн төрлүүд ба цэвэр туслахууд.
 * API: /paper-exams (api/src/paper-exams/), төлөвлөгөө docs/PLAN-OMR.md
 * ========================================================================== */

export const CONTENT_AREAS = [
  "Тоо тоолол",
  "Алгебр",
  "Анализын эхлэл",
  "Геометр ба тригонометр",
  "Магадлал статистик",
] as const;

export const ANSWER_LETTERS = ["A", "B", "C", "D", "E"] as const;

export type ItemStatus = "CORRECT" | "WRONG" | "BLANK" | "MULTI" | "UNGRADED";
/** API нь мөр бүрийн төлөвийг нэг тэмдэгтээр илгээнэ (C/W/B/M/U) */
export const STATUS_OF_CHAR: Record<string, ItemStatus> = {
  C: "CORRECT",
  W: "WRONG",
  B: "BLANK",
  M: "MULTI",
  U: "UNGRADED",
};

export interface PaperExamRow {
  id: string;
  title: string;
  heldOn: string;
  itemCount: number;
  published: boolean;
  keyedCount: number;
  areaCount: number;
  voidedCount: number;
  sheetCount: number;
  unmatchedCount: number;
  avgPct: number | null;
}

export interface PaperItem {
  number: number;
  answerKey: string | null;
  points: number;
  area: string | null;
  /** Сэдэв (бүлэг) — «Модультай тэгшитгэл» … */
  topic: string | null;
  /** Томьёоны сангийн slug-ууд */
  formulaSlugs: string[];
  voided: boolean;
}

/** Бодлогод оноосон томьёо (Томьёоны сангаас) */
export interface FormulaRef {
  slug: string;
  title: string;
  latex: string | null;
}

export type ClassifyBy = "area" | "topic";

export interface AreaScore {
  area: string;
  earned: number;
  possible: number;
  pct: number | null;
}

export interface ItemStat {
  number: number;
  correct: number;
  graded: number;
  pct: number | null;
  topWrong: { letter: string; count: number } | null;
}

export interface BoardRow {
  sheetId: string;
  studentId: string | null;
  code: string;
  lastName: string;
  firstName: string;
  totalScore: number;
  maxScore: number;
  pct: number | null;
  rank: number | null;
  weak: string[];
  areas: { area: string; pct: number | null }[];
  topics: { area: string; pct: number | null }[];
  statuses: string;
  answers: string[];
}

export interface BoardGroup {
  label: string;
  teacher: string | null;
  count: number;
  avgScore: number | null;
  avgPct: number | null;
  items: ItemStat[];
  areas: AreaScore[];
  topics: AreaScore[];
  rows: BoardRow[];
}

export interface Board {
  exam: { id: string; title: string; heldOn: string; itemCount: number; published: boolean };
  scope: "ALL" | "OWN_CLASSES";
  topicsList: { slug: string; name: string }[];
  classifyBy: ClassifyBy;
  formulas: FormulaRef[];
  items: PaperItem[];
  overall: {
    count: number;
    avgScore: number | null;
    avgPct: number | null;
    maxScore: number | null;
    minScore: number | null;
    medianScore: number | null;
    items: ItemStat[];
    areas: AreaScore[];
    topics: AreaScore[];
  };
  groups: BoardGroup[];
  unmatched: BoardRow[];
}

export interface ImportPreviewRow {
  key: number;
  sheetName: string;
  rowNumber: number;
  code: string;
  lastName: string;
  firstName: string;
  groupLabel: string;
  match: "CODE" | "LEGACY" | "NAME" | null;
  student: { id: string; name: string; code: string | null } | null;
  totalScore: number;
  maxScore: number;
  duplicate: boolean;
  replaces: boolean;
  warnings: string[];
}

export interface ImportPreview {
  fileName: string;
  examItemCount: number;
  sheets: { name: string; groupLabel: string; groupTeacher: string | null; itemCount: number; rowCount: number; mode: "LETTERS" | "BINARY" }[];
  skipped: { name: string; reason: string }[];
  blocking: string | null;
  sameFileImportedAt: string | null;
  totals: { rows: number; matched: number; unmatched: number; duplicates: number; replaces: number; warnings: number; willWrite: number };
  noKeyLetters: boolean;
  rows: ImportPreviewRow[];
  saved: boolean;
  importId?: string;
}

export interface ImportHistoryRow {
  id: string;
  fileName: string;
  sheetCount: number;
  matchedCount: number;
  status: "CONFIRMED" | "REVERTED";
  createdAt: string;
  revertedAt: string | null;
  createdBy: string | null;
}

export interface MyPaperExam {
  id: string;
  title: string;
  heldOn: string;
  totalScore: number;
  maxScore: number;
  pct: number | null;
  rank: number;
  participants: number;
}

export interface MyPaperDetail {
  exam: { id: string; title: string; heldOn: string; itemCount: number };
  me: {
    totalScore: number;
    maxScore: number;
    pct: number | null;
    rank: number;
    participants: number;
    group: string;
    weak: string[];
    areas: AreaScore[];
    topics: AreaScore[];
    items: {
      number: number;
      area: string | null;
      topic: string | null;
      formulaSlugs: string[];
      centerPct: number | null;
      points: number;
      status: ItemStatus;
      answer: string | null;
      key: string | null;
    }[];
  };
  center: {
    avgPct: number | null;
    areas: { area: string; pct: number | null }[];
    topics: { area: string; pct: number | null }[];
  };
  classifyBy: ClassifyBy;
  formulas: FormulaRef[];
  ranking: { rank: number; name: string; group: string; totalScore: number; maxScore: number; isMe: boolean }[];
}

/** «2026-11-10» → «2026.11.10» (цагийн бүсгүй өдөр) */
export function dayText(day: string): string {
  return day.replaceAll("-", ".");
}

/** Оноог 1 оронгийн нарийвчлалтай, бүхэл бол бутархайгүй */
export function scoreText(n: number | null | undefined): string {
  if (n === null || n === undefined) return "";
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

/** Нүдэнд харуулах бичвэр: эзний Excel-ийн дагуу зөв = 1; буруу бол сурагчийн үсэг эсвэл 0 */
export function cellText(status: ItemStatus, answer: string | undefined): string {
  if (status === "CORRECT") return "1";
  if (status === "MULTI") return "*";
  if (status === "BLANK") return "";
  if (status === "WRONG") return answer && /^[A-E]$/.test(answer) ? answer : "0";
  return "";
}

export const STATUS_LABEL: Record<ItemStatus, string> = {
  CORRECT: "Зөв",
  WRONG: "Буруу",
  BLANK: "Хариулаагүй",
  MULTI: "Давхар будсан",
  UNGRADED: "Тооцохгүй",
};

export const STATUS_CELL: Record<ItemStatus, string> = {
  CORRECT: "bg-success/15 text-success",
  WRONG: "bg-error/12 text-error",
  BLANK: "bg-error/6 text-ink-dim",
  MULTI: "bg-warning/15 text-warning",
  UNGRADED: "bg-line/30 text-ink-dim",
};

/** Хүснэгтийн толгойд багтах товчлол */
export const AREA_SHORT: Record<string, string> = {
  "Тоо тоолол": "ТТ",
  "Алгебр": "Ал",
  "Анализын эхлэл": "Ан",
  "Геометр ба тригонометр": "ГТ",
  "Магадлал статистик": "МС",
};
export const areaShort = (area: string | null) => (area ? (AREA_SHORT[area] ?? area.slice(0, 2)) : "");

/** Хувийн өнгөний түвшин — одоогийн шалгалтын анализтай ижил (70 / 40) */
export function toneOf(pct: number | null): "success" | "warning" | "danger" | "neutral" {
  if (pct === null) return "neutral";
  if (pct >= 70) return "success";
  if (pct >= 40) return "warning";
  return "danger";
}

export const TONE_CELL: Record<ReturnType<typeof toneOf>, string> = {
  success: "bg-success/15 text-success",
  warning: "bg-warning/15 text-warning",
  danger: "bg-error/12 text-error",
  neutral: "bg-line/30 text-ink-dim",
};

/** БҮТ-ийн дарааллаар, жагсаалтад байхгүй нэр төгсгөлд */
export function orderedAreas(names: string[]): string[] {
  const known = CONTENT_AREAS.filter((a) => names.includes(a)) as string[];
  return [...known, ...names.filter((n) => !(CONTENT_AREAS as readonly string[]).includes(n))];
}

/** Сэдвийн товчлол: «Модультай тэнцэтгэл биш» → «МТБ» */
export function topicShort(topic: string | null): string {
  if (!topic) return "";
  const words = topic.split(/[\s,]+/).filter(Boolean);
  return words.length === 1 ? words[0].slice(0, 3) : words.map((w) => w.charAt(0).toLocaleUpperCase("mn-MN")).join("").slice(0, 4);
}

/** Ангиллын нэр томьёо (сэдэв оноосон бол сэдвээр) */
export const CLASSIFY_LABEL: Record<ClassifyBy, { one: string; weak: string; by: string }> = {
  area: { one: "Агуулга", weak: "Сул агуулга", by: "Агуулгын төрлөөр" },
  topic: { one: "Сэдэв", weak: "Сул сэдэв", by: "Сэдвээр" },
};
