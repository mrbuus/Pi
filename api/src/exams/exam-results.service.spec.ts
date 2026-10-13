import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ROLES_KEY } from '../auth/decorators/roles.decorator';
import { stripProblemTokens } from '../common/strip-problem-token.interceptor';
import { ExamResultsController } from './exam-results.controller';
import { ExamResultsService } from './exam-results.service';

jest.mock('../common/access', () => ({
  assertInternalTeachingStaff: jest.fn(),
  canAccessChapter: jest.fn().mockResolvedValue(true),
  collectContentScope: jest.fn().mockResolvedValue({
    all: false,
    chapterIds: [],
    bookIds: [],
    testIds: [],
  }),
}));

const TOKEN = '1000-S10A-01';
const DAY = 24 * 60 * 60 * 1000;

// 3 сонгох (1-р хэсэг) + 1 нөхөх бодлого; ӨС-ийн мөрөнд код (token) байсан ч
// хариунд хэзээ ч гарахгүй ёстой.
function problemRow(
  n: number,
  chapter = 'Логарифм · Тест 1',
  extra: Record<string, unknown> = {},
) {
  return {
    problemId: `q${n}`,
    order: n,
    points: 1,
    problem: {
      id: `q${n}`,
      token: `${TOKEN}-${n}`,
      format: 'CHOICE',
      statementText: `Бодлого ${n}`,
      imageKey: null,
      choices: null,
      correctAnswer: null,
      scoringGroups: null,
      youtubeUrl: 'https://youtu.be/dQw4w9WgXcQ',
      choiceOptions: [
        { order: 0, text: 'x', isCorrect: false, mistakeNote: null },
        { order: 1, text: 'y', isCorrect: true, mistakeNote: null },
      ],
      analysis: {
        status: 'AUTO_DRAFT',
        answerKeyStatus: 'VERIFIED',
        solutionOutline: `Бодолт ${n}`,
      },
      chapter: { id: `ch-${chapter}`, title: chapter, topic: null },
      tags: [],
      ...extra,
    },
  };
}

function testRow(type: string, chapters?: string[]) {
  return {
    id: 'test-1',
    title: 'Сорил',
    type,
    gradingMode: 'AUTO',
    chapterId: 'ch-test',
    chapter: { bookId: 'b1000' },
    deletedAt: null,
    isDraft: false,
    problems: [1, 2, 3, 4].map((n) => problemRow(n, chapters?.[n - 1])),
  };
}

function prismaMock(opts: {
  type: string;
  access?: Record<string, unknown>[];
  source?: string;
  session?: boolean;
  chapters?: string[];
}) {
  const statuses = ['CORRECT', 'WRONG', 'CORRECT', 'BLANK'];
  return {
    test: {
      findUnique: jest
        .fn()
        .mockResolvedValue(testRow(opts.type, opts.chapters)),
    },
    testResult: {
      findMany: jest.fn().mockResolvedValue([
        {
          id: 'r1',
          studentId: 'stu',
          totalScore: 2,
          maxScore: 4,
          source: opts.source ?? 'ONLINE_TEST',
          createdAt: new Date(Date.now() - DAY),
        },
      ]),
      findUnique: jest.fn().mockResolvedValue({
        id: 'r1',
        testId: 'test-1',
        studentId: 'stu',
        createdAt: new Date(Date.now() - DAY),
        student: { studentProfile: { type: 'CLASSROOM' } },
        acknowledgements: [],
      }),
    },
    testAbsence: { findMany: jest.fn().mockResolvedValue([]) },
    testItemMark: {
      findMany: jest.fn().mockResolvedValue(
        statuses.map((status, i) => ({
          studentId: 'stu',
          itemKey: `p:q${i + 1}`,
          status,
        })),
      ),
    },
    testAttemptSession: {
      findMany: jest.fn().mockResolvedValue(
        opts.session === false
          ? []
          : [
              {
                studentId: 'stu',
                submittedAt: new Date(Date.now() - DAY),
                draftAnswers: { q1: 1, q2: 0, q3: 1 },
                choiceOrder: {},
              },
            ],
      ),
    },
    enrollment: {
      findMany: jest.fn().mockResolvedValue([{ classroomId: 'c1' }]),
    },
    testAccess: { findMany: jest.fn().mockResolvedValue(opts.access ?? []) },
    chapter: { findMany: jest.fn().mockResolvedValue([]) },
    parentLink: { findUnique: jest.fn() },
  };
}

