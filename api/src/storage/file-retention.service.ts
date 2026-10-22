import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { deleteStoredFile } from './file-store';

const BATCH = 200;

/**
 * Хадгалах хугацаа дууссан файлыг устгана (эзэн 2026-10-22): гэрийн даалгаврын
 * зураг/PDF 7 хоног, онолын зураг байнга (`expiresAt = null`). Өдөр бүр 03:30-д
 * (Улаанбаатар) — ачаалал багатай цагт. Даалгаврын төлөв (хийсэн/дутуу) өгөгдлийн
 * санд хэвээр үлдэнэ; зөвхөн файл нь устна.
 */
@Injectable()
export class FileRetentionService {
  private readonly logger = new Logger(FileRetentionService.name);
  constructor(private readonly prisma: PrismaService) {}

  @Cron('30 3 * * *', { timeZone: 'Asia/Ulaanbaatar' })
  async nightly(): Promise<void> {
    const removed = await this.purgeExpired();
    if (removed) this.logger.log(`Хугацаа дууссан ${removed} файл устгав`);
  }

  async purgeExpired(now = new Date()): Promise<number> {
    let removed = 0;
    for (;;) {
      const rows = await this.prisma.storedFile.findMany({
        where: { expiresAt: { lte: now } },
        select: { key: true },
        take: BATCH,
      });
      if (!rows.length) return removed;
      for (const { key } of rows) {
        try {
          await deleteStoredFile(this.prisma, key);
          removed++;
        } catch (error) {
          // Нэг файл алдаатай бол бусдыг үргэлжлүүлнэ; маргааш дахин оролдоно
          this.logger.warn(`${key} устгаж чадсангүй: ${error instanceof Error ? error.message : error}`);
          await this.prisma.storedFile.update({
            where: { key },
            data: { expiresAt: new Date(now.getTime() + 86400000) },
          });
        }
      }
    }
  }
}
