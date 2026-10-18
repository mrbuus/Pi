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
import { ClassroomsService } from './classrooms.service';
import { CreateClassroomDto } from './dto/create-classroom.dto';
import { EnrollStudentDto } from './dto/enroll-student.dto';
import { UpdateClassTeachersDto } from './dto/update-class-teachers.dto';
import { UpdateClassroomDto } from './dto/update-classroom.dto';

interface AuthedRequest {
  user: { userId: string; role: Role };
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('classrooms')
export class ClassroomsController {
  constructor(private classrooms: ClassroomsService) {}

  // Шинэ анги — Багш+ ба Админ (эзэн 2026-10-18, «Сурагчид» хэсгээс)
  @Roles(Role.ADMIN, Role.TEACHER_PLUS)
  @Post()
  create(@Body() dto: CreateClassroomDto, @Req() req: AuthedRequest) {
    return this.classrooms.create(dto, req.user.userId, req.user.role);
  }

  @Roles(Role.ADMIN, Role.TEACHER_PLUS, Role.TEACHER)
  @Get()
  list(@Req() req: AuthedRequest) {
    return this.classrooms.list(req.user.userId, req.user.role);
  }

  // Бүртгэлтэй ч ангигүй / ангид байгаа ч ирэхгүй сурагчид (эзэн 2026-10-18).
  // `:id`-ээс ӨМНӨ байх ёстой.
  @Roles(Role.ADMIN, Role.TEACHER_PLUS)
  @Get('attention-students')
  attention() {
    return this.classrooms.attentionStudents();
  }

  @Roles(Role.ADMIN, Role.TEACHER_PLUS)
  @Get('unassigned-students')
  unassigned() {
    return this.classrooms.unassignedStudents();
  }

  @Roles(Role.ADMIN, Role.TEACHER_PLUS, Role.TEACHER)
  @Get(':id')
  get(@Param('id') id: string, @Req() req: AuthedRequest) {
    return this.classrooms.get(id, req.user.userId, req.user.role);
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
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateClassroomDto,
    @Req() req: AuthedRequest,
  ) {
    return this.classrooms.update(id, dto, req.user.userId, req.user.role);
  }

  // Ангийн багш + туслах багш (эзэн 2026-10-13) — ангийн самбараас Багш+/Админ
  @Roles(Role.ADMIN, Role.TEACHER_PLUS)
  @Patch(':id/teachers')
  setTeachers(
    @Param('id') id: string,
    @Body() dto: UpdateClassTeachersDto,
    @Req() req: AuthedRequest,
  ) {
    return this.classrooms.setTeachers(
      id,
      dto,
      req.user.userId,
      req.user.role,
    );
  }

  @Roles(Role.ADMIN)
  @Delete(':id')
  archive(
    @Param('id') id: string,
    @Query('confirmCode') confirmCode: string,
    @Req() req: AuthedRequest,
  ) {
    return this.classrooms.archive(
      id,
      confirmCode ?? '',
      req.user.userId,
      req.user.role,
    );
  }

  @Roles(Role.ADMIN, Role.TEACHER_PLUS)
  @Post(':id/disband')
  disband(
    @Param('id') id: string,
    @Req() req: AuthedRequest,
  ) {
    return this.classrooms.disband(
      id,
      req.user.userId,
      req.user.role,
    );
  }
}
