import {
  Body,
  Controller,
  Delete,
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
import { Role } from '../generated/prisma/enums';
import { LedgerBoardQueryDto, LedgerExtendDto, LedgerPayDto, LedgerSettleDto } from './dto/ledger.dto';
import { FinanceCapabilityGuard } from './finance-capability.guard';
import { PaymentsLedgerService } from './ledger.service';
import {
  amountsHiddenFor,
  redactBoard,
  redactOverview,
  redactRowResult,
  redactStudent,
} from './ledger-redact';

interface AuthedRequest {
  user: { userId: string; role: Role };
}

/**
 * «Төлбөр» хэсгийн сарын блок (2026-10-13). Бүх зам 2+ сегменттэй тул
 * PaymentsController-ийн `payments/:id`-тэй давхцахгүй.
 * Багш+ төлбөрийг байнга удирдана (finance.manage — эзний шийдвэр 2026-10-08),
 * гэхдээ ЗӨВХӨН ТӨЛӨВ харна — мөнгөн дүнг серверээс хасна (ledger-redact.ts).
 */
@Controller('payments/ledger')
@UseGuards(JwtAuthGuard, RolesGuard, FinanceCapabilityGuard)
@Roles(Role.ADMIN, Role.TEACHER_PLUS)
export class PaymentsLedgerController {
  constructor(private ledger: PaymentsLedgerService) {}

  @Get('overview')
  async overview(@Req() req: AuthedRequest) {
    const o = await this.ledger.overview();
    return amountsHiddenFor(req.user.role) ? redactOverview(o) : o;
  }

  @Get('board')
  async board(@Query() q: LedgerBoardQueryDto, @Req() req: AuthedRequest) {
    const b = await this.ledger.board(q);
    return amountsHiddenFor(req.user.role) ? redactBoard(b) : b;
  }

  @Get('student/:id')
  async student(@Param('id') id: string, @Req() req: AuthedRequest) {
    const s = await this.ledger.student(id);
    return amountsHiddenFor(req.user.role) ? redactStudent(s) : s;
  }

  @Post('student/:id/pay')
  async pay(
    @Param('id') id: string,
    @Body() dto: LedgerPayDto,
    @Req() req: AuthedRequest,
  ) {
    const res = await this.ledger.pay(id, dto, { id: req.user.userId, role: req.user.role });
    return amountsHiddenFor(req.user.role) ? redactRowResult(res) : res;
  }

  /** Төлөв л солино (бүтэн жил / системийн тооцоо) — төлсөн дүнд хүрэхгүй. */
  @Post('student/:id/settle')
  async settle(
    @Param('id') id: string,
    @Body() dto: LedgerSettleDto,
    @Req() req: AuthedRequest,
  ) {
    const res = await this.ledger.settle(id, dto, { id: req.user.userId, role: req.user.role });
    return amountsHiddenFor(req.user.role) ? redactRowResult(res) : res;
  }

  /** Сар бүрийн төлбөрийн төлөх хугацааг сунгана (тэр сар ба түүнээс хойших бүх сар шилжинэ). */
  @Post('student/:id/extensions')
  async extend(@Param('id') id: string, @Body() dto: LedgerExtendDto, @Req() req: AuthedRequest) {
    const res = await this.ledger.extend(id, dto, { id: req.user.userId, role: req.user.role });
    return amountsHiddenFor(req.user.role) ? redactRowResult(res) : res;
  }

  /** Сунгалтыг цуцлах (зөөлөн — мөр үлдэнэ) */
  @Delete('student/:id/extensions/:extId')
  async unextend(@Param('id') id: string, @Param('extId') extId: string, @Req() req: AuthedRequest) {
    const res = await this.ledger.unextend(id, extId, { id: req.user.userId, role: req.user.role });
    return amountsHiddenFor(req.user.role) ? redactRowResult(res) : res;
  }
}
