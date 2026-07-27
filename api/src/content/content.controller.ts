import {
  Body,
  Controller,
  DefaultValuePipe,
  Delete,
  Get,
  Param,
  ParseIntPipe,
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
import { ContentService } from './content.service';
import { CreateBookDto } from './dto/create-book.dto';
import { CreateChapterDto } from './dto/create-chapter.dto';
import { CreateProblemDto } from './dto/create-problem.dto';
import { ReorderChaptersDto } from './dto/reorder-chapters.dto';
import { UpdateBookDto } from './dto/update-book.dto';
import { UpdateChapterDto } from './dto/update-chapter.dto';
import { UpdateProblemDto } from './dto/update-problem.dto';

interface AuthedRequest {
  user: { userId: string; role: Role };
}

@Controller()
export class ContentController {
  constructor(private content: ContentService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Post('books')
  createBook(@Body() dto: CreateBookDto) {
    return this.content.createBook(dto);
  }

  @Get('books')
  listBooks(@Query('subject') subject?: string) {
    return this.content.listBooks(parseSubjectQuery(subject));
  }

  // Номын мета мэдээлэл засах — Багш+ (эрхийн матрицаар шинээр нээгдсэн).
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.TEACHER_PLUS)
  @Patch('books/:id')
  updateBook(
    @Param('id') id: string,
    @Body() dto: UpdateBookDto,
    @Req() req: AuthedRequest,
  ) {
    return this.content.updateBook(
      id,
      dto,
      req.user.userId,
      req.user.role,
    );
  }

  // Идэвхтэй бүлэг сэдэвтэй бол ?cascade=true шаардана.
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.TEACHER_PLUS)
  @Delete('books/:id')
  deleteBook(
    @Param('id') id: string,
    @Query('cascade') cascade: string | undefined,
    @Req() req: AuthedRequest,
  ) {
    return this.content.deleteBook(
      id,
      cascade === 'true',
      req.user.userId,
      req.user.role,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Post('chapters')
  createChapter(@Body() dto: CreateChapterDto) {
    return this.content.createChapter(dto);
  }

  @Get('chapters')
  listChapters(
    @Query('grade') grade?: string,
    @Query('bookId') bookId?: string,
    @Query('subject') subject?: string,
  ) {
    return this.content.listChapters(
      grade ? parseInt(grade, 10) : undefined,
      bookId,
      parseSubjectQuery(subject),
    );
  }

  // Гараар эрэмбэлэх (drag-reorder UI) — заавал 'chapters/:id'-ээс ӨМНӨ
  // тодорхойлно, эс тэгвэл "reorder" ':id' болж алдаа өгнө.
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.TEACHER_PLUS)
  @Patch('chapters/reorder')
  reorderChapters(
    @Body() dto: ReorderChaptersDto,
    @Req() req: AuthedRequest,
  ) {
    return this.content.reorderChapters(
      dto.ids,
      req.user.userId,
      req.user.role,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.TEACHER_PLUS)
  @Patch('chapters/:id')
  updateChapter(
    @Param('id') id: string,
    @Body() dto: UpdateChapterDto,
    @Req() req: AuthedRequest,
  ) {
    return this.content.updateChapter(
      id,
      dto,
      req.user.userId,
      req.user.role,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.TEACHER_PLUS)
  @Delete('chapters/:id')
  deleteChapter(@Param('id') id: string, @Req() req: AuthedRequest) {
    return this.content.deleteChapter(id, req.user.userId, req.user.role);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.TEACHER_PLUS, Role.TEACHER)
  @Post('problems')
  createProblem(@Body() dto: CreateProblemDto, @Req() req: AuthedRequest) {
    return this.content.createProblem(dto, req.user.userId);
  }

  // Агуулга (статемент/сонголт/хариу/зураг) гараар засах — ЗӨВХӨН ADMIN,
  // TEACHER_PLUS (энгийн TEACHER биш — тэд зөвхөн ангилал/tag засна).
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.TEACHER_PLUS)
  @Patch('problems/:problemId')
  updateProblem(
    @Param('problemId') problemId: string,
    @Body() dto: UpdateProblemDto,
    @Req() req: AuthedRequest,
  ) {
    return this.content.updateProblem(
      problemId,
      dto,
      req.user.userId,
      req.user.role,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.TEACHER_PLUS)
  @Delete('problems/:problemId')
  deleteProblem(
    @Param('problemId') problemId: string,
    @Req() req: AuthedRequest,
  ) {
    return this.content.deleteProblem(
      problemId,
      req.user.userId,
      req.user.role,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
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

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.TEACHER_PLUS, Role.TEACHER)
  @Get('tags')
  listTags(@Query('type') type?: string) {
    return this.content.listTags(type);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.TEACHER_PLUS, Role.TEACHER)
  @Get('formulas')
  listFormulas() {
    return this.content.listFormulas();
  }
}
