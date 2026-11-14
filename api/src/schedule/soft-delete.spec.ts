import { NotFoundException } from '@nestjs/common';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { Role } from '../generated/prisma/enums';
import type { NotificationCenterService } from '../notification-center/notification-center.service';
import type { PrismaService } from '../prisma/prisma.service';
import type { StaffCapabilityService } from '../staff-capabilities/staff-capability.service';
import { TasksService } from '../tasks/tasks.service';
import { ScheduleAccessService } from './schedule-access.service';
import { ScheduleService } from './schedule.service';
import { TeacherHoursService } from './teacher-hours.service';

/**
 * Зөөлөн устгал (эзний дүрэм 2026-10-23): хуваарь, хуанли, даалгаврыг
 * «устгах» нь deletedAt бөглөнө. Энэ тест хуурамч Prisma-аар (where-д
 * `deletedAt: null` байвал л устсан мөрийг хасна) уншилт бүр шүүлтүүрээ
 * тавьж байгааг шалгана — шүүлтүүргүй уншилт устсан мөрийг буцааж, тест унана.
 */

type Row = Record<string, any>;

/** where.deletedAt === null бол л устсан мөрийг хасна; бусад тохиолдолд бүгдийг өгнө. */
function liveOnly(rows: Row[], where: any) {
  if (where && 'deletedAt' in where && where.deletedAt === null)
    return rows.filter((r) => r.deletedAt == null);
  return rows;
}
function findUniqueIn(rows: Row[]) {
  return jest.fn(({ where }: { where: any }) => {
    const hit = liveOnly(rows, where).find((r) => r.id === where.id);
    return Promise.resolve(hit ?? null);
  });
}

const MONDAY = '2026-11-02'; // 2026-11-01 = Ням
const day = (key: string) => new Date(`${key}T00:00:00.000Z`);
const DELETED_AT = new Date('2026-11-01T10:00:00.000Z');

function scheduleRows(): Row[] {
  const base = {
    classroomId: 'c1',
    classroom: { id: 'c1', name: '12-А', _count: { enrollments: 3 } },
    weekday: 1,
    room: null,
    subject: null,
    teacherId: 't1',
    teacher: { id: 't1', firstName: 'Болор', lastName: 'Б', role: Role.TEACHER },
    effectiveFrom: day('2026-09-01'),
    effectiveTo: null,
    exceptions: [],
  };
  return [
    { ...base, id: 'live', startMinute: 540, endMinute: 630, deletedAt: null },
    // Устгасан хичээл — хаана ч харагдах ёсгүй
    { ...base, id: 'gone', startMinute: 660, endMinute: 750, deletedAt: DELETED_AT },
  ];
}

function calendarRows(): Row[] {
  return [
    // Устгасан «бүх ангийн амралт» — хичээлийг хаах ёсгүй
    {
      id: 'holiday-gone',
      date: day(MONDAY),
      type: 'HOLIDAY',
      title: 'Устгасан амралт',
      note: null,
      createdById: 'admin',
      classrooms: [],
      deletedAt: DELETED_AT,
    },
  ];
}

function makePrisma() {
  const schedules = scheduleRows();
  const calendar = calendarRows();
  return {
    schedules,
    calendar,
    classSchedule: {
      findMany: jest.fn(({ where }: { where: any }) =>
        Promise.resolve(liveOnly(schedules, where)),
      ),
      findUnique: findUniqueIn(schedules),
      count: jest.fn(({ where }: { where: any }) =>
        Promise.resolve(liveOnly(schedules, where).length),
      ),
      create: jest.fn(({ data }: { data: Row }) =>
        Promise.resolve({ id: 'new', ...data }),
      ),
      update: jest.fn(({ where, data }: { where: any; data: Row }) =>
        Promise.resolve({ ...schedules.find((r) => r.id === where.id), ...data }),
      ),
    },
    academicCalendarDay: {
      findMany: jest.fn(({ where }: { where: any }) =>
        Promise.resolve(liveOnly(calendar, where)),
      ),
      findUnique: findUniqueIn(calendar),
      update: jest.fn(({ where, data }: { where: any; data: Row }) =>
        Promise.resolve({ ...calendar.find((r) => r.id === where.id), ...data }),
      ),
    },
    scheduleException: { findMany: jest.fn().mockResolvedValue([]) },
    lessonTopic: { findMany: jest.fn().mockResolvedValue([]) },
    lessonStaffing: { findMany: jest.fn().mockResolvedValue([]) },
    classroom: {
      findUnique: jest.fn().mockResolvedValue({ id: 'c1', archived: false }),
      findMany: jest.fn().mockResolvedValue([]),
    },
    enrollment: { findMany: jest.fn().mockResolvedValue([]) },
    user: { findMany: jest.fn().mockResolvedValue([]) },
    auditLog: { create: jest.fn().mockResolvedValue({ id: 'audit' }) },
  };
}

