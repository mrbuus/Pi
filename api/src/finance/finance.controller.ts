import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { FinanceService } from './finance.service';
import { CreateExpenseDto, UpdateExpenseDto } from './dto/finance.dto';

@Controller('api/finance')
@UseGuards(JwtAuthGuard)
export class FinanceController {
  constructor(private finance: FinanceService) {}

  /**
   * Сарын интегрирован санхүүгийн тайлан авах
   * GET /api/finance/report?month=2026-08
   */
  @Get('report')
  async getMonthlyReport(@Query('month') month: string) {
    return this.finance.getMonthlyReport(month);
  }

  /**
   * Сарын бүх зарлагыг авах
   * GET /api/finance/expenses?month=2026-08
   */
  @Get('expenses')
  async getExpenses(@Query('month') month: string) {
    return this.finance.getExpenses(month);
  }

  /**
   * Шинэ зарлага үүсгэх (ADMIN эрхтэй л)
   * POST /api/finance/expenses
   */
  @Post('expenses')
  async createExpense(@Request() req: any, @Body() dto: CreateExpenseDto) {
    return this.finance.createExpense(
      { id: req.user.id, role: req.user.role },
      {
        amount: dto.amount,
        category: dto.category,
        description: dto.description,
        occurredOn: new Date(dto.occurredOn),
      },
    );
  }

  /**
   * Зарлагыг засах (ADMIN эрхтэй л)
   * PATCH /api/finance/expenses/:id
   */
  @Patch('expenses/:id')
  async updateExpense(
    @Request() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateExpenseDto,
  ) {
    return this.finance.updateExpense(
      { id: req.user.id, role: req.user.role },
      id,
      {
        amount: dto.amount,
        category: dto.category,
        description: dto.description,
        occurredOn: dto.occurredOn ? new Date(dto.occurredOn) : undefined,
      },
    );
  }

  /**
   * Зарлагыг устгах (ADMIN эрхтэй л)
   * DELETE /api/finance/expenses/:id
   */
  @Delete('expenses/:id')
  async deleteExpense(@Request() req: any, @Param('id') id: string) {
    return this.finance.deleteExpense(
      { id: req.user.id, role: req.user.role },
      id,
    );
  }
}
