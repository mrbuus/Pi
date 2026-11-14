import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Role } from '../generated/prisma/enums';
import {
  HomeworkAnswersDto,
  HomeworkPhotoDto,
  HomeworkStudentCommentDto,
  StartHomeworkDto,
} from './homework-practice.dto';
import { HomeworkPracticeService } from './homework-practice.service';

interface AuthedRequest {
  user: { userId: string; role: Role };
}

/** Танхимын сурагчийн гэрийн даалгавар (B хувилбар) — зөвхөн STUDENT */
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.STUDENT)
@Controller('homework')
export class HomeworkPracticeController {
  constructor(private homework: HomeworkPracticeService) {}

  @Get('my')
  my(@Query('days') days: string | undefined, @Req() req: AuthedRequest) {
    return this.homework.my(req.user.userId, days);
  }

  /** Дахин бодох: хичээл бүрийн А, Б тест, нээгдсэн эсэх, оролдлогын дүн */
  @Get('redo')
  redo(@Req() req: AuthedRequest) {
    return this.homework.redoList(req.user.userId);
  }

  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Post('redo/attempts')
  startRedo(@Body() dto: StartHomeworkDto, @Req() req: AuthedRequest) {
    return this.homework.startRedo(req.user.userId, dto);
  }

  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Post('attempts')
  start(@Body() dto: StartHomeworkDto, @Req() req: AuthedRequest) {
    return this.homework.start(req.user.userId, dto);
  }

  // Autosave — шалгалтын autosave-тай ижил хязгаар
  @Throttle({ default: { limit: 180, ttl: 60_000 } })
  @Patch('attempts/:id')
  save(
    @Param('id') id: string,
    @Body() dto: HomeworkAnswersDto,
    @Req() req: AuthedRequest,
  ) {
    return this.homework.save(req.user.userId, id, dto.answers, dto.activity);
  }

  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Post('attempts/:id/check')
  check(
    @Param('id') id: string,
    @Body() dto: HomeworkAnswersDto,
    @Req() req: AuthedRequest,
  ) {
    return this.homework.check(req.user.userId, id, dto.answers, dto.activity);
  }

  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Post('attempts/:id/submit')
  submit(
    @Param('id') id: string,
    @Body() dto: HomeworkAnswersDto,
    @Req() req: AuthedRequest,
  ) {
    return this.homework.submit(req.user.userId, id, dto.answers, dto.activity);
  }

  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Post('photos')
  addPhoto(@Body() dto: HomeworkPhotoDto, @Req() req: AuthedRequest) {
    return this.homework.addPhoto(req.user.userId, dto);
  }

  // Багшийн сэтгэгдэлд хариулах (эзэн 2026-11-05)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Post('comments')
  addComment(@Body() dto: HomeworkStudentCommentDto, @Req() req: AuthedRequest) {
    return this.homework.addComment(req.user.userId, dto);
  }

  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Delete('photos/:id')
  deletePhoto(@Param('id') id: string, @Req() req: AuthedRequest) {
    return this.homework.deletePhoto(req.user.userId, id);
  }
}
