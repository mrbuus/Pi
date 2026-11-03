import { Injectable, Logger } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { Role } from '../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import { RecordUsageDto } from './dto/record-usage.dto';
import { normalizePath, normalizeTarget } from './usage-normalize';

const TOP_PAGES = 15;
const TOP_CLICKS = 20;

// createdAt нь UTC найв timestamp (events.service.ts-ийн UTC_NOW тайлбарыг үз).
const UTC_NOW = Prisma.sql`(now() AT TIME ZONE 'UTC')`;

@Injectable()
export class UsageService {
  private readonly logger = new Logger(UsageService.name);

  constructor(private prisma: PrismaService) {}

  // userId, role ЗӨВХӨН JWT-ээс. Бүртгэл бичигдээгүй ч хэрэглэгчийн ажилд нөлөөлөхгүй.
  async record(userId: string, role: Role, dto: RecordUsageDto) {
    const rows: Prisma.UiEventCreateManyInput[] = [];
    for (const e of dto.events) {
      const path = normalizePath(e.path);
      if (!path) continue;
      const target = e.kind === 'click' ? normalizeTarget(e.target) : null;
      if (e.kind === 'click' && !target) continue;
      rows.push({ userId, role, kind: e.kind, path, target, device: dto.device });
    }
    if (rows.length) {
      try {
        await this.prisma.uiEvent.createMany({ data: rows });
      } catch (err) {
        this.logger.error('UiEvent createMany амжилтгүй', err);
      }
    }
    return { accepted: rows.length };
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
