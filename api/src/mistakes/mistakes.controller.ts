import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../generated/prisma/enums';
import { MistakeQueryDto, RetryMistakeDto, UpdateMistakeDto } from './dto/mistake.dto';
import { MistakesService } from './mistakes.service';

interface RequestWithUser { user: { userId: string; role: Role } }
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('mistakes')
export class MistakesController {
  constructor(private readonly mistakes: MistakesService) {}
  @Get('my') @Roles(Role.STUDENT) my(@Req() req: RequestWithUser, @Query() query: MistakeQueryDto) { return this.mistakes.list(req.user.userId, query); }
  @Get('today') @Roles(Role.STUDENT) today(@Req() req: RequestWithUser) { return this.mistakes.today(req.user.userId); }
  @Post(':id/retry') @Roles(Role.STUDENT) retry(@Req() req: RequestWithUser, @Param('id') id: string, @Body() dto: RetryMistakeDto) { return this.mistakes.retry(req.user.userId, id, dto.answer); }
  @Patch(':id') @Roles(Role.STUDENT) update(@Req() req: RequestWithUser, @Param('id') id: string, @Body() dto: UpdateMistakeDto) { return this.mistakes.update(req.user.userId, id, dto); }
  @Get('student/:studentId') @Roles(Role.ADMIN, Role.TEACHER_PLUS, Role.TEACHER, Role.PARENT) student(@Req() req: RequestWithUser, @Param('studentId') id: string) { return this.mistakes.student(id, req.user); }
}
