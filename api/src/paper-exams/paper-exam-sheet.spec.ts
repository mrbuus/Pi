import * as ExcelJS from 'exceljs';
import {
  groupFrom,
  normalizeCode,
  parseAnswerCell,
  parsePaperWorkbook,
} from './paper-exam-sheet';

/** Эзний «Баг 39,40 · Сант.xlsx»-ийн хэлбэрийг дуурайсан шийт. */
function ownerSheet(
  wb: ExcelJS.Workbook,
  name: string,
  n: number,
  students: [string | number, string, string, (number | null)[]][],
) {
  const ws = wb.addWorksheet(name);
  ws.addRow([
    `ШМХФС / ${name.split(' ').slice(0, 2).join(' ')} · Багш: ${name.split(' ').slice(2).join(' ')} · ${students.length} сурагч`,
  ]);
  ws.addRow([]);
  ws.addRow([
    '№',
    'Шифр',
    'Овог',
    'Нэр',
    'Оноо',
    'Сул агуулга',
    ...Array.from({ length: n }, (_, i) => i + 1),
  ]);
  students.forEach(([code, last, first, marks], i) => {
    const score = marks.filter((m) => m === 1).length;
    ws.addRow([
      i + 1,
      code,
      last,
      first,
      score,
      'Магадлал статистик',
      ...marks,
    ]);
  });
  ws.addRow([
    'Гүйцэтгэл %',
    '',
    '',
    '',
    '',
    '',
    ...Array.from({ length: n }, () => 50),
  ]);
  ws.addRow([]);
  ws.addRow(['АГУУЛГЫН ТӨРЛӨӨР — ГҮЙЦЭТГЭЛ %']);
  ws.addRow(['Магадлал статистик', 44]);
  return ws;
}

describe('parsePaperWorkbook — эзний Excel (зөв = 1, буруу = хоосон)', () => {
  it('шийт бүр нэг баг, хоосон = буруу, хөлийн мөрийг уншихгүй', () => {
    const wb = new ExcelJS.Workbook();
    ownerSheet(wb, 'Баг 27 Болор-Эрдэнэ', 4, [
      [2027014, 'Бат', 'Сараа', [1, null, 1, 1]],
      ['2027015', 'Дорж', 'Тэмүүлэн', [null, null, 1, null]],
    ]);
    ownerSheet(wb, 'Баг 28 Ганбаатар', 4, [
      ['B27120001', 'Цэнд', 'Ану', [1, 1, 1, 1]],
    ]);
    const p = parsePaperWorkbook(wb);
    expect(p.itemCount).toBe(4);
    expect(p.skipped).toEqual([]);
    expect(p.sheets).toEqual([
      expect.objectContaining({
        groupLabel: 'Баг 27',
        groupTeacher: 'Болор-Эрдэнэ',
        rowCount: 2,
        mode: 'BINARY',
        itemCount: 4,
      }),
      expect.objectContaining({
        groupLabel: 'Баг 28',
        groupTeacher: 'Ганбаатар',
        rowCount: 1,
      }),
    ]);
    expect(p.rows).toHaveLength(3);
    expect(p.rows[0]).toMatchObject({
      code: '2027014',
      lastName: 'Бат',
      firstName: 'Сараа',
      answers: ['+', '-', '+', '+'],
      fileScore: 3,
      oddCells: 0,
      groupLabel: 'Баг 27',
    });
    expect(p.rows[2].code).toBe('B27120001');
  });

  it('машины гаралт: үсэг, хоосон = хариулаагүй, давхар будсан = «*»', () => {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Scored');
    ws.addRow(['Шифр', 'Овог нэр', 1, 2, 3, 4, 5]);
    ws.addRow(['2027014', 'Б.Сараа', 'A', '', 'AC', 'с', '?']);
    const p = parsePaperWorkbook(wb);
    expect(p.sheets[0].mode).toBe('LETTERS');
    expect(p.rows[0]).toMatchObject({
      lastName: 'Б',
      firstName: 'Сараа',
      answers: ['A', '', '*', 'C', ''],
      oddCells: 1,
    });
    expect(p.sheets[0].groupLabel).toBe('Scored');
  });

  it('толгойгүй шийтийг алгасаж шалтгааныг хэлнэ', () => {
    const wb = new ExcelJS.Workbook();
    wb.addWorksheet('Тэмдэглэл').addRow(['энд дүн алга']);
    ownerSheet(wb, 'Баг 1 Сод', 2, [['2027001', 'А', 'Б', [1, 1]]]);
    const p = parsePaperWorkbook(wb);
    expect(p.skipped).toHaveLength(1);
    expect(p.skipped[0].name).toBe('Тэмдэглэл');
    expect(p.skipped[0].reason).toContain('толгой');
    expect(p.rows).toHaveLength(1);
  });

  it('дугаарлалт тасарвал тэр хүртэлх баганыг л бодлого гэж авна', () => {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('S');
    ws.addRow(['Шифр', 'Нэр', 1, 2, 3, 5]);
    ws.addRow(['1', 'А', 1, 1, 1, 1]);
    expect(parsePaperWorkbook(wb).itemCount).toBe(3);
  });

  it('хоосон мөрийг алгасна', () => {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('S');
    ws.addRow(['Шифр', 'Овог', 'Нэр', 1, 2]);
    ws.addRow([]);
    ws.addRow(['', '', '', 1, 1]);
    ws.addRow(['2027003', 'Х', 'Ц', 1, null]);
    const p = parsePaperWorkbook(wb);
    expect(p.rows.map((r) => r.code)).toEqual(['2027003']);
  });
});

