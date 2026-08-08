import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { ActivityModule } from './activity/activity.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { AnnouncementsModule } from './announcements/announcements.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AssignmentsModule } from './assignments/assignments.module';
import { TeacherGroupsModule } from './teacher-groups/teacher-groups.module';
import { AuditModule } from './audit/audit.module';
import { ClassSessionsModule } from './class-sessions/class-sessions.module';
import { ClassificationModule } from './classification/classification.module';
import { AttemptsModule } from './attempts/attempts.module';
import { AttendanceModule } from './attendance/attendance.module';
import { AuthModule } from './auth/auth.module';
import { NotificationsModule } from './notifications/notifications.module';
import { requireJwtSecret } from './auth/jwt.strategy';
import { ClassroomsModule } from './classrooms/classrooms.module';
import { ColorTagsModule } from './colortags/colortags.module';
import { ContentModule } from './content/content.module';
import { EnrollmentWindowsModule } from './enrollment-windows/enrollment-windows.module';
import { EventsModule } from './events/events.module';
import { FinanceModule } from './finance/finance.module';
import { GoalsModule } from './goals/goals.module';
import { InsightsModule } from './insights/insights.module';
import { LeadsModule } from './leads/leads.module';
import { LessonsModule } from './lessons/lessons.module';
import { GatewaysModule } from './gateways/gateways.module';
import { NotesModule } from './notes/notes.module';
import { ProgressModule } from './progress/progress.module';
import { ParentsModule } from './parents/parents.module';
import { RecommendModule } from './recommend/recommend.module';
import { PassesModule } from './passes/passes.module';
import { PaymentsModule } from './payments/payments.module';
import { PrismaModule } from './prisma/prisma.module';
import { StoreModule } from './store/store.module';
import { ScheduleModule as ClassScheduleModule } from './schedule/schedule.module';
import { StorageModule } from './storage/storage.module';
import { TasksModule } from './tasks/tasks.module';
import { TestsModule } from './tests/tests.module';
import { UsersModule } from './users/users.module';
import { VideosModule } from './videos/videos.module';
import { TuitionModule } from './tuition/tuition.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    // Глобал rate limit — ЗӨВХӨН IP-ээр биш, БАТАЛГААЖСАН ХЭРЭГЛЭГЧЭЭР key
    // хийнэ. Шалтгаан: сургалтын төвийн нэг анги (20-30 сурагч) ихэвчлэн НЭГ
    // сургуулийн WiFi/NAT-аар дамжуулж ГАДНААС НЭГ IP шиг харагддаг тул зөвхөн
    // IP-ээр limit тавивал бүтэн ангийг (эсвэл Render-ийн ард trust proxy
    // тохируулаагүй бол БҮХ сургуулийг) шалгалтын дундуур зэрэг блоклох
    // "self-inflicted outage" эрсдэлтэй (docs/archive/PERF-AUDIT.md §5.1).
    //
    // ThrottlerGuard нь APP_GUARD тул controller-ийн JwtAuthGuard-аас ӨМНӨ
    // ажилладаг (req.user хараахан байхгүй) — иймд getTracker дотор
    // Authorization header-ийн JWT-г ӨӨРӨӨ баталгаажуулж sub (userId)-ийг
    // гаргаж авна. Токен байхгүй/хүчингүй (нэвтрээгүй маршрутууд: login,
    // register, leads) бол л IP руу унана — тэнд буруу хэрэглээ бодитоор
    // тохиолддог тул IP хязгаарлалт зохистой хэвээр байна.
    ThrottlerModule.forRootAsync({
      imports: [
        JwtModule.register({
          secret: requireJwtSecret(),
          signOptions: { expiresIn: '7d' },
        }),
      ],
      inject: [JwtService],
      useFactory: (jwtService: JwtService) => ({
        throttlers: [{ ttl: 60_000, limit: 300 }],
        getTracker: async (req: Record<string, any>): Promise<string> => {
          const header = req.headers?.authorization;
          const token =
            typeof header === 'string' && header.startsWith('Bearer ')
              ? header.slice(7)
              : undefined;
          if (token) {
            try {
              const payload = await jwtService.verifyAsync<{ sub?: string }>(
                token,
              );
              if (payload?.sub) return `user:${payload.sub}`;
            } catch {
              // Хүчингүй/хугацаа дууссан токен — доорх IP fallback ажиллана
            }
          }
          return `ip:${req.ip ?? 'unknown'}`;
        },
      }),
    }),
    ScheduleModule.forRoot(),
    PrismaModule,
    // @Global — SMS илгээх үйлчилгээг бүх модульд нээж өгнө (нууц үг сэргээх,
    // ирээдүйд ирц/төлбөрийн мэдэгдэл гэх мэт).
    NotificationsModule,
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
    StoreModule,
    ParentsModule,
    ColorTagsModule,
    UsersModule,
    AnnouncementsModule,
    ClassSessionsModule,
    ClassificationModule,
    VideosModule,
    EventsModule,
    FinanceModule,
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
    InsightsModule,
    AnalyticsModule,
    // import хийгдсэн ч энд бүртгэгдээгүйгээс /api/activity/* бүх маршрут
    // 404 өгч, сурагчийн идэвхийн heatmap болон багшийн "Ангийн идэвхийн
    // түүх" эвдэрсэн байсныг зассан (2026-07-29).
    ActivityModule,
    TeacherGroupsModule,
    RecommendModule,
    TuitionModule,
  ],
  controllers: [AppController],
  providers: [AppService, { provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
