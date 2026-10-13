import { ForbiddenException } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { buildExamItems } from '../tests/exam-items';
import { GradebookService, matchStudent } from './gradebook.service';
import { loadWorkbook, parseGradeSheet } from './gradebook-sheet';

jest.mock('../common/access', () => ({
  assertInternalTeachingStaff: jest.fn(),
}));
// eslint-disable-next-line @typescript-eslint/no-require-imports
const access = require('../common/access') as {
  assertInternalTeachingStaff: jest.Mock;
};

const STATEMENT = '$x=[a][b]$, $y=[c]$';
const problems = [
  {
    problemId: 'p1',
    order: 1,
    points: 1,
    problem: { format: 'CHOICE', statementText: '1', scoringGroups: null },
  },
  {
    problemId: 'p2',
    order: 2,
    points: 2,
    problem: { format: 'CHOICE', statementText: '2', scoringGroups: null },
  },
  {
    problemId: 'f1',
    order: 3,
    points: 5,
    problem: {
      format: 'FILL_NUMBER',
      statementText: STATEMENT,
      scoringGroups: [
        { label: '1-1', boxes: ['a', 'b'], points: 2 },
        { label: '1-2', boxes: ['c'], points: 3 },
      ],
    },
  },
];

function makeDb(opts: {
  testType?: string;
  classTeacher?: string | null;
  result?: Record<string, unknown> | null;
  session?: { status: string } | null;
  marks?: {
    itemKey: string;
    status: string;
    source: string;
    enteredById: string | null;
  }[];
}) {
  const tx = {
    $queryRaw: jest.fn().mockResolvedValue([]),
    $executeRaw: jest.fn().mockResolvedValue(1),
    testResult: {
      findUnique: jest.fn().mockResolvedValue(opts.result ?? null),
      upsert: jest.fn().mockImplementation(({ create, update }) =>
        Promise.resolve({
          id: 'res-1',
          ...(opts.result
            ? {
                ...opts.result,
                ...update,
                version: Number(opts.result.version ?? 1) + 1,
              }
            : { ...create, version: 1 }),
        }),
      ),
      delete: jest.fn(),
    },
    testAttemptSession: {
      findUnique: jest.fn().mockResolvedValue(opts.session ?? null),
    },
    testAbsence: {
      findUnique: jest.fn().mockResolvedValue(null),
      create: jest.fn(),
      delete: jest.fn(),
    },
    testItemMark: {
      findMany: jest.fn().mockResolvedValue(opts.marks ?? []),
      deleteMany: jest.fn(),
      createMany: jest.fn(),
    },
    auditLog: { create: jest.fn() },
  };
  const db = {
    test: {
      findUnique: jest.fn().mockResolvedValue({
        id: 'test-1',
        title: '1000 бодлого · Сорил 19-A',
        type: opts.testType ?? 'THOUSAND',
        gradingMode: 'AUTO',
        deletedAt: null,
        isDraft: false,
        createdById: 'admin',
        problems,
      }),
    },
    classroom: {
      findUnique: jest.fn().mockResolvedValue({
        id: 'class-1',
        name: '12-1',
        teacherId:
          opts.classTeacher === undefined ? 'teacher-1' : opts.classTeacher,
        archived: false,
      }),
    },
    enrollment: {
      findMany: jest.fn().mockResolvedValue([{ studentId: 'stu-1' }]),
    },
    $transaction: jest
      .fn()
      .mockImplementation((fn: (t: typeof tx) => unknown) => fn(tx)),
  };
  return { db, tx };
}

const save = (
  service: GradebookService,
  row: Record<string, unknown>,
  user = 'teacher-1',
) =>
  service.save('test-1', user, {
    classroomId: 'class-1',
    rows: [{ studentId: 'stu-1', ...row }],
  } as never);

