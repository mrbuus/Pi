import { Role } from '../generated/prisma/enums';
import { ClassroomsService } from './classrooms.service';

// Disband метод нь Prisma transaction ашигладаг тул гараар mock-лэнэ —
// мөнхөд бодит DB-ийн оронд stub ашигла.

function makeDisbandPrisma(opts: {
  classroom: { id: string; name: string; archived?: boolean };
  activeEnrollments: Array<{ studentId: string; classroomId: string }>;
}) {
  return {
    classroom: {
      findUnique: async () => opts.classroom,
    },
    enrollment: {
      updateMany: async (args: any) => ({
        count: opts.activeEnrollments.length,
      }),
    },
    activity: {
      create: async () => ({}),
    },
    $transaction: async (fn: (tx: any) => Promise<any>) => {
      const tx = {
        enrollment: {
          updateMany: async (args: any) => ({
            count: opts.activeEnrollments.length,
          }),
        },
        activity: {
          create: async () => ({}),
        },
      };
      return fn(tx);
    },
  } as any;
}

function makeDisbandAudit() {
  return {
    record: async () => ({}),
  } as any;
}

describe('ClassroomsService.get — ангийн дэлгэрэнгүй', () => {
  const activeClassroom = {
    id: 'class-1',
    name: 'Math A',
    type: 'IN_PERSON',
    grade: 10,
    teacherId: 'teacher-1',
    archived: false,
    teacher: { id: 'teacher-1', firstName: 'Тест', lastName: 'Багш' },
    enrollments: [
      {
        joinedAt: new Date('2026-09-01T00:00:00.000Z'),
        student: {
          id: 'student-1',
          firstName: 'Тест',
          lastName: 'Сурагч',
          studentCode: 'S-00001',
        },
      },
    ],
  };

  function makePrisma(
    classroom: typeof activeClassroom | null,
    canManageStudents = false,
  ) {
    return {
      classroom: { findUnique: jest.fn().mockResolvedValue(classroom) },
      teacherProfile: {
        findUnique: jest.fn().mockResolvedValue({ canManageStudents }),
      },
    } as any;
  }

  it('идэвхтэй ангийн багш болон идэвхтэй сурагчдын хязгаарлагдсан мэдээллийг буцаана', async () => {
    const prisma = makePrisma(activeClassroom);
    const service = new ClassroomsService(prisma, makeDisbandAudit());

    const result = await service.get('class-1', 'teacher-1', Role.TEACHER);

    expect(prisma.classroom.findUnique).toHaveBeenCalledWith({
      where: { id: 'class-1' },
      include: {
        teacher: { select: { id: true, firstName: true, lastName: true } },
        enrollments: {
          where: { leftAt: null, student: { archivedAt: null } },
          orderBy: { joinedAt: 'asc' },
          select: {
            joinedAt: true,
            student: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                studentCode: true,
              },
            },
          },
        },
      },
    });
    expect(result).toEqual({
      classroom: {
        id: 'class-1',
        name: 'Math A',
        type: 'IN_PERSON',
        grade: 10,
        teacherId: 'teacher-1',
        teacher: activeClassroom.teacher,
      },
      students: [{ ...activeClassroom.enrollments[0].student, joinedAt: activeClassroom.enrollments[0].joinedAt }],
      permissions: { canManageStudents: false },
    });
  });

  it.each([Role.ADMIN, Role.TEACHER_PLUS])('%s ангийг харж чадна', async (role) => {
    const service = new ClassroomsService(makePrisma(activeClassroom), makeDisbandAudit());
    await expect(service.get('class-1', 'other-user', role)).resolves.toMatchObject({
      classroom: { id: 'class-1' },
    });
  });

  it('TEACHER_PLUS-ийн сурагч удирдах эрхийг хариунд зөв тусгана', async () => {
    const enabled = new ClassroomsService(makePrisma(activeClassroom, true), makeDisbandAudit());
    const disabled = new ClassroomsService(makePrisma(activeClassroom, false), makeDisbandAudit());
    await expect(enabled.get('class-1', 'teacher-plus', Role.TEACHER_PLUS)).resolves.toMatchObject({
      permissions: { canManageStudents: true },
    });
    await expect(disabled.get('class-1', 'teacher-plus', Role.TEACHER_PLUS)).resolves.toMatchObject({
      permissions: { canManageStudents: false },
    });
  });

  it('TEACHER зөвхөн өөрийн ангийг харна', async () => {
    const service = new ClassroomsService(makePrisma(activeClassroom), makeDisbandAudit());
    await expect(service.get('class-1', 'other-teacher', Role.TEACHER)).rejects.toThrow(
      'Энэ ангид хандах эрхгүй',
    );
  });

  it('архивласан эсвэл олдоогүй ангийг нээхгүй', async () => {
    const archived = { ...activeClassroom, archived: true };
    const service = new ClassroomsService(makePrisma(archived), makeDisbandAudit());
    await expect(service.get('class-1', 'admin-1', Role.ADMIN)).rejects.toThrow(
      'Анги олдсонгүй',
    );

    const missingService = new ClassroomsService(makePrisma(null), makeDisbandAudit());
    await expect(missingService.get('missing', 'admin-1', Role.ADMIN)).rejects.toThrow(
      'Анги олдсонгүй',
    );
  });
});

