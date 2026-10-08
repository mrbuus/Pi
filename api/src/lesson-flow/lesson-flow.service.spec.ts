import { LessonFlowService } from './lesson-flow.service';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '../generated/prisma/enums';
describe('daily classroom preview', () => {
  let db: any, service: LessonFlowService;
  beforeEach(() => {
    db = {
      lessonPacket: { findUnique: jest.fn(async () => null) },
      classroom: {
        findUnique: jest.fn(async () => ({
          id: 'class',
          teacherId: 'owner',
          name: 'Class',
          archived: false,
        })),
      },
      chapter: {
        findFirst: jest.fn(async () => ({
          id: 'chapter',
          title: 'Algebra',
          theories: [],
          tests: [],
        })),
      },
      enrollment: {
        findMany: jest.fn(async () => [
          { studentId: 'a', student: { firstName: 'A', lastName: 'Test' } },
          { studentId: 'b', student: { firstName: 'B', lastName: 'Test' } },
        ]),
      },
      attendance: {
        findMany: jest.fn(async () => [
          { studentId: 'a', status: 'PRESENT' },
          { studentId: 'b', status: 'ABSENT' },
        ]),
      },
      classTestSession: { findMany: jest.fn(async () => []) },
      assignment: {
        findMany: jest.fn(async () => [
          {
            id: 'hw',
            title: 'HW',
            submissions: [
              { studentId: 'a', submittedAt: new Date(), state: 'RETURNED' },
              { studentId: 'a', submittedAt: new Date(), state: 'SUBMITTED' },
            ],
          },
        ]),
      },
    };
    service = new LessonFlowService(db as PrismaService);
  });
  it('denies random teacher-plus before reading pupil data', async () => {
    await expect(
      service.preview(
        'class',
        '2026-10-07',
        'chapter',
        'random',
        Role.TEACHER_PLUS,
      ),
    ).rejects.toMatchObject({ status: 403 });
    expect(db.enrollment.findMany).not.toHaveBeenCalled();
  });
  it('uses real distinct pupil denominators, unknown theory and attendance-aware suggestions', async () => {
    const p = await service.preview(
      'class',
      '2026-10-07',
      'chapter',
      'owner',
      Role.TEACHER,
    );
    expect(p.counters).toEqual({
      classSize: 2,
      theorySubmitted: null,
      classTestSubmitted: 0,
      homeworkSubmitted: 1,
    });
    expect(p.rotation.map((x) => x.studentId)).toEqual(['a']);
    expect(p.makeupPupils.map((x) => x.studentId)).toEqual(['b']);
    expect(
      db.assignment.findMany.mock.calls[0][0].where.createdAt.gte.toISOString(),
    ).toBe('2026-10-06T16:00:00.000Z');
  });
  it('rejects invalid calendar dates', async () => {
    await expect(
      service.preview('class', '2026-02-30', 'chapter', 'owner', Role.TEACHER),
    ).rejects.toMatchObject({ status: 400 });
  });
});
