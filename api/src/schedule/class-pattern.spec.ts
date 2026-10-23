/* eslint-disable @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/require-await */
import 'reflect-metadata';
import {
  BadRequestException,
  ConflictException,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { addDateDays, dateKey, todayUB } from '../common/date';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Role } from '../generated/prisma/enums';
import {
  composeClassName,
  PatternError,
  planPattern,
  splitClassName,
} from './class-pattern';
import { ScheduleAccessService } from './schedule-access.service';
import { ScheduleController } from './schedule.controller';
import { ScheduleService } from './schedule.service';

const d = (s: string) => new Date(`${s}T00:00:00.000Z`);
const TODAY = todayUB();
const TOMORROW = addDateDays(TODAY, 1);
const PAST = d('2026-09-01');

const row = (over: Partial<any> = {}) => ({
  id: 'r1',
  classroomId: 'A',
  weekday: 1,
  startMinute: 900,
  endMinute: 1050,
  room: '501',
  teacherId: null,
  subject: null,
  effectiveFrom: PAST,
  effectiveTo: null,
  ...over,
});

describe('planPattern (pure)', () => {
  it('keeps unchanged days, splits changed days, ends removed days, adds new days', () => {
    const rows = [
      row({ id: 'mon', weekday: 1 }),
      row({ id: 'wed', weekday: 3 }),
      row({ id: 'fri', weekday: 5 }),
    ];
    const plan = planPattern(
      rows,
      [
        { weekday: 1, startMinute: 900, endMinute: 1050, room: '501' }, // хэвээр
        { weekday: 3, startMinute: 1050, endMinute: 1170, room: '501' }, // цаг өөрчлөгдсөн
        { weekday: 6, startMinute: 600, endMinute: 720, room: '502' }, // шинэ
      ],
      TOMORROW,
      TODAY,
    );
    expect(plan.keep.map((r) => r.id)).toEqual(['mon']);
    expect(plan.change.map((c) => c.row.id)).toEqual(['wed']);
    expect(plan.change[0].data).toMatchObject({
      startMinute: 1050,
      endMinute: 1170,
    });
    // Хассан өдөр — устгахгүй, өмнөх өдрөөр хаана
    expect(plan.end).toEqual([{ row: rows[2], effectiveTo: TODAY }]);
    expect(plan.dropUnstarted).toEqual([]);
    expect(plan.add).toEqual([
      {
        weekday: 6,
        startMinute: 600,
        endMinute: 720,
        room: '502',
        teacherId: null,
      },
    ]);
  });

  it('refuses past dates, duplicate weekdays and bad times', () => {
    expect(() => planPattern([], [], addDateDays(TODAY, -1), TODAY)).toThrow(
      PatternError,
    );
    expect(() =>
      planPattern(
        [],
        [
          { weekday: 1, startMinute: 900, endMinute: 1000 },
          { weekday: 1, startMinute: 1100, endMinute: 1200 },
        ],
        TOMORROW,
        TODAY,
      ),
    ).toThrow(PatternError);
    expect(() =>
      planPattern(
        [],
        [{ weekday: 1, startMinute: 1000, endMinute: 900 }],
        TOMORROW,
        TODAY,
      ),
    ).toThrow(PatternError);
  });

  it('refuses when a planned future change already exists', () => {
    expect(() =>
      planPattern(
        [row({ effectiveFrom: addDateDays(TODAY, 10) })],
        [],
        TOMORROW,
        TODAY,
      ),
    ).toThrow(/төлөвлөсөн/);
  });

  it('unstarted rows (start on the effective date, after today) are dropped, not ended', () => {
    const r = row({ effectiveFrom: TOMORROW });
    const plan = planPattern([r], [], TOMORROW, TODAY);
    expect(plan.dropUnstarted).toEqual([r]);
    expect(plan.end).toEqual([]);
  });

  it('teacherId: undefined keeps, null clears', () => {
    const r = row({ teacherId: 'T1' });
    const day = { weekday: 1, startMinute: 900, endMinute: 1050, room: '501' };
    expect(planPattern([r], [day], TOMORROW, TODAY).keep).toHaveLength(1);
    expect(
      planPattern([r], [{ ...day, teacherId: null }], TOMORROW, TODAY).change[0]
        .data.teacherId,
    ).toBeNull();
  });

  it('class names keep the branch suffix', () => {
    expect(splitClassName('13-5 (Зүүн 4)')).toEqual({
      label: '13-5',
      branch: 'Зүүн 4',
    });
    expect(composeClassName('13-6', 'Зүүн 4')).toBe('13-6 (Зүүн 4)');
    expect(composeClassName('13-6 (Баруун 4)', 'Зүүн 4')).toBe('13-6 (Зүүн 4)');
    expect(composeClassName('НИЙГЭМ', null)).toBe('НИЙГЭМ');
  });
});

