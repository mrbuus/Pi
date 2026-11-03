import { Controller, Get, Header, Req, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Role } from '../generated/prisma/enums';
import { UsersService } from './users.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.TEACHER_PLUS)
@Controller('students')
export class StudentsExportController {
  constructor(private readonly users: UsersService) {}

  @Get('export.csv')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="students.csv"')
  exportStudents(@Req() req: { user: { userId: string } }): Promise<string> {
    return this.users.exportStudentsCsv(req.user.userId);
  }

  /** Бүртгэлийн Excel — эх БҮРТГЭЛ-2027-тэй ижил табтай, баганатай (эзэн 2026-11-03) */
  @Get('export.xlsx')
  async exportXlsx(
    @Req() req: { user: { userId: string } },
    @Res() res: Response,
  ): Promise<void> {
    const file = await this.users.exportStudentsXlsx(req.user.userId);
    const stamp = new Date().toISOString().slice(0, 10);
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', `attachment; filename="burtgel-${stamp}.xlsx"`);
    res.setHeader('Cache-Control', 'no-store');
    res.end(file);
  }
}
