import {
  Body,
  Controller,
  HttpCode,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Role } from '../generated/prisma/enums';
import { PresenceDto } from './presence.dto';
import { PresenceService } from './presence.service';

interface AuthedRequest {
  user: { userId: string; role: Role };
}

// «Хэн засаж байна» — зөвхөн ажилтан (сурагч, эцэг эхэд хэзээ ч харагдахгүй).
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('presence')
export class PresenceController {
  constructor(private readonly presence: PresenceService) {}

  @Roles(Role.ADMIN, Role.TEACHER_PLUS, Role.TEACHER)
  @Post()
  @HttpCode(200)
  beat(@Body() dto: PresenceDto, @Req() req: AuthedRequest) {
    return this.presence.beat(req.user.userId, dto.keys, dto.leave === true);
  }
}
