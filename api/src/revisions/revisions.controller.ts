import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Role } from '../generated/prisma/enums';
import { RestoreRevisionDto } from './revisions.dto';
import { RevisionsService } from './revisions.service';

interface AuthedRequest {
  user: { userId: string; role: Role };
}

/**
 * Өөрчлөлтийн түүх (docs/v2/BUTSAAH-TUUKH-TOLOVLOGOO.md). :entity = PROBLEM | TEST.
 * Зөвхөн ажилтан: Багш+/Админ — бүгд, Багш — өөрийн үүсгэсэн/зассан (сервист).
 * Сурагч, эцэг эх, худалдан авагч ХЭЗЭЭ Ч хүрэхгүй (access-control.spec).
 */
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.TEACHER_PLUS, Role.TEACHER)
@Controller('revisions')
export class RevisionsController {
  constructor(private readonly revisions: RevisionsService) {}

  @Get(':entity/:id')
  list(
    @Param('entity') entity: string,
    @Param('id') id: string,
    @Req() req: AuthedRequest,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.revisions.list(
      entity,
      id,
      req.user.userId,
      page ? Number(page) : 1,
      pageSize ? Number(pageSize) : 20,
    );
  }

  @Get(':entity/:id/:version')
  detail(
    @Param('entity') entity: string,
    @Param('id') id: string,
    @Param('version', ParseIntPipe) version: number,
    @Req() req: AuthedRequest,
  ) {
    return this.revisions.detail(entity, id, version, req.user.userId);
  }

  // Сэргээх нь өөрөө шинэ хувилбар (RESTORE) — түүх устахгүй.
  @Post(':entity/:id/restore/:version')
  restore(
    @Param('entity') entity: string,
    @Param('id') id: string,
    @Param('version', ParseIntPipe) version: number,
    @Body() dto: RestoreRevisionDto,
    @Req() req: AuthedRequest,
  ) {
    return this.revisions.restore(entity, id, version, req.user.userId, dto ?? {});
  }
}
