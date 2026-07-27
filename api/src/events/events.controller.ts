import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Role } from '../generated/prisma/enums';
import { TrackEventsDto } from './dto/track-events.dto';
import { EventsService } from './events.service';

interface AuthedRequest {
  user: { userId: string; role: Role };
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('events')
export class EventsController {
  constructor(private events: EventsService) {}

  // Тест эсвэл видео үзэх нэг session-д олон event үүсдэг тул batch-аар авна —
  // event тус бүрд нэг HTTP хүсэлт хийвэл сүлжээгээр дамжуулах зардал ихсэж,
  // сүлжээ тасрахад лог алдагдана.
  @Throttle({ default: { limit: 120, ttl: 60_000 } })
  @HttpCode(HttpStatus.ACCEPTED)
  @Post()
  track(@Body() dto: TrackEventsDto, @Req() req: AuthedRequest) {
    return this.events.track(req.user.userId, dto);
  }

  @Get('my-summary')
  mySummary(@Req() req: AuthedRequest) {
    return this.events.mySummary(req.user.userId);
  }

  @Roles(Role.ADMIN)
  @Get('stats')
  stats() {
    return this.events.stats();
  }
}
