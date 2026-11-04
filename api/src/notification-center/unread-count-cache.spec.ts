import { NotificationCenterService, unreadCountCache } from './notification-center.service';

describe('unread-count кэш (docs/BACKEND-PERF.md)', () => {
  const prisma = {
    user: { findMany: jest.fn() },
    notification: { createMany: jest.fn(), findFirst: jest.fn(), count: jest.fn(), updateMany: jest.fn() },
  };
  const email = { isConfigured: jest.fn().mockReturnValue(false), sendEmail: jest.fn() };
  let service: NotificationCenterService;

  beforeEach(() => {
    jest.clearAllMocks();
    unreadCountCache.clear();
    service = new NotificationCenterService(prisma as never, email as never);
  });

  it('60 секундын polling: давтан асуухад COUNT дахин явахгүй', async () => {
    prisma.notification.count.mockResolvedValue(3);
    expect(await service.unreadCount('u1')).toEqual({ count: 3 });
    expect(await service.unreadCount('u1')).toEqual({ count: 3 });
    expect(prisma.notification.count).toHaveBeenCalledTimes(1);
  });

  it('бүгдийг уншсан болгоход тэр хэрэглэгчийн тоо шууд шинэчлэгдэнэ', async () => {
    prisma.notification.count.mockResolvedValueOnce(3).mockResolvedValueOnce(0);
    prisma.notification.updateMany.mockResolvedValue({ count: 3 });
    await service.unreadCount('u1');
    await service.markAllRead('u1');
    expect(await service.unreadCount('u1')).toEqual({ count: 0 });
  });

  it('нэгийг уншихад шинэчлэгдэнэ', async () => {
    prisma.notification.count.mockResolvedValueOnce(2).mockResolvedValueOnce(1);
    prisma.notification.findFirst.mockResolvedValue({ id: 'n1', readAt: null });
    prisma.notification.updateMany.mockResolvedValue({ count: 1 });
    await service.unreadCount('u1');
    await service.markRead('u1', 'n1');
    expect(await service.unreadCount('u1')).toEqual({ count: 1 });
  });

  it('шинэ мэдэгдэл үүсэхэд хүлээн авагчийн тоо шинэчлэгдэнэ', async () => {
    prisma.notification.count.mockResolvedValueOnce(0).mockResolvedValueOnce(1);
    prisma.user.findMany.mockResolvedValue([{ id: 'u1', email: null, role: 'STUDENT' }]);
    prisma.notification.createMany.mockResolvedValue({ count: 1 });
    await service.unreadCount('u1');
    await service.notify(['u1'], { kind: 'HOMEWORK' as never, title: 'Шинэ' });
    expect(await service.unreadCount('u1')).toEqual({ count: 1 });
  });
});
