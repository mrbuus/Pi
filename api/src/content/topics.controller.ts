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
import { Role } from '../generated/prisma/enums';
import { ContentService } from './content.service';
import { CreateTopicDto } from './dto/create-topic.dto';
import { UpdateTopicDto } from './dto/update-topic.dto';

interface AuthedRequest {
  user: { userId: string; role: Role };
}

// БҮТ-ийн үндсэн агуулгын муж (Тоо тоолол, Алгебр, Функц, Геометр,
// Магадлал...) — админ засварладаг ангиллын жагсаалт (Шийдвэр 5).
@Controller('topics')
export class TopicsController {
  constructor(private content: ContentService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  list() {
    return this.content.listTopics();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.TEACHER_PLUS)
  @Post()
  create(@Body() dto: CreateTopicDto, @Req() req: AuthedRequest) {
    return this.content.createTopic(dto, req.user.userId, req.user.role);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.TEACHER_PLUS)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateTopicDto,
    @Req() req: AuthedRequest,
  ) {
    return this.content.updateTopic(id, dto, req.user.userId, req.user.role);
  }

  // Идэвхтэй бүлэг сэдэв холбоотой бол ?force=true шаардана (topicId-г л
  // null болгож салгана — Chapter-ийг устгахгүй).
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.TEACHER_PLUS)
  @Delete(':id')
  remove(
    @Param('id') id: string,
    @Query('force') force: string | undefined,
    @Req() req: AuthedRequest,
  ) {
    return this.content.deleteTopic(
      id,
      force === 'true',
      req.user.userId,
      req.user.role,
    );
  }
}
