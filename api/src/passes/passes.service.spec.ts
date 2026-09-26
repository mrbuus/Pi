import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Role } from '../generated/prisma/enums';
import { PassesService } from './passes.service';

describe('PassesService удирдлагын үйлдлүүд', () => {
  const prisma = {
    pass: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    userPass: {
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      findUnique: jest.fn(),
      delete: jest.fn(),
    },
    user: { findUnique: jest.fn() },
  };
  const audit = { record: jest.fn() };
  let service: PassesService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new PassesService(prisma as never, audit as never);
  });

  it('идэвхгүй эрхүүд болон эзэмшигчийн тоог хамт жагсаана', async () => {
    const pass = { id: 'pass-1', name: 'Сарын эрх', active: false };
    prisma.pass.findMany.mockResolvedValue([
      { ...pass, _count: { userPasses: 2 } },
    ]);
    await expect(service.listAll()).resolves.toEqual([
      { ...pass, holdersCount: 2 },
    ]);
  });

  it('эзэмшигчийн жагсаалтад утас, имэйл буцаахгүй', async () => {
    prisma.pass.findUnique.mockResolvedValue({ id: 'pass-1' });
    const holders = [
      {
        id: 'grant-1',
        startsAt: new Date('2026-01-01'),
        expiresAt: new Date('2026-02-01'),
        user: {
          id: 'student-1',
          firstName: 'Тест',
          lastName: 'Сурагч',
          studentCode: 'S26-001',
        },
      },
    ];
    prisma.userPass.findMany.mockResolvedValue(holders);
    await expect(service.holders('pass-1')).resolves.toEqual([
      { ...holders[0], active: false },
    ]);
    expect(prisma.userPass.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        select: expect.objectContaining({
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              studentCode: true,
            },
          },
        }),
      }),
    );
  });

  it('байхгүй эрхийн эзэмшигчийг хайхад 404 буцаана', async () => {
    prisma.pass.findUnique.mockResolvedValue(null);
    await expect(service.holders('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prisma.userPass.findMany).not.toHaveBeenCalled();
  });

  it('эзэмшигчтэй эрхийн тодорхойлолтыг устгахгүй', async () => {
    prisma.pass.findUnique.mockResolvedValue({
      id: 'pass-1',
      name: 'Сарын эрх',
    });
    prisma.userPass.count.mockResolvedValue(1);
    await expect(
      service.remove('pass-1', { id: 'admin-1', role: Role.ADMIN }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.pass.delete).not.toHaveBeenCalled();
    expect(audit.record).not.toHaveBeenCalled();
  });

  it('эзэмшигчгүй эрх устгахдаа өмнөх мэдээллийг аудитад бичнэ', async () => {
    const before = { id: 'pass-1', name: 'Сарын эрх' };
    const actor = { id: 'admin-1', role: Role.ADMIN };
    prisma.pass.findUnique.mockResolvedValue(before);
    prisma.userPass.count.mockResolvedValue(0);
    prisma.pass.delete.mockResolvedValue(before);
    await expect(service.remove('pass-1', actor)).resolves.toEqual({
      deleted: true,
    });
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: actor.id,
        action: 'DELETE',
        entity: 'Pass',
        entityId: 'pass-1',
        before,
      }),
    );
  });

  it('идэвхгүй болгосон өөрчлөлтийг аудитад өмнө/дараах утгаар бичнэ', async () => {
    const before = { id: 'pass-1', name: 'Сарын эрх', active: true };
    const after = { ...before, active: false };
    prisma.pass.findUnique.mockResolvedValue(before);
    prisma.pass.update.mockResolvedValue(after);
    const actor = { id: 'admin-1', role: Role.ADMIN };
    await expect(
      service.update('pass-1', { active: false }, actor),
    ).resolves.toEqual(after);
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: actor.id,
        action: 'UPDATE',
        entity: 'Pass',
        entityId: 'pass-1',
        before,
        after,
      }),
    );
  });

  it('идэвхгүй эрх шинээр олгохгүй', async () => {
    prisma.pass.findUnique.mockResolvedValue({
      id: 'pass-1',
      active: false,
      durationDays: 30,
    });
    await expect(
      service.grant('pass-1', 'student-1', undefined, undefined, true),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
    expect(prisma.userPass.create).not.toHaveBeenCalled();
  });

  it('цуцлах шалтгаан хоосон үед олголтыг хэвээр үлдээнэ', async () => {
    await expect(
      service.revokeUserPass(
        'grant-1',
        { id: 'admin-1', role: Role.ADMIN },
        '  ',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.userPass.findUnique).not.toHaveBeenCalled();
    expect(prisma.userPass.delete).not.toHaveBeenCalled();
    expect(audit.record).not.toHaveBeenCalled();
  });

  it('эрхийг зөвхөн сурагчид олгоно', async () => {
    prisma.pass.findUnique.mockResolvedValue({
      id: 'pass-1',
      active: true,
      durationDays: 30,
    });
    prisma.user.findUnique.mockResolvedValue({
      id: 'teacher-1',
      role: Role.TEACHER,
    });
    await expect(
      service.grant('pass-1', 'teacher-1', undefined, undefined, true),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.userPass.create).not.toHaveBeenCalled();
  });

  it('олголтыг аудитаар бүртгэж, цуцалсан UserPass-г дахин үлдээхгүй', async () => {
    const actor = { id: 'admin-1', role: Role.ADMIN };
    prisma.pass.findUnique.mockResolvedValue({
      id: 'pass-1',
      active: true,
      durationDays: 30,
    });
    prisma.user.findUnique.mockResolvedValue({
      id: 'student-1',
      role: Role.STUDENT,
    });
    const granted = {
      id: 'grant-1',
      userId: 'student-1',
      passId: 'pass-1',
      expiresAt: new Date(),
      pass: { name: 'Сарын эрх' },
    };
    prisma.userPass.create.mockResolvedValue(granted);
    await expect(
      service.grant(
        'pass-1',
        'student-1',
        undefined,
        actor,
        true,
        'Шалтгаан тэмдэглэл',
      ),
    ).resolves.toBe(granted);
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'GRANT',
        entity: 'UserPass',
        actorId: actor.id,
        after: expect.objectContaining({ note: 'Шалтгаан тэмдэглэл' }),
      }),
    );

    prisma.userPass.findUnique.mockResolvedValue(granted);
    prisma.userPass.delete.mockResolvedValue(granted);
    await expect(
      service.revokeUserPass('grant-1', actor, 'Цуцлах болсон шалтгаан'),
    ).resolves.toEqual({ revoked: true });
    expect(prisma.userPass.delete).toHaveBeenCalledWith({
      where: { id: 'grant-1' },
    });
    expect(audit.record).toHaveBeenLastCalledWith(
      expect.objectContaining({
        action: 'REVOKE',
        entity: 'UserPass',
        actorId: actor.id,
        reason: 'Цуцлах болсон шалтгаан',
      }),
    );
  });
});
