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
import { Role } from '../generated/prisma/enums';
import { LedgerBoardQueryDto, LedgerPayDto } from './dto/ledger.dto';
import { FinanceCapabilityGuard } from './finance-capability.guard';
import { PaymentsLedgerService } from './ledger.service';

interface AuthedRequest {
  user: { userId: string; role: Role };
}

/**
 * «Төлбөр» хэсгийн сарын блок (2026-10-13). Бүх зам 2+ сегменттэй тул
 * PaymentsController-ийн `payments/:id`-тэй давхцахгүй.
 * Багш+ төлбөрийг байнга удирдана (finance.manage — эзний шийдвэр 2026-10-08).
 */
@Controller('payments/ledger')
@UseGuards(JwtAuthGuard, RolesGuard, FinanceCapabilityGuard)
@Roles(Role.ADMIN, Role.TEACHER_PLUS)
export class PaymentsLedgerController {
  constructor(private ledger: PaymentsLedgerService) {}

  @Get('overview')
  overview() {
    return this.ledger.overview();
  }

  @Get('board')
  board(@Query() q: LedgerBoardQueryDto) {
    return this.ledger.board(q);
  }

  @Get('student/:id')
  student(@Param('id') id: string) {
    return this.ledger.student(id);
  }

  @Post('student/:id/pay')
  pay(
    @Param('id') id: string,
    @Body() dto: LedgerPayDto,
    @Req() req: AuthedRequest,
  ) {
    return this.ledger.pay(id, dto, { id: req.user.userId, role: req.user.role });
  }
}