function makeService(prisma: ReturnType<typeof makePrisma>) {
  return new ScheduleService(
    prisma as unknown as PrismaService,
    { notify: jest.fn() } as unknown as NotificationCenterService,
  );
}

describe('Зөөлөн устгал — хуваарийн хөдөлгүүр устсан мөрийг амилуулахгүй', () => {
  it('7 хоногийн харагдац (getWeek): устсан хичээл, устсан амралт орохгүй', async () => {
    const prisma = makePrisma();
    const week = await makeService(prisma).getWeek(MONDAY, ['c1']);
    const monday = week.days.find((d) => d.date === MONDAY)!;
    expect(monday.entries.map((e) => e.scheduleId)).toEqual(['live']);
    expect(monday.isHoliday).toBe(false);
    // Онцгой тохиолдол ч зөвхөн идэвхтэй хуваарийнхаас
    expect(prisma.scheduleException.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          schedule: expect.objectContaining({ deletedAt: null }),
        }),
      }),
    );
  });

  it('бодит хичээлтэй өдрүүд (expandDays): устсан амралт хичээлийг хаахгүй, устсан хичээл гарахгүй', async () => {
    const prisma = makePrisma();
    const days = await makeService(prisma).expandDays(MONDAY, MONDAY);
    expect(days).toHaveLength(1);
    expect(days[0].holiday).toBeNull();
    expect(days[0].classes.map((c) => c.id)).toEqual(['live']);
  });

  it('жагсаалт, ангийн 7 хоног, багшийн «миний хуваарь»-д устсан мөр алга', async () => {
    const prisma = makePrisma();
    const service = makeService(prisma);
    expect((await service.findAll()).map((r) => r.id)).toEqual(['live']);
    expect((await service.forClassroom('c1')).map((r) => r.id)).toEqual(['live']);
    const mine = (await service.forMe('t1', Role.TEACHER)) as { entries: Row[] };
    expect(mine.entries.map((r) => r.id)).toEqual(['live']);
  });

  it('findOne / occurrenceKey устсан хуваарьт 404', async () => {
    const service = makeService(makePrisma());
    await expect(service.findOne('gone')).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.occurrenceKey('gone', MONDAY, false)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    await expect(service.findOne('live')).resolves.toMatchObject({ id: 'live' });
  });

  it('DELETE /schedule/:id нь deletedAt бөглөж аудит бичнэ — хатуу устгалгүй', async () => {
    const prisma = makePrisma();
    const service = makeService(prisma);
    await expect(service.remove('live', 'admin', Role.ADMIN)).resolves.toEqual({
      removed: true,
    });
    expect(prisma.classSchedule.update).toHaveBeenCalledWith({
      where: { id: 'live' },
      data: { deletedAt: expect.any(Date), deletedById: 'admin' },
    });
    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: 'DELETE',
        entity: 'ClassSchedule',
        entityId: 'live',
        actorId: 'admin',
      }),
    });
    expect((prisma.classSchedule as Row).delete).toBeUndefined();
    // Аль хэдийн устсаныг дахин устгах = 404
    await expect(service.remove('gone', 'admin', Role.ADMIN)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('устсан хичээлтэй ижил цагт шинэ хичээл нэмэхэд давхцал гэж үзэхгүй', async () => {
    const prisma = makePrisma();
    await expect(
      makeService(prisma).create({
        classroomId: 'c1',
        weekday: 1,
        startMinute: 660,
        endMinute: 750,
        effectiveFrom: '2026-09-01',
      } as never),
    ).resolves.toMatchObject({ id: 'new' });
  });

  it('хуанли: жагсаалт, дэлгэрэнгүй, DELETE /calendar/:id зөөлөн', async () => {
    const prisma = makePrisma();
    const service = makeService(prisma);
    expect(await service.listCalendarDays()).toEqual([]);
    await expect(service.findCalendarDay('holiday-gone')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    await expect(
      service.removeCalendarDay('holiday-gone', 'admin', Role.ADMIN),
    ).rejects.toBeInstanceOf(NotFoundException);

    prisma.calendar.push({
      id: 'exam',
      date: day(MONDAY),
      type: 'EXAM',
      title: 'Шалгалт',
      note: null,
      createdById: 'admin',
      classrooms: [],
      deletedAt: null,
    });
    await service.removeCalendarDay('exam', 'admin', Role.ADMIN);
    expect(prisma.academicCalendarDay.update).toHaveBeenCalledWith({
      where: { id: 'exam' },
      data: { deletedAt: expect.any(Date), deletedById: 'admin' },
    });
    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ entity: 'AcademicCalendarDay', action: 'DELETE' }),
    });
  });

  it('багшийн ачаалал (teacher-hours): устсан хичээлийн цаг тоологдохгүй', async () => {
    const prisma = makePrisma();
    const service = new TeacherHoursService(prisma as unknown as PrismaService);
    const { teachers } = await service.forMonth('2026-11', 't1');
    const sessions = teachers.flatMap((t) => t.sessions);
    expect(sessions.length).toBeGreaterThan(0);
    expect(sessions.every((s) => s.startMinute === 540)).toBe(true);
    // Устсан «амралт» 11-02-ны хичээлийг хасахгүй
    expect(sessions.some((s) => s.date === MONDAY)).toBe(true);
  });

  it('эрхийн шалгалт (schedule-access): устсан хуваарь = 404, эрх өөрчлөгдөхгүй', async () => {
    const prisma = makePrisma();
    const capabilities = { assert: jest.fn().mockResolvedValue(undefined) };
    const access = new ScheduleAccessService(
      prisma as unknown as PrismaService,
      capabilities as unknown as StaffCapabilityService,
    );
    const actor = { userId: 'admin', role: Role.ADMIN };
    await expect(access.manageSchedule(actor, 'gone')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    await expect(access.readSchedule(actor, 'gone')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    await access.manageSchedule(actor, 'live');
    expect(capabilities.assert).toHaveBeenCalledWith('admin', 'schedule.manage', 'c1');
  });
});

