import { Global, Module } from '@nestjs/common';
import { StaffCapabilityController } from './staff-capability.controller';
import { StaffCapabilityService } from './staff-capability.service';
@Global()
@Module({
  controllers: [StaffCapabilityController],
  providers: [StaffCapabilityService],
  exports: [StaffCapabilityService],
})
export class StaffCapabilityModule {}
