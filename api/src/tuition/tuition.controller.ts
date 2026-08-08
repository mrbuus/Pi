import {
  Controller,
  Get,
  Post,
  Query,
  Param,
  Body,
  UseGuards,
  Request as NestRequest,
  ForbiddenException,
} from '@nestjs/common';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../generated/prisma/enums';
import { TuitionService } from './tuition.service';

// ============ DTOs ============

class CreateRefundDto {
  studentId!: string;
  classroomId!: string;
  leftOn!: string;
}

class MarkAsPaidDto {
  paymentMethod?: string;
}

class CancelRefundDto {
  cancelReason?: string;
}

@Controller('tuition')
export class TuitionController {
  constructor(private tuitionService: TuitionService) {}

  /**
   * Буцаалтын тооцоо харуулна (баталгаажаагүй)
   * GET /tuition/refund/preview?studentId&classroomId&leftOn
   */
  @Get('refund/preview')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.TEACHER_PLUS)
  async previewRefund(
    @Query('studentId') studentId: string,
    @Query('classroomId') classroomId: string,
    @Query('leftOn') leftOn: string,
  ) {
    return this.tuitionService.previewRefund(studentId, classroomId, leftOn);
  }

  /**
   * Буцаалтыг үүсгэнэ (DRAFT)
   * POST /tuition/refund
   */
  @Post('refund')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.TEACHER_PLUS)
  async createRefund(
    @Body() dto: CreateRefundDto,
    @NestRequest() req: Request,
  ) {
    const userId = (req.user as any).id;
    return this.tuitionService.createRefund(
      dto.studentId,
      dto.classroomId,
      dto.leftOn,
      userId,
    );
  }

  /**
   * Буцаалтыг PENDING_APPROVAL явуулна
   * POST /tuition/refund/:id/pending
   */
  @Post('refund/:id/pending')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.TEACHER_PLUS)
  async submitForApproval(@Param('id') refundId: string) {
    return this.tuitionService.submitForApproval(refundId);
  }

  /**
   * Буцаалтыг БАТАЛГААЖУУЛНА (APPROVED)
   * POST /tuition/refund/:id/approve
   */
  @Post('refund/:id/approve')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async approveRefund(
    @Param('id') refundId: string,
    @NestRequest() req: Request,
  ) {
    const userId = (req.user as any).id;
    return this.tuitionService.approveRefund(refundId, userId);
  }

  /**
   * Буцаалтыг ТӨЛӨГДСӨН гэж тэмдэглэнэ (PAID)
   * POST /tuition/refund/:id/paid
   */
  @Post('refund/:id/paid')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async markAsPaid(
    @Param('id') refundId: string,
    @Body() dto: MarkAsPaidDto,
    @NestRequest() req: Request,
  ) {
    const userId = (req.user as any).id;
    return this.tuitionService.markAsPaid(refundId, userId, dto.paymentMethod);
  }

  /**
   * Буцаалтыг ЦУЦАЛНА
   * POST /tuition/refund/:id/cancel
   */
  @Post('refund/:id/cancel')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.TEACHER_PLUS)
  async cancelRefund(
    @Param('id') refundId: string,
    @Body() dto: CancelRefundDto,
    @NestRequest() req: Request,
  ) {
    const userId = (req.user as any).id;
    return this.tuitionService.cancelRefund(refundId, userId, dto.cancelReason);
  }

  /**
   * Буцаалтын мэдээллийг авна
   * GET /tuition/refund/:id
   */
  @Get('refund/:id')
  @UseGuards(JwtAuthGuard)
  async getRefund(@Param('id') refundId: string) {
    return this.tuitionService.getRefund(refundId);
  }

  /**
   * Буцаалтуудыг сүүлийн үедийнхээс хайна
   * GET /tuition/refunds?studentId&classroomId&status&limit&offset
   */
  @Get('refunds')
  @UseGuards(JwtAuthGuard)
  async listRefunds(
    @Query('studentId') studentId?: string,
    @Query('classroomId') classroomId?: string,
    @Query('status') status?: string,
    @Query('limit') limit = 50,
    @Query('offset') offset = 0,
  ) {
    return this.tuitionService.listRefunds(
      studentId,
      classroomId,
      status,
      Math.min(limit, 100),
      offset,
    );
  }

  /**
   * ӨӨРИЙН төлбөр дуусах огноо (STUDENT)
   * GET /tuition/paid-until/my
   */
  @Get('paid-until/my')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.STUDENT)
  async getMyPaidUntil(@NestRequest() req: Request) {
    const userId = (req.user as any).id;
    const paidUntil = await this.tuitionService.getPaidUntil(userId);
    return { paidUntil };
  }

  /**
   * СУРАГЧИЙН төлбөр дуусах огноо (ADMIN/TEACHER_PLUS/TEACHER, эцэг эх өөрийн хүүхдэд)
   * GET /tuition/paid-until/:studentId
   */
  @Get('paid-until/:studentId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.TEACHER_PLUS, Role.TEACHER)
  async getPaidUntil(
    @Param('studentId') studentId: string,
    @NestRequest() req: Request,
  ) {
    const userId = (req.user as any).id;
    const userRole = (req.user as any).role;

    // TEACHER → өөрийн ангийн сурагчид л
    if (userRole === Role.TEACHER) {
      const enrollments = await this.tuitionService['prisma'].enrollment.findMany({
        where: { studentId, leftAt: null },
        include: { classroom: true },
      });
      const hasAccess = enrollments.some((e) => e.classroom.teacherId === userId);
      if (!hasAccess) {
        throw new ForbiddenException(
          'Та энэ сурагчийн багш биш байна',
        );
      }
    }
    // PARENT -> өөрийн хүүхдэд
    if (userRole === Role.PARENT) {
      const parentLink = await this.tuitionService['prisma'].parentLink.findFirst({
        where: { parentId: userId, studentId: studentId },
      });
      if (!parentLink) {
        throw new ForbiddenException(
          'Та энэ хүүхдийн эцэг эх биш байна',
        );
      }
    }

    const paidUntil = await this.tuitionService.getPaidUntil(studentId);
    return { paidUntil };
  }
}
