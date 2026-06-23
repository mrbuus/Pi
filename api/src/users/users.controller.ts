import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Role } from '../generated/prisma/enums';
import { UsersService } from './users.service';

class SetTeacherStatusDto {
  @IsBoolean()
  plus: boolean;

  @IsOptional()
  @IsBoolean()
  canManageStudents?: boolean;
}

class PromoteDto {
  @IsString()
  @IsNotEmpty()
  phone: string;
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('users')
export class UsersController {
  constructor(private users: UsersService) {}

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
}
