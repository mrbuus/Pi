import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, ProductKind, Role } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
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
    const testIds = items.filter((i) => i.kind === ProductKind.TEST).map((i) => i.refId);
    const bookIds = items.filter((i) => i.kind === ProductKind.BOOK).map((i) => i.refId);

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

    return items.map((item) => {
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
    // Бүтээгдэхүүнийг авна (идэвхитэй байх ёстой)
    const product = await this.prisma.productItem.findUnique({
      where: { id: productItemId },
    });
    if (!product || !product.active) {
      throw new NotFoundException('Бүтээгдэхүүн олдсонгүй эсвэл идэвхигүй байна');
    }

    // Payment баталгаажсан байхыг шалгана (заавал биш — эзний шийдвэр)
    let paymentConfirmed = false;
    if (paymentId) {
      const payment = await this.prisma.payment.findUnique({
        where: { id: paymentId },
      });
      if (!payment) {
        throw new NotFoundException('Төлбөр олдсонгүй');
      }
      if (payment.userId !== userId) {
        throw new ForbiddenException('Энэ төлбөр танд хамаарахгүй');
      }
      paymentConfirmed = payment.status === 'CONFIRMED';
    }

    // Двойн олголт сэргийлэе: Purchase аль хэдийн байвал дахин үүсгэхгүй (idempotent)
    // Хэрэглэгч заримдаа сүлжээний саатлаас эргүүлбүү сатнав гэж дахин дарна
    const existing = await this.prisma.purchase.findFirst({
      where: {
        userId,
        productItemId,
        // Хэрэв үнэ өөрчлөгдсөн ч сүүлийнхийн худалдан авалтыг дахин үүсгэхгүй
        createdAt: {
          gte: new Date(Date.now() - 60 * 60 * 1000), // сүүлийн 1 цаг
        },
      },
    });
    if (existing) {
      return {
        purchase: existing,
        warning: 'Та эргэлтээ энэ бүтээгдэхүүнийг хүсэлтийг аль хэдийн илгээсэн байна',
      };
    }

    // Ном: гэрээ байхгүй
    // Тест: ONLINE TEST-ээр дуусаж болох эсвэл дүүргүүлнэ
    const now = new Date();
    let grantedAt: Date | null = now;
    let expiresAt: Date | null = null;

    if (product.kind === ProductKind.TEST) {
      // Тестийг нэг удаа авсан бол байнгалай хандаж болно (гэрээ байхгүй)
      expiresAt = null;
    } else if (product.kind === ProductKind.BOOK) {
      // Номыг нэг удаа авсан бол байнгалай хандаж болно
      expiresAt = null;
    } else if (product.kind === ProductKind.PASS) {
      // Pass — гэрээ байж болно (Pass модель-ээр дүүргүүлнэ)
      // Одоогоор: 30 хоног үргэлжлүүлнэ
      expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    }

    const purchase = await this.prisma.purchase.create({
      data: {
        userId,
        productItemId,
        paymentId: paymentId || null,
        price: product.price, // ҮНДЭСЛЭЛТЭЙ үнэ сервер-ээс
        grantedAt: paymentConfirmed ? grantedAt : null, // Төлбөр баталгаажсан үед л эрх олгоно
        expiresAt,
      },
    });

    // Видео эрх энд ОЛГОГДОХГҮЙ — canAccessChapter (common/access.ts) нь
    // «grantedAt бөглөгдсөн Purchase → ProductItem(includesVideo, refId=bookId)»
    // гинжийг хандалт БҮРД шалгадаг тул тусдаа эрхийн бичлэг хэрэггүй.
    // Давуу тал: төлбөр REVERSED болоход Purchase.grantedAt цуцлагдмагц
    // видео эрх нь автоматаар хаагдана (тусдаа бичлэг байсан бол мартагдана).

    return { purchase };
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
    if (price < 0) {
      throw new BadRequestException('Үнэ сөрөг байж болохгүй');
    }

    // BOOK-д л видео сонголт зөвшөөрнө
    if (includesVideo && kind !== ProductKind.BOOK) {
      throw new BadRequestException('Видео сонголт зөвхөн ном дээр л боломжтой');
    }

    // refId нь байгаа объект эсэхийг шалгана
    if (kind === ProductKind.TEST) {
      const test = await this.prisma.test.findUnique({ where: { id: refId } });
      if (!test) throw new NotFoundException('Тест олдсонгүй');
    } else if (kind === ProductKind.BOOK) {
      const book = await this.prisma.book.findUnique({ where: { id: refId } });
      if (!book) throw new NotFoundException('Ном олдсонгүй');
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
    if (!TEACHER_ROLES.includes(role)) {
      throw new ForbiddenException('Зөвхөн админ үнэ соллоно');
    }
    if (newPrice < 0) {
      throw new BadRequestException('Үнэ сөрөг байж болохгүй');
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

  /**
   * Админ: бүх бүтээгдэхүүнийг дэлгэрэнгүй мэдээллээр авах.
   */
  async adminGetAllProducts(): Promise<
    (ProductItemWithRefData & { purchaseCount: number })[]
  > {
    const items = await this.prisma.productItem.findMany({
      orderBy: { active: 'desc' },
    });

    const testIds = items.filter((i) => i.kind === ProductKind.TEST).map((i) => i.refId);
    const bookIds = items.filter((i) => i.kind === ProductKind.BOOK).map((i) => i.refId);

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
    const purchaseCountMap = new Map(purchases.map((p) => [p.productItemId, p._count.id]));

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
          select: { id: true, firstName: true, lastName: true, email: true, phone: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Төлбөрийн мэдээлэл авна (paymentId байвал)
    const paymentIds = purchases
      .map((p) => p.paymentId)
      .filter((id): id is string => id !== null);
    const payments = paymentIds.length > 0
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

    const totalRevenue = purchases.reduce((sum, p) => sum + p.price, 0);
    const confirmedRevenue = purchases
      .filter((p) => p.grantedAt !== null)
      .reduce((sum, p) => sum + p.price, 0);

    return {
      totalPurchases: purchases.length,
      totalRevenue,
      confirmedRevenue,
      pendingRevenue: totalRevenue - confirmedRevenue,
    };
  }
}
