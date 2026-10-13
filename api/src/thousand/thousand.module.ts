import { Module } from '@nestjs/common';
import { ThousandController } from './thousand.controller';
import { ThousandService } from './thousand.service';

@Module({
  controllers: [ThousandController],
  providers: [ThousandService],
})
export class ThousandModule {}
