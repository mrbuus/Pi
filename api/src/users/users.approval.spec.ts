/* Jest's objectContaining matcher is typed as any; synthetic query assertions only. */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { ForbiddenException } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { PaymentStatus, Role } from '../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import { StaffCapabilityService } from '../staff-capabilities/staff-capability.service';
import { UsersService } from './users.service';

describe('centre admissions list', () => {
  const fixture = () => {
    const actor = {
      role: Role.TEACHER_PLUS,
      archivedAt: null,
      externalTeacherProfile: null,
    };
    const users = {
      findUnique: jest.fn().mockResolvedValue(actor),
      findMany: jest.fn().mockResolvedValue([
        {
          id: 'synthetic-pupil',
          firstName: 'Жишээ',
          lastName: 'Сурагч',
          phone: null,
          createdAt: new Date(),
          studentProfile: { grade: 12 },
          payments: [],
        },
      ]),
    };
    const has = jest.fn().mockResolvedValue(false);
    const service = new UsersService(
      { user: users } as unknown as PrismaService,
      {} as AuditService,
      { has } as unknown as StaffCapabilityService,
    );
    return { actor, users, has, service };
  };

  it.each([Role.STUDENT, Role.BUYER, Role.TEACHER])(
    'denies live %s role before reading applicants',
    async (role) => {
      const f = fixture();
      f.users.findUnique.mockResolvedValue({ ...f.actor, role });
      await expect(
        f.service.getPendingApprovalStudents('actor'),
      ).rejects.toThrow(ForbiddenException);
      expect(f.users.findMany).not.toHaveBeenCalled();
    },
  );

  it('denies archived staff and external group-teacher profiles even with an elevated token', async () => {
    const f = fixture();
    f.users.findUnique.mockResolvedValue({
      ...f.actor,
      archivedAt: new Date(),
    });
    await expect(f.service.getPendingApprovalStudents('actor')).rejects.toThrow(
      ForbiddenException,
    );
    f.users.findUnique.mockResolvedValue({
      ...f.actor,
      externalTeacherProfile: { userId: 'actor' },
    });
    await expect(f.service.getPendingApprovalStudents('actor')).rejects.toThrow(
      ForbiddenException,
    );
    expect(f.users.findMany).not.toHaveBeenCalled();
  });

  it('does not fetch finance rows or label unpaid when finance capability is absent', async () => {
    const f = fixture();
    const rows = await f.service.getPendingApprovalStudents('actor');
    expect(rows[0].hasConfirmedPayment).toBeNull();
    expect(f.users.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        select: expect.objectContaining({ payments: false }),
      }),
    );
  });

  it('also protects full contact export and approval mutation from group teachers', async () => {
    const f = fixture();
    f.users.findUnique.mockResolvedValue({
      ...f.actor,
      externalTeacherProfile: { userId: 'actor' },
    });
    await expect(f.service.exportStudentsCsv('actor')).rejects.toThrow(
      ForbiddenException,
    );
    await expect(f.service.approveStudent('pupil', 'actor')).rejects.toThrow(
      ForbiddenException,
    );
    expect(f.users.findMany).not.toHaveBeenCalled();
  });

  it('looks for any confirmed receipt in Ulaanbaatar month, not the newest pending/reversed row', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-10-31T16:15:00Z'));
    try {
      const f = fixture();
      f.has.mockResolvedValue(true);
      f.users.findMany.mockResolvedValue([
        {
          id: 'synthetic-pupil',
          firstName: 'Жишээ',
          lastName: 'Сурагч',
          phone: null,
          createdAt: new Date(),
          studentProfile: { grade: 12 },
          payments: [{ status: PaymentStatus.CONFIRMED }],
        },
      ]);
      expect(
        (await f.service.getPendingApprovalStudents('actor'))[0]
          .hasConfirmedPayment,
      ).toBe(true);
      expect(f.users.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          select: expect.objectContaining({
            payments: expect.objectContaining({
              where: { forMonth: '2026-11', status: PaymentStatus.CONFIRMED },
            }),
          }),
        }),
      );
      f.users.findMany.mockResolvedValue([
        {
          id: 'synthetic-pupil',
          firstName: 'Жишээ',
          lastName: 'Сурагч',
          phone: null,
          createdAt: new Date(),
          studentProfile: { grade: 12 },
          payments: [{ status: PaymentStatus.REVERSED }],
        },
      ]);
      expect(
        (await f.service.getPendingApprovalStudents('actor'))[0]
          .hasConfirmedPayment,
      ).toBe(false);
    } finally {
      jest.useRealTimers();
    }
  });
});
