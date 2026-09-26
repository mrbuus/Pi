import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { Role } from '../generated/prisma/enums';
import { Roles } from './decorators/roles.decorator';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { ConsentDto } from './dto/consent.dto';
import { ConsentService } from './consent.service';

@Controller('consent')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(
  Role.ADMIN,
  Role.TEACHER_PLUS,
  Role.TEACHER,
  Role.STUDENT,
  Role.PARENT,
  Role.BUYER,
)
export class ConsentController {
  constructor(private readonly consent: ConsentService) {}
  @Get('my')
  status(@Req() req: { user: { userId: string } }) {
    return this.consent.status(req.user.userId);
  }
  @Post('my')
  accept(@Req() req: { user: { userId: string } }, @Body() dto: ConsentDto) {
    return this.consent.accept(req.user.userId, dto);
  }
}