describe('GradebookService.save — гар шивэлт', () => {
  beforeEach(() =>
    access.assertInternalTeachingStaff.mockResolvedValue('TEACHER'),
  );

  it('хоёр багш зэрэг: ачаалсан төлөв (base) өгвөл зөвхөн өөрийн нүдийг бичнэ', async () => {
    // Багш 2 тэр хооронд p:p1-ийг 0 болгож хадгалсан; багш 1 (хуучин тор) p:p2-ыг 0 болгоно
    const { db, tx } = makeDb({
      result: {
        id: 'res-1',
        totalScore: 7,
        maxScore: 8,
        source: 'MANUAL_ENTRY',
        version: 1,
      },
      marks: ['p:p1', 'p:p2', 'g:f1:1-1', 'g:f1:1-2'].map((itemKey) => ({
        itemKey,
        status: itemKey === 'p:p1' ? 'WRONG' : 'CORRECT',
        source: 'MANUAL',
        enteredById: 'teacher-2',
      })),
    });
    const res = await save(new GradebookService(db as never, {} as never), {
      wrong: ['p:p2'],
      base: { wrong: [], absent: false },
    });
    expect(res.results[0]).toMatchObject({
      ok: true,
      totalScore: 5,
      merged: true,
    });
    const marks = tx.testItemMark.createMany.mock.calls[0][0].data as {
      itemKey: string;
      status: string;
      enteredById: string;
    }[];
    expect(
      marks.filter((m) => m.status === 'WRONG').map((m) => m.itemKey),
    ).toEqual(['p:p1', 'p:p2']);
    // Багш 2-ын оруулсан нүд түүний нэр дээр үлдэнэ
    expect(marks.find((m) => m.itemKey === 'p:p1')!.enteredById).toBe(
      'teacher-2',
    );
  });

  it('хоосон = зөв, 0 = буруу: нийт ба бүх зүйлсийн тэмдэглэгээ', async () => {
    const { db, tx } = makeDb({});
    const res = await save(new GradebookService(db as never, {} as never), {
      wrong: ['p:p2', 'g:f1:1-2'],
    });
    expect(res.results[0]).toMatchObject({
      ok: true,
      totalScore: 1 + 2,
      maxScore: 8,
    });
    const upsert = tx.testResult.upsert.mock.calls[0][0];
    expect(upsert.create).toMatchObject({
      totalScore: 3,
      maxScore: 8,
      source: 'MANUAL_ENTRY',
      enteredById: 'teacher-1',
    });
    const marks = tx.testItemMark.createMany.mock.calls[0][0].data;
    expect(
      marks.map((m: { itemKey: string; status: string; source: string }) => [
        m.itemKey,
        m.status,
        m.source,
      ]),
    ).toEqual([
      ['p:p1', 'CORRECT', 'MANUAL'],
      ['p:p2', 'WRONG', 'MANUAL'],
      ['g:f1:1-1', 'CORRECT', 'MANUAL'],
      ['g:f1:1-2', 'WRONG', 'MANUAL'],
    ]);
  });

  it('CHAPTER_EXAM төрөлд source = CHAPTER_EXAM, бусдад MANUAL_ENTRY', async () => {
    const { db, tx } = makeDb({ testType: 'CHAPTER_EXAM' });
    await save(new GradebookService(db as never, {} as never), { wrong: [] });
    expect(tx.testResult.upsert.mock.calls[0][0].create.source).toBe(
      'CHAPTER_EXAM',
    );
  });

  it('Excel-ээс ирсэн тэмдэглэгээ EXCEL эх сурвалжтай', async () => {
    const { db, tx } = makeDb({});
    await new GradebookService(db as never, {} as never).save(
      'test-1',
      'teacher-1',
      {
        classroomId: 'class-1',
        source: 'EXCEL',
        rows: [{ studentId: 'stu-1', wrong: [] }],
      } as never,
    );
    expect(tx.testItemMark.createMany.mock.calls[0][0].data[0].source).toBe(
      'EXCEL',
    );
  });

  it('Ирээгүй: гар дүнг устгаж, ирээгүй гэж тэмдэглэнэ (дүнд тооцохгүй)', async () => {
    const { db, tx } = makeDb({
      result: {
        id: 'res-1',
        source: 'MANUAL_ENTRY',
        totalScore: 5,
        maxScore: 8,
        version: 1,
      },
    });
    const res = await save(new GradebookService(db as never, {} as never), {
      absent: true,
    });
    expect(res.results[0]).toMatchObject({ ok: true, absent: true });
    expect(tx.testResult.delete).toHaveBeenCalledWith({
      where: { id: 'res-1' },
    });
    expect(tx.testAbsence.create).toHaveBeenCalled();
  });

  it('шалгалтад байхгүй багана — мөрийн алдаа, бусад мөр хадгалагдана', async () => {
    const { db } = makeDb({});
    const res = await save(new GradebookService(db as never, {} as never), {
      wrong: ['p:other'],
    });
    expect(res.results[0]).toMatchObject({ ok: false });
  });
});

