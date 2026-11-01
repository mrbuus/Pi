import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Role } from '../generated/prisma/enums';
import {
  CreateDeletionRequestDto,
  ListDeletionRequestsQuery,
  ReviewDeletionRequestDto,
} from './account-deletion.dto';
import { AccountDeletionService } from './account-deletion.service';

interface AuthedRequest {
  user: { userId: string; role: Role };
}

const ALL_ROLES = [
  Role.STUDENT,
  Role.PARENT,
  Role.BUYER,
  Role.TEACHER,
  Role.TEACHER_PLUS,
  Role.ADMIN,
];

// Бүртгэл устгах хүсэлт — нэвтэрсэн хэрэглэгч өөрөө (апп, вэб).
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('me/deletion-request')
export class AccountDeletionController {
  constructor(private readonly deletion: AccountDeletionService) {}

  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @Roles(...ALL_ROLES)
  @Post()
  create(@Body() dto: CreateDeletionRequestDto, @Req() req: AuthedRequest) {
    return this.deletion.request(req.user.userId, dto.reason);
  }

  @Roles(...ALL_ROLES)
  @Get()
  mine(@Req() req: AuthedRequest) {
    return this.deletion.mine(req.user.userId);
  }
}

// Админ: хүсэлтийг хянах. Өгөгдөл устгах үйлдэл ЭНД БАЙХГҮЙ.
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('admin/deletion-requests')
export class AdminDeletionRequestsController {
  constructor(private readonly deletion: AccountDeletionService) {}

  @Roles(Role.ADMIN)
  @Get()
  list(@Query() query: ListDeletionRequestsQuery) {
    return this.deletion.list(query.status);
  }

  @Roles(Role.ADMIN)
  @Patch(':id')
  review(
    @Param('id') id: string,
    @Body() dto: ReviewDeletionRequestDto,
    @Req() req: AuthedRequest,
  ) {
    return this.deletion.review(id, req.user.userId, dto.status, dto.note);
  }
}
