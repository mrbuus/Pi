import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { Role } from '../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import { RecordUsageDto } from './dto/record-usage.dto';
import { normalizePath, normalizeTarget } from './usage-normalize';

const TOP_PAGES = 15;
const TOP_CLICKS = 20;
// Хүсэлт бүрт сан руу бичвэл ачаалалтай үед (300 хүн, 8 мөрийн багц) холболтын нөөцийг
// эзэлж, гэрийн даалгавар илгээх мэт чухал үйлдлийг удаашруулж байсан (k6, 2026-11-04:
// медиан 209ms, pool timeout). Санах ойд цуглуулж 5 секундэд нэг createMany — сервер
// дахин асахад хамгийн ихдээ 5 секундын бүртгэл алдагдана (судалгааны лог, зөвшөөрөгдөнө).
const FLUSH_MS = 5_000;
const CHUNK = 1_000;
const MAX_BUFFER = 20_000;

// createdAt нь UTC найв timestamp (events.service.ts-ийн UTC_NOW тайлбарыг үз).
const UTC_NOW = Prisma.sql`(now() AT TIME ZONE 'UTC')`;

@Injectable()
export class UsageService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(UsageService.name);
  private buffer: Prisma.UiEventCreateManyInput[] = [];
  private timer?: NodeJS.Timeout;

  constructor(private prisma: PrismaService) {}

  onModuleInit() {
    this.timer = setInterval(() => void this.flush(), FLUSH_MS);
    this.timer.unref();
  }

  async onModuleDestroy() {
    clearInterval(this.timer);
    await this.flush();
  }

  // userId, role ЗӨВХӨН JWT-ээс. Сан руу шууд бичихгүй — flush() багцалж бичнэ.
  record(userId: string, role: Role, dto: RecordUsageDto) {
    const now = new Date();
    let accepted = 0;
    for (const e of dto.events) {
      if (this.buffer.length >= MAX_BUFFER) break; // сан удаа унтарвал санах ой дүүргэхгүй
      const path = normalizePath(e.path);
      if (!path) continue;
      const target = e.kind === 'click' ? normalizeTarget(e.target) : null;
      if (e.kind === 'click' && !target) continue;
      this.buffer.push({ userId, role, kind: e.kind, path, target, device: dto.device, createdAt: now });
      accepted++;
    }
    return { accepted };
  }

  async flush() {
    const rows = this.buffer;
    this.buffer = [];
    for (let i = 0; i < rows.length; i += CHUNK) {
      try {
        await this.prisma.uiEvent.createMany({ data: rows.slice(i, i + CHUNK) });
      } catch (err) {
        this.logger.error(`UiEvent ${Math.min(CHUNK, rows.length - i)} мөр бичигдсэнгүй`, err);
      }
    }
  }

  async summary(rawDays?: string) {
    const parsed = parseInt(rawDays ?? '', 10);
    const days = Number.isFinite(parsed) ? Math.min(Math.max(parsed, 1), 90) : 7;
    const since = Prisma.sql`${UTC_NOW} - make_interval(days => ${days}::int)`;

    const [totals, devices, pages, clicks, hours] = await Promise.all([
      this.prisma.$queryRaw<{ role: Role; users: bigint; events: bigint }[]>`
        SELECT role, COUNT(DISTINCT "userId") AS users, COUNT(*) AS events
        FROM "UiEvent" WHERE "createdAt" >= ${since}
        GROUP BY role`,
      this.prisma.$queryRaw<{ role: Role; device: string; users: bigint }[]>`
        SELECT role, device, COUNT(DISTINCT "userId") AS users
        FROM "UiEvent" WHERE "createdAt" >= ${since}
        GROUP BY role, device`,
      this.prisma.$queryRaw<{ role: Role; path: string; views: bigint; users: bigint }[]>`
        SELECT role, path, views, users FROM (
          SELECT role, path, COUNT(*) AS views, COUNT(DISTINCT "userId") AS users,
                 ROW_NUMBER() OVER (PARTITION BY role ORDER BY COUNT(*) DESC) AS rn
          FROM "UiEvent" WHERE kind = 'page' AND "createdAt" >= ${since}
          GROUP BY role, path
        ) t WHERE rn <= ${TOP_PAGES}`,
      this.prisma.$queryRaw<
        { role: Role; path: string; target: string; clicks: bigint; users: bigint }[]
      >`
        SELECT role, path, target, clicks, users FROM (
          SELECT role, path, target, COUNT(*) AS clicks, COUNT(DISTINCT "userId") AS users,
                 ROW_NUMBER() OVER (PARTITION BY role ORDER BY COUNT(*) DESC) AS rn
          FROM "UiEvent" WHERE kind = 'click' AND "createdAt" >= ${since}
          GROUP BY role, path, target
        ) t WHERE rn <= ${TOP_CLICKS}`,
      // Улаанбаатарын цаг (+08)
      this.prisma.$queryRaw<{ role: Role; hour: number; events: bigint }[]>`
        SELECT role, EXTRACT(HOUR FROM "createdAt" + interval '8 hours')::int AS hour,
               COUNT(*) AS events
        FROM "UiEvent" WHERE "createdAt" >= ${since}
        GROUP BY role, hour`,
    ]);

    const n = (v: bigint | number) => Number(v);
    const roles = totals
      .map((t) => {
        const hourly = Array.from({ length: 24 }, () => 0);
        for (const h of hours) if (h.role === t.role) hourly[h.hour] = n(h.events);
        return {
          role: t.role,
          users: n(t.users),
          events: n(t.events),
          devices: Object.fromEntries(
            devices.filter((d) => d.role === t.role).map((d) => [d.device, n(d.users)]),
          ) as Record<string, number>,
          pages: pages
            .filter((p) => p.role === t.role)
            .map((p) => ({ path: p.path, views: n(p.views), users: n(p.users) }))
            .sort((a, b) => b.views - a.views),
          clicks: clicks
            .filter((c) => c.role === t.role)
            .map((c) => ({ path: c.path, target: c.target, clicks: n(c.clicks), users: n(c.users) }))
            .sort((a, b) => b.clicks - a.clicks),
          hourly,
        };
      })
      .sort((a, b) => b.users - a.users);

    return { days, roles };
  }
}
