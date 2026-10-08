import { TeacherGroupsService } from './teacher-groups.service';
import { Role } from '../generated/prisma/enums';
describe('external group current authorization', () => {
  it.each([
    { role: Role.TEACHER, externalTeacherProfile: { verifiedAt: null } },
    { role: Role.STUDENT, externalTeacherProfile: { verifiedAt: new Date() } },
    {
      role: Role.TEACHER,
      archivedAt: new Date(),
      externalTeacherProfile: { verifiedAt: new Date() },
    },
  ])(
    'denies stale verification, role or archived owner before pupil query',
    async (actor) => {
      const db: any = {
        user: { findUnique: jest.fn().mockResolvedValue(actor) },
        teacherGroup: { findUnique: jest.fn() },
      };
      await expect(
        new TeacherGroupsService(db).getGroupDetails('group', 'owner'),
      ).rejects.toThrow();
      expect(db.teacherGroup.findUnique).not.toHaveBeenCalled();
    },
  );
  it('archived groups deny owner access', async () => {
    const db: any = {
      user: {
        findUnique: jest
          .fn()
          .mockResolvedValue({
            role: Role.TEACHER,
            externalTeacherProfile: { verifiedAt: new Date() },
          }),
      },
      teacherGroup: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ ownerId: 'owner', archived: true }),
      },
      testResult: { findMany: jest.fn() },
    };
    await expect(
      new TeacherGroupsService(db).getGroupDetails('group', 'owner'),
    ).rejects.toThrow();
    expect(db.testResult.findMany).not.toHaveBeenCalled();
  });
});
