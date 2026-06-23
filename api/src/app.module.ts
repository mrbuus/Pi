import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { AnnouncementsModule } from './announcements/announcements.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AssignmentsModule } from './assignments/assignments.module';
import { ClassSessionsModule } from './class-sessions/class-sessions.module';
import { ClassificationModule } from './classification/classification.module';
import { AttemptsModule } from './attempts/attempts.module';
import { AttendanceModule } from './attendance/attendance.module';
import { AuthModule } from './auth/auth.module';
import { ClassroomsModule } from './classrooms/classrooms.module';
import { ColorTagsModule } from './colortags/colortags.module';
import { ContentModule } from './content/content.module';
import { ParentsModule } from './parents/parents.module';
import { PassesModule } from './passes/passes.module';
import { PaymentsModule } from './payments/payments.module';
import { PrismaModule } from './prisma/prisma.module';
import { StorageModule } from './storage/storage.module';
import { TestsModule } from './tests/tests.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
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
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
