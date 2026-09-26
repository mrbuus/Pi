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

  it('stores an explicit rejection reason on a pending profile', async () => {
    const findUnique = jest.fn().mockResolvedValue({
      id: 'synthetic-teacher-2',
      externalTeacherProfile: { verifiedAt: null, note: null },
    });
    const update = jest.fn().mockResolvedValue({
      userId: 'synthetic-teacher-2',
      verifiedAt: null,
      note: 'ТАТГАЛЗСАН ШАЛТГААН: Байгууллага баталгаажаагүй.',
    });
    const service = new TeacherGroupsService({
      user: { findUnique },
      externalTeacherProfile: { update },
    } as never);

    await expect(
      service.rejectExternalTeacher('synthetic-teacher-2', {
        reason: ' Байгууллага баталгаажаагүй. ',
      }),
    ).resolves.toEqual({
      userId: 'synthetic-teacher-2',
      rejected: true,
      rejectionReason: 'Байгууллага баталгаажаагүй.',
      verifiedAt: null,
    });
    expect(update).toHaveBeenCalledWith({
      where: { userId: 'synthetic-teacher-2' },
      data: { note: 'ТАТГАЛЗСАН ШАЛТГААН: Байгууллага баталгаажаагүй.' },
      select: { userId: true, note: true, verifiedAt: true },
    });
  });

  it('rejects attempts to reject verified profiles or blank reasons', async () => {
    const verifiedService = new TeacherGroupsService({
      user: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'synthetic-teacher-1',
          externalTeacherProfile: { verifiedAt: profile.verifiedAt, note: null },
        }),
      },
    } as never);
    await expect(
      verifiedService.rejectExternalTeacher('synthetic-teacher-1', {
        reason: 'Already reviewed',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    const pendingService = new TeacherGroupsService({
      user: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'synthetic-teacher-2',
          externalTeacherProfile: { verifiedAt: null, note: null },
        }),
      },
    } as never);
    await expect(
      pendingService.rejectExternalTeacher('synthetic-teacher-2', {
        reason: '   ',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('moves a rejected teacher back to the pending list by clearing the marker', async () => {
    const findUnique = jest.fn().mockResolvedValue({
      id: 'synthetic-teacher-2',
      externalTeacherProfile: {
        note: 'ТАТГАЛЗСАН ШАЛТГААН: Байгууллага баталгаажаагүй.',
        verifiedAt: null,
      },
    });
    const update = jest.fn().mockResolvedValue({
      userId: 'synthetic-teacher-2',
      note: null,
      verifiedAt: null,
    });
    const service = new TeacherGroupsService({
      user: { findUnique },
      externalTeacherProfile: { update },
    } as never);

    await expect(
      service.reconsiderExternalTeacher('synthetic-teacher-2'),
    ).resolves.toEqual({
      userId: 'synthetic-teacher-2',
      rejectionReason: null,
      verifiedAt: null,
    });
    expect(update).toHaveBeenCalledWith({
      where: { userId: 'synthetic-teacher-2' },
      data: { note: null },
      select: { userId: true, note: true, verifiedAt: true },
    });
  });
});
