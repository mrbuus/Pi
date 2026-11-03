import ExcelJS from 'exceljs';
import {
  ACTIVE_HEADERS,
  LEFT_HEADERS,
  buildRegistrationWorkbook,
  monthDay,
  tabOfGrade,
  type RegistrationRow,
} from './registration-standard';

const row = (o: Partial<RegistrationRow>): RegistrationRow => ({
  lastName: 'Бат',
  firstName: 'Дорж',
  grade: 12,
  ownPhone: '99112233',
  fatherPhone: null,
  motherPhone: '88001122',
  school: '24-р сургууль',
  section: '12-4',
  joinedOn: new Date('2026-09-01T00:00:00Z'),
  leftOn: null,
  tuitionAmount: 350000,
  branch: 'Баруун 4',
  ...o,
});

describe('Бүртгэлийн Excel стандарт', () => {
  it('таб, толгой, баганын байрлал эх БҮРТГЭЛ-2027-той ижил', async () => {
    const wb = buildRegistrationWorkbook(
      [
        row({}),
        row({ lastName: 'Аюур', section: '12-10' }),
        row({ lastName: 'Бор', section: '12-2' }),
        row({ lastName: 'Цэцэг', grade: 9, section: '9-1' }),
        row({ lastName: 'Нар', grade: 10, section: '10-1' }),
        row({ lastName: 'Сар', grade: 11, section: '11-3' }),
      ],
      [row({ lastName: 'Гарсан', leftOn: new Date('2026-10-05T00:00:00Z') })],
    );
    const buf = await wb.xlsx.writeBuffer();
    const back = new ExcelJS.Workbook();
    await back.xlsx.load(buf as ArrayBuffer);
    expect(back.worksheets.map((w) => w.name)).toEqual(['12-р анги', '11-р анги', '9,10-р анги', 'ГАРСАН']);
    const w12 = back.getWorksheet('12-р анги')!;
    expect((w12.getRow(1).values as unknown[]).slice(1)).toEqual([...ACTIVE_HEADERS]);
    // Ангиар тоогоор эрэмбэлэгдэнэ: 12-2, 12-4, 12-10
    expect([2, 3, 4].map((r) => w12.getRow(r).getCell(9).value)).toEqual(['12-2', '12-4', '12-10']);
    const r = w12.getRow(3);
    expect([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 13].map((c) => r.getCell(c).value)).toEqual([
      2, 'Бат', 'Дорж', '12-р анги', '99112233', null, '88001122', '24-р сургууль', '12-4', '09/01', 350000, 'Баруун 4',
    ]);
    expect(back.getWorksheet('9,10-р анги')!.rowCount).toBe(3);
    const gone = back.getWorksheet('ГАРСАН')!;
    expect((gone.getRow(1).values as unknown[]).slice(1)).toEqual([...LEFT_HEADERS]);
    expect(gone.getRow(2).getCell(12).value).toBe('10/05');
  });

  it('тусдаа туслах функцууд', () => {
    expect(tabOfGrade(10)).toBe('9,10-р анги');
    expect(tabOfGrade(8)).toBe('Бусад анги');
    expect(monthDay(null)).toBeNull();
    expect(monthDay(new Date('2026-06-19T00:00:00Z'))).toBe('06/19');
  });

  it('«=» эхэлсэн нэр томьёо болохгүй (текст хэвээр)', async () => {
    const wb = buildRegistrationWorkbook([row({ lastName: '=SUM(A1)' })], []);
    const back = new ExcelJS.Workbook();
    await back.xlsx.load((await wb.xlsx.writeBuffer()) as ArrayBuffer);
    const cell = back.getWorksheet('12-р анги')!.getRow(2).getCell(2);
    expect(typeof cell.value).toBe('string');
    expect(cell.formula).toBeUndefined();
  });
});