/** Хариунд бодлогын код, ID огт байхгүй эсэх (түлхүүр ба утга хоёулаа). */
function expectNoProblemIds(payload: unknown) {
  const json = JSON.stringify(payload);
  expect(json).not.toContain(TOKEN);
  expect(json).not.toMatch(/"(token|problemToken|problemId)"/);
  expect(json).not.toContain('"q1"');
  // Интерцептор дамжсан ч хэлбэр өөрчлөгдөхгүй (аль хэдийн цэвэр)
  expect(stripProblemTokens(payload)).toBe(payload);
}

describe('Сурагчийн дүнгийн дэлгэц', () => {
  it('1000 бодлого, хаалт нээгдээгүй: нийт/хэсэг харагдана, буруу бодлого, бодолт, бичлэг нуугдана', async () => {
    const db = prismaMock({
      type: 'THOUSAND',
      access: [
        {
          classroomId: 'c1',
          assignedAt: new Date(),
          reviewLevel: 'NONE',
          reviewAutoAt: null,
          reviewOpenedAt: null,
        },
      ],
    });
    const res = await new ExamResultsService(db as never).myResult(
      'test-1',
      'stu',
      'STUDENT',
    );
    expect(res.result).toEqual({ totalScore: 2, maxScore: 4, percent: 50 });
    expect(res.parts).toEqual({ part1: 2, part1Max: 4, part2: 0, part2Max: 0 });
    expect(res.review).toEqual(
      expect.objectContaining({ level: 'NONE', open: false }),
    );
    expect(res.review!.opensAt).toBeInstanceOf(Date);
    expect(res.wrong).toBeNull();
    // 4 зүйлтэй ганц сэдэв (≥3) — нээгдээгүй ч харагдана
    expect(res.topics).toEqual([
      { name: 'Логарифм', percent: 50, earned: 2, max: 4 },
    ]);
    const json = JSON.stringify(res);
    expect(json).not.toContain('Бодолт');
    expect(json).not.toContain('youtube');
    expectNoProblemIds(res);
  });

  it('1000 бодлого, багш FULL нээсэн: буруу бодлого + өөрийн хариу + зөв хариу + бодолт + бичлэг', async () => {
    const db = prismaMock({
      type: 'THOUSAND',
      access: [
        {
          classroomId: 'c1',
          assignedAt: new Date(),
          reviewLevel: 'FULL',
          reviewAutoAt: null,
          reviewOpenedAt: new Date(),
        },
      ],
    });
    const res = await new ExamResultsService(db as never).myResult(
      'test-1',
      'stu',
      'STUDENT',
    );
    expect(res.review).toEqual(
      expect.objectContaining({ level: 'FULL', open: true, fullReview: true }),
    );
    expect(res.wrong!.map((w) => [w.n, w.items.map((i) => i.status)])).toEqual([
      [2, ['WRONG']],
      [4, ['BLANK']],
    ]);
    expect(res.wrong![0].problem).toEqual(
      expect.objectContaining({
        myAnswer: 'A',
        correctAnswer: 'B',
        solution: 'Бодолт 2',
        youtube: {
          url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          embedUrl: 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ',
        },
      }),
    );
    expect(res.wrong![1].problem!.myAnswer).toBeNull();
    expectNoProblemIds(res);
  });

  it('PROBLEMS түвшин: зөв/буруу ч задрахгүй (зөв хариу задрахаас сэргийлнэ)', async () => {
    const db = prismaMock({
      type: 'THOUSAND',
      access: [
        {
          classroomId: 'c1',
          assignedAt: new Date(),
          reviewLevel: 'PROBLEMS',
          reviewAutoAt: null,
          reviewOpenedAt: new Date(),
        },
      ],
    });
    const res = await new ExamResultsService(db as never).myResult(
      'test-1',
      'stu',
      'STUDENT',
    );
    expect(res.wrong).toBeNull();
    expect(res.review).toEqual(
      expect.objectContaining({ level: 'PROBLEMS', fullReview: true }),
    );
  });

  it('сэдвийн шалгалт (цаасан): буруу бодлого шууд, зөв хариугүй, зөвхөн баталгаажсан бодолт', async () => {
    const db = prismaMock({
      type: 'CHAPTER_EXAM',
      source: 'CHAPTER_EXAM',
      session: false,
    });
    const res = await new ExamResultsService(db as never).myResult(
      'test-1',
      'stu',
      'STUDENT',
    );
    expect(res.review).toEqual(
      expect.objectContaining({ level: 'FULL', open: true, fullReview: false }),
    );
    expect(res.wrong).toHaveLength(2);
    expect(res.wrong![0].problem).toEqual(
      expect.objectContaining({
        myAnswer: null,
        correctAnswer: null,
        solution: null, // AUTO_DRAFT бодолт сурагчид очихгүй
      }),
    );
    expectNoProblemIds(res);
  });

  it('дүнгүй бол 404, ирээгүй бол зөвхөн «Ирээгүй»', async () => {
    const db = prismaMock({ type: 'CHAPTER_EXAM' });
    db.testResult.findMany.mockResolvedValue([]);
    db.testItemMark.findMany.mockResolvedValue([]);
    await expect(
      new ExamResultsService(db as never).myResult('test-1', 'stu', 'STUDENT'),
    ).rejects.toBeInstanceOf(NotFoundException);
    db.testAbsence.findMany.mockResolvedValue([{ studentId: 'stu' }]);
    const res = await new ExamResultsService(db as never).myResult(
      'test-1',
      'stu',
      'STUDENT',
    );
    expect(res).toEqual(
      expect.objectContaining({ absent: true, result: null }),
    );
  });

  it('ижил сэдвийн давтлага: сул сэдвийн бүлгүүд (энэ шалгалтын бодлогыг хасна)', async () => {
    const db = prismaMock({
      type: 'CHAPTER_EXAM',
      source: 'CHAPTER_EXAM',
      session: false,
    });
    db.chapter.findMany.mockResolvedValue([
      {
        id: 'ch2',
        title: 'Логарифм · Тест 2',
        bookId: 'b',
        freePreview: false,
      },
      {
        id: 'ch9',
        title: 'Логарифмын хэрэглээ · Тест 1',
        bookId: 'b',
        freePreview: false,
      },
    ]);
    const res = await new ExamResultsService(db as never).myResult(
      'test-1',
      'stu',
      'STUDENT',
    );
    expect(res.practice).toEqual({ topic: 'Логарифм', chapterIds: ['ch2'] });
    const [args] = db.chapter.findMany.mock.calls[0] as [{ where: unknown }];
    expect(JSON.stringify(args.where)).toContain(
      '"notIn":["q1","q2","q3","q4"]',
    );
  });
});

