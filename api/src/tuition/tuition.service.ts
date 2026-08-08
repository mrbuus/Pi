import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ScheduleService } from '../schedule/schedule.service';
import { prorateTuition, explainProration, type ProrationInput, type ProrationResult, type DateKey } from './proration';
import { computePaidUntil } from './paid-until';
import { todayUB } from '../common/date';

@Injectable()
export class TuitionService {
  constructor(
    private prisma: PrismaService,
    private scheduleService: ScheduleService,
  ) {}

  /**
   * Буцаалтын ТООЦОО (баталгаажаагүй эхний үе)
   * GET /tuition/refund/preview?studentId&classroomId&leftOn
   */
  async previewRefund(studentId: string, classroomId: string, leftOnStr: string) {
    // Сурагч болон анги байгаа эсэх шалгаж тооцооны мэдээлэл цуглуулна.
    const student = await this.prisma.user.findUnique({
      where: { id: studentId },
      include: { studentProfile: true },
    });
    if (!student || !student.studentProfile) {
      throw new NotFoundException('Сурагч олдсонгүй');
    }
    const classroom = await this.prisma.classroom.findUnique({
      where: { id: classroomId },
    });
    if (!classroom) {
      throw new NotFoundException('Анги олдсонгүй');
    }

    // Энэ ангид сурагч эхлээ орсөн огноо
    const enrollment = await this.prisma.enrollment.findFirst({
      where: { studentId, classroomId, leftAt: null },
    });
    if (!enrollment) {
      throw new BadRequestException('Сурагч энэ ангид сууж байгаа бүртгэл байхгүй');
    }

    const joinedOn = enrollment.joinedAt.toISOString().slice(0, 10) as DateKey;
    const leftOn = leftOnStr as DateKey;

    // Гэрээний хугацаанаас хичээлийн өдрүүдийг авна
    const expandedDays = await this.scheduleService.expandDays(joinedOn, leftOn, classroomId);
    const lessonDays = expandedDays
      .filter((d) => d.holiday === null && d.classes.length > 0)
      .map((d) => d.date as DateKey);

    // Төлсөн дүнг Payment-ээс авна (CONFIRMED төлбөр л)
    const payments = await this.prisma.payment.findMany({
      where: { userId: studentId, status: 'CONFIRMED' },
    });
    const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);

    // Тооцоо хий
    const totalTuition = student.studentProfile.tuitionAmount || 0;
    const input: ProrationInput = {
      lessonDays,
      totalTuition,
      joinedOn,
      leftOn,
      totalPaid,
    };
    const result = prorateTuition(input);
    const explanation = explainProration(result);

