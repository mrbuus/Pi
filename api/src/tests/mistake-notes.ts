/**
 * «Түгээмэл алдаа» — буруу сонголт бүрийн багшийн тайлбар (ProblemChoice.mistakeNote)
 * сурагчийн эргэн харалтад. Цэвэр логик, I/O-гүй.
 *
 * АНХААР: зөвхөн бодолт харагдах эрхтэй үед л дуудна (дуудагч шалгана). Шалгалт
 * өгч байх үеийн хариунд (start / buildProblemViews) хэзээ ч орохгүй.
 * mistakeType, ProblemAnalysis.commonMistakes-ийг сурагчид илгээхгүй.
 */

export interface MistakeNoteView {
  /** Канон үсэг (сонголтын order-оор эрэмбэлсэн A, B, …) */
  label: string;
  /** Сонголтын текст (LaTeX байж болно) — үсэггүй UI-д аль сонголт болохыг харуулна */
  text: string;
  note: string;
  /** Сурагчийн өөрийн сонгосон хариу эсэх */
  mine: boolean;
}

export interface MistakeNoteOption {
  order: number;
  text: string;
  isCorrect: boolean;
  mistakeNote?: string | null;
}

function letterOf(index: number): string {
  return String.fromCharCode(65 + index);
}

/**
 * Буруу, тайлбартай сонголтуудын жагсаалт. Сурагчийн сонгосон нь (mineIndex —
 * order-оор эрэмбэлсэн эх индекс) эхэнд. Тайлбаргүй бол хоосон массив.
 */
export function mistakeNotesOf(
  options: MistakeNoteOption[] | null | undefined,
  mineIndex: number | null,
): MistakeNoteView[] {
  if (!options || options.length === 0) return [];
  const sorted = [...options].sort((a, b) => a.order - b.order);
  const out: MistakeNoteView[] = [];
  sorted.forEach((o, i) => {
    const note = o.mistakeNote?.trim();
    if (!note || o.isCorrect) return;
    out.push({ label: letterOf(i), text: o.text, note, mine: i === mineIndex });
  });
  return out.sort((a, b) => Number(b.mine) - Number(a.mine));
}
