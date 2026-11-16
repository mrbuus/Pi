import { Controller, Get, Header, Req, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Role } from '../generated/prisma/enums';
import { StudentsFullExportService } from './students-full-export.service';
import { UsersService } from './users.service';
import { RequireCapability } from '../staff-capabilities/capability.guard';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.TEACHER_PLUS)
@Controller('students')
export class StudentsExportController {
  constructor(
    private readonly users: UsersService,
    private readonly full: StudentsFullExportService,
  ) {}

  @Get('export.csv')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="students.csv"')
  @RequireCapability('students.export')
  exportStudents(@Req() req: { user: { userId: string } }): Promise<string> {
    return this.users.exportStudentsCsv(req.user.userId);
  }

  /**
   * Бүртгэлийн Excel — эх БҮРТГЭЛ-2027-тэй ижил табтай, баганатай (эзэн 2026-11-03) + татах агшны
   * сангийн бүх мэдээлэлтэй «Бүх мэдээлэл» таб (эзэн 2026-11-16)
   */
  @Get('export.xlsx')
  @RequireCapability('students.export')
  async exportXlsx(
    @Req() req: { user: { userId: string } },
    @Res() res: Response,
  ): Promise<void> {
    const file = await this.full.exportXlsx(req.user.userId);
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
