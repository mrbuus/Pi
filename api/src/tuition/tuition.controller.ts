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
import {
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../generated/prisma/enums';
import { TuitionService } from './tuition.service';

// ============ DTOs ============

// ⚠️ Глобал ValidationPipe `whitelist: true` тул декораторгүй талбар бүр
// ЧИМЭЭГҮЙ хасагддаг — өмнө нь эдгээр DTO декораторгүй байсан тул буцаалт
// үүсгэх, олгох, цуцлах бүх хүсэлт хоосон биетэй сервис рүү очдог байв.
export class CreateRefundDto {
  @IsString()
  @IsNotEmpty()
  studentId!: string;

  @IsString()
  @IsNotEmpty()
  classroomId!: string;

  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'Огноо ЖЖЖЖ-СС-ӨӨ хэлбэртэй байна' })
  leftOn!: string;
}

export class MarkAsPaidDto {
  @IsOptional()
  @IsIn(['CASH', 'BANK_TRANSFER', 'QPAY'])
  paymentMethod?: string;
}

export class CancelRefundDto {
  @IsOptional()
  @IsString()
  @MaxLength(1000)
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
    const userId = (req.user as any).userId;
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
    const userId = (req.user as any).userId;
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
    const userId = (req.user as any).userId;
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
    const userId = (req.user as any).userId;
    return this.tuitionService.cancelRefund(refundId, userId, dto.cancelReason);
  }

  /**
   * Буцаалтын мэдээллийг авна
   * GET /tuition/refund/:id
   */
  @Get('refund/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.TEACHER_PLUS) // сурагчийн нэр, буцаалтын дүн — ажилтанд л (G03)
  async getRefund(@Param('id') refundId: string) {
    return this.tuitionService.getRefund(refundId);
  }

  /**
   * Буцаалтуудыг сүүлийн үедийнхээс хайна
   * GET /tuition/refunds?studentId&classroomId&status&limit&offset
   */
  @Get('refunds')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.TEACHER_PLUS) // сурагчийн нэр, буцаалтын дүн — ажилтанд л (G03)
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
    const userId = (req.user as any).userId;
    const paidUntil = await this.tuitionService.getPaidUntil(userId);
    return { paidUntil };
  }

  /**
   * СУРАГЧИЙН төлбөр дуусах огноо (ADMIN/TEACHER_PLUS/TEACHER, эцэг эх өөрийн хүүхдэд)
   * GET /tuition/paid-until/:studentId
   */
  @Get('paid-until/:studentId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.TEACHER_PLUS, Role.TEACHER, Role.PARENT)
  async getPaidUntil(
    @Param('studentId') studentId: string,
    @NestRequest() req: Request,
  ) {
    const userId = (req.user as any).userId;
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
      const verifiedLink = await this.tuitionService.hasVerifiedParentLink(
        userId,
        studentId,
      );
      if (!verifiedLink) {
        throw new ForbiddenException(
          'Эцэг эхийн холбоос баталгаажаагүй байна',
        );
      }
    }

    const paidUntil = await this.tuitionService.getPaidUntil(studentId);
    return { paidUntil };
  }
}
