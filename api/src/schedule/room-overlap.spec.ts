import { ConflictException } from '@nestjs/common';
import { findRoomConflict } from './room-overlap';
import { ScheduleService } from './schedule.service';

const d = (s: string) => new Date(`${s}T00:00:00.000Z`);
const base = {
  classroomId: 'a',
  room: '501',
  weekday: 1,
  startMinute: 900,
  endMinute: 1020,
  effectiveFrom: d('2026-09-01'),
  effectiveTo: null,
};

describe('Танхимын давхар захиалга', () => {
  it('өөр анги, ижил танхим/гараг, цаг ба хугацаа давхцвал — зөрчил', () => {
    const other = { ...base, id: 'x', classroomId: 'b', startMinute: 960, endMinute: 1080 };
    expect(findRoomConflict(base, [other])).toBe(other);
  });
  it('цаг залгаа, өөр гараг, хугацаа огтлолцохгүй, ижил анги, Онлайн — зөрчил биш', () => {
    const others = [
      { ...base, id: '1', classroomId: 'b', startMinute: 1020, endMinute: 1140 },
      { ...base, id: '2', classroomId: 'b', weekday: 2 },
      { ...base, id: '3', classroomId: 'b', effectiveFrom: d('2025-01-01'), effectiveTo: d('2026-08-31') },
      { ...base, id: '4' },
      { ...base, id: '5', classroomId: 'b', room: '502' },
    ];
    expect(findRoomConflict(base, others)).toBeUndefined();
    expect(findRoomConflict({ ...base, room: 'Онлайн' }, [{ ...base, classroomId: 'b', room: 'Онлайн' }])).toBeUndefined();
    expect(findRoomConflict({ ...base, room: null }, [{ ...base, classroomId: 'b', room: null }])).toBeUndefined();
  });
});

function makeService(rows: unknown[] = []) {
  const prisma: any = {
    classroom: { findUnique: jest.fn(async () => ({ id: 'a', archived: false })) },
    classSchedule: {
      findMany: jest.fn(async ({ where }: any) =>
        where.room ? rows : [],
      ),
      findUnique: jest.fn(async () => ({
        id: 's1',
        classroomId: 'a',
        weekday: 1,
        startMinute: 900,
        endMinute: 1020,
        teacherId: 't1',
        room: '501',
        subject: null,
        effectiveFrom: d('2026-09-01'),
        effectiveTo: null,
      })),
      create: jest.fn(async ({ data }: any) => ({ id: 'new', ...data })),
      update: jest.fn(async ({ data }: any) => ({ id: 's1', ...data })),
    },
    lessonTopic: { updateMany: jest.fn(async () => ({ count: 1 })) },
    scheduleException: { updateMany: jest.fn(async () => ({ count: 0 })) },
    lessonStaffing: { updateMany: jest.fn(async () => ({ count: 2 })) },
    lessonNote: { updateMany: jest.fn(async () => ({ count: 1 })) },
    lessonRecord: { updateMany: jest.fn(async () => ({ count: 0 })) },
    enrollment: { findMany: jest.fn(async () => []) },
  };
  prisma.$transaction = jest.fn(async (fn: any) => fn(prisma));
  prisma.classroom.findMany = jest.fn(async () => []);
  const notifications: any = { notify: jest.fn(async () => undefined) };
  return { prisma, service: new ScheduleService(prisma, notifications) };
}

describe('ScheduleService — танхим, цуврал салгах', () => {
  it('шинэ хуваарь өөр ангийн эзэлсэн танхимд — 409, үүсгэхгүй', async () => {
    const { service, prisma } = makeService([
      { ...base, id: 'o', classroomId: 'b', classroom: { name: '12-3 (Баруун 4)' } },
    ]);
    await expect(
      service.create({
        classroomId: 'a',
        weekday: 1,
        startMinute: 900,
        endMinute: 1020,
        room: '501',
        effectiveFrom: '2026-10-01',
      } as never),
    ).rejects.toBeInstanceOf(ConflictException);
    await expect(
      service.create({ classroomId: 'a', weekday: 1, startMinute: 900, endMinute: 1020, room: '501', effectiveFrom: '2026-10-01' } as never),
    ).rejects.toThrow('12-3');
    expect(prisma.classSchedule.create).not.toHaveBeenCalled();
  });

  it('салгахад тэр өдрөөс хойших сэдэв, багш, тэмдэглэл, батламж шинэ мөр рүү', async () => {
    const { service, prisma } = makeService();
    const out = await service.splitSeries('s1', { from: '2026-10-19', room: '502' } as never);
    expect(out.mode).toBe('SPLIT');
    for (const model of ['lessonTopic', 'lessonStaffing', 'lessonNote', 'lessonRecord'])
      expect(prisma[model].updateMany).toHaveBeenCalledWith({
        where: { scheduleId: 's1', date: { gte: d('2026-10-19') } },
        data: { scheduleId: 'new' },
      });
  });

  it('эхнээс нь салгах (бүгдийг солих) үед null = арилгах, undefined = хэвээр', async () => {
    const { service, prisma } = makeService();
    await service.splitSeries('s1', { from: '2026-09-01', teacherId: null, room: null } as never);
    const data = prisma.classSchedule.update.mock.calls[0][0].data;
    expect(data.teacherId).toBeNull();
    expect(data.room).toBeNull();
    expect(data.subject).toBeUndefined();
  });
});
