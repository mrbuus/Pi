import {
  applyDecorators,
  CanActivate,
  ExecutionContext,
  Injectable,
  SetMetadata,
  UseGuards,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  StaffCapabilityService,
  type StaffCapability,
} from './staff-capability.service';

export const CAPABILITY_KEY = 'staffCapability';

/**
 * Эрхийн матрицын хамгаалалт (эзэн 2026-11-16). RolesGuard хэн хандахыг шийдсэний
 * ДАРАА ажиллана: зөвхөн Багш+-ийг тухайн эрхээр шүүнэ (анхдагчаар нээлттэй, Админ
 * хааж болно). Админ үргэлж нэвтэрнэ; Багш болон бусад үүрэгт нөлөөлөхгүй.
 */
@Injectable()
export class CapabilityGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly capabilities: StaffCapabilityService,
  ) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const capability = this.reflector.getAllAndOverride<
      StaffCapability | undefined
    >(CAPABILITY_KEY, [context.getHandler(), context.getClass()]);
    if (!capability) return true;
    const userId = context.switchToHttp().getRequest().user?.userId;
    if (!userId) return false;
    await this.capabilities.assertForTeacherPlus(userId, capability);
    return true;
  }
}

/** Маршрутад эрхийн матрицын эрх шаардана (Багш+-д). `@Roles`-ийг хэвээр үлдээнэ */
export const RequireCapability = (capability: StaffCapability) =>
  applyDecorators(
    SetMetadata(CAPABILITY_KEY, capability),
    UseGuards(CapabilityGuard),
  );
