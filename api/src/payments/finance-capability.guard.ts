import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { StaffCapabilityService } from '../staff-capabilities/staff-capability.service';
@Injectable()
export class FinanceCapabilityGuard implements CanActivate {
  constructor(private readonly capabilities: StaffCapabilityService) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    await this.capabilities.assert(
      context.switchToHttp().getRequest().user.userId,
      'finance.manage',
    );
    return true;
  }
}
