import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Role } from '../generated/prisma/enums';
import {
  BOOKS,
  bookOrder,
  bookTitle,
  classBookSummary,
  cleanBookAmount,
  cleanBookNote,
  collectorTotals,
  isBookKey,
  lockedElsewhere,
  nextSheetKey,
  samePayment,
  sortCollectors,
} from './book-payments.logic';
import {
  BookPaymentsService,
  type BookPaymentRow,
} from './book-payments.service';

describe('«Номын мөнгө» — цэвэр функц', () => {
  it('номын жагсаалт: 7 ном; «Шалгалт-1» ном биш', () => {
    expect(BOOKS.map((b) => b.title)).toEqual([
      'E-1',
      'E-2',
      'E-3',
      'Хавтгай-1',
      'Хавтгай-2',
      'Огторгуй',
      'Pi test',
    ]);
    expect(new Set(BOOKS.map((b) => b.key)).size).toBe(BOOKS.length);
    expect(isBookKey('E2')).toBe(true);
    expect(isBookKey('e2')).toBe(false);
    expect(isBookKey('SHALGALT1')).toBe(false);
    expect(isBookKey(null)).toBe(false);
  });

  it('хариултын хуудас: SHEET1…SHEET99, нэр, дараагийн дугаар', () => {
    expect(isBookKey('SHEET1')).toBe(true);
    expect(isBookKey('SHEET99')).toBe(true);
    expect(isBookKey('SHEET')).toBe(false);
    expect(isBookKey('SHEET0')).toBe(false);
    expect(isBookKey('SHEET100')).toBe(false);
    expect(bookTitle('SHEET2')).toBe('Хариултын хуудас 2');
    expect(bookTitle('E2')).toBe('E-2');
    expect(nextSheetKey([])).toBe('SHEET1');
    expect(nextSheetKey(['SHEET1', 'E2', 'SHEET3'])).toBe('SHEET4');
    expect(nextSheetKey(['SHEET99'])).toBeNull();
    expect(bookOrder('E1')).toBeLessThan(bookOrder('PITEST'));
    expect(bookOrder('PITEST')).toBeLessThan(bookOrder('SHEET1'));
    expect(bookOrder('SHEET1')).toBeLessThan(bookOrder('SHEET2'));
  });

  it('авсан багшийн дараалал: эзний өгсөн 11 нэр эхэнд, үлдсэн нь нэрээр', () => {
    const p = (firstName: string, lastName = '') => ({ firstName, lastName });
    const sorted = sortCollectors([
      p('Анар'),
      p('Заяа'),
      p('Эмүжин', 'У.'),
      p('Бадрал'),
      p('Эмүжин', 'А.'),
      p('Баасанжав'),
      p('Өсөхбаяр'),
      p('Дуламсүрэн'),
    ]);
    expect(sorted.map((x) => `${x.firstName}${x.lastName}`)).toEqual([
      'Баасанжав',
      'Дуламсүрэн',
      'Бадрал',
      'Өсөхбаяр',
      'Заяа',
      'Анар',
      'ЭмүжинА.',
      'ЭмүжинУ.',
    ]);
  });

  it('дүн: 0 зөвшөөрнө (үнэгүй өгсөн), сөрөг/бутархай/хэт их = буруу', () => {
    expect(cleanBookAmount(undefined)).toBeNull();
    expect(cleanBookAmount(0)).toBe(0);
    expect(cleanBookAmount(35000)).toBe(35000);
    expect(cleanBookAmount(-1)).toBeNaN();
    expect(cleanBookAmount(1.5)).toBeNaN();
    expect(cleanBookAmount(1_000_001)).toBeNaN();
    expect(cleanBookNote('  гэмтэлтэй   ном ')).toBe('гэмтэлтэй ном');
    expect(cleanBookNote('  ')).toBeNull();
  });

  const pay = (over: Partial<BookPaymentRow> = {}) => ({
    studentId: 's1',
    status: 'PAID',
    amount: 40000,
    classroomId: 'c5',
    collectedById: 't1',
    note: null,
    ...over,
  });

  it('ижил агуулга: бүх талбар таарвал л ижил', () => {
    const v = {
      status: 'PAID' as const,
      amount: 40000,
      classroomId: 'c5',
      collectedById: 't1',
      note: null,
    };
    expect(samePayment(pay(), v)).toBe(true);
    expect(samePayment(pay({ amount: 35000 }), v)).toBe(false);
    expect(samePayment(pay({ collectedById: 't2' }), v)).toBe(false);
    expect(samePayment(pay({ classroomId: 'c4' }), v)).toBe(false);
    expect(samePayment(pay({ note: 'x' }), v)).toBe(false);
  });

  it('өөр ангид төлсөн мөнгийг ангийн чекээс хөндөхгүй; «авахгүй»-г сольж болно', () => {
    expect(lockedElsewhere(null, 'c4')).toBe(false);
    expect(lockedElsewhere(pay(), 'c5')).toBe(false);
    expect(lockedElsewhere(pay(), 'c4')).toBe(true);
    expect(lockedElsewhere(pay({ classroomId: null }), 'c4')).toBe(true);
    expect(lockedElsewhere(pay({ status: 'SKIPPED' }), 'c4')).toBe(false);
  });

  it('анги × номын тоо: анги сольсон сурагч хоёр ангид зөв тоологдоно', () => {
    // s1 12-5 (c5)-д байхдаа төлөөд 12-4 (c4) рүү шилжсэн; s2 c4-д төлсөн (5,000 хямд);
    // s3 авахгүй; s4 төлөөгүй
    const payments = [
      pay({ studentId: 's1', classroomId: 'c5' }),
      pay({ studentId: 's2', classroomId: 'c4', amount: 35000 }),
      pay({
        studentId: 's3',
        classroomId: 'c4',
        status: 'SKIPPED',
        amount: null,
      }),
    ];
    expect(classBookSummary(['s1', 's2', 's3', 's4'], payments, 'c4')).toEqual({
      total: 4,
      paidHere: 1,
      paidElsewhere: 1,
      skipped: 1,
      left: 1,
      formerPaid: 0,
      collected: 35000,
    });
    // Хуучин анги: s1 одоо жагсаалтад байхгүй ч мөнгө нь тэнд үлдэнэ
    expect(classBookSummary(['s9'], [payments[0]], 'c5')).toEqual({
      total: 1,
      paidHere: 0,
      paidElsewhere: 0,
      skipped: 0,
      left: 1,
      formerPaid: 1,
      collected: 40000,
    });
  });

  it('багш тус бүрийн хураасан мөнгө: номоор задарна, их нь эхэнд', () => {
    const rows = [
      { ...pay({ collectedById: 't1' }), bookKey: 'E2' },
      { ...pay({ collectedById: 't2', amount: 35000 }), bookKey: 'E2' },
      { ...pay({ collectedById: 't2' }), bookKey: 'E1' },
      { ...pay({ status: 'SKIPPED', collectedById: null }), bookKey: 'E1' },
    ];
    expect(collectorTotals(rows)).toEqual([
      {
        collectedById: 't2',
        count: 2,
        sum: 75000,
        byBook: [
          { bookKey: 'E1', count: 1, sum: 40000 },
          { bookKey: 'E2', count: 1, sum: 35000 },
        ],
      },
      {
        collectedById: 't1',
        count: 1,
        sum: 40000,
        byBook: [{ bookKey: 'E2', count: 1, sum: 40000 }],
      },
    ]);
  });
});

