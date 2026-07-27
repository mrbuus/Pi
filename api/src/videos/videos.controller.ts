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
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { parseSubjectQuery } from '../common/subject';
import { Role } from '../generated/prisma/enums';
import { CreateVideoDto } from './dto/create-video.dto';
import { UpdateVideoDto } from './dto/update-video.dto';
import { VideosService } from './videos.service';

interface AuthedRequest {
  user: { userId: string; role: Role };
}

@UseGuards(JwtAuthGuard)
@Controller('videos')
export class VideosController {
  constructor(private videos: VideosService) {}

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.TEACHER_PLUS, Role.TEACHER)
  @Post()
  create(@Body() dto: CreateVideoDto) {
    return this.videos.create(dto);
  }

  @Get()
  listByChapter(
    @Query('chapterId') chapterId: string,
    @Req() req: AuthedRequest,
  ) {
    return this.videos.listByChapter(chapterId, req.user.userId, req.user.role);
  }

  @Get('chapters')
  listChaptersWithVideos(
    @Req() req: AuthedRequest,
    @Query('subject') subject?: string,
  ) {
    return this.videos.listChaptersWithVideos(
      req.user.userId,
      req.user.role,
      parseSubjectQuery(subject),
    );
  }

  // Гарчиг/холбоос/бүлэг сэдэв засах — TEACHER-д ч нээлттэй (SPEC-ийн
  // эрхийн матриц: video edit нь TEACHER эрхтэй).
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.TEACHER_PLUS, Role.TEACHER)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateVideoDto,
    @Req() req: AuthedRequest,
  ) {
    return this.videos.update(id, dto, req.user.userId, req.user.role);
  }

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.TEACHER_PLUS)
  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: AuthedRequest) {
    return this.videos.remove(id, req.user.userId, req.user.role);
  }
}
