process.env.JWT_SECRET ??= 'test-secret';
import {
  HOMEWORK_KEEP_DAYS,
  expiresAtFor,
  parsePurpose,
  saveStoredFile,
  signTicket,
  verifyTicket,
} from './file-store';
import { FileRetentionService } from './file-retention.service';

describe('file-store — зориулалт ба хадгалах хугацаа', () => {
  const now = new Date('2026-10-22T08:00:00Z');
  it('гэрийн даалгавар 7 хоног, онол болон бусад нь байнга', () => {
    expect(HOMEWORK_KEEP_DAYS).toBe(7);
    expect(expiresAtFor('homework', now)?.toISOString()).toBe('2026-10-29T08:00:00.000Z');
    expect(expiresAtFor('theory', now)).toBeNull();
    expect(expiresAtFor('general', now)).toBeNull();
  });
  it('мэдэгдэхгүй зориулалт = general (хугацаагүй)', () => {
    expect(parsePurpose('homework')).toBe('homework');
    expect(parsePurpose('delete-me')).toBe('general');
    expect(parsePurpose(undefined)).toBe('general');
  });
});

describe('file-store — илгээх тасалбар', () => {
  const base = { key: 'a.pdf', ownerId: 'u1', mime: 'application/pdf', purpose: 'homework' as const };
  it('гарын үсэгтэй тасалбар баталгаажина', () => {
    const t = signTicket({ ...base, exp: Date.now() + 60_000 });
    expect(verifyTicket(t)).toMatchObject(base);
  });
  it('хугацаа дууссан, өөрчилсөн, хуурамч тасалбарыг татгалзана', () => {
    expect(verifyTicket(signTicket({ ...base, exp: Date.now() - 1 }))).toBeNull();
    const t = signTicket({ ...base, exp: Date.now() + 60_000 });
    const [payload, mac] = t.split('.');
    const forged = Buffer.from(
      JSON.stringify({ ...base, ownerId: 'attacker', exp: Date.now() + 60_000 }),
    ).toString('base64url');
    expect(verifyTicket(`${forged}.${mac}`)).toBeNull();
    expect(verifyTicket(`${payload}.xxxx`)).toBeNull();
    expect(verifyTicket('garbage')).toBeNull();
  });
});

describe('saveStoredFile — S3 тохируулаагүй үед өгөгдлийн санд', () => {
  it('PDF-ийн хуудсыг тоолж, даалгаврын хугацааг тавина', async () => {
    const create = jest.fn(async (a: unknown) => a);
    const pdf = Buffer.from('%PDF-1.7\n1 0 obj << /Type /Pages /Count 3 /Kids [] >> endobj\n');
    await saveStoredFile({ storedFile: { create } } as never, {
      key: 'k.pdf',
      mime: 'application/pdf',
      bytes: pdf,
      ownerId: 'u1',
      purpose: 'homework',
    });
    const data = (create.mock.calls[0][0] as { data: Record<string, unknown> }).data;
    expect(data).toMatchObject({ key: 'k.pdf', storage: 'db', pages: 3, ownerId: 'u1' });
    expect(data.expiresAt).toBeInstanceOf(Date);
  });
});

describe('FileRetentionService', () => {
  it('хугацаа дууссан файлыг багцаар устгана', async () => {
    const batches = [[{ key: 'a.pdf' }, { key: 'b.jpg' }], []];
    const prisma = {
      storedFile: {
        findMany: jest.fn(async () => batches.shift() ?? []),
        findUnique: jest.fn(async () => ({ storage: 'db' })),
        deleteMany: jest.fn(async () => ({ count: 1 })),
        update: jest.fn(),
      },
    };
    const removed = await new FileRetentionService(prisma as never).purgeExpired(new Date());
    expect(removed).toBe(2);
    expect(prisma.storedFile.deleteMany).toHaveBeenCalledWith({ where: { key: 'a.pdf' } });
    expect(prisma.storedFile.findMany.mock.calls[0]).toEqual([
      expect.objectContaining({ where: { expiresAt: { lte: expect.any(Date) } } }),
    ]);
  });
});
