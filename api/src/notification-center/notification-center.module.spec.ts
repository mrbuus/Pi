import { Test } from '@nestjs/testing';
import { AnnouncementsModule } from '../announcements/announcements.module';
import { AnnouncementsService } from '../announcements/announcements.service';
import { AssignmentsModule } from '../assignments/assignments.module';
import { AssignmentsService } from '../assignments/assignments.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { PrismaModule } from '../prisma/prisma.module';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationCenterController } from './notification-center.controller';
import { NotificationCenterModule } from './notification-center.module';
import { NotificationCenterService } from './notification-center.service';

describe('NotificationCenter module wiring', () => {
  it('resolves its controller and assignment/announcement trigger dependencies', async () => {
    const prisma = {
      user: {},
      notification: {},
      enrollment: {},
      announcement: {},
      studentProfile: {},
      parentLink: {},
      assignment: {},
      submission: {},
      dailyHomeworkMark: {},
    };
    const moduleRef = await Test.createTestingModule({
      imports: [
        PrismaModule,
        NotificationsModule,
        NotificationCenterModule,
        AssignmentsModule,
        AnnouncementsModule,
      ],
    })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .compile();

    expect(moduleRef.get(NotificationCenterController)).toBeDefined();
    expect(moduleRef.get(NotificationCenterService)).toBeDefined();
    expect(moduleRef.get(AssignmentsService)).toBeDefined();
    expect(moduleRef.get(AnnouncementsService)).toBeDefined();
    await moduleRef.close();
  });
});
