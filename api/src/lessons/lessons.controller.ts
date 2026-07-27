import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { parseSubjectQuery } from '../common/subject';
import { Role } from '../generated/prisma/enums';
import { CreateTheoryDto, ReorderTheoryDto, UpdateTheoryDto } from './dto/theory.dto';
import { RecordProgressDto } from './dto/progress.dto';
import { LessonsService } from './lessons.service';

interface AuthedRequest {
  user: { userId: string; role: Role };
}

@UseGuards(JwtAuthGuard)
@Controller('lessons')
export class LessonsController {
  constructor(private lessons: LessonsService) {}

  // 'chapters' нь ':chapterId'-той ЯГ ижил гүнзгийрэлтэй тул routes/чиглэл
  // мэдэгдэхэд '/lessons/:chapterId'-ээс ӨМНӨ бичигдсэн байх ёстой — эс тэгвээс
  // Nest "chapters"-ыг chapterId параметр гэж уншина.
  @Get('chapters')
  listChapters(
    @Req() req: AuthedRequest,
    @Query('subject') subject?: string,
    @Query('bookId') bookId?: string,
  ) {
    return this.lessons.listChaptersWithLessons(
      req.user.userId,
      req.user.role,
      parseSubjectQuery(subject),
      bookId,
    );
  }

  @Get(':chapterId')
  getLesson(@Param('chapterId') chapterId: string, @Req() req: AuthedRequest) {
    return this.lessons.getLesson(chapterId, req.user.userId, req.user.role);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.TEACHER_PLUS, Role.TEACHER)
  @Post(':chapterId/theory')
  createTheory(
    @Param('chapterId') chapterId: string,
    @Body() dto: CreateTheoryDto,
  ) {
    return this.lessons.createTheory(chapterId, dto);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.TEACHER_PLUS, Role.TEACHER)
  @Patch('theory/:id')
  updateTheory(@Param('id') id: string, @Body() dto: UpdateTheoryDto) {
    return this.lessons.updateTheory(id, dto);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.TEACHER_PLUS)
  @Delete('theory/:id')
  removeTheory(@Param('id') id: string) {
    return this.lessons.removeTheory(id);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.TEACHER_PLUS, Role.TEACHER)
  @Patch(':chapterId/theory/reorder')
  reorderTheory(
    @Param('chapterId') chapterId: string,
    @Body() dto: ReorderTheoryDto,
  ) {
    return this.lessons.reorderTheory(chapterId, dto.ids);
  }

  @HttpCode(HttpStatus.ACCEPTED)
  @Post(':chapterId/progress')
  recordProgress(
    @Param('chapterId') chapterId: string,
    @Body() dto: RecordProgressDto,
    @Req() req: AuthedRequest,
  ) {
    return this.lessons.recordProgress(chapterId, req.user.userId, dto);
  }
}
