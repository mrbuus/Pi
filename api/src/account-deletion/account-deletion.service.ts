import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { DeletionStatus } from './account-deletion.dto';

/* ============================================================================
 * Бүртгэл устгах ХҮСЭЛТ (App Store 5.1.1(v)).
 *
 * ⛔ Энэ сервис хэрэглэгчийн өгөгдлийг ХЭЗЭЭ Ч устгахгүй, дарж бичихгүй
 * (прод өгөгдлийн хатуу дүрэм, 2026-10-23). Зөвхөн AccountDeletionRequest
 * мөр үүсгэж/шинэчилнэ. Бодит шийдвэрийг админ гараар гаргана.
 * ========================================================================== */

const OPEN_STATUSES: DeletionStatus[] = ['PENDING', 'IN_REVIEW'];

const REQUEST_SELECT = {
  id: true,
  status: true,
  reason: true,
  createdAt: true,
  reviewedAt: true,
  reviewNote: true,
} as const;

@Injectable()
export class AccountDeletionService {
  constructor(private prisma: PrismaService) {}

  /** Идэмпотент: нээлттэй хүсэлт байвал шинээр үүсгэхгүй, тэрийгээ буцаана. */
  async request(userId: string, reason?: string) {
    const open = await this.prisma.accountDeletionRequest.findFirst({
      where: { userId, status: { in: OPEN_STATUSES } },
      orderBy: { createdAt: 'desc' },
      select: REQUEST_SELECT,
    });
    if (open) return { created: false, request: open };
    const request = await this.prisma.accountDeletionRequest.create({
      data: { userId, reason: reason?.trim() || null },
      select: REQUEST_SELECT,
    });
    return { created: true, request };
  }

  /** Сурагч/эцэг эх өөрийн хамгийн сүүлийн хүсэлтийн төлөвийг харна. */
  async mine(userId: string) {
    const request = await this.prisma.accountDeletionRequest.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: REQUEST_SELECT,
    });
    return { request };
  }

  /** Админ: хүсэлтийн жагсаалт (анхдагчаар нээлттэй). */
  list(status?: DeletionStatus) {
    return this.prisma.accountDeletionRequest.findMany({
      where: status ? { status } : { status: { in: OPEN_STATUSES } },
      orderBy: { createdAt: 'asc' },
      take: 200,
      select: {
        ...REQUEST_SELECT,
        reviewedById: true,
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            email: true,
            role: true,
            archivedAt: true,
          },
        },
      },
    });
  }

  /** Админ: зөвхөн хүсэлтийн төлөв/тэмдэглэлийг шинэчилнэ — хэрэглэгчид хүрэхгүй. */
  async review(id: string, adminId: string, status: DeletionStatus, note?: string) {
    const existing = await this.prisma.accountDeletionRequest.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existing) throw new NotFoundException('Хүсэлт олдсонгүй');
    return this.prisma.accountDeletionRequest.update({
      where: { id },
      data: {
        status,
        reviewNote: note?.trim() || null,
        reviewedById: adminId,
        reviewedAt: new Date(),
      },
      select: { ...REQUEST_SELECT, reviewedById: true },
    });
  }
}
