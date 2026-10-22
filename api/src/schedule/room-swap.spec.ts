/* eslint-disable @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/require-await, @typescript-eslint/no-unnecessary-type-assertion */
import { ConflictException, BadRequestException } from '@nestjs/common';
import { assertCanSwap, RoomSwapError, swappedRooms } from './room-swap';
import { ScheduleService } from './schedule.service';

const d = (s: string) => new Date(`${s}T00:00:00.000Z`);

describe('assertCanSwap (pure)', () => {
  const b = {
    id: 'b1',
    classroomId: 'B',
    room: '502',
    weekday: 1,
    startMinute: 900,
    endMinute: 1050,
    effectiveFrom: d('2026-09-01'),
    effectiveTo: null,
  };
  const aNew = {
    id: 'a1',
    classroomId: 'A',
    room: '502',
    weekday: 1,
    startMinute: 900,
    endMinute: 1050,
    effectiveFrom: d('2026-10-26'),
    effectiveTo: null,
  };
  it('allows swap when the target room is occupied by another class', () => {
    expect(() => assertCanSwap(aNew, '501', b)).not.toThrow();
  });
  it('rejects without overlap (nothing to swap)', () => {
    expect(() =>
      assertCanSwap({ ...aNew, startMinute: 1200, endMinute: 1300 }, '501', b),
    ).toThrow(RoomSwapError);
  });
  it('rejects same class, online/empty rooms and already-same room', () => {
    expect(() =>
      assertCanSwap({ ...aNew, classroomId: 'B' }, '501', b),
    ).toThrow(RoomSwapError);
    expect(() => assertCanSwap(aNew, null, b)).toThrow(RoomSwapError);
    expect(() => assertCanSwap(aNew, 'Онлайн', b)).toThrow(RoomSwapError);
    expect(() => assertCanSwap(aNew, '502', b)).toThrow(RoomSwapError);
    expect(() => assertCanSwap({ ...aNew, room: '503' }, '501', b)).toThrow(
      RoomSwapError,
    );
  });
  it('swappedRooms exchanges the rooms', () => {
    expect(swappedRooms('501', '502')).toEqual({ aRoom: '502', bRoom: '501' });
  });
});

/** Санах ойн хуурамч ClassSchedule — жинхэнэ DB-д хүрэхгүй. */
function makeService(rows: any[]) {
  let seq = 0;
  const match = (r: any, w: any): boolean =>
    Object.entries(w ?? {}).every(([k, v]: [string, any]) => {
      if (v && typeof v === 'object' && !(v instanceof Date)) {
        if ('not' in v) return r[k] !== v.not;
        if ('notIn' in v) return !v.notIn.includes(r[k]);
        if ('gt' in v) return r[k] > v.gt;
      }
      return r[k] === v;
    });
  const classSchedule = {
    findUnique: jest.fn(
      async ({ where }: any) => rows.find((r) => r.id === where.id) ?? null,
    ),
    findMany: jest.fn(async ({ where }: any) =>
      rows
        .filter((r) => match(r, where))
        .map((r) => ({
          ...r,
          classroom: { name: `${r.classroomId} (Баруун 4)` },
        })),
    ),
    update: jest.fn(async ({ where, data }: any) => {
      const r = rows.find((x) => x.id === where.id);
      for (const [k, v] of Object.entries(data)) if (v !== undefined) r[k] = v;
      return r;
    }),
    create: jest.fn(async ({ data }: any) => {
      const r = { id: `new${++seq}`, ...data };
      rows.push(r);
      return r;
    }),
  };
  const noop = { updateMany: jest.fn(async () => ({ count: 0 })) };
  const notify = jest.fn().mockResolvedValue(undefined);
  const prisma: any = {
    classSchedule,
    lessonTopic: noop,
    scheduleException: noop,
    lessonStaffing: noop,
    lessonNote: noop,
    lessonRecord: noop,
    user: { findUnique: jest.fn() },
    enrollment: {
      findMany: jest.fn().mockResolvedValue([{ studentId: 's1' }]),
    },
    classroom: {
      findMany: jest
        .fn()
        .mockResolvedValue([{ teacherId: 't1', assistantTeacherId: null }]),
    },
    // атомар байдлыг дуурайх: алдаа гарвал бүх өөрчлөлтийг буцаана
    $transaction: jest.fn(async (fn: any) => {
      const snap = JSON.parse(JSON.stringify(rows), (_k, v) =>
        typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(v)
          ? new Date(v)
          : v,
      );
      try {
        return await fn(prisma);
      } catch (e) {
        rows.splice(0, rows.length, ...snap);
        throw e;
      }
    }),
  };
  const service = new ScheduleService(prisma, { notify } as any);
  return { service, rows, notify };
}

