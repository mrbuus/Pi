import { ForbiddenException } from '@nestjs/common';
import { FinanceCapabilityGuard } from './finance-capability.guard';
import { PaymentsController } from './payments.controller';
import { TuitionController } from '../tuition/tuition.controller';
import { Role } from '../generated/prisma/enums';
describe('delegated finance permission', () => {
  it('rejects a Plus without the stable-user capability before reaching financial handlers', async () => {
    const capabilities = {
      assert: jest.fn().mockRejectedValue(new ForbiddenException()),
    };
    const guard = new FinanceCapabilityGuard(capabilities as never);
    await expect(
      guard.canActivate({
        switchToHttp: () => ({
          getRequest: () => ({
            user: { userId: 'plus', role: Role.TEACHER_PLUS },
          }),
        }),
      } as never),
    ).rejects.toThrow(ForbiddenException);
    expect(capabilities.assert).toHaveBeenCalledWith('plus', 'finance.manage');
  });
  it('checks staff manual payment creation but preserves the own student route', async () => {
    const payments = { create: jest.fn().mockResolvedValue({ pending: true }) };
    const capabilities = {
      assert: jest.fn().mockRejectedValue(new ForbiddenException()),
    };
    const controller = new PaymentsController(
      payments as never,
      capabilities as never,
    );
    await expect(
      controller.create({} as never, {
        user: { userId: 'plus', role: Role.TEACHER_PLUS },
      }),
    ).rejects.toThrow(ForbiddenException);
    expect(payments.create).not.toHaveBeenCalled();
    await controller.create({} as never, {
      user: { userId: 'student', role: Role.STUDENT },
    });
    expect(payments.create).toHaveBeenCalledWith({}, 'student', Role.STUDENT);
  });
  it('blocks global pupil paid-until lookup by an unassigned Plus', async () => {
    const service = { getPaidUntil: jest.fn() };
    const controller = new TuitionController(
      service as never,
      {
        assert: jest.fn().mockRejectedValue(new ForbiddenException()),
      } as never,
    );
    await expect(
      controller.getPaidUntil('pupil', {
        user: { userId: 'plus', role: Role.TEACHER_PLUS },
      } as never),
    ).rejects.toThrow(ForbiddenException);
    expect(service.getPaidUntil).not.toHaveBeenCalled();
  });
});
