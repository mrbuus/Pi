import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { FeedbackService } from './feedback.service';
import { CreateFeedbackDto } from './feedback.dto';
import { Role } from '../generated/prisma/enums';
const input = {
  clientRequestId: '8fc5b2a1-2bb0-4cce-a68b-8bd2ef603517',
  kind: 'BUG',
  subject: 'Upload issue',
  body: 'The image upload failed.',
  contextPath: '/app/learn',
  attachmentKeys: [],
};
const existing = {
  id: 'ticket',
  authorId: 'owner',
  ...input,
  state: 'OPEN',
  response: null,
};
function setup() {
  const db: any = {
    feedback: {
      findUnique: jest.fn().mockResolvedValue(null),
      findMany: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockResolvedValue(existing),
      update: jest
        .fn()
        .mockResolvedValue({
          ...existing,
          state: 'RESOLVED',
          response: 'Fixed',
        }),
    },
    storedFile: { findMany: jest.fn().mockResolvedValue([]) },
  };
  return { db, service: new FeedbackService(db) };
}
describe('Feedback ownership and idempotency', () => {
  it.each(Object.values(Role))(
    'allows %s to create and list only their own tickets',
    async () => {
      const { db, service } = setup();
      await service.create('owner', input);
      await service.list('owner');
      expect(db.feedback.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ authorId: 'owner' }),
      });
      expect(db.feedback.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { authorId: 'owner' }, take: 51 }),
      );
    },
  );
  it.each(Object.values(Role).filter((role) => role !== Role.ADMIN))(
    'forbids %s from reading, listing all or triaging another ticket',
    async (role) => {
      const { db, service } = setup();
      db.feedback.findUnique.mockResolvedValue(existing);
      await expect(service.detail('ticket', 'other', role)).rejects.toThrow(
        'харах эрхгүй',
      );
      await expect(service.listAll(role)).rejects.toThrow('харах эрхгүй');
      await expect(
        service.triage('ticket', 'other', role, { state: 'RESOLVED' }),
      ).rejects.toThrow('шийдвэрлэх эрхгүй');
      expect(db.feedback.update).not.toHaveBeenCalled();
    },
  );
  it('allows owner read and administrator visible reply', async () => {
    const { db, service } = setup();
    db.feedback.findUnique.mockResolvedValue(existing);
    expect(await service.detail('ticket', 'owner', Role.STUDENT)).toEqual(
      existing,
    );
    await service.detail('ticket', 'admin', Role.ADMIN);
    await service.triage('ticket', 'admin', Role.ADMIN, {
      state: 'RESOLVED',
      response: 'Fixed',
    });
    expect(db.feedback.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { state: 'RESOLVED', response: 'Fixed', respondedById: 'admin' },
      }),
    );
  });
  it('replays a successful request without creating another ticket', async () => {
    const { db, service } = setup();
    db.feedback.findUnique.mockResolvedValue(existing);
    expect(await service.create('owner', input)).toEqual(existing);
    expect(db.feedback.create).not.toHaveBeenCalled();
  });
  it('handles a concurrent unique-key winner as the same ticket', async () => {
    const { db, service } = setup();
    db.feedback.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(existing);
    db.feedback.create.mockRejectedValue({ code: 'P2002' });
    expect(await service.create('owner', input)).toEqual(existing);
    expect(db.feedback.findUnique).toHaveBeenLastCalledWith({
      where: {
        authorId_clientRequestId: {
          authorId: 'owner',
          clientRequestId: input.clientRequestId,
        },
      },
    });
  });
  it('rejects changing payload under an already used request id', async () => {
    const { db, service } = setup();
    db.feedback.findUnique.mockResolvedValue(existing);
    await expect(
      service.create('owner', { ...input, body: 'A different explanation.' }),
    ).rejects.toThrow('өөр мэдээлэл');
  });
  it('rejects foreign screenshots and non-image proof/document uploads', async () => {
    const { db, service } = setup();
    await expect(
      service.create('owner', { ...input, attachmentKeys: ['foreign.png'] }),
    ).rejects.toThrow('өөрийн');
    db.storedFile.findMany.mockResolvedValue([
      { key: 'owned.pdf', mime: 'application/pdf' },
    ]);
    await expect(
      service.create('owner', { ...input, attachmentKeys: ['owned.pdf'] }),
    ).rejects.toThrow('өөрийн');
    expect(db.feedback.create).not.toHaveBeenCalled();
  });
  it('accepts verified own screenshot keys without fetching attachment bytes', async () => {
    const { db, service } = setup();
    db.storedFile.findMany.mockResolvedValue([
      { key: 'own.png', mime: 'image/png' },
    ]);
    await service.create('owner', { ...input, attachmentKeys: ['own.png'] });
    expect(db.storedFile.findMany).toHaveBeenCalledWith({
      where: { key: { in: ['own.png'] }, ownerId: 'owner' },
      select: { key: true, mime: true },
    });
  });
});
describe('Feedback validation', () => {
  it('trims valid text', async () => {
    const dto = plainToInstance(CreateFeedbackDto, {
      ...input,
      subject: '  Valid subject  ',
      body: '  A useful problem report.  ',
    });
    expect(await validate(dto)).toHaveLength(0);
    expect(dto.subject).toBe('Valid subject');
  });
  it.each([
    'https://example.com',
    '//evil.example',
    '/app/../finance',
    '/app/profile?token=secret',
    '/app/profile#secret',
  ])('rejects URL/query/path context %s', async (contextPath) => {
    const dto = plainToInstance(CreateFeedbackDto, { ...input, contextPath });
    expect(
      (await validate(dto)).some((error) => error.property === 'contextPath'),
    ).toBe(true);
  });
  it('rejects empty/oversized/invalid tickets and too many screenshots', async () => {
    const dto = plainToInstance(CreateFeedbackDto, {
      clientRequestId: 'x',
      kind: 'FINANCE',
      subject: ' ',
      body: 'x'.repeat(10001),
      attachmentKeys: ['a', 'b', 'c', 'd'],
    });
    expect((await validate(dto)).map((error) => error.property)).toEqual(
      expect.arrayContaining([
        'clientRequestId',
        'kind',
        'subject',
        'body',
        'attachmentKeys',
      ]),
    );
  });
});
