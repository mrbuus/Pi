import { ForbiddenException } from '@nestjs/common';
import { ThousandService } from './thousand.service';
import { buildYoutubeWorkbook, parseYoutubeWorkbook } from './youtube-sheet';
import { withRevisionFakes } from '../../test/fakes/revision-db';

jest.mock('../common/access', () => ({
  assertInternalTeachingStaff: jest.fn(),
  collectContentScope: jest.fn(),
}));
// eslint-disable-next-line @typescript-eslint/no-require-imports
const access = require('../common/access') as {
  assertInternalTeachingStaff: jest.Mock;
  collectContentScope: jest.Mock;
};

const NOW = new Date('2026-10-10T00:00:00Z');
const day = 24 * 60 * 60 * 1000;
const noScope = { all: false, testIds: [], chapterIds: [], bookIds: [] };

const test1000 = {
  id: 'test-1',
  title: 'Тест 10-A',
  type: 'THOUSAND',
  deletedAt: null,
  chapterId: 'ch-1',
  chapter: { bookId: 'book-1000' },
  problems: [
    {
      problemId: 'p1',
      order: 1,
      points: 1,
      problem: {
        id: 'p1',
        format: 'CHOICE',
        statementText: 'Хамгийн их тоог ол.',
        imageKey: 'fig-0a1b2c.png',
        choices: ['$1$', '$2$', '$3$', '$4$', '$5$'],
        correctAnswer: 'E',
        youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        // импортер ProblemChoice мөр үүсгэдэг (isCorrect) — hasKnownAnswer үүнийг шаардана
        choiceOptions: ['$1$', '$2$', '$3$', '$4$', '$5$'].map((text, order) => ({
          order,
          text,
          isCorrect: order === 4,
        })),
        analysis: { answerKeyStatus: 'VERIFIED', solutionOutline: '**Хариу: E**' },
      },
    },
    {
      problemId: 'p2',
      order: 2,
      points: 7,
      problem: {
        id: 'p2',
        format: 'FILL_NUMBER',
        statementText: '$x=[a]$, $y=[b]$',
        imageKey: null,
        choices: null,
        // хөдөлгүүр нүднүүдийг нэг стрингээр илгээдэг тул импортер ингэж хадгална
        correctAnswer: '32',
        youtubeUrl: null,
        choiceOptions: [],
        analysis: { answerKeyStatus: 'REVIEW_REQUIRED', solutionOutline: 'Бодолт' },
      },
    },
  ],
};

function makePrisma(opts: {
  classRows: Array<Record<string, unknown>>;
  enrollments?: Array<{ classroomId: string }>;
  session?: Record<string, unknown> | null;
}) {
  return {
    test: { findUnique: jest.fn().mockResolvedValue(test1000) },
    testAttemptSession: {
      findUnique: jest.fn().mockResolvedValue(
        opts.session === undefined
          ? {
              status: 'SUBMITTED',
              submittedAt: new Date(NOW.getTime() - day),
              // display index 0 → original index 4 (E); FILL partly right
              draftAnswers: { p1: 0, p2: '39' },
              choiceOrder: { p1: [4, 0, 1, 2, 3] },
            }
          : opts.session,
      ),
    },
    enrollment: {
      findMany: jest.fn().mockResolvedValue(opts.enrollments ?? [{ classroomId: 'class-A' }]),
    },
    testResult: { findUnique: jest.fn().mockResolvedValue({ totalScore: 1, maxScore: 8 }) },
    testAccess: {
      findMany: jest.fn().mockImplementation(({ where }) =>
        Promise.resolve(
          opts.classRows.filter((r) => (where.classroomId.in as string[]).includes(r.classroomId as string)),
        ),
      ),
    },
  };
}

const row = (over: Record<string, unknown> = {}) => ({
  classroomId: 'class-A',
  assignedAt: new Date(NOW.getTime() - 2 * day),
  reviewLevel: 'NONE',
  reviewAutoAt: null,
  reviewOpenedAt: null,
  ...over,
});

