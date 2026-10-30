import { Controller, Get, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Prisma, Role } from '../generated/prisma/client';
import { FinanceCapabilityGuard } from '../payments/finance-capability.guard';
import { PrismaService } from '../prisma/prisma.service';
import { SHEET } from './payment-plan';
import { SheetSyncService } from './sheet-sync.service';

interface AuthedRequest {
  user: { userId: string; role: Role };
}
const SEVERITIES = ['ERROR', 'WARN', 'INFO'];
const clamp = (v: string | undefined, def: number, max: number) => Math.min(Math.max(Number.parseInt(v ?? '', 10) || def, 0), max);

// Төлбөрийн шийтийн синк — уншихыг Админ ба Багш+ (finance.manage), синк
// эхлүүлэх / тааруулах / түүхий мөр (дансны дугаартай) зөвхөн Админ.
@Controller('sheet-sync')
@UseGuards(JwtAuthGuard, RolesGuard, FinanceCapabilityGuard)
@Roles(Role.ADMIN, Role.TEACHER_PLUS)
export class SheetSyncController {
  constructor(
    private readonly sync: SheetSyncService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('status')
  async status() {
    const [lastRun, lastOk, open] = await Promise.all([
      this.prisma.sheetSyncRun.findFirst({ where: { finishedAt: { not: null } }, orderBy: { startedAt: 'desc' }, select: { startedAt: true, finishedAt: true, ok: true, skipped: true, error: true } }),
      this.prisma.sheetSyncRun.findFirst({ where: { ok: true, skipped: false }, orderBy: { startedAt: 'desc' }, select: { startedAt: true, stats: true } }),
      this.prisma.sheetIssue.groupBy({ by: ['severity', 'kind'], where: { resolvedAt: null }, _count: { _all: true } }),
    ]);
    const stats = (lastOk?.stats ?? {}) as Record<string, unknown>;
    return {
      configured: this.sync.isConfigured(),
      enabled: this.sync.isEnabled(),
      writeEnabled: this.sync.isWriteEnabled(),
      running: this.sync.isRunning(),
      lastRun,
      lastFullAt: lastOk?.startedAt ?? null,
      last: lastOk ? { rows: stats.rows, payments: stats.payments, notes: stats.notes, createdStudents: stats.createdStudents, appended: stats.appended, sheetRows: stats.sheetRows } : null,
      open: open
        .map((g) => ({ severity: g.severity, kind: g.kind, count: g._count._all }))
        .sort((a, b) => SEVERITIES.indexOf(a.severity) - SEVERITIES.indexOf(b.severity) || b.count - a.count),
    };
  }

  @Get('issues')
  async issues(@Query('kind') kind?: string, @Query('severity') severity?: string, @Query('offset') offset?: string, @Query('limit') limit?: string) {
    const where: Prisma.SheetIssueWhereInput = {
      resolvedAt: null,
      ...(kind ? { kind } : {}),
      ...(severity && SEVERITIES.includes(severity) ? { severity } : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.sheetIssue.findMany({
        where,
        orderBy: [{ firstSeenAt: 'desc' }, { title: 'asc' }],
        skip: clamp(offset, 0, 100_000),
        take: clamp(limit, 30, 100),
        select: { id: true, kind: true, severity: true, tab: true, rowNumber: true, studentId: true, title: true, detail: true, firstSeenAt: true },
      }),
      this.prisma.sheetIssue.count({ where }),
    ]);
    return { items, total };
  }

  @Post('run')
  @Roles(Role.ADMIN)
  run(@Req() req: AuthedRequest) {
    return this.sync.trigger(req.user.userId);
  }

  @Post('students/:id/apply')
  @Roles(Role.ADMIN)
  apply(@Param('id') id: string, @Req() req: AuthedRequest) {
    return this.sync.applySheetForStudent(id, { id: req.user.userId, role: req.user.role });
  }

  /** Шийтийн түүхий мөр — «гарсан», «Илүү төлөлт»-д дансны дугаар байдаг тул зөвхөн Админ. */
  @Get('rows')
  @Roles(Role.ADMIN)
  async rows(@Query('tab') tab?: string, @Query('q') q?: string, @Query('offset') offset?: string, @Query('gone') gone?: string) {
    const order = Object.values(SHEET) as string[];
    const rank = (t: string) => (order.includes(t) ? order.indexOf(t) : order.length);
    const tabs = (await this.prisma.sheetRow.groupBy({ by: ['tab'], where: { goneAt: null }, _count: { _all: true } })).sort(
      (a, b) => rank(a.tab) - rank(b.tab) || a.tab.localeCompare(b.tab),
    );
    const active = tab ?? tabs[0]?.tab;
    if (!active) return { tabs: [], tab: null, headers: {}, items: [], total: 0 };
    const term = (q ?? '').trim();
    const like = `%${term.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
    const goneOnly = gone === '1';
    const skip = clamp(offset, 0, 100_000);
    const [items, count, lastOk] = await Promise.all([
      this.prisma.$queryRaw<{ id: string; rowNumber: number; cells: Record<string, unknown>; studentId: string | null; goneAt: Date | null; changedAt: Date }[]>`
        SELECT id, "rowNumber", cells, "studentId", "goneAt", "changedAt" FROM "SheetRow"
        WHERE tab = ${active} AND (${goneOnly} = ("goneAt" IS NOT NULL)) AND (${term} = '' OR cells::text ILIKE ${like})
        ORDER BY "rowNumber" LIMIT 50 OFFSET ${skip}`,
      this.prisma.$queryRaw<{ n: number }[]>`
        SELECT count(*)::int AS n FROM "SheetRow"
        WHERE tab = ${active} AND (${goneOnly} = ("goneAt" IS NOT NULL)) AND (${term} = '' OR cells::text ILIKE ${like})`,
      this.prisma.sheetSyncRun.findFirst({ where: { ok: true, skipped: false }, orderBy: { startedAt: 'desc' }, select: { stats: true } }),
    ]);
    const headers = ((lastOk?.stats as Record<string, unknown> | null)?.headers as Record<string, Record<string, string>> | undefined)?.[active] ?? {};
    return {
      tabs: tabs.map((t) => ({ tab: t.tab, count: t._count._all })),
      tab: active,
      headers,
      items,
      total: count[0]?.n ?? 0,
    };
  }
}
