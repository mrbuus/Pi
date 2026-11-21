import { Prisma } from '../generated/prisma/client';
import { AuditService } from './audit.service';

describe('AuditService: Date, Decimal-ийг JSON болгоно', () => {
  it('Decimal оноо, огноо, нууц үг', async () => {
    const create = jest.fn(async () => ({}));
    const audit = new AuditService({ auditLog: { create } } as never);
    const at = new Date('2026-11-21T12:00:00Z');
    await audit.record({
      actorId: 'u', actorRole: 'TEACHER_PLUS', action: 'UPDATE', entity: 'HomeworkQuizScore', entityId: 'x',
      before: { score: new Prisma.Decimal('37'), updatedAt: at, nested: { at }, phone: '99112233' },
      after: { score: new Prisma.Decimal('38.5') },
    });
    const data = (create.mock.calls[0] as unknown as [{ data: Record<string, unknown> }])[0].data;
    expect(data.before).toEqual({
      score: '37', updatedAt: '2026-11-21T12:00:00.000Z', nested: { at: '2026-11-21T12:00:00.000Z' }, phone: '[REDACTED]',
    });
    expect(data.after).toEqual({ score: '38.5' });
    expect(JSON.parse(JSON.stringify(data.before))).toEqual(data.before);
  });
});