const row = (o: any) => ({
  weekday: 1,
  startMinute: 900,
  endMinute: 1050,
  teacherId: null,
  subject: null,
  effectiveFrom: d('2026-09-01'),
  effectiveTo: null,
  ...o,
});

describe('ScheduleService.swapRooms', () => {
  it('swaps rooms from the effective date, keeps history, notifies both classes', async () => {
    const { service, rows, notify } = makeService([
      row({ id: 'a1', classroomId: 'A', room: '501' }),
      row({ id: 'b1', classroomId: 'B', room: '502' }),
    ]);
    const res = await service.swapRooms('a1', {
      otherId: 'b1',
      from: '2026-10-26',
    } as any);
    expect(res.mode).toBe('SWAPPED');
    const live = (cls: string, day: string) =>
      rows.find(
        (r) =>
          r.classroomId === cls &&
          r.effectiveFrom <= d(day) &&
          (!r.effectiveTo || r.effectiveTo >= d(day)),
      )!;
    expect(live('A', '2026-10-26').room).toBe('502');
    expect(live('B', '2026-10-26').room).toBe('501');
    // өмнөх түүх хэвээр
    expect(live('A', '2026-10-19').room).toBe('501');
    expect(live('B', '2026-10-19').room).toBe('502');
    expect(notify).toHaveBeenCalledTimes(1);
  });

  it('replaces in place when the date is at/before the series start', async () => {
    const { service, rows } = makeService([
      row({ id: 'a1', classroomId: 'A', room: '501' }),
      row({ id: 'b1', classroomId: 'B', room: '502' }),
    ]);
    await service.swapRooms('a1', { otherId: 'b1', from: '2026-08-01' } as any);
    expect(rows).toHaveLength(2);
    expect(rows.find((r) => r.id === 'a1')!.room).toBe('502');
    expect(rows.find((r) => r.id === 'b1')!.room).toBe('501');
  });

  it('swaps later chain segments of both classes too', async () => {
    const { service, rows } = makeService([
      row({
        id: 'a1',
        classroomId: 'A',
        room: '501',
        effectiveTo: d('2026-11-01'),
      }),
      row({
        id: 'a2',
        classroomId: 'A',
        room: '501',
        effectiveFrom: d('2026-11-02'),
      }),
      row({ id: 'b1', classroomId: 'B', room: '502' }),
    ]);
    await service.swapRooms('a1', { otherId: 'b1', from: '2026-10-26' } as any);
    expect(rows.find((r) => r.id === 'a2')!.room).toBe('502');
  });

  it('rolls back everything when a third class blocks the new room (409)', async () => {
    const { service, rows, notify } = makeService([
      row({ id: 'a1', classroomId: 'A', room: '501' }),
      row({ id: 'b1', classroomId: 'B', room: '502' }),
      row({ id: 'c1', classroomId: 'C', room: '501' }), // 501-д A-тай хамт C — A гарсны дараа B орвол C-тэй давхцана
    ]);
    const before = JSON.stringify(rows);
    await expect(
      service.swapRooms('a1', { otherId: 'b1', from: '2026-10-26' } as any),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(JSON.stringify(rows)).toBe(before);
    expect(notify).not.toHaveBeenCalled();
  });

  it('rejects when there is no overlap to swap (400)', async () => {
    const { service } = makeService([
      row({ id: 'a1', classroomId: 'A', room: '501' }),
      row({
        id: 'b1',
        classroomId: 'B',
        room: '502',
        startMinute: 1200,
        endMinute: 1300,
      }),
    ]);
    await expect(
      service.swapRooms('a1', { otherId: 'b1', from: '2026-10-26' } as any),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
