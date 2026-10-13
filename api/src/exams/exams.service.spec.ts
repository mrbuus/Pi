import { ConflictException, ForbiddenException } from '@nestjs/common';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { ROLES_KEY } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { stripProblemTokens } from '../common/strip-problem-token.interceptor';
import { ExamsController } from './exams.controller';
import {
  EXAM_TYPES,
  ExamsService,
  examStatus,
  parseExamListKind,
} from './exams.service';

jest.mock('../common/access', () => ({
  assertInternalTeachingStaff: jest.fn(),
}));
// eslint-disable-next-line @typescript-eslint/no-require-imports
const access = require('../common/access') as {
  assertInternalTeachingStaff: jest.Mock;
};

describe('Жагсаалтын төлөв', () => {
  it.each([
    [
      { assignedClasses: 0, students: 0, results: 0, absent: 0, inProgress: 0 },
      'UNASSIGNED',
    ],
    [
      {
        assignedClasses: 1,
        students: 30,
        results: 10,
        absent: 0,
        inProgress: 2,
      },
      'IN_PROGRESS',
    ],
    [
      {
        assignedClasses: 1,
        students: 30,
        results: 27,
        absent: 2,
        inProgress: 0,
      },
      'MISSING',
    ],
    [
      {
        assignedClasses: 2,
        students: 30,
        results: 28,
        absent: 2,
        inProgress: 0,
      },
      'DONE',
    ],
  ])('%j → %s', (counts, status) => {
    expect(examStatus(counts)).toBe(status);
  });
});

