/* ============================================================================
 * «Дотоод» — ChatGPT/Word бичвэрийг бодлогын БЛОК болгох задлагч (цэвэр логик,
 * I/O-гүй). Тест: web/tests/internal-parse.test.cjs
 *
 * Гэрээ (guide.ts-ийн prompt яг үүнийг заадаг):
 *
 *   1. Бодлогын өгүүлбэр, томьёо $...$ дотор      ← дугаар = шинэ бодлого
 *   A. сонголт                                     ← A–E, мөр бүрд нэг
 *   B. сонголт                                        (нэг мөрөнд «A. 1  B. 2» ч болно)
 *   Хариу: B                                       ← сонголтгүй бол тоо: «Хариу: 12»
 *   Бодолт: ...                                    ← дараагийн мөрүүд ч бодолтод
 *   Сэдэв: Квадрат тэгшитгэл
 *   Оноо: 2
 *   ---                                            ← бодлого хооронд (заавал биш)
 *
 * Дугааргүй бичвэрт (Word-ын автомат дугаарлалт текстэд ордоггүй) сонголт эсвэл
 * хариуны ДАРАА ирсэн энгийн мөр шинэ бодлого эхлүүлнэ.
 * ChatGPT-ийн зуршлыг засна: \( \) → $ $, \[ \] → $$ $$, ``` хашилт, **Хариу:**,
 * юникод тэмдэгт (π, ², ·) → LaTeX.
 * ========================================================================== */

export type DraftKind = "CHOICE" | "NUMERIC";
export const LETTERS = ["A", "B", "C", "D", "E"] as const;

export interface ParsedBlock {
  kind: DraftKind;
  statement: string;
  /** CHOICE: 2–5 сонголт (A–E дарааллаар). NUMERIC: [] */
  choices: string[];
  /** CHOICE: "A".."E", NUMERIC: тоо (мөр). Танигдаагүй бол null */
  answer: string | null;
  solution: string | null;
  tag: string | null;
  points: number;
  /** Ажилтанд харуулах тэмдэглэл (монголоор) */
  notes: string[];
}

/* ------------------------------ Юникод → LaTeX ------------------------------ */

const SUPERSCRIPT: Record<string, string> = {
  "⁰": "0", "¹": "1", "²": "2", "³": "3", "⁴": "4",
  "⁵": "5", "⁶": "6", "⁷": "7", "⁸": "8", "⁹": "9", "ⁿ": "n",
};
const SUBSCRIPT: Record<string, string> = {
  "₀": "0", "₁": "1", "₂": "2", "₃": "3", "₄": "4",
  "₅": "5", "₆": "6", "₇": "7", "₈": "8", "₉": "9",
};
/** Тэмдэгт → LaTeX (math горимд) */
const GLYPH_TEX: Record<string, string> = {
  "π": "\\pi", "√": "\\sqrt", "∛": "\\sqrt[3]", "·": "\\cdot", "⋅": "\\cdot",
  "×": "\\times", "÷": "\\div", "≤": "\\le", "≥": "\\ge", "≠": "\\ne",
  "±": "\\pm", "∓": "\\mp", "∞": "\\infty", "½": "\\frac{1}{2}",
  "⅓": "\\frac{1}{3}", "⅔": "\\frac{2}{3}", "¼": "\\frac{1}{4}", "¾": "\\frac{3}{4}",
  "∠": "\\angle", "°": "^{\\circ}", "α": "\\alpha", "β": "\\beta", "γ": "\\gamma",
  "δ": "\\delta", "θ": "\\theta", "λ": "\\lambda", "μ": "\\mu", "σ": "\\sigma",
  "φ": "\\varphi", "ω": "\\omega", "Δ": "\\Delta", "Σ": "\\Sigma", "∑": "\\sum",
  "∫": "\\int", "→": "\\to", "⇒": "\\Rightarrow", "⇔": "\\Leftrightarrow",
  "∈": "\\in", "∉": "\\notin", "⊂": "\\subset", "⊆": "\\subseteq", "∪": "\\cup",
  "∩": "\\cap", "∅": "\\varnothing", "≈": "\\approx", "≡": "\\equiv",
  "′": "'", "″": "''", "−": "-",
};
const SUP_RE = /[⁰¹²³⁴⁵⁶⁷⁸⁹ⁿ]+/g;
const SUB_RE = /[₀₁₂₃₄₅₆₇₈₉]+/g;
const GLYPH_CLASS = "π√∛·⋅×÷≤≥≠±∓∞½⅓⅔¼¾∠°αβγδθλμσφωΔΣ∑∫→⇒⇔∈∉⊂⊆∪∩∅≈≡′″−";
const ANY_GLYPH_RE = new RegExp(`[${GLYPH_CLASS}⁰¹²³⁴⁵⁶⁷⁸⁹ⁿ₀₁₂₃₄₅₆₇₈₉]`, "gu");

