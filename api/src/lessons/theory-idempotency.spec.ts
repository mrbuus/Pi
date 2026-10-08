import { validate } from 'class-validator';
import { Prisma } from '../generated/prisma/client';
import { LessonsController } from './lessons.controller';
import { LessonsService } from './lessons.service';
import { CreateTheoryDto } from './dto/theory.dto';

const requestId = '00000000-0000-4000-8000-000000000001';
const dto = {
  title: 'Geometry',
  content: 'Triangle explanation',
  imageKeys: ['a.png'],
  clientRequestId: requestId,
};
function fixture() {
  const rows = new Map<string, any>();
  const prisma = {
    user: {
      findUnique: jest
        .fn()
        .mockResolvedValue({
          role: 'TEACHER_PLUS',
          archivedAt: null,
          externalTeacherProfile: null,
        }),
    },
    storedFile: {
      findMany: jest.fn(async ({ where }: any) =>
        where.key.in.map((key: string) => ({
          key,
          ownerId: 'teacher',
          mime: 'image/png',
          size: 1024,
        })),
      ),
    },
    chapter: { findUnique: jest.fn(async () => ({ id: 'chapter' })) },
    theoryBlock: {
      findUnique: jest.fn(
        async ({ where }: any) =>
          rows.get(JSON.stringify(where.createdById_clientRequestId)) ?? null,
      ),
      aggregate: jest.fn(async () => ({ _max: { order: 0 } })),
      create: jest.fn(async ({ data }: any) => {
        const key = JSON.stringify({
          createdById: data.createdById,
          clientRequestId: data.clientRequestId,
        });
        if (rows.has(key))
          throw new Prisma.PrismaClientKnownRequestError('duplicate', {
            code: 'P2002',
            clientVersion: 'test',
          });
        const row = { id: `block-${rows.size}`, ...data };
        rows.set(key, row);
        return row;
      }),
    },
  };
  return { prisma, rows, service: new LessonsService(prisma as any) };
}

describe('theory creation idempotency', () => {
  it('rejects foreign and ownerless new theory attachment keys', async () => {
    const { service, prisma } = fixture();
    prisma.storedFile.findMany.mockResolvedValue([
      { key: 'a.png', ownerId: 'other', mime: 'image/png', size: 100 },
    ] as any);
    await expect(
      service.createTheory('chapter', dto, 'teacher'),
    ).rejects.toThrow('өөрийн');
    prisma.storedFile.findMany.mockResolvedValue([
      { key: 'a.png', ownerId: null, mime: 'image/png', size: 100 },
    ] as any);
    await expect(
      service.createTheory('chapter', dto, 'teacher'),
    ).rejects.toThrow('өөрийн');
    expect(prisma.theoryBlock.create).not.toHaveBeenCalled();
  });
  it('rejects unsupported image MIME and oversized stored images', async () => {
    const { service, prisma } = fixture();
    prisma.storedFile.findMany.mockResolvedValue([
      { key: 'a.png', ownerId: 'teacher', mime: 'text/html', size: 100 },
    ] as any);
    await expect(
      service.createTheory('chapter', dto, 'teacher'),
    ).rejects.toThrow('зураг');
    prisma.storedFile.findMany.mockResolvedValue([
      {
        key: 'a.png',
        ownerId: 'teacher',
        mime: 'image/png',
        size: 26 * 1024 * 1024,
      },
    ] as any);
    await expect(
      service.createTheory('chapter', dto, 'teacher'),
    ).rejects.toThrow('зураг');
  });
  it('retains existing legacy theory keys but refuses new foreign keys on update', async () => {
    const { service, prisma } = fixture();
    prisma.theoryBlock.findUnique.mockResolvedValue({
      id: 'existing',
      imageKeys: ['legacy.png'],
    } as any);
    (prisma.theoryBlock as any).update = jest.fn(async ({ data }: any) => data);
    expect(
      await service.updateTheory(
        'existing',
        { imageKeys: ['legacy.png'], title: 'Updated' },
        'teacher',
      ),
    ).toMatchObject({ title: 'Updated' });
    expect(prisma.storedFile.findMany).not.toHaveBeenCalled();
    prisma.storedFile.findMany.mockResolvedValue([
      { key: 'foreign.png', ownerId: 'other', mime: 'image/png', size: 100 },
    ] as any);
    await expect(
      service.updateTheory(
        'existing',
        { imageKeys: ['legacy.png', 'foreign.png'] },
        'teacher',
      ),
    ).rejects.toThrow('өөрийн');
  });
  it('replays exact request without creating another block', async () => {
    const { service, prisma } = fixture();
    const first = await service.createTheory('chapter', dto, 'teacher');
    expect(await service.createTheory('chapter', dto, 'teacher')).toEqual(
      first,
    );
    expect(prisma.theoryBlock.create).toHaveBeenCalledTimes(1);
  });
  it.each([{ title: 'Changed' }, { content: 'Changed' }, { imageKeys: [] }])(
    'rejects changed payload reuse %j',
    async (change) => {
      const { service } = fixture();
      await service.createTheory('chapter', dto, 'teacher');
      await expect(
        service.createTheory('chapter', { ...dto, ...change }, 'teacher'),
      ).rejects.toThrow('өөр агуулга');
    },
  );
  it('rejects another chapter with same request', async () => {
    const { service } = fixture();
    await service.createTheory('chapter', dto, 'teacher');
    await expect(service.createTheory('other', dto, 'teacher')).rejects.toThrow(
      'өөр агуулга',
    );
  });
  it('scopes request identity to JWT actor', async () => {
    const { service, rows } = fixture();
    await service.createTheory('chapter', dto, 'teacher');
    await service.createTheory(
      'chapter',
      { ...dto, imageKeys: [] },
      'other-teacher',
    );
    expect(rows.size).toBe(2);
  });
  it('returns race winner for concurrent exact attempts', async () => {
    const { service, rows } = fixture();
    const result = await Promise.all([
      service.createTheory('chapter', dto, 'teacher'),
      service.createTheory('chapter', dto, 'teacher'),
    ]);
    expect(result[0]).toEqual(result[1]);
    expect(rows.size).toBe(1);
  });
  it('rejects changed payload when requests race', async () => {
    const { service, rows } = fixture();
    const result = await Promise.allSettled([
      service.createTheory('chapter', dto, 'teacher'),
      service.createTheory(
        'chapter',
        { ...dto, title: 'Another draft' },
        'teacher',
      ),
    ]);
    expect(result.map((item) => item.status).sort()).toEqual([
      'fulfilled',
      'rejected',
    ]);
    expect(rows.size).toBe(1);
  });
  it('uses JWT actor even if a caller injects an author into the body', () => {
    const service = { createTheory: jest.fn() };
    const controller = new LessonsController(service as any);
    const input = { ...dto, createdById: 'impersonated' };
    controller.createTheory('chapter', input, {
      user: { userId: 'jwt-teacher', role: 'TEACHER' },
    } as any);
    expect(service.createTheory).toHaveBeenCalledWith(
      'chapter',
      input,
      'jwt-teacher',
    );
  });
  it('validates UUID and forbids arbitrary retry IDs', async () => {
    const input = Object.assign(new CreateTheoryDto(), dto, {
      clientRequestId: 'arbitrary',
    });
    expect(
      (await validate(input)).some(
        (error) => error.property === 'clientRequestId',
      ),
    ).toBe(true);
  });
});
