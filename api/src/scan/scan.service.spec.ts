import { NotFoundException } from '@nestjs/common';
import { ScanService } from './scan.service';

jest.mock('../common/access', () => ({ collectContentScope: jest.fn() }));
// eslint-disable-next-line @typescript-eslint/no-require-imports
const access = require('../common/access') as { collectContentScope: jest.Mock };

const NOW = new Date('2026-11-01T00:00:00Z');
const day = 24 * 60 * 60 * 1000;
const noScope = { all: false, testIds: [], chapterIds: [], bookIds: [] };

function problemRow(testType: 'THOUSAND' | 'CHAPTER_EXAM', status = 'VERIFIED') {
  return {
    id: 'p1',
    format: 'CHOICE',
    statementText: 'Хамгийн их тоог ол.',
    imageKey: 'fig-0a1b2c.png',
    choices: ['$1$', '$2$', '$3$', '$4$', '$5$'],
    correctAnswer: 'E',
    youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    page: 23,
    number: 5,
    chapter: { title: 'Тест 10', book: { title: '1000 бодлого' } },
    choiceOptions: ['$1$', '$2$', '$3$', '$4$', '$5$'].map((text, order) => ({
      order,
      text,
      isCorrect: order === 4,
      imageKey: null,
    })),
    analysis: { status, answerKeyStatus: 'VERIFIED', solutionOutline: '**Хариу: E**' },
    testItems: [{ test: { id: 't1', type: testType, chapterId: 'ch-1', chapter: { bookId: 'b1' } } }],
  };
}

function makeService(opts: {
  problem: unknown;
  sessions?: { testId: string; submittedAt: Date }[];
  enrollments?: { classroomId: string }[];
  accessRows?: unknown[];
}) {
  const prisma = {
    problem: { findFirst: jest.fn().mockResolvedValue(opts.problem) },
    testAttemptSession: { findMany: jest.fn().mockResolvedValue(opts.sessions ?? []) },
    enrollment: { findMany: jest.fn().mockResolvedValue(opts.enrollments ?? []) },
    testAccess: { findMany: jest.fn().mockResolvedValue(opts.accessRows ?? []) },
  };
  return { service: new ScanService(prisma as never), prisma };
}

beforeEach(() => access.collectContentScope.mockResolvedValue(noScope));