describe('ThousandService.studentReview — сервер талын хаалт', () => {
  beforeEach(() => {
    access.collectContentScope.mockResolvedValue(noScope);
  });

  it('NONE: бодлого, хариу юу ч буцаахгүй, хэзээ нээгдэхийг хэлнэ', async () => {
    const service = new ThousandService(makePrisma({ classRows: [row()] }) as never);
    const res = await service.studentReview('test-1', 'student-1', NOW);
    expect(res.level).toBe('NONE');
    expect(res.items).toEqual([]);
    expect(res.opensAt?.toISOString()).toBe(new Date(NOW.getTime() + 5 * day).toISOString());
    expect(JSON.stringify(res)).not.toMatch(/correctAnswer|solution|youtube|statementText/);
  });

  it('PROBLEMS: бодлого + зураг + өөрийн хариу (канон үсгээр), зөв хариу/бодолт/YouTube ЗАДРАХГҮЙ', async () => {
    const service = new ThousandService(
      makePrisma({ classRows: [row({ reviewLevel: 'PROBLEMS', reviewOpenedAt: NOW })] }) as never,
    );
    const res = await service.studentReview('test-1', 'student-1', NOW);
    expect(res.level).toBe('PROBLEMS');
    expect(res.items).toHaveLength(2);
    expect(res.items[0]).toMatchObject({
      n: 1,
      statementText: 'Хамгийн их тоог ол.',
      imageKey: 'fig-0a1b2c.png',
      myAnswer: 'E',
      answered: true,
    });
    expect(res.items[1]).toMatchObject({ myAnswer: '39' });
    for (const item of res.items) {
      for (const key of ['correct', 'correctAnswer', 'solution', 'youtube', 'answerKnown']) {
        expect(item).not.toHaveProperty(key);
      }
    }
  });

  it('FULL: зөв хариу, бодолт, YouTube (nocookie embed), шалгах шаардлагатай тэмдэг', async () => {
    const service = new ThousandService(
      makePrisma({ classRows: [row({ reviewLevel: 'FULL', reviewOpenedAt: NOW })] }) as never,
    );
    const res = await service.studentReview('test-1', 'student-1', NOW);
    expect(res.level).toBe('FULL');
    expect(res.items[0]).toMatchObject({
      correct: true,
      correctAnswer: 'E',
      solution: '**Хариу: E**',
      answerNeedsCheck: false,
      youtube: { embedUrl: 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ' },
    });
    expect(res.items[1]).toMatchObject({
      correct: false,
      correctAnswer: '32',
      answerNeedsCheck: true,
      youtube: null,
    });
  });

  it('гараар хөндөөгүй: reviewAutoAt өнгөрсний дараа автоматаар FULL', async () => {
    const before = new ThousandService(
      makePrisma({ classRows: [row({ reviewAutoAt: new Date(NOW.getTime() + 1000) })] }) as never,
    );
    expect((await before.studentReview('test-1', 's', NOW)).level).toBe('NONE');
    const after = new ThousandService(
      makePrisma({ classRows: [row({ reviewAutoAt: new Date(NOW.getTime() - 1000) })] }) as never,
    );
    const res = await after.studentReview('test-1', 's', NOW);
    expect(res.level).toBe('FULL');
    expect(res.items[0]).toHaveProperty('solution');
  });

  it('өгөгдмөл 7 хоног: ангид оноосноос 7 хоногийн дараа FULL', async () => {
    const service = new ThousandService(
      makePrisma({ classRows: [row({ assignedAt: new Date(NOW.getTime() - 7 * day) })] }) as never,
    );
    expect((await service.studentReview('test-1', 's', NOW)).level).toBe('FULL');
  });

  it('өөр ангийн сурагч (тест тэр ангид оноогдоогүй, худалдан аваагүй) — татгалзана', async () => {
    const prisma = makePrisma({
      classRows: [row({ classroomId: 'class-A', reviewLevel: 'FULL', reviewOpenedAt: NOW })],
      enrollments: [{ classroomId: 'class-B' }],
    });
    const service = new ThousandService(prisma as never);
    await expect(service.studentReview('test-1', 'other', NOW)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('илгээгээгүй сурагч — татгалзана', async () => {
    const service = new ThousandService(
      makePrisma({ classRows: [row({ reviewLevel: 'FULL', reviewOpenedAt: NOW })], session: null }) as never,
    );
    await expect(service.studentReview('test-1', 's', NOW)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('ангигүй, тест худалдаж авсан сурагч: илгээснээс 7 хоногийн дараа FULL', async () => {
    access.collectContentScope.mockResolvedValue({ ...noScope, testIds: ['test-1'] });
    const service = new ThousandService(
      makePrisma({ classRows: [], enrollments: [] }) as never,
    );
    const res = await service.studentReview('test-1', 'buyer', NOW);
    expect(res.level).toBe('NONE');
    expect(res.items).toEqual([]);
  });
});

describe('ThousandService.setYoutube — URL шалгалт', () => {
  const prisma: Record<string, unknown> = withRevisionFakes({
    testProblem: { findFirst: jest.fn().mockResolvedValue({ problemId: 'p1' }) },
    problem: { update: jest.fn().mockResolvedValue({}) },
  });
  prisma.$transaction = (callback: (tx: unknown) => unknown) => callback(prisma);
  const service = new ThousandService(prisma as never);
  beforeEach(() => access.assertInternalTeachingStaff.mockResolvedValue('TEACHER_PLUS'));

  it('youtu.be → каноник хэлбэрээр хадгална', async () => {
    const res = await service.setYoutube('p1', 'https://youtu.be/dQw4w9WgXcQ?si=x', 'u');
    expect(res.youtubeUrl).toBe('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
  });
  it('буруу холбоос — 400', async () => {
    await expect(service.setYoutube('p1', 'https://vimeo.com/123', 'u')).rejects.toThrow('YouTube');
  });
  it('хоосон → устгана', async () => {
    expect((await service.setYoutube('p1', '', 'u')).youtubeUrl).toBeNull();
  });
  it('энгийн TEACHER засахгүй', async () => {
    access.assertInternalTeachingStaff.mockResolvedValue('TEACHER');
    await expect(service.setYoutube('p1', null, 'u')).rejects.toBeInstanceOf(ForbiddenException);
  });
});

describe('YouTube Excel', () => {
  it('татсан загварыг буцааж уншина', async () => {
    const buf = await buildYoutubeWorkbook([
      { testTitle: 'Тест 10-A', number: 1, url: 'https://youtu.be/dQw4w9WgXcQ' },
      { testTitle: 'Тест 10-A', number: 2, url: null },
    ]);
    const rows = await parseYoutubeWorkbook(buf);
    expect(rows).toEqual([
      { rowNumber: 2, testTitle: 'Тест 10-A', numberText: '1', url: 'https://youtu.be/dQw4w9WgXcQ' },
    ]);
  });

  it('импорт: нэг мөр алдаатай бол юу ч өөрчлөхгүй', async () => {
    access.assertInternalTeachingStaff.mockResolvedValue('ADMIN');
    const prisma = {
      test: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 't',
            title: 'Тест 10-A',
            problems: [
              { order: 1, problemId: 'p1', problem: { youtubeUrl: null } },
              { order: 2, problemId: 'p2', problem: { youtubeUrl: null } },
            ],
          },
        ]),
      },
      problem: { update: jest.fn() },
      $transaction: jest.fn(),
    };
    const service = new ThousandService(prisma as never);
    const buf = await buildYoutubeWorkbook([
      { testTitle: 'Тест 10-A', number: 1, url: 'https://youtu.be/dQw4w9WgXcQ' },
      { testTitle: 'Тест 10-A', number: 2, url: 'https://vimeo.com/1' },
      { testTitle: 'Байхгүй тест', number: 1, url: 'https://youtu.be/dQw4w9WgXcQ' },
    ]);
    const res = await service.importYoutube(buf, 'admin');
    expect(res.applied).toBe(false);
    expect(res.errors.map((e) => e.row)).toEqual([3, 4]);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});

describe('1000 бодлого — сурагчийн хариунд бодлогын код байхгүй', () => {
  it('FULL эргэн харалтад token/код алга', async () => {
    access.collectContentScope.mockResolvedValue(noScope);
    const service = new ThousandService(
      makePrisma({ classRows: [row({ reviewLevel: 'FULL', reviewOpenedAt: NOW })] }) as never,
    );
    const res = await service.studentReview('test-1', 'student-1', NOW);
    expect(JSON.stringify(res)).not.toMatch(/"token"|1000-S10A-\d/);
  });
});
