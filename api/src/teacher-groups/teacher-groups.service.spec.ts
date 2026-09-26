import { BadRequestException, NotFoundException } from '@nestjs/common';
import { TeacherGroupsService } from './teacher-groups.service';

describe('TeacherGroupsService external teacher verification lists', () => {
  const profile = {
    organization: 'Синтетик сургалтын төв',
    verifiedAt: new Date('2026-09-01T00:00:00.000Z'),
    note: 'Зөвхөн зохиомол шалгалтын тэмдэглэл',
  };

  it('returns verified teachers with group counts and only selected fields', async () => {
    const findMany = jest.fn().mockResolvedValue([
      {
        id: 'synthetic-teacher-1',
        email: 'teacher@example.test',
        firstName: 'Зохиомол',
        lastName: 'Багш',
        externalTeacherProfile: profile,
        _count: { teacherGroups: 3 },
      },
    ]);
    const service = new TeacherGroupsService({ user: { findMany } } as never);

    await expect(service.getVerifiedTeachers()).resolves.toEqual([
      {
        id: 'synthetic-teacher-1',
        email: 'teacher@example.test',
        firstName: 'Зохиомол',
        lastName: 'Багш',
        organization: profile.organization,
        verifiedAt: profile.verifiedAt,
        note: profile.note,
        groupCount: 3,
      },
    ]);
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          role: 'TEACHER',
          externalTeacherProfile: { verifiedAt: { not: null } },
        },
        select: expect.objectContaining({
          email: true,
          externalTeacherProfile: expect.any(Object),
          _count: { select: { teacherGroups: true } },
        }),
      }),
    );
    expect(findMany.mock.calls[0][0].select).not.toHaveProperty('passwordHash');
  });

  it('clears verifier and timestamp but preserves the verification note', async () => {
    const findUnique = jest.fn().mockResolvedValue({
      id: 'synthetic-teacher-1',
      externalTeacherProfile: {
        userId: 'synthetic-teacher-1',
        ...profile,
      },
    });
    const update = jest.fn().mockResolvedValue({
      userId: 'synthetic-teacher-1',
      ...profile,
      verifiedAt: null,
    });
    const service = new TeacherGroupsService({
      user: { findUnique },
      externalTeacherProfile: { update },
    } as never);

    await expect(
      service.unverifyExternalTeacher('synthetic-teacher-1'),
    ).resolves.toEqual({
      userId: 'synthetic-teacher-1',
      organization: profile.organization,
      verifiedAt: null,
      note: profile.note,
    });
    expect(update).toHaveBeenCalledWith({
      where: { userId: 'synthetic-teacher-1' },
      data: { verifiedAt: null, verifiedById: null },
      select: {
        userId: true,
        organization: true,
        verifiedAt: true,
        note: true,
      },
    });
  });

  it('rejects missing external teacher profiles', async () => {
    const service = new TeacherGroupsService({
      user: { findUnique: jest.fn().mockResolvedValue(null) },
    } as never);

    await expect(
      service.unverifyExternalTeacher('missing-synthetic-user'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects already unverified teachers', async () => {
    const service = new TeacherGroupsService({
      user: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'synthetic-teacher-1',
          externalTeacherProfile: {
            userId: 'synthetic-teacher-1',
            verifiedAt: null,
          },
        }),
      },
      externalTeacherProfile: { update: jest.fn() },
    } as never);

    await expect(
      service.unverifyExternalTeacher('synthetic-teacher-1'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
