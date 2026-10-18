import { Body, Controller, Delete, Get, Header, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { RequestWithUser } from '../auth/request.interface';
import { Role } from '../generated/prisma/enums';
import { CreateMockExamDto, UpdateMockExamDto } from './mock-exams.dto';
import { MockExamsService } from './mock-exams.service';

// Нийтэд: удахгүй болох, явагдаж буй сорил (нэвтрэлтгүй, тестийн id-гүй)
@Controller('catalog/mock-exams')
export class MockExamsPublicController {
  constructor(private mock: MockExamsService) {}

  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @Header('Cache-Control', 'no-store')
  @Get()
  list() {
    return this.mock.publicList();
  }
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('mock-exams')
export class MockExamsController {
  constructor(private mock: MockExamsService) {}

  @Roles(Role.STUDENT, Role.BUYER)
  @Get('my')
  my(@Req() req: RequestWithUser) {
    return this.mock.my(req.user.userId);
  }

  @Roles(Role.STUDENT, Role.BUYER)
  @Post(':id/register')
  register(@Param('id') id: string, @Req() req: RequestWithUser) {
    return this.mock.register(id, req.user.userId);
  }

  @Roles(Role.STUDENT, Role.BUYER)
  @Delete(':id/register')
  unregister(@Param('id') id: string, @Req() req: RequestWithUser) {
    return this.mock.unregister(id, req.user.userId);
  }

  // ---- Удирдлага ----
  @Roles(Role.ADMIN, Role.TEACHER_PLUS, Role.TEACHER)
  @Get('admin')
  adminList() {
    return this.mock.adminList();
  }

  @Roles(Role.ADMIN, Role.TEACHER_PLUS)
  @Get('tests')
  tests() {
    return this.mock.pickableTests();
  }

  @Roles(Role.ADMIN, Role.TEACHER_PLUS)
  @Post()
  create(@Body() dto: CreateMockExamDto, @Req() req: RequestWithUser) {
    return this.mock.create(dto, req.user.userId);
  }

  @Roles(Role.ADMIN, Role.TEACHER_PLUS)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateMockExamDto) {
    return this.mock.update(id, dto);
  }

  @Roles(Role.ADMIN, Role.TEACHER_PLUS)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.mock.remove(id);
  }

  @Roles(Role.ADMIN, Role.TEACHER_PLUS, Role.TEACHER)
  @Get(':id/registrations')
  registrations(@Param('id') id: string) {
    return this.mock.registrations(id);
  }
}
