/* ============================================================================
 * «Томьёо» хэрэгслийн цэвэр логик (React-гүй, импортгүй):
 *   - /tools/formulas.json-ийн бүтцийг шалгаж, хэвийн болгох
 *   - LaTeX-ийг MathText-д тохирох `$...$` хэлбэрт оруулах
 *   - Бүлэг/анги/түвшний шүүлт, бүлэг тус бүрийн тоо
 *   - Хайлт: монгол үг (ү/у, ө/о ялгаагүй), LaTeX тэмдэгт, гарчиг — оноогоор эрэмбэлнэ
 *   - «Миний хуудас» сагсны туслах функц
 * Тест: node --test src/components/tools/formula/
 * ========================================================================== */

export type Level = "CORE" | "EXTRA";

export interface SheetExample {
  problem: string;
  steps: string[];
  answer: string;
}

export interface SheetFormula {
  slug: string;
  title: string;
  section: string;
  order: number;
  grade: number;
  level: Level;
  latex: string;
  general?: string;
  conditions: string[];
  explanation: string;
  mnemonic: string;
  eeshTip: string;
  examples: SheetExample[];
  commonMistakes: string[];
  keywords: string[];
  widget: string | null;
  variants?: { label: string; latex: string }[];
}

export interface SheetSection {
  slug: string;
  title: string;
  order: number;
  description: string;
  count: number;
}

export interface FormulaSheet {
  version: number;
  sections: SheetSection[];
  formulas: SheetFormula[];
}

/** Бүлгийн богино нэр (чипэнд багтана). Мэдэгдээгүй бүлэгт бүтэн гарчиг */
export const SECTION_SHORT: Record<string, string> = {
  "numbers-algebra": "Тоо, алгебр",
  "equations-inequalities": "Тэгшитгэл",
  "functions-exp-log": "Функц, логарифм",
  trigonometry: "Тригонометр",
  "sequences-combinatorics-probability": "Прогресс, магадлал",
  calculus: "Уламжлал, интеграл",
  "plane-geometry": "Хавтгайн геометр",
  "solid-geometry-vectors-coordinates": "Огторгуй, вектор",
};

export function sectionLabel(s: Pick<SheetSection, "slug" | "title">): string {
  return SECTION_SHORT[s.slug] ?? s.title;
}

/* ---------------------------------------------------------------- шалгалт */

const isStr = (v: unknown): v is string => typeof v === "string";
const strArr = (v: unknown): string[] => (Array.isArray(v) ? v.filter((s): s is string => isStr(s) && s.trim() !== "") : []);

/**
 * Сүлжээнээс ирсэн JSON-ийг шалгаж, хэвийн бүтэц болгоно.
 * Бүтэц огт таарахгүй бол null (UI алдааны төлөв харуулна); буруу мөрийг алгасна.
 */
export function parseSheet(json: unknown): FormulaSheet | null {
  if (!json || typeof json !== "object") return null;
  const raw = json as { version?: unknown; sections?: unknown; formulas?: unknown };
  if (!Array.isArray(raw.sections) || !Array.isArray(raw.formulas)) return null;
  const sections: SheetSection[] = [];
  for (const s of raw.sections as Record<string, unknown>[]) {
    if (!s || !isStr(s.slug) || !isStr(s.title)) continue;
    sections.push({
      slug: s.slug,
      title: s.title,
      order: typeof s.order === "number" ? s.order : 999,
      description: isStr(s.description) ? s.description : "",
      count: 0,
    });
  }
  const known = new Set(sections.map((s) => s.slug));
  const seen = new Set<string>();
  const formulas: SheetFormula[] = [];
  for (const f of raw.formulas as Record<string, unknown>[]) {
    if (!f || !isStr(f.slug) || !isStr(f.title) || !isStr(f.latex) || !f.latex.trim()) continue;
    if (seen.has(f.slug) || !isStr(f.section) || !known.has(f.section)) continue;
    seen.add(f.slug);
    const examples = Array.isArray(f.examples)
      ? (f.examples as Record<string, unknown>[])
          .filter((e) => e && isStr(e.problem))
          .map((e) => ({ problem: e.problem as string, steps: strArr(e.steps), answer: isStr(e.answer) ? e.answer : "" }))
      : [];
    const variants = Array.isArray(f.variants)
      ? (f.variants as Record<string, unknown>[])
          .filter((v) => v && isStr(v.latex) && v.latex.trim() !== "")
          .map((v) => ({ label: isStr(v.label) ? v.label : "", latex: v.latex as string }))
      : [];
    const grade = typeof f.grade === "number" && f.grade >= 7 && f.grade <= 12 ? Math.round(f.grade) : 12;
    formulas.push({
      slug: f.slug,
      title: f.title,
      section: f.section,
      order: typeof f.order === "number" ? f.order : 0,
      grade,
      level: f.level === "EXTRA" ? "EXTRA" : "CORE",
      latex: f.latex,
      general: isStr(f.general) && f.general.trim() ? f.general : undefined,
      conditions: strArr(f.conditions),
      explanation: isStr(f.explanation) ? f.explanation : "",
      mnemonic: isStr(f.mnemonic) ? f.mnemonic : "",
      eeshTip: isStr(f.eeshTip) ? f.eeshTip : "",
      examples,
      commonMistakes: strArr(f.commonMistakes),
      keywords: strArr(f.keywords),
      widget: isStr(f.widget) && f.widget ? f.widget : null,
      variants: variants.length ? variants : undefined,
    });
  }
  sections.sort((a, b) => a.order - b.order);
  for (const s of sections) s.count = formulas.filter((f) => f.section === s.slug).length;
  return { version: typeof raw.version === "number" ? raw.version : 1, sections, formulas };
}

