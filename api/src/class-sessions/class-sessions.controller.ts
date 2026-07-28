import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Role } from '../generated/prisma/enums';
import { ClassSessionsService } from './class-sessions.service';

class DidTestDto {
  // Бодлогын сангийн тест сонгосон бол testId. Гараар бичсэн бол хоосон
  // үлдээгээд manualTitle-ыг бөглөнө. Хоёулаа хоосон бол сервис 400 өгнө.
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  testId?: string;

  // Гаднын (манай санд байхгүй) тестийн НЭР. Зөвхөн нэр — тест үүсгэхгүй.
  @IsOptional()
  @IsString()
  @MaxLength(200)
  manualTitle?: string;

  // Гараар бичсэн тестийн бодлогын тоо — сурагчид 1..N дугаараар тэмдэглэнэ.
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  manualProblemCount?: number;

  @IsOptional()
  @IsString()
  date?: string;
}

class SetExcludedDto {
  @IsArray()
  @IsString({ each: true })
  excludedProblemIds: string[];
}

interface AuthedRequest {
  user: { userId: string; role: Role };
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class ClassSessionsController {
  constructor(private sessions: ClassSessionsService) {}

  // Багш: анги өнөөдөр энэ тестийг хийсэн
  @Roles(Role.ADMIN, Role.TEACHER_PLUS, Role.TEACHER)
  @Post('classrooms/:id/did-test')
  recordDidTest(
    @Param('id') classroomId: string,
    @Body() dto: DidTestDto,
    @Req() req: AuthedRequest,
  ) {
    return this.sessions.recordDidTest(
      classroomId,
      dto.testId,
      dto.date,
      req.user.userId,
      req.user.role,
      { title: dto.manualTitle, problemCount: dto.manualProblemCount },
    );
  }

  @Roles(Role.ADMIN, Role.TEACHER_PLUS, Role.TEACHER)
  @Get('classrooms/:id/test-sessions')
  listForClass(@Param('id') classroomId: string, @Req() req: AuthedRequest) {
    return this.sessions.listForClass(
      classroomId,
      req.user.userId,
      req.user.role,
    );
  }

  // Багш: тухайн сессэд аль бодлогуудыг хассаныг тэмдэглэх
  @Roles(Role.ADMIN, Role.TEACHER_PLUS, Role.TEACHER)
  @Post('test-sessions/:id/excluded')
  setExcluded(
    @Param('id') id: string,
    @Body() dto: SetExcludedDto,
    @Req() req: AuthedRequest,
  ) {
    return this.sessions.setExcluded(
      id,
      dto.excludedProblemIds,
      req.user.userId,
      req.user.role,
    );
  }

  @Roles(Role.ADMIN, Role.TEACHER_PLUS, Role.TEACHER)
  @Delete('test-sessions/:id')
  remove(@Param('id') id: string, @Req() req: AuthedRequest) {
    return this.sessions.remove(id, req.user.userId, req.user.role);
  }

  // Сурагч: оройн тэмдэглэгээний todo (token мэдэхгүйгээр)
  @Roles(Role.STUDENT)
  @Get('me/todo-marking')
  todo(@Req() req: AuthedRequest) {
    return this.sessions.todoForStudent(req.user.userId);
  }
}
