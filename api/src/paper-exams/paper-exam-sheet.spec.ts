import * as ExcelJS from 'exceljs';
import {
  expandLabel,
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

describe('parsePaperWorkbook — V2 боловсруулалтын файл (Хариулт + Түлхүүр)', () => {
  /**
   * 2 сонгох бодлого (1, 2 оноо) + 1 багц «2.1.a-b» (3 оноо, 2 нүд).
   * A: 1=D, 2=B, 2.1.a-b=21 · B: 1=A, 2=C, 2.1.a-b=34 · C: ашиглаагүй (өөр бүтэцтэй)
   */
  function v2Book(
    rows: (string | number | null)[][],
    extraKey: (string | number)[][] = [],
  ) {
    const wb = new ExcelJS.Workbook();
    wb.addWorksheet('Дүн').addRow([
      '№',
      'ID',
      'Овог',
      'Нэр',
      'Анги',
      'Хувилбар',
      'Нийт',
    ]);
    const ans = wb.addWorksheet('Хариулт');
    ans.addRow([
      '№',
      'ID',
      'Овог',
      'Нэр',
      'Анги',
      'Хувилбар',
      'Нийт',
      '1',
      '2',
      '2.1.a',
      '2.1.b',
    ]);
    for (const r of rows) ans.addRow(r);
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
    for (const r of [
      ['A', 1, 1, '1', 'D', 1, 1],
      ['A', 2, 1, '2', 'B', 2, 1],
      ['A', 3, 2, '2.1.a-b', '21', 3, 2],
      ['B', 1, 1, '1', 'A', 1, 1],
      ['B', 2, 1, '2', 'C', 2, 1],
      ['B', 3, 2, '2.1.a-b', '34', 3, 2],
      ['C', 1, 1, '1', 'E', 5, 1],
      ...extraKey,
    ])
      key.addRow(r);
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

  it('бичсэн үсэг, багцын цифрийг уншиж, хувилбар бүрийн түлхүүрийг авна', () => {
    const parsed = parsePaperWorkbook(
      v2Book([
        [1, '2027001', 'Дорж', 'Анар', '12-1', 'A', 6, 'D', 'B', 2, 1],
        [2, '2027002', 'Бат', 'Сараа', '12-2', 'B', 3, '*', '', 3, 4],
      ]),
    );
    expect(parsed.format).toBe('V2');
    expect(parsed.itemCount).toBe(3);
    expect(parsed.itemPoints).toEqual([1, 2, 3]);
    expect(parsed.v2Items?.[2]).toMatchObject({
      label: '2.1.a-b',
      cols: ['2.1.a', '2.1.b'],
      keys: { A: '21', B: '34' },
    });
    expect(parsed.sheets.map((s) => s.groupLabel)).toEqual(['12-1', '12-2']);
    expect(parsed.rows[0].answers).toEqual(['D', 'B', '21']);
    expect(parsed.rows[1].answers).toEqual(['*', '', '34']);
    expect(parsed.rows[1].variant).toBe('B');
    expect(parsed.rows[1].notes).toEqual(['Давхар будсан (*) хариутай']);
    expect(parsed.rows.every((r) => !r.error)).toBe(true);
  });

  it('багцын хоосон нүдийг «_»-аар, давхар будсаныг «*»-аар хадгална', () => {
    const parsed = parsePaperWorkbook(
      v2Book([
        [1, '2027001', 'Дорж', 'Анар', '12-1', 'A', 3, 'D', 'B', '', '*'],
      ]),
    );
    expect(parsed.rows[0].answers[2]).toBe('_*');
    expect(parsed.rows[0].error).toBeNull();
  });

  it('машины онооноос зөрсөн мөрийг алдаатай гэж тэмдэглэнэ', () => {
    const parsed = parsePaperWorkbook(
      v2Book([[1, '2027001', 'Дорж', 'Анар', '12-1', 'A', 5, 'D', 'B', 2, 1]]),
    );
    expect(parsed.rows[0].error).toMatch(/Машины оноо 5, .* 6/);
  });

  it('хоёр файлаас давхар орсон ижил мөрийг нэг л удаа авна', () => {
    const row = [1, '2027001', 'Дорж', 'Анар', '12-1', 'A', 1, 'D', '', '', ''];
    const parsed = parsePaperWorkbook(v2Book([row, row]));
    expect(parsed.rows).toHaveLength(1);
    expect(parsed.droppedDuplicates).toBe(1);
  });

  it('ашиглагдаагүй хувилбарын (C) зөрүүтэй түлхүүрийг үл тооно', () => {
    const parsed = parsePaperWorkbook(
      v2Book([[1, '2027001', 'Дорж', 'Анар', '12-1', 'A', 6, 'D', 'B', 2, 1]]),
    );
    expect(parsed.rows).toHaveLength(1);
    expect(parsed.v2Items?.[0].keys).toEqual({ A: 'D' });
  });

  it('ашигласан хувилбаруудын бүтэц зөрвөл уншихгүй', () => {
    const parsed = parsePaperWorkbook(
      v2Book([
        [1, '2027001', 'Дорж', 'Анар', '12-1', 'A', 6, 'D', 'B', 2, 1],
        [2, '2027003', 'Сүх', 'Ану', '12-1', 'C', 0, '', '', '', ''],
      ]),
    );
    expect(parsed.rows).toHaveLength(0);
    expect(parsed.skipped[0].reason).toMatch(/зөрж/);
  });

  /** Машины шинэ гаралт («13-4.xlsx»): тайлбар мөр, «Код», «2.1a», өргөн «Түлхүүр», «Шалгах»-д уншигдаагүй хуудас */
  function machineBook(rows: (string | number | null)[][]) {
    const wb = new ExcelJS.Workbook();
    const ans = wb.addWorksheet('Хариулт');
    ans.addRow(['Зөв', 'Буруу', 'Хоосон']);
    ans.addRow(['Код', 'Овог', 'Нэр', 'Анги', 'Хувилбар', 'Нийт', 1, 2, '2.1a', '2.1b']);
    for (const r of rows) ans.addRow(r);
    const key = wb.addWorksheet('Түлхүүр');
    key.addRow(['Асуулт', 'A хариу', 'A оноо', 'B хариу', 'B оноо', 'C хариу', 'C оноо']);
    key.addRow([1, 'D', 1, 'A', 1, 'E', 5]);
    key.addRow([2, 'B', 2, 'C', 2, 'A', 1]);
    key.addRow(['2.1 a', null, null, null, null, '7', 1]);
    key.addRow(['2.1 a-b', '21', 3, '34', 3]);
    key.addRow(['Нийт', null, 6, null, 6, null, 7]);
    key.addRow(['Шалгалт: Туршилт']);
    const check = wb.addWorksheet('Шалгах');
    check.addRow(['№', 'Код', 'Асуудал', 'Хувилбар', 'Нийт']);
    check.addRow([1, '202□7471', 'Код дутуу будсан', 'A', 4]);
    return wb;
  }

  it('машины шинэ хэлбэрийг хөрвүүлэлгүй уншина — хуучин хэлбэртэй яг ижил үр дүн', () => {
    const fresh = parsePaperWorkbook(
      machineBook([
        ['2027001', 'Бат', 'Анар', '13-4', 'A', 6, 'D', 'B', '2', '1'],
        ['2027002', 'Бат', 'Сараа', '13-4', 'B', 4, 'A', null, '3', '4'],
      ]),
    );
    const old = parsePaperWorkbook(
      v2Book([
        [1, '2027001', 'Бат', 'Анар', '13-4', 'A', 6, 'D', 'B', '2', '1'],
        [2, '2027002', 'Бат', 'Сараа', '13-4', 'B', 4, 'A', null, '3', '4'],
      ]),
    );
    expect(fresh.format).toBe('V2');
    expect(fresh.v2Items).toEqual(old.v2Items);
    expect(fresh.rows.map((r) => [r.code, r.variant, r.answers, r.fileScore, r.error])).toEqual(
      old.rows.map((r) => [r.code, r.variant, r.answers, r.fileScore, r.error]),
    );
    expect(fresh.rows.every((r) => r.error === null)).toBe(true);
  });

  it('машины шинэ хэлбэр: код нь уншигдаагүй хуудсыг ороогүй гэж мэдэгдэнэ', () => {
    const p = parsePaperWorkbook(
      machineBook([['2027001', 'Бат', 'Анар', '13-4', 'A', 6, 'D', 'B', '2', '1']]),
    );
    expect(p.rows).toHaveLength(1);
    expect(p.skipped).toEqual([
      {
        name: 'Код 202□7471',
        reason: 'Код дутуу будсан, машины оноо 4, хариу нь файлд алга, гараар оруулна',
      },
    ]);
  });

  it('expandLabel — багцын нүднүүд', () => {
    expect(expandLabel('2.1.a-d')).toEqual([
      '2.1.a',
      '2.1.b',
      '2.1.c',
      '2.1.d',
    ]);
    expect(expandLabel('2.2.e')).toEqual(['2.2.e']);
    expect(expandLabel('17')).toEqual(['17']);
  });
});
