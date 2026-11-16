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
  /** Хувилбар бүрийн түлхүүр {"A":"D","B":"B"} */
  answerKeys?: Record<string, string> | null;
  /** «2.1.a-d» — 2-р хэсгийн багц */
  label?: string | null;
  /** Багцын нүдний тоо */
  cells?: number | null;
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
  variant: string | null;
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
  /** Бодлогын тайлбар ачаалсан хувилбарууд («A», «B») — ажилтанд */
  guideVariants: string[];
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
    variant: string;
    weak: string[];
    areas: AreaScore[];
    topics: AreaScore[];
    items: {
      number: number;
      /** «2.1.a-d» — 2-р хэсгийн багц */
      label: string | null;
      cells: number | null;
      /** Энэ бодлогоос авсан оноо */
      earned: number;
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
  /** name = сурагчийн код (нэр харуулахгүй) */
  ranking: { rank: number; rankLabel: string; name: string; group: string; totalScore: number; maxScore: number; isMe: boolean }[];
}

/** Дүнгийн жагсаалт: Дүн | Сурагчийн код | Байр («1-2» — ижил оноотой) */
export interface PaperRanking {
  exam: { id: string; title: string; heldOn: string; published: boolean };
  /** group — анги, зөвхөн ажилтанд ирнэ */
  rows: { score: number; maxScore: number; code: string; rank: string; group?: string }[];
}

/** Бодлогын тайлбар (API: paper-exams/paper-exam-guide.ts GuideContent). Томьёо `$…$`, `$$…$$`. */
export interface GuideContent {
  kind: "choice" | "fill";
  points: number;
  statement: string[];
  image?: string;
  choices?: string[];
  answer?: string;
  fields?: { key: string; value: string; part: number }[];
  parts?: { points: number }[];
  rule: string[];
  easy: string[];
  refs: { chapter: string; test: number; number: string; text: string }[];
  steps: string[];
  topic: string;
}

export interface GuideEntry {
  /** Дэлгэцийн дугаар: «12», «II.3» */
  label: string;
  /** Дүнтэй холбогдох бодлогын дугаар; дүнд ороогүй (нөхөх даалгавар) бол null */
  number: number | null;
  content: GuideContent;
}

export type GuideMark = "CORRECT" | "MISSED" | "UNGRADED";
export interface MyPaperGuide {
  variant: string;
  entries: GuideEntry[];
  /** Зөвхөн сурагчид: бодлого (label) бүрт өөрийнх нь зөв/алдсан */
  marks?: Record<string, GuideMark>;
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

/**
 * Нүдэнд харуулах бичвэр — сурагчийн БИЧСЭН хариу (эзэн 2026-11-15): үсэг A–E, 2-р хэсгийн
 * багцад цифрүүд («_» хоосон нүд → «·»). Зөвхөн зөв/буруугаар ирсэн дүнд 1 / 0.
 */
export function cellText(status: ItemStatus, answer: string | undefined): string {
  const a = (answer ?? "").trim();
  if (status === "MULTI") return "*";
  if (/^[A-E]$/.test(a)) return a;
  if (/^[0-9_*-]{2,}$/.test(a)) return /^_+$/.test(a) ? "" : a.replaceAll("_", "·");
  if (status === "CORRECT") return "1";
  if (status === "WRONG") return "0";
  return "";
}

type Named = { number: number; label?: string | null };

/**
 * Бодлогын нэр (эзэн 2026-11-15): 1–36 → «7»; 2-р хэсгийн багц → «2.3 · 1-р багц».
 * `all` өгвөл тухайн бодлогын хэд дэх багц болохыг тоолно, үгүй бол «2.3 · a-b».
 */
export function itemName(it: Named, all?: Named[]): string {
  const m = it.label?.match(/^(\d+\.\d+)\.([a-h](?:-[a-h])?)$/i);
  if (!m) return String(it.number);
  if (!all) return `${m[1]} · ${m[2]}`;
  const same = all.filter((x) => x.label?.startsWith(`${m[1]}.`)).sort((a, b) => a.number - b.number);
  return `${m[1]} · ${same.findIndex((x) => x.number === it.number) + 1}-р багц`;
}

/** «7-р бодлого» эсвэл «2.3 · 1-р багц» */
export function itemTitle(it: Named, all?: Named[]): string {
  return it.label ? itemName(it, all) : `${it.number}-р бодлого`;
}

export const STATUS_LABEL: Record<ItemStatus, string> = {
  CORRECT: "Зөв",
  WRONG: "Алдсан",
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

/** Сурагчийн алдсан бодлого — нөхцөл, сонголт л (зөв хариу, бодолт серверээс шат шатаар) */
export interface StudentGuideEntry {
  label: string;
  number: number | null;
  content: {
    kind: "choice" | "fill";
    points: number;
    statement: string[];
    image?: string;
    choices?: string[];
    fields?: { key: string; part: number }[];
    parts?: { points: number }[];
    topic: string;
    stepCount: number;
  };
}

export interface StudentGuide {
  variant: string;
  entries: StudentGuideEntry[];
}

/** Нэг шатанд нээгдсэн хэсгүүд (paper-exam-student.ts guideStage) */
export interface GuideStageData {
  stage: number;
  rule?: string[];
  easy?: string[];
  refs?: GuideContent["refs"];
  steps?: string[];
  answer?: string;
  fields?: { key: string; value: string; part: number }[];
}

export interface PaperMaterial {
  variant: string;
  pages: string[];
  /** Зөвхөн сурагчид: өөрийн хувилбар ба материалтай бүх хувилбар */
  own?: string;
  variants?: string[];
}

/**
 * Нэр «Э. Мандахнаран» — овгийн эхний үсэг (эзэн 2026-11-15). Овгийн эхний үсэг, нэр нь
 * давхцсан өөр хүн байвал л овгийг бүтнээр. `rows` — жагсаалтын бүх хүн.
 */
export function makeNamer(rows: { lastName: string; firstName: string }[]) {
  const key = (l: string, f: string) => `${l.trim().charAt(0)}|${f.trim()}`;
  const lastsBy = new Map<string, Set<string>>();
  for (const r of rows) {
    const k = key(r.lastName, r.firstName);
    lastsBy.set(k, (lastsBy.get(k) ?? new Set()).add(r.lastName.trim()));
  }
  return (lastName: string, firstName: string) => {
    const l = lastName.trim();
    if (!l) return firstName;
    return (lastsBy.get(key(l, firstName))?.size ?? 0) > 1 ? `${l} ${firstName}` : `${l.charAt(0)}. ${firstName}`;
  };
}
export const shortName = (lastName: string, firstName: string) => makeNamer([])(lastName, firstName);