/** Бичвэрт байгаа хориотой юникод математик тэмдэгтүүд (давхардалгүй) */
export function unicodeGlyphs(text: string | null | undefined): string[] {
  return [...new Set(String(text ?? "").match(ANY_GLYPH_RE) ?? [])];
}

interface Segment {
  math: boolean;
  display: boolean;
  text: string;
}

/** MathText-тэй ижил: $$…$$ (display), дараа нь $…$ (inline) */
function splitMath(text: string): Segment[] {
  const out: Segment[] = [];
  const re = /\$\$([\s\S]+?)\$\$|\$([^$]+?)\$/g;
  let last = 0;
  for (const m of text.matchAll(re)) {
    const at = m.index ?? 0;
    if (at > last) out.push({ math: false, display: false, text: text.slice(last, at) });
    out.push({ math: true, display: m[1] !== undefined, text: m[1] ?? m[2] });
    last = at + m[0].length;
  }
  if (last < text.length) out.push({ math: false, display: false, text: text.slice(last) });
  return out;
}

/** math горим доторх юникодыг LaTeX команд болгоно */
function texify(tex: string): string {
  return tex
    .replace(SUP_RE, (s) => `^{${[...s].map((c) => SUPERSCRIPT[c]).join("")}}`)
    .replace(SUB_RE, (s) => `_{${[...s].map((c) => SUBSCRIPT[c]).join("")}}`)
    .replace(new RegExp(`[${GLYPH_CLASS}]`, "gu"), (c) => {
      const cmd = GLYPH_TEX[c];
      return /^\\[a-zA-Z]+$/.test(cmd) ? `${cmd} ` : cmd;
    })
    .replace(/\\sqrt (\d+|[a-zA-Z])/g, "\\sqrt{$1}")
    .replace(/ +([}^_)\],.])/g, "$1")
    .replace(/ {2,}/g, " ")
    .trim();
}

/**
 * Юникод математик тэмдэгтийг LaTeX болгоно. Энгийн бичвэр доторх «x²»,
 * «πr²», «30°» зэрэг илэрхийллийг $…$ болгож боогоод, хөрш томьёотой нийлүүлнэ
 * («$$» давхардал үүсгэхгүй). Кирилл бичвэр хөндөгдөхгүй.
 */
export function fixUnicodeMath(text: string): string {
  if (!unicodeGlyphs(text).length) return text;
  // Энгийн бичвэр доторх «томьёо шиг» хэсэг: латин үсэг/цифр/тэмдэгтүүдийн
  // дараалал, дор хаяж нэг юникод тэмдэгттэй.
  const run = new RegExp(
    `[ A-Za-z0-9()+\\-=<>/.,${GLYPH_CLASS}⁰¹²³⁴⁵⁶⁷⁸⁹ⁿ₀₁₂₃₄₅₆₇₈₉]*[${GLYPH_CLASS}⁰¹²³⁴⁵⁶⁷⁸⁹ⁿ₀₁₂₃₄₅₆₇₈₉][ A-Za-z0-9()+\\-=<>/${GLYPH_CLASS}⁰¹²³⁴⁵⁶⁷⁸⁹ⁿ₀₁₂₃₄₅₆₇₈₉]*`,
    "gu",
  );
  const pieces: Segment[] = [];
  for (const seg of splitMath(text)) {
    if (seg.math) {
      pieces.push({ ...seg, text: texify(seg.text) });
      continue;
    }
    let last = 0;
    for (const m of seg.text.matchAll(run)) {
      // Хоёр талын зай, төгсгөлийн цэг/таслалыг өгүүлбэрт үлдээнэ
      const lead = m[0].length - m[0].trimStart().length;
      const core = m[0].trim().replace(/[.,]+$/, "").trimEnd();
      const at = (m.index ?? 0) + lead;
      if (!core) continue;
      if (at > last) pieces.push({ math: false, display: false, text: seg.text.slice(last, at) });
      pieces.push({ math: true, display: false, text: texify(core) });
      last = at + core.length;
    }
    if (last < seg.text.length) pieces.push({ math: false, display: false, text: seg.text.slice(last) });
  }
  // Хөрш inline томьёог нийлүүлнэ: «$a$$b$» → «$a b$»
  const merged: Segment[] = [];
  for (const p of pieces) {
    const prev = merged.at(-1);
    if (prev && prev.math && p.math && !prev.display && !p.display) prev.text = `${prev.text} ${p.text}`;
    else if (prev && !prev.math && !p.math) prev.text += p.text;
    else merged.push({ ...p });
  }
  let out = "";
  for (const p of merged) {
    if (!p.math) out += p.text;
    else {
      const piece = p.display ? `$$${p.text}$$` : `$${p.text}$`;
      // display-ийн дараа шууд inline (эсвэл эсрэгээр) «$$$» болохоос сэргийлнэ
      out += out.endsWith("$") ? ` ${piece}` : piece;
    }
  }
  return out;
}

