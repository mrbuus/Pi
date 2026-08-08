import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { Roles } from '../auth/decorators/roles.decorator';
import { PasswordResetService } from '../auth/password-reset.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Role } from '../generated/prisma/enums';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserProfileDto } from './dto/update-user-profile.dto';
import { UsersService } from './users.service';

class SetTeacherStatusDto {
  @IsBoolean()
  plus!: boolean;

  @IsOptional()
  @IsBoolean()
  canManageStudents?: boolean;
}

class PromoteDto {
  @IsString()
  @IsNotEmpty()
  phone!: string;
}

class SetUserRoleDto {
  @IsEnum(Role)
  role!: Role;
}

interface AuthedRequest {
  user: { userId: string; role: Role };
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('users')
export class UsersController {
  constructor(
    private users: UsersService,
    private passwordReset: PasswordResetService,
  ) {}

  @Get()
  listUsers() {
    return this.users.listUsers();
  }

  // Шинэ хэрэглэгчийг эрхийг нь шууд сонгож нэг дороос үүсгэнэ
  @Post()
  createUser(@Body() dto: CreateUserDto) {
    return this.users.createUser(dto);
  }

  @Get('teachers')
  listTeachers() {
    return this.users.listTeachers();
  }

  // Сурагч хайх (код/нэр/username-ээр) — cuid гараар бичихийг сольж, дүн
  // бүртгэх маягтад ашиглана. Класс дээрх @Roles(ADMIN)-г энд өргөтгөнө.
  @Get('search')
  @Roles(Role.ADMIN, Role.TEACHER_PLUS, Role.TEACHER)
  searchStudents(@Query('q') q?: string) {
    return this.users.searchStudents(q ?? '');
  }

  // Ажилтны дэлгэрэнгүй харагдац: профайл + идэвхтэй анги + код + тоолуур.
  // 🚨 Утасны дугаарын хамгаалалт (Багш+/Админ л харна) service дотор хийгдэнэ.
  @Get(':id')
  @Roles(Role.ADMIN, Role.TEACHER_PLUS, Role.TEACHER)
  getDetail(@Param('id') id: string, @Req() req: AuthedRequest) {
    return this.users.getUserDetail(id, req.user.userId, req.user.role);
  }

  // Сурагчийн бүтэн бүртгэл засах — Багш+/Админ (эрхийн матриц)
  @Patch(':id/profile')
  @Roles(Role.ADMIN, Role.TEACHER_PLUS)
  updateProfile(
    @Param('id') id: string,
    @Body() dto: UpdateUserProfileDto,
    @Req() req: AuthedRequest,
  ) {
    return this.users.updateProfile(id, dto, req.user.userId, req.user.role);
  }

  /**
   * Ажилтан сурагчийн өмнөөс нууц үг сэргээх код илгээх.
   *
   * Яагаад хэрэгтэй вэ: сурагч өөрөө /forgot-password-оор код авч чадна.
   * Гэхдээ бодит амьдралд "утсаа сольсон / SMS ирэхгүй байна / тайлбарлаж
   * чадахгүй байна" гэсэн тохиолдол гарна — тэгэхэд багш хажууд нь зогсоод
   * шууд шийдэж чаддаг байх ёстой, эс бөгөөс эргээд эзэн нь терминал нээх
   * болно.
   *
   * ADMIN болон TEACHER_PLUS хоёрт нээлттэй — эдгээр нь сурагчийн бүртгэлийг
   * аль хэдийн засах эрхтэй (`:id/profile`) тул эрхийн шинэ түвшин нэмэхгүй.
   * Багш бүрт нээвэл дурын багш дурын сурагчийн бүртгэлийг булаах эрсдэлтэй.
   */
  @Post(':id/send-password-reset')
  @Roles(Role.ADMIN, Role.TEACHER_PLUS)
  sendPasswordReset(@Param('id') id: string, @Req() req: AuthedRequest) {
    return this.passwordReset.sendForUser(id, {
      userId: req.user.userId,
      role: req.user.role,
    });
  }

  @Post('promote-teacher')
  promote(@Body() dto: PromoteDto) {
    return this.users.promoteToTeacher(dto.phone);
  }

  @Patch(':id/teacher-status')
  setStatus(@Param('id') id: string, @Body() dto: SetTeacherStatusDto) {
    return this.users.setTeacherStatus(
      id,
      dto.plus,
      dto.canManageStudents ?? false,
    );
  }

  @Patch(':id/role')
  setRole(
    @Param('id') id: string,
    @Body() dto: SetUserRoleDto,
    @Req() req: AuthedRequest,
  ) {
    return this.users.setUserRole(id, dto.role, req.user.userId);
  }

  // Онлайнаар CLASSROOM-р бүртгүүлсэн сурагчдын зөвшөөрөл хүлээгч жагсаалт
  @Get('students/pending-approval')
  @Roles(Role.ADMIN, Role.TEACHER_PLUS, Role.TEACHER)
  getPendingApprovalStudents() {
    return this.users.getPendingApprovalStudents();
  }

  // Сурагчийг зөвшөөрнө
  @Post('students/:id/approve')
  @Roles(Role.ADMIN, Role.TEACHER_PLUS)
  approveStudent(
    @Param('id') id: string,
    @Req() req: AuthedRequest,
  ) {
    return this.users.approveStudent(id, req.user.userId);
  }
}