describe('Багш зөвхөн өөрийн ангид', () => {
  it('өөр багшийн анги — 403, юу ч бичихгүй', async () => {
    access.assertInternalTeachingStaff.mockResolvedValue('TEACHER');
    const { db, tx } = makeDb({ classTeacher: 'teacher-2' });
    await expect(
      save(new GradebookService(db as never, {} as never), { wrong: [] }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(tx.testResult.upsert).not.toHaveBeenCalled();
  });
  it('Багш+ — бүх анги', async () => {
    access.assertInternalTeachingStaff.mockResolvedValue('TEACHER_PLUS');
    const { db, tx } = makeDb({ classTeacher: 'teacher-2' });
    const res = await save(
      new GradebookService(db as never, {} as never),
      { wrong: [] },
      'tplus',
    );
    expect(res.saved).toBe(1);
    expect(tx.testResult.upsert).toHaveBeenCalled();
  });
});

describe('Онлайн дүнгийн түгжээ — Багш+/Админ, шалтгаантай, аудит', () => {
  const online = {
    id: 'res-1',
    source: 'ONLINE_TEST',
    totalScore: 6,
    maxScore: 8,
    version: 1,
  };
  const onlineMarks = [
    { itemKey: 'p:p1', status: 'CORRECT', source: 'ONLINE', enteredById: null },
    { itemKey: 'p:p2', status: 'BLANK', source: 'ONLINE', enteredById: null },
    {
      itemKey: 'g:f1:1-1',
      status: 'CORRECT',
      source: 'ONLINE',
      enteredById: null,
    },
    {
      itemKey: 'g:f1:1-2',
      status: 'CORRECT',
      source: 'ONLINE',
      enteredById: null,
    },
  ];

  it('Багш — татгалзана', async () => {
    access.assertInternalTeachingStaff.mockResolvedValue('TEACHER');
    const { db, tx } = makeDb({
      result: online,
      session: { status: 'SUBMITTED' },
      marks: onlineMarks,
    });
    const res = await save(new GradebookService(db as never, {} as never), {
      wrong: [],
      reason: 'шалгасан',
    });
    expect(res.results[0]).toMatchObject({
      ok: false,
      error: expect.stringMatching(/Багш\+/),
    });
    expect(tx.testResult.upsert).not.toHaveBeenCalled();
  });

  it('Багш+ шалтгаангүй — татгалзана', async () => {
    access.assertInternalTeachingStaff.mockResolvedValue('TEACHER_PLUS');
    const { db, tx } = makeDb({
      result: online,
      session: { status: 'SUBMITTED' },
      marks: onlineMarks,
    });
    const res = await save(
      new GradebookService(db as never, {} as never),
      { wrong: ['p:p2'] },
      'tplus',
    );
    expect(res.results[0]).toMatchObject({
      ok: false,
      error: expect.stringMatching(/шалтгаан/),
    });
    expect(tx.auditLog.create).not.toHaveBeenCalled();
  });

  it('Багш+ шалтгаантай — засна, source ONLINE_TEST хэвээр, аудитад шалтгаан', async () => {
    access.assertInternalTeachingStaff.mockResolvedValue('TEACHER_PLUS');
    const { db, tx } = makeDb({
      result: online,
      session: { status: 'SUBMITTED' },
      marks: onlineMarks,
    });
    const res = await save(
      new GradebookService(db as never, {} as never),
      { wrong: ['p:p2', 'g:f1:1-2'], reason: 'Хариуны түлхүүр зассан' },
      'tplus',
    );
    expect(res.results[0]).toMatchObject({
      ok: true,
      totalScore: 3,
      maxScore: 8,
      version: 2,
    });
    const upsert = tx.testResult.upsert.mock.calls[0][0];
    expect(upsert.update).toMatchObject({
      source: 'ONLINE_TEST',
      version: { increment: 1 },
    });
    const marks = tx.testItemMark.createMany.mock.calls[0][0].data;
    // өөрчлөгдөөгүй зүйл ONLINE хэвээр, хариулаагүй (BLANK) нь BLANK хэвээр
    expect(
      marks.find((m: { itemKey: string }) => m.itemKey === 'p:p1'),
    ).toMatchObject({ source: 'ONLINE' });
    expect(
      marks.find((m: { itemKey: string }) => m.itemKey === 'p:p2'),
    ).toMatchObject({ status: 'BLANK', source: 'ONLINE' });
    expect(
      marks.find((m: { itemKey: string }) => m.itemKey === 'g:f1:1-2'),
    ).toMatchObject({
      status: 'WRONG',
      source: 'MANUAL',
      enteredById: 'tplus',
    });
    expect(tx.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: 'OVERRIDE_ONLINE_RESULT',
        entity: 'TestResult',
        reason: 'Хариуны түлхүүр зассан',
      }),
    });
  });

  it('сурагч одоо өгч байна — Админ ч бичихгүй', async () => {
    access.assertInternalTeachingStaff.mockResolvedValue('ADMIN');
    const { db, tx } = makeDb({ session: { status: 'IN_PROGRESS' } });
    const res = await save(
      new GradebookService(db as never, {} as never),
      { wrong: [], reason: 'шалтгаан' },
      'admin',
    );
    expect(res.results[0]).toMatchObject({
      ok: false,
      error: expect.stringMatching(/өгч байна/),
    });
    expect(tx.testResult.upsert).not.toHaveBeenCalled();
  });
});

