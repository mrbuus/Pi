import { Module } from '@nestjs/common';
import { TuitionModule } from '../tuition/tuition.module';
import { ReportsModule } from '../reports/reports.module';
import { JobsController } from './jobs.controller';
import { NotificationPreferencesController } from './notification-preferences.controller';
import { CronSecretGuard } from './cron-secret.guard';
import { JobsService } from './jobs.service';

@Module({ imports: [TuitionModule, ReportsModule], controllers: [JobsController, NotificationPreferencesController], providers: [CronSecretGuard, JobsService] })
export class JobsModule {}