describe('ExamsService — багш зөвхөн өөрийн анги', () => {
  const classroom = (teacherId: string | null) => ({
    findUnique: jest
      .fn()
      .mockResolvedValue({
        id: 'class-1',
        name: '12-1',
        teacherId,
        archived: false,
      }),
  });

  it('өөр багшийн ангид оноох — 403', async () => {
    access.assertInternalTeachingStaff.mockResolvedValue('TEACHER');
    const db = {
      classroom: classroom('teacher-2'),
      testAccess: { create: jest.fn() },
    };
    await expect(
      new ExamsService(db as never, {} as never).assignClass(
        'test-1',
        'class-1',
        'teacher-1',
        {},
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(db.testAccess.create).not.toHaveBeenCalled();
  });

  it('жагсаалт: багшид зөвхөн өөрийн ангийн оноолт, сурагчдыг тоолно', async () => {
    access.assertInternalTeachingStaff.mockResolvedValue('TEACHER');
    const db = {
      test: { findMany: jest.fn().mockResolvedValue([]) },
      classroom: { findMany: jest.fn().mockResolvedValue([]) },
    };
    const res = await new ExamsService(db as never, {} as never).overview(
      'teacher-1',
    );
    const where = db.test.findMany.mock.calls[0][0];
    expect(where.select.access.where).toEqual({
      classroom: { archived: false, teacherId: 'teacher-1' },
    });
    expect(db.classroom.findMany.mock.calls[0][0].where).toEqual({
      archived: false,
      teacherId: 'teacher-1',
    });
    expect(res.manageAllClasses).toBe(false);
  });

  it('«Тест» таб (kind=TEST) — шалгалтаас бусад төрөл, анхдагч нь шалгалт', async () => {
    access.assertInternalTeachingStaff.mockResolvedValue('TEACHER_PLUS');
    const db = {
      test: { findMany: jest.fn().mockResolvedValue([]) },
      classroom: { findMany: jest.fn().mockResolvedValue([]) },
    };
    const service = new ExamsService(db as never, {} as never);
    await service.overview('tplus', undefined, 'TEST');
    await service.overview('tplus');
    const [testCall, examCall] = db.test.findMany.mock.calls.map(
      (c: [{ where: { type: unknown } }]) => c[0].where.type,
    );
    expect(testCall).toEqual({ notIn: EXAM_TYPES });
    expect(examCall).toEqual({ in: EXAM_TYPES });
    expect(parseExamListKind('TEST')).toBe('TEST');
    expect(parseExamListKind('bogus')).toBe('EXAM');
    expect(parseExamListKind(undefined)).toBe('EXAM');
  });

  it('Багш+ — бүх анги', async () => {
    access.assertInternalTeachingStaff.mockResolvedValue('TEACHER_PLUS');
    const db = {
      test: { findMany: jest.fn().mockResolvedValue([]) },
      classroom: { findMany: jest.fn().mockResolvedValue([]) },
    };
    const res = await new ExamsService(db as never, {} as never).overview(
      'tplus',
    );
    expect(db.classroom.findMany.mock.calls[0][0].where).toEqual({
      archived: false,
    });
    expect(res.manageAllClasses).toBe(true);
  });

  it('алхмын багц: энгийн багш засахгүй; сурагч өгсөн бол Багш+ ч засахгүй', async () => {
    access.assertInternalTeachingStaff.mockResolvedValue('TEACHER');
    const service = new ExamsService({} as never, {} as never);
    await expect(
      service.setScoringGroups('t', 'teacher-1', {
        problemId: 'p',
        groups: null,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);

    access.assertInternalTeachingStaff.mockResolvedValue('TEACHER_PLUS');
    const db = {
      test: {
        findUnique: jest
          .fn()
          .mockResolvedValue({
            id: 't',
            deletedAt: null,
            isDraft: false,
            createdById: 'a',
          }),
      },
      testProblem: {
        findUnique: jest.fn().mockResolvedValue({
          points: 7,
          problem: {
            id: 'p',
            format: 'FILL_NUMBER',
            statementText: '[a][b]',
            scoringGroups: null,
          },
        }),
      },
      testResult: { count: jest.fn().mockResolvedValue(1) },
      testAttemptSession: { count: jest.fn().mockResolvedValue(0) },
      problem: { update: jest.fn() },
    };
    await expect(
      new ExamsService(db as never, {} as never).setScoringGroups(
        't',
        'tplus',
        {
          problemId: 'p',
          groups: [{ label: '1-1', boxes: ['a', 'b'], points: 7 }],
        },
      ),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(db.problem.update).not.toHaveBeenCalled();
  });
});

describe('Сурагчид бодлогын код, зөв хариу очихгүй', () => {
  it('«Сурагчийн харагдац»-д correctAnswer, isCorrect, token алга', async () => {
    access.assertInternalTeachingStaff.mockResolvedValue('TEACHER');
    const db = {
      test: {
        findUnique: jest.fn().mockResolvedValue({
          id: 't',
          title: 'Сорил',
          timeLimitMin: 90,
          deletedAt: null,
          isDraft: false,
          createdById: 'a',
          problems: [
            {
              order: 1,
              points: 1,
              problem: {
                id: 'p1',
                token: '1000-S10A-01',
                format: 'CHOICE',
                statementText: 'x',
                imageKey: null,
                choices: ['$1$', '$2$'],
                correctAnswer: 'B',
                choiceOptions: [
                  { order: 0, text: '$1$', isCorrect: false },
                  { order: 1, text: '$2$', isCorrect: true },
                ],
              },
            },
            {
              order: 2,
              points: 7,
              problem: {
                id: 'p2',
                token: '1000-S10A-37',
                format: 'FILL_NUMBER',
                statementText: '$[a][bc]$',
                imageKey: null,
                choices: null,
                correctAnswer: '354',
                choiceOptions: [],
              },
            },
          ],
        }),
      },
    };
    const view = await new ExamsService(db as never, {} as never).studentView(
      't',
      'teacher-1',
    );
    const json = JSON.stringify(view);
    expect(json).not.toMatch(/correctAnswer|isCorrect|"token"|1000-S10A|354/);
    expect(view.problems[0].choices).toEqual([
      { letter: 'A', text: '$1$', image: null },
      { letter: 'B', text: '$2$', image: null },
    ]);
    expect(view.problems[1].slots).toEqual(['a', 'bc']);
  });

  it('сурагчийн хариунаас бодлогын код хасагдана (интерцептор)', () => {
    const payload = {
      tests: [
        {
          id: 't',
          title: '1000 бодлого',
          problems: [{ id: 'p', token: '1000-S10A-01', statementText: 'x' }],
        },
      ],
    };
    expect(JSON.stringify(stripProblemTokens(payload))).not.toContain(
      '1000-S10A-01',
    );
  });

  it('«Шалгалт» хэсгийн бүх маршрут зөвхөн ажилтанд (сурагч, эцэг эх, худалдан авагч 403)', () => {
    const proto = ExamsController.prototype as unknown as Record<
      string,
      object
    >;
    expect(Reflect.getMetadata(GUARDS_METADATA, ExamsController)).toContain(
      RolesGuard,
    );
    const names = Object.getOwnPropertyNames(proto).filter(
      (n) => n !== 'constructor',
    );
    expect(names.length).toBeGreaterThanOrEqual(11);
    for (const name of names) {
      const roles = Reflect.getMetadata(ROLES_KEY, proto[name]) as string[];
      expect(roles.length).toBeGreaterThan(0);
      for (const forbidden of ['STUDENT', 'PARENT', 'BUYER'])
        expect(roles).not.toContain(forbidden);
    }
    expect(Reflect.getMetadata(ROLES_KEY, proto.setScoringGroups)).toEqual([
      'ADMIN',
      'TEACHER_PLUS',
    ]);
  });
});
