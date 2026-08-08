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
  targetIncome: number | null; // ёстой орлого (түүнийг тооцохын тулд мета шаардлага)
  collectionRate: number | null; // % — цуглуулалтын хувь
}

@Injectable()
export class FinanceService {
  constructor(
    private prisma: PrismaService,
    private audit: AuditService,
  ) {}

  /**
   * Сар буюу хугацааны хооронд нэгдсэн орлого/зарлагын тайлан
   * @param yearMonth "2026-08" форматтай сар
   * @returns FinanceReport объект
   */
  async getMonthlyReport(yearMonth: string): Promise<FinanceReport> {
    // Сарын validate
    if (!/^\d{4}-\d{2}$/.test(yearMonth)) {
      throw new BadRequestException(
        'Сарын формат: YYYY-MM (жишээ: 2026-08)',
      );
    }

    const [yearStr, monthStr] = yearMonth.split('-');
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);

    if (month < 1 || month > 12) {
      throw new BadRequestException('Сар 1-12 хооронд байх ёстой');
    }

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    // Орлогын агрегат
    const income = await this.aggregateIncome(startDate, endDate);
    const totalIncome = Object.values(income).reduce((a, b) => a + b, 0);

    // Зарлагын агрегат
    const expenses = await this.aggregateExpenses(startDate, endDate);
    const totalExpenses = Object.values(expenses).reduce((a, b) => a + b, 0);

    // Цэвэр ашиг
    const netProfit = totalIncome - totalExpenses;

    // Өмнөх сартай харьцуулалт
    const prevMonth = new Date(year, month - 2, 1);
    const prevMonthEnd = new Date(year, month - 1, 0);
    const prevIncome = await this.aggregateIncome(prevMonth, prevMonthEnd);
    const prevExpenses = await this.aggregateExpenses(prevMonth, prevMonthEnd);
    const previousNetProfit =
      Object.values(prevIncome).reduce((a, b) => a + b, 0) -
      Object.values(prevExpenses).reduce((a, b) => a + b, 0);
    const profitChange =
      previousNetProfit !== null ? netProfit - previousNetProfit : null;

    // Цуглуулалтын хувь (target орлого – нийт Payment-ны ёстой хэмжээ)
    // Хэрэвээ мета эсвэл эх сурвалж байхгүй бол null
    const collectionRate = null; // TODO: target шалгалт хийх

    return {
      period: yearMonth,
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
  private async aggregateIncome(
    startDate: Date,
    endDate: Date,
  ): Promise<IncomeBreakdown> {
    // Payment: status = CONFIRMED (сургалтын төлбөр)
    const trainingFeesResult = await this.prisma.$queryRaw<
      Array<{ total: bigint }>
    >(
      Prisma.sql`
        SELECT COALESCE(CAST(SUM(amount) AS BIGINT), 0) as total
        FROM "Payment"
        WHERE status = 'CONFIRMED'
          AND "paidAt" >= ${startDate}
          AND "paidAt" <= ${endDate}
      `,
    );
    const trainingFees = Math.round(Number(trainingFeesResult[0]?.total ?? 0));

    // Purchase: productItem.kind = TEST → шалгалтын төлбөр
    const examsResult = await this.prisma.$queryRaw<Array<{ total: bigint }>>(
      Prisma.sql`
        SELECT COALESCE(CAST(SUM(p.price) AS BIGINT), 0) as total
        FROM "Purchase" p
        JOIN "ProductItem" pi ON p."productItemId" = pi.id
        WHERE pi.kind = 'TEST'
          AND p."createdAt" >= ${startDate}
          AND p."createdAt" <= ${endDate}
      `,
    );
    const exams = Math.round(Number(examsResult[0]?.total ?? 0));

    // Purchase: productItem.kind = BOOK → номын төлбөр
    const booksResult = await this.prisma.$queryRaw<Array<{ total: bigint }>>(
      Prisma.sql`
        SELECT COALESCE(CAST(SUM(p.price) AS BIGINT), 0) as total
        FROM "Purchase" p
        JOIN "ProductItem" pi ON p."productItemId" = pi.id
        WHERE pi.kind = 'BOOK'
          AND p."createdAt" >= ${startDate}
          AND p."createdAt" <= ${endDate}
      `,
    );
    const books = Math.round(Number(booksResult[0]?.total ?? 0));

    const other = 0; // Үлдэх орлого (ирээдүйд нэмэх)

    return {
      trainingFees,
      exams,
      books,
      other,
    };
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
          AND "occurredOn" <= ${endDate}
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
      const total = Math.round(Number(row.total));
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
    if (actor.role !== 'ADMIN') {
      throw new ForbiddenException('Зөвхөн админ л зарлага үүсгэх боломжтой');
    }

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
    if (actor.role !== 'ADMIN') {
      throw new ForbiddenException('Зөвхөн админ л зарлагыг засах боломжтой');
    }

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
    if (actor.role !== 'ADMIN') {
      throw new ForbiddenException('Зөвхөн админ л зарлагыг устгах боломжтой');
    }

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
    if (!/^\d{4}-\d{2}$/.test(yearMonth)) {
      throw new BadRequestException(
        'Сарын формат: YYYY-MM (жишээ: 2026-08)',
      );
    }

    const [yearStr, monthStr] = yearMonth.split('-');
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const records = await this.prisma.expenseRecord.findMany({
      where: {
        occurredOn: {
          gte: startDate,
          lte: endDate,
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
