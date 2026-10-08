import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  IsIn,
  IsISO8601,
  IsOptional,
  IsString,
  Length,
  MaxLength,
} from 'class-validator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Role } from '../generated/prisma/enums';
import type { StaffCapability } from './staff-capability.service';
import {
  STAFF_CAPABILITIES,
  StaffCapabilityService,
} from './staff-capability.service';
class GrantDto {
  @IsString() @Length(1, 150) userId!: string;
  @IsIn(STAFF_CAPABILITIES) capability!: StaffCapability;
  @IsOptional() @IsString() @MaxLength(150) scopeKey?: string;
  @IsString() @Length(3, 500) reason!: string;
  @IsOptional() @IsISO8601() expiresAt?: string;
}
class RevokeDto {
  @IsString() @Length(3, 500) reason!: string;
}
interface ActorRequest {
  user: { userId: string };
}
@Controller('staff-capabilities')
@UseGuards(JwtAuthGuard, RolesGuard)
export class StaffCapabilityController {
  constructor(private readonly service: StaffCapabilityService) {}
  @Get('me') mine(@Req() req: ActorRequest) {
    return this.service.mine(req.user.userId);
  }
  @Get() @Roles(Role.ADMIN) list(@Req() req: ActorRequest) {
    return this.service.list(req.user.userId);
  }
  @Post() @Roles(Role.ADMIN) grant(
    @Req() req: ActorRequest,
    @Body() body: GrantDto,
  ) {
    return this.service.grant(req.user.userId, body);
  }
  @Delete(':id') @Roles(Role.ADMIN) revoke(
    @Req() req: ActorRequest,
    @Param('id') id: string,
    @Body() body: RevokeDto,
  ) {
    return this.service.revoke(req.user.userId, id, body.reason);
  }
}
