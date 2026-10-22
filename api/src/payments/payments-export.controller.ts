import { Controller, Get, Query, Req, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Role } from '../generated/prisma/enums';
import { PaymentFilterQueryDto } from './dto/payment-filter.dto';
import { FinanceCapabilityGuard } from './finance-capability.guard';
import { PaymentsExportService } from './payments-export.service';

interface AuthedRequest {
  user: { userId: string; role: Role };
}

/**
 * Төлбөрийн CSV (UTF-8 BOM). Эрх нь `GET /payments`-тэй яг ижил: ADMIN,
 * Багш+ ба finance.manage. Зам 2 сегменттэй тул `payments/:id`-тэй давхцахгүй.
 */
@Controller('payments/export')
@UseGuards(JwtAuthGuard, RolesGuard, FinanceCapabilityGuard)
@Roles(Role.ADMIN, Role.TEACHER_PLUS)
export class PaymentsExportController {
  constructor(private readonly exporter: PaymentsExportService) {}

  @Get('csv')
  async csv(
    @Query() q: PaymentFilterQueryDto,
    @Req() req: AuthedRequest,
    @Res({ passthrough: true }) res: Response,
  ): Promise<string> {
    const { filename, body } = await this.exporter.csv(q, {
      id: req.user.userId,
      role: req.user.role,
    });
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Cache-Control', 'no-store');
    return body;
  }
}
