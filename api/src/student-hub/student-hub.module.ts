import { Module } from '@nestjs/common';
import { StudentHubController } from './student-hub.controller';
import { StudentHubService } from './student-hub.service';

@Module({
  controllers: [StudentHubController],
  providers: [StudentHubService],
})
export class StudentHubModule {}
