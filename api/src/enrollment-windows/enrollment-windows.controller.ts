import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Role } from '../generated/prisma/enums';
import { UpdateEnrollmentWindowDto } from './dto/enrollment-window.dto';
import { EnrollmentWindowsService } from './enrollment-windows.service';

interface AuthedRequest {
  user: { userId: string; role: Role };
}

// GET нь landing page-д JWT-гүйгээр дуудагдана (сурагч болохоос өмнө ямар
// хичээл нээлттэйг харуулах ёстой). PATCH зөвхөн Багш+/Админ.
@Controller('enrollment-windows')
export class EnrollmentWindowsController {
  constructor(private windows: EnrollmentWindowsService) {}

  @Get()
  findAll() {
    return this.windows.findAll();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.TEACHER_PLUS)
  @Patch(':subject')
  update(
    @Param('subject') subject: string,
    @Body() dto: UpdateEnrollmentWindowDto,
    @Req() req: AuthedRequest,
  ) {
    return this.windows.update(subject, dto, req.user.userId, req.user.role);
  }
}
