import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import request from 'supertest';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Role } from '../generated/prisma/enums';
import { ReadinessController } from './readiness.controller';
import { ReadinessService } from './readiness.service';

describe('Readiness HTTP role guards', () => {
  let app: INestApplication;
  const readiness = { getForStudent: jest.fn().mockResolvedValue({ index: 50, low: 0, high: 100, dataPoints: 0, effectiveDataPoints: 0, coverage: 0, topics: [], nextBestTopics: [], weeklyHistory: [] }) };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [ReadinessController],
      providers: [Reflector, RolesGuard, { provide: ReadinessService, useValue: readiness }],
    }).overrideGuard(JwtAuthGuard).useValue({
      canActivate(context: any) {
        const req = context.switchToHttp().getRequest();
        req.user = { userId: 'synthetic-user', role: req.headers['x-role'] };
        return true;
      },
    }).compile();
    app = module.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.listen(0, '127.0.0.1');
  });

  afterAll(async () => { await app?.close(); });
  beforeEach(() => readiness.getForStudent.mockClear());

  it('allows the student self route and blocks other roles at the HTTP guard', async () => {
    await request(app.getHttpServer()).get('/api/readiness/my').set('x-role', Role.STUDENT).expect(200);
    expect(readiness.getForStudent).toHaveBeenCalledWith('synthetic-user', Role.STUDENT, 'synthetic-user');
    await request(app.getHttpServer()).get('/api/readiness/my').set('x-role', Role.TEACHER).expect(403);
    expect(readiness.getForStudent).toHaveBeenCalledTimes(1);
  });

  it('allows the student-scope route only for supported roles', async () => {
    await request(app.getHttpServer()).get('/api/readiness/student/child-1').set('x-role', Role.PARENT).expect(200);
    expect(readiness.getForStudent).toHaveBeenCalledWith('synthetic-user', Role.PARENT, 'child-1');
    await request(app.getHttpServer()).get('/api/readiness/student/child-1').set('x-role', Role.BUYER).expect(403);
  });
});
