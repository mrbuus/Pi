import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
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
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Role } from '../generated/prisma/enums';
import { CreateUserDto } from './dto/create-user.dto';
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
  constructor(private users: UsersService) {}

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
}
