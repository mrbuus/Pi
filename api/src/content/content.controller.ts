import {
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Role } from '../generated/prisma/enums';
import { ContentService } from './content.service';
import { CreateBookDto } from './dto/create-book.dto';
import { CreateChapterDto } from './dto/create-chapter.dto';
import { CreateProblemDto } from './dto/create-problem.dto';

interface AuthedRequest {
  user: { userId: string; role: Role };
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class ContentController {
  constructor(private content: ContentService) {}

  @Roles(Role.ADMIN)
  @Post('books')
  createBook(@Body() dto: CreateBookDto) {
    return this.content.createBook(dto);
  }

  @Get('books')
  listBooks() {
    return this.content.listBooks();
  }

  @Roles(Role.ADMIN)
  @Post('chapters')
  createChapter(@Body() dto: CreateChapterDto) {
    return this.content.createChapter(dto);
  }

  @Get('chapters')
  listChapters(
    @Query('grade') grade?: string,
    @Query('bookId') bookId?: string,
  ) {
    return this.content.listChapters(
      grade ? parseInt(grade, 10) : undefined,
      bookId,
    );
  }

  @Roles(Role.ADMIN, Role.TEACHER_PLUS, Role.TEACHER)
  @Post('problems')
  createProblem(@Body() dto: CreateProblemDto, @Req() req: AuthedRequest) {
    return this.content.createProblem(dto, req.user.userId);
  }

  @Get('chapters/:id/problems')
  listProblems(
    @Param('id') chapterId: string,
    @Req() req: AuthedRequest,
    @Query('skip', new DefaultValuePipe(0), ParseIntPipe) skip: number,
    @Query('take', new DefaultValuePipe(50), ParseIntPipe) take: number,
  ) {
    return this.content.listProblems(
      chapterId,
      req.user.userId,
      req.user.role,
      skip,
      take,
    );
  }

  @Roles(Role.ADMIN, Role.TEACHER_PLUS, Role.TEACHER)
  @Get('tags')
  listTags(@Query('type') type?: string) {
    return this.content.listTags(type);
  }

  @Roles(Role.ADMIN, Role.TEACHER_PLUS, Role.TEACHER)
  @Get('formulas')
  listFormulas() {
    return this.content.listFormulas();
  }
}