/** \( \) → $ $, \[ \] → $$ $$ (ChatGPT-ийн зуршил) */
export function normalizeDelimiters(text: string): string {
  return text
    .replace(/\\\[([\s\S]+?)\\\]/g, (_, tex: string) => `$$${tex.trim()}$$`)
    .replace(/\\\(([\s\S]+?)\\\)/g, (_, tex: string) => `$${tex.trim()}$`);
}

/* --------------------------------- Задлагч --------------------------------- */

const LABEL_RE =
  /^\**\s*(хариу|хариулт|зөв хариу|answer|бодолт|бодолтын тайлбар|solution|сэдэв|бүлэг|topic|оноо|points)\s*\**\s*[:：]\s*\**\s*(.*?)\s*\**\s*$/i;
const NUMBER_RE = /^\**\s*(?:бодлого\s*|№\s*)?(\d{1,3})\s*[.)]\**(?:\s+(.*))?$/i;
const SEPARATOR_RE = /^(?:-{3,}|_{3,}|\*{3,}|={3,})$/;
const CHOICE_LABEL = "A-EАБВГДЕС";
const CHOICE_START_RE = new RegExp(`^\\(?([${CHOICE_LABEL}])\\s*[.)]\\s*(.*)$`);
const CHOICE_INLINE_RE = new RegExp(`(^|\\s)\\(?([${CHOICE_LABEL}])\\s*[.)](?=\\s|$)`, "g");
const IMAGE_MARK_RE = /\[\s*(?:зураг|figure|image)[^\]]*\]/i;
const WORD_FORMULA = "[Томьёог гараар шалгана уу]";

interface RawChoice {
  label: string;
  text: string;
}

/** «A. $5$   B. $-5$   C. $6$» → гурван сонголт. Томьёон доторх үсгийг хөндөхгүй. */
function splitChoices(line: string): RawChoice[] | null {
  const start = CHOICE_START_RE.exec(line);
  if (!start) return null;
  // Томьёон доторх хэсгийг далдалж байрлалыг хадгална
  const masked = line.replace(/\$[^$]*\$/g, (m) => "\u0001".repeat(m.length));
  const marks: { at: number; end: number; label: string }[] = [];
  for (const m of masked.matchAll(CHOICE_INLINE_RE)) {
    const at = (m.index ?? 0) + m[1].length;
    marks.push({ at, end: (m.index ?? 0) + m[0].length, label: m[2] });
  }
  if (!marks.length || marks[0].at !== 0) return [{ label: start[1], text: start[2].trim() }];
  // Зөвхөн дараалсан үсгүүдээр (A→B→C…) хуваана — «A ба B» мэт бичвэрийг таслахгүй
  const order = (l: string) => {
    const latin = "ABCDE".indexOf(l);
    if (latin >= 0) return latin;
    const homo = "АВСЕ".indexOf(l);
    if (homo >= 0) return [0, 1, 2, 4][homo];
    return "АБВГД".indexOf(l);
  };
  const kept = [marks[0]];
  for (const mark of marks.slice(1)) {
    const prev = kept[kept.length - 1];
    if (order(mark.label) === order(prev.label) + 1 || ("АБВГД".includes(prev.label) && "АБВГД".indexOf(mark.label) === "АБВГД".indexOf(prev.label) + 1))
      kept.push(mark);
  }
  return kept.map((mark, i) => ({
    label: mark.label,
    text: line.slice(mark.end, kept[i + 1]?.at ?? line.length).trim(),
  }));
}

