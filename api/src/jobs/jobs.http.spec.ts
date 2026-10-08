import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { CronSecretGuard } from './cron-secret.guard';
import { JobsController } from './jobs.controller';
import { JobsService } from './jobs.service';

describe('POST /jobs/run secret boundary', () => {
  let app: INestApplication;
  const jobs = { run: jest.fn().mockResolvedValue({ name: 'parent-weekly', skipped: false }) };
  beforeAll(async () => {
    const module = await Test.createTestingModule({ controllers: [JobsController], providers: [CronSecretGuard, { provide: JobsService, useValue: jobs }] }).compile();
    app = module.createNestApplication(); app.setGlobalPrefix('api'); app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true })); await app.init();
  });
  afterAll(async () => { delete process.env.CRON_SECRET; await app.close(); });

  it('returns 503 when no cron secret is configured', async () => {
    delete process.env.CRON_SECRET;
    await request(app.getHttpServer()).post('/api/jobs/run?name=parent-weekly').set('x-cron-secret', 'anything').expect(503);
  });

  it('returns 401 for a wrong secret and runs with the exact configured secret', async () => {
    process.env.CRON_SECRET = 'synthetic-secret';
    await request(app.getHttpServer()).post('/api/jobs/run?name=parent-weekly').set('x-cron-secret', 'wrong').expect(401);
    await request(app.getHttpServer()).post('/api/jobs/run?name=parent-weekly').set('x-cron-secret', 'synthetic-secret').expect(201);
    expect(jobs.run).toHaveBeenCalledWith('parent-weekly');
  });

  it('rejects an unknown job name with 400 after the secret check', async () => {
    process.env.CRON_SECRET = 'synthetic-secret';
    await request(app.getHttpServer()).post('/api/jobs/run?name=unknown').set('x-cron-secret', 'synthetic-secret').expect(400);
    expect(jobs.run).not.toHaveBeenCalledWith('unknown');
  });
});
