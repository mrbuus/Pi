import { createHash, randomBytes } from 'node:crypto';
import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { NotificationKind, PaymentStatus, Prisma, Role, StudentNoteType, TuitionPlan } from '../generated/prisma/client';
import { AuditService } from '../audit/audit.service';
import { NotificationCenterService } from '../notification-center/notification-center.service';
import { PaymentsService } from '../payments/payments.service';
import { PrismaService } from '../prisma/prisma.service';
import { parseClassroomLabel } from '../users/student-import';
import { UsersService } from '../users/users.service';
import { cellSlot, reconcileStudent } from './cell-reconcile';
import {
  assignRowKeys,
  buildPlan,
  DbStudent,
  IMPORT_TAG,
  normKey,
  paymentRequestId,
  Plan,
  PlanIssue,
  planFromForm,
  SHEET,
  UnmatchedRow,
} from './payment-plan';
import { Book, colLetter, rowCells, toBook } from './sheet-book';
import { SheetsClient, sheetsConfigFromEnv } from './sheets.client';

// Шийт → вэб синк (эзэн 2026-10-27). Хэрэглэгчийн хүсэлтийг ГАЦААХГҮЙ:
//  - арын cron, нэг зэрэг нэг л синк (процесс доторх түгжээ + ӨС-ийн lease)
//  - шийт өөрчлөгдөөгүй бол (хэш ижил) ӨС-д бичихгүй, цагт нэг удаа л бүтэн шалгана
//  - зөвхөн өөрчлөгдсөн мөрийг багцаар бичнэ; гараар эхлүүлэхэд шууд хариу өгнө
// ЮУ Ч УСТГАХГҮЙ: гүйлгээг дарж бичихгүй (нэмэлт нь шинэ гүйлгээ, буурсан нь
// Админы шалгалт), шийтээс алга болсон мөр goneAt, хувилбар бүр SheetRowVersion-д.

const UB_OFFSET_MS = 8 * 3600_000;
const FULL_CHECK_EVERY_MS = 60 * 60_000;
const LEASE_MS = 10 * 60_000;
const MAX_AUTO_CREATE = 30;
const CHUNK = 500;
const PAYMENT_TABS = [SHEET.MAIN, SHEET.MONTHLY, SHEET.SOCIAL, SHEET.FULL] as string[];
const FIRST_DATA_ROW: Record<string, number> = {
  [SHEET.MAIN]: 2,
  [SHEET.MONTHLY]: 2,
  [SHEET.SOCIAL]: 2,
  [SHEET.FULL]: 2,
  [SHEET.LEFT]: 1,
  [SHEET.OVERPAID]: 1,
};
const SEVERITY_ORDER: Record<string, number> = { ERROR: 0, WARN: 1, INFO: 2 };

export interface SyncResult {
  runId: string | null;
  ok: boolean;
  skipped?: boolean;
  dryRun?: boolean;
  stats?: Record<string, unknown>;
  error?: string;
}

const todayUb = () => new Date(Date.now() + UB_OFFSET_MS).toISOString().slice(0, 10);
const sha = (v: unknown) => createHash('sha256').update(typeof v === 'string' ? v : JSON.stringify(v)).digest('hex');
const mnt = (n: number) => `${Math.round(n).toLocaleString('en-US')}₮`;
const chunks = <T>(list: T[], size = CHUNK): T[][] => {
  const out: T[][] = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
};
/** Урт давталтын дунд event loop-д амсхийх боломж өгнө (бусад хүсэлт хүлээхгүй). */
const yieldLoop = () => new Promise<void>((resolve) => setImmediate(resolve));

