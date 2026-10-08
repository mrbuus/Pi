import { Controller, Get, Param, Req, UseGuards } from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Role } from '../generated/prisma/enums';
import { ReadinessService } from './readiness.service';

interface AuthedRequest { user: { userId: string; role: Role } }

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.STUDENT, Role.PARENT, Role.TEACHER, Role.TEACHER_PLUS, Role.ADMIN)
@Controller('readiness')
export class ReadinessController {
  constructor(private readonly readiness: ReadinessService) {}

  @Get('my')
  @Roles(Role.STUDENT)
  my(@Req() req: AuthedRequest) {
    return this.readiness.getForStudent(req.user.userId, req.user.role, req.user.userId);
  }

  @Get('student/:id')
  student(@Param('id') id: string, @Req() req: AuthedRequest) {
    return this.readiness.getForStudent(req.user.userId, req.user.role, id);
  }
}
