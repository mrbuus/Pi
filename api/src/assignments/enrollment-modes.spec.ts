import { AssignmentsService } from './assignments.service';

describe('student enrollment homework modes', () => {
  it('returns both real active enrollment types independently of student profile', async () => {
    const classrooms = [
      { id: 'classroom', name: 'Classroom', type: 'IN_PERSON' },
      { id: 'online', name: 'Online', type: 'ONLINE' },
    ];
    const findMany = jest.fn().mockResolvedValue(classrooms.map(classroom => ({ classroom })));
    const service = new AssignmentsService({ enrollment: { findMany } } as any, {} as any, {} as any);
    expect(await service.myClassrooms('jwt-student')).toEqual(classrooms);
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { studentId: 'jwt-student', leftAt: null, student: { archivedAt: null }, classroom: { archived: false } },
      select: { classroom: { select: { id: true, name: true, type: true } } },
    }));
  });
  it('does not invent a homework mode when no active enrollment exists', async () => {
    const service = new AssignmentsService({ enrollment: { findMany: jest.fn().mockResolvedValue([]) } } as any, {} as any, {} as any);
    expect(await service.myClassrooms('jwt-student')).toEqual([]);
  });
});
