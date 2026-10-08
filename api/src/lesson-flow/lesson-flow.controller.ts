import {
  Body,
  Post,
  Put,
  Controller,
  Get,
  Param,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../generated/prisma/enums';
import { LessonFlowService } from './lesson-flow.service';
@Controller('lesson-flow')
@UseGuards(JwtAuthGuard, RolesGuard)
export class LessonFlowController {
  constructor(private readonly flow: LessonFlowService) {}
  @Get('classrooms/:id/preview')
  @Roles(Role.ADMIN, Role.TEACHER, Role.TEACHER_PLUS)
  preview(
    @Param('id') id: string,
    @Query('date') date: string,
    @Query('chapterId') chapterId: string,
    @Req() req: { user: { userId: string; role: Role } },
  ) {
    return this.flow.preview(
      id,
      date,
      chapterId,
      req.user.userId,
      req.user.role,
    );
  }

  @Put('classrooms/:id/day')
  @Roles(Role.ADMIN, Role.TEACHER, Role.TEACHER_PLUS)
  save(
    @Param('id') id: string,
    @Query('date') date: string,
    @Body() body: unknown,
    @Req() req: { user: { userId: string; role: Role } },
  ) {
    return this.flow.save(id, date, body, req.user.userId, req.user.role);
  }
  @Get('my') @Roles(Role.STUDENT) mine(
    @Req() req: { user: { userId: string; role: Role } },
  ) {
    return this.flow.mine(req.user.userId);
  }
  @Get('days/:id')
  @Roles(Role.STUDENT, Role.PARENT, Role.ADMIN, Role.TEACHER, Role.TEACHER_PLUS)
  read(
    @Param('id') id: string,
    @Query('studentId') studentId: string | undefined,
    @Req() req: { user: { userId: string; role: Role } },
  ) {
    return this.flow.read(id, req.user.userId, req.user.role, studentId);
  }
  @Post('days/:id/receipts')
  @Roles(Role.STUDENT)
  receipt(
    @Param('id') id: string,
    @Body() body: unknown,
    @Req() req: { user: { userId: string; role: Role } },
  ) {
    return this.flow.receipt(id, body, req.user.userId);
  }
  @Post('days/:id/photo-turn')
  @Roles(Role.ADMIN, Role.TEACHER, Role.TEACHER_PLUS)
  turn(
    @Param('id') id: string,
    @Body() body: unknown,
    @Req() req: { user: { userId: string; role: Role } },
  ) {
    return this.flow.turn(id, body, req.user.userId, req.user.role);
  }
}
