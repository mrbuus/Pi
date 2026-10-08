import { ConflictException, NotFoundException } from '@nestjs/common';
import { LessonsService } from './lessons.service';
import { PrismaService } from '../prisma/prisma.service';

describe('theory archive history retention', () => {
  function fixture() {
    let row = {
      id: 't',
      chapterId: 'c',
      archivedAt: null as Date | null,
      title: 'original',
      content: 'original',
      imageKeys: ['old-key'],
    };
    const tx = {
      $executeRaw: jest.fn(),
      chapter: { findFirst: jest.fn().mockResolvedValue({ id: 'c' }) },
      theoryBlock: {
        findUnique: jest.fn(() => Promise.resolve(row)),
        update: jest.fn(({ data }: { data: { archivedAt: Date | null } }) =>
          Promise.resolve((row = { ...row, ...data })),
        ),
        delete: jest.fn(),
      },
      auditLog: { create: jest.fn() },
    };
    const db = {
      ...tx,
      user: {
        findUnique: jest
          .fn()
          .mockResolvedValue({ role: 'ADMIN', archivedAt: null }),
      },
      $transaction: jest.fn((callback: (t: typeof tx) => unknown) =>
        Promise.resolve(callback(tx)),
      ),
    };
    return {
      tx,
      db,
      service: new LessonsService(db as unknown as PrismaService),
      row: () => row,
    };
  }
  it('archives idempotently and restores same row/content/keys with atomic audits', async () => {
    const f = fixture();
    await f.service.removeTheory('t', 'admin');
    const date = f.row().archivedAt;
    await f.service.removeTheory('t', 'admin');
    expect(f.row().archivedAt).toBe(date);
    expect(f.tx.auditLog.create).toHaveBeenCalledTimes(1);
    expect(f.tx.theoryBlock.delete).not.toHaveBeenCalled();
    await f.service.restoreTheory('t', 'admin');
    expect(f.row()).toMatchObject({
      id: 't',
      title: 'original',
      content: 'original',
      imageKeys: ['old-key'],
      archivedAt: null,
    });
    expect(f.tx.auditLog.create).toHaveBeenCalledTimes(2);
  });
  it('rejects update and request-id replay of archived row', async () => {
    const f = fixture();
    await f.service.removeTheory('t', 'admin');
    await expect(
      f.service.updateTheory('t', {}, 'admin'),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(
      f.service.createTheory(
        'c',
        {
          title: 'original',
          content: 'original',
          imageKeys: ['old-key'],
          clientRequestId: '00000000-0000-4000-8000-000000000000',
        },
        'admin',
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });
  it('does not restore into deleted/archived chapter', async () => {
    const f = fixture();
    await f.service.removeTheory('t', 'admin');
    f.tx.chapter.findFirst.mockResolvedValue(null);
    await expect(f.service.restoreTheory('t', 'admin')).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(f.row().archivedAt).not.toBeNull();
  });
});
