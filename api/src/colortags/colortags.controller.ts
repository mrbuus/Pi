import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Role } from '../generated/prisma/enums';
import { ColorTagsService } from './colortags.service';
import { SetColorTagDto } from './dto/color-tag.dto';

interface AuthedRequest {
  user: { userId: string; role: Role };
}

// Зөвхөн багш нар + админ — сурагч/эцэг эх хэзээ ч хандахгүй (SPEC §13.1)
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.TEACHER_PLUS, Role.TEACHER)
@Controller()
export class ColorTagsController {
  constructor(private tags: ColorTagsService) {}

  @Put('students/:id/color-tag')
  setTag(
    @Param('id') studentId: string,
    @Body() dto: SetColorTagDto,
    @Req() req: AuthedRequest,
  ) {
    return this.tags.setTag(studentId, dto.color, dto.note, req.user.userId);
  }

  @Delete('students/:id/color-tag')
  removeTag(@Param('id') studentId: string, @Req() req: AuthedRequest) {
    return this.tags.removeTag(studentId, req.user.userId);
  }

  @Get('students/:id/color-tags')
  forStudent(@Param('id') studentId: string) {
    return this.tags.tagsForStudent(studentId);
  }

  @Get('classrooms/:id/color-tags')
  forClassroom(@Param('id') classroomId: string) {
    return this.tags.tagsForClassroom(classroomId);
  }
}
