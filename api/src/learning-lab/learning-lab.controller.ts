import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Role } from '../generated/prisma/enums';
import { LearningLabService } from './learning-lab.service';
import type { Family } from './generator';
import type { ResponseInput } from './learning-lab.service';
interface Request {
  user: { userId: string; role: Role };
}
@Controller('learning-lab')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.STUDENT, Role.BUYER)
export class LearningLabController {
  constructor(private readonly lab: LearningLabService) {}
  @Get('problem') problem(
    @Req() req: Request,
    @Query('family') family: Family,
    @Query('seed') seed: string,
  ) {
    return this.lab.problem(
      req.user.userId,
      family,
      /^\d{1,10}$/.test(seed ?? '') ? Number(seed) : NaN,
    );
  }
  @Get('bank/:id') bank(@Req() req: Request, @Param('id') id: string) {
    return this.lab.bankProblem(req.user.userId, id, req.user.role);
  }
  @Post('response') respond(@Req() req: Request, @Body() body: ResponseInput) {
    return this.lab.respond(req.user.userId, body, req.user.role);
  }
  @Post('correction') correction(
    @Req() req: Request,
    @Body() body: ResponseInput,
  ) {
    return this.lab.correction(req.user.userId, body, req.user.role);
  }
  @Post('solution') solution(
    @Req() req: Request,
    @Body() body: { problemId: string },
  ) {
    return this.lab.solution(req.user.userId, body.problemId, req.user.role);
  }
  @Get('history') history(@Req() req: Request) {
    return this.lab.history(req.user.userId);
  }
  @Get('review/:studentId')
  @Roles(Role.ADMIN, Role.TEACHER_PLUS, Role.TEACHER)
  review(@Req() req: Request, @Param('studentId') studentId: string) {
    return this.lab.review(req.user.userId, req.user.role, studentId);
  }
}
