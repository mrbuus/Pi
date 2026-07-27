import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Role } from '../generated/prisma/enums';
import { AuditService } from './audit.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('audit')
export class AuditController {
  constructor(private audit: AuditService) {}

  // Зөвхөн ADMIN: бүх системийн аудит лог, шүүлтүүртэй, хуудаслалттай
  @Roles(Role.ADMIN)
  @Get()
  list(
    @Query('entity') entity?: string,
    @Query('entityId') entityId?: string,
    @Query('actorId') actorId?: string,
    @Query('action') action?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.audit.list({
      entity,
      entityId,
      actorId,
      action,
      from,
      to,
      page,
      pageSize,
    });
  }

  // ADMIN + TEACHER_PLUS: нэг бичлэгийн бүрэн өөрчлөлтийн түүх
  @Roles(Role.ADMIN, Role.TEACHER_PLUS)
  @Get('entity/:entity/:entityId')
  history(
    @Param('entity') entity: string,
    @Param('entityId') entityId: string,
  ) {
    return this.audit.historyFor(entity, entityId);
  }
}
