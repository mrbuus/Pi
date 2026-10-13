import { ForbiddenException } from '@nestjs/common';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { ROLES_KEY } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ExamAnalyticsService } from './exam-analytics.service';
import { ExamsController } from './exams.controller';

jest.mock('../common/access', () => ({
  assertInternalTeachingStaff: jest.fn(),
  canAccessChapter: jest.fn(),
  collectContentScope: jest.fn(),
}));
// eslint-disable-next-line @typescript-eslint/no-require-imports
const access = require('../common/access') as {
  assertInternalTeachingStaff: jest.Mock;
};

// 4 сонгох бодлого, 2 анги: «12-1» (teacher-1, 7 сурагч), «12-2» (teacher-2, 6 сурагч).
const PROBLEMS = [1, 2, 3, 4].map((n) => ({
  problemId: `q${n}`,
  order: n,
  points: 1,
  problem: {
    id: `q${n}`,
    format: 'CHOICE',
    statementText: `Бодлого ${n}`,
    imageKey: null,
    choices: null,
    correctAnswer: null,
    scoringGroups: null,
    youtubeUrl: null,
    choiceOptions: [
      { order: 0, text: 'x', isCorrect: true, mistakeNote: null },
      { order: 1, text: 'y', isCorrect: false, mistakeNote: null },
    ],
    analysis: null,
    chapter: { id: 'ch1', title: 'Интеграл · Тест 1', topic: null },
    tags: [],
  },
}));
const TEST = {
  id: 'test-1',
  title: 'Сорил 10-A',
  type: 'THOUSAND',
  gradingMode: 'AUTO',
  chapterId: null,
  chapter: null,
  problems: PROBLEMS,
  deletedAt: null,
  isDraft: false,
  createdById: 'admin',
};
const CLASSES = [
  { id: 'c1', name: '12-1', teacherId: 'teacher-1', archived: false },
  { id: 'c2', name: '12-2', teacherId: 'teacher-2', archived: false },
];
const ROWS = [
  '1111',
  '1111',
  '1110',
  '1110',
  '1100',
  '1100',
  '1000',
  '1000',
  '0000',
  '0000',
  '1010',
  '0101',
  '1001',
];
const STUDENTS = ROWS.map((row, i) => ({
  id: `s${String(i + 1).padStart(2, '0')}`,
  classroomId: i < 7 ? 'c1' : 'c2',
  row,
}));

type Where = { teacherId?: string } | undefined;
type StudentWhere = { studentId?: { in: string[] } };

function prismaMock() {
  const inScope = (where: Where) =>
    CLASSES.filter((c) => !where?.teacherId || c.teacherId === where.teacherId);
  const ids = (where: StudentWhere) => new Set(where.studentId?.in ?? []);
  return {
    test: { findUnique: jest.fn().mockResolvedValue(TEST) },
    classroom: {
      findMany: jest.fn(({ where }: { where: Where }) =>
        Promise.resolve(inScope(where).map(({ id, name }) => ({ id, name }))),
      ),
      findUnique: jest.fn(({ where }: { where: { id: string } }) =>
        Promise.resolve(CLASSES.find((c) => c.id === where.id) ?? null),
      ),
    },
    testAccess: {
      findMany: jest.fn(({ where }: { where: { classroom: Where } }) =>
        Promise.resolve(
          inScope(where.classroom).map((c) => ({ classroomId: c.id })),
        ),
      ),
    },
    enrollment: {
      findMany: jest.fn(
        ({
          where,
          distinct,
        }: {
          where: { classroomId: { in: string[] } };
          distinct?: unknown;
        }) => {
          if (distinct) return Promise.resolve([]);
          const allowed = new Set(where.classroomId.in);
          return Promise.resolve(
            STUDENTS.filter((s) => allowed.has(s.classroomId)).map((s) => ({
              classroomId: s.classroomId,
              classroom: {
                name: CLASSES.find((c) => c.id === s.classroomId)!.name,
              },
              student: { id: s.id, firstName: s.id, lastName: 'QA' },
            })),
          );
        },
      ),
    },
    testResult: {
      findMany: jest.fn(({ where }: { where: StudentWhere }) =>
        Promise.resolve(
          STUDENTS.filter((s) => ids(where).has(s.id)).map((s) => ({
            id: `r-${s.id}`,
            studentId: s.id,
            totalScore: s.row.split('').filter((c) => c === '1').length,
            maxScore: 4,
            source: 'MANUAL_ENTRY',
            createdAt: new Date('2026-10-01'),
          })),
        ),
      ),
    },
    testAbsence: { findMany: jest.fn().mockResolvedValue([]) },
    testItemMark: {
      findMany: jest.fn(({ where }: { where: StudentWhere }) =>
        Promise.resolve(
          STUDENTS.filter((s) => ids(where).has(s.id)).flatMap((s) =>
            s.row.split('').map((c, i) => ({
              studentId: s.id,
              itemKey: `p:q${i + 1}`,
              status: c === '1' ? 'CORRECT' : 'WRONG',
            })),
          ),
        ),
      ),
    },
    testAttemptSession: { findMany: jest.fn().mockResolvedValue([]) },
    user: { findUnique: jest.fn() },
  };
}

