import { Body, Controller, Delete, Get, Param, Put, Query, Req, UseGuards } from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Role } from '../generated/prisma/enums';
import { SetHomeworkQuizDto, SetHomeworkQuizScoreDto } from './homework-quiz.dto';
import { HomeworkQuizService } from './homework-quiz.service';

interface AuthedRequest {
  user: { userId: string; role: Role };
}

/**
 * Гэрийн даалгаврыг ангид богино шалгалтаар шалгах (эзэн 2026-11-08). Зөвхөн ажилтан — самбарт
 * даалгавар тэмдэглэдэгтэй ижил хүрээ. Сурагч, эцэг эх одоогоор харахгүй (эзний шийдвэр хүлээнэ).
 */
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class HomeworkQuizController {
  constructor(private quiz: HomeworkQuizService) {}

  @Roles(Role.ADMIN, Role.TEACHER_PLUS, Role.TEACHER)
  @Get('classrooms/:id/homework-quiz')
  get(@Param('id') classroomId: string, @Query('date') date: string, @Req() req: AuthedRequest) {
    return this.quiz.get(classroomId, date, req.user.userId, req.user.role);
  }

  @Roles(Role.ADMIN, Role.TEACHER_PLUS, Role.TEACHER)
  @Put('classrooms/:id/homework-quiz')
  set(@Param('id') classroomId: string, @Body() dto: SetHomeworkQuizDto, @Req() req: AuthedRequest) {
    return this.quiz.set(classroomId, dto, req.user.userId, req.user.role);
  }

  @Roles(Role.ADMIN, Role.TEACHER_PLUS, Role.TEACHER)
  @Delete('classrooms/:id/homework-quiz')
  remove(@Param('id') classroomId: string, @Query('date') date: string, @Req() req: AuthedRequest) {
    return this.quiz.remove(classroomId, date, req.user.userId, req.user.role);
  }

  @Roles(Role.ADMIN, Role.TEACHER_PLUS, Role.TEACHER)
  @Put('classrooms/:id/homework-quiz/scores/:studentId')
  setScore(
    @Param('id') classroomId: string,
    @Param('studentId') studentId: string,
    @Body() dto: SetHomeworkQuizScoreDto,
    @Req() req: AuthedRequest,
  ) {
    return this.quiz.setScore(classroomId, studentId, dto, req.user.userId, req.user.role);
  }

  @Roles(Role.ADMIN, Role.TEACHER_PLUS, Role.TEACHER)
  @Get('classrooms/:id/homework-quiz/students/:studentId')
  studentMonth(
    @Param('id') classroomId: string,
    @Param('studentId') studentId: string,
    @Query('month') month: string,
    @Req() req: AuthedRequest,
  ) {
    return this.quiz.studentMonth(classroomId, studentId, month, req.user.userId, req.user.role);
  }
}