describe('ClassroomsService.disband — анги тараах', () => {
  it('идэвхтэй enrollment бүрийн leftAt=өнөөдөр болгоно', async () => {
    const prisma = makeDisbandPrisma({
      classroom: { id: 'class-1', name: 'Math A' },
      activeEnrollments: [
        { studentId: 's1', classroomId: 'class-1' },
        { studentId: 's2', classroomId: 'class-1' },
      ],
    });

    const service = new ClassroomsService(prisma, makeDisbandAudit());
    const result = await service.disband('class-1', 'actor-1', Role.ADMIN);

    expect(result.disbanded).toBe(true);
    expect(result.affectedStudentCount).toBe(2);
  });

  it('идэвхгүй enrollment хөндөгдөхгүй', async () => {
    const prisma = makeDisbandPrisma({
      classroom: { id: 'class-1', name: 'Math A' },
      activeEnrollments: [], // идэвхгүй enrollment сурагч байхгүй
    });

    const service = new ClassroomsService(prisma, makeDisbandAudit());
    const result = await service.disband('class-1', 'actor-1', Role.TEACHER_PLUS);

    expect(result.disbanded).toBe(true);
    expect(result.affectedStudentCount).toBe(0);
  });

  it('олдоогүй анги бол 404', async () => {
    const prisma = {
      classroom: {
        findUnique: async () => null,
      },
    } as any;

    const service = new ClassroomsService(prisma, makeDisbandAudit());

    try {
      await service.disband('nonexistent', 'actor-1', Role.ADMIN);
      fail('NotFoundException дуудах ёстой байсан');
    } catch (e: any) {
      expect(e.message).toContain('олдсонгүй');
    }
  });

  it('ADMIN болон TEACHER_PLUS эрхэй байж болно', async () => {
    const prisma = makeDisbandPrisma({
      classroom: { id: 'class-1', name: 'Math A' },
      activeEnrollments: [{ studentId: 's1', classroomId: 'class-1' }],
    });

    const service = new ClassroomsService(prisma, makeDisbandAudit());

    // ADMIN
    const adminResult = await service.disband('class-1', 'admin-1', Role.ADMIN);
    expect(adminResult.disbanded).toBe(true);

    // TEACHER_PLUS
    const teacherResult = await service.disband(
      'class-1',
      'teacher-1',
      Role.TEACHER_PLUS,
    );
    expect(teacherResult.disbanded).toBe(true);
  });
});
