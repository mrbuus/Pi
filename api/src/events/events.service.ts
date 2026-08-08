import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { TrackEventsDto } from './dto/track-events.dto';

/**
 * Одоо цаг — UTC-гээр, НАЙВ timestamp хэлбэрээр.
 *
 * ⚠️ ЯАГААД `now()` ШУУД АШИГЛАЖ БОЛОХГҮЙ ВЭ (2026-08-08-нд зассан):
 * `LearningEvent."occurredAt"` нь `timestamp WITHOUT time zone` бөгөөд Prisma
 * түүнд UTC утга бичдэг. Харин Postgres-ийн `now()` нь `timestamptz` буцаадаг
 * тул найв timestamp-тай харьцуулахдаа СЕССИЙН цагийн бүс рүү хөрвүүлэгдэнэ.
 * Улаанбаатар (+08) дээр ажиллуулбал хил нь 8 цагаар урагшилж, DAU/WAU/MAU
 * ЧИМЭЭГҮЙ буруу гарна. Render нь UTC тул прод дээр санамсаргүй зөв
 * ажиллаж байсан — өөр бүсэд нүүмэгц эвдрэх байсан.
 *
 * `Prisma.sql` ашигласнаар түүхий SQL болж ордог (bind параметр БИШ) тул
 * `$1 - interval …` гэсэн төрөл таах асуудал ч үүсэхгүй.
 */
const UTC_NOW = Prisma.sql`(now() AT TIME ZONE 'UTC')`;

@Injectable()
export class EventsService {
  private readonly logger = new Logger(EventsService.name);

  constructor(private prisma: PrismaService) {}

  // userId ЗӨВХӨН JWT-ээс ирнэ — request body-ээс хэзээ ч авахгүй, эс тэгвээс
  // client өөр хэрэглэгчийн нэрээр event хуурамчаар үүсгэх боломжтой болно.
  async track(userId: string, dto: TrackEventsDto) {
    const rows = dto.events.map((e) => ({
      userId,
      sessionId: dto.sessionId,
      type: e.type,
      occurredAt: new Date(e.occurredAt),
      problemId: e.problemId,
      testId: e.testId,
      chapterId: e.chapterId,
      videoId: e.videoId,
      durationMs: e.durationMs,
      meta: e.meta as Prisma.InputJsonValue | undefined,
    }));

    // Аналитикийн лог бичихдээ хэрэглэгчийн үзэж буй хуудсыг хэзээ ч эвдэхгүй:
    // DB алдаа гарвал зөвхөн серверт лог хийж, барагдана — 202 үргэлж буцна.
    try {
      await this.prisma.learningEvent.createMany({
        data: rows,
        skipDuplicates: false,
      });
    } catch (err) {
      this.logger.error('LearningEvent createMany амжилтгүй боллоо', err);
    }

    return { accepted: rows.length };
  }

  async mySummary(userId: string) {
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const grouped = await this.prisma.learningEvent.groupBy({
      by: ['type'],
      where: { userId, occurredAt: { gte: since } },
      _count: { _all: true },
      _sum: { durationMs: true },
    });

    const byType: Record<string, { count: number; durationMs: number }> = {};
    let totalDurationMs = 0;
    for (const g of grouped) {
      byType[g.type] = {
        count: g._count._all,
        durationMs: g._sum.durationMs ?? 0,
      };
      totalDurationMs += g._sum.durationMs ?? 0;
    }

    return { since, byType, totalDurationMs };
  }

  // DAU/WAU/MAU болон дундаж session үргэлжлэх хугацааг бүхэлд нь SQL дээр
  // тоолуулна — сая сая мөр бүхий хүснэгтийг Node-ын санах ойд ачаалахгүй.
  async stats() {
    const [activity] = await this.prisma.$queryRaw<
      { dau: bigint; wau: bigint; mau: bigint }[]
    >`
      SELECT
        COUNT(DISTINCT "userId") FILTER (WHERE "occurredAt" >= ${UTC_NOW} - interval '1 day') AS dau,
        COUNT(DISTINCT "userId") FILTER (WHERE "occurredAt" >= ${UTC_NOW} - interval '7 days') AS wau,
        COUNT(DISTINCT "userId") FILTER (WHERE "occurredAt" >= ${UTC_NOW} - interval '30 days') AS mau
      FROM "LearningEvent"
    `;

    const [session] = await this.prisma.$queryRaw<
      { avg_duration_ms: number | null }[]
    >`
      SELECT AVG(duration_ms) AS avg_duration_ms
      FROM (
        SELECT
          EXTRACT(EPOCH FROM (MAX("occurredAt") - MIN("occurredAt"))) * 1000 AS duration_ms
        FROM "LearningEvent"
        WHERE "sessionId" IS NOT NULL AND "occurredAt" >= ${UTC_NOW} - interval '30 days'
        GROUP BY "sessionId"
      ) sessions
    `;

    return {
      dau: Number(activity?.dau ?? 0),
      wau: Number(activity?.wau ?? 0),
      mau: Number(activity?.mau ?? 0),
      avgSessionDurationMs: Math.round(session?.avg_duration_ms ?? 0),
    };
  }
}
