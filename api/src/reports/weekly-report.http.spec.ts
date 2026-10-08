import { INestApplication, UnauthorizedException, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { WeeklyReportController } from './weekly-report.controller';
import { WeeklyReportService } from './weekly-report.service';

describe('GET /parents/weekly-report access', () => {
  let app: INestApplication;
  const prisma: any = { parentLink: { findFirst: jest.fn().mockResolvedValue(null) } };
  beforeAll(async () => {
    const module = await Test.createTestingModule({ controllers: [WeeklyReportController], providers: [WeeklyReportService, { provide: PrismaService, useValue: prisma }] })
      .overrideGuard(JwtAuthGuard).useValue({ canActivate(context: any) { const req = context.switchToHttp().getRequest(); if (req.headers.authorization === 'Bearer parent') { req.user = { userId: 'parent-id', role: 'PARENT' }; return true; } if (req.headers.authorization === 'Bearer admin') { req.user = { userId: 'admin-id', role: 'ADMIN' }; return true; } throw new UnauthorizedException(); } }).compile();
    app = module.createNestApplication(); app.setGlobalPrefix('api'); app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true })); await app.init();
  });
  afterAll(async () => app.close());

  it('requires authentication', async () => {
    await request(app.getHttpServer()).get('/api/parents/weekly-report?studentId=child&week=2026-09-21').expect(401);
  });

  it('denies a parent without a verified child link', async () => {
    await request(app.getHttpServer()).get('/api/parents/weekly-report?studentId=child&week=2026-09-21').set('Authorization', 'Bearer parent').expect(403);
    expect(prisma.parentLink.findFirst).toHaveBeenCalledWith({ where: { parentId: 'parent-id', studentId: 'child', verifiedAt: { not: null }, parent: { role: 'PARENT', archivedAt: null }, student: { archivedAt: null } }, select: { id: true } });
  });
});
