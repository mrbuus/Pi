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
import { RequestParentLinkDto } from './dto/parent-link.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { ParentsService } from './parents.service';

interface AuthedRequest {
  user: { userId: string; role: Role };
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('parent')
export class ParentsController {
  constructor(private parents: ParentsService) {}

  @Roles(Role.PARENT)
  @Post('links')
  requestLink(@Body() dto: RequestParentLinkDto, @Req() req: AuthedRequest) {
    return this.parents.requestLink(req.user.userId, dto.studentPhone);
  }

  @Roles(Role.PARENT)
  @Get('children')
  myChildren(@Req() req: AuthedRequest) {
    return this.parents.myChildren(req.user.userId);
  }

  @Roles(Role.ADMIN, Role.TEACHER_PLUS)
  @Get('links/pending')
  pendingLinks() {
    return this.parents.pendingLinks();
  }

  @Roles(Role.ADMIN, Role.TEACHER_PLUS)
  @Post('links/:id/verify')
  verify(@Param('id') id: string, @Req() req: AuthedRequest) {
    return this.parents.verify(id, req.user.userId);
  }

  @Roles(Role.ADMIN, Role.TEACHER_PLUS)
  @Post('links/:id/reject')
  reject(@Param('id') id: string) {
    return this.parents.reject(id);
  }

  @Roles(Role.PARENT)
  @Post('results/:testResultId/ack/request')
  requestAck(
    @Param('testResultId') testResultId: string,
    @Req() req: AuthedRequest,
  ) {
    return this.parents.requestAcknowledgement(req.user.userId, testResultId);
  }

  @Roles(Role.PARENT)
  @Post('results/:testResultId/ack/verify')
  verifyAck(
    @Param('testResultId') testResultId: string,
    @Body() dto: VerifyOtpDto,
    @Req() req: AuthedRequest,
  ) {
    // IP авахыг оролдоно (proxy-ийн хажууд байж болох)
    const ip = (req as any).ip || (req as any).connection?.remoteAddress;
    return this.parents.verifyAcknowledgement(
      req.user.userId,
      testResultId,
      dto.code,
      ip,
    );
  }
}
