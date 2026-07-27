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
import { CreatePassDto, GrantPassDto, UpdatePassDto } from './dto/pass.dto';
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
  create(@Body() dto: CreatePassDto, @Req() req: AuthedRequest) {
    return this.passes.create(dto, {
      id: req.user.userId,
      role: req.user.role,
    });
  }

  // Эрхийн менежмент (нэр/хугацаа/хамрах хүрээ/үнэ/идэвх, устгах, олгосныг
  // цуцлах) — ROLE MATRIX-ийн дагуу зөвхөн АДМИН (SPEC §11, эзэмшигчийн шийдвэр)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Patch('passes/:id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdatePassDto,
    @Req() req: AuthedRequest,
  ) {
    return this.passes.update(id, dto, {
      id: req.user.userId,
      role: req.user.role,
    });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Delete('passes/:id')
  remove(@Param('id') id: string, @Req() req: AuthedRequest) {
    return this.passes.remove(id, {
      id: req.user.userId,
      role: req.user.role,
    });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN, Role.TEACHER_PLUS)
  @Post('passes/:id/grant')
  grant(
    @Param('id') id: string,
    @Body() dto: GrantPassDto,
    @Req() req: AuthedRequest,
  ) {
    return this.passes.grant(id, dto.userId, undefined, {
      id: req.user.userId,
      role: req.user.role,
    });
  }

  @UseGuards(JwtAuthGuard)
  @Get('me/passes')
  my(@Req() req: AuthedRequest) {
    return this.passes.myPasses(req.user.userId);
  }

  // Олгосон эрхийг цуцлах — зөвхөн АДМИН (SPEC §11, эзэмшигчийн шийдвэр)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @Delete('me/passes/:userPassId')
  revoke(@Param('userPassId') userPassId: string, @Req() req: AuthedRequest) {
    return this.passes.revokeUserPass(userPassId, {
      id: req.user.userId,
      role: req.user.role,
    });
  }
}
