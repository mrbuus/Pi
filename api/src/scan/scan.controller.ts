import { Controller, Get, Param, Req, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Role } from '../generated/prisma/enums';
import { ScanService } from './scan.service';

interface AuthedRequest {
  user: { userId: string; role: Role };
}

// Номын QR код (pimath.mn/q/<код>) → бодлого. Вэб болон гар утасны апп хоёулаа
// энэ маршрутыг ашиглана. Бодолт нээх эрхийг scan/scan-gate.ts шийднэ.
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('scan')
export class ScanController {
  constructor(private readonly scan: ScanService) {}

  // Код таах оролдлогыг удаашруулна: хэвийн хэрэглээнд минутад 30 хангалттай.
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Roles(Role.STUDENT, Role.BUYER, Role.PARENT, Role.ADMIN, Role.TEACHER_PLUS, Role.TEACHER)
  @Get(':code')
  lookup(@Param('code') code: string, @Req() req: AuthedRequest) {
    return this.scan.lookup(code, req.user.userId, req.user.role);
  }
}