describe('Анализын эрх — ангиар шүүх', () => {
  beforeEach(() => jest.clearAllMocks());

  it('Багш «Бүгд» — зөвхөн өөрийн анги; найдвартай байдал харагдахгүй', async () => {
    access.assertInternalTeachingStaff.mockResolvedValue('TEACHER');
    const db = prismaMock();
    const res = await new ExamAnalyticsService(db as never).analytics(
      'test-1',
      'teacher-1',
      'all',
    );
    expect(res.chips.map((c) => c.id)).toEqual(['c1']);
    expect(res.summary.students).toBe(7);
    expect(res.classes.map((c) => c.id)).toEqual(['c1']);
    expect(res.reliability).toBeNull();
    expect(res.canEditContent).toBe(false);
    // Ангийн жагсаалт, оноолт хоёулаа багшийн ангиар шүүгдсэн
    expect(db.classroom.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { archived: false, teacherId: 'teacher-1' },
      }),
    );
  });

  it('Багш өөр багшийн ангийг сонговол — 403', async () => {
    access.assertInternalTeachingStaff.mockResolvedValue('TEACHER');
    await expect(
      new ExamAnalyticsService(prismaMock() as never).analytics(
        'test-1',
        'teacher-1',
        'c2',
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('Багш+ — бүх анги, 10+ сурагчтай үед найдвартай байдал, ялгах чадвар', async () => {
    access.assertInternalTeachingStaff.mockResolvedValue('TEACHER_PLUS');
    const res = await new ExamAnalyticsService(prismaMock() as never).analytics(
      'test-1',
      'tplus',
      undefined,
    );
    expect(res.chips.map((c) => c.id)).toEqual(['c1', 'c2']);
    expect(res.summary.students).toBe(13);
    expect(res.summary.taken).toBe(13);
    expect(res.reliability).not.toBeNull();
    expect(res.items.some((i) => i.discrimination !== null)).toBe(true);
    expect(res.classes.map((c) => c.name)).toEqual(['12-1', '12-2']);
    expect(res.canEditContent).toBe(true);
    // Багшид бодлогын бүрэн агуулга (зөв хариу) очно
    expect(res.problems[0]).toEqual(
      expect.objectContaining({ correctAnswer: 'A', problemId: 'q1' }),
    );
  });

  it('Багш+ нэг анги сонгоход зөвхөн тэр ангийн сурагч', async () => {
    access.assertInternalTeachingStaff.mockResolvedValue('ADMIN');
    const res = await new ExamAnalyticsService(prismaMock() as never).analytics(
      'test-1',
      'admin',
      'c2',
    );
    expect(res.classroomId).toBe('c2');
    expect(res.summary.students).toBe(6);
  });

  it('сурагчийн задаргаа: багш өөр ангийн сурагчийг харахгүй', async () => {
    access.assertInternalTeachingStaff.mockResolvedValue('TEACHER');
    const db = prismaMock();
    db.user.findUnique.mockResolvedValue({
      id: 's09',
      firstName: 'А',
      lastName: 'Б',
      role: 'STUDENT',
    });
    const withOwn = {
      ...db,
      enrollment: {
        ...db.enrollment,
        findFirst: jest.fn().mockResolvedValue(null),
      },
    };
    await expect(
      new ExamAnalyticsService(withOwn as never).studentSummary(
        'test-1',
        's09',
        'teacher-1',
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('маршрутууд зөвхөн ажилтанд', () => {
    for (const name of ['analyticsRead', 'studentSummary'] as const) {
      const handler = ExamsController.prototype[name];
      expect(Reflect.getMetadata(ROLES_KEY, handler)).toEqual([
        'ADMIN',
        'TEACHER_PLUS',
        'TEACHER',
      ]);
    }
    expect(Reflect.getMetadata(GUARDS_METADATA, ExamsController)).toContain(
      RolesGuard,
    );
  });
});