describe('Эцэг эхийн дүнгийн карт', () => {
  it('баталгаажаагүй холболт — 403', async () => {
    const db = prismaMock({ type: 'CHAPTER_EXAM' });
    db.parentLink.findUnique.mockResolvedValue({ verifiedAt: null });
    await expect(
      new ExamResultsService(db as never).parentCard('r1', 'parent-1'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('оноо, сул сэдэв (≤3), танилцах боломж — код/ID-гүй', async () => {
    const db = prismaMock({
      type: 'CHAPTER_EXAM',
      source: 'CHAPTER_EXAM',
      session: false,
      chapters: [
        'Логарифм · Тест 1',
        'Логарифм · Тест 1',
        'Интеграл · Тест 2',
        'Интеграл · Тест 2',
      ],
    });
    db.parentLink.findUnique.mockResolvedValue({ verifiedAt: new Date() });
    const res = await new ExamResultsService(db as never).parentCard(
      'r1',
      'parent-1',
    );
    expect(res).toEqual(
      expect.objectContaining({
        testResultId: 'r1',
        totalScore: 2,
        maxScore: 4,
        percent: 50,
        weakTopics: [
          { name: 'Интеграл', percent: 50 },
          { name: 'Логарифм', percent: 50 },
        ],
        acknowledgedAt: null,
        canAcknowledge: true,
      }),
    );
    expectNoProblemIds(res);
  });

  it('ганц сэдэв (бүх шалгалт) бол сул сэдэв харуулахгүй', async () => {
    const db = prismaMock({
      type: 'CHAPTER_EXAM',
      source: 'CHAPTER_EXAM',
      session: false,
    });
    db.parentLink.findUnique.mockResolvedValue({ verifiedAt: new Date() });
    const res = await new ExamResultsService(db as never).parentCard(
      'r1',
      'parent-1',
    );
    expect(res.weakTopics).toEqual([]);
  });
});

describe('Сурагч/эцэг эхийн маршрутын эрх', () => {
  it.each([
    ['my', ['STUDENT', 'BUYER']],
    ['myResult', ['STUDENT', 'BUYER']],
    ['parentCard', ['PARENT']],
  ] as const)('%s → %j', (name, roles) => {
    expect(
      Reflect.getMetadata(ROLES_KEY, ExamResultsController.prototype[name]),
    ).toEqual(roles);
  });
});
