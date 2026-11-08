import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { dateKey, todayUB } from '../common/date';
import { Prisma } from '../generated/prisma/client';
import { Role } from '../generated/prisma/enums';
import { MakeupVisitsService } from './makeup-visits.service';

const TODAY = dateKey(todayUB());
const teacher = { userId: 'T1', role: Role.TEACHER };

function visitRow(over: Record<string, unknown> = {}) {
  return {
    id: 'V1',
    studentId: 'S1',
    date: new Date(`${TODAY}T00:00:00.000Z`),
    hostClassroomId: null,
    placeKey: '406',
    homeClassroomId: 'HOME',
    comment: null,
    attStatus: null,
    lateRange: null,
    attNote: null,
    hwStatus: null,
    hwNote: null,
    createdById: 'T1',
    createdAt: new Date(),
    updatedById: null,
    updatedAt: new Date(),
    deletedAt: null,
    deletedById: null,
    tests: [],
    ...over,
  };
}

function setup(opts: { hasLesson?: boolean } = {}) {
  const prisma: any = {
    classroom: {
      findUnique: jest.fn(async ({ where }: any) => ({ id: where.id, archived: false, name: '12-6 (Баруун 4)' })),
      findMany: jest.fn(async () => [{ id: 'HOST', name: '12-6 (Баруун 4)' }, { id: 'HOME', name: '12-4 (Баруун 4)' }]),
    },
    user: {
      findMany: jest.fn(async ({ where }: any) =>
        (where.id?.in ?? ['S1', 'S2', 'S3', 'T1'])
          .filter((id: string) => id.startsWith('S') || (!where.role && id === 'T1'))
          .map((id: string) => ({ id, firstName: 'Мишээл', lastName: 'Бат', role: 'STUDENT', studentCode: null })),
      ),
    },
    enrollment: { findMany: jest.fn(async () => []) },
    makeupVisit: {
      findMany: jest.fn(async () => []),
      findFirst: jest.fn(async () => visitRow()),
      create: jest.fn(async ({ data }: any) => visitRow({ id: `V-${data.studentId}`, ...data })),
      update: jest.fn(async ({ data }: any) => visitRow(data)),
    },
    makeupVisitTest: { updateMany: jest.fn(), createMany: jest.fn() },
    classTestSession: { findMany: jest.fn(async () => []) },
    lessonTopic: { findMany: jest.fn(async () => []) },
    test: { findMany: jest.fn(async () => []) },
    testResult: { findMany: jest.fn(async () => []) },
    $transaction: jest.fn(async (fn: any) => fn(prisma)),
  };
  const schedule: any = {
    getWeek: jest.fn(async (key: string) => ({
      days: [
        {
          date: key,
          isHoliday: false,
          entries: opts.hasLesson === false ? [] : [{ classroomId: 'HOST', scheduleId: 'SC1' }],
        },
      ],
    })),
  };
  const audit: any = { record: jest.fn(), recordMany: jest.fn() };
  return { svc: new MakeupVisitsService(prisma, schedule, audit), prisma, audit };
}

