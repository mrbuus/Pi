import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { PaymentStatus, Role } from '../generated/prisma/enums';
import { ConfirmPaymentDto, CreatePaymentDto } from './dto/payment.dto';
import { PaymentsService } from './payments.service';

interface AuthedRequest {
  user: { userId: string; role: Role };
}

@Controller()
export class PaymentsController {
  constructor(private payments: PaymentsService) {}

  @UseGuards(JwtAuthGuard)
  @Post('payments')
  create(@Body() dto: CreatePaymentDto, @Req() req: AuthedRequest) {
    return this.payments.create(dto, req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('payments/my')
  my(@Req() req: AuthedRequest) {
    return this.payments.my(req.user.userId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.TEACHER_PLUS)
  @Get('payments')
  list(@Query('status') status?: PaymentStatus) {
    return this.payments.list(status);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.TEACHER_PLUS)
  @Post('payments/:id/confirm')
  confirm(
    @Param('id') id: string,
    @Body() dto: ConfirmPaymentDto,
    @Req() req: AuthedRequest,
  ) {
    return this.payments.confirm(id, dto, req.user.userId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.TEACHER_PLUS)
  @Post('payments/:id/reject')
  reject(@Param('id') id: string, @Req() req: AuthedRequest) {
    return this.payments.reject(id, req.user.userId);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.TEACHER_PLUS)
  @Get('payments/months/:month')
  monthStatus(@Param('month') month: string) {
    return this.payments.monthStatus(month);
  }

  // QPay webhook — нэвтрэлтгүй (QPay сервэрээс дуудагдана)
  @Post('payments/qpay/webhook')
  qpayWebhook(@Body() body: { invoiceId?: string }) {
    return this.payments.qpayWebhook(body.invoiceId ?? '');
  }
}