/** Санах ойн хуурамч Prisma — жинхэнэ DB-д хүрэхгүй. */
function makeService(opts: { rows?: any[]; classrooms?: any[] } = {}) {
  const rows: any[] = opts.rows ?? [];
  const classrooms: any[] = opts.classrooms ?? [
    { id: 'A', name: '12-1 (Баруун 4)', archived: false, subject: null },
    { id: 'B', name: '12-2 (Баруун 4)', archived: false, subject: null },
  ];
  const audits: any[] = [];
  let seq = 0;
  const match = (r: any, w: any): boolean =>
    Object.entries(w ?? {}).every(([k, v]: [string, any]) => {
      if (v && typeof v === 'object' && !(v instanceof Date)) {
        if ('not' in v) return r[k] !== v.not;
        if ('notIn' in v) return !v.notIn.includes(r[k]);
        if ('in' in v) return v.in.includes(r[k]);
        if ('equals' in v)
          return String(r[k]).toLowerCase() === String(v.equals).toLowerCase();
        if ('gte' in v) return r[k] >= v.gte;
      }
      return r[k] === v;
    });
  const nameOf = (id: string) =>
    classrooms.find((c) => c.id === id)?.name ?? id;
  const classSchedule = {
    findUnique: jest.fn(
      async ({ where }: any) => rows.find((r) => r.id === where.id) ?? null,
    ),
    findMany: jest.fn(async ({ where }: any) =>
      rows
        .filter((r) => match(r, where))
        .map((r) => ({ ...r, classroom: { name: nameOf(r.classroomId) } })),
    ),
    update: jest.fn(async ({ where, data }: any) => {
      const r = rows.find((x) => x.id === where.id);
      for (const [k, v] of Object.entries(data)) if (v !== undefined) r[k] = v;
      return { ...r };
    }),
    create: jest.fn(async ({ data }: any) => {
      const r = {
        id: `new${++seq}`,
        teacherId: null,
        room: null,
        subject: null,
        ...data,
      };
      rows.push(r);
      return { ...r };
    }),
    delete: jest.fn(async ({ where }: any) => {
      const i = rows.findIndex((r) => r.id === where.id);
      return rows.splice(i, 1)[0];
    }),
  };
  const dep = {
    updateMany: jest.fn(async () => ({ count: 0 })),
    count: jest.fn(async () => 0),
  };
  const prisma: any = {
    classSchedule,
    classroom: {
      findUnique: jest.fn(
        async ({ where }: any) =>
          classrooms.find((c) => c.id === where.id) ?? null,
      ),
      findFirst: jest.fn(
        async ({ where }: any) =>
          classrooms.find((c) => match(c, where)) ?? null,
      ),
      findMany: jest.fn(async () => []),
      create: jest.fn(async ({ data }: any) => {
        const c = {
          id: `cls${++seq}`,
          archived: false,
          teacherId: null,
          assistantTeacherId: null,
          subject: null,
          ...data,
        };
        classrooms.push(c);
        return c;
      }),
      update: jest.fn(async ({ where, data }: any) => {
        const c = classrooms.find((x) => x.id === where.id);
        Object.assign(c, data);
        return c;
      }),
    },
    user: {
      findMany: jest.fn(async ({ where }: any) =>
        where.id.in.map((id: string) => ({ id })),
      ),
    },
    enrollment: { findMany: jest.fn(async () => []) },
    auditLog: { create: jest.fn(async ({ data }: any) => audits.push(data)) },
    lessonTopic: dep,
    scheduleException: dep,
    lessonStaffing: dep,
    lessonNote: dep,
    lessonRecord: dep,
  };
  // Транзакц: алдаа гарвал мөрүүдийг буцаана (rollback)
  prisma.$transaction = jest.fn(async (fn: any) => {
    const snapRows = rows.map((r) => ({ ...r }));
    const snapCls = classrooms.map((c) => ({ ...c }));
    try {
      return await fn(prisma);
    } catch (e) {
      rows.splice(0, rows.length, ...snapRows);
      classrooms.splice(0, classrooms.length, ...snapCls);
      throw e;
    }
  });
  const notify = jest.fn(async () => undefined);
  const service = new ScheduleService(prisma, { notify } as any);
  return { service, rows, classrooms, audits, notify, prisma };
}

