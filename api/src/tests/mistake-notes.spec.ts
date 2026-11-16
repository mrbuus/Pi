import { mistakeNotesOf } from './mistake-notes';
import { TestsService } from './tests.service';

describe('mistakeNotesOf — «Түгээмэл алдаа»', () => {
  const opts = [
    { order: 2, text: '3', isCorrect: false, mistakeNote: '  тэмдэг алдсан ' },
    { order: 0, text: '1', isCorrect: true, mistakeNote: 'зөв хариуны тайлбар' },
    { order: 1, text: '2', isCorrect: false, mistakeNote: 'хуваахаа мартсан' },
    { order: 3, text: '4', isCorrect: false, mistakeNote: '   ' },
    { order: 4, text: '5', isCorrect: false, mistakeNote: null },
  ];

  it('зөвхөн буруу, хоосон биш тайлбар; канон үсэг order-оор; сурагчийнх эхэнд', () => {
    expect(mistakeNotesOf(opts, 2)).toEqual([
      { label: 'C', text: '3', note: 'тэмдэг алдсан', mine: true },
      { label: 'B', text: '2', note: 'хуваахаа мартсан', mine: false },
    ]);
  });

  it('тайлбаргүй / сонголтгүй бол хоосон', () => {
    expect(mistakeNotesOf([], null)).toEqual([]);
    expect(mistakeNotesOf(null, null)).toEqual([]);
    expect(
      mistakeNotesOf([{ order: 0, text: 'x', isCorrect: false, mistakeNote: null }], 0),
    ).toEqual([]);
  });
});

// Бодлогын мөр — шалгалтын хамгийн муу тохиолдол: ӨС-ээс mistakeNote, isCorrect
// ирсэн ч шалгалтын үеийн хариунд гарах ёсгүй.
function testRow(status: string) {
  return {
    id: 't1',
    title: 'Тест',
    type: 'CHAPTER_TEST',
    gradingMode: 'AUTO',
    timeLimitMin: null,
    variantLabel: null,
    chapterId: 'ch',
    deletedAt: null,
    access: [],
    problems: [
      {
        problemId: 'p1',
        order: 1,
        points: 1,
        problem: {
          id: 'p1',
          format: 'CHOICE',
          statementText: 'Бодлого',
          imageKey: null,
          choices: null,
          correctAnswer: null,
          scoringGroups: null,
          attemptCount: 0,
          correctRate: null,
          choiceOptions: [
            { order: 0, text: 'x', isCorrect: false, imageKey: null, mistakeNote: 'НУУЦ_ТАЙЛБАР_A' },
            { order: 1, text: 'y', isCorrect: true, imageKey: null, mistakeNote: null },
            { order: 2, text: 'z', isCorrect: false, imageKey: null, mistakeNote: 'НУУЦ_ТАЙЛБАР_C' },
          ],
          analysis: { status, solutionOutline: 'Бодолт' },
          chapter: { id: 'ch', title: 'Бүлэг' },
        },
      },
    ],
  };
}

function prismaMock(status: string, sessionStatus: string) {
  return {
    test: { findUnique: jest.fn().mockResolvedValue(testRow(status)) },
    testAttemptSession: {
      findUnique: jest.fn().mockResolvedValue({
        id: 's1',
        status: sessionStatus,
        problemOrder: ['p1'],
        // display 0 → эх 2 (z), display 1 → эх 0 (x), display 2 → эх 1 (y)
        choiceOrder: { p1: [2, 0, 1] },
        draftAnswers: { p1: 0 },
        draftStates: {},
        problemTimes: {},
        leaveCount: 0,
        deadlineAt: null,
        events: [],
      }),
    },
    testResult: {
      findUnique: jest.fn().mockResolvedValue({ totalScore: 0, maxScore: 1, createdAt: new Date() }),
    },
    problemChoice: {
      findMany: jest.fn().mockResolvedValue([
        { problemId: 'p1', order: 0, mistakeNote: 'НУУЦ_ТАЙЛБАР_A' },
        { problemId: 'p1', order: 2, mistakeNote: 'НУУЦ_ТАЙЛБАР_C' },
      ]),
    },
  };
}

describe('TestsService — «Түгээмэл алдаа» эргэн харалт', () => {
  it('бодолт нээлттэй (VERIFIED): сонгосон буруу хариуны тайлбар эхэнд', async () => {
    const db = prismaMock('VERIFIED', 'SUBMITTED');
    const res = await new TestsService(db as never, {} as never).review('t1', 'stu');
    expect(res.items[0].solution).toBe('Бодолт');
    expect(res.items[0].mistakeNotes).toEqual([
      { label: 'C', text: 'z', note: 'НУУЦ_ТАЙЛБАР_C', mine: true },
      { label: 'A', text: 'x', note: 'НУУЦ_ТАЙЛБАР_A', mine: false },
    ]);
    // Зөв хариу (isCorrect) задрахгүй
    expect(JSON.stringify(res)).not.toMatch(/isCorrect/);
  });

  it('бодолт хаалттай (AUTO_DRAFT): тайлбар огт гарахгүй, ӨС-ээс ч татахгүй', async () => {
    const db = prismaMock('AUTO_DRAFT', 'SUBMITTED');
    const res = await new TestsService(db as never, {} as never).review('t1', 'stu');
    expect(res.items[0].solution).toBeNull();
    expect(res.items[0].mistakeNotes).toEqual([]);
    expect(JSON.stringify(res)).not.toContain('НУУЦ_ТАЙЛБАР');
    expect(db.problemChoice.findMany).not.toHaveBeenCalled();
  });

  it('шалгалт өгч байх үеийн хариунд (start) mistakeNote, isCorrect, бодолт хэзээ ч байхгүй', async () => {
    const db = prismaMock('VERIFIED', 'IN_PROGRESS');
    const service = new TestsService(db as never, {} as never);
    jest
      .spyOn(service as unknown as { assertStudentAccess: () => Promise<void> }, 'assertStudentAccess')
      .mockResolvedValue(undefined);
    const res = await service.start('t1', 'stu');
    expect(res).toHaveProperty('problems');
    const json = JSON.stringify(res);
    expect(json).not.toContain('НУУЦ_ТАЙЛБАР');
    expect(json).not.toMatch(/mistakeNote|isCorrect|solution|Бодолт/);
    // Шалгалтын үеийн ачаалалт mistakeNote-ийг ӨС-ээс огт асуухгүй
    const [args] = db.test.findUnique.mock.calls[0] as [unknown];
    expect(JSON.stringify(args)).not.toContain('mistakeNote');
    expect(db.problemChoice.findMany).not.toHaveBeenCalled();
  });
});
