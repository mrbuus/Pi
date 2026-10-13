import * as ExcelJS from 'exceljs';
import {
  buildGradeWorkbook,
  loadWorkbook,
  normalizeLabel,
  normalizeName,
  parseGradeSheet,
} from './gradebook-sheet';

/**
 * Эзний «Багшийн анги-3-2.xlsx»-ийн хэлбэрийг яг давтана:
 *   1-р мөр  Сурагч | Дүн (авто) | Нэгдүгээр хэсэг | Хоёрдугаар хэсэг
 *   2-р мөр  № Овог Нэр Бүлэг «Авсан оноо» Хувь 1..36 1-1 … (Excel «2-4»-ийг огноо болгосон)
 *   3-р мөр  «Оноо (жин) — гараар засна →» … Нийт =SUM(…) жин …
 *   сурагч   хоосон = зөв, 0 = буруу; E = эзний SUMPRODUCT томьёо
 *   хөл      «Зөв бодсон (хүн)», «Алдаа %» …
 */
async function ownerSheet(opts: { titleRow?: boolean } = {}): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('тест 19, 12-1');
  const top = opts.titleRow ? 2 : 1;
  if (opts.titleRow) ws.getCell('A1').value = 'Сорил 19 — 12-2 анги';
  const h = top + 1;
  const w = top + 2;
  ws.getRow(top).values = [
    'Сурагч',
    null,
    null,
    null,
    'Дүн (авто)',
    null,
    'Нэгдүгээр хэсэг',
  ];
  const labels: ExcelJS.CellValue[] = [];
  for (let n = 1; n <= 36; n += 1) labels.push(n);
  // 1-1, 1-2 текст; «2-4» Excel-д огноо болсон; 3-3 жин 0
  labels.push('1-1', '1-2', new Date(Date.UTC(2026, 1, 4)), '3-3');
  ws.getRow(h).values = [
    '№',
    'Овог',
    'Нэр',
    'Бүлэг',
    'Авсан оноо',
    'Хувь',
    ...labels,
  ];
  const weights = [
    ...Array(8).fill(1),
    ...Array(20).fill(2),
    ...Array(8).fill(3),
    3,
    2,
    2,
    0,
  ];
  ws.getRow(w).values = [
    'Оноо (жин) — гараар засна →',
    null,
    null,
    null,
    'Нийт',
    null,
    ...weights,
  ];
  ws.getCell(`F${w}`).value = {
    formula: `SUM(G${w}:AT${w})`,
    result: 79,
  } as ExcelJS.CellFormulaValue;
  const student = (
    r: number,
    no: number,
    last: string,
    first: string,
    zeros: number[],
  ) => {
    const row = ws.getRow(r);
    row.values = [no, last, first, '12-1'];
    row.getCell(5).value = {
      formula: 'SUM()',
      result: 0,
    } as ExcelJS.CellFormulaValue;
    for (const col of zeros) row.getCell(col).value = 0;
  };
  student(w + 1, 1, 'Баяржаргал', 'Амарболд', [7, 45]); // 1 ба «2-4» буруу
  student(w + 2, 2, 'Содномрагчаа', 'Амгаланзаяа', []); // бүх нүд хоосон
  const totalOnly = ws.getRow(w + 3);
  totalOnly.values = [3, 'Энхбаяр', 'Бөх-Од', '12-1', 58];
  ws.getRow(w + 4).values = [null, null, 'Анужин', '12-1'];
  ws.getCell(`G${w + 4}`).value = 'x';
  ws.getRow(w + 5).values = ['Зөв бодсон (хүн)'];
  ws.getRow(w + 6).values = [99, 'Хөлөөс', 'Доош', '12-1'];
  const out = await wb.xlsx.writeBuffer();
  return Buffer.from(out as ArrayBuffer);
}

describe('normalizeLabel — эзний баганын шошго', () => {
  it.each([
    [7, '7'],
    ['12', '12'],
    ['1-1', '1-1'],
    ['4 – 3', '4-3'],
    [new Date(Date.UTC(2026, 1, 4)), '2-4'],
    [new Date(Date.UTC(2026, 0, 3)), '1-3'],
    ['Хувь', null],
    [0, null],
  ])('%p → %p', (value, label) => {
    expect(normalizeLabel(value as ExcelJS.CellValue)).toBe(label);
  });
  it('нэрийг зай, цэг, том жижгээс үл хамааран тулгана', () => {
    expect(normalizeName(' Билгүүн-Очир ')).toBe(normalizeName('билгүүн очир'));
  });
});