describe('горим олонхоор', () => {
  it('1/хоосон шийт дэх ганц үсэг горимыг солихгүй, буруу гэж авч анхааруулна', () => {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Баг 3');
    ws.addRow(['Шифр', 'Нэр', 1, 2, 3]);
    ws.addRow(['1', 'А', 1, 1, null]);
    ws.addRow(['2', 'Б', 1, 'v', 'A']);
    const p = parsePaperWorkbook(wb);
    expect(p.sheets[0].mode).toBe('BINARY');
    expect(p.rows[1]).toMatchObject({ answers: ['+', '+', '-'], oddCells: 1 });
  });
});

describe('туслах функцүүд', () => {
  it('normalizeCode', () => {
    expect(normalizeCode(2027014)).toBe('2027014');
    expect(normalizeCode(' b27 120001 ')).toBe('B27120001');
    expect(normalizeCode('2027014.0')).toBe('2027014');
    expect(normalizeCode(null)).toBe('');
  });
  it('parseAnswerCell', () => {
    expect(parseAnswerCell(1)).toEqual({ answer: '+', odd: false });
    expect(parseAnswerCell(0)).toEqual({ answer: '-', odd: false });
    expect(parseAnswerCell(null)).toEqual({ answer: null, odd: false });
    expect(parseAnswerCell('b')).toEqual({ answer: 'B', odd: false });
    expect(parseAnswerCell('A, D')).toEqual({ answer: '*', odd: false });
    expect(parseAnswerCell(7)).toEqual({ answer: '-', odd: true });
    expect(parseAnswerCell({ formula: 'X', result: 1 })).toEqual({
      answer: '+',
      odd: false,
    });
  });
  it('groupFrom — гарчиг эсвэл шийтийн нэрээс', () => {
    expect(
      groupFrom('ШМХФС / Баг 27 · Багш: Болор-Эрдэнэ · 15 сурагч', 'Sheet1'),
    ).toEqual({
      label: 'Баг 27',
      teacher: 'Болор-Эрдэнэ',
    });
    expect(groupFrom('', 'Баг 40 Нараа')).toEqual({
      label: 'Баг 40',
      teacher: 'Нараа',
    });
    expect(groupFrom('Багш: Дулмаа 12 сурагч', 'Анги 12-1')).toEqual({
      label: 'Анги 12-1',
      teacher: 'Дулмаа',
    });
  });
});