/** Бүрэн бүтэн байдлын шалгалт (тест, скрипт): алдааны жагсаалт, хоосон бол зөв */
export function checkSheet(json: unknown): string[] {
  const errs: string[] = [];
  const raw = json as { sections?: unknown; formulas?: unknown };
  if (!raw || !Array.isArray(raw.sections) || !Array.isArray(raw.formulas)) return ["бүтэц буруу"];
  const secs = new Set((raw.sections as { slug?: string }[]).map((s) => s.slug));
  const seen = new Set<string>();
  for (const f of raw.formulas as Record<string, unknown>[]) {
    const slug = isStr(f.slug) ? f.slug : "";
    if (!slug) errs.push("slug хоосон");
    else if (seen.has(slug)) errs.push(`давхардсан slug: ${slug}`);
    seen.add(slug);
    if (!isStr(f.latex) || !f.latex.trim()) errs.push(`${slug}: latex хоосон`);
    if (!isStr(f.title) || !f.title.trim()) errs.push(`${slug}: гарчиг хоосон`);
    if (!secs.has(f.section as string)) errs.push(`${slug}: үл мэдэгдэх бүлэг`);
    if (typeof f.grade !== "number" || f.grade < 7 || f.grade > 12) errs.push(`${slug}: анги буруу`);
    if (f.level !== "CORE" && f.level !== "EXTRA") errs.push(`${slug}: түвшин буруу`);
    if (isStr(f.latex) && /(^|[^\\])\$/.test(f.latex)) errs.push(`${slug}: latex дотор $ байна`);
  }
  return errs;
}

/* ---------------------------------------------------------------- LaTeX */

/** Томьёоны latex талбар (`$`-гүй) → MathText-ийн мөр доторх `$...$` */
export function inlineMath(latex: string): string {
  const s = latex.trim();
  if (!s) return "";
  return hasDollar(s) ? s : `$${s}$`;
}

/** Томьёоны latex → тусдаа мөрийн `$$...$$` (карт, проектор) */
export function displayMath(latex: string): string {
  const s = latex.trim();
  if (!s) return "";
  return hasDollar(s) ? s : `$$${s}$$`;
}

/** Нөхцөл бол цэвэр LaTeX (`\text{…}`-тэй) — `$` байхгүй бол боож өгнө */
export function conditionMath(c: string): string {
  return inlineMath(c);
}

function hasDollar(s: string): boolean {
  return /(^|[^\\])\$/.test(s);
}

/* ---------------------------------------------------------------- шүүлт */

export type GradeMode = "only" | "upto";

export interface FormulaFilter {
  /** "all" эсвэл бүлгийн slug */
  section: string;
  /** 0 = бүх анги, 7..12 */
  grade: number;
  /** only: яг тэр анги, upto: тэр анги хүртэл (хуримтлагдсан) */
  gradeMode: GradeMode;
  level: "all" | Level;
  query: string;
}

export const DEFAULT_FILTER: FormulaFilter = { section: "all", grade: 0, gradeMode: "only", level: "all", query: "" };

export function matchesGrade(f: Pick<SheetFormula, "grade">, grade: number, mode: GradeMode): boolean {
  if (!grade) return true;
  return mode === "upto" ? f.grade <= grade : f.grade === grade;
}

/** Бүлгээс бусад шүүлт (хайлтгүй) — бүлгийн чип дээрх тоонд хэрэглэнэ */
function passesBase(f: SheetFormula, flt: FormulaFilter): boolean {
  if (!matchesGrade(f, flt.grade, flt.gradeMode)) return false;
  if (flt.level !== "all" && f.level !== flt.level) return false;
  return true;
}

