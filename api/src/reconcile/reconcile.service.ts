// Банкны хуулга → хүүхдийн төлбөр (эзэн 2026-11-05, docs/PLAN-BANK-HUULGA.md).
//
// Урсгал: Багш+ Хаан банкны хуулгыг (.xlsx) оруулна → мөр бүр нэг удаа л
// хадгалагдана (bankRef @unique, «бүрэн шийдсэн өдөр»-өөс өмнөхийг алгасна) →
// huulga-match/huulga-classify санал гаргана → итгэлтэйг нь систем хуваарилна
// (сургалт → Payment CONFIRMED), бусдыг хүн «Шийдэх» жагсаалтаас нэг товшоод,
// хувааж эсвэл хайж ононо. Гараар оноосон данс/утсыг санана.
//
// Ачаалал: хуулга нь хэдэн зуун мөр; тулгалт санах ойд (~800 сурагч), бичилт нь
// хэдхэн бөөн асуулга — сард хэдхэн удаа ажиллана.

import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Prisma } from '../generated/prisma/client';
import { BankMatchStatus, PaymentMethod, PaymentStatus } from '../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { ledgersFor, primaryEnrollment } from '../payments/ledger-load';
import { dropPaidUp, paidUpOn } from './huulga-paidup';
import { DemoSheetService } from './demo-sheet.service';
import { todayKeyUB } from '../payments/ledger';
import { coveredThrough, parseKhanStatement, readXlsxGrid, shiftDay, StatementFormatError } from './khan-statement';
import {
  buildMatchIndex,
  matchTransaction,
  normalizePhone,
  phonesIn,
  splitSender,
  type MatchIndex,
  type MatchResult,
  type PayerHint,
  type RosterStudent,
} from './huulga-match';
import { ALLOC_LABEL, classifyTransaction, explainBooks, type AllocKind, type Classification, type SplitPart } from './huulga-classify';
import type { AllocateDto, ListRowsQueryDto, RowLane } from './reconcile.dto';

export interface ReconcileActor {
  id: string;
  role: string;
}

/** Мөр бүрд хадгалагдах санал (BankTransaction.suggestion) */
export interface RowSuggestion {
  decision: MatchResult['decision'];
  candidates: MatchResult['candidates'];
  kind: AllocKind;
  confident: boolean;
  split?: SplitPart[];
  reason: string;
  /** Хүн буцаасан — систем дахин автоматаар хуваарилахгүй */
  held?: boolean;
  /** Хүүхэд тодорхой ч шийтэд ийм төлбөр алга — хүн «шинээр нэмэх»-ийг батална */
  unrecorded?: boolean;
  /** Жилийн төлбөрөө аль хэдийн бүрэн төлсөн тул саналаас хассан хүүхдийн тоо */
  hiddenPaidUp?: number;
}

type OpenRow = {
  id: string;
  bankRef: string;
  accountNo?: string | null;
  bookedAt: Date;
  amount: number;
  direction: 'CREDIT' | 'DEBIT';
  description: string;
  counterparty: string | null;
  suggestion: Prisma.JsonValue;
};

/** paymentId — шийтээс аль хэдийн орсон төлбөртэй холбох (шинэ төлбөр үүсгэхгүй) */
type Part = { kind: AllocKind; amount: number; studentId: string | null; paymentId?: string };

/**
 * Ажилтан төлбөрийг шийтэд хөтөлдөг ба 5 минут тутам сайт руу татагддаг. Хуулгын
 * гүйлгээ тэр төлбөртэй ижил бол ШИНЭ төлбөр үүсгэвэл давхар тоологдоно. Хэмжилт
 * (2026-11-06, туршилтын сан): автоматаар оноогдсон 615-аас 497 нь тэр хүүхдэд
 * ижил дүнтэй, банкны огнооноос 0–1 хоногийн зөрүүтэй төлбөртэй; 15+ хоногийн
 * зөрүүтэй нь өөр сарын төлбөр байв. Иймээс ±3 хоног.
 */
const LINK_WINDOW_MS = 3 * 86_400_000;
type ExistingPayment = { id: string; userId: string; amount: number; at: number };

const STUDENT_PART: AllocKind[] = ['TUITION', 'BOOK', 'ANSWER_SHEET'];
const ubDay = (d: Date) => todayKeyUB(d);
const chunks = <T>(xs: T[], n: number) => Array.from({ length: Math.ceil(xs.length / n) }, (_, i) => xs.slice(i * n, i * n + n));

@Injectable()
export class ReconcileService {
  private readonly logger = new Logger(ReconcileService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly demoSheet: DemoSheetService,
  ) {}

  // ── Импорт ────────────────────────────────────────────────────────────────

  async importStatement(buffer: Buffer, actor: ReconcileActor) {
    let parsed: ReturnType<typeof parseKhanStatement>;
    try {
      parsed = parseKhanStatement(await readXlsxGrid(buffer));
    } catch (e) {
      if (e instanceof StatementFormatError) throw new BadRequestException(e.message);
      throw new BadRequestException('Файлыг уншиж чадсангүй. Хаан банкнаас татсан .xlsx хуулга эсэхийг шалгана уу');
    }
    const { info, rows } = parsed;
    if (!rows.length) throw new BadRequestException('Хуулгад гүйлгээ алга');
    const accountNo = info.accountNo ?? 'KHAN';

    // «Бүрэн шийдсэн өдөр» хүртэлх мөрийг огт оруулахгүй; үлдсэнийг түлхүүрээр (ӨС-ийн @unique)
    const cursor = await this.prisma.bankCursor.findUnique({ where: { accountNo } });
    const fresh = cursor ? rows.filter((r) => r.date > cursor.settledThrough) : rows;
    let inserted = 0;
    for (const part of chunks(fresh, 500)) {
      const res = await this.prisma.bankTransaction.createMany({
        skipDuplicates: true,
        data: part.map((r) => ({
          bankRef: r.bankRef,
          bookedAt: r.bookedAt,
          amount: r.amount,
          direction: r.direction,
          description: r.description,
          accountNo,
          counterparty: r.counterparty,
          closingBalance: r.closingBalance,
          importedById: actor.id,
          rawRow: r.raw,
        })),
      });
      inserted += res.count;
    }

    const covered = coveredThrough(info, rows) ?? rows[0].date;
    await this.prisma.bankCursor.upsert({
      where: { accountNo },
      create: { accountNo, coveredThrough: covered, settledThrough: shiftDay(rows[0].date, -1) },
      update: cursor && cursor.coveredThrough >= covered ? {} : { coveredThrough: covered },
    });

    const auto = await this.resolveOpen(actor);
    const inSheet = await this.applySheetThrough(actor);
    const settled = await this.recomputeCursor(accountNo);
    const summary = {
      rows: rows.length,
      newRows: inserted,
      duplicates: fresh.length - inserted,
      beforeSettled: rows.length - fresh.length,
      autoResolved: auto.resolved,
      inSheet,
      open: auto.open - inSheet,
      settledThrough: settled,
      from: info.from,
      to: info.to,
    };
    await this.audit.record({
      actorId: actor.id,
      actorRole: actor.role,
      action: 'IMPORT',
      entity: 'BankStatement',
      entityId: accountNo,
      after: summary,
    });
    return summary;
  }