describe('MakeupVisitsService.create', () => {
  it('ирээдүйн өдөрт бүртгэхгүй', async () => {
    const { svc } = setup();
    await expect(
      svc.create(teacher, { date: '2999-01-01', hostClassroomId: null, studentIds: ['S1'] }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('зочилсон анги тэр өдөр хичээлгүй бол татгалзана', async () => {
    const { svc } = setup({ hasLesson: false });
    await expect(
      svc.create(teacher, { date: TODAY, hostClassroomId: 'HOST', studentIds: ['S1'] }),
    ).rejects.toThrow('хичээлгүй');
  });

  it('өөрийн ангид зочноор нэмэхгүй, давхардлыг алгасна, бусдыг нэмнэ (Ирсэн)', async () => {
    const { svc, prisma, audit } = setup();
    prisma.makeupVisit.findMany.mockResolvedValueOnce([{ studentId: 'S2' }]);
    prisma.enrollment.findMany.mockResolvedValueOnce([
      { studentId: 'S1', classroomId: 'HOME', joinedAt: new Date(), classroom: { type: 'IN_PERSON' } },
      { studentId: 'S3', classroomId: 'HOST', joinedAt: new Date(), classroom: { type: 'IN_PERSON' } },
    ]);
    const r = await svc.create(teacher, { date: TODAY, hostClassroomId: 'HOST', studentIds: ['S1', 'S2', 'S3', 'S1'] });
    expect(prisma.makeupVisit.create).toHaveBeenCalledTimes(1);
    expect(prisma.makeupVisit.create.mock.calls[0][0].data).toMatchObject({
      studentId: 'S1',
      hostClassroomId: 'HOST',
      placeKey: 'HOST',
      homeClassroomId: 'HOME',
      attStatus: 'PRESENT',
      createdById: 'T1',
    });
    expect(r.skipped).toEqual(
      expect.arrayContaining([
        { studentId: 'S2', reason: 'DUPLICATE' },
        { studentId: 'S3', reason: 'OWN_CLASS' },
      ]),
    );
    expect(r.created.map((c) => c.student.id)).toEqual(['S1']);
    expect(audit.recordMany).toHaveBeenCalled();
  });

  it('406: ирц тавихгүй, placeKey=406, хичээл шалгахгүй', async () => {
    const { svc, prisma } = setup({ hasLesson: false });
    await svc.create(teacher, { date: TODAY, hostClassroomId: null, studentIds: ['S1'] });
    expect(prisma.makeupVisit.create.mock.calls[0][0].data).toMatchObject({
      hostClassroomId: null,
      placeKey: '406',
      attStatus: null,
    });
  });

  it('сурагч биш (багш) бол NOT_STUDENT', async () => {
    const { svc, prisma } = setup();
    const r = await svc.create(teacher, { date: TODAY, hostClassroomId: null, studentIds: ['T1'] });
    expect(prisma.makeupVisit.create).not.toHaveBeenCalled();
    expect(r.skipped).toEqual([{ studentId: 'T1', reason: 'NOT_STUDENT' }]);
  });

  it('зэрэг нэмсэн (P2002) → DUPLICATE, унахгүй', async () => {
    const { svc, prisma } = setup();
    prisma.makeupVisit.create.mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError('dup', { code: 'P2002', clientVersion: 'x' }),
    );
    const r = await svc.create(teacher, { date: TODAY, hostClassroomId: null, studentIds: ['S1'] });
    expect(r.skipped).toEqual([{ studentId: 'S1', reason: 'DUPLICATE' }]);
  });

  it('сурагч, эцэг эх нэмэхгүй', async () => {
    const { svc } = setup();
    await expect(
      svc.create({ userId: 'S1', role: Role.STUDENT }, { date: TODAY, hostClassroomId: null, studentIds: ['S1'] }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});

describe('MakeupVisitsService.update', () => {
  it('ирцийг арилгавал хугацаа, тэмдэглэл хамт арилна', async () => {
    const { svc, prisma } = setup();
    prisma.makeupVisit.findFirst.mockResolvedValueOnce(
      visitRow({ hostClassroomId: 'HOST', placeKey: 'HOST', attStatus: 'LATE', lateRange: 'FIVE_TO_TEN', attNote: 'x' }),
    );
    await svc.update(teacher, 'V1', { attStatus: null });
    expect(prisma.makeupVisit.update.mock.calls[0][0].data).toMatchObject({
      attStatus: null,
      lateRange: null,
      attNote: null,
    });
  });

  it('LATE биш болбол хугацаа null; ирцгүй үед тэмдэглэл бичихгүй', async () => {
    const { svc, prisma } = setup();
    prisma.makeupVisit.findFirst.mockResolvedValueOnce(visitRow({ attStatus: 'LATE', lateRange: 'FIVE_TO_TEN' }));
    await svc.update(teacher, 'V1', { attStatus: 'PRESENT', lateRange: 'TEN_TO_THIRTY' });
    expect(prisma.makeupVisit.update.mock.calls[0][0].data).toMatchObject({ attStatus: 'PRESENT', lateRange: null });

    prisma.makeupVisit.findFirst.mockResolvedValueOnce(visitRow({ attStatus: null }));
    await svc.update(teacher, 'V1', { attNote: 'тэмдэглэл', comment: '  ' });
    const data = prisma.makeupVisit.update.mock.calls[1][0].data;
    expect(data.attNote).toBeUndefined();
    expect(data.comment).toBeNull();
  });

  it('устсан нөхөлт → 404', async () => {
    const { svc, prisma } = setup();
    prisma.makeupVisit.findFirst.mockResolvedValueOnce(null);
    await expect(svc.update(teacher, 'nope', { comment: 'a' })).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('MakeupVisitsService.setTests', () => {
  it('зочилсон ангийн нөхөлтөд тест тавихгүй (хичээлээс өөрөө)', async () => {
    const { svc, prisma } = setup();
    prisma.makeupVisit.findMany.mockResolvedValueOnce([visitRow({ hostClassroomId: 'HOST', tests: [] })]);
    await expect(svc.setTests(teacher, { visitIds: ['V1'], tests: [] })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('олон сурагчид ижил тест: нэмж, хассаныг зөөлөн устгана; нэрийг серверээс', async () => {
    const { svc, prisma, audit } = setup();
    prisma.makeupVisit.findMany
      .mockResolvedValueOnce([
        visitRow({ id: 'V1', tests: [{ id: 'r1', testId: 'OLD', title: 'Хуучин' }] }),
        visitRow({ id: 'V2', tests: [] }),
      ])
      .mockResolvedValue([]);
    prisma.test.findMany.mockResolvedValueOnce([{ id: 'T9', title: 'Урвуу  функц 1', variantLabel: 'A' }]);
    await svc.setTests(teacher, {
      visitIds: ['V1', 'V2'],
      tests: [{ testId: 'T9', title: 'худал нэр' }, { testId: null, title: 'Давтлага' }],
    });
    expect(prisma.makeupVisitTest.updateMany).toHaveBeenCalledTimes(1);
    expect(prisma.makeupVisitTest.updateMany.mock.calls[0][0].where.id).toEqual({ in: ['r1'] });
    expect(prisma.makeupVisitTest.createMany).toHaveBeenCalledTimes(2);
    expect(prisma.makeupVisitTest.createMany.mock.calls[0][0].data).toEqual([
      { visitId: 'V1', testId: 'T9', title: 'Урвуу функц 1', createdById: 'T1' },
      { visitId: 'V1', testId: null, title: 'Давтлага', createdById: 'T1' },
    ]);
    expect(audit.recordMany).toHaveBeenCalled();
  });

  it('байхгүй тест → 400', async () => {
    const { svc, prisma } = setup();
    prisma.makeupVisit.findMany.mockResolvedValueOnce([visitRow()]);
    prisma.test.findMany.mockResolvedValueOnce([]);
    await expect(svc.setTests(teacher, { visitIds: ['V1'], tests: [{ testId: 'X' }] })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});

describe('MakeupVisitsService.remove / history', () => {
  it('хасах нь зөөлөн (deletedAt, deletedById)', async () => {
    const { svc, prisma, audit } = setup();
    await svc.remove(teacher, 'V1');
    const data = prisma.makeupVisit.update.mock.calls[0][0].data;
    expect(data.deletedAt).toBeInstanceOf(Date);
    expect(data.deletedById).toBe('T1');
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'DELETE', entity: 'MakeupVisit' }));
  });

  it('сурагч зөвхөн өөрийн түүхийг', async () => {
    const { svc } = setup();
    await expect(svc.studentHistory({ userId: 'S2', role: Role.STUDENT }, 'S1')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    await expect(svc.studentHistory({ userId: 'P', role: Role.PARENT }, 'S1')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    await expect(svc.studentHistory({ userId: 'S1', role: Role.STUDENT }, 'S1')).resolves.toEqual([]);
  });

  it('зочилсон ангийн тест: баталсан хичээлээс, сурагчийн дүнтэй', async () => {
    const { svc, prisma } = setup();
    const d = new Date(`${TODAY}T00:00:00.000Z`);
    prisma.makeupVisit.findMany.mockResolvedValueOnce([
      visitRow({ hostClassroomId: 'HOST', placeKey: 'HOST', attStatus: 'PRESENT' }),
    ]);
    prisma.classTestSession.findMany.mockResolvedValueOnce([
      { classroomId: 'HOST', date: d, testId: 'T1x', manualTitle: null },
    ]);
    prisma.test.findMany.mockResolvedValueOnce([{ id: 'T1x', title: 'Лог 1', variantLabel: 'A' }]);
    prisma.testResult.findMany.mockResolvedValueOnce([{ studentId: 'S1', testId: 'T1x', totalScore: 8, maxScore: 10 }]);
    const [item] = await svc.coveredByStudent('S1');
    expect(item.place).toEqual({ kind: 'CLASS', classroomId: 'HOST', name: '12-6' });
    expect(item.label).toBe('12-6 ангид нөхөж суусан');
    expect(item.homeClassroom).toEqual({ id: 'HOME', name: '12-4 (Баруун 4)' });
    expect(item.tests).toEqual([
      { id: null, testId: 'T1x', title: 'Лог 1', source: 'CONFIRMED', variant: 'A', result: { score: 8, max: 10 } },
    ]);
    expect(item).not.toHaveProperty('student');
  });
});
