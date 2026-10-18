import { Reflector } from '@nestjs/core';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Role } from '../generated/prisma/enums';
import { ClassroomsController } from './classrooms.controller';
import { ClassroomsService } from './classrooms.service';
import { findNotAttending, type AttentionMark } from './attention.logic';

const mark = (
  studentId: string,
  date: string,
  status = 'PRESENT',
  classroomId = 'c1',
): AttentionMark => ({ classroomId, studentId, date, status });
const enr = (studentId: string, start = '2026-09-01', classroomId = 'c1') => ({
  studentId,
  classroomId,
  start,
});

describe('findNotAttending', () => {
  it('2-оос цөөн тэмдэглэгдсэн хичээлтэй ангид хэнийг ч дохиолохгүй', () => {
    expect(findNotAttending([enr('a')], [])).toEqual([]);
    expect(
      findNotAttending([enr('a')], [mark('b', '2026-10-01'), mark('a', '2026-10-01', 'ABSENT')]),
    ).toEqual([]);
  });

  it('сүүлийн 3 хичээлд ирээгүй сурагчийг дохиолно', () => {
    const marks = [
      mark('a', '2026-10-01'),
      mark('b', '2026-10-01'),
      mark('a', '2026-10-02', 'ABSENT'),
      mark('b', '2026-10-02'),
      mark('a', '2026-10-03', 'EXCUSED'),
      mark('b', '2026-10-03'),
      mark('a', '2026-10-04', 'ABSENT'),
      mark('b', '2026-10-04'),
    ];
    const hits = findNotAttending([enr('a'), enr('b')], marks);
    expect(hits).toEqual([
      { studentId: 'a', classroomId: 'c1', lastAttended: '2026-10-01', missedCount: 3 },
    ]);
  });

  it('сүүлийн 3-ын аль нэгэнд ирсэн (ХОЦОРСОН ч) бол дохиолохгүй', () => {
    const marks = [
      mark('a', '2026-10-01', 'ABSENT'),
      mark('b', '2026-10-01'),
      mark('a', '2026-10-02', 'LATE'),
      mark('b', '2026-10-02'),
      mark('a', '2026-10-03', 'ABSENT'),
      mark('b', '2026-10-03'),
    ];
    expect(findNotAttending([enr('a')], marks)).toEqual([]);
  });

  it('хэзээ ч ирээгүй (lastAttended = null) бол дохиолно', () => {
    const marks = [
      mark('b', '2026-10-01'),
      mark('b', '2026-10-02'),
      mark('a', '2026-10-02', 'ABSENT'),
    ];
    expect(findNotAttending([enr('a')], marks)).toEqual([
      { studentId: 'a', classroomId: 'c1', lastAttended: null, missedCount: 2 },
    ]);
  });

  it('нэгдэхээс өмнөх хичээлийг тооцохгүй', () => {
    const marks = [mark('b', '2026-10-01'), mark('b', '2026-10-02'), mark('b', '2026-10-05')];
    // шинэ сурагч 10-04-д нэгдсэн: түүнээс хойш 1 хичээл л → дохиолохгүй
    expect(findNotAttending([enr('a', '2026-10-04')], marks)).toEqual([]);
    // 10-02-оос хойш 2 хичээл → дохиолно
    expect(findNotAttending([enr('a', '2026-10-02')], marks)).toHaveLength(1);
  });

  it('анги бүрийг тусад нь тооцно', () => {
    const marks = [
      mark('b', '2026-10-01', 'PRESENT', 'c2'),
      mark('b', '2026-10-02', 'PRESENT', 'c2'),
    ];
    expect(findNotAttending([enr('a', '2026-09-01', 'c1')], marks)).toEqual([]);
  });
});

describe('ClassroomsService.attentionStudents', () => {
  const d = (s: string) => new Date(`${s}T00:00:00.000Z`);
  function make() {
    const prisma = {
      user: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'u1',
            firstName: 'Нэр',
            lastName: 'Овог',
            studentCode: '2027001',
            phone: '90000001',
            createdAt: d('2026-10-10'),
            studentProfile: { joinedOn: null },
            enrollments: [{ leftAt: d('2026-10-12') }],
          },
          {
            id: 'u2',
            firstName: 'Хоёр',
            lastName: 'Овог',
            studentCode: null,
            phone: null,
            createdAt: d('2026-10-01'),
            studentProfile: { joinedOn: d('2026-09-20') },
            enrollments: [],
          },
        ]),
      },
      enrollment: {
        findMany: jest.fn().mockResolvedValue([
          {
            studentId: 's1',
            classroomId: 'c1',
            joinedAt: d('2026-09-01'),
            classroom: { name: '12-1 (Баруун 4)' },
            student: { firstName: 'А', lastName: 'Б', studentCode: '2027100', studentProfile: null },
          },
          {
            studentId: 's2',
            classroomId: 'c1',
            joinedAt: d('2026-09-01'),
            classroom: { name: '12-1 (Баруун 4)' },
            student: { firstName: 'В', lastName: 'Г', studentCode: '2027101', studentProfile: null },
          },
        ]),
      },
      attendance: {
        findMany: jest.fn().mockResolvedValue([
          { classroomId: 'c1', studentId: 's2', date: d('2026-10-01'), status: 'PRESENT' },
          { classroomId: 'c1', studentId: 's2', date: d('2026-10-02'), status: 'PRESENT' },
          { classroomId: 'c1', studentId: 's1', date: d('2026-10-01'), status: 'ABSENT' },
          { classroomId: 'c1', studentId: 's1', date: d('2026-10-02'), status: 'ABSENT' },
        ]),
      },
    } as any;
    return { prisma, service: new ClassroomsService(prisma, {} as any) };
  }

  it('ангигүй (хуучин ангиас гарсан ба огт орж үзээгүй) болон ирэхгүй сурагчийг буцаана', async () => {
    const { prisma, service } = make();
    const res = await service.attentionStudents();
    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          archivedAt: null,
          enrollments: { none: { leftAt: null } },
        }),
      }),
    );
    // хамгийн удаан хүлээсэн нь эхэнд
    expect(res.unassigned.map((u) => u.id)).toEqual(['u2', 'u1']);
    expect(res.unassigned[1].waitingSince).toEqual(d('2026-10-12'));
    expect(res.unassigned[0].waitingSince).toEqual(d('2026-10-01'));
    expect(res.notAttending).toEqual([
      expect.objectContaining({
        id: 's1',
        classroomName: '12-1 (Баруун 4)',
        lastAttended: null,
        missedCount: 2,
      }),
    ]);
  });

  it('GET /classrooms/attention-students нь зөвхөн Админ, Багш+', () => {
    const guard = new RolesGuard(new Reflector());
    const handler = ClassroomsController.prototype.attention;
    const ctx = (role: Role) =>
      ({
        getHandler: () => handler,
        getClass: () => ClassroomsController,
        switchToHttp: () => ({ getRequest: () => ({ user: { role } }) }),
      }) as any;
    expect(guard.canActivate(ctx(Role.ADMIN))).toBe(true);
    expect(guard.canActivate(ctx(Role.TEACHER_PLUS))).toBe(true);
    expect(guard.canActivate(ctx(Role.TEACHER))).toBe(false);
    expect(guard.canActivate(ctx(Role.STUDENT))).toBe(false);
  });
});
