import { CanActivate, ExecutionContext, Injectable, ServiceUnavailableException } from '@nestjs/common';

// SMS-ийг түр унтраасан (эзэн 2026-10-13). Илгээх бүх үйлдэл SMS_ENABLED=true
// байхгүй бол хаагдана; түүх/төлөв унших GET хэвээр. Код устгаагүй.
@Injectable()
export class SmsEnabledGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const method = context.switchToHttp().getRequest().method;
    if (method === 'GET' || process.env.SMS_ENABLED === 'true') return true;
    throw new ServiceUnavailableException('Дугаарлуу мессеж түр унтраастай байна.');
  }
}