describe('parsePaperWorkbook — V2 боловсруулалтын файл', () => {
  /** Зөв-Буруу + Түлхүүр (+ Шалгах) шийттэй жижиг V2 ном: 3 бодлого, оноо 1, 2, 3. */
  function v2Book(
    rows: (string | number | null)[][],
    keyPoints: Record<string, number[]> = { A: [1, 2, 3], B: [1, 2, 3] },
  ) {
    const wb = new ExcelJS.Workbook();
    wb.addWorksheet('Дүн').addRow([
      '№',
      'ID',
      'Овог',
      'Нэр',
      'Анги',
      'Хувилбар',
      '1-р хэсэг',
      'Нийт',
    ]);
    wb.addWorksheet('Хариулт').addRow([
      '№',
      'ID',
      'Овог',
      'Нэр',
      'Анги',
      'Хувилбар',
      'Нийт',
      1,
      2,
      3,
    ]);
    const zb = wb.addWorksheet('Зөв-Буруу');
    zb.addRow([
      '№',
      'ID',
      'Овог',
      'Нэр',
      'Анги',
      'Хувилбар',
      'Оноо',
      'Гүйцэтгэл %',
      1,
      2,
      3,
      4,
      5,
    ]);
    for (const r of rows) zb.addRow(r);
    const key = wb.addWorksheet('Түлхүүр');
    key.addRow([
      'Хувилбар',
      '№',
      'Хэсэг',
      'Бодлого / багц',
      'Зөв хариу',
      'Оноо',
      'Багц',
    ]);
    for (const [v, pts] of Object.entries(keyPoints))
      pts.forEach((p, i) =>
        key.addRow([v, i + 1, 1, String(i + 1), 'A', p, 1]),
      );
    const check = wb.addWorksheet('Шалгах');
    check.addRow([
      'ID',
      'Овог',
      'Нэр',
      'Хувилбар',
      'Нийт',
      'Тулгалт',
      'Тэмдэглэл',
    ]);
    check.addRow([
      '2027002',
      'Бат',
      'Сараа',
      'B',
      3,
      'OK',
      'Давхар будсан (*) хариутай',
    ]);
    return wb;
  }

  it('Зөв-Буруу шийтийг Түлхүүрийн оноогоор уншиж, анги бүрийг баг болгоно', () => {
    const parsed = parsePaperWorkbook(
      v2Book([
        [1, '2027001', 'Дорж', 'Анар', '12-1', 'A', 6, 100, 1, 1, 1],
        [2, '2027002', 'Бат', 'Сараа', '12-2', 'B', 3, 50, null, null, 1],
      ]),
    );
    expect(parsed.format).toBe('V2');
    expect(parsed.itemCount).toBe(3);
    expect(parsed.itemPoints).toEqual([1, 2, 3]);
    expect(parsed.sheets.map((s) => s.groupLabel)).toEqual(['12-1', '12-2']);
    expect(parsed.rows[0].answers).toEqual(['+', '+', '+']);
    expect(parsed.rows[1].answers).toEqual(['-', '-', '+']);
    expect(parsed.rows[1].variant).toBe('B');
    expect(parsed.rows[1].notes).toEqual(['Давхар будсан (*) хариутай']);
    expect(parsed.rows.every((r) => !r.error)).toBe(true);
  });

  it('машины онооноос зөрсөн мөрийг алдаатай гэж тэмдэглэнэ', () => {
    const parsed = parsePaperWorkbook(
      v2Book([[1, '2027001', 'Дорж', 'Анар', '12-1', 'A', 5, 0, 1, 1, 1]]),
    );
    expect(parsed.rows[0].error).toMatch(/Машины оноо 5, .* 6/);
  });

  it('хоёр файлаас давхар орсон ижил мөрийг нэг л удаа авна', () => {
    const row = [
      1,
      '2027001',
      'Дорж',
      'Анар',
      '12-1',
      'A',
      1,
      0,
      1,
      null,
      null,
    ];
    const parsed = parsePaperWorkbook(v2Book([row, row]));
    expect(parsed.rows).toHaveLength(1);
    expect(parsed.droppedDuplicates).toBe(1);
  });

  it('сурагчийн бөглөөгүй хувилбарын (C) түлхүүрийг үл тооно', () => {
    const parsed = parsePaperWorkbook(
      v2Book([[1, '2027001', 'Дорж', 'Анар', '12-1', 'A', 6, 100, 1, 1, 1]], {
        A: [1, 2, 3],
        C: [1, 1, 1, 1],
      }),
    );
    expect(parsed.itemPoints).toEqual([1, 2, 3]);
    expect(parsed.rows).toHaveLength(1);
  });

  it('хувилбаруудын оноо зөрвөл уншихгүй', () => {
    const parsed = parsePaperWorkbook(
      v2Book([], { A: [1, 2, 3], B: [1, 2, 2] }),
    );
    expect(parsed.rows).toHaveLength(0);
    expect(parsed.skipped[0].reason).toMatch(/зөрж/);
  });
});
