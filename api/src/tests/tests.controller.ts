import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Role } from '../generated/prisma/enums';
import { CreateTestDto } from './dto/create-test.dto';
import { EnterResultDto } from './dto/enter-result.dto';
import { SubmitTestDto } from './dto/submit-test.dto';
import { TestsService } from './tests.service';

interface AuthedRequest {
  user: { userId: string; role: Role };
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('tests')
export class TestsController {
  constructor(private tests: TestsService) {}

  @Roles(Role.ADMIN, Role.TEACHER_PLUS, Role.TEACHER)
  @Post()
  create(@Body() dto: CreateTestDto, @Req() req: AuthedRequest) {
    return this.tests.create(dto, req.user.userId);
  }

  @Get()
  list(@Req() req: AuthedRequest) {
    return this.tests.list(req.user.userId, req.user.role);
  }

  @Roles(Role.STUDENT)
  @Get('my-results')
  myResults(@Req() req: AuthedRequest) {
    return this.tests.myResults(req.user.userId);
  }

  @Get(':id')
  getForTaking(@Param('id') id: string, @Req() req: AuthedRequest) {
    return this.tests.getForTaking(id, req.user.userId, req.user.role);
  }

  @Roles(Role.STUDENT)
  @Post(':id/submit')
  submit(
    @Param('id') id: string,
    @Body() dto: SubmitTestDto,
    @Req() req: AuthedRequest,
  ) {
    return this.tests.submit(id, dto, req.user.userId);
  }

  @Roles(Role.ADMIN, Role.TEACHER_PLUS, Role.TEACHER)
  @Post(':id/results')
  enterResult(
    @Param('id') id: string,
    @Body() dto: EnterResultDto,
    @Req() req: AuthedRequest,
  ) {
    return this.tests.enterResult(id, dto, req.user.userId, req.user.role);
  }

  @Roles(Role.ADMIN, Role.TEACHER_PLUS, Role.TEACHER)
  @Get(':id/results')
  results(@Param('id') id: string, @Req() req: AuthedRequest) {
    return this.tests.results(id, req.user.userId, req.user.role);
  }
}
