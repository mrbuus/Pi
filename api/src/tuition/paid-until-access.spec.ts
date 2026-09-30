import 'reflect-metadata';
import { ForbiddenException } from '@nestjs/common';
import { ROLES_KEY } from '../auth/decorators/roles.decorator';
import { Role } from '../generated/prisma/enums';
import { TuitionController } from './tuition.controller';
import { TuitionService } from './tuition.service';

describe('paid-until parent access', () => {
  const endpoint = Object.getOwnPropertyDescriptor(
    TuitionController.prototype,
    'getPaidUntil',
  )!.value as object;
  const parentRequest = {
    user: { userId: 'parent-1', role: Role.PARENT },
  } as never;

  it('allows a parent only when their link is verified', async () => {
    const service = {
      hasVerifiedParentLink: jest.fn().mockResolvedValue(true),
      getPaidUntil: jest
        .fn()
        .mockResolvedValue(new Date('2026-10-31T00:00:00Z')),
    };
    const controller = new TuitionController(
      service as unknown as TuitionService,
    );
    await expect(
      controller.getPaidUntil('student-1', parentRequest),
    ).resolves.toEqual({
      paidUntil: new Date('2026-10-31T00:00:00Z'),
    });
    expect(service.hasVerifiedParentLink).toHaveBeenCalledWith(
      'parent-1',
      'student-1',
    );
    expect(service.getPaidUntil).toHaveBeenCalledWith('student-1');
  });

  it('rejects a missing or unverified parent link before reading payment data', async () => {
    const service = {
      hasVerifiedParentLink: jest.fn().mockResolvedValue(false),
      getPaidUntil: jest.fn(),
    };
    const controller = new TuitionController(
      service as unknown as TuitionService,
    );
    await expect(
      controller.getPaidUntil('student-1', parentRequest),
    ).rejects.toThrow(ForbiddenException);
    expect(service.getPaidUntil).not.toHaveBeenCalled();
  });

  it('includes PARENT in the student paid-until route role allowlist', () => {
    expect(Reflect.getMetadata(ROLES_KEY, endpoint)).toContain(Role.PARENT);
  });
});
