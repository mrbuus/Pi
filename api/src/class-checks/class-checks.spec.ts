import {
  GUARDS_METADATA,
  METHOD_METADATA,
  PATH_METADATA,
} from '@nestjs/common/constants';
import {
  BadRequestException,
  RequestMethod,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ROLES_KEY } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Role } from '../generated/prisma/enums';
import { ClassChecksController } from './class-checks.controller';
import {
  checkSummary,
  cleanCheckAmount,
  cleanCheckTitle,
  isUniqueViolation,
  OPEN_CHECKS_MAX,
} from './class-checks.logic';
import { ClassChecksService } from './class-checks.service';

describe('«Чек» — цэвэр функц', () => {
  it('нэр: зай шахаж, удирдах тэмдэгт хасаж, 80-аар таслана', () => {
    expect(cleanCheckTitle('  Номны   мөнгө \n')).toBe('Номны мөнгө');
    expect(cleanCheckTitle('   ')).toBeNull();
    expect(cleanCheckTitle(5)).toBeNull();
    expect(cleanCheckTitle('а'.repeat(200))).toHaveLength(80);
  });

  it('дүн: 0/null = дүнгүй, сөрөг/бутархай/хэт их = буруу', () => {
    expect(cleanCheckAmount(null)).toBeNull();
    expect(cleanCheckAmount(0)).toBeNull();
    expect(cleanCheckAmount(25000)).toBe(25000);
    expect(cleanCheckAmount(-1)).toBeNaN();
    expect(cleanCheckAmount(1.5)).toBeNaN();
    expect(cleanCheckAmount(1e9)).toBeNaN();
  });

  it('тоо: одоогийн сурагчаар N/M, гарсан сурагчийн мөнгө цугларсанд орно', () => {
    const marks = [
      { studentId: 'a', checked: true },
      { studentId: 'b', checked: false },
      { studentId: 'gone', checked: true },
    ];
    expect(checkSummary(['a', 'b', 'c'], marks, 25000)).toEqual({
      checked: 1,
      total: 3,
      formerChecked: 1,
      collected: 50000,
    });
    expect(checkSummary(['a'], marks, null).collected).toBeNull();
  });

  it('P2002 таних', () => {
    expect(isUniqueViolation({ code: 'P2002' })).toBe(true);
    expect(isUniqueViolation(new Error('x'))).toBe(false);
    expect(isUniqueViolation(null)).toBe(false);
  });
});

describe('ClassChecksController — эрх', () => {
  it('бүх багш (ADMIN/TEACHER_PLUS/TEACHER), JWT + RolesGuard', () => {
    const guards = Reflect.getMetadata(GUARDS_METADATA, ClassChecksController);
    expect(guards).toEqual(expect.arrayContaining([JwtAuthGuard, RolesGuard]));
    expect(Reflect.getMetadata(ROLES_KEY, ClassChecksController)).toEqual([
      Role.ADMIN,
      Role.TEACHER_PLUS,
      Role.TEACHER,
    ]);
  });
});

describe('ClassChecksController — устгах маршрут', () => {
  it('DELETE /classrooms/:classroomId/checks/:checkId — классын эрхийг өвлөнө', () => {
    const handler = Object.getOwnPropertyDescriptor(
      ClassChecksController.prototype,
      'remove',
    )!.value as object;
    expect(Reflect.getMetadata(PATH_METADATA, ClassChecksController)).toBe(
      'classrooms/:classroomId/checks',
    );
    expect(Reflect.getMetadata(PATH_METADATA, handler)).toBe(':checkId');
    expect(Reflect.getMetadata(METHOD_METADATA, handler)).toBe(
      RequestMethod.DELETE,
    );
    // Маршрут дээр тусдаа @Roles байхгүй — классын ADMIN/TEACHER_PLUS/TEACHER хүчинтэй
    expect(Reflect.getMetadata(ROLES_KEY, handler)).toBeUndefined();
  });
});

