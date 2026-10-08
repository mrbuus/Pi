import { ExecutionContext, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { CronSecretGuard } from './cron-secret.guard';

describe('CronSecretGuard', () => {
  const guard = new CronSecretGuard();
  const request = (secret?: string) => ({ switchToHttp: () => ({ getRequest: () => ({ headers: secret ? { 'x-cron-secret': secret } : {} }) }) }) as unknown as ExecutionContext;
  afterEach(() => { delete process.env.CRON_SECRET; });

  it('fails closed with 503 when the secret is not configured', () => {
    expect(() => guard.canActivate(request('provided'))).toThrow(ServiceUnavailableException);
  });

  it('rejects a wrong secret with 401 and accepts the configured one', () => {
    process.env.CRON_SECRET = 'synthetic-cron-secret';
    expect(() => guard.canActivate(request('wrong'))).toThrow(UnauthorizedException);
    expect(guard.canActivate(request('synthetic-cron-secret'))).toBe(true);
  });
});