describe('ScheduleService.putClassPattern', () => {
  const from = dateKey(TOMORROW);

  it('day change splits the series and keeps the past row intact (history)', async () => {
    const { service, rows, audits, notify } = makeService({
      rows: [row({ id: 'mon', weekday: 1 }), row({ id: 'wed', weekday: 3 })],
    });
    const res = await service.putClassPattern(
      'A',
      {
        effectiveFrom: from,
        days: [
          { weekday: 1, startMinute: 900, endMinute: 1050, room: '501' },
          { weekday: 3, startMinute: 1050, endMinute: 1170, room: '501' },
        ],
      },
      'admin',
      Role.ADMIN,
    );
    expect(res).toMatchObject({ changed: true, changedDays: 1, kept: 1 });
    const oldWed = rows.find((r) => r.id === 'wed');
    // Хуучин мөр: цаг хэвээр, өчигдрийн (from − 1) огноогоор хаагдсан
    expect(oldWed).toMatchObject({
      startMinute: 900,
      endMinute: 1050,
      effectiveFrom: PAST,
      effectiveTo: TODAY,
    });
    const newWed = rows.find((r) => r.weekday === 3 && r.id !== 'wed');
    expect(newWed).toMatchObject({
      startMinute: 1050,
      endMinute: 1170,
      effectiveFrom: TOMORROW,
      effectiveTo: null,
    });
    expect(rows.find((r) => r.id === 'mon')).toMatchObject({
      effectiveTo: null,
    });
    expect(rows).toHaveLength(3); // юу ч устгагдаагүй
    expect(audits.map((a) => [a.action, a.entity])).toEqual([
      ['UPDATE', 'ClassSchedulePattern'],
    ]);
    expect(notify).toHaveBeenCalled();
  });

  it('removing a day ends it (no delete); adding a day creates a new row', async () => {
    const { service, rows, prisma } = makeService({
      rows: [row({ id: 'mon', weekday: 1 }), row({ id: 'fri', weekday: 5 })],
    });
    await service.putClassPattern(
      'A',
      {
        effectiveFrom: from,
        days: [
          { weekday: 1, startMinute: 900, endMinute: 1050, room: '501' },
          { weekday: 6, startMinute: 600, endMinute: 720, room: '503' },
        ],
      },
      'admin',
      Role.ADMIN,
    );
    expect(rows.find((r) => r.id === 'fri')).toMatchObject({
      effectiveFrom: PAST,
      effectiveTo: TODAY,
    });
    expect(rows.find((r) => r.weekday === 6)).toMatchObject({
      room: '503',
      effectiveFrom: TOMORROW,
      effectiveTo: null,
      classroomId: 'A',
    });
    expect(prisma.classSchedule.delete).not.toHaveBeenCalled();
  });

  it('rejects a room clash with another class and rolls everything back', async () => {
    const { service, rows, audits } = makeService({
      rows: [
        row({ id: 'mon', weekday: 1, room: '501' }),
        row({ id: 'other', classroomId: 'B', weekday: 1, room: '502' }),
      ],
    });
    await expect(
      service.putClassPattern(
        'A',
        {
          effectiveFrom: from,
          days: [
            { weekday: 1, startMinute: 900, endMinute: 1050, room: '502' },
          ],
        },
        'admin',
        Role.ADMIN,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(rows.find((r) => r.id === 'mon')).toMatchObject({
      room: '501',
      effectiveTo: null,
    });
    expect(rows).toHaveLength(2);
    expect(audits).toHaveLength(0);
  });

  it('rename keeps the id and branch suffix; duplicate active name is rejected', async () => {
    const { service, classrooms, audits } = makeService({
      rows: [row({ id: 'mon' })],
    });
    await expect(
      service.putClassPattern(
        'A',
        {
          effectiveFrom: from,
          name: '12-2',
          days: [
            { weekday: 1, startMinute: 900, endMinute: 1050, room: '501' },
          ],
        },
        'admin',
        Role.ADMIN,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(classrooms.find((c) => c.id === 'A')!.name).toBe('12-1 (Баруун 4)');

    const res = await service.putClassPattern(
      'A',
      {
        effectiveFrom: from,
        name: '12-13',
        days: [{ weekday: 1, startMinute: 900, endMinute: 1050, room: '501' }],
      },
      'admin',
      Role.ADMIN,
    );
    expect(res).toMatchObject({ classroomId: 'A', name: '12-13 (Баруун 4)' });
    expect(classrooms.find((c) => c.id === 'A')!.name).toBe('12-13 (Баруун 4)');
    expect(audits.map((a) => [a.action, a.entity])).toEqual([
      ['UPDATE', 'Classroom'],
    ]);
  });

  it('past effective date is a 400', async () => {
    const { service } = makeService({ rows: [row()] });
    await expect(
      service.putClassPattern(
        'A',
        { effectiveFrom: dateKey(addDateDays(TODAY, -3)), days: [] },
        'admin',
        Role.ADMIN,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe('ScheduleService.createClassWithPattern', () => {
  const from = dateKey(TOMORROW);

  it('creates the class with branch-suffixed name, grade and its weekly rows (audited)', async () => {
    const { service, rows, classrooms, audits } = makeService();
    const res = await service.createClassWithPattern(
      {
        name: '13-5',
        branch: 'Зүүн 4',
        effectiveFrom: from,
        days: [
          { weekday: 1, startMinute: 1050, endMinute: 1170, room: '301' },
          { weekday: 6, startMinute: 600, endMinute: 720, room: '302' },
        ],
      },
      'tplus',
      Role.TEACHER_PLUS,
    );
    expect(res.classroom).toMatchObject({
      name: '13-5 (Зүүн 4)',
      grade: 13,
      type: 'IN_PERSON',
    });
    expect(classrooms).toHaveLength(3);
    expect(rows.filter((r) => r.classroomId === res.classroom.id)).toHaveLength(
      2,
    );
    expect(audits.map((a) => [a.action, a.entity])).toEqual([
      ['CREATE', 'Classroom'],
      ['CREATE', 'ClassSchedulePattern'],
    ]);
  });

  it('duplicate name → 409; room clash → 409 and no class is left behind', async () => {
    const { service, classrooms } = makeService({
      rows: [row({ id: 'b1', classroomId: 'B', weekday: 1, room: '501' })],
    });
    await expect(
      service.createClassWithPattern(
        { name: '12-2', branch: 'Баруун 4', effectiveFrom: from, days: [] },
        'admin',
        Role.ADMIN,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
    await expect(
      service.createClassWithPattern(
        {
          name: '12-20',
          branch: 'Баруун 4',
          effectiveFrom: from,
          days: [
            { weekday: 1, startMinute: 900, endMinute: 1050, room: '501' },
          ],
        },
        'admin',
        Role.ADMIN,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(classrooms).toHaveLength(2);
  });
});

describe('Class pattern routes: roles', () => {
  const guard = new RolesGuard(new Reflector());
  const can = (handler: any, role: Role) =>
    guard.canActivate({
      getHandler: () => handler,
      getClass: () => ScheduleController,
      switchToHttp: () => ({
        getRequest: () => ({ user: { userId: 'u', role } }),
      }),
    } as unknown as ExecutionContext);
  const proto = ScheduleController.prototype as any;

  it.each([['putClassPattern'], ['createClassWithPattern']])(
    '%s: ADMIN/TEACHER_PLUS allowed, TEACHER (and others) get 403',
    (name) => {
      expect(can(proto[name], Role.ADMIN)).toBe(true);
      expect(can(proto[name], Role.TEACHER_PLUS)).toBe(true);
      for (const role of [
        Role.TEACHER,
        Role.STUDENT,
        Role.PARENT,
        Role.BUYER,
      ]) {
        let denied = false;
        try {
          denied = !can(proto[name], role);
        } catch (e) {
          denied = e instanceof ForbiddenException;
        }
        expect(denied).toBe(true);
      }
    },
  );

  it('schedule.manage is still checked server-side (TEACHER without capability → 403)', async () => {
    const access = new ScheduleAccessService(
      {} as any,
      {
        assert: jest.fn(async () => {
          throw new ForbiddenException();
        }),
      } as any,
    );
    const service = {
      putClassPattern: jest.fn(),
      createClassWithPattern: jest.fn(),
    };
    const controller = new ScheduleController(
      service as any,
      access,
      {} as any,
    );
    const user = { userId: 't', role: Role.TEACHER };
    await expect(
      controller.putClassPattern(
        'A',
        { effectiveFrom: '2026-11-01', days: [] },
        { user },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      controller.createClassWithPattern(
        {
          name: '1-1',
          branch: 'Зүүн 4',
          effectiveFrom: '2026-11-01',
          days: [],
        },
        { user },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(service.putClassPattern).not.toHaveBeenCalled();
    expect(service.createClassWithPattern).not.toHaveBeenCalled();
  });
});