describe('Excel оруулах — эзний хуудсыг тулгах', () => {
  const roster = [
    {
      id: 's1',
      firstName: 'Амарболд',
      lastName: 'Баяржаргал',
      classroomId: 'c',
      classroomName: '12-1',
    },
    {
      id: 's2',
      firstName: 'Анар',
      lastName: 'Аззаяа',
      classroomId: 'c',
      classroomName: '12-1',
    },
    {
      id: 's3',
      firstName: 'Анар',
      lastName: 'Батдаш',
      classroomId: 'c',
      classroomName: '12-1',
    },
    {
      id: 's4',
      firstName: 'Билгүүн-Очир',
      lastName: 'Баянжаргал',
      classroomId: 'c',
      classroomName: '12-1',
    },
  ];

  it('овог+нэр, сольсон дараалал, зөвхөн нэр (ганц бол), хоёрдмол', () => {
    expect(matchStudent(roster, 'Баяржаргал', 'Амарболд')).toMatchObject({
      status: 'OK',
      student: { id: 's1' },
    });
    expect(matchStudent(roster, 'Билгүүн Очир', 'Баянжаргал')).toMatchObject({
      status: 'OK',
      student: { id: 's4' },
    });
    expect(matchStudent(roster, '', 'Амарболд')).toMatchObject({
      status: 'OK',
      student: { id: 's1' },
    });
    expect(matchStudent(roster, '', 'Анар').status).toBe('AMBIGUOUS');
    expect(matchStudent(roster, 'Дорж', 'Болд').status).toBe('UNMATCHED');
  });

  async function sheet(
    rows: (string | number | null)[][],
    labels: (string | number | Date)[],
    weights: number[],
  ) {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('12-1');
    ws.getRow(1).values = ['Сурагч', null, null, null, 'Дүн (авто)'];
    ws.getRow(2).values = [
      '№',
      'Овог',
      'Нэр',
      'Бүлэг',
      'Авсан оноо',
      'Хувь',
      ...labels,
    ];
    ws.getRow(3).values = [
      'Оноо (жин)',
      null,
      null,
      null,
      'Нийт',
      null,
      ...weights,
    ];
    rows.forEach((r, i) => (ws.getRow(4 + i).values = r));
    const loaded = await loadWorkbook(
      Buffer.from((await wb.xlsx.writeBuffer()) as ArrayBuffer),
    );
    return parseGradeSheet(loaded.worksheets[0])!;
  }
  const items = buildExamItems(problems as never);

  it('баганыг зүйлтэй тулгаж, буруу нүдийг түлхүүр болгоно; хоосон мөрийг ялгана', async () => {
    const parsed = await sheet(
      [
        [1, 'Баяржаргал', 'Амарболд', '12-1', null, null, 0, null, null, 0],
        [2, 'Аззаяа', 'Анар', '12-1'],
        [3, 'Дорж', 'Болд', '12-1', null, null, 0],
      ],
      [1, 2, '1-1', '1-2'],
      [1, 2, 2, 3],
    );
    const preview = new GradebookService({} as never, {} as never).buildPreview(
      parsed,
      items,
      roster,
    );
    expect(preview.errors).toEqual([]);
    expect(
      preview.rows.map((r) => [r.studentId, r.status, r.wrong, r.total]),
    ).toEqual([
      ['s1', 'READY', ['p:p1', 'g:f1:1-2'], 4],
      ['s2', 'EMPTY', [], 8],
      [null, 'UNMATCHED', [], null],
    ]);
    expect(preview.missingStudents.map((s) => s.studentId)).toEqual([
      's3',
      's4',
    ]);
  });

  it('2-р хэсгийн багана дутуу/илүү — алдаа; жин зөрвөл анхааруулга; 0 оноотой илүү багана — тооцохгүй', async () => {
    const parsed = await sheet(
      [[1, 'Баяржаргал', 'Амарболд']],
      [1, 2, '1-1', '1-3', '1-4'],
      [1, 3, 2, 4, 0],
    );
    const preview = new GradebookService({} as never, {} as never).buildPreview(
      parsed,
      items,
      roster,
    );
    expect(preview.errors).toEqual([
      '«1-3» багана энэ шалгалтад алга (4 оноо)',
      'Excel-д 1-2 багана алга',
    ]);
    expect(preview.warnings).toEqual([
      '«2»: Excel-д 3 оноо, системд 2 — системийн оноогоор бодно',
      '0 оноотой 1-4 баганыг тооцохгүй',
    ]);
  });
});
