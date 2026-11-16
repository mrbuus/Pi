import { Module } from '@nestjs/common';
import { ThousandController } from './thousand.controller';
import { ThousandService } from './thousand.service';
import { StaffCapabilityModule } from '../staff-capabilities/staff-capability.module';

@Module({
  imports: [StaffCapabilityModule],
  controllers: [ThousandController],
  providers: [ThousandService],
})
export class ThousandModule {}
