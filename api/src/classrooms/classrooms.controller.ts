import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Role } from '../generated/prisma/enums';
import { ClassroomsService } from './classrooms.service';
import { CreateClassroomDto } from './dto/create-classroom.dto';
import { EnrollStudentDto } from './dto/enroll-student.dto';

interface AuthedRequest {
  user: { userId: string; role: Role };
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('classrooms')
export class ClassroomsController {
  constructor(private classrooms: ClassroomsService) {}

  @Roles(Role.ADMIN)
  @Post()
  create(@Body() dto: CreateClassroomDto) {
    return this.classrooms.create(dto);
  }

  @Roles(Role.ADMIN, Role.TEACHER_PLUS, Role.TEACHER)
  @Get()
  list(@Req() req: AuthedRequest) {
    return this.classrooms.list(req.user.userId, req.user.role);
  }

  @Roles(Role.ADMIN, Role.TEACHER_PLUS)
  @Get('unassigned-students')
  unassigned() {
    return this.classrooms.unassignedStudents();
  }

  @Roles(Role.ADMIN, Role.TEACHER_PLUS)
  @Post(':id/enroll')
  enroll(
    @Param('id') id: string,
    @Body() dto: EnrollStudentDto,
    @Req() req: AuthedRequest,
  ) {
    return this.classrooms.enroll(
      id,
      dto.studentId,
      req.user.userId,
      req.user.role,
    );
  }

  @Roles(Role.ADMIN, Role.TEACHER_PLUS)
  @Post(':id/remove-student')
  removeStudent(
    @Param('id') id: string,
    @Body() dto: EnrollStudentDto,
    @Req() req: AuthedRequest,
  ) {
    return this.classrooms.removeStudent(
      id,
      dto.studentId,
      req.user.userId,
      req.user.role,
    );
  }

  @Roles(Role.ADMIN)
  @Delete(':id')
  archive(@Param('id') id: string, @Query('confirmCode') confirmCode: string) {
    return this.classrooms.archive(id, confirmCode ?? '');
  }
}
