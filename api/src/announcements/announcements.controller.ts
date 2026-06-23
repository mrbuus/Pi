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
  IsBoolean,
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AnnouncementAudience, Role } from '../generated/prisma/enums';
import { AnnouncementsService } from './announcements.service';

class CreateAnnouncementDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  body: string;

  @IsEnum(AnnouncementAudience)
  audience: AnnouncementAudience;

  @IsOptional()
  @IsString()
  classroomId?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  classroomIds?: string[];

  @IsOptional()
  @IsBoolean()
  pinned?: boolean;
}

interface AuthedRequest {
  user: { userId: string; role: Role };
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('announcements')
export class AnnouncementsController {
  constructor(private announcements: AnnouncementsService) {}

  @Roles(Role.ADMIN, Role.TEACHER_PLUS, Role.TEACHER)
  @Post()
  create(@Body() dto: CreateAnnouncementDto, @Req() req: AuthedRequest) {
    return this.announcements.create(dto, req.user.userId);
  }

  // Танхимын сурагч өөрийн зарыг харна
  @Roles(Role.STUDENT)
  @Get()
  forStudent(@Req() req: AuthedRequest) {
    return this.announcements.forStudent(req.user.userId);
  }

  @Roles(Role.ADMIN, Role.TEACHER_PLUS, Role.TEACHER)
  @Get('manage')
  manage() {
    return this.announcements.manageList();
  }

  @Roles(Role.ADMIN, Role.TEACHER_PLUS, Role.TEACHER)
  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: AuthedRequest) {
    return this.announcements.remove(id, req.user.role);
  }
}
