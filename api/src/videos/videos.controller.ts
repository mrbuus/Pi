import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Role } from '../generated/prisma/enums';
import { CreateVideoDto } from './dto/create-video.dto';
import { VideosService } from './videos.service';

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
  listByChapter(@Query('chapterId') chapterId: string) {
    return this.videos.listByChapter(chapterId);
  }

  @Get('chapters')
  listChaptersWithVideos() {
    return this.videos.listChaptersWithVideos();
  }

  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN, Role.TEACHER_PLUS)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.videos.remove(id);
  }
}
