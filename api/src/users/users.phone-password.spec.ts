import * as bcrypt from 'bcryptjs';
import { ForbiddenException } from '@nestjs/common';
import { Role } from '../generated/prisma/enums';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from './users.service';
import { StaffCapabilityService } from '../staff-capabilities/staff-capability.service';

// Нууц үг = утас (эзний дүрэм, 2026-11-01): ажилтан утсыг солиход нууц үг нь
// хуучин дугаар хэвээр бол шинэ дугаар болно; өөрөө сольсон нууц үг хэвээр.
async function setup(target: {
  role?: Role;
  phone: string | null;
  email?: string | null;
  password: string;
}) {
  const passwordHash = await bcrypt.hash(target.password, 4);
  const update = jest.fn(({ data }: { data: Record<string, unknown> }) =>
    Promise.resolve({ id: 'u1', firstName: 'A', lastName: 'B', ...data }),
  );
  const findUnique = jest.fn(({ where }: { where: Record<string, unknown> }) =>
    Promise.resolve(
      where.id
        ? {
            id: 'u1',
            role: target.role ?? Role.STUDENT,
            firstName: 'A',
            lastName: 'B',
            phone: target.phone,
            email: target.email ?? null,
            passwordHash,
            studentProfile: null,
          }
        : null,
    ),
  );
  const prisma = {
    user: { findUnique },
    $transaction: (cb: (tx: unknown) => Promise<unknown>) =>
      cb({ user: { update } }),
  } as unknown as PrismaService;
  const record = jest.fn().mockResolvedValue(undefined);
  const service = new UsersService(
    prisma,
    { record } as unknown as AuditService,
    {} as StaffCapabilityService,
  );
  const run = (phone: string, actorRole: Role = Role.ADMIN) =>
    service.updateProfile('u1', { phone }, 'admin', actorRole);
  const savedHash = () =>
    (update.mock.calls[0][0] as { data: { passwordHash?: string } }).data
      .passwordHash;
  return { run, savedHash, update, record };
}

describe('updateProfile: утас солигдоход нууц үг дагана', () => {
  it('нууц үг хуучин дугаар бол шинэ дугаар болно', async () => {
    const t = await setup({ phone: '99111111', password: '99111111' });
    const res = await t.run('88222222');
    expect(res.passwordFollowedPhone).toBe(true);
    expect(await bcrypt.compare('88222222', t.savedHash()!)).toBe(true);
    expect(t.update.mock.calls[0][0]).not.toHaveProperty(
      'data.passwordChangedAt',
    );
  });

  it('хэрэглэгч өөрөө сольсон нууц үгийг хөндөхгүй', async () => {
    const t = await setup({ phone: '99111111', password: 'minii-nuuts' });
    const res = await t.run('88222222');
    expect(res.passwordFollowedPhone).toBe(false);
    expect(t.savedHash()).toBeUndefined();
  });

  it('утасгүй байсан бол имэйл нууц үгийг шинэ дугаар болгоно', async () => {
    const t = await setup({
      phone: null,
      email: 'a@b.mn',
      password: 'a@b.mn',
    });
    const res = await t.run('88222222');
    expect(res.passwordFollowedPhone).toBe(true);
  });

  it('ижил дугаар илгээвэл нууц үгийг хөндөхгүй', async () => {
    const t = await setup({ phone: '99111111', password: '99111111' });
    const res = await t.run('99111111');
    expect(res.passwordFollowedPhone).toBe(false);
    expect(t.savedHash()).toBeUndefined();
  });

  it('ажилтан/админы нууц үгийг утсаар солихгүй', async () => {
    for (const role of [Role.TEACHER_PLUS, Role.TEACHER]) {
      const t = await setup({ role, phone: '99111111', password: '99111111' });
      const res = await t.run('88222222');
      expect(res.passwordFollowedPhone).toBe(false);
      expect(t.savedHash()).toBeUndefined();
    }
  });

  it('хариунд passwordHash буцаахгүй', async () => {
    const t = await setup({ phone: '99111111', password: '99111111' });
    await t.run('88222222');
    const call = t.update.mock.calls[0][0] as { select?: object };
    expect(call.select).toBeDefined();
    expect(call.select).not.toHaveProperty('passwordHash');
  });
});

describe('updateProfile: хэн хэнийг засах вэ', () => {
  it('Багш+ сурагчийг засна', async () => {
    const t = await setup({ phone: '99111111', password: 'x' });
    await expect(t.run('88222222', Role.TEACHER_PLUS)).resolves.toBeDefined();
  });

  it('Багш+ эцэг эхийг засна', async () => {
    const t = await setup({
      role: Role.PARENT,
      phone: '99111111',
      password: 'x',
    });
    await expect(t.run('88222222', Role.TEACHER_PLUS)).resolves.toBeDefined();
  });

  it('Багш+ багш, Багш+, админыг засахгүй', async () => {
    for (const role of [Role.TEACHER, Role.TEACHER_PLUS, Role.ADMIN]) {
      const t = await setup({ role, phone: '99111111', password: 'x' });
      await expect(t.run('88222222', Role.TEACHER_PLUS)).rejects.toThrow(
        ForbiddenException,
      );
      expect(t.update).not.toHaveBeenCalled();
    }
  });

  it('Админ багш, Багш+-ийг засна', async () => {
    for (const role of [Role.TEACHER, Role.TEACHER_PLUS]) {
      const t = await setup({ role, phone: '99111111', password: 'x' });
      await expect(t.run('88222222')).resolves.toBeDefined();
    }
  });

  it('Админ өөр админыг засахгүй', async () => {
    const t = await setup({
      role: Role.ADMIN,
      phone: '99111111',
      password: 'x',
    });
    await expect(t.run('88222222')).rejects.toThrow(ForbiddenException);
  });
});
