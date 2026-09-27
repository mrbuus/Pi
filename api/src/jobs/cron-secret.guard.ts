import { CanActivate, ExecutionContext, Injectable, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { createHash, timingSafeEqual } from 'node:crypto';

@Injectable()
export class CronSecretGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const expected = process.env.CRON_SECRET?.trim();
    if (!expected) throw new ServiceUnavailableException('Cron secret тохируулаагүй байна');
    const request = context.switchToHttp().getRequest<{ headers?: Record<string, string | undefined> }>();
    const supplied = request.headers?.['x-cron-secret'] ?? '';
    const actualDigest = createHash('sha256').update(supplied).digest();
    const expectedDigest = createHash('sha256').update(expected).digest();
    if (!timingSafeEqual(actualDigest, expectedDigest) || supplied.length !== expected.length) throw new UnauthorizedException();
    return true;
  }
}
