import { Module } from '@nestjs/common';
import { ScheduleController } from './schedule.controller';
import { ScheduleService } from './schedule.service';

@Module({
  controllers: [ScheduleController],
  providers: [ScheduleService],
  // TuitionModule нь төлбөрийн буцаалтыг ХИЧЭЭЛИЙН ӨДРӨӨР тооцохдоо
  // ScheduleService.expandDays()-ыг ашигладаг тул экспортлох ЁСТОЙ.
  //
  // ⚠️ Экспортлохоо мартвал `tsc` ба `jest` ХОЁУЛАА өнгөрдөг — NestJS-ийн
  //    хамаарал зөвхөн АЖИЛЛАХ ҮЕД шийдэгддэг. Апп боохдоо унаж,
  //    Render хуучин instance-аа үлдээдэг (2026-08-08-нд яг ингэж болсон).
  //    Тиймээс deploy хийхээс өмнө `node dist/src/main` -ыг ЗААВАЛ ажиллуулж
  //    боож байгааг шалгана.
  exports: [ScheduleService],
})
export class ScheduleModule {}
