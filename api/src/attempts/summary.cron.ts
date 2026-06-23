import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { AttemptsService } from './attempts.service';

@Injectable()
export class SummaryCron {
  private readonly logger = new Logger(SummaryCron.name);

  constructor(private attempts: AttemptsService) {}

  // Тэмдэглэгээ 23:00-д хаагдаад 23:30-д дүгнэлт бодогдоно (SPEC §18 санал)
  @Cron('30 23 * * *', { timeZone: 'Asia/Ulaanbaatar' })
  async nightly() {
    const today = new Date(
      new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Ulaanbaatar',
      }).format(new Date()),
    );
    const result = await this.attempts.buildDailySummary(today);
    this.logger.log(
      `Өдрийн дүгнэлт бодогдлоо: ${result.classroomsProcessed} анги`,
    );
  }
}
