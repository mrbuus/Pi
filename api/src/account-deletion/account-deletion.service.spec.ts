import { NotFoundException } from '@nestjs/common';
import { AccountDeletionService } from './account-deletion.service';

function makeDb() {
  return {
    accountDeletionRequest: {
      findFirst: jest.fn().mockResolvedValue(null),
      findUnique: jest.fn().mockResolvedValue({ id: 'r1' }),
      findMany: jest.fn().mockResolvedValue([]),
      create: jest.fn().mockResolvedValue({ id: 'r1', status: 'PENDING' }),
      update: jest.fn().mockResolvedValue({ id: 'r1', status: 'RESOLVED' }),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
    // Прод өгөгдлийн дүрэм: эдгээр хэзээ ч дуудагдах ёсгүй
    user: { update: jest.fn(), delete: jest.fn(), deleteMany: jest.fn(), updateMany: jest.fn() },
  };
}

function expectNoUserMutation(db: ReturnType<typeof makeDb>) {
  expect(db.user.update).not.toHaveBeenCalled();
  expect(db.user.delete).not.toHaveBeenCalled();
  expect(db.user.deleteMany).not.toHaveBeenCalled();
  expect(db.user.updateMany).not.toHaveBeenCalled();
  expect(db.accountDeletionRequest.delete).not.toHaveBeenCalled();
  expect(db.accountDeletionRequest.deleteMany).not.toHaveBeenCalled();
}

describe('AccountDeletionService — зөвхөн хүсэлт, өгөгдөл устгахгүй', () => {
  it('шинэ хүсэлт PENDING мөр үүсгэнэ, хэрэглэгчид хүрэхгүй', async () => {
    const db = makeDb();
    const res = await new AccountDeletionService(db as never).request('u1', '  Апп хэрэглэхээ больсон ');
    expect(res.created).toBe(true);
    expect(db.accountDeletionRequest.create.mock.calls[0][0].data).toEqual({
      userId: 'u1',
      reason: 'Апп хэрэглэхээ больсон',
    });
    expectNoUserMutation(db);
  });

  it('нээлттэй хүсэлт байвал давхар үүсгэхгүй (идэмпотент)', async () => {
    const db = makeDb();
    db.accountDeletionRequest.findFirst.mockResolvedValue({ id: 'r0', status: 'PENDING' });
    const res = await new AccountDeletionService(db as never).request('u1');
    expect(res).toEqual({ created: false, request: { id: 'r0', status: 'PENDING' } });
    expect(db.accountDeletionRequest.create).not.toHaveBeenCalled();
    expect(db.accountDeletionRequest.findFirst.mock.calls[0][0].where).toEqual({
      userId: 'u1',
      status: { in: ['PENDING', 'IN_REVIEW'] },
    });
  });

  it('админы шийдвэр зөвхөн хүсэлтийн мөрийг шинэчилнэ', async () => {
    const db = makeDb();
    await new AccountDeletionService(db as never).review('r1', 'admin', 'RESOLVED', 'Гараар шийдсэн');
    expect(db.accountDeletionRequest.update.mock.calls[0][0]).toMatchObject({
      where: { id: 'r1' },
      data: { status: 'RESOLVED', reviewNote: 'Гараар шийдсэн', reviewedById: 'admin' },
    });
    expectNoUserMutation(db);
  });

  it('байхгүй хүсэлтэд 404', async () => {
    const db = makeDb();
    db.accountDeletionRequest.findUnique.mockResolvedValue(null);
    await expect(
      new AccountDeletionService(db as never).review('x', 'admin', 'REJECTED'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('жагсаалт анхдагчаар нээлттэй хүсэлтүүд', async () => {
    const db = makeDb();
    await new AccountDeletionService(db as never).list();
    expect(db.accountDeletionRequest.findMany.mock.calls[0][0].where).toEqual({
      status: { in: ['PENDING', 'IN_REVIEW'] },
    });
    await new AccountDeletionService(db as never).list('RESOLVED');
    expect(db.accountDeletionRequest.findMany.mock.calls[1][0].where).toEqual({ status: 'RESOLVED' });
  });
});
