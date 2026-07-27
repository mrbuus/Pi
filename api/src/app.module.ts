import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { ActivityModule } from './activity/activity.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { AnnouncementsModule } from './announcements/announcements.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AssignmentsModule } from './assignments/assignments.module';
import { AuditModule } from './audit/audit.module';
import { ClassSessionsModule } from './class-sessions/class-sessions.module';
import { ClassificationModule } from './classification/classification.module';
import { AttemptsModule } from './attempts/attempts.module';
import { AttendanceModule } from './attendance/attendance.module';
import { AuthModule } from './auth/auth.module';
import { ClassroomsModule } from './classrooms/classrooms.module';
import { ColorTagsModule } from './colortags/colortags.module';
import { ContentModule } from './content/content.module';
import { EnrollmentWindowsModule } from './enrollment-windows/enrollment-windows.module';
import { EventsModule } from './events/events.module';
import { GoalsModule } from './goals/goals.module';
import { LeadsModule } from './leads/leads.module';
import { LessonsModule } from './lessons/lessons.module';
import { GatewaysModule } from './gateways/gateways.module';
import { NotesModule } from './notes/notes.module';
import { ProgressModule } from './progress/progress.module';
import { ParentsModule } from './parents/parents.module';
import { PassesModule } from './passes/passes.module';
import { PaymentsModule } from './payments/payments.module';
import { PrismaModule } from './prisma/prisma.module';
import { ScheduleModule as ClassScheduleModule } from './schedule/schedule.module';
import { StorageModule } from './storage/storage.module';
import { TasksModule } from './tasks/tasks.module';
import { TestsModule } from './tests/tests.module';
import { UsersModule } from './users/users.module';
import { VideosModule } from './videos/videos.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    // Глобал rate limit (IP бүрд) — login brute-force болон autosave-ийн
    // хэт ачааллаас хамгаална; auth дээр нарийн хязгаар тусдаа (@Throttle)
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 300 }]),
    ScheduleModule.forRoot(),
    PrismaModule,
    AuthModule,
    ClassroomsModule,
    AttendanceModule,
    AssignmentsModule,
    ContentModule,
    TestsModule,
    AttemptsModule,
    StorageModule,
    PassesModule,
    PaymentsModule,
    ParentsModule,
    ColorTagsModule,
    UsersModule,
    AnnouncementsModule,
    ClassSessionsModule,
    ClassificationModule,
    VideosModule,
    EventsModule,
    EnrollmentWindowsModule,
    LeadsModule,
    LessonsModule,
    GatewaysModule,
    ProgressModule,
    TasksModule,
    ClassScheduleModule,
    AuditModule,
    NotesModule,
    GoalsModule,
    AnalyticsModule,
  ],
  controllers: [AppController],
  providers: [AppService, { provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
