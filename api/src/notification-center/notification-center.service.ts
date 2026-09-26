import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { EmailService } from '../notifications/email.service';
import { PrismaService } from '../prisma/prisma.service';

export interface NewNotification {
  kind: string;
  title: string;
  body?: string | null;
  link?: string | null;
}

@Injectable()
export class NotificationCenterService {
  private readonly logger = new Logger(NotificationCenterService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
  ) {}

  /** Persist an in-app copy first; optional email failures never block the caller. */
  async notify(
    userIds: string[],
    notification: NewNotification,
  ): Promise<void> {
    const ids = [
      ...new Set(userIds.filter((id) => typeof id === 'string' && id)),
    ];
    if (ids.length === 0) return;

    try {
      const recipients = await this.prisma.user.findMany({
        where: { id: { in: ids } },
        select: { id: true, email: true },
      });
      if (recipients.length === 0) return;

      await this.prisma.notification.createMany({
        data: recipients.map(({ id }) => ({
          userId: id,
          kind: notification.kind,
          title: notification.title,
          body: notification.body ?? null,
          link: notification.link ?? null,
        })),
      });

      if (!this.email.isConfigured()) return;
      const emailedRecipients = recipients.filter(
        (recipient): recipient is typeof recipient & { email: string } =>
          Boolean(recipient.email),
      );
      if (emailedRecipients.length === 0) return;

      // Do not hold assignment/announcement requests open for SMTP. All rejections
      // are observed so mail outages cannot produce an unhandled promise rejection.
      void Promise.allSettled(
        emailedRecipients.map(({ email }) =>
          this.email.sendEmail({
            to: email,
            subject: notification.title,
            text: [notification.title, notification.body, notification.link]
              .filter(Boolean)
              .join('\n\n'),
          }),
        ),
      ).then((results) => {
        if (results.some((result) => result.status === 'rejected')) {
          this.logger.warn('Зарим мэдэгдлийн имэйл хүргэгдсэнгүй.');
        }
      });
    } catch (error) {
      // The underlying business action succeeded; an inbox outage must not undo it.
      this.logger.error(
        `Мэдэгдэл хадгалж чадсангүй: ${error instanceof Error ? error.message : 'unknown error'}`,
      );
    }
  }

  async listMine(userId: string, cursor?: string, rawLimit?: string) {
    const limit = rawLimit === undefined ? 10 : Number(rawLimit);
    if (!Number.isInteger(limit) || limit < 1 || limit > 50) {
      throw new BadRequestException('Хуудасны хэмжээ 1–50 байх ёстой.');
    }

    if (cursor) {
      const ownedCursor = await this.prisma.notification.findFirst({
        where: { id: cursor, userId },
        select: { id: true },
      });
      if (!ownedCursor) throw new NotFoundException('Мэдэгдэл олдсонгүй.');
    }

    const notifications = await this.prisma.notification.findMany({
      where: { userId },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      take: limit,
      select: {
        id: true,
        kind: true,
        title: true,
        body: true,
        link: true,
        readAt: true,
        createdAt: true,
      },
    });

    return {
      notifications,
      nextCursor:
        notifications.length === limit
          ? notifications[notifications.length - 1].id
          : null,
    };
  }

  unreadCount(userId: string) {
    return this.prisma.notification
      .count({ where: { userId, readAt: null } })
      .then((count) => ({ count }));
  }

  async markRead(userId: string, id: string) {
    const notification = await this.prisma.notification.findFirst({
      where: { id, userId },
      select: { id: true, readAt: true },
    });
    if (!notification) throw new NotFoundException('Мэдэгдэл олдсонгүй.');

    if (!notification.readAt) {
      await this.prisma.notification.updateMany({
        where: { id, userId, readAt: null },
        data: { readAt: new Date() },
      });
    }
    return { read: true };
  }

  async markAllRead(userId: string) {
    const result = await this.prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
    return { updated: result.count };
  }
}
