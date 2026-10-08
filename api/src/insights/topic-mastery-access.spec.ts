import { InsightsService } from './insights.service';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '../generated/prisma/enums';

// G07: GET /insights/topic-mastery нь сурагчийн нэр, эзэмшлийг буцаадаг тул
// энгийн БАГШ зөвхөн өөрийн ангийг асууж болно.
describe('InsightsService.getTopicMastery access', () => {
  const makeService = (teacherId: string | null) => {
    const prisma = {
      $queryRawUnsafe: jest.fn().mockResolvedValue([
        {
          studentId: 's1',
          studentName: 'Бат Дорж',
          topicId: 't1',
          topicName: 'Функц',
          problem_count: 4,
          correct_count: 3,
          mastery_rate: 0.75,
        },
      ]),
      classroom: {
        findUnique: jest
          .fn()
          .mockResolvedValue(teacherId === null ? null : { teacherId }),
      },
    };
    return { service: new InsightsService(prisma as unknown as PrismaService), prisma };
  };

  it('lets a TEACHER query their own classroom', async () => {
    const { service, prisma } = makeService('teacher-1');
    const rows = await service.getTopicMastery('class-1', 50, { userId: 'teacher-1', role: Role.TEACHER });
    expect(rows).toHaveLength(1);
    expect(prisma.classroom.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'class-1' } }),
    );
  });

  it('forbids a TEACHER from another teacher classroom without running the query', async () => {
    const { service, prisma } = makeService('teacher-2');
    await expect(
      service.getTopicMastery('class-1', 50, { userId: 'teacher-1', role: Role.TEACHER }),
    ).rejects.toMatchObject({ status: 403 });
    expect(prisma.$queryRawUnsafe).not.toHaveBeenCalled();
  });

  it('requires a classroomId for a TEACHER (no school-wide list)', async () => {
    const { service, prisma } = makeService('teacher-1');
    await expect(
      service.getTopicMastery(undefined, 50, { userId: 'teacher-1', role: Role.TEACHER }),
    ).rejects.toMatchObject({ status: 400 });
    expect(prisma.$queryRawUnsafe).not.toHaveBeenCalled();
  });

  it('returns 404 for an unknown classroom', async () => {
    const { service } = makeService(null);
    await expect(
      service.getTopicMastery('missing', 50, { userId: 'teacher-1', role: Role.TEACHER }),
    ).rejects.toMatchObject({ status: 404 });
  });

  it.each([Role.TEACHER_PLUS, Role.ADMIN])('lets %s query any classroom', async (role) => {
    const { service, prisma } = makeService('someone-else');
    await expect(service.getTopicMastery('class-1', 50, { userId: 'u1', role })).resolves.toHaveLength(1);
    await expect(service.getTopicMastery(undefined, 50, { userId: 'u1', role })).resolves.toHaveLength(1);
    expect(prisma.classroom.findUnique).not.toHaveBeenCalled();
  });
});
