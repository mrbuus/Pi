import {
  Body,
  Controller,
  Get,
  Param,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../generated/prisma/enums';
import { DismissalService } from './dismissal.service';
import type { DismissalInput } from './dismissal';
interface Request {
  user: { userId: string; role: Role };
}
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.TEACHER_PLUS, Role.TEACHER)
@Controller('learning-lab/classrooms/:id/dismissal')
export class DismissalController {
  constructor(private readonly dismissal: DismissalService) {}
  @Get() get(
    @Req() req: Request,
    @Param('id') id: string,
    @Query('date') date: string,
  ) {
    return this.dismissal.get(req.user.userId, req.user.role, id, date);
  }
  @Put() save(
    @Req() req: Request,
    @Param('id') id: string,
    @Query('date') date: string,
    @Body() body: DismissalInput,
  ) {
    return this.dismissal.save(req.user.userId, req.user.role, id, date, body);
  }
}