describe('parseGradeSheet — эзний хуудас', () => {
  it.each([false, true])('гарчгийн мөртэй эсэх: %p', async (titleRow) => {
    const wb = await loadWorkbook(await ownerSheet({ titleRow }));
    const parsed = parseGradeSheet(wb.worksheets[0])!;
    expect(parsed).not.toBeNull();
    expect(parsed.columns).toHaveLength(40);
    expect(parsed.columns.slice(35).map((c) => [c.label, c.weight])).toEqual([
      ['36', 3],
      ['1-1', 3],
      ['1-2', 2],
      ['2-4', 2],
      ['3-3', 0],
    ]);
    // Хөлийн «Зөв бодсон» мөрөнд зогсоно — доорх мөр сурагч биш
    expect(parsed.rows.map((r) => r.firstName)).toEqual([
      'Амарболд',
      'Амгаланзаяа',
      'Бөх-Од',
      'Анужин',
    ]);
    const [first, empty, totalOnly, odd] = parsed.rows;
    expect(
      [...first.cells].filter(([, s]) => s === 'WRONG').map(([l]) => l),
    ).toEqual(['1', '2-4']);
    expect(first.markedCount).toBe(2);
    expect(first.totalLiteral).toBeNull(); // томьёо
    expect(empty.markedCount).toBe(0);
    expect(empty.cells.get('17')).toBe('CORRECT'); // хоосон = зөв
    expect(totalOnly.totalLiteral).toBe(58);
    expect(odd.lastName).toBe('');
    expect(odd.odd).toEqual([{ label: '1', value: 'x' }]);
  });

  it('«№ / Нэр» гарчиггүй хуудас — null', async () => {
    const wb = new ExcelJS.Workbook();
    wb.addWorksheet('Шийт3').getRow(1).values = ['Сэдэв', 'Бодлого'];
    const parsed = parseGradeSheet(
      (
        await loadWorkbook(
          Buffer.from((await wb.xlsx.writeBuffer()) as ArrayBuffer),
        )
      ).worksheets[0],
    );
    expect(parsed).toBeNull();
  });

  it('xlsx биш файл — 400', async () => {
    await expect(loadWorkbook(Buffer.from('№,Овог,Нэр'))).rejects.toThrow(
      '.xlsx',
    );
  });
});

describe('buildGradeWorkbook — татсан файл эзний хэлбэрээр, буцааж уншигдана', () => {
  it('0/хоосон, ирээгүй, 2-р хэсгийн шошго текстээр', async () => {
    const buf = await buildGradeWorkbook({
      sheetName: '12-1',
      items: [
        { label: '1', points: 1, part: 1 },
        { label: '2', points: 2, part: 1 },
        { label: '1-1', points: 3, part: 2 },
        { label: '1-2', points: 4, part: 2 },
      ],
      rows: [
        {
          lastName: 'Б',
          firstName: 'Амарболд',
          className: '12-1',
          marks: {
            '1': 'WRONG',
            '2': 'CORRECT',
            '1-1': 'BLANK',
            '1-2': 'CORRECT',
          },
          totalOnly: null,
          absent: false,
        },
        {
          lastName: 'С',
          firstName: 'Анар',
          className: '12-1',
          marks: null,
          totalOnly: null,
          absent: true,
        },
        {
          lastName: 'Д',
          firstName: 'Билгүүн',
          className: '12-1',
          marks: null,
          totalOnly: 6,
          absent: false,
        },
      ],
    });
    const wb = await loadWorkbook(buf);
    const sheet = wb.worksheets[0];
    expect(sheet.getCell('I2').value).toBe('1-1'); // огноо болохгүй — текст
    expect(sheet.getCell('E3').value).toBe('Нийт');
    expect(
      String((sheet.getCell('E4').value as ExcelJS.CellFormulaValue).formula),
    ).toContain('SUMPRODUCT');
    const parsed = parseGradeSheet(sheet)!;
    expect(parsed.columns.map((c) => [c.label, c.weight])).toEqual([
      ['1', 1],
      ['2', 2],
      ['1-1', 3],
      ['1-2', 4],
    ]);
    expect(parsed.absentCol).toBe(11);
    const [a, b, c] = parsed.rows;
    expect(
      [...a.cells].filter(([, s]) => s === 'WRONG').map(([l]) => l),
    ).toEqual(['1', '1-1']);
    expect(b.absent).toBe(true);
    expect(c.totalLiteral).toBe(6);
    expect(parsed.rows).toHaveLength(3); // хөлийн мөр сурагч болохгүй
  });
});
