import { ClassroomsService } from './classrooms.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { Role } from '../generated/prisma/enums';
describe('archived student classroom boundaries', () => {
  function setup() {
    const db = {
      classroom: { findUnique: jest.fn(), findMany: jest.fn() },
      user: {
        findUnique: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
      },
      $transaction: jest.fn(),
    };
    return {
      db,
      service: new ClassroomsService(
        db as unknown as PrismaService,
        {} as AuditService,
      ),
    };
  }
  it('never enrolls an archived student', async () => {
    const { db, service } = setup();
    db.classroom.findUnique.mockResolvedValue({ id: 'class', archived: false });
    db.user.findUnique.mockResolvedValue({
      id: 'student',
      role: Role.STUDENT,
      archivedAt: new Date(),
    });
    await expect(
      service.enroll('class', 'student', 'admin', Role.ADMIN),
    ).rejects.toThrow('Сурагч олдсонгүй');
    expect(db.$transaction).not.toHaveBeenCalled();
  });
  it('omits archived students from the unassigned list', async () => {
    const { db, service } = setup();
    await service.unassignedStudents();
    expect(db.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ archivedAt: null }),
      }),
    );
  });
  it('counts and lists only active non-archived students', async () => {
    const { db, service } = setup();
    await service.list('admin', Role.ADMIN);
    expect(db.classroom.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        include: expect.objectContaining({
          _count: {
            select: {
              enrollments: {
                where: { leftAt: null, student: { archivedAt: null } },
              },
            },
          },
        }),
      }),
    );
    db.classroom.findUnique.mockResolvedValue({ id: 'class', enrollments: [] });
    await service.get('class', 'admin', Role.ADMIN);
    expect(db.classroom.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        include: expect.objectContaining({
          enrollments: expect.objectContaining({
            where: { leftAt: null, student: { archivedAt: null } },
          }),
        }),
      }),
    );
  });
});
