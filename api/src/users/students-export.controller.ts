import { Controller, Get, Header, UseGuards } from '@nestjs/common';
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
  exportStudents(): Promise<string> {
    return this.users.exportStudentsCsv();
  }
}
