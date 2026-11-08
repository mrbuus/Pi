import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { WorkSheetService } from './work-sheet.service';
import { PAY_RATE_OWNER_ID } from './pay-rate-owner';

/* Эрхийн шалгалт — Prisma-г хуурамчаар (DB-гүй). */

const BAASANJAV = PAY_RATE_OWNER_ID;
const ADMIN = 'admin-1';
const EDITOR = 'editor-1'; // teacher-hours.edit эрхтэй Багш+
const TEACHER = 'teacher-1';
const OTHER = 'teacher-2';

function makeService(opts: { editors?: string[] } = {}) {
  const editors = new Set([ADMIN, BAASANJAV, EDITOR, ...(opts.editors ?? [])]);
  const audits: any[] = [];
  const accounts = new Map<string, any>();
  const rates: any[] = [];
  const hours = new Map<string, any>();
  const tx: any = {
    $executeRaw: jest.fn().mockResolvedValue(1),
    auditLog: { create: jest.fn(async ({ data }) => audits.push(data)) },
    teacherBankAccount: {
      findUnique: jest.fn(async ({ where }) => accounts.get(where.teacherId) ?? null),
      upsert: jest.fn(async ({ where, create, update }) => {
        const row = { ...(accounts.get(where.teacherId) ?? create), ...update };
        accounts.set(where.teacherId, row);
        return row;
      }),
    },
    teacherWorkHours: {
      findUnique: jest.fn(async ({ where }) => hours.get(`${where.teacherId_date.teacherId}|${where.teacherId_date.date.toISOString()}`) ?? null),
      upsert: jest.fn(async ({ where, create, update }) => {
        const k = `${where.teacherId_date.teacherId}|${where.teacherId_date.date.toISOString()}`;
        const row = { id: `h-${k}`, ...(hours.get(k) ?? create), ...update };
        hours.set(k, row);
        return row;
      }),
    },
    teacherPayRate: {
      findFirst: jest.fn(async ({ where }) =>
        rates.find((r) => r.teacherId === where.teacherId && +r.effectiveFrom === +where.effectiveFrom && !r.deletedAt) ?? null,
      ),
      updateMany: jest.fn(async ({ where, data }) => {
        for (const r of rates) if (r.teacherId === where.teacherId && +r.effectiveFrom === +where.effectiveFrom && !r.deletedAt) Object.assign(r, data);
      }),
      create: jest.fn(async ({ data }) => {
        const row = { id: `r${rates.length}`, deletedAt: null, ...data };
        rates.push(row);
        return row;
      }),
    },
  };
  const prisma: any = {
    ...tx,
    $transaction: jest.fn(async (fn: (t: any) => unknown) => fn(tx)),
    user: {
      findUnique: jest.fn(async ({ where }) =>
        [ADMIN, BAASANJAV, EDITOR, TEACHER, OTHER].includes(where.id)
          ? { id: where.id, firstName: 'Нэр', lastName: 'Овог', role: where.id === ADMIN ? 'ADMIN' : 'TEACHER', archivedAt: null }
          : null,
      ),
    },
  };
  const capabilities: any = { has: jest.fn(async (id: string) => editors.has(id)) };
  return { service: new WorkSheetService(prisma, capabilities), audits, accounts, rates, hours };
}

const ACCOUNT = { bankName: 'Хаан банк', accountNumber: '5012 3456 78', holderName: 'Овог Нэр' };