export interface FilterResult {
  items: SheetFormula[];
  /** Бүлэг бүрийн тоо (бүлгийн шүүлтээс бусдыг тооцсон) + "all" */
  counts: Record<string, number>;
}

/** Шүүх + хайх. Хайлттай бол оноогоор, үгүй бол бүлэг/дарааллаар */
export function filterFormulas(sheet: FormulaSheet, flt: FormulaFilter): FilterResult {
  const q = prepareQuery(flt.query);
  const secRank = new Map(sheet.sections.map((s, i) => [s.slug, i]));
  const counts: Record<string, number> = { all: 0 };
  for (const s of sheet.sections) counts[s.slug] = 0;
  const scored: { f: SheetFormula; score: number }[] = [];
  for (const f of sheet.formulas) {
    if (!passesBase(f, flt)) continue;
    const score = q ? scoreFormula(f, q) : 1;
    if (score <= 0) continue;
    counts.all++;
    counts[f.section] = (counts[f.section] ?? 0) + 1;
    if (flt.section !== "all" && f.section !== flt.section) continue;
    scored.push({ f, score });
  }
  scored.sort(
    (a, b) =>
      b.score - a.score ||
      (secRank.get(a.f.section) ?? 99) - (secRank.get(b.f.section) ?? 99) ||
      a.f.order - b.f.order ||
      a.f.slug.localeCompare(b.f.slug),
  );
  return { items: scored.map((s) => s.f), counts };
}

/* ---------------------------------------------------------------- хайлт */

/** Кирилл/латин жижиг үсэг, илүү зайгүй */
export function normText(s: string): string {
  return s
    .toLocaleLowerCase("mn")
    .replace(/ё/g, "е")
    .replace(/[«»"'“”.,;:!?()]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** ү→у, ө→о: тусгай үсэггүй гараар бичсэн хайлтыг ч олно */
export function foldText(s: string): string {
  return normText(s).replace(/ү/g, "у").replace(/ө/g, "о");
}

/**
 * LaTeX-ийг харьцуулах хэлбэрт: зай, `\left \right`, `\,`, хаалт `{}`,
 * урвуу налуу зураасыг авч хаяна. «\sin^{2}x» → «sin^2x», «x^2 + y^2» → «x^2+y^2»
 */
export function normLatex(s: string): string {
  return s
    .replace(/\\(left|right|displaystyle|limits|big|Big|bigg|Bigg)\b/g, "")
    .replace(/\\[,;:!> ]/g, "")
    .replace(/\\operatorname\{([^}]*)\}/g, "$1")
    .replace(/\\(mathrm|text|mathit|mathbf)\{([^}]*)\}/g, "$2")
    .replace(/\\cdot|\\times/g, "*")
    .replace(/\\dfrac|\\tfrac/g, "frac")
    .replace(/[{}\s\\$]/g, "")
    .toLowerCase();
}

interface Query {
  raw: string;
  norm: string;
  fold: string;
  tokens: string[];
  folds: string[];
  latex: string;
  /** LaTeX маягийн хайлт эсэх (\, ^, _, =, тоо+үсэг г.м.) */
  mathy: boolean;
}

export function prepareQuery(input: string): Query | null {
  const raw = input.trim();
  if (!raw) return null;
  const norm = normText(raw);
  const fold = foldText(raw);
  const tokens = norm.split(" ").filter(Boolean);
  const folds = fold.split(" ").filter(Boolean);
  const latex = normLatex(raw);
  const mathy = /[\\^_=+*/<>|]/.test(raw) || /^[a-z0-9()]+$/i.test(raw.replace(/\s/g, ""));
  if (!tokens.length && !latex) return null;
  return { raw, norm, fold, tokens, folds, latex, mathy };
}

/** Үгийн эхлэлд таарсан эсэх (дунд хэсгийн таарцаас өндөр оноо) */
function wordStart(hay: string, needle: string): boolean {
  if (hay.startsWith(needle)) return true;
  return hay.includes(" " + needle);
}

/** Нэг үгийн хамгийн сайн оноо — 0 бол олдсонгүй */
function tokenScore(tok: string, fold: string, f: Indexed): number {
  let best = 0;
  const check = (hay: string, hayFold: string, start: number, contain: number) => {
    if (wordStart(hay, tok)) best = Math.max(best, start);
    else if (hay.includes(tok)) best = Math.max(best, contain);
    else if (wordStart(hayFold, fold)) best = Math.max(best, start - 4);
    else if (hayFold.includes(fold)) best = Math.max(best, contain - 4);
  };
  check(f.title, f.titleFold, 30, 22);
  check(f.keywords, f.keywordsFold, 18, 14);
  check(f.text, f.textFold, 8, 5);
  if (tok.length >= 2 && f.latex.includes(normLatex(tok))) best = Math.max(best, 12);
  return best;
}

interface Indexed {
  title: string;
  titleFold: string;
  keywords: string;
  keywordsFold: string;
  text: string;
  textFold: string;
  latex: string;
}

const indexCache = new WeakMap<SheetFormula, Indexed>();

function indexOf(f: SheetFormula): Indexed {
  let ix = indexCache.get(f);
  if (ix) return ix;
  const text = [f.explanation, f.mnemonic, f.eeshTip, ...f.conditions.map(stripTex), ...f.commonMistakes.map(stripTex)].join(" ");
  const latexAll = [f.latex, f.general ?? "", ...(f.variants ?? []).map((v) => v.latex)].join(" ");
  ix = {
    title: normText(f.title),
    titleFold: foldText(f.title),
    keywords: normText(f.keywords.join(" ")),
    keywordsFold: foldText(f.keywords.join(" ")),
    text: normText(text),
    textFold: foldText(text),
    latex: normLatex(latexAll),
  };
  indexCache.set(f, ix);
  return ix;
}

/** `\text{нь}` доторх үгийг хайлтад оруулна, бусад командыг хасна */
function stripTex(s: string): string {
  return s.replace(/\\text\{([^}]*)\}/g, " $1 ").replace(/\$/g, " ");
}