describe('ClassChecksService', () => {
  const ROLE_OF: Record<string, Role> = {
    admin: Role.ADMIN,
    plus: Role.TEACHER_PLUS,
    teacher: Role.TEACHER,
    student: Role.STUDENT,
  };

  function setup() {
    const prisma = {
      user: {
        findUnique: jest.fn(({ where }: { where: { id: string } }) =>
          Promise.resolve(
            ROLE_OF[where.id]
              ? {
                  role: ROLE_OF[where.id],
                  archivedAt: null,
                  externalTeacherProfile: null,
                }
              : null,
          ),
        ),
        findMany: jest.fn(({ where }: { where: { id: { in: string[] } } }) =>
          Promise.resolve(
            where.id.in.map((id) => ({
              id,
              firstName: `Нэр-${id}`,
              lastName: 'Бат',
            })),
          ),
        ),
      },
      classroom: {
        findUnique: jest.fn().mockResolvedValue({ id: 'c1', archived: false }),
      },
      enrollment: {
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn().mockResolvedValue({ id: 'e1' }),
      },
      classCheck: {
        findFirst: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      classCheckMark: {
        findUnique: jest.fn().mockResolvedValue(null),
        upsert: jest.fn(),
        update: jest.fn(),
      },
    };
    const dashboard = {
      visibleClassIds: jest.fn(({ role }: { role: Role }) =>
        Promise.resolve(role === Role.TEACHER ? ['c1'] : 'ALL'),
      ),
    };
    const audit = { record: jest.fn().mockResolvedValue(undefined) };
    const service = new ClassChecksService(
      prisma as never,
      dashboard as never,
      audit as never,
    );
    return { prisma, dashboard, audit, service };
  }

  const now = new Date('2026-10-22T03:00:00Z');
  const checkRow = (over: Record<string, unknown> = {}) => ({
    id: 'k1',
    classroomId: 'c1',
    title: 'Номны мөнгө',
    amount: 25000,
    createdById: 'teacher',
    createdAt: now,
    archivedAt: null,
    archivedById: null,
    marks: [],
    ...over,
  });

  describe('эрх', () => {
    it('сурагч → Forbidden (төвийн багш биш)', async () => {
      const { service } = setup();
      await expect(service.list('c1', 'student')).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('Багш — өөрийн харах ангидаа л', async () => {
      const { service, dashboard } = setup();
      await expect(service.list('c1', 'teacher')).resolves.toMatchObject({
        classroomId: 'c1',
      });
      await expect(service.list('c2', 'teacher')).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(dashboard.visibleClassIds).toHaveBeenCalledWith({
        userId: 'teacher',
        role: Role.TEACHER,
      });
    });

    it('Багш+/Админ бүх анги; архивласан анги → NotFound', async () => {
      const { service, prisma } = setup();
      await expect(service.list('c9', 'plus')).resolves.toBeTruthy();
      await expect(service.list('c9', 'admin')).resolves.toBeTruthy();
      prisma.classroom.findUnique.mockResolvedValueOnce({
        id: 'c1',
        archived: true,
      });
      await expect(service.list('c1', 'admin')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('жагсаалт', () => {
    it('сурагчид нэрээр, гарсан ч тэмдэглэгдсэн сурагч former-т, хэн нээсэн', async () => {
      const { service, prisma } = setup();
      prisma.enrollment.findMany.mockResolvedValue([
        { student: { id: 's2', firstName: 'Оюун', lastName: 'Бат' } },
        { student: { id: 's1', firstName: 'Ану', lastName: 'Дорж' } },
      ]);
      prisma.classCheck.findMany
        .mockResolvedValueOnce([
          checkRow({
            marks: [
              {
                studentId: 's1',
                checked: true,
                updatedById: 'plus',
                updatedAt: now,
              },
              {
                studentId: 'gone',
                checked: true,
                updatedById: 'plus',
                updatedAt: now,
              },
              {
                studentId: 'gone2',
                checked: false,
                updatedById: 'plus',
                updatedAt: now,
              },
            ],
          }),
        ])
        .mockResolvedValueOnce([]);
      const res = await service.list('c1', 'teacher');
      expect(res.students.map((s) => s.id)).toEqual(['s1', 's2']);
      expect(res.former.map((s) => s.id)).toEqual(['gone']);
      expect(res.checks[0].createdBy).toMatchObject({ id: 'teacher' });
      expect(res.checks[0].marks[0].updatedBy).toMatchObject({ id: 'plus' });
      // Хаагдсан нь тусдаа, дээд тал нь 50
      expect(prisma.classCheck.findMany).toHaveBeenLastCalledWith(
        expect.objectContaining({
          where: {
            classroomId: 'c1',
            archivedAt: { not: null },
            deletedAt: null,
          },
          take: 50,
        }),
      );
    });
  });

  describe('үүсгэх', () => {
    it('нэрийг цэвэрлэж, дүнтэй үүсгээд аудит бичнэ', async () => {
      const { service, prisma, audit } = setup();
      prisma.classCheck.create.mockResolvedValue(
        checkRow({ createdById: 'teacher' }),
      );
      const res = await service.create(
        'c1',
        { title: '  Номны  мөнгө ', amount: 25000 },
        'teacher',
      );
      expect(prisma.classCheck.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            classroomId: 'c1',
            title: 'Номны мөнгө',
            amount: 25000,
            createdById: 'teacher',
          },
        }),
      );
      expect(res.createdBy).toMatchObject({ id: 'teacher' });
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'CREATE',
          entity: 'ClassCheck',
          actorRole: Role.TEACHER,
        }),
      );
    });

    it('хоосон нэр, буруу дүн, хэт олон нээлттэй чек → BadRequest', async () => {
      const { service, prisma } = setup();
      await expect(
        service.create('c1', { title: '  ' }, 'teacher'),
      ).rejects.toBeInstanceOf(BadRequestException);
      await expect(
        service.create('c1', { title: 'А', amount: -5 }, 'teacher'),
      ).rejects.toBeInstanceOf(BadRequestException);
      prisma.classCheck.count.mockResolvedValueOnce(OPEN_CHECKS_MAX);
      await expect(
        service.create('c1', { title: 'А' }, 'teacher'),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.classCheck.create).not.toHaveBeenCalled();
    });
  });

  describe('нэр солих ба хаах', () => {
    it('хаах = зөөлөн (archivedAt + хэн), түүх үлдэнэ, аудит ARCHIVE', async () => {
      const { service, prisma, audit } = setup();
      prisma.classCheck.findFirst.mockResolvedValue(checkRow());
      prisma.classCheck.update.mockImplementation(
        ({ data }: { data: Record<string, unknown> }) =>
          Promise.resolve(checkRow(data)),
      );
      const res = await service.update(
        'c1',
        'k1',
        { archived: true },
        'teacher',
      );
      const call = prisma.classCheck.update.mock.calls[0][0];
      expect(call.where).toEqual({ id: 'k1' });
      expect(call.data.archivedAt).toBeInstanceOf(Date);
      expect(call.data.archivedById).toBe('teacher');
      expect(res.archivedBy).toMatchObject({ id: 'teacher' });
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'ARCHIVE', entity: 'ClassCheck' }),
      );
    });

    it('сэргээх ба нэр солих', async () => {
      const { service, prisma, audit } = setup();
      prisma.classCheck.findFirst.mockResolvedValue(
        checkRow({ archivedAt: now, archivedById: 'plus' }),
      );
      prisma.classCheck.update.mockImplementation(
        ({ data }: { data: Record<string, unknown> }) =>
          Promise.resolve(checkRow(data)),
      );
      await service.update(
        'c1',
        'k1',
        { archived: false, title: 'Шалгалтын цаас' },
        'teacher',
      );
      expect(prisma.classCheck.update.mock.calls[0][0].data).toEqual({
        title: 'Шалгалтын цаас',
        archivedAt: null,
        archivedById: null,
      });
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'RESTORE' }),
      );
    });

    it('өөр ангийн чек → NotFound; өөрчлөлтгүй бол бичихгүй', async () => {
      const { service, prisma } = setup();
      prisma.classCheck.findFirst.mockResolvedValueOnce(null);
      await expect(
        service.update('c1', 'other', { title: 'x' }, 'teacher'),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.classCheck.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'other', classroomId: 'c1', deletedAt: null },
        }),
      );
      prisma.classCheck.findFirst.mockResolvedValueOnce(checkRow());
      await service.update(
        'c1',
        'k1',
        { title: 'Номны мөнгө', amount: 25000 },
        'teacher',
      );
      expect(prisma.classCheck.update).not.toHaveBeenCalled();
    });
  });

  describe('сурагч тэмдэглэх', () => {
    it('ангид бүртгэлгүй сурагч → BadRequest, бичихгүй', async () => {
      const { service, prisma } = setup();
      prisma.classCheck.findFirst.mockResolvedValue({
        id: 'k1',
        archivedAt: null,
      });
      prisma.enrollment.findFirst.mockResolvedValueOnce(null);
      await expect(
        service.setMark('c1', 'k1', 'outsider', { checked: true }, 'teacher'),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.enrollment.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            classroomId: 'c1',
            studentId: 'outsider',
            leftAt: null,
            student: { archivedAt: null },
          },
        }),
      );
      expect(prisma.classCheckMark.upsert).not.toHaveBeenCalled();
    });

    it('хаагдсан чек → BadRequest', async () => {
      const { service, prisma } = setup();
      prisma.classCheck.findFirst.mockResolvedValue({
        id: 'k1',
        archivedAt: now,
      });
      await expect(
        service.setMark('c1', 'k1', 's1', { checked: true }, 'teacher'),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(prisma.classCheckMark.upsert).not.toHaveBeenCalled();
    });

    it('(checkId, studentId)-аар upsert, хэн дарсныг буцаана, аудит', async () => {
      const { service, prisma, audit } = setup();
      prisma.classCheck.findFirst.mockResolvedValue({
        id: 'k1',
        archivedAt: null,
      });
      prisma.classCheckMark.upsert.mockResolvedValue({
        studentId: 's1',
        checked: true,
        updatedById: 'teacher',
        updatedAt: now,
      });
      const res = await service.setMark(
        'c1',
        'k1',
        's1',
        { checked: true },
        'teacher',
      );
      expect(prisma.classCheckMark.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { checkId_studentId: { checkId: 'k1', studentId: 's1' } },
          create: {
            checkId: 'k1',
            studentId: 's1',
            checked: true,
            updatedById: 'teacher',
          },
          update: { checked: true, updatedById: 'teacher' },
        }),
      );
      expect(res).toEqual({
        studentId: 's1',
        checked: true,
        updatedAt: now.toISOString(),
        updatedBy: { id: 'teacher', firstName: 'Нэр-teacher', lastName: 'Бат' },
      });
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'CREATE', entity: 'ClassCheckMark' }),
      );
    });

    it('хоёр багш зэрэг: P2002 → update-ээр дахин бичнэ (сүүлд бичсэн ялна)', async () => {
      const { service, prisma } = setup();
      prisma.classCheck.findFirst.mockResolvedValue({
        id: 'k1',
        archivedAt: null,
      });
      prisma.classCheckMark.upsert.mockRejectedValueOnce(
        Object.assign(new Error('Unique constraint failed'), { code: 'P2002' }),
      );
      prisma.classCheckMark.update.mockResolvedValue({
        studentId: 's1',
        checked: false,
        updatedById: 'plus',
        updatedAt: now,
      });
      const res = await service.setMark(
        'c1',
        'k1',
        's1',
        { checked: false },
        'plus',
      );
      expect(prisma.classCheckMark.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { checkId_studentId: { checkId: 'k1', studentId: 's1' } },
          data: { checked: false, updatedById: 'plus' },
        }),
      );
      expect(res.checked).toBe(false);
      expect(res.updatedBy).toMatchObject({ id: 'plus' });
    });

    it('бусад DB алдааг залгихгүй', async () => {
      const { service, prisma } = setup();
      prisma.classCheck.findFirst.mockResolvedValue({
        id: 'k1',
        archivedAt: null,
      });
      prisma.classCheckMark.upsert.mockRejectedValueOnce(new Error('db down'));
      await expect(
        service.setMark('c1', 'k1', 's1', { checked: true }, 'teacher'),
      ).rejects.toThrow('db down');
      expect(prisma.classCheckMark.update).not.toHaveBeenCalled();
    });

    it('утга өөрчлөгдөөгүй бол аудит бичихгүй', async () => {
      const { service, prisma, audit } = setup();
      prisma.classCheck.findFirst.mockResolvedValue({
        id: 'k1',
        archivedAt: null,
      });
      prisma.classCheckMark.findUnique.mockResolvedValue({
        studentId: 's1',
        checked: true,
        updatedById: 'plus',
        updatedAt: now,
      });
      prisma.classCheckMark.upsert.mockResolvedValue({
        studentId: 's1',
        checked: true,
        updatedById: 'teacher',
        updatedAt: now,
      });
      await service.setMark('c1', 'k1', 's1', { checked: true }, 'teacher');
      expect(audit.record).not.toHaveBeenCalled();
    });
  });
  describe('устгах (зөөлөн)', () => {
    it('deletedAt + хэн бичнэ, мөрийг устгахгүй, аудит DELETE', async () => {
      const { service, prisma, audit } = setup();
      prisma.classCheck.findFirst.mockResolvedValue(
        checkRow({
          marks: [
            {
              studentId: 's1',
              checked: true,
              updatedById: 'plus',
              updatedAt: now,
            },
            {
              studentId: 's2',
              checked: false,
              updatedById: 'plus',
              updatedAt: now,
            },
          ],
        }),
      );
      const res = await service.remove('c1', 'k1', 'teacher');
      expect(res).toEqual({ id: 'k1', deleted: true });
      expect(prisma.classCheck.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'k1', classroomId: 'c1', deletedAt: null },
        }),
      );
      const call = (
        prisma.classCheck.updateMany.mock.calls as unknown as [
          {
            where: Record<string, unknown>;
            data: { deletedAt: unknown; deletedById: string };
          },
        ][]
      )[0][0];
      expect(call.where).toEqual({ id: 'k1', deletedAt: null });
      expect(call.data.deletedAt).toBeInstanceOf(Date);
      expect(call.data.deletedById).toBe('teacher');
      // Хатуу устгал хэзээ ч дуудагдахгүй
      expect(
        (prisma.classCheck as Record<string, unknown>).delete,
      ).toBeUndefined();
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'DELETE',
          entity: 'ClassCheck',
          entityId: 'k1',
          actorRole: Role.TEACHER,
          before: expect.objectContaining({
            title: 'Номны мөнгө',
            checkedCount: 1,
          }),
        }),
      );
    });

    it('Багш+/Админ мөн устгана; хаасан чекийг ч устгана', async () => {
      const { service, prisma } = setup();
      prisma.classCheck.findFirst.mockResolvedValue(
        checkRow({ archivedAt: now, archivedById: 'plus' }),
      );
      await expect(service.remove('c1', 'k1', 'plus')).resolves.toMatchObject({
        deleted: true,
      });
      await expect(service.remove('c9', 'k1', 'admin')).resolves.toMatchObject({
        deleted: true,
      });
      expect(prisma.classCheck.updateMany).toHaveBeenCalledTimes(2);
    });

    it('сурагч → Forbidden; Багш харах эрхгүй анги → Forbidden; бичихгүй', async () => {
      const { service, prisma } = setup();
      await expect(
        service.remove('c1', 'k1', 'student'),
      ).rejects.toBeInstanceOf(ForbiddenException);
      await expect(
        service.remove('c2', 'k1', 'teacher'),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(prisma.classCheck.updateMany).not.toHaveBeenCalled();
    });

    it('өөр анги / аль хэдийн устгасан → NotFound; зэрэг устгалд хоёр дахь нь NotFound', async () => {
      const { service, prisma, audit } = setup();
      prisma.classCheck.findFirst.mockResolvedValueOnce(null);
      await expect(
        service.remove('c1', 'gone', 'teacher'),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.classCheck.updateMany).not.toHaveBeenCalled();
      prisma.classCheck.findFirst.mockResolvedValueOnce(checkRow());
      prisma.classCheck.updateMany.mockResolvedValueOnce({ count: 0 });
      await expect(
        service.remove('c1', 'k1', 'teacher'),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(audit.record).not.toHaveBeenCalled();
    });

    it('устгасан чек жагсаалт, тоолол, тэмдэглэгээнд орохгүй', async () => {
      const { service, prisma } = setup();
      await service.list('c1', 'teacher');
      const listCalls = prisma.classCheck.findMany.mock.calls as unknown as [
        { where: Record<string, unknown> },
      ][];
      for (const [arg] of listCalls)
        expect(arg.where).toMatchObject({ deletedAt: null });
      await service
        .create('c1', { title: 'А' }, 'teacher')
        .catch(() => undefined);
      expect(prisma.classCheck.count).toHaveBeenCalledWith({
        where: { classroomId: 'c1', archivedAt: null, deletedAt: null },
      });
      prisma.classCheck.findFirst.mockResolvedValueOnce(null);
      await expect(
        service.setMark('c1', 'k1', 's1', { checked: true }, 'teacher'),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(prisma.classCheck.findFirst).toHaveBeenLastCalledWith(
        expect.objectContaining({
          where: { id: 'k1', classroomId: 'c1', deletedAt: null },
        }),
      );
    });
  });
});