    return {
      student: { id: student.id, firstName: student.firstName, lastName: student.lastName },
      classroom: { id: classroom.id, name: classroom.name },
      joinedOn,
      leftOn,
      calculation: result,
      explanation,
    };
  }

  /**
   * Буцаалтыг ҮҮСГЭНЭ (DRAFT статусаар)
   * POST /tuition/refund
   */
  async createRefund(
    studentId: string,
    classroomId: string,
    leftOnStr: string,
    createdById: string,
  ) {
    const preview = await this.previewRefund(studentId, classroomId, leftOnStr);

    // Хоёр дахь гүйлгээний шалгалт: DRAFT-ийн бүртгэл байхгүй байх
    const existing = await this.prisma.tuitionRefund.findFirst({
      where: { studentId, classroomId, status: 'DRAFT' },
    });
    if (existing) {
      throw new BadRequestException('Энэ сурагч болон ангийн DRAFT бүртгэл аль хэдийн байна');
    }

    const calc = preview.calculation;
    const refund = await this.prisma.tuitionRefund.create({
      data: {
        studentId,
        classroomId,
        leftOn: new Date(`${leftOnStr}T00:00:00Z`),
        totalLessonDays: calc.totalLessonDays,
        attendedLessonDays: calc.attendedLessonDays,
        dailyRate: calc.dailyRate,
        owed: calc.owed,
        totalPaid: calc.totalPaid,
        refundAmount: calc.refundAmount,
        shortfall: calc.shortfall,
        warnings: calc.warnings.length > 0 ? JSON.stringify(calc.warnings) : null,
        status: 'DRAFT',
        createdById,
      },
    });

    return refund;
  }

  /**
   * Буцаалтыг PENDING_APPROVAL статусруу явуулна
   * POST /tuition/refund/:id/pending
   */
  async submitForApproval(refundId: string) {
    const refund = await this.prisma.tuitionRefund.findUnique({
      where: { id: refundId },
    });
    if (!refund) {
      throw new NotFoundException('Буцаалт олдсонгүй');
    }
    if (refund.status !== 'DRAFT') {
      throw new BadRequestException('Зөвхөн DRAFT статусны буцаалтыг явуулж болно');
    }

    return this.prisma.tuitionRefund.update({
      where: { id: refundId },
      data: { status: 'PENDING_APPROVAL' },
    });
  }

  /**
   * Админ буцаалтыг БАТАЛГААЖУУЛНА
   * POST /tuition/refund/:id/approve
   */
  async approveRefund(refundId: string, approvedById: string) {
    const refund = await this.prisma.tuitionRefund.findUnique({
      where: { id: refundId },
    });
    if (!refund) {
      throw new NotFoundException('Буцаалт олдсонгүй');
    }
    if (refund.status !== 'PENDING_APPROVAL' && refund.status !== 'DRAFT') {
      throw new BadRequestException('Зөвхөн DRAFT эсвэл PENDING_APPROVAL статусны буцаалтыг баталгаажуулж болно');
    }

    return this.prisma.tuitionRefund.update({
      where: { id: refundId },
      data: { status: 'APPROVED', approvedById, approvedAt: new Date() },
    });
  }

  /**
   * Админ буцаалтыг ТӨЛӨГДСӨН гэж тэмдэглэнэ
   * POST /tuition/refund/:id/paid
   */
  async markAsPaid(
    refundId: string,
    paidById: string,
    paymentMethod?: string,
  ) {
    const refund = await this.prisma.tuitionRefund.findUnique({
      where: { id: refundId },
    });
    if (!refund) {
      throw new NotFoundException('Буцаалт олдсонгүй');
    }
    if (refund.status !== 'APPROVED') {
      throw new BadRequestException('Зөвхөн APPROVED статусны буцаалтыг төлөгдсөн гэж тэмдэглэж болно');
    }

    return this.prisma.tuitionRefund.update({
      where: { id: refundId },
      data: {
        status: 'PAID',
        paidById,
        paidAt: new Date(),
        paymentMethod,
      },
    });
  }

  /**
   * Буцаалтыг ЦУЦАЛНА
   * POST /tuition/refund/:id/cancel
   */
  async cancelRefund(
    refundId: string,
    cancelledById: string,
    cancelReason?: string,
  ) {
    const refund = await this.prisma.tuitionRefund.findUnique({
      where: { id: refundId },
    });
    if (!refund) {
      throw new NotFoundException('Буцаалт олдсонгүй');
    }
    if (refund.status === 'CANCELLED' || refund.status === 'PAID') {
      throw new BadRequestException('Үргэлжилсэн буцаалтыг цуцлах боломжгүй');
    }

    return this.prisma.tuitionRefund.update({
      where: { id: refundId },
      data: {
        status: 'CANCELLED',
        cancelledById,
        cancelledAt: new Date(),
        cancelReason,
      },
    });
  }

  /**
   * Буцаалтын мэдээллийг авна
   */
  async getRefund(refundId: string) {
    const refund = await this.prisma.tuitionRefund.findUnique({
      where: { id: refundId },
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            email: true,
          },
        },
        classroom: {
          select: { id: true, name: true },
        },
        createdBy: {
          select: { id: true, firstName: true, lastName: true },
        },
        approvedBy: {
          select: { id: true, firstName: true, lastName: true },
        },
        paidBy: {
          select: { id: true, firstName: true, lastName: true },
        },
        cancelledBy: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });
    if (!refund) {
      throw new NotFoundException('Буцаалт олдсонгүй');
    }

    // Анхааруулга хэвлэ
    const warnings = refund.warnings ? JSON.parse(refund.warnings) : [];

    return {
      ...refund,
      warnings,
    };
  }

  /**
   * Буцаалтын жагсаалт (сурагч болон админаар сүүлийн үедийнхээс)
   */
  async listRefunds(
    studentId?: string,
    classroomId?: string,
    status?: string,
    limit = 50,
    offset = 0,
  ) {
    const refunds = await this.prisma.tuitionRefund.findMany({
      where: {
        ...(studentId ? { studentId } : {}),
        ...(classroomId ? { classroomId } : {}),
        ...(status ? { status: status as any } : {}),
      },
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        classroom: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    });

    const total = await this.prisma.tuitionRefund.count({
      where: {
        ...(studentId ? { studentId } : {}),
        ...(classroomId ? { classroomId } : {}),
        ...(status ? { status: status as any } : {}),
      },
    });

    return { refunds, total };
  }

  /**
   * ТАНХИМЫН сурагчийн төлбөр дуусах огноо
   * Сүүлийн CONFIRMED төлбөрүүдээс эхлэл огноо+сар тоолж,
   * AcademicCalendarDay-ийн амралтаар сунгана.
   * Төлбөргүй -> null
   */
  async getPaidUntil(studentId: string, classroomId?: string): Promise<Date | null> {
    // Сурагч байгаа эсэх
    const student = await this.prisma.user.findUnique({
      where: { id: studentId },
      include: { enrollments: { where: { leftAt: null } } },
    });
    if (!student) {
      throw new NotFoundException('Сурагч олдсонгүй');
    }

    // classroomId заагдавал ТАНХИМЫН төлбөр, үгүй бол сүүлийн төлбөр
    let classroom: { id: string } | null = null;
    if (classroomId) {
      classroom = await this.prisma.classroom.findUnique({ where: { id: classroomId } });
      if (!classroom) throw new NotFoundException('Анги олдсонгүй');
    } else if (student.enrollments.length > 0) {
      // ТАНХИМЫН сурагч → сүүлийн идэвхтэй ангийг авна
      const enrollment = student.enrollments[0];
      classroom = { id: enrollment.classroomId };
    }

    // Төлбөр нь САРЫН дүнтэй төлбөр, forMonth = "2026-09" гэх мэт
    // ДАРААЛСАН гинж хайна
    const payments = await this.prisma.payment.findMany({
      where: {
        userId: studentId,
        status: 'CONFIRMED',
      },
      orderBy: { forMonth: 'asc' },
    });

    if (payments.length === 0 || !payments[0].forMonth) {
      return null;
    }

    // Төлбөр эхлэл сарын огноо
    const startMonth = payments[0].forMonth;
    const fromDate = new Date(`${startMonth}-01T00:00:00Z`);

    // Төлсөн сарын тоо (дараалсан гинж шалгана)
    let monthsPaid = 0;
    let expectedMonth = startMonth;
    for (const p of payments) {
      if (p.forMonth === expectedMonth) {
        monthsPaid++;
        // Дараагийн сар авна
        const [y, m] = expectedMonth.split('-').map(Number);
        const next = new Date(y, m, 1);
        expectedMonth = `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, '0')}`;
      } else {
        // Гинж эвдэрсэн → эхний дараалсан хэсгийг авна
        break;
      }
    }

    // Schedule модулаас амралтын өдрүүдийг авна
    const calendars = await this.prisma.academicCalendarDay.findMany({
      where: {
        type: 'HOLIDAY',
        // Төлбөр хугацаанд
        date: { gte: fromDate },
      },
    });

    // computePaidUntil-ийг дуудна
    const paidUntil = computePaidUntil({
      fromDate,
      monthsPaid,
      holidayDates: calendars.map((c) => c.date),
    });

    return paidUntil;
  }
}
