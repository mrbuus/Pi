import { Module } from '@nestjs/common';
import { GoalsController } from './goals.controller';
import { GoalsService } from './goals.service';

// ⚠️ ШИНЭ МОДУЛЬ — app.module.ts дотор БҮРТГЭГДЭЭГҮЙ байгаа. Дараагийн
// ажлаараа GoalsModule-ийг api/src/app.module.ts-ийн imports жагсаалтад
// нэмж өгнө үү (энэ ажлын хамрах хүрээнээс гадуур учир энд хийгээгүй).
@Module({
  controllers: [GoalsController],
  providers: [GoalsService],
})
export class GoalsModule {}