/** Кирилл шошгыг латин руу: «А Б В Г Д» дараалал эсвэл ижил дүрстэй «А В С Е». */
function letterMapper(labels: string[]): (label: string) => string | null {
  const mongolOrder = labels.some((l) => "БГД".includes(l));
  return (label: string) => {
    const upper = label.toUpperCase();
    if ("ABCDE".includes(upper)) return upper;
    if (mongolOrder) {
      const i = "АБВГД".indexOf(upper);
      return i >= 0 ? LETTERS[i] : null;
    }
    const i = "АВСЕ".indexOf(upper);
    return i >= 0 ? ["A", "B", "C", "E"][i] : null;
  };
}

function normalizeNumber(raw: string): string | null {
  let value = raw.replace(/\$/g, "").trim();
  if (value.includes("=")) value = value.slice(value.lastIndexOf("=") + 1);
  value = value.replace(/\s+/g, "").replace(/^(-?\d+),(\d+)$/, "$1.$2").replace(/\.$/, "");
  return /^[-+]?\d+(\.\d+)?$/.test(value) ? value.replace(/^\+/, "") : null;
}

interface Draft {
  /** «1.»-ээр эхэлсэн эсэх — дугаартай бичвэрт дугааргүй тайлбарыг хаяхад */
  numbered: boolean;
  statement: string[];
  choices: RawChoice[];
  answerRaw: string | null;
  solution: string[];
  tag: string | null;
  points: number | null;
}

