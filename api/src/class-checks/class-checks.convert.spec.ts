import { BadRequestException, NotFoundException } from '@nestjs/common';
import {
  GUARDS_METADATA,
  METHOD_METADATA,
  PATH_METADATA,
} from '@nestjs/common/constants';
import { RequestMethod } from '@nestjs/common';
import { ROLES_KEY } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Role } from '../generated/prisma/enums';
import { ClassChecksController } from './class-checks.controller';
import { convertTargets } from './class-checks.logic';
import { ClassChecksService } from './class-checks.service';

/** Энгийн чекийг ном/шалгалтын хуудасны чек болгох (эзэн 2026-11-18) */

describe('convertTargets — сонголтууд', () => {
  it('нэгдсэн: төвийн устгаагүй дугаарууд + дараагийн шинэ (устгасныг алгасна)', () => {
    const t = convertTargets({
      classroomId: 'c1',
      centreSheets: [
        { bookKey: 'SHEET1', deleted: false },
        { bookKey: 'SHEET1', deleted: false },
        { bookKey: 'SHEET2', deleted: true },
        { bookKey: 'SHEET3', deleted: false },
      ],
      classSheets: [
        { bookKey: 'CSHEET1:c1', deleted: false },
        { bookKey: 'CSHEET2:c1', deleted: true },
        { bookKey: 'CSHEET5:c2', deleted: false },
      ],
      here: [
        { bookKey: 'SHEET1', archived: false },
        { bookKey: 'E2', archived: true },
      ],
    });
    const sheets = t.filter((x) => x.kind === 'SHEET');
    expect(sheets.map((x) => [x.key, x.isNew, x.here])).toEqual([
      ['SHEET1', false, 'open'],
      ['SHEET3', false, null],
      ['SHEET4', true, null],
    ]);
    expect(sheets[0].title).toBe('Нэгдсэн шалгалт 1');
    const cls = t.filter((x) => x.kind === 'CSHEET');
    expect(cls.map((x) => [x.key, x.n, x.isNew])).toEqual([
      ['CSHEET1:c1', 1, false],
      ['CSHEET3:c1', 3, true],
    ]);
    expect(t.find((x) => x.key === 'E2')?.here).toBe('archived');
    expect(t.filter((x) => x.kind === 'BOOK').length).toBeGreaterThan(3);
  });

  it('хоосон төв: Нэгдсэн шалгалт 1, Ангийн шалгалт 1', () => {
    const t = convertTargets({
      classroomId: 'c1',
      centreSheets: [],
      classSheets: [],
      here: [],
    });
    expect(t.filter((x) => x.kind !== 'BOOK').map((x) => x.key)).toEqual([
      'SHEET1',
      'CSHEET1:c1',
    ]);
  });
});

describe('ClassChecksController — хөрвүүлэх маршрут', () => {
  it('GET :checkId/convert-options, POST :checkId/convert — классын эрх', () => {
    const proto = ClassChecksController.prototype as unknown as Record<
      string,
      object
    >;
    expect(Reflect.getMetadata(PATH_METADATA, proto.convert)).toBe(
      ':checkId/convert',
    );
    expect(Reflect.getMetadata(METHOD_METADATA, proto.convert)).toBe(
      RequestMethod.POST,
    );
    expect(Reflect.getMetadata(PATH_METADATA, proto.convertOptions)).toBe(
      ':checkId/convert-options',
    );
    expect(Reflect.getMetadata(METHOD_METADATA, proto.convertOptions)).toBe(
      RequestMethod.GET,
    );
    expect(Reflect.getMetadata(ROLES_KEY, proto.convert)).toBeUndefined();
    expect(Reflect.getMetadata(GUARDS_METADATA, ClassChecksController)).toEqual(
      expect.arrayContaining([JwtAuthGuard, RolesGuard]),
    );
  });
});

