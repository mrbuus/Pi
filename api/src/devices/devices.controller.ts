import { Body, Controller, Delete, Param, Post, Req, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Role } from '../generated/prisma/enums';
import { RegisterDeviceDto } from './devices.dto';
import { DevicesService } from './devices.service';

interface AuthedRequest {
  user: { userId: string; role: Role };
}

const ALL_ROLES = [
  Role.STUDENT,
  Role.PARENT,
  Role.BUYER,
  Role.TEACHER,
  Role.TEACHER_PLUS,
  Role.ADMIN,
];

// Гар утасны апп: push мэдэгдлийн токен (piemath_app/docs/ARCHITECTURE.md §6).
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('devices')
export class DevicesController {
  constructor(private readonly devices: DevicesService) {}

  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Roles(...ALL_ROLES)
  @Post()
  register(@Body() dto: RegisterDeviceDto, @Req() req: AuthedRequest) {
    return this.devices.register(req.user.userId, dto);
  }

  @Roles(...ALL_ROLES)
  @Delete(':token')
  unregister(@Param('token') token: string, @Req() req: AuthedRequest) {
    return this.devices.unregister(req.user.userId, token);
  }
}
