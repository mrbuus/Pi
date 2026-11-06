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

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Prisma } from '../generated/prisma/client';
import { BankMatchStatus, PaymentMethod, PaymentStatus } from '../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { primaryEnrollment } from '../payments/ledger-load';
import { todayKeyUB } from '../payments/ledger';
import { coveredThrough, parseKhanStatement, readXlsxGrid, shiftDay, StatementFormatError } from './khan-statement';
import {
  buildMatchIndex,
  matchTransaction,
  normalizePhone,
  phonesIn,
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
}

type OpenRow = {
  id: string;
  bankRef: string;
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
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
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
    const settled = await this.recomputeCursor(accountNo);
    const summary = {
      rows: rows.length,
      newRows: inserted,
      duplicates: fresh.length - inserted,
      beforeSettled: rows.length - fresh.length,
      autoResolved: auto.resolved,
      open: auto.open,
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
      select: { id: true, bankRef: true, bookedAt: true, amount: true, direction: true, description: true, counterparty: true, suggestion: true },
    });
    if (!open.length) return { resolved: 0, open: 0 };
    const idx = await this.matchIndex();
    const planned: { row: OpenRow; s: RowSuggestion; parts: Part[] | null }[] = open.map((row) => {
      const s = this.suggest(row, idx);
      return { row, s, parts: this.autoParts(row, s) };
    });
    const pool = await this.existingPayments(
      planned.flatMap((p) => [...(p.parts ?? []).map((x) => x.studentId), ...p.s.candidates.map((c) => c.studentId)]).filter((x): x is string => !!x),
    );
    const toAllocate: { row: OpenRow; s: RowSuggestion; parts: Part[] }[] = [];
    const toSuggest: { id: string; s: RowSuggestion }[] = [];
    for (const { row, s, parts } of planned) {
      // Сургалтын хэсэг шийтийн төлбөртэй холбогдохгүй бол автоматаар шинэ төлбөр үүсгэхгүй
      if (parts && parts.every((p) => p.kind !== 'TUITION' || this.link(p, row, pool))) {
        toAllocate.push({ row, s, parts });
        continue;
      }
      const combo = this.sheetCombo(row, s, pool);
      if (combo) toAllocate.push({ row, s: { ...s, reason: 'Ажилтан шийтэд бүртгэснээр' }, parts: combo });
      else toSuggest.push({ id: row.id, s: parts ? { ...s, unrecorded: true, reason: `${s.reason}: шийтэд бүртгэгдээгүй` } : { ...s, unrecorded: undefined } });
    }
    for (const part of chunks(toSuggest, 500)) await this.bulkSetSuggestion(part);
    for (const part of chunks(toAllocate, 200))
      await this.prisma.$transaction(async (tx) => this.writeAllocations(tx, part, actor, true), { timeout: 60_000 });
    return { resolved: toAllocate.length, open: toSuggest.length };
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
      UPDATE "BankTransaction" t SET "suggestion" = v.s
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
  ) {
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
    await tx.$executeRaw`
      UPDATE "BankTransaction" t SET
        "resolvedAt" = NOW(),
        "resolvedById" = ${auto ? null : actor.id},
        "matchStatus" = v.status::"BankMatchStatus",
        "matchedUserId" = v.uid,
        "suggestion" = COALESCE(v.s, t."suggestion")
      FROM (VALUES ${values}) AS v(id, s, status, uid) WHERE t.id = v.id`;
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
    return { ok: true, alsoResolved: auto.resolved, settledThrough: settled };
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
        data: { resolvedAt: null, resolvedById: null, matchStatus: BankMatchStatus.UNMATCHED, matchedUserId: null, suggestion: held as unknown as Prisma.InputJsonValue },
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
    const [cursors, manual, tuition, other, expense, last] = await Promise.all([
      this.prisma.bankCursor.findMany({ orderBy: { accountNo: 'asc' } }),
      this.prisma.bankTransaction.count({ where: this.laneWhere('manual') }),
      this.prisma.bankTransaction.count({ where: this.laneWhere('tuition') }),
      this.prisma.bankTransaction.count({ where: this.laneWhere('other') }),
      this.prisma.bankTransaction.count({ where: this.laneWhere('expense') }),
      this.prisma.bankTransaction.findFirst({ orderBy: { importedAt: 'desc' }, select: { importedAt: true } }),
    ]);
    return {
      cursors: cursors.map((c) => ({ accountNo: c.accountNo, settledThrough: c.settledThrough, coveredThrough: c.coveredThrough })),
      counts: { manual, tuition, other, expense },
      lastImportAt: last?.importedAt ?? null,
    };
  }

  private laneWhere(lane: RowLane): Prisma.BankTransactionWhereInput {
    const tuitionAlloc = { some: { kind: 'TUITION' as const, revokedAt: null } };
    switch (lane) {
      case 'manual':
        return { resolvedAt: null };
      case 'tuition':
        return { resolvedAt: { not: null }, allocations: tuitionAlloc };
      case 'other':
        return { resolvedAt: { not: null }, direction: 'CREDIT', allocations: { none: { kind: 'TUITION', revokedAt: null } } };
      case 'expense':
        return { resolvedAt: { not: null }, direction: 'DEBIT' };
    }
  }

  async listRows(query: ListRowsQueryDto) {
    const q = query.q?.trim();
    const amount = q && /^[\d,.\s]+$/.test(q) ? parseInt(q.replace(/\D/g, ''), 10) : null;
    const where: Prisma.BankTransactionWhereInput = {
      ...this.laneWhere(query.lane),
      ...(q ? (amount ? { amount } : { description: { contains: q, mode: 'insensitive' } }) : {}),
    };
    const [total, rows] = await Promise.all([
      this.prisma.bankTransaction.count({ where }),
      this.prisma.bankTransaction.findMany({
        where,
        orderBy: { bookedAt: query.lane === 'manual' ? 'asc' : 'desc' },
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
          allocations: { where: { revokedAt: null }, select: { id: true, kind: true, amount: true, studentId: true, auto: true, paymentId: true } },
        },
      }),
    ]);
    const ids = new Set<string>();
    for (const r of rows) {
      for (const a of r.allocations) if (a.studentId) ids.add(a.studentId);
      for (const c of (r.suggestion as RowSuggestion | null)?.candidates ?? []) ids.add(c.studentId);
    }
    const students = await this.studentCards([...ids]);
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
          resolvedAt: r.resolvedAt,
          resolvedBySystem: !!r.resolvedAt && !r.resolvedById,
          suggestion: s && {
            decision: s.decision,
            kind: s.kind,
            kindLabel: ALLOC_LABEL[s.kind],
            confident: s.confident,
            split: s.split ?? null,
            reason: s.reason,
            unrecorded: !!s.unrecorded,
            candidates: s.candidates.map((c) => ({ ...c, student: students.get(c.studentId) ?? null })),
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
    const cards = await this.studentCards(users.map((u) => u.id));
    return { items: users.map((u) => cards.get(u.id)).filter(Boolean) };
  }

  /** Хүүхдийн товч мэдээлэл: нэр, суудаг анги, гарсан эсэх. */
  private async studentCards(ids: string[]) {
    const out = new Map<string, { id: string; name: string; classroom: string | null; archived: boolean }>();
    if (!ids.length) return out;
    const users = await this.prisma.user.findMany({
      where: { id: { in: ids } },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        archivedAt: true,
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
      });
    return out;
  }
}
