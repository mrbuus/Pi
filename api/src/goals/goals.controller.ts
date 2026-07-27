import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Role } from '../generated/prisma/enums';
import { CreateGoalDto } from './dto/create-goal.dto';
import { UpdateGoalDto } from './dto/update-goal.dto';
import { GoalsService } from './goals.service';

interface AuthedRequest {
  user: { userId: string; role: Role };
}

// /app/goals-ийн API — сурагч ЗӨВХӨН ӨӨРИЙН зорилгоо удирдана. studentId
// БҮРТГЭЛИЙН биетэй ирдэггүй, ЗААВАЛ JWT-с (req.user.userId) авна.
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.STUDENT)
@Controller('goals')
export class GoalsController {
  constructor(private goals: GoalsService) {}

  @Post()
  create(@Body() dto: CreateGoalDto, @Req() req: AuthedRequest) {
    return this.goals.create(req.user.userId, dto);
  }

  @Get()
  findAll(@Req() req: AuthedRequest) {
    return this.goals.findAllForStudent(req.user.userId);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateGoalDto,
    @Req() req: AuthedRequest,
  ) {
    return this.goals.update(id, req.user.userId, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: AuthedRequest) {
    return this.goals.remove(id, req.user.userId);
  }
}
