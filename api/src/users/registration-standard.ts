import ExcelJS from 'exceljs';

/**
 * Бүртгэлийн Excel-ийн (БҮРТГЭЛ-2027) стандарт — вэбээс татах Excel ба (дараа нь) Google Sheet-ийн
 * синк ИЖИЛ байрлал, ИЖИЛ толгойтой (эзэн 2026-11-03). Багана нь ЦОГЦООР (байрлалаар) уншигдана.
 *   0 №  1 Овог  2 нэр  3 анги  4 өөр  5 аав  6 ээж  7 сургууль  8 с.т анги
 *   9 эхэлсэн (ММ/ӨӨ)  10 төлбөр  11 шинэ/хуучин  12 нэмэлт тайлбар (салбар)
 */
export const ACTIVE_HEADERS = [
  '№',
  'Овог',
  'нэр',
  'анги',
  'өөр',
  'аав',
  'ээж',
  'сургууль',
  'с.т анги',
  'эхэлсэн',
  'төлбөр',
  'шинэ/хуучин',
  'нэмэлт тайлбар',
] as const;

/** «ГАРСАН» таб */
export const LEFT_HEADERS = [
  '№',
  'Овог',
  'нэр',
  'анги',
  'өөр',
  'аав',
  'ээж',
  'сургууль',
  'Нэмэлт тайлбар',
  'төлбөр',
  'Ирсэн өдөр',
  'Гарсан өдөр',
] as const;

export interface RegistrationRow {
  lastName: string;
  firstName: string;
  grade: number | null;
  ownPhone: string | null;
  fatherPhone: string | null;
  motherPhone: string | null;
  school: string | null;
  section: string | null;
  joinedOn: Date | null;
  leftOn: Date | null;
  tuitionAmount: number | null;
  branch: string | null;
}

/** Анги → таб (эх Excel-ийн табууд) */
export function tabOfGrade(grade: number | null): string {
  if (grade === 12) return '12-р анги';
  if (grade === 11) return '11-р анги';
  if (grade === 9 || grade === 10) return '9,10-р анги';
  return 'Бусад анги';
}

/** @db.Date (UTC 00:00) → «ММ/ӨӨ» (эх Excel-ийн «09/01») */
export function monthDay(d: Date | null): string | null {
  if (!d) return null;
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  return `${mm}/${dd}`;
}

const gradeText = (g: number | null) => (g ? `${g}-р анги` : null);

/** «12-4» < «12-10»: ангийн шошгыг тоогоор эрэмбэлнэ */
function sectionOrder(s: string | null): [number, number] {
  const m = /^(\d+)-(\d+)/.exec(s ?? '');
  return m ? [Number(m[1]), Number(m[2])] : [999, 999];
}

export function sortRegistration(rows: RegistrationRow[]): RegistrationRow[] {
  return [...rows].sort((a, b) => {
    const [ag, an] = sectionOrder(a.section);
    const [bg, bn] = sectionOrder(b.section);
    return (
      ag - bg ||
      an - bn ||
      a.lastName.localeCompare(b.lastName, 'mn') ||
      a.firstName.localeCompare(b.firstName, 'mn')
    );
  });
}

function addSheet(
  wb: ExcelJS.Workbook,
  name: string,
  headers: readonly string[],
  rows: (string | number | null)[][],
) {
  const ws = wb.addWorksheet(name, { views: [{ state: 'frozen', ySplit: 1 }] });
  ws.addRow([...headers]).font = { bold: true };
  for (const r of rows) ws.addRow(r);
  const widths = [5, 16, 16, 11, 11, 11, 11, 16, 10, 10, 10, 12, 16, 12];
  headers.forEach((_, i) => {
    ws.getColumn(i + 1).width = widths[i] ?? 12;
  });
  // Утас, огноо текст хэвээр (эхний 0, томьёо болохгүй)
  for (const c of [5, 6, 7]) ws.getColumn(c).numFmt = '@';
  return ws;
}

/** Идэвхтэй сурагчид ангийн табаар, гарсан нь «ГАРСАН» табд — эх Excel-тэй ижил бүтэц */
export function buildRegistrationWorkbook(
  active: RegistrationRow[],
  left: RegistrationRow[],
): ExcelJS.Workbook {
  const wb = new ExcelJS.Workbook();
  const byTab = new Map<string, RegistrationRow[]>();
  for (const r of sortRegistration(active)) {
    const tab = tabOfGrade(r.grade);
    byTab.set(tab, [...(byTab.get(tab) ?? []), r]);
  }
  const tabOrder = ['12-р анги', '11-р анги', '9,10-р анги', 'Бусад анги'];
  for (const tab of tabOrder) {
    const list = byTab.get(tab);
    if (!list?.length && tab === 'Бусад анги') continue;
    addSheet(
      wb,
      tab,
      ACTIVE_HEADERS,
      (list ?? []).map((r, i) => [
        i + 1,
        r.lastName,
        r.firstName,
        gradeText(r.grade),
        r.ownPhone,
        r.fatherPhone,
        r.motherPhone,
        r.school,
        r.section,
        monthDay(r.joinedOn),
        r.tuitionAmount,
        null, // шинэ/хуучин — системд хадгалагддаггүй
        r.branch,
      ]),
    );
  }
  addSheet(
    wb,
    'ГАРСАН',
    LEFT_HEADERS,
    sortRegistration(left).map((r, i) => [
      i + 1,
      r.lastName,
      r.firstName,
      gradeText(r.grade),
      r.ownPhone,
      r.fatherPhone,
      r.motherPhone,
      r.school,
      r.section,
      r.tuitionAmount,
      monthDay(r.joinedOn),
      monthDay(r.leftOn),
    ]),
  );
  return wb;
}