describe('ScanService.lookup', () => {
  it('буруу код → 404, сан руу хандахгүй', async () => {
    const { service, prisma } = makeService({ problem: null });
    await expect(service.lookup('bad!', 'u1', 'STUDENT' as never, NOW)).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.problem.findFirst).not.toHaveBeenCalled();
  });

  it('кодыг каноник болгож, устгаагүй бодлогоос хайна', async () => {
    const { service, prisma } = makeService({ problem: null });
    await expect(service.lookup('ab12-cd34', 'u1', 'STUDENT' as never, NOW)).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.problem.findFirst.mock.calls[0][0].where).toEqual({ scanCode: 'AB12CD34', deletedAt: null });
  });

  it('өгөөгүй сурагч: нөхцөл харна, хариу/бодолт/YouTube/token ЗАДРАХГҮЙ', async () => {
    const { service } = makeService({ problem: problemRow('THOUSAND') });
    const r = (await service.lookup('AB12CD34', 'u1', 'STUDENT' as never, NOW)) as Record<string, unknown>;
    expect(r.access).toBe('LOCKED');
    expect(r.lockReason).toBe('NOT_TAKEN');
    expect(r.statementText).toBe('Хамгийн их тоог ол.');
    expect(r.choices).toHaveLength(5);
    for (const key of ['solution', 'correctAnswer', 'youtube', 'token']) expect(r).not.toHaveProperty(key);
    // зураг /files эрхгүй үед хоосон хайрцаг болохгүйн тулд түлхүүрийг илгээхгүй
    expect(r.imageKey).toBeNull();
    expect(r.hasImage).toBe(true);
    expect(JSON.stringify(r)).not.toContain('isCorrect');
  });

  it('1000: илгээсэн, 7 хоног болоогүй → WAITING + нээгдэх огноо', async () => {
    const assignedAt = new Date(NOW.getTime() - 2 * day);
    const { service } = makeService({
      problem: problemRow('THOUSAND'),
      sessions: [{ testId: 't1', submittedAt: NOW }],
      enrollments: [{ classroomId: 'c1' }],
      accessRows: [
        { testId: 't1', classroomId: 'c1', assignedAt, reviewLevel: 'NONE', reviewAutoAt: null, reviewOpenedAt: null },
      ],
    });
    const r = (await service.lookup('AB12CD34', 'u1', 'STUDENT' as never, NOW)) as Record<string, unknown>;
    expect(r.lockReason).toBe('WAITING');
    expect(r.opensAt).toEqual(new Date(assignedAt.getTime() + 7 * day));
    expect(r).not.toHaveProperty('solution');
  });

  it('1000: илгээсэн, 7 хоног өнгөрсөн → хариу, бодолт, YouTube', async () => {
    const { service } = makeService({
      problem: problemRow('THOUSAND'),
      sessions: [{ testId: 't1', submittedAt: NOW }],
      enrollments: [{ classroomId: 'c1' }],
      accessRows: [
        {
          testId: 't1',
          classroomId: 'c1',
          assignedAt: new Date(NOW.getTime() - 8 * day),
          reviewLevel: 'NONE',
          reviewAutoAt: null,
          reviewOpenedAt: null,
        },
      ],
    });
    const r = (await service.lookup('AB12CD34', 'u1', 'STUDENT' as never, NOW)) as Record<string, unknown>;
    expect(r.access).toBe('FULL');
    expect(r.imageKey).toBe('fig-0a1b2c.png');
    expect(r.correctAnswer).toBe('E');
    expect(r.solution).toBe('**Хариу: E**');
    expect(r.youtube).toEqual({
      url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      embedUrl: 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ',
    });
  });

  it('1000: өөр тестийн эрх тухайн тестэд нөлөөлөхгүй', async () => {
    const { service } = makeService({
      problem: problemRow('THOUSAND'),
      sessions: [{ testId: 't1', submittedAt: NOW }],
      enrollments: [{ classroomId: 'c1' }],
      accessRows: [
        {
          testId: 'other',
          classroomId: 'c1',
          assignedAt: new Date(NOW.getTime() - 30 * day),
          reviewLevel: 'FULL',
          reviewAutoAt: null,
          reviewOpenedAt: NOW,
        },
      ],
    });
    const r = (await service.lookup('AB12CD34', 'u1', 'STUDENT' as never, NOW)) as Record<string, unknown>;
    expect(r.access).toBe('LOCKED');
  });

  it('бүлгийн тест: илгээсэн + VERIFIED → зөвхөн бодолт, зөв хариу биш', async () => {
    const { service } = makeService({
      problem: problemRow('CHAPTER_EXAM'),
      sessions: [{ testId: 't1', submittedAt: NOW }],
    });
    const r = (await service.lookup('AB12CD34', 'u1', 'STUDENT' as never, NOW)) as Record<string, unknown>;
    expect(r.access).toBe('SOLUTION');
    expect(r.solution).toBe('**Хариу: E**');
    expect(r).not.toHaveProperty('correctAnswer');
    expect(r).not.toHaveProperty('youtube');
  });

  it('бүлгийн тест: бодолт AUTO_DRAFT бол илгээсэн ч нээхгүй', async () => {
    const { service } = makeService({
      problem: problemRow('CHAPTER_EXAM', 'AUTO_DRAFT'),
      sessions: [{ testId: 't1', submittedAt: NOW }],
    });
    const r = (await service.lookup('AB12CD34', 'u1', 'STUDENT' as never, NOW)) as Record<string, unknown>;
    expect(r.access).toBe('LOCKED');
    expect(r).not.toHaveProperty('solution');
  });

  it('ажилтан: тестийн мөр шалгахгүйгээр бүгдийг харна', async () => {
    const { service, prisma } = makeService({ problem: problemRow('THOUSAND') });
    const r = (await service.lookup('AB12CD34', 'u1', 'TEACHER' as never, NOW)) as Record<string, unknown>;
    expect(r.access).toBe('FULL');
    expect(prisma.testAttemptSession.findMany).not.toHaveBeenCalled();
  });
});
