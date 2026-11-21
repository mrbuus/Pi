import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { TestsService } from './tests.service';

/**
 * Хугацаа дууссан, илгээгээгүй шалгалтын сессийг минут тутам хааж дүгнэнэ (утас унтарсан,
 * эргэж ороогүй сурагч). Олон instance зэрэг ажиллавал finalize-ийн нөхцөлт шинэчлэлт
 * (зөвхөн IN_PROGRESS) нэгийг л ялуулна; нэг instance дотор өмнөх ажил дуусаагүй бол алгасна.
 */
@Injectable()
export class SessionSweepCron {
  private readonly logger = new Logger(SessionSweepCron.name);
  private running = false;

  constructor(private tests: TestsService) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async sweep(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      const r = await this.tests.sweepExpiredSessions();
      if (r.closed || r.failed) {
        this.logger.log(
          `Хугацаа дууссан сесс: ${r.closed} хаагдсан, ${r.skipped} алгассан, ${r.failed} алдаатай`,
        );
      }
    } catch (error) {
      this.logger.error(
        'Сесс хаах ажил амжилтгүй',
        error instanceof Error ? error.stack : String(error),
      );
    } finally {
      this.running = false;
    }
  }
}
