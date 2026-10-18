/* ============================================================================
 * «Томьёо» блокийн цэвэр (UI-гүй) туслахууд — засварлагчийн хэрэгслийн мөр,
 * агуулгыг «томьёо + Жишээ бодлого» хэсэгт задлах/нийлүүлэх.
 * ========================================================================== */

/** Жишээ бодлогын хэсгийн гарчиг — TheoryContent-д «##» дэд гарчиг болж харагдана */
export const EXAMPLE_HEADING = "## Жишээ бодлого";

export function splitFormulaContent(content: string): { formulas: string; example: string } {
  const lines = (content ?? "").replace(/\r\n/g, "\n").split("\n");
  const at = lines.findIndex((l) => l.trim() === EXAMPLE_HEADING);
  if (at < 0) return { formulas: (content ?? "").trim(), example: "" };
  return {
    formulas: lines.slice(0, at).join("\n").trim(),
    example: lines.slice(at + 1).join("\n").trim(),
  };
}

export function composeFormulaContent(formulas: string, example: string): string {
  const f = formulas.trim();
  const e = example.trim();
  return [f, e ? `${EXAMPLE_HEADING}\n\n${e}` : ""].filter(Boolean).join("\n\n");
}

/**
 * Курсор $…$ эсвэл $$…$$ дотор байгаа эсэх (MathText-ийн задлалттай ижил:
 * эхлээд $$, дараа нь $). `\$`-ыг алгасна.
 */
export function insideMath(text: string, pos: number): boolean {
  let mode: null | "$" | "$$" = null;
  for (let i = 0; i < pos; i++) {
    const ch = text[i];
    if (ch === "\\") {
      i++;
      continue;
    }
    if (ch !== "$") continue;
    const double = text[i + 1] === "$" && i + 1 < pos;
    if (mode === null) {
      mode = double ? "$$" : "$";
      if (double) i++;
    } else if (mode === "$$") {
      if (double) {
        mode = null;
        i++;
      }
    } else {
      mode = null;
    }
  }
  return mode !== null;
}

export interface Snippet {
  /** Сонгосон текстийн өмнө */
  before: string;
  /** Сонгосон текстийн дараа */
  after: string;
  /** Юу ч сонгоогүй үед дотор нь тавих (тэгээд сонгогдсон үлдэнэ) */
  placeholder?: string;
  /** Сонголт нь суурь: «x» → «x^{2}» (зэрэг, индекс, градус) */
  selectionIsBase?: boolean;
  /** $…$-аар автоматаар хүрээлэхгүй (томьёоны хүрээ өөрөө) */
  raw?: boolean;
}

/**
 * Хэрэгслийн товчны оруулга. Курсор томьёоны гадна байвал $…$-аар хүрээлнэ —
 * багш «$» бичихээ мартсан ч томьёо зөв харагдана.
 * Буцаах: шинэ бичвэр + дараа нь сонгох муж (placeholder-ийг сонгоно).
 */
export function applySnippet(
  value: string,
  start: number,
  end: number,
  snip: Snippet,
): { value: string; selStart: number; selEnd: number } {
  const selected = value.slice(start, end);
  const wrap = !snip.raw && !insideMath(value, start);
  const open = wrap ? "$" : "";
  const close = wrap ? "$" : "";
  let text: string;
  let selStart: number;
  let selEnd: number;
  if (snip.selectionIsBase) {
    const inner = snip.placeholder ?? "";
    text = `${open}${selected}${snip.before}${inner}${snip.after}${close}`;
    selStart = start + open.length + selected.length + snip.before.length;
    selEnd = selStart + inner.length;
  } else {
    const inner = selected || snip.placeholder || "";
    text = `${open}${snip.before}${inner}${snip.after}${close}`;
    selStart = start + open.length + snip.before.length;
    selEnd = selStart + inner.length;
    // Хоосон оруулга (≤, \cdot) — курсорыг төгсгөлд нь
    if (!inner) selStart = selEnd = start + text.length - close.length;
  }
  return { value: value.slice(0, start) + text + value.slice(end), selStart, selEnd };
}

/** Кирилл үсэгтэй сонголтыг math горимд \text{}-ээр хүрээлнэ (KaTeX кириллийг шууд зурдаггүй) */
export function colorSnippet(hex: string, selected: string): Snippet {
  const cyrillic = /[Ѐ-ӿ]/.test(selected) && !/^\\text\{/.test(selected.trim());
  return cyrillic
    ? { before: `\\textcolor{${hex}}{\\text{`, after: "}}", placeholder: "x" }
    : { before: `\\textcolor{${hex}}{`, after: "}", placeholder: "x" };
}

/**
 * Өнгө: KaTeX нь CSS хувьсагч хүлээж авдаггүй тул тогтмол hex. Цагаан ба
 * бараан горимд хоёуланд нь ≥3:1 тодролтой дунд өнгө (шар/алтан ХОРИОТОЙ).
 */
export const FORMULA_COLORS: { name: string; hex: string }[] = [
  { name: "Цэнхэр", hex: "#3B6FE0" },
  { name: "Улаан", hex: "#DC2626" },
  { name: "Ногоон", hex: "#15803D" },
  { name: "Нил ягаан", hex: "#8B5CF6" },
  { name: "Саарал", hex: "#6B7280" },
];
