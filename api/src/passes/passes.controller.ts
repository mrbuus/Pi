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
import { CreatePassDto, GrantPassDto } from './dto/pass.dto';
import { PassesService } from './passes.service';

interface AuthedRequest {
  user: { userId: string; role: Role };
}

@Controller()
export class PassesController {
  constructor(private passes: PassesService) {}

  // Дэлгүүрийн жагсаалт — нэвтрэлтгүй харагдана (SPEC §5)
  @Get('catalog/passes')
  listActive() {
    return this.passes.listActive();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Post('passes')
  create(@Body() dto: CreatePassDto) {
    return this.passes.create(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.TEACHER_PLUS)
  @Post('passes/:id/grant')
  grant(@Param('id') id: string, @Body() dto: GrantPassDto) {
    return this.passes.grant(id, dto.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me/passes')
  my(@Req() req: AuthedRequest) {
    return this.passes.myPasses(req.user.userId);
  }
}
