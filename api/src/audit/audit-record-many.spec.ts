import { AuditService } from './audit.service';

describe('AuditService.recordMany', () => {
  const input = (id: string) => ({
    actorId: 't1',
    actorRole: 'TEACHER' as never,
    action: 'CREATE' as const,
    entity: 'Attendance',
    entityId: id,
    before: null,
    after: { id, status: 'PRESENT' },
  });

  it('олон бичлэгийг НЭГ createMany-аар бичнэ (pool-ыг эзлэхгүй)', async () => {
    const prisma = { auditLog: { createMany: jest.fn().mockResolvedValue({ count: 2 }), create: jest.fn() } };
    await new AuditService(prisma as never).recordMany([input('a'), input('b')]);
    expect(prisma.auditLog.create).not.toHaveBeenCalled();
    expect(prisma.auditLog.createMany).toHaveBeenCalledTimes(1);
    const data = prisma.auditLog.createMany.mock.calls[0][0].data;
    expect(data.map((d: { entityId: string }) => d.entityId)).toEqual(['a', 'b']);
  });

  it('хоосон бол query явуулахгүй, алдааг дуудагч руу шидэхгүй', async () => {
    const prisma = { auditLog: { createMany: jest.fn().mockRejectedValue(new Error('db down')) } };
    const svc = new AuditService(prisma as never);
    await svc.recordMany([]);
    expect(prisma.auditLog.createMany).not.toHaveBeenCalled();
    await expect(svc.recordMany([input('a')])).resolves.toBeUndefined();
  });
});