describe('Зөөлөн устгал — ажилтны даалгавар (DELETE /tasks/:id)', () => {
  function makeTaskPrisma() {
    const tasks: Row[] = [
      { id: 'a', deletedAt: null, status: 'PLANNED', estimateHours: 2, assignees: [{ userId: 'u1' }] },
      { id: 'b', deletedAt: DELETED_AT, status: 'PLANNED', estimateHours: 50, assignees: [{ userId: 'u1' }] },
    ];
    return {
      tasks,
      staffTask: {
        findMany: jest.fn(({ where }: { where: any }) =>
          Promise.resolve(liveOnly(tasks, where)),
        ),
        findUnique: findUniqueIn(tasks),
        update: jest.fn(({ where, data }: { where: any; data: Row }) =>
          Promise.resolve({ ...tasks.find((t) => t.id === where.id), ...data }),
        ),
      },
      user: {
        findMany: jest.fn().mockResolvedValue([
          { id: 'u1', firstName: 'А', lastName: 'Б', avatarUrl: null, role: Role.TEACHER },
        ]),
      },
    };
  }

  it('жагсаалт, дэд даалгавар: устсаныг хасна; эцэг нь устсан дэд даалгавар дээд түвшинд гарна', async () => {
    const prisma = makeTaskPrisma();
    const service = new TasksService(prisma as unknown as PrismaService);
    await service.findAll({} as never);
    const args = prisma.staffTask.findMany.mock.calls[0][0] as any;
    expect(args.where.deletedAt).toBeNull();
    expect(args.include.subtasks.where).toEqual({ deletedAt: null });
    // Хуучин onDelete: SetNull-тэй ижил: parentTaskId-г дарж бичихгүйгээр
    expect(JSON.stringify(args.where)).toContain('"parentTask":{"deletedAt":{"not":null}}');
  });

  it('findOne/засах/оноох устсан даалгаварт 404; DELETE нь deletedAt бөглөнө', async () => {
    const prisma = makeTaskPrisma();
    const service = new TasksService(prisma as unknown as PrismaService);
    await expect(service.findOne('b')).rejects.toBeInstanceOf(NotFoundException);
    await expect(
      service.update('b', { status: 'DONE' } as never, 'u1', Role.ADMIN),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.remove('b', 'admin')).rejects.toBeInstanceOf(NotFoundException);

    await expect(service.remove('a', 'admin')).resolves.toEqual({ id: 'a' });
    expect(prisma.staffTask.update).toHaveBeenCalledWith({
      where: { id: 'a' },
      data: { deletedAt: expect.any(Date), deletedById: 'admin' },
    });
    expect((prisma.staffTask as Row).delete).toBeUndefined();
  });

  it('ачаалал (workload): устсан даалгаврын цаг тоологдохгүй', async () => {
    const prisma = makeTaskPrisma();
    const service = new TasksService(prisma as unknown as PrismaService);
    const [row] = await service.workload({} as never);
    expect(row.totalEstimateHours).toBe(2);
    expect(row.counts.PLANNED).toBe(1);
  });
});

