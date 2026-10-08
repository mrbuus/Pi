import { Controller, Post, Query, UseGuards } from '@nestjs/common';
import { CronSecretGuard } from './cron-secret.guard';
import { RunJobDto } from './dto/run-job.dto';
import { JobsService } from './jobs.service';

@Controller('jobs')
@UseGuards(CronSecretGuard)
export class JobsController {
  constructor(private readonly jobs: JobsService) {}

  @Post('run')
  run(@Query() query: RunJobDto) {
    return this.jobs.run(query.name);
  }
}
