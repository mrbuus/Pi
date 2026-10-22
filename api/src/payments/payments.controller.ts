import { StaffCapabilityService } from '../staff-capabilities/staff-capability.service';
import { FinanceCapabilityGuard } from './finance-capability.guard';
import {
  Body,
  NotFoundException,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Role } from '../generated/prisma/enums';
import {
  ConfirmPaymentDto,
  CreatePaymentDto,
  CreateManualPaymentDto,
  RejectPaymentDto,
  ReversePaymentDto,
  UpdatePaymentDto,
} from './dto/payment.dto';
import { PaymentFilterQueryDto } from './dto/payment-filter.dto';
import { PaymentsService } from './payments.service';

interface AuthedRequest {
  user: { userId: string; role: Role };
}

@Controller()
export class PaymentsController {
  constructor(
    private payments: PaymentsService,
    private capabilities: StaffCapabilityService,
  ) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.TEACHER_PLUS, Role.STUDENT, Role.BUYER)
  @Post('payments')
  async create(@Body() dto: CreatePaymentDto, @Req() req: AuthedRequest) {
    if (req.user.role !== Role.STUDENT && req.user.role !== Role.BUYER)
      await this.capabilities.assert(req.user.userId, 'finance.manage');
    return this.payments.create(dto, req.user.userId, req.user.role);
  }

  @UseGuards(JwtAuthGuard, RolesGuard, FinanceCapabilityGuard)
  @Roles(Role.ADMIN, Role.TEACHER_PLUS)
  @Post('payments/manual')
  manual(@Body() dto: CreateManualPaymentDto, @Req() req: AuthedRequest) {
    const { userId, ...payment } = dto;
    return this.payments.createManual(payment, userId, {
      id: req.user.userId,
      role: req.user.role,
    });
  }

  @UseGuards(JwtAuthGuard)
  @Get('payments/my')
  my(@Req() req: AuthedRequest) {
    return this.payments.my(req.user.userId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard, FinanceCapabilityGuard)
  @Roles(Role.ADMIN, Role.TEACHER_PLUS)
  @Get('payments')
  list(@Query() filters: PaymentFilterQueryDto) {
    return this.payments.list(filters);
  }

  // Багш+ бүртгэл/төлбөр/өдөртэй холбоотой ЮМЫГ ч засаж чадах ёстой (эзэмшигчийн
  // шаардлага) — дүн, арга, огноо, сар, тайлбар. Шалтгаан заавал (DTO шалгана).
  @UseGuards(JwtAuthGuard, RolesGuard, FinanceCapabilityGuard)
  @Roles(Role.ADMIN, Role.TEACHER_PLUS)
  @Patch('payments/:id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdatePaymentDto,
    @Req() req: AuthedRequest,
  ) {
    return this.payments.update(id, dto, {
      id: req.user.userId,
      role: req.user.role,
    });
  }

  @UseGuards(JwtAuthGuard, RolesGuard, FinanceCapabilityGuard)
  @Roles(Role.ADMIN, Role.TEACHER_PLUS)
  @Post('payments/:id/confirm')
  confirm(
    @Param('id') id: string,
    @Body() dto: ConfirmPaymentDto,
    @Req() req: AuthedRequest,
  ) {
    return this.payments.confirm(id, dto, {
      id: req.user.userId,
      role: req.user.role,
    });
  }

  @UseGuards(JwtAuthGuard, RolesGuard, FinanceCapabilityGuard)
  @Roles(Role.ADMIN, Role.TEACHER_PLUS)
  @Post('payments/:id/reject')
  reject(
    @Param('id') id: string,
    @Body() dto: RejectPaymentDto,
    @Req() req: AuthedRequest,
  ) {
    return this.payments.reject(
      id,
      { id: req.user.userId, role: req.user.role },
      dto?.reason,
    );
  }

  // Баталгаажсан төлбөрийг буцаах — олгосон эрхийг автоматаар цуцална
  // (мөнгө/эрх зөрүүтэй үлдэхгүй байх эзэмшигчийн шаардлага)
  @UseGuards(JwtAuthGuard, RolesGuard, FinanceCapabilityGuard)
  @Roles(Role.ADMIN, Role.TEACHER_PLUS)
  @Post('payments/:id/reverse')
  reverse(
    @Param('id') id: string,
    @Body() dto: ReversePaymentDto,
    @Req() req: AuthedRequest,
  ) {
    return this.payments.reverse(id, dto, {
      id: req.user.userId,
      role: req.user.role,
    });
  }

  @UseGuards(JwtAuthGuard, RolesGuard, FinanceCapabilityGuard)
  @Roles(Role.ADMIN, Role.TEACHER_PLUS)
  @Get('payments/months/:month')
  monthStatus(@Param('month') month: string) {
    return this.payments.monthStatus(month);
  }

  // Нэг сурагчийн бүх төлбөрийн түүх + хураангуй (хэдэн төлсөн/үлдэгдэл хэд)
  @UseGuards(JwtAuthGuard, RolesGuard, FinanceCapabilityGuard)
  @Roles(Role.ADMIN, Role.TEACHER_PLUS)
  @Get('payments/student/:id')
  studentHistory(@Param('id') id: string) {
    return this.payments.studentHistory(id);
  }

  // Тухайн сард дутуу төлсөн танхимын сурагчдын жагсаалт — хөөцөлдөх зорилготой
  @UseGuards(JwtAuthGuard, RolesGuard, FinanceCapabilityGuard)
  @Roles(Role.ADMIN, Role.TEACHER_PLUS)
  @Get('payments/outstanding')
  outstanding(@Query('month') month: string) {
    return this.payments.outstanding(month);
  }

  @UseGuards(JwtAuthGuard)
  @Get('payments/:id')
  async checkout(@Param('id') id: string, @Req() req: AuthedRequest) {
    const { userId, ...payment } = await this.payments.readForCheckout(id);
    if (userId !== req.user.userId) {
      if (req.user.role !== Role.ADMIN && req.user.role !== Role.TEACHER_PLUS)
        throw new NotFoundException('Төлбөр олдсонгүй');
      await this.capabilities.assert(req.user.userId, 'finance.manage');
    }
    return payment;
  }

  // ⚠️ Хуучин `POST /payments/qpay/webhook` УСТГАГДСАН (2026-07-27).
  //
  // Тэр endpoint нь callback-ийн биеийг шууд итгэж, зөвхөн invoiceId-гаар
  // төлбөрийг CONFIRMED болгодог байсан — өөрөөр хэлбэл хэн ч хүссэн
  // нэхэмжлэхээ "төлөгдсөн" болгож чадах байв.
  //
  // Одоо ганц зам үлдсэн: `POST /gateways/qpay/callback`. Тэр нь callback-ийн
  // биеэс зөвхөн invoice id-г аваад QPay-ийн /v2/payment/check рүү өөрөө
  // хандаж баталгаажуулна, дүнг тулгана, дараа нь
  // PaymentsService.confirmQpayPayment()-ийг дуудна.
  //
  // Хоёр зөрүүтэй QPay орох цэг үлдээх нь эрсдэлтэй тул энэ нь зориудаар
  // сэргээгдэхгүй.
}
