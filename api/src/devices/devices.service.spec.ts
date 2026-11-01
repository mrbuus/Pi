import { NotFoundException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { RegisterDeviceDto } from './devices.dto';
import { DevicesService } from './devices.service';
import { FcmPushSender, readFcmConfig, type PushSender } from './push-sender';

function makeDb() {
  return {
    deviceToken: {
      upsert: jest.fn().mockResolvedValue({ id: 'd1', platform: 'ios', lastSeenAt: new Date() }),
      findMany: jest.fn().mockResolvedValue([]),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
  };
}

function sender(enabled: boolean, invalid: string[] = []): PushSender & { send: jest.Mock } {
  return {
    isEnabled: () => enabled,
    send: jest.fn().mockResolvedValue({ sent: 1, invalidTokens: invalid, skipped: false }),
  };
}

describe('DevicesService', () => {
  it('токеныг upsert хийж, өөр хэрэглэгчийнх байсан бол энэ хэрэглэгч рүү шилжүүлнэ', async () => {
    const db = makeDb();
    const svc = new DevicesService(db as never, sender(false));
    const res = await svc.register('u1', { token: ' tok ', platform: 'android', appVersion: '1.0.0' });
    const arg = db.deviceToken.upsert.mock.calls[0][0];
    expect(arg.where).toEqual({ token: 'tok' });
    expect(arg.update).toMatchObject({ userId: 'u1', platform: 'android', revokedAt: null });
    expect(res).toMatchObject({ registered: true, pushEnabled: false });
  });

  it('11 дэх идэвхтэй токен хамгийн хуучныг revokedAt болгоно (устгахгүй)', async () => {
    const db = makeDb();
    db.deviceToken.findMany.mockResolvedValue(
      Array.from({ length: 11 }, (_, i) => ({ id: `d${i}` })),
    );
    await new DevicesService(db as never, sender(false)).register('u1', {
      token: 't',
      platform: 'ios',
    });
    expect(db.deviceToken.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ['d10'] } },
      data: { revokedAt: expect.any(Date) },
    });
    expect(db.deviceToken.delete).not.toHaveBeenCalled();
    expect(db.deviceToken.deleteMany).not.toHaveBeenCalled();
  });

  it('DELETE зөвхөн өөрийн токеныг идэвхгүй болгоно, бусдынхад 404', async () => {
    const db = makeDb();
    const svc = new DevicesService(db as never, sender(false));
    await svc.unregister('u1', 'tok');
    expect(db.deviceToken.updateMany.mock.calls[0][0].where).toEqual({
      token: 'tok',
      userId: 'u1',
      revokedAt: null,
    });
    db.deviceToken.updateMany.mockResolvedValue({ count: 0 });
    await expect(svc.unregister('u2', 'tok')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('Firebase тохируулаагүй бол sendToUsers ӨС-д ч хандахгүй (no-op)', async () => {
    const db = makeDb();
    const push = sender(false);
    const res = await new DevicesService(db as never, push).sendToUsers(['u1'], {
      title: 'a',
      body: 'b',
    });
    expect(res).toEqual({ sent: 0, skipped: true });
    expect(db.deviceToken.findMany).not.toHaveBeenCalled();
    expect(push.send).not.toHaveBeenCalled();
  });

  it('FCM хүчингүй гэсэн токеныг revokedAt болгоно', async () => {
    const db = makeDb();
    db.deviceToken.findMany.mockResolvedValue([{ token: 'good' }, { token: 'dead' }]);
    const push = sender(true, ['dead']);
    await new DevicesService(db as never, push).sendToUsers(['u1', 'u1'], { title: 'a', body: 'b' });
    expect(db.deviceToken.findMany.mock.calls[0][0].where).toEqual({
      userId: { in: ['u1'] },
      revokedAt: null,
    });
    expect(push.send).toHaveBeenCalledWith(['good', 'dead'], { title: 'a', body: 'b' });
    expect(db.deviceToken.updateMany).toHaveBeenCalledWith({
      where: { token: { in: ['dead'] } },
      data: { revokedAt: expect.any(Date) },
    });
  });

  it('DTO: платформ ios/android л', async () => {
    const ok = await validate(plainToInstance(RegisterDeviceDto, { token: 'x', platform: 'ios' }));
    expect(ok).toEqual([]);
    const bad = await validate(plainToInstance(RegisterDeviceDto, { token: 'x', platform: 'windows' }));
    expect(bad[0].constraints?.isIn).toContain('Платформ буруу');
  });
});

describe('FcmPushSender', () => {
  const saved = { ...process.env };
  afterEach(() => {
    process.env = { ...saved };
  });

  it('env дутуу бол идэвхгүй, send нь fetch хийхгүй', async () => {
    delete process.env.FCM_PROJECT_ID;
    delete process.env.FCM_CLIENT_EMAIL;
    delete process.env.FCM_PRIVATE_KEY;
    const fetchSpy = jest.spyOn(global, 'fetch');
    const s = new FcmPushSender();
    expect(s.isEnabled()).toBe(false);
    expect(await s.send(['t'], { title: 'a', body: 'b' })).toEqual({
      sent: 0,
      invalidTokens: [],
      skipped: true,
    });
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });

  it('readFcmConfig нь \\n-ийг мөр шилжилт болгоно', () => {
    expect(
      readFcmConfig({ FCM_PROJECT_ID: 'p', FCM_CLIENT_EMAIL: 'e', FCM_PRIVATE_KEY: 'a\\nb' }),
    ).toEqual({ projectId: 'p', clientEmail: 'e', privateKey: 'a\nb' });
    expect(readFcmConfig({ FCM_PROJECT_ID: 'p' })).toBeNull();
  });
});
