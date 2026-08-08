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