/**
 * Томьёоны оноо (0 = таарахгүй). Олон үгтэй бол БҮХ үг аль нэг талбарт
 * таарах ёстой. LaTeX маягийн хайлтыг томьёоны биед тусад нь шалгана.
 */
export function scoreFormula(f: SheetFormula, q: Query): number {
  const ix = indexOf(f);
  let latexScore = 0;
  if (q.latex.length >= 1 && q.mathy) {
    if (ix.latex === q.latex) latexScore = 90;
    else if (ix.latex.startsWith(q.latex)) latexScore = 70;
    else if (q.latex.length >= 2 && ix.latex.includes(q.latex)) latexScore = 55;
  }
  let textScore = 0;
  if (q.tokens.length) {
    let sum = 0;
    for (let i = 0; i < q.tokens.length; i++) {
      const s = tokenScore(q.tokens[i], q.folds[i] ?? q.tokens[i], ix);
      if (!s) {
        sum = 0;
        break;
      }
      sum += s;
    }
    if (sum) {
      if (ix.title === q.norm) sum += 60;
      else if (ix.title.startsWith(q.norm)) sum += 35;
      else if (q.tokens.length > 1 && ix.title.includes(q.norm)) sum += 20;
    }
    textScore = sum;
  }
  return Math.max(latexScore, textScore);
}

/* ---------------------------------------------------------------- сагс */

export function toggleSlug(list: string[], slug: string): string[] {
  return list.includes(slug) ? list.filter((s) => s !== slug) : [...list, slug];
}

export function moveSlug(list: string[], slug: string, dir: -1 | 1): string[] {
  const i = list.indexOf(slug);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= list.length) return list;
  const next = list.slice();
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}

/** Сагсны slug-уудыг томьёо болгоно (устсан/мэдэгдэхгүйг алгасна, дарааллыг хадгална) */
export function resolveBasket(sheet: FormulaSheet, slugs: string[]): SheetFormula[] {
  const by = new Map(sheet.formulas.map((f) => [f.slug, f]));
  const out: SheetFormula[] = [];
  for (const s of slugs) {
    const f = by.get(s);
    if (f) out.push(f);
  }
  return out;
}

/** Хадгалсан шүүлтийг хэвийн болгоно (хуучин/эвдэрсэн localStorage) */
export function sanitizeFilter(v: Partial<FormulaFilter> | null | undefined, sections: string[]): FormulaFilter {
  const f = { ...DEFAULT_FILTER, ...(v ?? {}) };
  return {
    section: f.section === "all" || sections.includes(f.section) ? f.section : "all",
    grade: Number.isInteger(f.grade) && f.grade >= 7 && f.grade <= 12 ? f.grade : 0,
    gradeMode: f.gradeMode === "upto" ? "upto" : "only",
    level: f.level === "CORE" || f.level === "EXTRA" ? f.level : "all",
    query: typeof f.query === "string" ? f.query.slice(0, 120) : "",
  };
}
