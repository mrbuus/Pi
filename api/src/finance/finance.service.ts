import { StaffCapabilityService } from '../staff-capabilities/staff-capability.service';
import { financeMonthBounds, exactMoney, sumMoney } from './month-bounds';
import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { Prisma } from '../generated/prisma/client';

export interface FinanceActor {
  id: string;
  role: string;
}

export interface IncomeBreakdown {
  trainingFees: number; // сургалтын төлбөр (Payment)
  exams: number; // шалгалтын төлбөр (Purchase)
  books: number; // номын төлбөр (Purchase)
  other: number; // бусад
}

export interface ExpenseBreakdown {
  salary: number; // цалин
  rent: number; // ааш
  utilities: number; // коммунал
  marketing: number; // сурталчилга
  materials: number; // материал
  equipment: number; // тоног төхөөрөмж
  other: number; // бусад
}

export interface FinanceReport {
  period: string; // "2026-08" эсвэл "2026-08-01...2026-08-31"
  income: IncomeBreakdown;
  totalIncome: number;
  expenses: ExpenseBreakdown;
  totalExpenses: number;
  netProfit: number;
  previousNetProfit: number | null;
  profitChange: number | null; // Эцсийн сартай харьцуулалт
  incomeReconciliationRequired: number; // ambiguous legacy settlements needing allocation review
  targetIncome: number | null; // ёстой орлого (түүнийг тооцохын тулд мета шаардлага)
  collectionRate: number | null; // % — цуглуулалтын хувь
}

