import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, ProductKind, Role } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  snapshotPass,
  validatePassSnapshot,
  PassSnapshot,
} from '../passes/pass-snapshot';
import { sumMoney } from '../finance/month-bounds';
import { TEACHER_ROLES } from '../common/access';

export interface ProductItemWithRefData {
  id: string;
  kind: ProductKind;
  refId: string;
  price: number;
  active: boolean;
  includesVideo: boolean;
  title?: string;
  // Нүүр хуудасны сум/тайлбарын хувьд нэмэлт мета
  description?: string;
}

@Injectable()
export class StoreService {
  constructor(private prisma: PrismaService) {}

  /**
   * Дэлгүүрийн бүтээгдэхүүнүүдийн жагсаалт (нийтэд нээлттэй, үнэ харагдана).
   * Идэвхитэй бүтээгдэхүүнүүд л буцаана.
   */
  async listProducts(): Promise<ProductItemWithRefData[]> {
    const items = await this.prisma.productItem.findMany({
      where: { active: true },
      include: {
        // Test нэмэлт мета авахдаа нохсогдуулаж чадахгүй байна (FK байхгүй),
        // тиймээс refId-уудыг нь бүлэглээд тусдаа авна
      },
    });

    // Бүтээгдэхүүн бүрийн нэр авна
    const testIds = items
      .filter((i) => i.kind === ProductKind.TEST)
      .map((i) => i.refId);
    const bookIds = items
      .filter((i) => i.kind === ProductKind.BOOK)
      .map((i) => i.refId);

    const [tests, books] = await Promise.all([
      this.prisma.test.findMany({
        where: { id: { in: testIds }, isDraft: false, deletedAt: null },
        select: { id: true, title: true },
      }),
      this.prisma.book.findMany({
        where: { id: { in: bookIds }, deletedAt: null },
        select: { id: true, title: true, code: true },
      }),
    ]);

    const testMap = new Map(tests.map((t) => [t.id, t]));
    const bookMap = new Map(books.map((b) => [b.id, b]));

    return items
      .filter(
        (item) =>
          (item.kind !== ProductKind.TEST || testMap.has(item.refId)) &&
          (item.kind !== ProductKind.BOOK || bookMap.has(item.refId)),
      )
      .map((item) => {
        const base = {
          id: item.id,
          kind: item.kind,
          refId: item.refId,
          price: item.price,
          active: item.active,
          includesVideo: item.includesVideo,
        };

        if (item.kind === ProductKind.TEST) {
          const test = testMap.get(item.refId);
          return {
            ...base,
            title: test?.title || 'Шалгалт',
            description: test?.title,
          };
        } else if (item.kind === ProductKind.BOOK) {
          const book = bookMap.get(item.refId);
          return {
            ...base,
            title: book?.title || 'Ном',
            description: `${book?.code || ''} — ${book?.title || 'Ном'}`.trim(),
          };
        }

        return base;
      });
  }

