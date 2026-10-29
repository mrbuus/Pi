import { Controller, Get, Param, Req, UseGuards } from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Role } from '../generated/prisma/enums';
import { ExamResultsService } from './exam-results.service';

interface AuthedRequest {
  user: { userId: string; role: Role };
}

// Сурагч, эцэг эхийн «Шалгалт»/дүнгийн дэлгэц (SHALGALT-TOLOVLOGOO §4).
// Ажилтны /exams маршруттай холилдохгүйн тулд тусдаа угтвартай.
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('exam-results')
export class ExamResultsController {
  constructor(private readonly results: ExamResultsService) {}

  // «Өгөх» / «Өгсөн» жагсаалт
  @Roles(Role.STUDENT, Role.BUYER)
  @Get('my')
  my(@Req() req: AuthedRequest) {
    return this.results.myExams(req.user.userId, req.user.role);
  }

  // Нэг шалгалтын дүнгийн дэлгэц (өөрийн дүн)
  @Roles(Role.STUDENT, Role.BUYER)
  @Get('my/:testId')
  myResult(@Param('testId') testId: string, @Req() req: AuthedRequest) {
    return this.results.myResult(testId, req.user.userId, req.user.role);
  }

  // Эцэг эх: хүүхдийн дүнгийн карт (баталгаажсан холболттой хүүхэд)
  @Roles(Role.PARENT)
  @Get('parent/:testResultId')
  parentCard(
    @Param('testResultId') testResultId: string,
    @Req() req: AuthedRequest,
  ) {
    return this.results.parentCard(testResultId, req.user.userId);
  }
}
