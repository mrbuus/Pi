import { NotFoundException } from '@nestjs/common';
import { NotificationCenterService } from './notification-center.service';

describe('NotificationCenterService', () => {
  const prisma = {
    user: { findMany: jest.fn() },
    notification: {
      createMany: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      updateMany: jest.fn(),
    },
  };
  const email = { isConfigured: jest.fn(), sendEmail: jest.fn() };
  let service: NotificationCenterService;

  beforeEach(() => {
    jest.clearAllMocks();
    email.isConfigured.mockReturnValue(false);
    prisma.user.findMany.mockResolvedValue([]);
    prisma.notification.createMany.mockResolvedValue({ count: 0 });
    service = new NotificationCenterService(prisma as never, email as never);
  });

  it('creates one row per unique existing recipient and skips external email when disabled', async () => {
    prisma.user.findMany.mockResolvedValue([{ id: 'student-1', email: null }]);
    await service.notify(['student-1', 'student-1', 'missing'], {
      kind: 'ASSIGNMENT',
      title: 'Шинэ даалгавар',
      body: 'Дасгал 1',
      link: '/app/homework',
    });

    expect(prisma.user.findMany).toHaveBeenCalledWith({
      where: { id: { in: ['student-1', 'missing'] } },
      select: { id: true, email: true },
    });
    expect(prisma.notification.createMany).toHaveBeenCalledWith({
      data: [
        {
          userId: 'student-1',
          kind: 'ASSIGNMENT',
          title: 'Шинэ даалгавар',
          body: 'Дасгал 1',
          link: '/app/homework',
        },
      ],
    });
    expect(email.sendEmail).not.toHaveBeenCalled();
  });

  it('does not persist or email to an empty recipient set', async () => {
    await service.notify([], { kind: 'ANNOUNCEMENT', title: 'Зар' });
    expect(prisma.user.findMany).not.toHaveBeenCalled();
    expect(prisma.notification.createMany).not.toHaveBeenCalled();
  });

  it('sends configured email asynchronously and absorbs delivery failure', async () => {
    email.isConfigured.mockReturnValue(true);
    prisma.user.findMany.mockResolvedValue([
      { id: 's1', email: 'demo@example.test' },
    ]);
    email.sendEmail.mockRejectedValue(new Error('synthetic SMTP failure'));

    await expect(
      service.notify(['s1'], {
        kind: 'ANNOUNCEMENT',
        title: 'Зар',
        body: 'Мэдээлэл',
        link: '/app/notifications',
      }),
    ).resolves.toBeUndefined();
    expect(prisma.notification.createMany).toHaveBeenCalledTimes(1);
    expect(email.sendEmail).toHaveBeenCalledWith({
      to: 'demo@example.test',
      subject: 'Зар',
      text: 'Зар\n\nМэдээлэл\n\n/app/notifications',
    });
  });

  it('returns only recipient rows and an owned cursor', async () => {
    prisma.notification.findFirst.mockResolvedValue({ id: 'cursor-1' });
    prisma.notification.findMany.mockResolvedValue([{ id: 'next-1' }]);
    await service.listMine('student-1', 'cursor-1', '1');
    expect(prisma.notification.findFirst).toHaveBeenCalledWith({
      where: { id: 'cursor-1', userId: 'student-1' },
      select: { id: true },
    });
    expect(prisma.notification.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'student-1' },
        cursor: { id: 'cursor-1' },
        skip: 1,
        take: 1,
      }),
    );
  });

  it('rejects a cursor owned by another account', async () => {
    prisma.notification.findFirst.mockResolvedValue(null);
    await expect(
      service.listMine('student-1', 'other-user-cursor'),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.notification.findMany).not.toHaveBeenCalled();
  });

  it('rejects invalid page sizes', async () => {
    await expect(
      service.listMine('student-1', undefined, '0'),
    ).rejects.toThrow();
    await expect(
      service.listMine('student-1', undefined, '51'),
    ).rejects.toThrow();
    expect(prisma.notification.findMany).not.toHaveBeenCalled();
  });

  it('counts unread rows for the current user only', async () => {
    prisma.notification.count.mockResolvedValue(4);
    await expect(service.unreadCount('student-1')).resolves.toEqual({
      count: 4,
    });
    expect(prisma.notification.count).toHaveBeenCalledWith({
      where: { userId: 'student-1', readAt: null },
    });
  });

  it('marks an owned row read, and hides another user row as not found', async () => {
    prisma.notification.findFirst.mockResolvedValueOnce({
      id: 'mine',
      readAt: null,
    });
    await expect(service.markRead('student-1', 'mine')).resolves.toEqual({
      read: true,
    });
    expect(prisma.notification.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'mine', userId: 'student-1', readAt: null },
      }),
    );

    prisma.notification.findFirst.mockResolvedValueOnce(null);
    await expect(
      service.markRead('student-1', 'other-user-row'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('marks all unread rows owned by the current user', async () => {
    prisma.notification.updateMany.mockResolvedValue({ count: 3 });
    await expect(service.markAllRead('student-1')).resolves.toEqual({
      updated: 3,
    });
    expect(prisma.notification.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'student-1', readAt: null },
      }),
    );
  });
});
