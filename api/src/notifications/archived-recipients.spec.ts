import { SmsManagementService } from './sms-management.service';

function setup() {
  const db = {
    user: { findMany: jest.fn().mockResolvedValue([{ phone: '99110001' }]) },
    smsMessage: {
      count: jest.fn().mockResolvedValue(0),
      create: jest.fn().mockResolvedValue({ id: 'msg' }),
      findUnique: jest
        .fn()
        .mockResolvedValue({
          status: 'FAILED',
          toPhone: '+97699110001',
          body: 'Synthetic',
        }),
      findMany: jest
        .fn()
        .mockResolvedValue([{ id: 'old', toPhone: '+97699110001' }]),
      updateMany: jest.fn(),
    },
    smsBatch: {
      create: jest.fn().mockResolvedValue({ id: 'batch' }),
      findUnique: jest.fn().mockResolvedValue({ id: 'batch', status: 'DRAFT' }),
      update: jest.fn(),
    },
  };
  const sender = { sendAndLog: jest.fn() };
  return {
    db,
    sender,
    service: new SmsManagementService(db as never, sender as never),
  };
}

describe('archived SMS recipients (provider fully mocked)', () => {
  it('normalizes and excludes known archived phones, retaining manual external phones', async () => {
    const { service } = setup();
    expect(
      await service.estimateBulkSms({
        phones: ['99110001', '+97699110001', '99110002'],
        text: 'Test',
      }),
    ).toMatchObject({
      deduplicatedCount: 1,
      excludedArchivedCount: 1,
      estimatedSegments: 1,
    });
  });
  it('does not send or retry to an archived phone', async () => {
    const { sender, service } = setup();
    await expect(
      service.sendSms({ phone: '99110001', text: 'Test' }, 'admin'),
    ).rejects.toThrow('Архивласан');
    await expect(service.retryMessage('msg', 'admin')).rejects.toThrow(
      'Архивласан',
    );
    expect(sender.sendAndLog).not.toHaveBeenCalled();
  });
  it('filters a mixed draft before writing message rows', async () => {
    const { db, service } = setup();
    const result = await service.createBulkSmsDraft(
      { phones: ['99110001', '99110002'], text: 'Test' },
      'admin',
    );
    expect(result.messageIds).toHaveLength(1);
    expect(db.smsMessage.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ toPhone: '+97699110002' }),
      }),
    );
  });
  it('rejects an all-archived draft without creating an empty batch', async () => {
    const { db, service } = setup();
    await expect(
      service.createBulkSmsDraft(
        { phones: ['99110001'], text: 'Test' },
        'admin',
      ),
    ).rejects.toThrow('Идэвхтэй');
    expect(db.smsBatch.create).not.toHaveBeenCalled();
  });
  it('rechecks after drafting and preserves excluded message history without starting sends', async () => {
    const { db, sender, service } = setup();
    await expect(service.startBulkSmsSending('batch')).rejects.toThrow(
      'Идэвхтэй',
    );
    expect(db.smsMessage.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { status: 'FAILED', error: 'Архивласан сурагч: илгээгээгүй' },
      }),
    );
    expect(db.smsBatch.update).not.toHaveBeenCalled();
    expect(sender.sendAndLog).not.toHaveBeenCalled();
  });
});