/**
 * Регрессийн хамгаалалт: ClassSchedule / AcademicCalendarDay / StaffTask-ийг
 * уншдаг ШИНЭ дуудлага шүүлтүүргүй бичигдвэл энд унана. Дуудлагаас хойших 12
 * мөрөнд deletedAt (эсвэл LIVE / NOT_DELETED / шүүсэн scheduleWhere) байх ёстой.
 */
describe('Зөөлөн устгал — эх кодын бүх уншилт шүүлтүүртэй', () => {
  const root = join(__dirname, '..');
  const files: string[] = [];
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const p = join(dir, name);
      if (statSync(p).isDirectory()) {
        if (name !== 'generated') walk(p);
      } else if (p.endsWith('.ts') && !p.endsWith('.spec.ts')) files.push(p);
    }
  };
  walk(root);
  const READ =
    /\.(classSchedule|academicCalendarDay|academicCalendarDayClassroom|staffTask)\.(findMany|findUnique|findUniqueOrThrow|findFirst|findFirstOrThrow|count|groupBy|aggregate)\(/;
  const OK = /deletedAt|\bLIVE\b|NOT_DELETED|scheduleWhere/;

  it('Prisma уншилт бүр deletedAt-ээр шүүнэ', () => {
    const offenders: string[] = [];
    let reads = 0;
    for (const f of files) {
      const lines = readFileSync(f, 'utf8').split('\n');
      lines.forEach((line, i) => {
        if (!READ.test(line)) return;
        reads += 1;
        if (!OK.test(lines.slice(i, i + 12).join('\n')))
          offenders.push(`${relative(root, f)}:${i + 1}`);
      });
    }
    expect(reads).toBeGreaterThan(40);
    expect(offenders).toEqual([]);
  });

  it('түүхий SQL дахь "ClassSchedule" / "AcademicCalendarDay" / "StaffTask" join deletedAt-тай', () => {
    const offenders: string[] = [];
    for (const f of files) {
      const lines = readFileSync(f, 'utf8').split('\n');
      lines.forEach((line, i) => {
        if (!/"(ClassSchedule|AcademicCalendarDay|StaffTask)"\s+\w+/.test(line)) return;
        if (!/"deletedAt" IS NULL/.test(lines.slice(i, i + 8).join('\n')))
          offenders.push(`${relative(root, f)}:${i + 1}`);
      });
    }
    expect(offenders).toEqual([]);
  });

  it('эдгээр загварт хатуу устгал (delete/deleteMany) үлдээгүй', () => {
    const offenders: string[] = [];
    for (const f of files) {
      readFileSync(f, 'utf8')
        .split('\n')
        .forEach((line, i) => {
          if (/\.(classSchedule|academicCalendarDay|staffTask)\.(delete|deleteMany)\(/.test(line))
            offenders.push(`${relative(root, f)}:${i + 1}`);
        });
    }
    expect(offenders).toEqual([]);
  });
});