describe('BookPaymentsService', () => {
  const ROLE_OF: Record<string, Role> = {
    admin: Role.ADMIN,
    plus: Role.TEACHER_PLUS,
    teacher: Role.TEACHER,
    helper: Role.TEACHER,
    student: Role.STUDENT,
    s1: Role.STUDENT,
  };

  /** bookPayment хүснэгтийн санах ойн хуулбар — void/create-ийн дарааллыг бодитоор шалгана */
  function setup() {
    const rows: BookPaymentRow[] = [];
    let n = 0;
    const bookPayment = {
      findFirst: jest.fn(
        ({ where }: { where: { studentId: string; bookKey: string } }) =>
          Promise.resolve(
            rows.find(
              (r) =>
                r.studentId === where.studentId &&
                r.bookKey === where.bookKey &&
                !r.voidedAt,
            ) ?? null,
          ),
      ),
      findMany: jest.fn(({ where }: { where: { studentId?: string } }) =>
        Promise.resolve(
          rows
            .filter((r) => !where.studentId || r.studentId === where.studentId)
            .reverse(),
        ),
      ),
      updateMany: jest.fn(
        ({
          where,
          data,
        }: {
          where: { id: string };
          data: Partial<BookPaymentRow>;
        }) => {
          const r = rows.find((x) => x.id === where.id && !x.voidedAt);
          if (r) Object.assign(r, data);
          return Promise.resolve({ count: r ? 1 : 0 });
        },
      ),
      create: jest.fn(({ data }: { data: Partial<BookPaymentRow> }) => {
        const row = {
          id: `p${++n}`,
          note: null,
          voidedAt: null,
          voidedById: null,
          createdAt: new Date(2026, 10, 12, 10, n),
          ...data,
        } as BookPaymentRow;
        rows.push(row);
        return Promise.resolve(row);
      }),
    };
    const enrollments = [
      {
        classroomId: 'c4',
        leftAt: null,
        classroom: { id: 'c4', name: '12-4', archived: false },
      },
      {
        classroomId: 'c5',
        leftAt: new Date(),
        classroom: { id: 'c5', name: '12-5', archived: false },
      },
    ];
    const prisma = {
      bookPayment,
      $transaction: jest.fn((fn: (tx: unknown) => unknown) =>
        fn({ bookPayment }),
      ),
      user: {
        findUnique: jest.fn(
          ({ where, select }: { where: { id: string }; select: object }) =>
            Promise.resolve(
              ROLE_OF[where.id]
                ? {
                    id: where.id,
                    firstName: where.id,
                    lastName: 'Б',
                    role: ROLE_OF[where.id],
                    archivedAt: null,
                    externalTeacherProfile: null,
                    ...('enrollments' in select ? { enrollments } : {}),
                  }
                : null,
            ),
        ),
        findMany: jest.fn(({ where }: { where: { id?: { in: string[] } } }) =>
          Promise.resolve(
            (where.id?.in ?? []).map((id) => ({
              id,
              firstName: id,
              lastName: 'Б',
              role: ROLE_OF[id],
            })),
          ),
        ),
      },
      classroom: {
        findMany: jest.fn(({ where }: { where: { id: { in: string[] } } }) =>
          Promise.resolve(
            where.id.in.map((id) => ({ id, name: id, archived: false })),
          ),
        ),
      },
      classCheck: {
        findFirst: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
      },
      enrollment: { findMany: jest.fn().mockResolvedValue([]) },
    };
    const audit = { record: jest.fn().mockResolvedValue(undefined) };
    const service = new BookPaymentsService(prisma as never, audit as never);
    const mark = (
      dto: Parameters<BookPaymentsService['markFromCheck']>[0]['dto'],
      over: { classroomId?: string; actorId?: string } = {},
    ) =>
      service.markFromCheck({
        classroomId: over.classroomId ?? 'c5',
        check: { id: 'k1', bookKey: 'E2', amount: 40000 },
        studentId: 's1',
        dto,
        actorId: over.actorId ?? 'teacher',
        actorRole: Role.TEACHER,
      });
    const active = () => rows.filter((r) => !r.voidedAt);
    return { rows, prisma, audit, service, mark, active };
  }

  describe('ангийн чекээс', () => {
    it('шууд дарвал: дүн = чекийн үнэ, авсан = тэмдэглэсэн багш, анги = энэ анги', async () => {
      const { mark, active, audit } = setup();
      await mark({ checked: true });
      expect(active()).toEqual([
        expect.objectContaining({
          studentId: 's1',
          bookKey: 'E2',
          status: 'PAID',
          amount: 40000,
          classroomId: 'c5',
          checkId: 'k1',
          collectedById: 'teacher',
          createdById: 'teacher',
        }),
      ]);
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'CREATE', entity: 'BookPayment' }),
      );
    });

    it('туслах багш өөр багшийн данс руу орсныг тэмдэглэнэ; хямдарсан дүн', async () => {
      const { mark, active } = setup();
      await mark(
        {
          checked: true,
          collectedById: 'plus',
          amount: 35000,
          note: 'гэмтэлтэй',
        },
        { actorId: 'helper' },
      );
      expect(active()[0]).toMatchObject({
        collectedById: 'plus',
        createdById: 'helper',
        amount: 35000,
        note: 'гэмтэлтэй',
      });
    });

    it('сурагч/байхгүй хүнийг «авсан багш» болгохгүй', async () => {
      const { mark, active } = setup();
      await expect(
        mark({ checked: true, collectedById: 'student' }),
      ).rejects.toBeInstanceOf(BadRequestException);
      await expect(
        mark({ checked: true, collectedById: 'nobody' }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(active()).toHaveLength(0);
    });

    it('засахад хуучин мөр устахгүй — voidedAt авч, шинэ мөр үүснэ', async () => {
      const { mark, rows, active, audit } = setup();
      await mark({ checked: true });
      await mark({ checked: true, collectedById: 'plus' });
      expect(rows).toHaveLength(2);
      expect(rows[0]).toMatchObject({
        collectedById: 'teacher',
        voidedById: 'teacher',
      });
      expect(rows[0].voidedAt).toBeInstanceOf(Date);
      expect(active()).toEqual([
        expect.objectContaining({ collectedById: 'plus' }),
      ]);
      expect(audit.record).toHaveBeenLastCalledWith(
        expect.objectContaining({ action: 'UPDATE' }),
      );
    });

    it('ижил утгаар дахин илгээвэл юу ч бичихгүй', async () => {
      const { mark, rows, audit } = setup();
      await mark({ checked: true });
      await mark({ checked: true });
      expect(rows).toHaveLength(1);
      expect(audit.record).toHaveBeenCalledTimes(1);
    });

    it('болиулахад мөр үлдэнэ (voided), идэвхтэй нь алга', async () => {
      const { mark, rows, active } = setup();
      await mark({ checked: true });
      expect(await mark({ checked: false })).toBeNull();
      expect(rows).toHaveLength(1);
      expect(active()).toHaveLength(0);
      // Тэмдэглэгээгүй сурагчийг болиулах — алдаа биш, бичлэг ч биш
      expect(await mark({ checked: false })).toBeNull();
      expect(rows).toHaveLength(1);
    });

    it('анги сольсон сурагч: хуучин ангид төлснийг шинэ ангиас хөндөхгүй', async () => {
      const { mark, rows, active } = setup();
      await mark({ checked: true }, { classroomId: 'c5' });
      await expect(
        mark({ checked: true }, { classroomId: 'c4' }),
      ).rejects.toThrow('өөр ангид байхдаа төлсөн');
      await expect(
        mark({ checked: false }, { classroomId: 'c4' }),
      ).rejects.toThrow('өөр ангид байхдаа төлсөн');
      await expect(
        mark({ checked: false, skipped: true }, { classroomId: 'c4' }),
      ).rejects.toThrow('өөр ангид байхдаа төлсөн');
      expect(rows).toHaveLength(1);
      expect(active()[0]).toMatchObject({ classroomId: 'c5' });
    });

    it('«авахгүй»: дүн, авсан багшгүй; дараа нь өөр ангид төлж болно', async () => {
      const { mark, active } = setup();
      await mark({ checked: false, skipped: true }, { classroomId: 'c5' });
      expect(active()[0]).toMatchObject({
        status: 'SKIPPED',
        amount: null,
        collectedById: null,
      });
      await mark({ checked: true }, { classroomId: 'c4' });
      expect(active()).toEqual([
        expect.objectContaining({ status: 'PAID', classroomId: 'c4' }),
      ]);
    });

    it('зэрэг дарахад P2002 → дахин оролдоно', async () => {
      const { mark, prisma, active } = setup();
      prisma.bookPayment.create.mockRejectedValueOnce({ code: 'P2002' });
      await mark({ checked: true });
      expect(prisma.$transaction).toHaveBeenCalledTimes(2);
      expect(active()).toHaveLength(1);
    });
  });

  describe('сурагчийн хуудаснаас', () => {
    it('сурагч, эцэг эх → Forbidden', async () => {
      const { service } = setup();
      await expect(
        service.studentBooks('s1', 'student'),
      ).rejects.toBeInstanceOf(ForbiddenException);
      await expect(
        service.setFromProfile('s1', 'E2', { status: 'PAID' }, 'student'),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('анги өгөөгүй бол одоогийн анги; дүнгүй, чекгүй бол дүн шаардана', async () => {
      const { service, active, prisma } = setup();
      await expect(
        service.setFromProfile('s1', 'E2', { status: 'PAID' }, 'teacher'),
      ).rejects.toThrow('Дүнгээ оруулна уу');
      prisma.classCheck.findFirst.mockResolvedValue({
        id: 'k4',
        amount: 40000,
      });
      const saved = await service.setFromProfile(
        's1',
        'E2',
        { status: 'PAID', collectedById: 'plus' },
        'teacher',
      );
      expect(saved).toMatchObject({
        status: 'PAID',
        amount: 40000,
        classroom: { id: 'c4' },
        collectedBy: { id: 'plus' },
        createdBy: { id: 'teacher' },
      });
      expect(active()[0]).toMatchObject({ checkId: 'k4', classroomId: 'c4' });
    });

    it('өмнө сууж байсан ангиар тэмдэглэж болно; огт суугаагүй ангиар болохгүй', async () => {
      const { service, active } = setup();
      await service.setFromProfile(
        's1',
        'E1',
        { status: 'PAID', amount: 30000, classroomId: 'c5' },
        'plus',
      );
      expect(active()[0]).toMatchObject({ classroomId: 'c5', amount: 30000 });
      await expect(
        service.setFromProfile(
          's1',
          'E1',
          { status: 'PAID', amount: 30000, classroomId: 'c9' },
          'plus',
        ),
      ).rejects.toThrow('сууж байгаагүй');
    });

    it('засахад анги хэвээр (хуучин ангид төлсөн мөнгө тэндээ үлдэнэ)', async () => {
      const { service, mark, active } = setup();
      await mark({ checked: true }, { classroomId: 'c5' });
      await service.setFromProfile(
        's1',
        'E2',
        { status: 'PAID', amount: 40000, collectedById: 'plus' },
        'admin',
      );
      expect(active()).toEqual([
        expect.objectContaining({ classroomId: 'c5', collectedById: 'plus' }),
      ]);
    });

    it('NONE = болиулах; буруу ном → NotFound; түүхэд бүх мөр', async () => {
      const { service, mark, active } = setup();
      await mark({ checked: true });
      expect(
        await service.setFromProfile('s1', 'E2', { status: 'NONE' }, 'plus'),
      ).toBeNull();
      expect(active()).toHaveLength(0);
      await expect(
        service.setFromProfile('s1', 'X9', { status: 'NONE' }, 'plus'),
      ).rejects.toThrow('Ном олдсонгүй');
      const view = await service.studentBooks('s1', 'teacher');
      expect(view.books).toHaveLength(BOOKS.length);
      expect(view.books.every((b) => b.payment === null)).toBe(true);
      expect(view.history).toHaveLength(1);
      expect(view.history[0]).toMatchObject({
        title: 'E-2',
        voidedBy: { id: 'plus' },
      });
      expect(view.classrooms).toEqual([
        { id: 'c4', name: '12-4', current: true },
        { id: 'c5', name: '12-5', current: false },
      ]);
    });
  });

  describe('самбар', () => {
    it('Багш тоог бүгдийг, мөнгөнөөс зөвхөн өөрийн хураасныг харна', async () => {
      const { service, mark, prisma } = setup();
      await mark({ checked: true }, { actorId: 'teacher' });
      prisma.bookPayment.findMany.mockImplementation(() =>
        Promise.resolve([
          {
            id: 'a',
            studentId: 's1',
            bookKey: 'E2',
            status: 'PAID',
            amount: 40000,
            classroomId: 'c5',
            collectedById: 'teacher',
          },
          {
            id: 'b',
            studentId: 's2',
            bookKey: 'E2',
            status: 'PAID',
            amount: 35000,
            classroomId: 'c5',
            collectedById: 'plus',
          },
        ] as never),
      );
      prisma.enrollment.findMany.mockResolvedValue([
        { classroomId: 'c5', studentId: 's2' },
        { classroomId: 'c5', studentId: 's3' },
      ]);
      const forTeacher = await service.dashboard('teacher');
      expect(forTeacher.seeAllMoney).toBe(false);
      expect(forTeacher.books).toHaveLength(1);
      expect(forTeacher.books[0]).toMatchObject({ key: 'E2', collected: null });
      expect(forTeacher.books[0].classes[0]).toMatchObject({
        classroomId: 'c5',
        total: 2,
        paidHere: 1,
        formerPaid: 1,
        left: 1,
        collected: null,
      });
      expect(forTeacher.collectors).toEqual([
        expect.objectContaining({
          person: {
            id: 'teacher',
            firstName: 'teacher',
            lastName: 'Б',
            role: Role.TEACHER,
          },
          sum: 40000,
        }),
      ]);
      const forPlus = await service.dashboard('plus');
      expect(forPlus.books[0].collected).toBe(75000);
      expect(forPlus.books[0].classes[0].collected).toBe(75000);
      expect(forPlus.collectors).toHaveLength(2);
    });
  });
});
