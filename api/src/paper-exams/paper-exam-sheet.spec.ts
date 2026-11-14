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