  /**
   * Бүтээгдэхүүнийг худалдаж авах.
   * ⚠️ ҮНДЭСЛЭЛТЭЙ үнэ — клиентээс ирсэн үнд найдахгүй.
   * ⚠️ Төлбөр баталгаажсаны дараа эрх олгоно.
   * ⚠️ Двойн олголт сэргийлэе — Purchase аль хэдийн байвал дахин үүсгэхгүй.
   */
  async purchase(
    userId: string,
    productItemId: string,
    paymentId?: string,
  ): Promise<{
    purchase: {
      id: string;
      productItemId: string;
      price: number;
      grantedAt: Date | null;
      expiresAt: Date | null;
    };
    warning?: string;
  }> {
    return this.prisma.$transaction(async (tx) => {
      // Serialize retries for the same account/product, including requests with no payment.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${'store:' + userId + ':' + productItemId}))`;
      const product = await tx.productItem.findUnique({
        where: { id: productItemId },
      });
      if (!product || !product.active)
        throw new NotFoundException(
          'Бүтээгдэхүүн олдсонгүй эсвэл идэвхгүй байна',
        );
      if (product.kind === ProductKind.TEST) {
        const test = await tx.test.findFirst({
          where: { id: product.refId, deletedAt: null, isDraft: false },
          select: { id: true },
        });
        if (!test) throw new NotFoundException('Шалгалт олдсонгүй');
      }
      if (product.kind === ProductKind.BOOK) {
        const book = await tx.book.findFirst({
          where: { id: product.refId, deletedAt: null },
          select: { id: true },
        });
        if (!book) throw new NotFoundException('Ном олдсонгүй');
      }
      const pass =
        product.kind === ProductKind.PASS
          ? await tx.pass.findUnique({ where: { id: product.refId } })
          : null;
      if (
        product.kind === ProductKind.PASS &&
        (!pass?.active ||
          !Number.isSafeInteger(pass.durationDays) ||
          pass.durationDays <= 0)
      )
        throw new BadRequestException('Идэвхтэй хугацаат эрх шаардлагатай');
      if (pass)
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${'pass:' + userId + ':' + pass.id}))`;
      const now = new Date();
      let terms: PassSnapshot | null = null;
      let grantExpiry: Date | null = null;
      const fulfillPass = async (purchase: {
        paymentId: string | null;
        grantedAt: Date | null;
        expiresAt: Date | null;
        price: number;
      }) => {
        if (
          !pass ||
          !purchase.grantedAt ||
          (!purchase.paymentId && purchase.price !== 0) ||
          !purchase.expiresAt ||
          purchase.expiresAt <= now
        )
          return;
        const active = await tx.userPass.findFirst({
          where: {
            userId,
            passId: pass.id,
            startsAt: { lte: now },
            expiresAt: { gt: now },
          },
        });
        if (active) {
          if (active.paymentId !== purchase.paymentId)
            throw new ConflictException('Энэ эрх идэвхтэй байна');
          return;
        }
        await tx.userPass.create({
          data: {
            userId,
            passId: pass.id,
            paymentId: purchase.paymentId,
            startsAt: purchase.grantedAt,
            expiresAt: purchase.expiresAt!,
            scopeSnapshot: terms!.scope as Prisma.InputJsonValue,
          },
        });
      };
      let existing = await tx.purchase.findFirst({
        where: {
          userId,
          productItemId,
          OR: [
            { createdAt: { gte: new Date(now.getTime() - 3600000) } },
            { price: 0, grantedAt: null, expiresAt: { lte: now } },
            {
              grantedAt: { lte: now },
              OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
            },
          ],
        },
        orderBy: { createdAt: 'desc' },
      });
      if (
        pass &&
        existing &&
        !existing.grantedAt &&
        existing.expiresAt &&
        existing.expiresAt <= now
      ) {
        if (
          (!paymentId && existing.price === 0) ||
          (paymentId && paymentId === existing.paymentId)
        )
          throw new ConflictException(
            'Цуцлагдсан эрхийг энэ төлбөрөөр дахин нээхгүй',
          );
        existing = null;
      }
      terms = pass
        ? existing?.passSnapshot
          ? validatePassSnapshot(existing.passSnapshot)
          : snapshotPass(pass)
        : null;
      grantExpiry = terms
        ? new Date(now.getTime() + terms.durationDays * 86400000)
        : null;
      if ((existing?.price ?? product.price) === 0 && paymentId)
        throw new BadRequestException('Үнэгүй бүтээгдэхүүнд төлбөр холбохгүй');
      let paymentConfirmed = false;
      if (paymentId) {
        // One confirmed transfer can fund one product; the lock closes cross-product races.
        await tx.$queryRaw`SELECT id FROM "Payment" WHERE id = ${paymentId} FOR UPDATE`;
        const payment = await tx.payment.findUnique({
          where: { id: paymentId },
        });
        if (!payment) throw new NotFoundException('Төлбөр олдсонгүй');
        if (payment.userId !== userId)
          throw new ForbiddenException('Энэ төлбөр танд хамаарахгүй');
        if (payment.storePurchaseId) {
          const quote = await tx.purchase.findUnique({
            where: { id: payment.storePurchaseId },
          });
          if (
            !quote ||
            quote.userId !== userId ||
            quote.productItemId !== productItemId ||
            (quote.grantedAt && quote.paymentId !== paymentId) ||
            (!quote.grantedAt && quote.expiresAt && quote.expiresAt <= now)
          )
            throw new BadRequestException(
              'Энэ төлбөр өөр эсвэл цуцлагдсан худалдан авалтын үнэд хамаарна',
            );
          existing = quote;
          terms = pass
            ? quote.passSnapshot
              ? validatePassSnapshot(quote.passSnapshot)
              : snapshotPass(pass)
            : null;
          grantExpiry = terms
            ? new Date(now.getTime() + terms.durationDays * 86400000)
            : null;
        }
        if (payment.forMonth)
          throw new BadRequestException(
            'Сарын сургалтын төлбөрийг дэлгүүрт ашиглахгүй',
          );
        if (payment.amount < (existing?.price ?? product.price))
          throw new BadRequestException(
            'Төлбөрийн дүн бүтээгдэхүүний үнээс бага байна',
          );
        if (payment.status === 'REJECTED' || payment.status === 'REVERSED')
          throw new BadRequestException('Цуцлагдсан төлбөр ашиглах боломжгүй');
        const used = await tx.purchase.findFirst({
          where: {
            paymentId,
            ...(existing ? { id: { not: existing.id } } : {}),
          },
        });
        const usedPass = await tx.userPass.findFirst({
          where: { paymentId },
          select: { id: true, userId: true, passId: true },
        });
        if (
          used ||
          (usedPass &&
            !(
              existing?.paymentId === paymentId &&
              product.kind === ProductKind.PASS &&
              usedPass.userId === userId &&
              usedPass.passId === product.refId
            ))
        )
          throw new ConflictException(
            'Энэ төлбөрөөр эрх аль хэдийн олгосон байна',
          );
        paymentConfirmed = payment.status === 'CONFIRMED';
      }
      const entitled =
        paymentConfirmed || (existing?.price ?? product.price) === 0;
      if (existing) {
        if (!existing.grantedAt && entitled) {
          const upgraded = await tx.purchase.update({
            where: { id: existing.id },
            data: {
              paymentId,
              passSnapshot: terms
                ? (terms as unknown as Prisma.InputJsonValue)
                : undefined,
              grantedAt: now,
              expiresAt: grantExpiry,
            },
          });
          await fulfillPass(upgraded);
          return { purchase: upgraded };
        }
        return { purchase: existing };
      }
      const purchase = await tx.purchase.create({
        data: {
          userId,
          productItemId,
          paymentId: paymentId || null,
          price: product.price,
          passSnapshot: terms
            ? (terms as unknown as Prisma.InputJsonValue)
            : undefined,
          grantedAt: entitled ? now : null,
          expiresAt: entitled ? grantExpiry : null,
        },
      });
      await fulfillPass(purchase);
      return { purchase };
    });
  }

  /**
   * Миний худалдан авалтууд — сурагч өөрийнхийг харна.
   */
  async myPurchases(userId: string) {
    const purchases = await this.prisma.purchase.findMany({
      where: { userId },
      include: {
        productItem: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Бүтээгдэхүүнүүдийг нэр аваад буцаана
    const testIds = purchases
      .filter((p) => p.productItem.kind === ProductKind.TEST)
      .map((p) => p.productItem.refId);
    const bookIds = purchases
      .filter((p) => p.productItem.kind === ProductKind.BOOK)
      .map((p) => p.productItem.refId);

    const [tests, books] = await Promise.all([
      this.prisma.test.findMany({
        where: { id: { in: testIds } },
        select: { id: true, title: true },
      }),
      this.prisma.book.findMany({
        where: { id: { in: bookIds } },
        select: { id: true, title: true, code: true },
      }),
    ]);

    const testMap = new Map(tests.map((t) => [t.id, t]));
    const bookMap = new Map(books.map((b) => [b.id, b]));

    return purchases.map((p) => ({
      id: p.id,
      productItemId: p.productItemId,
      kind: p.productItem.kind,
      price: p.price,
      grantedAt: p.grantedAt,
      expiresAt: p.expiresAt,
      createdAt: p.createdAt,
      title:
        p.productItem.kind === ProductKind.TEST
          ? testMap.get(p.productItem.refId)?.title || 'Шалгалт'
          : bookMap.get(p.productItem.refId)?.title || 'Ном',
    }));
  }

  /**
   * Админ: бүтээгдэхүүн үүсгэх (үнэ, эрхлэлт).
   * @param includesVideo — BOOK-д л зөвшөөрнө. TEST/PASS-д 400 ошибка.
   */
  async createProduct(
    kind: ProductKind,
    refId: string,
    price: number,
    userId: string,
    role: Role,
    includesVideo: boolean = false,
  ) {
    if (!TEACHER_ROLES.includes(role)) {
      throw new ForbiddenException('Зөвхөн админ бүтээгдэхүүн үүсгэнэ');
    }
    if (!Number.isInteger(price) || price < 0 || price > 2147483647) {
      throw new BadRequestException(
        'Үнэ 0–2147483647 хоорондох бүхэл тоо байна',
      );
    }

    // BOOK-д л видео сонголт зөвшөөрнө
    if (includesVideo && kind !== ProductKind.BOOK) {
      throw new BadRequestException(
        'Видео сонголт зөвхөн ном дээр л боломжтой',
      );
    }

    // refId нь байгаа объект эсэхийг шалгана
    if (kind === ProductKind.TEST) {
      const test = await this.prisma.test.findUnique({ where: { id: refId } });
      if (!test || test.deletedAt || test.isDraft)
        throw new NotFoundException('Нийтлэгдсэн тест олдсонгүй');
    } else if (kind === ProductKind.BOOK) {
      const book = await this.prisma.book.findUnique({ where: { id: refId } });
      if (!book) throw new NotFoundException('Ном олдсонгүй');
    }

    if (kind === ProductKind.PASS) {
      const pass = await this.prisma.pass.findUnique({ where: { id: refId } });
      if (!pass?.active) throw new NotFoundException('Идэвхтэй эрх олдсонгүй');
    }

    // Давхардал үүсгэхгүй — нэг ном одоо 2 хувилбартай (ном / ном+видео)
    // тул түлхүүрт includesVideo орсон.
    const existing = await this.prisma.productItem.findUnique({
      where: { kind_refId_includesVideo: { kind, refId, includesVideo } },
    });
    if (existing) {
      throw new ConflictException('Энэ бүтээгдэхүүн аль хэдийн байгаа');
    }

    return this.prisma.productItem.create({
      data: { kind, refId, price, active: true, includesVideo },
    });
  }

  /**
   * Админ: бүтээгдэхүүнийг идэвхгүй болгох (үнэ солихгүй).
   */
  async deactivateProduct(productItemId: string, userId: string, role: Role) {
    if (!TEACHER_ROLES.includes(role)) {
      throw new ForbiddenException('Зөвхөн админ идэвхгүй болгөнө');
    }

    const product = await this.prisma.productItem.findUnique({
      where: { id: productItemId },
    });
    if (!product) {
      throw new NotFoundException('Бүтээгдэхүүн олдсонгүй');
    }

    return this.prisma.productItem.update({
      where: { id: productItemId },
      data: { active: false },
    });
  }

  /**
   * Админ: бүтээгдэхүүнийн үнэ солих.
   */
  async updatePrice(
    productItemId: string,
    newPrice: number,
    userId: string,
    role: Role,
  ) {
    if (role !== Role.ADMIN) {
      throw new ForbiddenException('Зөвхөн админ үнэ соллоно');
    }
    if (!Number.isInteger(newPrice) || newPrice < 0 || newPrice > 2147483647) {
      throw new BadRequestException(
        'Үнэ 0–2147483647 хоорондох бүхэл тоо байна',
      );
    }

    const product = await this.prisma.productItem.findUnique({
      where: { id: productItemId },
    });
    if (!product) {
      throw new NotFoundException('Бүтээгдэхүүн олдсонгүй');
    }

    return this.prisma.productItem.update({
      where: { id: productItemId },
      data: { price: newPrice },
    });
  }

  async updateStatus(productItemId: string, active: boolean, role: Role) {
    if (role !== Role.ADMIN)
      throw new ForbiddenException('Зөвхөн админ өөрчилнө');
    if (typeof active !== 'boolean')
      throw new BadRequestException('Идэвхийн төлөв буруу байна');
    const product = await this.prisma.productItem.findUnique({
      where: { id: productItemId },
    });
    if (!product) throw new NotFoundException('Бүтээгдэхүүн олдсонгүй');
    if (active && product.kind === ProductKind.TEST) {
      const test = await this.prisma.test.findUnique({
        where: { id: product.refId },
      });
      if (!test || test.deletedAt || test.isDraft)
        throw new NotFoundException('Нийтлэгдсэн тест олдсонгүй');
    }
    if (active && product.kind === ProductKind.BOOK) {
      const book = await this.prisma.book.findUnique({
        where: { id: product.refId },
      });
      if (!book || book.deletedAt) throw new NotFoundException('Ном олдсонгүй');
    }
    return this.prisma.productItem.update({
      where: { id: productItemId },
      data: { active },
    });
  }

  /**
   * Админ: бүх бүтээгдэхүүнийг дэлгэрэнгүй мэдээллээр авах.
   */
  async adminGetAllProducts(): Promise<
    (ProductItemWithRefData & { purchaseCount: number })[]
  > {
    const items = await this.prisma.productItem.findMany({
      orderBy: { active: 'desc' },
    });

    const testIds = items
      .filter((i) => i.kind === ProductKind.TEST)
      .map((i) => i.refId);
    const bookIds = items
      .filter((i) => i.kind === ProductKind.BOOK)
      .map((i) => i.refId);

    const [tests, books, purchases] = await Promise.all([
      this.prisma.test.findMany({
        where: { id: { in: testIds } },
        select: { id: true, title: true },
      }),
      this.prisma.book.findMany({
        where: { id: { in: bookIds } },
        select: { id: true, title: true, code: true },
      }),
      this.prisma.purchase.groupBy({
        by: ['productItemId'],
        _count: { id: true },
      }),
    ]);

    const testMap = new Map(tests.map((t) => [t.id, t]));
    const bookMap = new Map(books.map((b) => [b.id, b]));
    const purchaseCountMap = new Map(
      purchases.map((p) => [p.productItemId, p._count.id]),
    );

    return items.map((item) => {
      const base = {
        id: item.id,
        kind: item.kind,
        refId: item.refId,
        price: item.price,
        active: item.active,
        includesVideo: item.includesVideo,
        purchaseCount: purchaseCountMap.get(item.id) || 0,
      };

      if (item.kind === ProductKind.TEST) {
        const test = testMap.get(item.refId);
        return {
          ...base,
          title: test?.title || 'Шалгалт',
          description: test?.title,
        };
      } else if (item.kind === ProductKind.BOOK) {
        const book = bookMap.get(item.refId);
        return {
          ...base,
          title: book?.title || 'Ном',
          description: `${book?.code || ''} — ${book?.title || 'Ном'}`.trim(),
        };
      }

      return base;
    });
  }

  /**
   * Админ: бүх худалдан авалтыг дэлгэрэнгүй мэдээллээр авах (орлогын судалгаа).
   */
  async adminGetAllPurchases() {
    const purchases = await this.prisma.purchase.findMany({
      include: {
        productItem: true,
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Төлбөрийн мэдээлэл авна (paymentId байвал)
    const paymentIds = purchases
      .map((p) => p.paymentId)
      .filter((id): id is string => id !== null);
    const payments =
      paymentIds.length > 0
        ? await this.prisma.payment.findMany({
            where: { id: { in: paymentIds } },
            select: { id: true, status: true },
          })
        : [];
    const paymentMap = new Map(payments.map((p) => [p.id, p]));

    // Бүтээгдэхүүнүүдийн нэр авна
    const testIds = purchases
      .filter((p) => p.productItem.kind === ProductKind.TEST)
      .map((p) => p.productItem.refId);
    const bookIds = purchases
      .filter((p) => p.productItem.kind === ProductKind.BOOK)
      .map((p) => p.productItem.refId);

    const [tests, books] = await Promise.all([
      this.prisma.test.findMany({
        where: { id: { in: testIds } },
        select: { id: true, title: true },
      }),
      this.prisma.book.findMany({
        where: { id: { in: bookIds } },
        select: { id: true, title: true, code: true },
      }),
    ]);

    const testMap = new Map(tests.map((t) => [t.id, t]));
    const bookMap = new Map(books.map((b) => [b.id, b]));

    return purchases.map((p) => {
      const payment = p.paymentId ? paymentMap.get(p.paymentId) : null;
      return {
        id: p.id,
        userId: p.user.id,
        userName: `${p.user.firstName} ${p.user.lastName}`,
        userEmail: p.user.email,
        userPhone: p.user.phone,
        productItemId: p.productItemId,
        productKind: p.productItem.kind,
        productTitle:
          p.productItem.kind === ProductKind.TEST
            ? testMap.get(p.productItem.refId)?.title || 'Шалгалт'
            : bookMap.get(p.productItem.refId)?.title || 'Ном',
        price: p.price,
        grantedAt: p.grantedAt,
        expiresAt: p.expiresAt,
        createdAt: p.createdAt,
        paymentStatus: payment?.status || null,
        paymentConfirmedAt: null,
      };
    });
  }

  /**
   * Админ: орлогын өгөгдөл (эзэмшлийн судалгаа).
   */
  async adminGetRevenueSummary() {
    const purchases = await this.prisma.purchase.findMany();

    const payments = await this.prisma.payment.findMany({
      where: {
        OR: [
          {
            id: {
              in: purchases
                .map((p) => p.paymentId)
                .filter((id): id is string => !!id),
            },
          },
          { storePurchaseId: { in: purchases.map((p) => p.id) } },
        ],
      },
      select: {
        id: true,
        amount: true,
        status: true,
        paidAt: true,
        storePurchaseId: true,
      },
    });
    // A receipt is a Payment row, never a sum of quote and payment or entitlement value.
    const receipts = payments.filter(
      (p) => p.status === 'CONFIRMED' && p.paidAt !== null,
    );
    const receiptIds = new Set(receipts.map((p) => p.id));
    const fundedQuotes = new Set(
      receipts.map((p) => p.storePurchaseId).filter(Boolean),
    );
    const pending = purchases.filter(
      (p) => !p.grantedAt && (!p.expiresAt || p.expiresAt > new Date()),
    );
    const isFunded = (p: (typeof purchases)[number]) =>
      fundedQuotes.has(p.id) || (!!p.paymentId && receiptIds.has(p.paymentId));
    const cashReceived = sumMoney(receipts.map((p) => p.amount));
    const pendingQuoteValue = sumMoney(
      pending.filter((p) => !isFunded(p)).map((p) => p.price),
    );
    return {
      totalPurchases: purchases.length,
      cashReceived,
      confirmedReceiptCount: receipts.length,
      totalOrderValue: sumMoney(purchases.map((p) => p.price)),
      pendingQuoteValue,
      awaitingFulfillmentValue: sumMoney(
        pending.filter(isFunded).map((p) => p.price),
      ),
      // Compatibility aliases: total/confirmed are cash; pending remains unreceived quote value.
      totalRevenue: cashReceived,
      confirmedRevenue: cashReceived,
      pendingRevenue: pendingQuoteValue,
      netAfterSeparateRefunds: null,
      receiptPolicy:
        'CONFIRMED payments with paidAt counted once; quotes are not income; separate refunds require allocation',
    };
  }
}
