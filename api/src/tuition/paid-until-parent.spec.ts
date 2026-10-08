import { ForbiddenException } from '@nestjs/common';
import { ROLES_KEY } from '../auth/decorators/roles.decorator';
import { TuitionController } from './tuition.controller';
import { TuitionService } from './tuition.service';
import { PrismaService } from '../prisma/prisma.service';

describe('GET /tuition/paid-until/:studentId — эцэг эх (G26)', () => {
  function make(link: object | null) {
    const prisma = { parentLink: { findFirst: jest.fn(async () => link) }, enrollment: { findMany: jest.fn() } };
    const service = new TuitionService(prisma as unknown as PrismaService, {} as never);
    jest.spyOn(service, 'getPaidUntil').mockResolvedValue(new Date('2026-10-20T00:00:00Z'));
    const ctrl = new (TuitionController as any)(service);
    return { ctrl, prisma, service };
  }
  const req = { user: { userId: 'parent1', role: 'PARENT' } } as any;

  it('PARENT role зөвшөөрөгдсөн', () => {
    expect(Reflect.getMetadata(ROLES_KEY, TuitionController.prototype.getPaidUntil)).toContain('PARENT');
  });

  it('баталгаажсан хүүхдийнхийг авна; verifiedAt шүүлттэй хайна', async () => {
    const { ctrl, prisma } = make({ id: 'l1' });
    await expect(ctrl.getPaidUntil('s1', req)).resolves.toEqual({ paidUntil: new Date('2026-10-20T00:00:00Z') });
    expect(prisma.parentLink.findFirst).toHaveBeenCalledWith({
      where: { parentId: 'parent1', studentId: 's1', verifiedAt: { not: null } },
      select: { id: true },
    });
  });

  it('холбоогүй / баталгаажаагүй хүүхэд → 403', async () => {
    const { ctrl, service } = make(null);
    await expect(ctrl.getPaidUntil('s2', req)).rejects.toThrow(ForbiddenException);
    expect(service.getPaidUntil).not.toHaveBeenCalled();
  });
});