describe('Данс засах эрх', () => {
  it('багш өөрийн дансыг засна', async () => {
    const { service, accounts } = makeService();
    await expect(service.setAccount({ userId: TEACHER, role: 'TEACHER' }, TEACHER, ACCOUNT)).resolves.toEqual({ changed: true });
    expect(accounts.get(TEACHER).accountNumber).toBe('5012345678');
  });

  it('багш бусдын дансыг засахгүй', async () => {
    const { service } = makeService();
    await expect(service.setAccount({ userId: TEACHER, role: 'TEACHER' }, OTHER, ACCOUNT)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('цаг бөглөх эрхтэй хүн, админ бусдын дансыг засна', async () => {
    const { service } = makeService();
    await expect(service.setAccount({ userId: EDITOR, role: 'TEACHER_PLUS' }, OTHER, ACCOUNT)).resolves.toEqual({ changed: true });
    await expect(service.setAccount({ userId: ADMIN, role: 'ADMIN' }, TEACHER, ACCOUNT)).resolves.toEqual({ changed: true });
  });

  it('аудитад дансны дугаар нууцлагдана', async () => {
    const { service, audits } = makeService();
    await service.setAccount({ userId: TEACHER, role: 'TEACHER' }, TEACHER, ACCOUNT);
    await service.setAccount({ userId: TEACHER, role: 'TEACHER' }, TEACHER, { ...ACCOUNT, accountNumber: '5099 8877 66' });
    const text = JSON.stringify(audits);
    expect(text).not.toContain('5012345678');
    expect(text).not.toContain('5099887766');
    expect(audits[1].before.accountNumber).toBe('****5678');
    expect(audits[1].after.accountNumber).toBe('****7766');
  });

  it('өөрчлөлтгүй бол аудит бичихгүй', async () => {
    const { service, audits } = makeService();
    await service.setAccount({ userId: TEACHER, role: 'TEACHER' }, TEACHER, ACCOUNT);
    await expect(service.setAccount({ userId: TEACHER, role: 'TEACHER' }, TEACHER, ACCOUNT)).resolves.toEqual({ changed: false });
    expect(audits).toHaveLength(1);
  });

  it('буруу дугаар — 400', async () => {
    const { service } = makeService();
    await expect(
      service.setAccount({ userId: TEACHER, role: 'TEACHER' }, TEACHER, { ...ACCOUNT, accountNumber: '12' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('уншихад засах эрхийг зөв заана', async () => {
    const { service } = makeService();
    expect((await service.getAccount({ userId: TEACHER, role: 'TEACHER' }, TEACHER)).canEdit).toBe(true);
    expect((await service.getAccount({ userId: TEACHER, role: 'TEACHER' }, OTHER)).canEdit).toBe(false);
    expect((await service.getAccount({ userId: EDITOR, role: 'TEACHER_PLUS' }, OTHER)).canEdit).toBe(true);
  });
});

describe('Нүд бөглөх', () => {
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ulaanbaatar' }).format(new Date());

  it('эрхгүй багш бөглөхгүй', async () => {
    const { service } = makeService();
    await expect(
      service.setCell({ userId: TEACHER, role: 'TEACHER' }, { teacherId: TEACHER, date: today, value: '5' }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('таслалтай утгыг хадгалж, аудитад өмнөх/дараахыг бичнэ', async () => {
    const { service, audits } = makeService();
    const actor = { userId: EDITOR, role: 'TEACHER_PLUS' };
    await expect(service.setCell(actor, { teacherId: OTHER, date: today, value: '7,5' })).resolves.toMatchObject({
      hundredths: 750,
      changed: true,
    });
    await service.setCell(actor, { teacherId: OTHER, date: today, value: '' });
    expect(audits.map((a) => [a.before.hours, a.after.hours])).toEqual([
      [null, '7.5'],
      ['7.5', null],
    ]);
    // Ижил утга дахин — бичихгүй
    await expect(service.setCell(actor, { teacherId: OTHER, date: today, value: null })).resolves.toMatchObject({ changed: false });
    expect(audits).toHaveLength(2);
  });

  it.each(['25', '7.555', 'abc'])('буруу утга «%s» — 400', async (value) => {
    const { service } = makeService();
    await expect(
      service.setCell({ userId: EDITOR, role: 'TEACHER_PLUS' }, { teacherId: OTHER, date: today, value }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('ирээдүйн үеийн өдөр, байхгүй огноо — 400', async () => {
    const { service } = makeService();
    const actor = { userId: EDITOR, role: 'TEACHER_PLUS' };
    await expect(service.setCell(actor, { teacherId: OTHER, date: '2099-01-01', value: '5' })).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.setCell(actor, { teacherId: OTHER, date: '2026-02-30', value: '5' })).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe('Цагийн хөлс — зөвхөн Баасанжав', () => {
  it.each([
    [ADMIN, 'ADMIN'],
    [EDITOR, 'TEACHER_PLUS'],
    [TEACHER, 'TEACHER'],
  ])('%s (%s) хөлс харахгүй, тавихгүй', async (userId, role) => {
    const { service } = makeService();
    await expect(service.pay({ userId, role }, '2026-11-1')).rejects.toBeInstanceOf(ForbiddenException);
    await expect(
      service.setRate({ userId, role }, { teacherId: OTHER, period: '2026-11-1', ratePerHour: 20000 }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('Баасанжав тавина; хуучин мөр устахгүй, аудитад утга орохгүй', async () => {
    const { service, rates, audits } = makeService();
    const actor = { userId: BAASANJAV, role: 'TEACHER_PLUS' };
    await service.setRate(actor, { teacherId: OTHER, period: '2026-11-1', ratePerHour: 20000 });
    await service.setRate(actor, { teacherId: OTHER, period: '2026-11-1', ratePerHour: 25000 });
    expect(rates).toHaveLength(2);
    expect(rates[0].deletedAt).toBeInstanceOf(Date);
    expect(rates[1]).toMatchObject({ ratePerHour: 25000, deletedAt: null });
    const text = JSON.stringify(audits);
    expect(text).not.toContain('20000');
    expect(text).not.toContain('25000');
    // ижил утга — өөрчлөлтгүй
    await expect(service.setRate(actor, { teacherId: OTHER, period: '2026-11-1', ratePerHour: 25000 })).resolves.toEqual({ changed: false });
  });

  it('буруу хөлс — 400', async () => {
    const { service } = makeService();
    await expect(
      service.setRate({ userId: BAASANJAV, role: 'TEACHER_PLUS' }, { teacherId: OTHER, period: '2026-11-1', ratePerHour: 1.5 }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
