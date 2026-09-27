import { ConflictException, INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import request from 'supertest';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { FormulasController } from './formulas.controller';
import { FormulasService } from './formulas.service';

describe('PATCH /api/formulas/:slug HTTP authorization and conflicts', () => {
  let app: INestApplication;
  const formulas = { update: jest.fn() };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [FormulasController],
      providers: [Reflector, RolesGuard, { provide: FormulasService, useValue: formulas }],
    }).overrideGuard(JwtAuthGuard).useValue({
      canActivate(context: any) {
        const req = context.switchToHttp().getRequest();
        req.user = { userId: 'synthetic-editor', role: req.headers['x-role'] };
        return true;
      },
    }).compile();
    app = module.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.listen(0, '127.0.0.1');
  });

  afterAll(async () => { await app?.close(); });
  beforeEach(() => formulas.update.mockReset());

  it('denies student role at the HTTP guard before calling the service', async () => {
    await request(app.getHttpServer()).patch('/api/formulas/example').set('x-role', 'STUDENT')
      .send({ title: 'Changed', expectedUpdatedAt: '2026-09-27T10:00:00.000Z' }).expect(403);
    expect(formulas.update).not.toHaveBeenCalled();
  });

  it('returns HTTP 409 for an authorized editor when the service detects a stale version', async () => {
    formulas.update.mockRejectedValue(new ConflictException('Reload the current formula before saving.'));
    await request(app.getHttpServer()).patch('/api/formulas/example').set('x-role', 'ADMIN')
      .send({ title: 'Changed', expectedUpdatedAt: '2026-09-27T10:00:00.000Z' }).expect(409);
    expect(formulas.update).toHaveBeenCalledWith('example', expect.objectContaining({ title: 'Changed', expectedUpdatedAt: '2026-09-27T10:00:00.000Z' }));
  });
});
