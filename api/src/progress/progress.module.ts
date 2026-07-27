import { Module } from '@nestjs/common';
import { ActivityService } from '../activity/activity.service';
import { AttemptsService } from '../attempts/attempts.service';
import { AuditService } from '../audit/audit.service';
import { TestsService } from '../tests/tests.service';
import { ProgressController } from './progress.controller';
import { ProgressService } from './progress.service';

// АНХААР (followUps-д давхардуулж мэдэгдэв): энэ модуль app.module.ts-д
// БҮРТГЭГДЭЭГҮЙ — attempts/activity/content зэрэг модулиуд одоогоор өөр
// эгнээнд (wave) идэвхтэй засварлагдаж байгаа тул app.module.ts-ийг зориудаар
// хөндөөгүй болно.
//
// AttemptsService/ActivityService/TestsService/AuditService-ийг attempts/
// activity/tests/audit модулиудаас "экспортлуулахгүйгээр" энд шууд provider
// болгож нэмсэн — эдгээр сервис бүр зөвхөн PrismaService (глобал) дээр
// суурилдаг тул модуль хоорондын хамаарал үүсгэхгүйгээр код давхардуулахгүйгээр
// дахин ашиглах боломжтой.
@Module({
  controllers: [ProgressController],
  providers: [
    ProgressService,
    AttemptsService,
    ActivityService,
    TestsService,
    AuditService,
  ],
})
export class ProgressModule {}
