import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { PrismaService } from './prisma/prisma.service';

/** Machine health reveals no credentials, user records or database diagnostics. */
@Controller('health')
@SkipThrottle()
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('live')
  live() {
    return { status: 'ok', service: 'pi.mn-v2' };
  }

  @Get('ready')
  async ready() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'ready', service: 'pi.mn-v2' };
    } catch {
      throw new ServiceUnavailableException('Үйлчилгээ түр бэлэн биш байна');
    }
  }
}