@Injectable()
export class FinanceService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
    private capabilities: StaffCapabilityService,
  ) {}

  private async assertFinance(actor: FinanceActor) {
    if (actor.role !== 'ADMIN' && actor.role !== 'TEACHER_PLUS') throw new ForbiddenException('Санхүүгийн ажилтны эрх шаардлагатай');
    await this.capabilities.assert(actor.id, 'finance.manage');
  }

  /**
   * Сар буюу хугацааны хооронд нэгдсэн орлого/зарлагын тайлан
   * @param yearMonth "2026-08" форматтай сар
   * @returns FinanceReport объект
   */
  async getMonthlyReport(yearMonth: string): Promise<FinanceReport> {
    const bounds = financeMonthBounds(yearMonth);
    const settled = await this.aggregateIncome(bounds.start, bounds.end);
    const income = settled.income;
    const totalIncome = sumMoney(Object.values(income));
    const expenses = await this.aggregateExpenses(bounds.dateStart, bounds.dateEnd);
    const totalExpenses = sumMoney(Object.values(expenses));
    const netProfit = sumMoney([totalIncome, -totalExpenses]);
    const previous = await this.aggregateIncome(bounds.previousStart, bounds.start);
    const prevExpenses = await this.aggregateExpenses(bounds.previousDateStart, bounds.dateStart);
    const previousNetProfit = sumMoney([sumMoney(Object.values(previous.income)), -sumMoney(Object.values(prevExpenses))]);
    const profitChange = sumMoney([netProfit, -previousNetProfit]);

    // Цуглуулалтын хувь (target орлого – нийт Payment-ны ёстой хэмжээ)
    // Хэрэвээ мета эсвэл эх сурвалж байхгүй бол null
    const collectionRate = null; // TODO: target шалгалт хийх

    return {
      period: yearMonth,
      incomeReconciliationRequired: settled.reconciliationRequired,
      income,
      totalIncome,
      expenses,
      totalExpenses,
      netProfit,
      previousNetProfit,
      profitChange,
      targetIncome: null,
      collectionRate,
    };
  }

  /**
   * Дугаарын агрегат сар дахь нэгд асуу
   * @private
   */
  private async aggregateIncome(startDate: Date, endDate: Date): Promise<{ income: IncomeBreakdown; reconciliationRequired: number }> {
    // Confirmed Payment is the sole receipt. Purchase only classifies it; its price is never added.
    // A confirmed receipt whose fulfilment is pending stays unallocated (other), not tuition/sales.
    const rows = await this.prisma.$queryRaw<Array<{ bucket: string; total: bigint; reconciliation: bigint }>>(Prisma.sql`
      SELECT bucket, COALESCE(SUM(amount), 0)::bigint AS total,
             COUNT(*) FILTER (WHERE ambiguous)::bigint AS reconciliation
      FROM (
        SELECT pay.amount,
          CASE WHEN NOT EXISTS (SELECT 1 FROM "Purchase" any_purchase WHERE any_purchase."paymentId" = pay.id)
            THEN 'TRAINING' ELSE COALESCE(settled.kind, 'OTHER') END AS bucket,
          COALESCE(settled.kinds, 0) > 1 AS ambiguous
        FROM "Payment" pay
        LEFT JOIN LATERAL (
          SELECT CASE WHEN COUNT(DISTINCT product.kind) = 1 THEN MAX(product.kind::text) ELSE 'OTHER' END AS kind,
                 COUNT(DISTINCT product.kind) AS kinds
          FROM "Purchase" purchase
          JOIN "ProductItem" product ON product.id = purchase."productItemId"
          WHERE purchase."paymentId" = pay.id AND purchase."grantedAt" IS NOT NULL
            AND purchase."grantedAt" <= ${new Date()}
        ) settled ON TRUE
        WHERE pay.status = 'CONFIRMED' AND pay."paidAt" >= ${startDate} AND pay."paidAt" < ${endDate}
      ) receipts
      GROUP BY bucket
    `);
    const income: IncomeBreakdown = { trainingFees: 0, exams: 0, books: 0, other: 0 };
    let reconciliationRequired = 0;
    for (const row of rows) {
      const key = row.bucket === 'TRAINING' ? 'trainingFees' : row.bucket === 'TEST' ? 'exams' : row.bucket === 'BOOK' ? 'books' : 'other';
      income[key] = sumMoney([income[key], exactMoney(row.total)]);
      reconciliationRequired += Number(row.reconciliation);
    }
    return { income, reconciliationRequired };
  }

  /**
   * Зарлагын агрегат сар дахь категориар
   * @private
   */
  private async aggregateExpenses(
    startDate: Date,
    endDate: Date,
  ): Promise<ExpenseBreakdown> {
    const result = await this.prisma.$queryRaw<
      Array<{ category: string; total: bigint }>
    >(
      Prisma.sql`
        SELECT category, COALESCE(CAST(SUM(amount) AS BIGINT), 0) as total
        FROM "ExpenseRecord"
        WHERE "occurredOn" >= ${startDate}
          AND "occurredOn" < ${endDate}
        GROUP BY category
      `,
    );

    const breakdown: ExpenseBreakdown = {
      salary: 0,
      rent: 0,
      utilities: 0,
      marketing: 0,
      materials: 0,
      equipment: 0,
      other: 0,
    };

    for (const row of result) {
      const categoryKey = row.category.toLowerCase();
      const total = exactMoney(row.total);
      if (categoryKey in breakdown) {
        breakdown[categoryKey as keyof ExpenseBreakdown] = total;
      }
    }

    return breakdown;
  }

  /**
   * Шинэ зарлага үүсгэх (ADMIN эрхтэй л)
   */
  async createExpense(
    actor: FinanceActor,
    dto: {
      amount: number;
      category: string;
      description?: string;
      occurredOn: Date;
    },
  ) {
    await this.assertFinance(actor);

    // amount INT байх ёстой
    if (!Number.isInteger(dto.amount) || dto.amount < 0) {
      throw new BadRequestException(
        'Дүн нь сөрөг биш бүхэл тоо байх ёстой',
      );
    }

    // category validate
    const validCategories = [
      'SALARY',
      'RENT',
      'UTILITIES',
      'MARKETING',
      'MATERIALS',
      'EQUIPMENT',
      'OTHER',
    ];
    if (!validCategories.includes(dto.category.toUpperCase())) {
      throw new BadRequestException(
        `Категори нь ${validCategories.join(', ')}-ээс байх ёстой`,
      );
    }

    const categoryEnum = dto.category.toUpperCase() as any;

    const expense = await this.prisma.expenseRecord.create({
      data: {
        amount: dto.amount,
        category: categoryEnum,
        description: dto.description || null,
        occurredOn: new Date(dto.occurredOn),
        createdById: actor.id,
      },
    });

    // Аудит лог
    await this.audit.record({
      actorId: actor.id,
      actorRole: actor.role,
      action: 'CREATE',
      entity: 'ExpenseRecord',
      entityId: expense.id,
      after: expense as any,
      reason: 'Нэмэлт зарлага үүсгэсэн',
    });

    return expense;
  }

  /**
   * Зарлагыг засах
   */
  async updateExpense(
    actor: FinanceActor,
    expenseId: string,
    dto: {
      amount?: number;
      category?: string;
      description?: string;
      occurredOn?: Date;
    },
  ) {
    await this.assertFinance(actor);

    // Үнэ баталгаажуулах
    if (dto.amount !== undefined) {
      if (!Number.isInteger(dto.amount) || dto.amount < 0) {
        throw new BadRequestException(
          'Дүн нь сөрөг биш бүхэл тоо байх ёстой',
        );
      }
    }

    // Категори баталгаажуулах
    if (dto.category) {
      const validCategories = [
        'SALARY',
        'RENT',
        'UTILITIES',
        'MARKETING',
        'MATERIALS',
        'EQUIPMENT',
        'OTHER',
      ];
      if (!validCategories.includes(dto.category.toUpperCase())) {
        throw new BadRequestException(
          `Категори нь ${validCategories.join(', ')}-ээс байх ёстой`,
        );
      }
    }

    const expense = await this.prisma.expenseRecord.findUnique({
      where: { id: expenseId },
    });

    if (!expense) {
      throw new BadRequestException('Зарлага олдохгүй');
    }

    const categoryEnum = dto.category
      ? (dto.category.toUpperCase() as any)
      : expense.category;

    const updated = await this.prisma.expenseRecord.update({
      where: { id: expenseId },
      data: {
        amount: dto.amount ?? expense.amount,
        category: categoryEnum,
        description: dto.description ?? expense.description,
        occurredOn: dto.occurredOn ?? expense.occurredOn,
      },
    });

    // Аудит лог
    await this.audit.record({
      actorId: actor.id,
      actorRole: actor.role,
      action: 'UPDATE',
      entity: 'ExpenseRecord',
      entityId: expenseId,
      before: expense as any,
      after: updated as any,
      reason: 'Зарлагыг засав',
    });

    return updated;
  }

  /**
   * Зарлагыг устгах
   */
  async deleteExpense(actor: FinanceActor, expenseId: string) {
    await this.assertFinance(actor);

    const expense = await this.prisma.expenseRecord.findUnique({
      where: { id: expenseId },
    });

    if (!expense) {
      throw new BadRequestException('Зарлага олдохгүй');
    }

    await this.prisma.expenseRecord.delete({
      where: { id: expenseId },
    });

    // Аудит лог
    await this.audit.record({
      actorId: actor.id,
      actorRole: actor.role,
      action: 'DELETE',
      entity: 'ExpenseRecord',
      entityId: expenseId,
      before: expense as any,
      reason: 'Зарлагыг устгасан',
    });

    return { success: true };
  }

  /**
   * Сарын бүх зарлагыг авах
   */
  async getExpenses(yearMonth: string) {
    const { dateStart: startDate, dateEnd: endDate } = financeMonthBounds(yearMonth);

    const records = await this.prisma.expenseRecord.findMany({
      where: {
        occurredOn: {
          gte: startDate,
          lt: endDate,
        },
      },
      orderBy: { occurredOn: 'desc' },
    });

    // Get creator info separately
    const creators = await this.prisma.user.findMany({
      where: {
        id: {
          in: records.map((r) => r.createdById),
        },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
      },
    });

    const creatorMap = new Map(creators.map((c) => [c.id, c]));

    return records.map((r) => ({
      ...r,
      createdBy: creatorMap.get(r.createdById) || {
        id: r.createdById,
        firstName: '',
        lastName: '',
      },
    }));
  }
}