function cleanLine(line: string): string {
  return line
    .replace(/\t/g, "  ")
    .replace(/^\s*(?:[-*•]\s+|#{1,6}\s+|>\s+)/, "")
    .trimEnd();
}

function trimBlank(lines: string[]): string {
  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

function finish(d: Draft): ParsedBlock | null {
  const statementRaw = trimBlank(d.statement);
  if (!statementRaw && !d.choices.length && !d.answerRaw) return null;
  const notes: string[] = [];
  const map = letterMapper(d.choices.map((c) => c.label));
  const byLetter = new Map<string, string>();
  for (const c of d.choices) {
    const letter = map(c.label);
    if (letter) byLetter.set(letter, c.text);
  }
  const kind: DraftKind = byLetter.size >= 1 ? "CHOICE" : "NUMERIC";
  let choices: string[] = [];
  if (kind === "CHOICE") {
    const last = Math.max(...[...byLetter.keys()].map((l) => LETTERS.indexOf(l as (typeof LETTERS)[number])));
    choices = LETTERS.slice(0, Math.max(last + 1, 2)).map((l) => byLetter.get(l) ?? "");
    const missing = LETTERS.slice(0, last + 1).filter((l) => !byLetter.has(l));
    if (missing.length) notes.push(`${missing.join(", ")} сонголт алга`);
  }
  let answer: string | null = null;
  if (d.answerRaw) {
    const raw = d.answerRaw.replace(/[*$()]/g, " ").trim();
    if (kind === "CHOICE") {
      const letter = /^([A-Ea-eАБВГДЕС])(?![A-Za-zА-Яа-я])/.exec(raw);
      answer = letter ? map(letter[1]) : null;
      if (!answer) {
        // «Хариу: $-5$» — сонголтын утгаар
        const plain = (s: string) => s.replace(/[\s$]/g, "");
        const i = choices.findIndex((c) => c && plain(c) === plain(d.answerRaw ?? ""));
        if (i >= 0) answer = LETTERS[i];
      }
      if (!answer) notes.push("Хариуны үсэг танигдсангүй");
    } else {
      answer = normalizeNumber(d.answerRaw);
      if (answer === null) {
        answer = d.answerRaw.replace(/\$/g, "").trim() || null;
        notes.push("Хариу тоо биш — шалгана уу");
      }
    }
  } else notes.push("Хариу алга");
  const fix = (s: string) => fixUnicodeMath(s);
  const statement = fix(statementRaw);
  const fixedChoices = choices.map(fix);
  const solutionRaw = trimBlank(d.solution);
  const solution = solutionRaw ? fix(solutionRaw) : null;
  if (statement !== statementRaw || fixedChoices.some((c, i) => c !== choices[i]) || (solution ?? "") !== solutionRaw)
    notes.push("Юникод тэмдэгтийг LaTeX болгосон");
  if (IMAGE_MARK_RE.test(statement)) notes.push("Зураг хавсаргана");
  if (statement.includes(WORD_FORMULA) || fixedChoices.some((c) => c.includes(WORD_FORMULA)))
    notes.push("Томьёог гараар засна");
  if (!statement) notes.push("Өгүүлбэр хоосон");
  return {
    kind,
    statement,
    choices: fixedChoices,
    answer,
    solution,
    tag: d.tag,
    points: d.points ?? 1,
    notes,
  };
}

/** Бичвэрийг блокууд болгоно. Хоосон бичвэрт [] */
export function parseDraftText(raw: string): ParsedBlock[] {
  const text = normalizeDelimiters(String(raw ?? "").replace(/\r\n?/g, "\n").replace(/ /g, " "));
  const lines = text.split("\n").filter((l) => !/^\s*```/.test(l));
  const out: { block: ParsedBlock; numbered: boolean; prose: boolean }[] = [];
  const s: { cur: Draft | null; mode: "statement" | "choices" | "after" | "solution" } = {
    cur: null,
    mode: "statement",
  };
  const flush = () => {
    const d = s.cur;
    const block = d ? finish(d) : null;
    if (d && block)
      out.push({ block, numbered: d.numbered, prose: !d.choices.length && !d.answerRaw && !d.solution.length });
    s.cur = null;
    s.mode = "statement";
  };
  const start = (numbered = false): Draft => {
    flush();
    s.cur = { numbered, statement: [], choices: [], answerRaw: null, solution: [], tag: null, points: null };
    return s.cur;
  };
  const current = (): Draft => s.cur ?? start();

  for (const original of lines) {
    const t = cleanLine(original).trim();
    if (!t) {
      if (s.cur && s.mode === "statement") s.cur.statement.push("");
      if (s.cur && s.mode === "solution") s.cur.solution.push("");
      continue;
    }
    if (SEPARATOR_RE.test(t)) {
      flush();
      continue;
    }
    const num = NUMBER_RE.exec(t);
    if (num) {
      const d = start(true);
      if (num[2]?.trim()) d.statement.push(num[2].trim());
      continue;
    }
    const label = LABEL_RE.exec(t);
    if (label) {
      const d = current();
      const key = label[1].toLowerCase();
      const value = label[2].replace(/\*+$/, "").trim();
      if (["хариу", "хариулт", "зөв хариу", "answer"].includes(key)) {
        d.answerRaw = value || null;
        s.mode = "after";
      } else if (["бодолт", "бодолтын тайлбар", "solution"].includes(key)) {
        if (value) d.solution.push(value);
        s.mode = "solution";
      } else if (["сэдэв", "бүлэг", "topic"].includes(key)) {
        d.tag = value.slice(0, 120) || null;
        if (s.mode === "solution") s.mode = "after";
      } else {
        const points = parseInt(value, 10);
        if (points >= 1 && points <= 100) d.points = points;
        if (s.mode === "solution") s.mode = "after";
      }
      continue;
    }
    if (s.mode === "statement" || s.mode === "choices") {
      const choices = splitChoices(t);
      if (choices) {
        current().choices.push(...choices);
        s.mode = "choices";
        continue;
      }
    }
    if (s.mode === "solution") current().solution.push(t);
    // Сонголт/хариуны дараах энгийн мөр — дараагийн (дугааргүй) бодлого
    else if (s.mode === "choices" || s.mode === "after") start().statement.push(t);
    else current().statement.push(t);
  }
  flush();
  // ChatGPT-ийн «Энэ бол таны бодлогууд:» оршил, төгсгөлийн тайлбар: дугаартай
  // бичвэрт дугааргүй, сонголт/хариу/бодолтгүй мөр бодлого биш
  const numbered = out.some((o) => o.numbered);
  return out.filter((o) => !(numbered && !o.numbered && o.prose)).map((o) => o.block);
}

/** Word-ын урьдчилсан харагдацын мөрүүдийг (хүснэгтийн нүд ч) нэг бичвэр болгоно */
export interface WordPreviewBlock {
  text: string;
  rows?: WordPreviewBlock[][][];
}
export function wordBlocksToText(blocks: WordPreviewBlock[]): string {
  const flat = (list: WordPreviewBlock[]): string[] =>
    list.flatMap((b) => (b.rows ? flat(b.rows.flat(2)) : [b.text.replace(/＄/g, "$")]));
  return flat(blocks).join("\n");
}