@Injectable()
export class SheetSyncService {
  private readonly logger = new Logger(SheetSyncService.name);
  private running: Promise<SyncResult> | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly users: UsersService,
    private readonly payments: PaymentsService,
    private readonly notifications: NotificationCenterService,
    private readonly audit: AuditService,
  ) {}

  isConfigured(): boolean {
    return !!sheetsConfigFromEnv();
  }
  isEnabled(): boolean {
    return process.env.SHEET_SYNC_ENABLED === '1' && this.isConfigured();
  }
  isRunning(): boolean {
    return !!this.running;
  }

  @Cron('*/5 * * * *', { name: 'sheet-sync' })
  async cron(): Promise<void> {
    if (!this.isEnabled() || this.running) return;
    await this.run('CRON');
  }

  /** Гараар — хүлээлгэхгүй, ард нь ажиллана. */
  trigger(actorId: string): { started: boolean } {
    if (!this.isConfigured()) throw new BadRequestException('Шийтийн холболт тохируулаагүй байна');
    if (this.running) return { started: false };
    void this.run('MANUAL', { actorId });
    return { started: true };
  }

  run(trigger: 'CRON' | 'MANUAL', opts: { actorId?: string; dryRun?: boolean } = {}): Promise<SyncResult> {
    if (this.running) return this.running;
    this.running = this.execute(trigger, opts).finally(() => {
      this.running = null;
    });
    return this.running;
  }

  // ---------------------------------------------------------------------------
  private async execute(trigger: 'CRON' | 'MANUAL', opts: { actorId?: string; dryRun?: boolean }): Promise<SyncResult> {
    const dryRun = !!opts.dryRun;
    const config = sheetsConfigFromEnv();
    if (!config) return { runId: null, ok: false, error: 'not-configured' };

    const run = dryRun ? null : await this.prisma.sheetSyncRun.create({ data: { trigger } });
    try {
      if (run) {
        const other = await this.prisma.sheetSyncRun.findFirst({
          where: { id: { not: run.id }, finishedAt: null, startedAt: { gt: new Date(Date.now() - LEASE_MS) } },
        });
        if (other) {
          await this.prisma.sheetSyncRun.update({ where: { id: run.id }, data: { finishedAt: new Date(), ok: true, skipped: true, stats: { reason: 'busy' } } });
          return { runId: run.id, ok: true, skipped: true };
        }
      }

      const fetched = await new SheetsClient(config).readAll();
      const hash = sha(fetched.tabs);
      if (run && trigger === 'CRON') {
        const lastFull = await this.prisma.sheetSyncRun.findFirst({ where: { ok: true, skipped: false }, orderBy: { startedAt: 'desc' } });
        if (lastFull?.hash === hash && Date.now() - lastFull.startedAt.getTime() < FULL_CHECK_EVERY_MS) {
          await this.prisma.sheetSyncRun.update({ where: { id: run.id }, data: { finishedAt: new Date(), ok: true, skipped: true, hash } });
          return { runId: run.id, ok: true, skipped: true };
        }
      }

      const book = toBook(fetched.tabs);
      const stats = await this.sync(book, { dryRun, runId: run?.id ?? null });
      stats.sheetTitle = fetched.title;
      if (run)
        await this.prisma.sheetSyncRun.update({
          where: { id: run.id },
          data: { finishedAt: new Date(), ok: true, hash, stats: stats as Prisma.InputJsonValue },
        });
      return { runId: run?.id ?? null, ok: true, dryRun, stats };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Шийтийн синк амжилтгүй: ${message}`);
      if (run) {
        await this.prisma.sheetSyncRun.update({ where: { id: run.id }, data: { finishedAt: new Date(), ok: false, error: message.slice(0, 2000) } }).catch(() => undefined);
        await this.saveIssues(
          [{ kind: 'SYNC_FAILED', severity: 'ERROR', title: 'Шийтээс мэдээлэл татаж чадсангүй — дараагийн оролдлого 5 минутын дараа', detail: { message: message.slice(0, 500) } }],
          { complete: false },
        ).catch(() => undefined);
      }
      return { runId: run?.id ?? null, ok: false, error: message };
    }
  }

  // ---------------------------------------------------------------------------
  private async sync(book: Book, ctx: { dryRun: boolean; runId: string | null }): Promise<Record<string, unknown>> {
    const today = todayUb();
    const admin = await this.prisma.user.findFirst({ where: { role: Role.ADMIN, archivedAt: null }, orderBy: { createdAt: 'asc' }, select: { id: true } });
    if (!admin) throw new Error('Идэвхтэй Админ олдсонгүй');

    let students = await this.loadStudents();
    let plan = buildPlan(book, students, today);
    await yieldLoop();

    // 1) Шийтэд шинээр нэмэгдсэн сурагч — аюулгүй нөхцөлд автоматаар үүсгэнэ
    const created = await this.autoCreate(plan, students, admin.id, ctx.dryRun);
    if (created.names.length && !ctx.dryRun) {
      students = await this.loadStudents();
      plan = buildPlan(book, students, today);
    }
    const issues: PlanIssue[] = [...plan.issues, ...created.issues];

    // 2) Шийтийн түүхий мөрүүд (бүх хуудас) — хувилбартай, устгалгүй
    const rowStats = await this.storeRows(book, plan, ctx.dryRun, issues);
    await yieldLoop();

    // 3) Төлбөр — нүд бүрээр тулгана
    const paymentsSkipped = plan.skippedTabs.some((t) => PAYMENT_TABS.includes(t));
    const payStats = paymentsSkipped
      ? { skipped: true }
      : await this.syncPayments(plan, admin.id, ctx.dryRun, issues);
    await yieldLoop();

    // 4) Тэмдэглэл, багц/огноо
    const noteStats = await this.syncNotes(plan, admin.id, ctx.dryRun);
    const profileStats = await this.syncProfiles(plan, rowStats.changedKeys, created.ids, admin.id, ctx.dryRun);

    // 5) Вэбд ангид байгаа ч шийтэд алга (жишээ нь шийтэд нэмэхээ мартсан)
    await this.webOnly(plan, issues);

    const issueStats = ctx.dryRun
      ? { open: issues.length, opened: 0 }
      : await this.saveIssues(issues, { complete: true });
    if (!ctx.dryRun && created.names.length)
      await this.notifyAdmins(`Шийтээс ${created.names.length} шинэ сурагч нэмэгдлээ`, created.names.slice(0, 20).join(', '));

    return {
      rows: plan.stats.rows,
      sheetRows: { new: rowStats.created, changed: rowStats.changed, gone: rowStats.gone },
      payments: payStats,
      notes: noteStats,
      profiles: profileStats,
      createdStudents: created.names.length,
      unmatched: plan.unmatched.length,
      skippedTabs: plan.skippedTabs,
      issues: issueStats,
      headers: rowStats.headers,
      ...(ctx.dryRun ? { preview: { created: created.names, issues: summarizeIssues(issues) } } : {}),
    };
  }

  private async loadStudents(): Promise<DbStudent[]> {
    return this.prisma.$queryRaw<DbStudent[]>`
      SELECT u.id, u."firstName", u."lastName", u.phone,
             sp."fatherPhone", sp."motherPhone", sp."tuitionPlan"::text AS plan,
             sp."tuitionAmount", to_char(sp."joinedOn", 'YYYY-MM-DD') AS "joinedOn",
             to_char(sp."leftOn", 'YYYY-MM-DD') AS "leftOn", c.name AS "classroomName"
      FROM "User" u
      JOIN "StudentProfile" sp ON sp."userId" = u.id
      LEFT JOIN LATERAL (
        SELECT cl.name FROM "Enrollment" e JOIN "Classroom" cl ON cl.id = e."classroomId"
        WHERE e."studentId" = u.id AND e."leftAt" IS NULL AND cl.archived = false
        ORDER BY e."joinedAt" DESC LIMIT 1
      ) c ON true
      WHERE u.role = 'STUDENT' AND u."archivedAt" IS NULL`;
  }

  // ---------------------------------------------------------------------------
  // Шинэ сурагч: эзэн жагсаалтад, төлбөртэй, 8 оронтой өөрийн утастай, анги нь
  // вэбд ганцхан таарч, ижил нэртэй хүүхэд тэр ангид/эцэг эхийн утсанд байхгүй.
  private async autoCreate(plan: Plan, students: DbStudent[], adminId: string, dryRun: boolean) {
    const issues: PlanIssue[] = [];
    const names: string[] = [];
    const ids: string[] = [];
    const rows = plan.unmatched;
    if (!rows.length) return { issues, names, ids };
    const classrooms = (await this.prisma.classroom.findMany({ where: { archived: false }, select: { id: true, name: true, grade: true } })).map((c) => ({
      ...c,
      ...parseClassroomLabel(c.name),
    }));
    const auto = process.env.SHEET_SYNC_AUTO_CREATE !== '0';
    const unmatchedIssue = (r: UnmatchedRow, reason: string, kind = 'UNMATCHED') =>
      issues.push({
        kind,
        severity: r.tab === SHEET.LEFT ? 'INFO' : 'WARN',
        tab: r.tab,
        row: r.row,
        rowKey: r.rowKey,
        title: `${`${r.lastName} ${r.firstName}`.trim()}${r.section ? ` (${r.section})` : ''}: шийтэд байгаа ч вэбд олдсонгүй — ${reason}`,
      });

    for (const r of rows) {
      if (r.tab !== SHEET.MAIN) {
        if (r.tab === SHEET.LEFT) continue; // гарсан хүүхэд вэбд байхгүй байх нь хэвийн
        unmatchedIssue(r, r.conflict ?? 'эзэн жагсаалтад нэмэгдэхээр үүснэ');
        continue;
      }
      if (r.conflict) {
        unmatchedIssue(r, r.conflict, 'CONFLICT');
        continue;
      }
      if (!auto) {
        unmatchedIssue(r, 'автомат бүртгэл унтраалттай');
        continue;
      }
      if (!r.paidTotal) {
        unmatchedIssue(r, 'төлбөр бичигдээгүй тул бүртгэсэнгүй');
        continue;
      }
      if (!r.phone || !r.lastName || !r.firstName) {
        unmatchedIssue(r, 'өөрийн 8 оронтой утас, овог, нэр заавал');
        continue;
      }
      const phoneOwner = await this.prisma.user.findUnique({ where: { phone: r.phone }, select: { role: true, archivedAt: true } });
      if (phoneOwner) {
        unmatchedIssue(r, phoneOwner.archivedAt ? 'утас нь архивласан хэрэглэгчид бүртгэлтэй' : 'утас нь өөр хэрэглэгчид бүртгэлтэй');
        continue;
      }
      const first = normKey(r.firstName);
      const twin = students.find(
        (s) =>
          normKey(s.firstName) === first &&
          ((r.section && parseClassroomLabel(s.classroomName ?? '').section === r.section) ||
            [r.fatherPhone, r.motherPhone].some((p) => p && (p === s.fatherPhone || p === s.motherPhone))),
      );
      if (twin) {
        unmatchedIssue(r, `ижил нэртэй ${twin.lastName} ${twin.firstName} вэбд байна — давхар бүртгэхгүйн тулд шалгана уу`, 'POSSIBLE_DUPLICATE');
        continue;
      }
      let options = classrooms.filter((c) => c.section && c.section === r.section);
      if (options.length > 1 && r.branch) options = options.filter((c) => normKey(c.branch).startsWith(normKey(r.branch)));
      if (options.length !== 1) {
        unmatchedIssue(r, options.length ? `«${r.section}» нэртэй ${options.length} анги байна` : `«${r.section ?? 'хоосон'}» анги вэбд алга`);
        continue;
      }
      if (names.length >= MAX_AUTO_CREATE) {
        unmatchedIssue(r, `нэг удаад ${MAX_AUTO_CREATE}-аас олон сурагч автоматаар бүртгэхгүй`);
        continue;
      }
      const label = `${r.lastName} ${r.firstName} (${r.section})`;
      if (dryRun) {
        names.push(label);
        continue;
      }
      try {
        const res = (await this.users.createClassroomStudent(
          {
            lastName: r.lastName,
            firstName: r.firstName,
            phone: r.phone,
            classroomId: options[0].id,
            grade: r.grade && r.grade <= 12 ? r.grade : undefined,
            school: r.school ?? undefined,
            fatherPhone: r.fatherPhone ?? undefined,
            motherPhone: r.motherPhone ?? undefined,
            joinedOn: r.start ?? undefined,
            tuitionPlan: (planFromForm(r.form) as TuitionPlan | null) ?? undefined,
          },
          adminId,
        )) as { id?: string } | undefined;
        names.push(label);
        if (res?.id) ids.push(res.id);
      } catch (error) {
        unmatchedIssue(r, `автоматаар бүртгэж чадсангүй: ${error instanceof Error ? error.message : 'алдаа'}`, 'CREATE_FAILED');
      }
    }
    return { issues, names, ids };
  }

  // ---------------------------------------------------------------------------
  private async storeRows(book: Book, plan: Plan, dryRun: boolean, issues: PlanIssue[]) {
    const now = new Date();
    const current = new Map<string, { tab: string; rowKey: string; rowNumber: number; cells: Record<string, string | number>; hash: string; studentId: string | null; matchBy: string | null }>();
    const headers: Record<string, Record<string, string>> = {};
    for (const [tab, rows] of Object.entries(book)) {
      if (!rows) continue;
      const first = FIRST_DATA_ROW[tab] ?? 0;
      headers[tab] = headerLabels(rows, first);
      for (const [i, rowKey] of assignRowKeys(rows, first)) {
        const cells = rowCells(rows[i]);
        const match = plan.rowMatches.get(`${tab}|${rowKey}`);
        current.set(`${tab}|${rowKey}`, { tab, rowKey, rowNumber: i + 1, cells, hash: sha(cells), studentId: match?.studentId ?? null, matchBy: match?.by ?? null });
      }
    }
    const existing = await this.prisma.sheetRow.findMany({ select: { id: true, tab: true, rowKey: true, hash: true, rowNumber: true, goneAt: true, studentId: true, matchBy: true } });
    const byKey = new Map(existing.map((r) => [`${r.tab}|${r.rowKey}`, r]));
    const changedKeys = new Set<string>();
    const toCreate: Prisma.SheetRowCreateManyInput[] = [];
    const versions: Prisma.SheetRowVersionCreateManyInput[] = [];
    const touched: string[] = [];
    const updates: { id: string; data: Prisma.SheetRowUpdateInput }[] = [];
    for (const [key, row] of current) {
      const old = byKey.get(key);
      if (!old) {
        const id = `shr${randomBytes(11).toString('hex')}`;
        changedKeys.add(key);
        toCreate.push({ id, tab: row.tab, rowKey: row.rowKey, rowNumber: row.rowNumber, hash: row.hash, cells: row.cells, studentId: row.studentId, matchBy: row.matchBy, firstSeenAt: now, lastSeenAt: now, changedAt: now });
        versions.push({ sheetRowId: id, hash: row.hash, cells: row.cells, seenAt: now });
        continue;
      }
      const data: Prisma.SheetRowUpdateInput = {};
      if (old.hash !== row.hash) {
        changedKeys.add(key);
        Object.assign(data, { hash: row.hash, cells: row.cells, changedAt: now });
        versions.push({ sheetRowId: old.id, hash: row.hash, cells: row.cells, seenAt: now });
      }
      if (old.rowNumber !== row.rowNumber) data.rowNumber = row.rowNumber;
      if (old.studentId !== row.studentId || old.matchBy !== row.matchBy) Object.assign(data, { studentId: row.studentId, matchBy: row.matchBy });
      if (old.goneAt) data.goneAt = null;
      if (Object.keys(data).length) updates.push({ id: old.id, data: { ...data, lastSeenAt: now } });
      else touched.push(old.id);
    }
    const goneIds = existing.filter((r) => !r.goneAt && !current.has(`${r.tab}|${r.rowKey}`)).map((r) => r.id);

    // Сүүлийн 7 хоногт шийтээс алга болсон мөр — хуудас бүрээр нэг анхааруулга
    const recentGone = await this.prisma.sheetRow.groupBy({ by: ['tab'], where: { goneAt: { gt: new Date(Date.now() - 7 * 86_400_000) } }, _count: { _all: true } });
    const goneByTab = new Map(recentGone.map((g) => [g.tab, g._count._all]));
    for (const r of existing) if (goneIds.includes(r.id)) goneByTab.set(r.tab, (goneByTab.get(r.tab) ?? 0) + 1);
    for (const [tab, n] of goneByTab)
      issues.push({ kind: 'ROW_GONE', severity: 'WARN', tab, title: `«${tab}» хуудаснаас ${n} мөр устгагдсан — вэбд хуучин хувилбар нь хадгалагдсан`, detail: { count: n } });

    if (!dryRun) {
      for (const part of chunks(toCreate)) await this.prisma.sheetRow.createMany({ data: part });
      for (const part of chunks(versions)) await this.prisma.sheetRowVersion.createMany({ data: part });
      for (const u of updates) await this.prisma.sheetRow.update({ where: { id: u.id }, data: u.data });
      for (const part of chunks(touched, 1000)) await this.prisma.sheetRow.updateMany({ where: { id: { in: part } }, data: { lastSeenAt: now } });
      for (const part of chunks(goneIds, 1000)) await this.prisma.sheetRow.updateMany({ where: { id: { in: part } }, data: { goneAt: now } });
    }
    return { created: toCreate.length, changed: versions.length - toCreate.length, gone: goneIds.length, changedKeys, headers };
  }

  // ---------------------------------------------------------------------------
  private async syncPayments(plan: Plan, adminId: string, dryRun: boolean, issues: PlanIssue[]) {
    // a) Хуучин (Excel 2026-10-13) гүйлгээг нүдэнд нь холбоно — түлхүүрийн хэшийг
    //    боломжит бүх нүд (+ урьдчилгаа/үлдэгдэл) дээр тооцож олно.
    //    Гарал үүслийг ЗӨВХӨН сервер өгсөн id-аар (`imp…` = импорт скрипт) таньна —
    //    тайлбар, clientRequestId-ийг сурагч өөрөө бичиж чаддаг тул итгэхгүй.
    const legacy = await this.prisma.$queryRaw<{ id: string; userId: string; clientRequestId: string | null; amount: number; description: string | null }[]>`
      SELECT p.id, p."userId", p."clientRequestId", p.amount, p.description FROM "Payment" p
      WHERE p.id LIKE 'imp%' AND p.description LIKE ${`${IMPORT_TAG}%`}
        AND NOT EXISTS (SELECT 1 FROM "SheetPayment" s WHERE s."paymentId" = p.id)`;
    const newLinks: Prisma.SheetPaymentCreateManyInput[] = [];
    const candidateCache = new Map<string, Map<string, string>>();
    const candidates = (userId: string) => {
      let m = candidateCache.get(userId);
      if (!m) {
        m = new Map();
        for (const cell of plan.cells) for (const suffix of ['', '|dep', '|bal']) m.set(paymentRequestId(userId, `${cell}${suffix}`), cell);
        candidateCache.set(userId, m);
      }
      return m;
    };
    for (const p of legacy) {
      const cell = p.clientRequestId ? candidates(p.userId).get(p.clientRequestId) : undefined;
      if (cell) newLinks.push({ paymentId: p.id, studentId: p.userId, cell });
      else
        issues.push({
          kind: 'UNLINKED_PAYMENT',
          severity: 'WARN',
          studentId: p.userId,
          fp: p.id,
          title: `Шийтээс орсон гүйлгээ (${mnt(p.amount)}, ${(p.description ?? '').replace(`${IMPORT_TAG}: `, '')}) шийтийн аль нүдэнд хамаарахыг олсонгүй`,
        });
    }
    if (newLinks.length && !dryRun) for (const part of chunks(newLinks)) await this.prisma.sheetPayment.createMany({ data: part, skipDuplicates: true });

    // b) Вэб дэх нүд бүрийн нийт (баталгаажсан) ба ашиглагдсан түлхүүрүүд
    const linked = await this.prisma.$queryRaw<{ studentId: string; cell: string; paymentId: string; amount: number; status: string; clientRequestId: string | null }[]>`
      SELECT s."studentId", s.cell, s."paymentId", p.amount, p.status::text AS status, p."clientRequestId"
      FROM "SheetPayment" s JOIN "Payment" p ON p.id = s."paymentId"`;
    const allLinked = dryRun
      ? [...linked, ...newLinks.map((l) => {
          const p = legacy.find((x) => x.id === l.paymentId)!;
          return { studentId: l.studentId, cell: l.cell, paymentId: p.id, amount: p.amount, status: 'CONFIRMED', clientRequestId: p.clientRequestId };
        })]
      : linked;
    const byStudent = new Map<string, typeof allLinked>();
    for (const l of allLinked) byStudent.set(l.studentId, [...(byStudent.get(l.studentId) ?? []), l]);
    // Ашиглагдсан түлхүүр — ЯМАР Ч гарал үүсэлтэй гүйлгээнийх (сурагч өөрөө таамагласан
    // түлхүүрээр төлбөр үүсгэсэн ч синкийн гүйлгээ чимээгүй алгасагдахгүй).
    const takenByStudent = new Map<string, Set<string>>();
    const usedIds = await this.prisma.$queryRaw<{ userId: string; clientRequestId: string }[]>`
      SELECT "userId", "clientRequestId" FROM "Payment" WHERE "clientRequestId" IS NOT NULL`;
    for (const p of usedIds) (takenByStudent.get(p.userId) ?? takenByStudent.set(p.userId, new Set()).get(p.userId)!).add(p.clientRequestId);

    // c) Тулгалт
    const inserts: { studentId: string; requestId: string; cell: string; amount: number; forMonth: string; paidOn: string | null; label: string }[] = [];
    let mismatched = 0;
    let held = 0;
    const studentIds = new Set([...plan.perStudent.keys(), ...byStudent.keys()]);
    for (const studentId of studentIds) {
      const bucket = plan.perStudent.get(studentId);
      const existing = (byStudent.get(studentId) ?? []).filter((l) => l.status === PaymentStatus.CONFIRMED);
      // Төлбөрийн хуудсанд (эзэн/сар бүр/нийгэм) мөргүй болсон сурагч — жишээ нь
      // гарсан. Төлсөн мөнгө нь бодитоор төлөгдсөн тул вэбд үлдээгээд мэдэгдэнэ.
      if (!bucket?.rowKeys.some((k) => [SHEET.MAIN, SHEET.MONTHLY, SHEET.SOCIAL].some((t) => k.startsWith(`${t}|`)))) {
        if (existing.length)
          issues.push({
            kind: 'PAYMENT_ORPHAN',
            severity: 'INFO',
            studentId,
            title: `${bucket ? `${bucket.student.lastName} ${bucket.student.firstName}` : 'Сурагч'}: төлбөрийн жагсаалтаас хасагдсан ч вэбд ${mnt(existing.reduce((t, l) => t + l.amount, 0))} төлбөр нь хадгалагдсан`,
          });
        continue;
      }
      const r = reconcileStudent(studentId, bucket?.payments ?? [], existing, takenByStudent.get(studentId) ?? new Set());
      for (const ins of r.inserts) inserts.push({ studentId, ...ins });
      if (r.mismatches.length) {
        mismatched++;
        held += r.held.length;
        const name = bucket ? `${bucket.student.lastName} ${bucket.student.firstName}` : 'Сурагч';
        const sheetTotal = r.mismatches.reduce((t, m) => t + m.sheet, 0);
        const webTotal = r.mismatches.reduce((t, m) => t + m.web, 0);
        issues.push({
          kind: 'PAYMENT_MISMATCH',
          severity: 'ERROR',
          studentId,
          title: bucket
            ? `${name}: шийтийн дүн вэбээс бага (шийт ${mnt(sheetTotal)}, вэб ${mnt(webTotal)})${r.held.length ? ` — ${r.held.length} шинэ гүйлгээ хүлээгдэж байна` : ''}`
            : `${name}: шийтээс орсон төлбөр шийтэд олдохгүй болсон (вэб ${mnt(webTotal)})`,
          detail: { cells: r.mismatches, held: r.held.map((h) => ({ cell: h.cell, amount: h.amount, label: h.label })) },
        });
      }
    }

    // d) Бичих — нэг транзакц, гүйлгээ + нүдний холбоос хамт
    let inserted = 0;
    if (inserts.length && !dryRun) {
      const rows = inserts.map((i) => ({ ...i, id: `shp${randomBytes(11).toString('hex')}` }));
      for (const part of chunks(rows, 200)) {
        await this.prisma.$transaction(async (tx) => {
          const res = await tx.payment.createMany({
            data: part.map((i) => ({
              id: i.id,
              userId: i.studentId,
              amount: i.amount,
              method: 'BANK_TRANSFER',
              status: PaymentStatus.CONFIRMED,
              description: `${IMPORT_TAG}: ${i.label}`.slice(0, 500),
              forMonth: i.forMonth,
              paidAt: i.paidOn ? new Date(`${i.paidOn}T04:00:00Z`) : null,
              confirmedById: adminId,
              clientRequestId: i.requestId,
            })),
            skipDuplicates: true,
          });
          inserted += res.count;
          const stored = await tx.payment.findMany({ where: { id: { in: part.map((i) => i.id) } }, select: { id: true } });
          const ok = new Set(stored.map((s) => s.id));
          for (const i of part.filter((x) => !ok.has(x.id)))
            issues.push({
              kind: 'INSERT_SKIPPED',
              severity: 'ERROR',
              studentId: i.studentId,
              fp: i.requestId,
              title: `${mnt(i.amount)} (${i.label}) гүйлгээ бичигдсэнгүй — ижил түлхүүртэй төлбөр байна, шалгана уу`,
            });
          await tx.sheetPayment.createMany({ data: part.filter((i) => ok.has(i.id)).map((i) => ({ paymentId: i.id, studentId: i.studentId, cell: i.cell })), skipDuplicates: true });
        });
        await yieldLoop();
      }
      await this.audit.record({
        actorId: adminId,
        actorRole: 'SYSTEM',
        action: 'SHEET_SYNC',
        entity: 'Payment',
        entityId: 'sheet-sync',
        after: { inserted, amount: inserts.reduce((t, i) => t + i.amount, 0) },
        reason: 'Google Sheet төлбөрийн синк',
      });
    }
    return {
      linkedLegacy: newLinks.length,
      planned: inserts.length,
      inserted: dryRun ? 0 : inserted,
      amount: inserts.reduce((t, i) => t + i.amount, 0),
      mismatchedStudents: mismatched,
      held,
    };
  }

  // ---------------------------------------------------------------------------
  private async syncNotes(plan: Plan, adminId: string, dryRun: boolean) {
    const existing = await this.prisma.studentNote.findMany({ where: { type: StudentNoteType.PAYMENT, body: { startsWith: IMPORT_TAG } }, select: { studentId: true, body: true } });
    const have = new Set(existing.map((n) => `${n.studentId}|${n.body}`));
    const data: Prisma.StudentNoteCreateManyInput[] = [];
    for (const [studentId, b] of plan.perStudent)
      for (const n of b.notes)
        if (!have.has(`${studentId}|${n.body}`))
          data.push({ studentId, type: StudentNoteType.PAYMENT, body: n.body, createdById: adminId, promisedOn: n.promisedOn ? new Date(`${n.promisedOn}T00:00:00Z`) : null });
    if (!dryRun) for (const part of chunks(data)) await this.prisma.studentNote.createMany({ data: part });
    return { added: data.length };
  }

  // Шийт ЯЛНА (Excel импортын дүрэм) — гэхдээ шийтийн мөр өөрчлөгдсөн үед л.
  // Тэгэхгүй бол вэб дээр гараар зассан багцыг 5 минут тутам буцааж дарна.
  private async syncProfiles(plan: Plan, changedKeys: Set<string>, createdIds: string[], adminId: string, dryRun: boolean) {
    let updated = 0;
    for (const b of plan.perStudent.values()) {
      if (!createdIds.includes(b.student.id) && !b.rowKeys.some((k) => changedKeys.has(k))) continue;
      const s = b.student;
      const data: Prisma.StudentProfileUpdateInput = {};
      if (b.resolvedPlan && b.resolvedPlan !== s.plan) data.tuitionPlan = b.resolvedPlan as TuitionPlan;
      if (b.resolvedAmount != null && b.resolvedAmount !== s.tuitionAmount) data.tuitionAmount = b.resolvedAmount;
      if (!s.joinedOn && b.start) data.joinedOn = new Date(`${b.start}T00:00:00Z`);
      if (!s.leftOn && b.leftOn) data.leftOn = new Date(`${b.leftOn}T00:00:00Z`);
      if (!Object.keys(data).length) continue;
      updated++;
      if (dryRun) continue;
      await this.prisma.studentProfile.update({ where: { userId: s.id }, data });
      await this.audit.record({
        actorId: adminId,
        actorRole: 'SYSTEM',
        action: 'SHEET_SYNC_PROFILE',
        entity: 'StudentProfile',
        entityId: s.id,
        before: { tuitionPlan: s.plan, tuitionAmount: s.tuitionAmount, joinedOn: s.joinedOn, leftOn: s.leftOn },
        after: { tuitionPlan: b.resolvedPlan, tuitionAmount: b.resolvedAmount ?? s.tuitionAmount, joinedOn: s.joinedOn ?? b.start, leftOn: s.leftOn ?? b.leftOn },
        reason: 'Google Sheet төлбөрийн синк',
      });
    }
    return { updated };
  }

  private async webOnly(plan: Plan, issues: PlanIssue[]) {
    const matched = new Set([...plan.rowMatches.values()].map((m) => m.studentId));
    const rows = await this.prisma.$queryRaw<{ id: string; lastName: string; firstName: string; classroom: string }[]>`
      SELECT DISTINCT ON (u.id) u.id, u."lastName", u."firstName", cl.name AS classroom
      FROM "User" u
      JOIN "StudentProfile" sp ON sp."userId" = u.id AND sp.type = 'CLASSROOM'
      JOIN "Enrollment" e ON e."studentId" = u.id AND e."leftAt" IS NULL
      JOIN "Classroom" cl ON cl.id = e."classroomId" AND cl.archived = false
      WHERE u.role = 'STUDENT' AND u."archivedAt" IS NULL
      ORDER BY u.id, e."joinedAt" DESC`;
    for (const r of rows)
      if (!matched.has(r.id))
        issues.push({
          kind: 'WEB_ONLY',
          severity: 'WARN',
          studentId: r.id,
          title: `${r.lastName} ${r.firstName} (${r.classroom}) вэбд ангид байгаа ч шийтэд алга — төлбөр нь шийтэд бүртгэгдээгүй байж магадгүй`,
        });
  }

  // ---------------------------------------------------------------------------
  private async saveIssues(issues: PlanIssue[], opts: { complete: boolean }) {
    const now = new Date();
    const byFp = new Map<string, PlanIssue>();
    for (const i of issues) {
      const fp = sha([i.kind, i.tab ?? '', i.rowKey ?? '', i.studentId ?? '', i.fp ?? (i.rowKey || i.studentId ? '' : i.title)].join('|'));
      if (!byFp.has(fp)) byFp.set(fp, i);
    }
    const fps = [...byFp.keys()];
    const existing = new Map<string, { id: string; resolvedAt: Date | null; title: string }>();
    for (const part of chunks(fps, 1000))
      for (const r of await this.prisma.sheetIssue.findMany({ where: { fingerprint: { in: part } }, select: { id: true, fingerprint: true, resolvedAt: true, title: true } }))
        existing.set(r.fingerprint, r);
    const create: Prisma.SheetIssueCreateManyInput[] = [];
    const reopen: string[] = [];
    const seen: string[] = [];
    let opened = 0;
    for (const [fp, i] of byFp) {
      const old = existing.get(fp);
      const loud = i.severity !== 'INFO';
      if (!old) {
        create.push({ fingerprint: fp, kind: i.kind, severity: i.severity, tab: i.tab ?? null, rowNumber: i.row ?? null, studentId: i.studentId ?? null, title: i.title, detail: (i.detail ?? undefined) as Prisma.InputJsonValue | undefined, firstSeenAt: now, lastSeenAt: now });
        if (loud) opened++;
        continue;
      }
      if (old.resolvedAt) {
        reopen.push(old.id);
        if (loud) opened++;
      }
      if (old.title !== i.title || old.resolvedAt)
        await this.prisma.sheetIssue.update({ where: { id: old.id }, data: { title: i.title, severity: i.severity, rowNumber: i.row ?? null, detail: (i.detail ?? Prisma.JsonNull) as Prisma.InputJsonValue, lastSeenAt: now, resolvedAt: null } });
      else seen.push(old.id);
    }
    for (const part of chunks(create)) await this.prisma.sheetIssue.createMany({ data: part, skipDuplicates: true });
    for (const part of chunks(seen, 1000)) await this.prisma.sheetIssue.updateMany({ where: { id: { in: part } }, data: { lastSeenAt: now } });
    let resolved = 0;
    if (opts.complete) {
      const res = await this.prisma.sheetIssue.updateMany({ where: { resolvedAt: null, fingerprint: { notIn: fps.length ? fps : ['-'] } }, data: { resolvedAt: now } });
      resolved = res.count;
    }
    if (opened) await this.notifyAdmins(`Төлбөрийн шийтэд ${opened} шинэ зөрүү илэрлээ`, 'Төлбөр → Шийт хэсгээс шалгана уу');
    return { open: byFp.size, opened, reopened: reopen.length, resolved };
  }

  private async notifyAdmins(title: string, body: string) {
    const admins = await this.prisma.user.findMany({ where: { role: Role.ADMIN, archivedAt: null }, select: { id: true } });
    await this.notifications.notify(admins.map((a) => a.id), { kind: NotificationKind.SYSTEM, title, body, link: '/app/payments?tab=sheet' });
  }

  // ---------------------------------------------------------------------------
  // Админ: зөрүүтэй сурагчийн вэбийн шийтийн гүйлгээг шийтийн дүнд тааруулна.
  // Устгахгүй — зөрүүтэй нүдний гүйлгээг БУЦААЖ (REVERSED, түүх үлдэнэ), шийтийн
  // дүнгээр шинээр бичнэ.
  async applySheetForStudent(studentId: string, actor: { id: string; role: string }) {
    const issue = await this.prisma.sheetIssue.findFirst({ where: { kind: 'PAYMENT_MISMATCH', studentId, resolvedAt: null } });
    if (!issue) throw new NotFoundException('Энэ сурагчид шийтийн зөрүү алга');
    const config = sheetsConfigFromEnv();
    if (!config) throw new BadRequestException('Шийтийн холболт тохируулаагүй байна');
    const book = toBook((await new SheetsClient(config).readAll()).tabs);
    const plan = buildPlan(book, await this.loadStudents(), todayUb());
    if (plan.skippedTabs.some((t) => PAYMENT_TABS.includes(t))) throw new BadRequestException('Шийтийн бүтэц өөрчлөгдсөн тул одоогоор тааруулах боломжгүй');
    const planned = plan.perStudent.get(studentId)?.payments ?? [];
    const links = await this.prisma.$queryRaw<{ paymentId: string; cell: string; amount: number; status: string; clientRequestId: string | null }[]>`
      SELECT s."paymentId", s.cell, p.amount, p.status::text AS status, p."clientRequestId"
      FROM "SheetPayment" s JOIN "Payment" p ON p.id = s."paymentId" WHERE s."studentId" = ${studentId}`;
    const confirmed = links.filter((l) => l.status === PaymentStatus.CONFIRMED);
    const plannedByCell = new Map<string, number>();
    for (const p of planned) plannedByCell.set(cellSlot(p.cell), (plannedByCell.get(cellSlot(p.cell)) ?? 0) + p.amount);
    const webByCell = new Map<string, number>();
    for (const l of confirmed) webByCell.set(cellSlot(l.cell), (webByCell.get(cellSlot(l.cell)) ?? 0) + l.amount);
    const badCells = [...new Set([...plannedByCell.keys(), ...webByCell.keys()])].filter((c) => (plannedByCell.get(c) ?? 0) !== (webByCell.get(c) ?? 0));
    for (const l of confirmed.filter((l) => badCells.includes(cellSlot(l.cell))))
      await this.payments.reverse(l.paymentId, { reason: 'Шийтийн дүнгээр тааруулав' }, actor);
    const taken = new Set(
      (await this.prisma.payment.findMany({ where: { userId: studentId, clientRequestId: { not: null } }, select: { clientRequestId: true } })).map((p) => p.clientRequestId!),
    );
    const r = reconcileStudent(studentId, planned.filter((p) => badCells.includes(cellSlot(p.cell))), [], taken);
    for (const ins of r.inserts) {
      const id = `shp${randomBytes(11).toString('hex')}`;
      await this.prisma.$transaction([
        this.prisma.payment.create({
          data: {
            id,
            userId: studentId,
            amount: ins.amount,
            method: 'BANK_TRANSFER',
            status: PaymentStatus.CONFIRMED,
            description: `${IMPORT_TAG}: ${ins.label}`.slice(0, 500),
            forMonth: ins.forMonth,
            paidAt: ins.paidOn ? new Date(`${ins.paidOn}T04:00:00Z`) : null,
            confirmedById: actor.id,
            clientRequestId: ins.requestId,
          },
        }),
        this.prisma.sheetPayment.create({ data: { paymentId: id, studentId, cell: ins.cell } }),
      ]);
    }
    await this.prisma.sheetIssue.update({ where: { id: issue.id }, data: { resolvedAt: new Date() } });
    await this.audit.record({
      actorId: actor.id,
      actorRole: actor.role,
      action: 'SHEET_SYNC_APPLY',
      entity: 'User',
      entityId: studentId,
      after: { cells: badCells, reversed: confirmed.filter((l) => badCells.includes(cellSlot(l.cell))).length, inserted: r.inserts.length },
      reason: 'Шийтийн дүнгээр тааруулав',
    });
    return { cells: badCells.length, inserted: r.inserts.length };
  }
}

/** Гарчиг: 2 мөртэй хуудсанд «6-7 сар Төлсөн дүн», «6-7 сар Хугацаа» гэж нийлүүлнэ. */
export function headerLabels(rows: Book[string], first: number): Record<string, string> {
  if (!rows || first === 0) return {};
  const top = rowCells(rows[0]);
  const sub = first > 1 ? rowCells(rows[1]) : {};
  const out: Record<string, string> = {};
  let group = '';
  const width = Math.max(rows[0]?.length ?? 0, first > 1 ? (rows[1]?.length ?? 0) : 0);
  for (let i = 0; i < width; i++) {
    const col = colLetter(i);
    const t = top[col] != null ? String(top[col]).trim() : '';
    const s = sub[col] != null ? String(sub[col]).trim() : '';
    if (t && s) group = t;
    else if (t) group = '';
    const label = s ? `${group ? `${group} ` : ''}${s}` : t;
    if (label) out[col] = label;
  }
  return out;
}

export function summarizeIssues(issues: PlanIssue[]) {
  const out: Record<string, number> = {};
  for (const i of issues) out[`${i.severity}:${i.kind}`] = (out[`${i.severity}:${i.kind}`] ?? 0) + 1;
  return Object.fromEntries(Object.entries(out).sort(([a], [b]) => (SEVERITY_ORDER[a.split(':')[0]] ?? 9) - (SEVERITY_ORDER[b.split(':')[0]] ?? 9)));
}