  // ── Тулгалт ───────────────────────────────────────────────────────────────

  private async matchIndex(): Promise<MatchIndex> {
    const [students, hints] = await Promise.all([
      this.prisma.user.findMany({
        where: { role: 'STUDENT', studentProfile: { isNot: null } },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          phone: true,
          archivedAt: true,
          studentProfile: { select: { fatherPhone: true, motherPhone: true } },
        },
      }),
      this.prisma.bankPayerHint.findMany({ where: { count: { gt: 0 } }, select: { kind: true, value: true, studentId: true } }),
    ]);
    const roster: RosterStudent[] = students.map((s) => ({
      id: s.id,
      firstName: s.firstName,
      lastName: s.lastName,
      archived: !!s.archivedAt,
      phones: [...new Set([s.phone, s.studentProfile?.fatherPhone, s.studentProfile?.motherPhone].map(normalizePhone).filter((p): p is string => !!p))],
    }));
    return buildMatchIndex(roster, hints as PayerHint[]);
  }

  private suggest(row: OpenRow, idx: MatchIndex): RowSuggestion {
    const match = matchTransaction(row, idx);
    const c: Classification = classifyTransaction(row, match);
    const prev = row.suggestion as RowSuggestion | null;
    return { decision: match.decision, candidates: match.candidates, ...c, ...(prev?.held ? { held: true } : {}) };
  }

  /** Ажилтан шийтэд энэ хүүхдэд гүйлгээний ±3 хоногт, хуулгатай холбогдоогүй төлбөр бүртгэсэн эсэх */
  private recordedNear(pool: ExistingPayment[], studentId: string, at: Date): boolean {
    return pool.some((p) => p.userId === studentId && Math.abs(p.at - at.getTime()) <= LINK_WINDOW_MS);
  }

  /** Жилийн төлбөрөө бүрэн төлсөн хүүхэд → бүрэн болсон өдөр (huulga-paidup.ts) */
  private async paidUp(ids: string[]): Promise<Map<string, string>> {
    const out = new Map<string, string>();
    const ledgers = await ledgersFor(this.prisma, [...new Set(ids)], todayKeyUB());
    for (const [id, r] of ledgers) {
      const on = paidUpOn(r);
      if (on) out.set(id, on);
    }
    return out;
  }

  /** Санал → автоматаар хуваарилах хэсгүүд (итгэлтэй үед л), үгүй бол null. */
  private autoParts(row: OpenRow, s: RowSuggestion): Part[] | null {
    if (s.held || !s.confident) return null;
    const kid = s.decision === 'AUTO' ? s.candidates[0]?.studentId ?? null : null;
    if (s.kind === 'TUITION') return kid && !s.split ? [{ kind: 'TUITION', amount: row.amount, studentId: kid }] : null;
    if (s.kind === 'BOOK' || s.kind === 'ANSWER_SHEET') return [{ kind: s.kind, amount: row.amount, studentId: kid }];
    if (s.kind === 'STAFF_FINE' || s.kind === 'EXPENSE') return [{ kind: s.kind, amount: row.amount, studentId: null }];
    return null;
  }

  /**
   * Шийдэгдээгүй бүх мөрийн саналыг шинэчилж, итгэлтэйг нь хуваарилна. Импортын
   * дараа ба гараар шийдвэр гарах бүрд (сурсан данс бусад мөрийг шийдэж магадгүй).
   */
  private async resolveOpen(actor: ReconcileActor): Promise<{ resolved: number; open: number }> {
    const open: OpenRow[] = await this.prisma.bankTransaction.findMany({
      where: { resolvedAt: null },
      orderBy: { bookedAt: 'asc' },
      select: { id: true, bankRef: true, accountNo: true, bookedAt: true, amount: true, direction: true, description: true, counterparty: true, suggestion: true },
    });
    if (!open.length) return { resolved: 0, open: 0 };
    // «Шийтэд хөтлөгдсөн өдөр»-өөс хойш ажилтан шийтэд бичихээ больсон — итгэлтэй таньсныг систем өөрөө шинэ
    // төлбөр болгож, шийтэд бичнэ (эзэн 2026-11-10: «ухаалаг, бодит шийдвэр»)
    const throughBy = new Map((await this.prisma.bankCursor.findMany({ select: { accountNo: true, sheetThrough: true } })).map((c) => [c.accountNo, c.sheetThrough]));
    const afterSheet = (row: OpenRow) => {
      const t = row.accountNo ? throughBy.get(row.accountNo) : null;
      return !!t && ubDay(row.bookedAt) > t;
    };
    const toSheet: { row: OpenRow; parts: Part[] }[] = [];
    const idx = await this.matchIndex();
    const raw = open.map((row) => ({ row, s: this.suggest(row, idx) }));
    const kidIds = raw.flatMap(({ s }) => s.candidates.map((c) => c.studentId));
    const [paidUp, pool] = await Promise.all([this.paidUp(kidIds), this.existingPayments(kidIds)]);
    const planned: { row: OpenRow; s: RowSuggestion; parts: Part[] | null }[] = raw.map(({ row, s }) => {
      const f = dropPaidUp(s, ubDay(row.bookedAt), paidUp, (id) => this.recordedNear(pool, id, row.bookedAt));
      return { row, s: f, parts: this.autoParts(row, f) };
    });
    const toAllocate: { row: OpenRow; s: RowSuggestion; parts: Part[] }[] = [];
    const toSuggest: { id: string; s: RowSuggestion }[] = [];
    for (const { row, s, parts } of planned) {
      // Сургалтын хэсэг шийтийн төлбөртэй холбогдохгүй бол автоматаар шинэ төлбөр үүсгэхгүй
      if (parts && parts.every((p) => p.kind !== 'TUITION' || this.link(p, row, pool))) {
        toAllocate.push({ row, s, parts });
        continue;
      }
      if (parts && afterSheet(row)) {
        toAllocate.push({ row, s: { ...s, reason: `${s.reason}: шийтэд шинээр бичнэ` }, parts });
        toSheet.push({ row, parts });
        continue;
      }
      const combo = this.sheetCombo(row, s, pool);
      if (combo) toAllocate.push({ row, s: { ...s, reason: 'Ажилтан шийтэд бүртгэснээр' }, parts: combo });
      else toSuggest.push({ id: row.id, s: parts ? { ...s, unrecorded: true, reason: `${s.reason}: шийтэд бүртгэгдээгүй` } : { ...s, unrecorded: undefined } });
    }
    for (const part of chunks(toSuggest, 500)) await this.bulkSetSuggestion(part);
    let resolved = 0;
    for (const part of chunks(toAllocate, 200)) {
      try {
        resolved += await this.prisma.$transaction(async (tx) => this.writeAllocations(tx, part, actor, true), { timeout: 60_000 });
      } catch (e) {
        // Зэрэг ажиллалт (өөр хүн яг тэр мөрийг шийдсэн, төлбөр өөр хэсэгт холбогдсон) — энэ
        // багцыг бүхэлд нь буцаана; мөрүүд шийдэгдээгүй хэвээр, дараагийн ажиллалтад дахин.
        this.logger.warn(`Автомат хуваарилалтын багц алгасагдлаа: ${e instanceof Error ? e.message : e}`);
      }
    }
    // Шинээр үүссэн сургалтын төлбөрийг шийтэд бичнэ (амжилттай хуваарилагдсан мөрийг л)
    if (toSheet.length && this.demoSheet.enabled) {
      const done = new Set(
        (await this.prisma.bankTransaction.findMany({ where: { id: { in: toSheet.map((x) => x.row.id) }, resolvedAt: { not: null } }, select: { id: true } })).map((r) => r.id),
      );
      for (const { row, parts } of toSheet.filter((x) => done.has(x.row.id))) await this.writeSheet(row, parts);
    }
    return { resolved, open: toSuggest.length };
  }

  /**
   * Сургалтын хэсгүүдийг шийтэд бичиж, үр дүнг гүйлгээн дээр хадгална (хүн аль нүдэнд
   * бичигдсэнийг харна). «Шийтэд хөтлөгдсөн өдөр» хүртэлх гүйлгээг ДАХИН бичихгүй.
   */
  private async writeSheet(row: { id: string; accountNo?: string | null; bookedAt: Date }, parts: Part[]) {
    const kids = parts.filter((p) => p.kind === 'TUITION' && p.studentId).map((p) => ({ studentId: p.studentId!, amount: p.amount }));
    if (!kids.length || !this.demoSheet.enabled) return [];
    // Атомар эзэмшинэ: зэрэг ажиллалт эсвэл буцаасны дараах дахин хуваарилалт шийтэд ДАВХАР бичихгүй.
    // Нэг гүйлгээ шийтэд нэг л удаа бичигдэнэ (буцаасан бол тэр нүдийг ажилтан гараар засна).
    const claimed = await this.prisma.$executeRaw`
      UPDATE "BankTransaction" SET "suggestion" = COALESCE("suggestion", '{}'::jsonb) || '{"sheetWrites": "pending"}'::jsonb
      WHERE id = ${row.id} AND NOT (COALESCE("suggestion", '{}'::jsonb) ? 'sheetWrites')`;
    if (!claimed)
      return kids.map((k) => ({ studentId: k.studentId, ok: false, reason: 'Энэ гүйлгээг шийтэд өмнө нь бичсэн — шаардлагатай бол тэр нүдийг гараар засна уу' }));
    const through = row.accountNo ? (await this.prisma.bankCursor.findUnique({ where: { accountNo: row.accountNo }, select: { sheetThrough: true } }))?.sheetThrough : null;
    const writes =
      !through || ubDay(row.bookedAt) <= through
        ? kids.map((k) => ({
            studentId: k.studentId,
            ok: false,
            reason: through ? `${through.slice(5).replace('-', '/')} хүртэл ажилтан шийтэд хөтөлсөн тул бичсэнгүй` : '«Шийтэд хөтлөгдсөн өдөр» тэмдэглээгүй тул бичсэнгүй',
          }))
        : await this.demoSheet.writeTuition(kids, row.bookedAt);
    await this.prisma.$executeRaw`
      UPDATE "BankTransaction" SET "suggestion" = COALESCE("suggestion", '{}'::jsonb) || jsonb_build_object('sheetWrites', ${JSON.stringify(writes)}::jsonb)
      WHERE id = ${row.id}`;
    return writes;
  }

  /**
   * Ажилтан шийтэд аль хэдийн бүртгэсэн бол түүгээр шийднэ: санал болгосон
   * хүүхдүүдийн ±3 хоногийн, хуулгатай холбогдоогүй төлбөрүүдээс НИЙЛБЭР нь
   * гүйлгээний дүнтэй яг тэнцүү ГАНЦ хослол байвал — ах дүүгийн хамтын шилжүүлэг
   * (4,500,000 = 2,250,000 + 2,250,000), ижил нэртэй хүүхдүүдээс аль нь, нэг
   * шинжээр таарсныг шийтийн бүртгэл баталсан. Үлдэгдэл нь E1/E2 номын үнэ бол
   * (сургалт + ном) ном болгоно. Шинэ төлбөр ҮҮСГЭХГҮЙ, зөвхөн холбоно.
   */
  private sheetCombo(row: OpenRow, s: RowSuggestion, pool: ExistingPayment[]): Part[] | null {
    if (row.direction !== 'CREDIT' || s.decision === 'NONE' || s.held || (s.kind !== 'TUITION' && !s.split)) return null;
    const t = row.bookedAt.getTime();
    // Утганд нэр эсвэл утас нь бичигдсэн хүүхэд л (овог, данс ганцаараа хангалтгүй — 9/01-нд олон хүүхэд 350,000 төлдөг)
    const kids = [...new Set(s.candidates.filter((c) => c.signals.includes('NAME') || c.signals.includes('PHONE')).map((c) => c.studentId))];
    const options = kids.map((k) => pool.filter((p) => p.userId === k && Math.abs(p.at - t) <= LINK_WINDOW_MS).slice(0, 3));
    if (options.every((o) => !o.length)) return null;
    const found: { pays: ExistingPayment[]; rest: number }[] = [];
    const chosen: ExistingPayment[] = [];
    const walk = (i: number, sum: number) => {
      if (found.length > 1 || sum > row.amount) return; // ГАНЦ эсэхийг л мэдэхэд хангалттай
      if (i === kids.length) {
        const rest = row.amount - sum;
        if (chosen.length && (rest === 0 || (chosen.length === 1 && explainBooks(rest, 3, ['E1', 'E2']))))
          found.push({ pays: [...chosen], rest });
        return;
      }
      walk(i + 1, sum);
      for (const p of options[i]) {
        chosen.push(p);
        walk(i + 1, sum + p.amount);
        chosen.pop();
      }
    };
    walk(0, 0);
    if (found.length !== 1) return null;
    const { pays, rest } = found[0];
    for (const p of pays) pool.splice(pool.indexOf(p), 1);
    const parts: Part[] = pays.map((p) => ({ kind: 'TUITION', amount: p.amount, studentId: p.userId, paymentId: p.id }));
    if (rest > 0) parts.push({ kind: 'BOOK', amount: rest, studentId: pays[0].userId });
    return parts;
  }

  /** Хүүхдүүдийн шийтээс/гараар орсон, хуулгатай холбогдоогүй баталгаажсан төлбөрүүд. */
  private async existingPayments(studentIds: string[], db: Prisma.TransactionClient = this.prisma): Promise<ExistingPayment[]> {
    const ids = [...new Set(studentIds)];
    if (!ids.length) return [];
    const rows = await db.payment.findMany({
      where: { userId: { in: ids }, status: PaymentStatus.CONFIRMED, storePurchaseId: null, NOT: { id: { startsWith: 'bank_' } } },
      select: { id: true, userId: true, amount: true, paidAt: true, forMonth: true },
    });
    const linked = new Set(
      (await db.bankAllocation.findMany({ where: { paymentId: { in: rows.map((r) => r.id) }, revokedAt: null }, select: { paymentId: true } })).map(
        (a) => a.paymentId,
      ),
    );
    return rows
      .filter((r) => !linked.has(r.id))
      .map((r) => ({ id: r.id, userId: r.userId, amount: r.amount, at: (r.paidAt ?? new Date(`${r.forMonth ?? '1970-01'}-01T00:00:00+08:00`)).getTime() }));
  }

  /** Сургалтын хэсгийг шийтийн төлбөртэй холбоно (нэг хүүхэд, ижил дүн, ±3 хоног, хамгийн ойр). Pool-оос хасна. */
  private link(part: Part, row: { bookedAt: Date }, pool: ExistingPayment[]): boolean {
    if (part.kind !== 'TUITION' || !part.studentId) return false;
    const t = row.bookedAt.getTime();
    let best = -1;
    for (let i = 0; i < pool.length; i++) {
      const p = pool[i];
      if (p.userId !== part.studentId || p.amount !== part.amount || Math.abs(p.at - t) > LINK_WINDOW_MS) continue;
      if (best < 0 || Math.abs(p.at - t) < Math.abs(pool[best].at - t)) best = i;
    }
    if (best < 0) return false;
    part.paymentId = pool[best].id;
    pool.splice(best, 1);
    return true;
  }

  private async bulkSetSuggestion(items: { id: string; s: RowSuggestion }[]) {
    if (!items.length) return;
    const values = Prisma.join(items.map((i) => Prisma.sql`(${i.id}, ${JSON.stringify(i.s)}::jsonb)`));
    await this.prisma.$executeRaw`
      UPDATE "BankTransaction" t SET "suggestion" = CASE
          WHEN t."suggestion" ? 'sheetWrites' THEN v.s || jsonb_build_object('sheetWrites', t."suggestion"->'sheetWrites')
          ELSE v.s END
      FROM (VALUES ${values}) AS v(id, s) WHERE t.id = v.id AND t."resolvedAt" IS NULL`;
  }

  /**
   * Хэсгүүдийг бөөнөөр бичнэ: сургалтын хэсэг бүрд Payment CONFIRMED (банкны
   * огноогоор), BankAllocation, мөрийг «шийдэгдсэн» болгоно.
   */
  private async writeAllocations(
    tx: Prisma.TransactionClient,
    items: { row: OpenRow; s?: RowSuggestion; parts: Part[] }[],
    actor: ReconcileActor,
    auto: boolean,
  ): Promise<number> {
    if (auto) {
      // Санал тооцсоноос хойш өөр хүн/ажиллалт шийдсэн мөрийг алгасна (давхар хуваарилалтгүй)
      const ids = items.map((i) => i.row.id);
      const stillOpen = new Set(
        (await tx.$queryRaw<{ id: string }[]>`
          SELECT id FROM "BankTransaction" WHERE id IN (${Prisma.join(ids)}) AND "resolvedAt" IS NULL FOR UPDATE`).map((r) => r.id),
      );
      items = items.filter((i) => stillOpen.has(i.row.id));
      if (!items.length) return 0;
    }
    const payments: Prisma.PaymentCreateManyInput[] = [];
    const allocs: Prisma.BankAllocationCreateManyInput[] = [];
    const rowUpdates: { id: string; s: RowSuggestion | null; status: BankMatchStatus; uid: string | null }[] = [];
    for (const { row, s, parts } of items) {
      for (const p of parts) {
        const id = randomUUID();
        let paymentId: string | null = p.paymentId ?? null;
        if (p.kind === 'TUITION' && p.studentId && !paymentId) {
          paymentId = `bank_${id}`;
          payments.push({
            id: paymentId,
            userId: p.studentId,
            amount: p.amount,
            method: PaymentMethod.BANK_TRANSFER,
            status: PaymentStatus.CONFIRMED,
            description: `Банкны хуулга: ${row.description}`.slice(0, 500),
            forMonth: ubDay(row.bookedAt).slice(0, 7),
            paidAt: row.bookedAt,
            confirmedById: actor.id,
            clientRequestId: `bank:${id}`,
          });
        }
        allocs.push({ id, bankTxId: row.id, kind: p.kind, amount: p.amount, studentId: p.studentId, paymentId, auto, createdById: auto ? null : actor.id });
      }
      const tuitionKid = parts.find((p) => p.kind === 'TUITION')?.studentId ?? null;
      rowUpdates.push({
        id: row.id,
        s: s ?? null,
        status: auto ? BankMatchStatus.AUTO_MATCHED : tuitionKid ? BankMatchStatus.MANUAL_MATCHED : BankMatchStatus.IGNORED,
        uid: tuitionKid,
      });
    }
    if (payments.length) await tx.payment.createMany({ data: payments });
    if (allocs.length) await tx.bankAllocation.createMany({ data: allocs });
    const values = Prisma.join(
      rowUpdates.map((u) => Prisma.sql`(${u.id}, ${u.s ? JSON.stringify(u.s) : null}::jsonb, ${u.status}, ${u.uid})`),
    );
    const updated = await tx.$executeRaw`
      UPDATE "BankTransaction" t SET
        "resolvedAt" = NOW(),
        "resolvedById" = ${auto ? null : actor.id},
        "matchStatus" = v.status::"BankMatchStatus",
        "matchedUserId" = v.uid,
        -- Шийтэд бичсэн тэмдэг (sheetWrites) үлдэнэ — дахин хуваарилахад шийтэд давхар бичихгүй
        "suggestion" = CASE
          WHEN v.s IS NOT NULL AND t."suggestion" ? 'sheetWrites' THEN v.s || jsonb_build_object('sheetWrites', t."suggestion"->'sheetWrites')
          ELSE COALESCE(v.s, t."suggestion") END
      FROM (VALUES ${values}) AS v(id, s, status, uid)
      WHERE t.id = v.id AND (${!auto} OR t."resolvedAt" IS NULL)`;
    if (updated !== rowUpdates.length) throw new Error(`Хуваарилалт зөрлөө (${updated}/${rowUpdates.length}) — буцаалаа`);
    return updated;
  }

  // ── Гараар ────────────────────────────────────────────────────────────────

  async allocate(id: string, dto: AllocateDto, actor: ReconcileActor) {
    const row = await this.prisma.bankTransaction.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Гүйлгээ олдсонгүй');
    const parts: Part[] = dto.parts.map((p) => ({ kind: p.kind, amount: p.amount, studentId: p.studentId || null }));
    const sum = parts.reduce((t, p) => t + p.amount, 0);
    if (sum !== row.amount)
      throw new BadRequestException(`Хэсгүүдийн нийлбэр (${sum.toLocaleString('en-US')}₮) гүйлгээний дүнтэй (${row.amount.toLocaleString('en-US')}₮) тэнцүү байх ёстой`);
    for (const p of parts) {
      if (p.kind === 'TUITION' && !p.studentId) throw new BadRequestException('Сургалтын төлбөрт хүүхэд сонгоно уу');
      if (row.direction === 'DEBIT' && p.kind === 'TUITION') throw new BadRequestException('Зарлагыг сургалтын төлбөр болгож болохгүй');
      if (!STUDENT_PART.includes(p.kind)) p.studentId = null;
    }
    const kidIds = [...new Set(parts.map((p) => p.studentId).filter((x): x is string => !!x))];
    if (kidIds.length) {
      const found = await this.prisma.user.count({ where: { id: { in: kidIds }, role: 'STUDENT' } });
      if (found !== kidIds.length) throw new BadRequestException('Сонгосон хүүхэд олдсонгүй');
    }

    const before = await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "BankTransaction" WHERE id = ${id} FOR UPDATE`;
      const revoked = await this.revokeAllocations(tx, id, actor);
      // Шийтэд аль хэдийн байгаа бол холбоно, байхгүй бол шинэ төлбөр (хүн баталсан)
      const pool = await this.existingPayments(kidIds, tx); // tx дотор: дөнгөж цуцалсан холбоос дахин чөлөөтэй
      for (const p of parts) this.link(p, row, pool);
      await this.writeAllocations(tx, [{ row: row as OpenRow, parts }], actor, false);
      return revoked;
    });
    await this.learn(row, parts, +1);
    await this.audit.record({
      actorId: actor.id,
      actorRole: actor.role,
      action: before.length ? 'REALLOCATE' : 'ALLOCATE',
      entity: 'BankTransaction',
      entityId: id,
      before: before.length ? { parts: before } : null,
      after: { parts, note: dto.note ?? null },
      reason: dto.note,
    });
    // Сурсан данс/утас бусад мөрийг шийдэж магадгүй
    const auto = await this.resolveOpen(actor);
    const settled = row.accountNo ? await this.recomputeCursor(row.accountNo) : null;
    // Шийтэд бичих (SHEET_PAY_WRITE=1 жинхэнэ, эс бөгөөс DEMO_SHEET_ID хуулбар)
    const sheetWrites = await this.writeSheet(row, parts);
    return { ok: true, alsoResolved: auto.resolved, settledThrough: settled, sheetWrites };
  }

  async undo(id: string, actor: ReconcileActor) {
    const row = await this.prisma.bankTransaction.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Гүйлгээ олдсонгүй');
    if (!row.resolvedAt) throw new BadRequestException('Энэ гүйлгээ шийдэгдээгүй байна');
    const revoked = await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "BankTransaction" WHERE id = ${id} FOR UPDATE`;
      const r = await this.revokeAllocations(tx, id, actor);
      const held = { ...((row.suggestion as unknown as RowSuggestion) ?? {}), held: true };
      await tx.bankTransaction.update({
        where: { id },
        data: { resolvedAt: null, resolvedById: null, inSheet: false, matchStatus: BankMatchStatus.UNMATCHED, matchedUserId: null, suggestion: held as unknown as Prisma.InputJsonValue },
      });
      return r;
    });
    // Гараар хийсэн шийдвэрээс сурсныг буцаана (буруу сурсан холбоос дахин алдаа гаргахгүй)
    if (revoked.some((p) => !p.auto)) await this.learn(row, revoked, -1);
    await this.audit.record({ actorId: actor.id, actorRole: actor.role, action: 'UNDO', entity: 'BankTransaction', entityId: id, before: { parts: revoked } });
    const settled = row.accountNo ? await this.recomputeCursor(row.accountNo) : null;
    return { ok: true, settledThrough: settled };
  }

  /** Идэвхтэй хэсгүүдийг цуцлана (устгахгүй), сургалтын төлбөрийг REVERSED. */
  private async revokeAllocations(tx: Prisma.TransactionClient, bankTxId: string, actor: ReconcileActor) {
    const active = await tx.bankAllocation.findMany({ where: { bankTxId, revokedAt: null } });
    if (!active.length) return [];
    await tx.bankAllocation.updateMany({ where: { id: { in: active.map((a) => a.id) } }, data: { revokedAt: new Date(), revokedById: actor.id } });
    // Зөвхөн хуулгаас ҮҮССЭН төлбөрийг буцаана. Шийтээс орсон төлбөртэй холбосон бол
    // холбоосыг л цуцална — тэр төлбөр бодитоор төлөгдсөн хэвээр. Хуулгын төлбөр эрх
    // (UserPass), худалдан авалттай холбогддоггүй тул шууд REVERSED.
    const paymentIds = active.map((a) => a.paymentId).filter((x): x is string => !!x && x.startsWith('bank_'));
    if (paymentIds.length)
      await tx.payment.updateMany({ where: { id: { in: paymentIds }, status: PaymentStatus.CONFIRMED }, data: { status: PaymentStatus.REVERSED } });
    return active.map((a) => ({ kind: a.kind as AllocKind, amount: a.amount, studentId: a.studentId, auto: a.auto }));
  }

  private async learn(row: { counterparty: string | null; description: string }, parts: { kind: AllocKind; studentId: string | null }[], delta: 1 | -1) {
    const kids = [...new Set(parts.filter((p) => STUDENT_PART.includes(p.kind) && p.studentId).map((p) => p.studentId!))];
    if (!kids.length) return;
    const phones = phonesIn(row.description);
    const keys: { kind: 'ACCOUNT' | 'PHONE'; value: string }[] = [];
    if (row.counterparty) keys.push({ kind: 'ACCOUNT', value: row.counterparty });
    if (phones.length === 1) keys.push({ kind: 'PHONE', value: phones[0] });
    for (const k of keys)
      for (const studentId of kids)
        await this.prisma.bankPayerHint.upsert({
          where: { kind_value_studentId: { kind: k.kind, value: k.value, studentId } },
          create: { kind: k.kind, value: k.value, studentId, count: Math.max(delta, 0) },
          update: { count: { increment: delta }, lastAt: new Date() },
        });
  }

  // ── «Шийтэд хөтлөгдсөн» (шилжилтийн үе, эзэн 2026-11-06) ──────────────────
  //
  // Вэб ажиллаж эхлэхээс өмнөх гүйлгээг ажилтан шийтэд аль хэдийн бүртгэсэн. Систем
  // тэдгээрийг шийтийн төлбөртэй тулгаж чадаагүй бол (дүн хувааж/нийлүүлж, өөр
  // өдрөөр бичсэн) «Шийдэх»-д дахин харуулахгүй. Шийтэд ижил дүнтэй ±3 хоногийн
  // бүртгэл огт олдоогүйг `sheetMissing` гэж тэмдэглэнэ — мартагдсан төлбөр нуугдахгүй.

  async markSheetThrough(through: string, actor: ReconcileActor) {
    // Бодит огноо эсэх (2026-02-31 биш) — хадгалахаас ӨМНӨ
    if (!/^\d{4}-\d{2}-\d{2}$/.test(through) || new Date(`${through}T00:00:00Z`).toISOString().slice(0, 10) !== through)
      throw new BadRequestException('Огноо буруу байна');
    if (through > todayKeyUB()) throw new BadRequestException('Ирээдүйн өдөр сонгох боломжгүй');
    const cursors = await this.prisma.bankCursor.findMany();
    if (!cursors.length) throw new BadRequestException('Эхлээд хуулга оруулна уу');
    // Өдрийг өмнө рүү нь өөрчилбөл түүнээс хойш «шийтэд хөтлөгдсөн» гэж нуусныг буцааж нээнэ
    const bound = new Date(`${shiftDay(through, 1)}T00:00:00+08:00`);
    const reopened = await this.prisma.bankTransaction.updateMany({
      where: { inSheet: true, bookedAt: { gte: bound } },
      data: { inSheet: false, resolvedAt: null, resolvedById: null, matchStatus: BankMatchStatus.UNMATCHED },
    });
    await this.prisma.bankCursor.updateMany({ data: { sheetThrough: through } });
    if (reopened.count) await this.resolveOpen(actor);
    const marked = await this.applySheetThrough(actor);
    for (const c of cursors) await this.recomputeCursor(c.accountNo);
    await this.audit.record({ actorId: actor.id, actorRole: actor.role, action: 'SHEET_THROUGH', entity: 'BankCursor', entityId: through, after: { through, marked, reopened: reopened.count } });
    return { marked, reopened: reopened.count };
  }

  /**
   * sheetThrough хүртэлх шийдэгдээгүй мөрийг «шийтэд хөтлөгдсөн» болгоно. Шийтэд
   * байгааг БАТАЛСАН эсэх: санал болгосон хүүхдийн ижил дүнтэй, ±3 хоногийн,
   * хуулгатай холбогдоогүй төлбөр (нэг төлбөр нэг л мөрт). Баталж чадаагүйг
   * `sheetMissing` — «шалгана уу» (өөр хүүхдийн ижил дүн тооцогдохгүй).
   */
  private async applySheetThrough(actor: ReconcileActor): Promise<number> {
    let total = 0;
    for (const c of await this.prisma.bankCursor.findMany({ where: { sheetThrough: { not: null } } })) {
      const bound = new Date(`${shiftDay(c.sheetThrough!, 1)}T00:00:00+08:00`);
      const rows = (
        await this.prisma.bankTransaction.findMany({
          where: { resolvedAt: null, accountNo: c.accountNo, bookedAt: { lt: bound } },
          orderBy: { bookedAt: 'asc' },
          select: { id: true, amount: true, bookedAt: true, direction: true, suggestion: true },
        })
        // Буцаасан (held) мөр ч орно: тэр өдрийг хүртэл ажилтан бүгдийг шийтэд хөтөлсөн (эзэн 2026-11-10)
      );
      if (!rows.length) continue;
      const kidsOf = (r: (typeof rows)[number]) => ((r.suggestion as RowSuggestion | null)?.candidates ?? []).map((x) => x.studentId);
      const pool = await this.existingPayments(rows.flatMap(kidsOf));
      const confirmed: string[] = [];
      const missing: string[] = [];
      for (const r of rows) {
        const kids = new Set(kidsOf(r));
        const t = r.bookedAt.getTime();
        const i = r.direction === 'CREDIT' ? pool.findIndex((p) => kids.has(p.userId) && p.amount === r.amount && Math.abs(p.at - t) <= LINK_WINDOW_MS) : -1;
        if (i >= 0 || r.direction === 'DEBIT') {
          if (i >= 0) pool.splice(i, 1);
          confirmed.push(r.id);
        } else missing.push(r.id);
      }
      for (const [ids, miss] of [[confirmed, false], [missing, true]] as const) {
        if (!ids.length) continue;
        total += await this.prisma.$executeRaw`
          UPDATE "BankTransaction" t SET
            "resolvedAt" = NOW(), "resolvedById" = ${actor.id}, "inSheet" = true,
            "matchStatus" = 'IGNORED'::"BankMatchStatus",
            "suggestion" = COALESCE(t."suggestion", '{}'::jsonb) || jsonb_build_object('sheetMissing', ${miss}::boolean)
          WHERE t.id IN (${Prisma.join(ids)}) AND t."resolvedAt" IS NULL`;
      }
    }
    return total;
  }

  // ── «Бүрэн шийдсэн өдөр» ──────────────────────────────────────────────────

  /** Хамгийн эртний шийдэгдээгүй мөрийн өмнөх өдөр, хуулгын бүтэн хамарсан өдрөөс хэтрэхгүй. */
  private async recomputeCursor(accountNo: string): Promise<string | null> {
    const cur = await this.prisma.bankCursor.findUnique({ where: { accountNo } });
    if (!cur) return null;
    const firstOpen = await this.prisma.bankTransaction.findFirst({
      where: { accountNo, resolvedAt: null },
      orderBy: { bookedAt: 'asc' },
      select: { bookedAt: true },
    });
    const openBound = firstOpen ? shiftDay(ubDay(firstOpen.bookedAt), -1) : cur.coveredThrough;
    const settled = openBound < cur.coveredThrough ? openBound : cur.coveredThrough;
    if (settled !== cur.settledThrough) await this.prisma.bankCursor.update({ where: { accountNo }, data: { settledThrough: settled } });
    return settled;
  }

  // ── Унших ─────────────────────────────────────────────────────────────────

  async overview() {
    const [cursors, all, manual, tuition, other, expense, sheet, sheetCheck, last] = await Promise.all([
      this.prisma.bankCursor.findMany({ orderBy: { accountNo: 'asc' } }),
      this.prisma.bankTransaction.count(),
      this.prisma.bankTransaction.count({ where: this.laneWhere('manual') }),
      this.prisma.bankTransaction.count({ where: this.laneWhere('tuition') }),
      this.prisma.bankTransaction.count({ where: this.laneWhere('other') }),
      this.prisma.bankTransaction.count({ where: this.laneWhere('expense') }),
      this.prisma.bankTransaction.count({ where: this.laneWhere('sheet') }),
      this.prisma.bankTransaction.count({ where: { inSheet: true, suggestion: { path: ['sheetMissing'], equals: true } } }),
      this.prisma.bankTransaction.findFirst({ orderBy: { importedAt: 'desc' }, select: { importedAt: true } }),
    ]);
    return {
      cursors: cursors.map((c) => ({ accountNo: c.accountNo, settledThrough: c.settledThrough, coveredThrough: c.coveredThrough, sheetThrough: c.sheetThrough })),
      counts: { all, manual, tuition, other, expense, sheet },
      /** Шийтэд хөтлөгдсөн гэж нуусан ч шийтэд байгааг баталж чадаагүй — шалгах */
      sheetCheck,
      lastImportAt: last?.importedAt ?? null,
      /** Гараар оноосон сургалтын төлбөр бичигдэх шийт (демо бол хуулбар) */
      sheetWrite: this.demoSheet.enabled ? { url: `https://docs.google.com/spreadsheets/d/${this.demoSheet.sheetId}/edit`, demo: this.demoSheet.demo } : null,
    };
  }

  private laneWhere(lane: RowLane): Prisma.BankTransactionWhereInput {
    const tuitionAlloc = { some: { kind: 'TUITION' as const, revokedAt: null } };
    switch (lane) {
      case 'all':
        return {};
      case 'manual':
        return { resolvedAt: null };
      case 'tuition':
        return { resolvedAt: { not: null }, allocations: tuitionAlloc };
      case 'other':
        return { resolvedAt: { not: null }, inSheet: false, direction: 'CREDIT', allocations: { none: { kind: 'TUITION', revokedAt: null } } };
      case 'expense':
        return { resolvedAt: { not: null }, inSheet: false, direction: 'DEBIT' };
      case 'sheet':
        return { inSheet: true };
    }
  }

  async listRows(query: ListRowsQueryDto) {
    const q = query.q?.trim();
    const amount = q && /^[\d,.\s]+$/.test(q) ? parseInt(q.replace(/\D/g, ''), 10) : null;
    const where: Prisma.BankTransactionWhereInput = {
      ...this.laneWhere(query.lane),
      ...(query.lane === 'sheet' && query.check ? { suggestion: { path: ['sheetMissing'], equals: true } } : {}),
      ...(q ? (amount ? { amount } : { description: { contains: q, mode: 'insensitive' } }) : {}),
    };
    const [total, rows] = await Promise.all([
      this.prisma.bankTransaction.count({ where }),
      this.prisma.bankTransaction.findMany({
        where,
        // Бүгд, шийдэх — хуулгын дарааллаар (эрт нь дээр)
        orderBy: [{ bookedAt: query.lane === 'manual' || query.lane === 'all' ? 'asc' : 'desc' }, { id: 'asc' }],
        take: query.limit ?? 50,
        skip: query.offset ?? 0,
        select: {
          id: true,
          bookedAt: true,
          amount: true,
          direction: true,
          description: true,
          counterparty: true,
          suggestion: true,
          resolvedAt: true,
          resolvedById: true,
          inSheet: true,
          allocations: { where: { revokedAt: null }, select: { id: true, kind: true, amount: true, studentId: true, auto: true, paymentId: true } },
        },
      }),
    ]);
    // Санал хадгалагдсанаас хойш хүүхэд бүрэн төлсөн байж болно — харуулахдаа дахин шүүнэ
    const open = rows.filter((r) => !r.resolvedAt);
    const openIds = open.flatMap((r) => ((r.suggestion as RowSuggestion | null)?.candidates ?? []).map((c) => c.studentId));
    const [paidUp, pool] = openIds.length ? await Promise.all([this.paidUp(openIds), this.existingPayments(openIds)]) : [new Map<string, string>(), []];
    for (const r of open)
      if (r.suggestion)
        r.suggestion = dropPaidUp(r.suggestion as unknown as RowSuggestion, ubDay(r.bookedAt), paidUp, (id) => this.recordedNear(pool, id, r.bookedAt)) as never;
    const ids = new Set<string>();
    for (const r of rows) {
      for (const a of r.allocations) if (a.studentId) ids.add(a.studentId);
      for (const c of (r.suggestion as RowSuggestion | null)?.candidates ?? []) ids.add(c.studentId);
    }
    const accounts = await this.accountInfo([...new Set(rows.map((r) => r.counterparty).filter((a): a is string => !!a))]);
    for (const a of accounts.values()) for (const id of a.studentIds) ids.add(id);
    const students = await this.studentCards([...ids]);
    // Хүүхэд бүрийн шийтэд бүртгэгдсэн, хуулгатай холбогдоогүй ойрын төлбөр (дээрх pool) — хуваахдаа харна
    const nearby = (studentId: string, at: Date) =>
      pool
        .filter((p) => p.userId === studentId && Math.abs(p.at - at.getTime()) <= LINK_WINDOW_MS)
        .map((p) => ({ amount: p.amount, date: ubDay(new Date(p.at)) }));
    return {
      total,
      items: rows.map((r) => {
        const s = r.suggestion as RowSuggestion | null;
        return {
          id: r.id,
          bookedAt: r.bookedAt,
          amount: r.amount,
          direction: r.direction,
          description: r.description,
          counterparty: r.counterparty,
          account: (() => {
            const a = r.counterparty ? accounts.get(r.counterparty) : undefined;
            return a ? { owner: a.owner, txCount: a.txCount, students: a.studentIds.map((id) => students.get(id)).filter(Boolean) } : null;
          })(),
          resolvedAt: r.resolvedAt,
          resolvedBySystem: !!r.resolvedAt && !r.resolvedById,
          inSheet: r.inSheet,
          sheetMissing: r.inSheet && !!(r.suggestion as { sheetMissing?: boolean } | null)?.sheetMissing,
          sheetWrites: ((w) => (Array.isArray(w) ? w : []))((r.suggestion as { sheetWrites?: unknown } | null)?.sheetWrites),
          suggestion: s && {
            decision: s.decision,
            kind: s.kind,
            kindLabel: ALLOC_LABEL[s.kind],
            confident: s.confident,
            split: s.split ?? null,
            reason: s.reason,
            unrecorded: !!s.unrecorded,
            hiddenPaidUp: s.hiddenPaidUp ?? 0,
            candidates: s.candidates.map((c) => ({
              ...c,
              student: students.get(c.studentId) ?? null,
              sheetPays: r.resolvedAt ? [] : nearby(c.studentId, r.bookedAt),
            })),
          },
          allocations: r.allocations.map(({ paymentId, ...a }) => ({
            ...a,
            kindLabel: ALLOC_LABEL[a.kind as AllocKind],
            student: a.studentId ? students.get(a.studentId) ?? null : null,
            // Шийтээс аль хэдийн орсон төлбөртэй холбосон (шинэ төлбөр үүсгээгүй)
            inSheet: !!paymentId && !paymentId.startsWith('bank_'),
          })),
        };
      }),
    };
  }

  async searchStudents(q: string) {
    const t = q.trim();
    if (t.length < 2) return { items: [] };
    const digits = t.replace(/\D/g, '');
    const words = t.split(/\s+/).filter(Boolean);
    const users = await this.prisma.user.findMany({
      where: {
        role: 'STUDENT',
        studentProfile: { isNot: null },
        OR: [
          ...(digits.length >= 4
            ? [{ phone: { contains: digits } }, { studentProfile: { fatherPhone: { contains: digits } } }, { studentProfile: { motherPhone: { contains: digits } } }]
            : []),
          {
            AND: words.map((w) => ({
              OR: [{ firstName: { contains: w, mode: 'insensitive' as const } }, { lastName: { contains: w, mode: 'insensitive' as const } }],
            })),
          },
        ],
      },
      take: 12,
      orderBy: [{ archivedAt: { sort: 'desc', nulls: 'first' } }, { firstName: 'asc' }],
      select: { id: true },
    });
    const [cards, paidUp] = await Promise.all([this.studentCards(users.map((u) => u.id)), this.paidUp(users.map((u) => u.id))]);
    // Жилийн төлбөрөө бүрэн төлсөн хүүхэд хайлтад гарна (ном гэх мэт), гэхдээ тэмдэгтэй, доор нь
    const items = users
      .map((u) => cards.get(u.id))
      .filter((c): c is NonNullable<typeof c> => !!c)
      .map((c) => ({ ...c, paidUp: paidUp.has(c.id) }))
      .sort((a, b) => Number(a.paidUp) - Number(b.paidUp));
    return { items };
  }

  /**
   * Харьцсан дансны эзэмшигч. Хаан банкны хуулгад эзэмшигчийн багана байхгүй тул тэр
   * данснаас ирсэн гүйлгээний «ХААНААС: … НЭР» хэсгээс хамгийн олон давтагдсан нэрийг
   * авна (өөр банкнаас бол нэр мэдэгдэхгүй). Өмнө нь энэ дансыг оноосон хүүхдүүд ч хамт.
   */
  private async accountInfo(accounts: string[]) {
    const out = new Map<string, { owner: string | null; txCount: number; studentIds: string[] }>();
    if (!accounts.length) return out;
    const [txs, allocs] = await Promise.all([
      this.prisma.bankTransaction.findMany({
        where: { counterparty: { in: accounts }, direction: 'CREDIT' },
        select: { counterparty: true, description: true },
      }),
      // Автоматаар (шийттэй тулгаж) оноосон нь ч орно — сурсан дансаас (BankPayerHint) бүрэн
      this.prisma.bankAllocation.findMany({
        where: { revokedAt: null, studentId: { not: null }, bankTx: { counterparty: { in: accounts } } },
        select: { studentId: true, bankTx: { select: { counterparty: true } } },
      }),
    ]);
    const names = new Map<string, Map<string, number>>();
    for (const t of txs) {
      const acc = t.counterparty!;
      const cur = out.get(acc) ?? { owner: null, txCount: 0, studentIds: [] };
      cur.txCount++;
      out.set(acc, cur);
      const sender = splitSender(t.description).sender.replace(/\s+/g, ' ').trim().toUpperCase();
      if (!/\p{L}{2,}/u.test(sender)) continue;
      const m = names.get(acc) ?? new Map<string, number>();
      m.set(sender, (m.get(sender) ?? 0) + 1);
      names.set(acc, m);
    }
    for (const [acc, m] of names) out.get(acc)!.owner = [...m].sort((a, b) => b[1] - a[1])[0][0];
    const kids = new Map<string, Map<string, number>>();
    for (const a of allocs) {
      const m = kids.get(a.bankTx.counterparty!) ?? new Map<string, number>();
      m.set(a.studentId!, (m.get(a.studentId!) ?? 0) + 1);
      kids.set(a.bankTx.counterparty!, m);
    }
    for (const [acc, m] of kids) {
      const cur = out.get(acc);
      if (cur) cur.studentIds = [...m].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([id]) => id);
    }
    return out;
  }

  /**
   * «⋯» дэлгэрэнгүй: холбоо барих утас (өөрийн, аав, ээж), сургууль, мөн энэ хүүхдэд
   * хуулгаас оноосон бүх гүйлгээ — хэзээ, ямар данснаас, хэн илгээсэн. Сарын
   * төлбөрийн блокийг вэб `payments/ledger/student/:id`-ээс авна.
   */
  async studentDetail(id: string) {
    const u = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        role: true,
        firstName: true,
        lastName: true,
        phone: true,
        archivedAt: true,
        studentProfile: { select: { fatherPhone: true, motherPhone: true, guardianNote: true, school: true, grade: true, branch: true } },
      },
    });
    if (!u || u.role !== 'STUDENT') throw new NotFoundException('Хүүхэд олдсонгүй');
    const [cards, allocs, hints] = await Promise.all([
      this.studentCards([id]),
      this.prisma.bankAllocation.findMany({
        where: { studentId: id, revokedAt: null },
        orderBy: { createdAt: 'desc' },
        take: 50,
        select: {
          id: true,
          bankTxId: true,
          kind: true,
          amount: true,
          auto: true,
          paymentId: true,
          bankTx: { select: { bookedAt: true, amount: true, description: true, counterparty: true } },
        },
      }),
      this.prisma.bankPayerHint.findMany({ where: { studentId: id, count: { gt: 0 } }, orderBy: { count: 'desc' }, select: { kind: true, value: true, count: true } }),
    ]);
    const p = u.studentProfile;
    return {
      student: {
        ...cards.get(id)!,
        phone: u.phone,
        fatherPhone: p?.fatherPhone ?? null,
        motherPhone: p?.motherPhone ?? null,
        guardianNote: p?.guardianNote ?? null,
        school: p?.school ?? null,
        grade: p?.grade ?? null,
        branch: p?.branch ?? null,
      },
      bank: allocs
        .sort((a, b) => b.bankTx.bookedAt.getTime() - a.bankTx.bookedAt.getTime())
        .map((a) => {
          const { main, sender } = splitSender(a.bankTx.description);
          return {
            id: a.id,
            bankTxId: a.bankTxId,
            kind: a.kind,
            kindLabel: ALLOC_LABEL[a.kind as AllocKind],
            amount: a.amount,
            txAmount: a.bankTx.amount,
            bookedAt: a.bankTx.bookedAt,
            description: main.trim(),
            sender: sender.trim() || null,
            counterparty: a.bankTx.counterparty,
            auto: a.auto,
            paymentId: a.paymentId,
            inSheet: !!a.paymentId && !a.paymentId.startsWith('bank_'),
          };
        }),
      payers: hints.map((h) => ({ kind: h.kind as 'ACCOUNT' | 'PHONE', value: h.value, count: h.count })),
    };
  }

  /** Хүүхдийн товч мэдээлэл: нэр, суудаг анги, гарсан эсэх. */
  private async studentCards(ids: string[]) {
    const out = new Map<string, { id: string; name: string; classroom: string | null; archived: boolean; phones: { label: string; value: string }[] }>();
    if (!ids.length) return out;
    const users = await this.prisma.user.findMany({
      where: { id: { in: ids } },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        archivedAt: true,
        phone: true,
        studentProfile: { select: { fatherPhone: true, motherPhone: true } },
        enrollments: {
          where: { leftAt: null },
          orderBy: { joinedAt: 'desc' },
          select: { classroom: { select: { name: true, type: true, archived: true } } },
        },
      },
    });
    for (const u of users)
      out.set(u.id, {
        id: u.id,
        name: `${u.lastName} ${u.firstName}`.trim(),
        classroom: primaryEnrollment(u.enrollments)?.classroom.name ?? null,
        archived: !!u.archivedAt,
        // Тулгахад: хүүхдийн өөрийн, аав, ээжийн утас (гүйлгээний утгатай шууд харьцуулна)
        phones: (
          [
            ['Өөрийн', u.phone],
            ['Аав', u.studentProfile?.fatherPhone],
            ['Ээж', u.studentProfile?.motherPhone],
          ] as const
        )
          .filter(([, v]) => !!v)
          .map(([label, value]) => ({ label, value: value! })),
      });
    return out;
  }
}