describe('ClassChecksService.convert', () => {
  const ROLE_OF: Record<string, Role> = {
    plus: Role.TEACHER_PLUS,
    teacher: Role.TEACHER,
    student: Role.STUDENT,
  };
  const t1 = new Date('2026-11-17T03:00:00Z');
  const t2 = new Date('2026-11-17T04:00:00Z');

  const generic = (over: Record<string, unknown> = {}) => ({
    id: 'g1',
    classroomId: 'c1',
    title: 'Нэгдсэн шалгалт-1',
    amount: 1000,
    bookKey: null,
    createdById: 'teacher',
    createdAt: t1,
    archivedAt: null,
    archivedById: null,
    marks: [
      { studentId: 'a', checked: true, updatedById: 'teacher', updatedAt: t1 },
      { studentId: 'b', checked: true, updatedById: 'plus', updatedAt: t2 },
      { studentId: 'c', checked: false, updatedById: 'teacher', updatedAt: t2 },
      { studentId: 'd', checked: true, updatedById: 'teacher', updatedAt: t2 },
    ],
    ...over,
  });

  function setup(opts: {
    check?: Record<string, unknown> | null;
    /** классын чекүүд (findMany): [centre SHEET*, own CSHEET*, here] */
    centre?: { bookKey: string; deletedAt: Date | null }[];
    own?: { bookKey: string; deletedAt: Date | null }[];
    here?: { id: string; bookKey: string; archivedAt: Date | null }[];
    active?: { studentId: string; classroomId: string | null }[];
    createManyError?: unknown;
  }) {
    const check = opts.check === undefined ? generic() : opts.check;
    const findMany = jest.fn(
      ({ where }: { where: Record<string, unknown> }) => {
        const bk = where.bookKey as { startsWith?: string } | undefined;
        if (bk?.startsWith === 'SHEET')
          return Promise.resolve(opts.centre ?? []);
        if (bk?.startsWith === 'CSHEET') return Promise.resolve(opts.own ?? []);
        return Promise.resolve(opts.here ?? []);
      },
    );
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
        findMany: jest.fn().mockResolvedValue([]),
      },
      classroom: {
        findUnique: jest.fn().mockResolvedValue({ id: 'c1', archived: false }),
      },
      enrollment: { findMany: jest.fn().mockResolvedValue([]) },
      classCheck: {
        findFirst: jest.fn(({ where }: { where: { id: string } }) =>
          Promise.resolve(
            check && where.id === check.id
              ? check
              : where.id === 'into'
                ? { ...generic({ id: 'into', bookKey: 'SHEET1' }), marks: [] }
                : null,
          ),
        ),
        findMany,
        update: jest.fn().mockResolvedValue({}),
      },
      bookPayment: {
        findMany: jest.fn().mockResolvedValue(opts.active ?? []),
        createMany: opts.createManyError
          ? jest.fn().mockRejectedValue(opts.createManyError)
          : jest.fn().mockResolvedValue({ count: 0 }),
      },
      classCheckMark: {
        deleteMany: jest.fn(),
        delete: jest.fn(),
        update: jest.fn(),
      },
      $transaction: jest.fn((fn: (tx: unknown) => unknown) => fn(prisma)),
    };
    const dashboard = {
      visibleClassIds: jest.fn(({ role }: { role: Role }) =>
        Promise.resolve(role === Role.TEACHER ? ['c1'] : 'ALL'),
      ),
    };
    const audit = { record: jest.fn().mockResolvedValue(undefined) };
    const books = {
      activeForClass: jest.fn().mockResolvedValue([]),
      shape: jest.fn().mockResolvedValue([]),
    };
    const service = new ClassChecksService(
      prisma as never,
      dashboard as never,
      audit as never,
      books as never,
    );
    return { prisma, audit, service };
  }

  it('тэмдэглэсэн хүүхэд бүрд PAID төлбөр, тэмдэглэсэн хүн = авсан, цаг хэвээр; чек SHEET1 болно', async () => {
    const { prisma, audit, service } = setup({});
    const res = await service.convert(
      'c1',
      'g1',
      { kind: 'SHEET', n: 1, amount: 1000 },
      'teacher',
    );
    expect(prisma.bookPayment.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          studentId: 'a',
          bookKey: 'SHEET1',
          status: 'PAID',
          amount: 1000,
          classroomId: 'c1',
          checkId: 'g1',
          collectedById: 'teacher',
          createdById: 'teacher',
          createdAt: t1,
        }),
        expect.objectContaining({
          studentId: 'b',
          collectedById: 'plus',
          createdAt: t2,
        }),
        expect.objectContaining({ studentId: 'd' }),
      ],
    });
    expect(prisma.classCheck.update).toHaveBeenCalledWith({
      where: { id: 'g1' },
      data: { bookKey: 'SHEET1', title: 'Нэгдсэн шалгалт 1', amount: 1000 },
    });
    // ClassCheckMark-ийг хэзээ ч устгахгүй, засахгүй
    expect(prisma.classCheckMark.deleteMany).not.toHaveBeenCalled();
    expect(prisma.classCheckMark.delete).not.toHaveBeenCalled();
    expect(prisma.classCheckMark.update).not.toHaveBeenCalled();
    expect(res).toMatchObject({
      merged: false,
      created: 3,
      skippedHere: 0,
      skippedElsewhere: 0,
    });
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'CONVERT',
        entity: 'ClassCheck',
        entityId: 'g1',
        actorRole: Role.TEACHER,
        after: expect.objectContaining({
          bookKey: 'SHEET1',
          createdPayments: 3,
          createdFor: ['a', 'b', 'd'],
        }),
      }),
    );
  });

  it('өмнө/өөр ангид төлсөн хүүхдийг алгасаж тоолно', async () => {
    const { prisma, service } = setup({
      active: [
        { studentId: 'a', classroomId: 'c1' },
        { studentId: 'b', classroomId: 'c9' },
      ],
    });
    const res = await service.convert(
      'c1',
      'g1',
      { kind: 'CSHEET', n: 1, amount: 1500 },
      'plus',
    );
    expect(prisma.bookPayment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          bookKey: 'CSHEET1:c1',
          voidedAt: null,
        }),
      }),
    );
    const data = prisma.bookPayment.createMany.mock.calls[0][0].data as {
      studentId: string;
      amount: number;
    }[];
    expect(data.map((d) => d.studentId)).toEqual(['d']);
    expect(data[0].amount).toBe(1500);
    expect(res).toMatchObject({
      created: 1,
      skippedHere: 1,
      skippedElsewhere: 1,
    });
  });

  it('энэ ангид тэр түлхүүртэй нээлттэй чек байвал түүн рүү нэгтгэж, энэ чекийг нууна', async () => {
    const { prisma, service } = setup({
      centre: [{ bookKey: 'SHEET1', deletedAt: null }],
      here: [{ id: 'into', bookKey: 'SHEET1', archivedAt: null }],
    });
    const res = await service.convert(
      'c1',
      'g1',
      { kind: 'SHEET', n: 1, amount: 1000 },
      'teacher',
    );
    const data = prisma.bookPayment.createMany.mock.calls[0][0].data as {
      checkId: string;
    }[];
    expect(data.every((d) => d.checkId === 'into')).toBe(true);
    expect(prisma.classCheck.update).toHaveBeenCalledWith({
      where: { id: 'g1' },
      data: { archivedAt: expect.any(Date), archivedById: 'teacher' },
    });
    // Энгийн чекийн bookKey солигдохгүй (unique индекс), устгахгүй
    expect(prisma.classCheck.update).not.toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ bookKey: 'SHEET1' }),
      }),
    );
    expect(res.merged).toBe(true);
  });

  it('нуусан ижил түлхүүртэй чек → татгалзана, юу ч бичихгүй', async () => {
    const { prisma, service } = setup({
      here: [{ id: 'old', bookKey: 'E2', archivedAt: t1 }],
    });
    await expect(
      service.convert(
        'c1',
        'g1',
        { kind: 'BOOK', bookKey: 'E2', amount: 40000 },
        'teacher',
      ),
    ).rejects.toThrow(/нуусан/);
    expect(prisma.bookPayment.createMany).not.toHaveBeenCalled();
    expect(prisma.classCheck.update).not.toHaveBeenCalled();
  });

  it('клиент зохиосон дугаар (дараагийнхаас их) / буруу ном → 400', async () => {
    const { prisma, service } = setup({
      centre: [{ bookKey: 'SHEET1', deletedAt: null }],
    });
    await expect(
      service.convert(
        'c1',
        'g1',
        { kind: 'SHEET', n: 7, amount: 1000 },
        'teacher',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.convert(
        'c1',
        'g1',
        { kind: 'BOOK', bookKey: 'SHEET1', amount: 1000 },
        'teacher',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      service.convert(
        'c1',
        'g1',
        { kind: 'SHEET', n: 2, amount: 0 },
        'teacher',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.classCheck.update).not.toHaveBeenCalled();
  });

  it('аль хэдийн номын чек → 400; өөр ангийн чек → NotFound', async () => {
    const book = setup({ check: generic({ bookKey: 'E1' }) });
    await expect(
      book.service.convert(
        'c1',
        'g1',
        { kind: 'SHEET', n: 1, amount: 1000 },
        'teacher',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    const none = setup({ check: null });
    await expect(
      none.service.convert(
        'c1',
        'g1',
        { kind: 'SHEET', n: 1, amount: 1000 },
        'teacher',
      ),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('зэрэг өөрчлөлт (P2002) → ойлгомжтой 400, транзакц бүхэлдээ буцна', async () => {
    const { audit, service } = setup({ createManyError: { code: 'P2002' } });
    await expect(
      service.convert(
        'c1',
        'g1',
        { kind: 'SHEET', n: 1, amount: 1000 },
        'teacher',
      ),
    ).rejects.toThrow(/шинэчлээд/);
    expect(audit.record).not.toHaveBeenCalled();
  });

  it('сурагч → Forbidden; Багш харах эрхгүй анги → Forbidden', async () => {
    const { service } = setup({});
    await expect(
      service.convert(
        'c1',
        'g1',
        { kind: 'SHEET', n: 1, amount: 1000 },
        'student',
      ),
    ).rejects.toThrow();
    await expect(
      service.convert(
        'c2',
        'g1',
        { kind: 'SHEET', n: 1, amount: 1000 },
        'teacher',
      ),
    ).rejects.toThrow(/эрхгүй/);
  });

  it('сонголтууд: тэмдэглэсэн тоо, зорилтууд', async () => {
    const { service } = setup({});
    const o = await service.convertOptions('c1', 'g1', 'teacher');
    expect(o.checkedCount).toBe(3);
    expect(o.targets.find((t) => t.kind === 'SHEET')?.key).toBe('SHEET1');
  });
});
