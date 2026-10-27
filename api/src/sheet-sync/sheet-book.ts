// Google Sheets-ийн values:batchGet хариуг Excel импортын (openpyxl) хэлбэртэй
// ижил «book» болгоно: тоо → number, огноо → 'YYYY-MM-DD', текст → string,
// хоосон → null. Хуучин `import-payments-2027.cjs`-ийн задлагч яг энэ хэлбэрийг
// хүлээдэг тул шийтээс уншсан ч, Excel-ээс уншсан ч төлбөрийн түлхүүр ижил гарна.

export type Cell = string | number | null;
export type Book = Record<string, Cell[][] | undefined>;

/** Sheets API-ийн нэг хуудасны түүхий утга (UNFORMATTED ба FORMATTED хоёр хувилбар). */
export interface RawTab {
  title: string;
  unformatted: unknown[][];
  formatted: unknown[][];
}

// Дэлгэцэнд «09/01», «2026-08-16», «6/28/2026» гэх мэт харагдаж буй тоо = огноо.
// «2,000,000» (таслалтай) эсвэл «300000» огноо биш.
const DATE_LIKE = /^\d{1,4}[/.-]\d{1,2}([/.-]\d{1,4})?$/;

/** Google/Excel-ийн огнооны серийн дугаар (1899-12-30-аас хойших өдөр) → ISO. */
export function serialToIso(serial: number): string | null {
  if (!Number.isFinite(serial) || serial < 1 || serial > 2958465) return null;
  const ms = Date.UTC(1899, 11, 30) + Math.floor(serial) * 86_400_000;
  return new Date(ms).toISOString().slice(0, 10);
}

export function toCell(unformatted: unknown, formatted: unknown): Cell {
  if (unformatted == null || unformatted === '') return null;
  if (typeof unformatted === 'number') {
    const shown = typeof formatted === 'string' ? formatted.trim() : '';
    if (DATE_LIKE.test(shown)) return serialToIso(unformatted) ?? unformatted;
    return unformatted;
  }
  if (typeof unformatted === 'boolean') return unformatted ? 'TRUE' : 'FALSE';
  const text = String(unformatted);
  return text.trim() === '' ? null : text;
}

export function toBook(tabs: RawTab[]): Book {
  const book: Book = {};
  for (const tab of tabs) {
    book[tab.title] = tab.unformatted.map((row, r) =>
      (row ?? []).map((value, c) => toCell(value, tab.formatted[r]?.[c])),
    );
  }
  return book;
}

/** 0 → A, 25 → Z, 26 → AA … */
export function colLetter(index: number): string {
  let n = index + 1;
  let out = '';
  while (n > 0) {
    const rem = (n - 1) % 26;
    out = String.fromCharCode(65 + rem) + out;
    n = Math.floor((n - 1) / 26);
  }
  return out;
}

/** Мөрийн хоосон биш нүднүүд → { A: …, B: … } (JSON-д хадгалахад). */
export function rowCells(row: Cell[] | undefined): Record<string, string | number> {
  const out: Record<string, string | number> = {};
  (row ?? []).forEach((value, i) => {
    if (value !== null && value !== '') out[colLetter(i)] = value;
  });
  return out;
}
