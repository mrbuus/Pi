import { NotificationCenterService } from './notification-center.service';
import { isQuietHoursUB } from './quiet-hours';

// UB = UTC+8: UTC 12:59 = UB 20:59, UTC 13:00 = UB 21:00, UTC 23:59 = UB 07:59, UTC 00:00 = UB 08:00
const at = (iso: string) => new Date(iso);

describe('isQuietHoursUB', () => {
  it.each([
    ['2026-11-02T12:59:00Z', false],
    ['2026-11-02T13:00:00Z', true],
    ['2026-11-02T18:00:00Z', true],
    ['2026-11-02T23:59:00Z', true],
    ['2026-11-03T00:00:00Z', false],
    ['2026-11-03T06:00:00Z', false],
  ])('%s -> %s', (iso, expected) => {
    expect(isQuietHoursUB(at(iso))).toBe(expected);
  });
});

describe('NotificationCenterService push hook', () => {
  const prisma = {
    user: { findMany: jest.fn() },
    notification: { createMany: jest.fn() },
  };
  const email = { isConfigured: jest.fn(() => false), sendEmail: jest.fn() };
  const devices = { sendToUsers: jest.fn() };
  let service: NotificationCenterService;
  const base = { kind: 'HOMEWORK' as const, title: 'Даалгавар шалгагдлаа', body: 'Нууц тэмдэглэл', link: '/app/student' };
  const flush = () => new Promise((r) => setImmediate(r));

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers({ now: at('2026-11-03T05:00:00Z'), doNotFake: ['setImmediate', 'nextTick'] }); // UB 13:00
    prisma.user.findMany.mockResolvedValue([
      { id: 's1', email: null, role: 'STUDENT' },
      { id: 'p1', email: null, role: 'PARENT' },
    ]);
    prisma.notification.createMany.mockResolvedValue({ count: 2 });
    devices.sendToUsers.mockResolvedValue({ sent: 1, skipped: false });
    service = new NotificationCenterService(prisma as never, email as never, devices as never);
  });
  afterEach(() => jest.useRealTimers());

  it('does not push unless the caller opts in', async () => {
    await service.notify(['s1'], base);
    await flush();
    expect(devices.sendToUsers).not.toHaveBeenCalled();
  });

  it('pushes with generic body and deep-link path, never the in-app body', async () => {
    await service.notify(['s1', 'p1'], { ...base, push: { body: 'Багш даалгаврыг дүгнэлээ' } });
    await flush();
    expect(devices.sendToUsers).toHaveBeenCalledWith(['s1', 'p1'], {
      title: 'Даалгавар шалгагдлаа',
      body: 'Багш даалгаврыг дүгнэлээ',
      data: { path: '/app/student', kind: 'HOMEWORK' },
    });
    const msg = devices.sendToUsers.mock.calls[0][1];
    expect(JSON.stringify(msg)).not.toContain('Нууц тэмдэглэл');
  });

  it('falls back to /app/notifications and a generic body', async () => {
    await service.notify(['p1'], { kind: 'SYSTEM', title: 'Т', push: {} });
    await flush();
    const msg = devices.sendToUsers.mock.calls[0][1];
    expect(msg.data.path).toBe('/app/notifications');
    expect(msg.body).toBeTruthy();
  });

  it('skips students during quiet hours but still creates the in-app row and pushes non-students', async () => {
    jest.setSystemTime(at('2026-11-03T15:00:00Z')); // UB 23:00
    await service.notify(['s1', 'p1'], { ...base, push: {} });
    await flush();
    expect(prisma.notification.createMany).toHaveBeenCalledTimes(1);
    expect(devices.sendToUsers.mock.calls[0][0]).toEqual(['p1']);
  });

  it('sends no push at all when only students are recipients at night', async () => {
    jest.setSystemTime(at('2026-11-03T20:00:00Z')); // UB 04:00
    prisma.user.findMany.mockResolvedValue([{ id: 's1', email: null, role: 'STUDENT' }]);
    await service.notify(['s1'], { ...base, push: {} });
    await flush();
    expect(prisma.notification.createMany).toHaveBeenCalledTimes(1);
    expect(devices.sendToUsers).not.toHaveBeenCalled();
  });

  it('push failure never rejects notify or blocks the request', async () => {
    devices.sendToUsers.mockRejectedValue(new Error('fcm down'));
    await expect(service.notify(['s1'], { ...base, push: {} })).resolves.toBeUndefined();
    await flush();
    expect(prisma.notification.createMany).toHaveBeenCalledTimes(1);
  });

  it('does not wait for a slow push', async () => {
    devices.sendToUsers.mockReturnValue(new Promise(() => undefined));
    await expect(service.notify(['s1'], { ...base, push: {} })).resolves.toBeUndefined();
  });

  it('works without DevicesService (push disabled)', async () => {
    const noDevices = new NotificationCenterService(prisma as never, email as never);
    await expect(noDevices.notify(['s1'], { ...base, push: {} })).resolves.toBeUndefined();
  });
});
