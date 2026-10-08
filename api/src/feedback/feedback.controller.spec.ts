import { INestApplication, UnauthorizedException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { FeedbackController } from './feedback.controller';
import { FeedbackService } from './feedback.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Role } from '../generated/prisma/enums';

// Authentication is a test-only stub; real role guards and request validation remain active.
describe('Feedback HTTP role and request boundaries', () => {
  let app: INestApplication;
  const service = {
    create: jest.fn(async (authorId, body) => ({
      id: 'ticket',
      authorId,
      ...body,
    })),
    list: jest.fn(async () => []),
    listAll: jest.fn(async () => []),
    detail: jest.fn(async () => ({ id: 'ticket' })),
    triage: jest.fn(async () => ({ id: 'ticket', state: 'RESOLVED' })),
  };
  const body = {
    clientRequestId: '8fc5b2a1-2bb0-4cce-a68b-8bd2ef603517',
    kind: 'BUG',
    subject: 'Test issue',
    body: 'An isolated test report.',
    contextPath: '/app/feedback',
  };
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [FeedbackController],
      providers: [{ provide: FeedbackService, useValue: service }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate(context) {
          const req = context.switchToHttp().getRequest();
          const role = req.headers['x-test-role'];
          if (!Object.values(Role).includes(role))
            throw new UnauthorizedException();
          req.user = { userId: 'test-author', role };
          return true;
        },
      })
      .compile();
    app = module.createNestApplication();
    await app.init();
  });
  afterAll(async () => {
    await app.close();
  });
  it('rejects anonymous requests', async () => {
    await request(app.getHttpServer()).get('/feedback').expect(401);
  });
  it.each(Object.values(Role))(
    'accepts an own create request for %s',
    async (role) => {
      const res = await request(app.getHttpServer())
        .post('/feedback')
        .set('x-test-role', role)
        .send(body)
        .expect(201);
      expect(res.body.authorId).toBe('test-author');
    },
  );
  it.each(Object.values(Role).filter((role) => role !== Role.ADMIN))(
    'HTTP blocks %s from admin list and triage',
    async (role) => {
      await request(app.getHttpServer())
        .get('/feedback/admin')
        .set('x-test-role', role)
        .expect(403);
      await request(app.getHttpServer())
        .patch('/feedback/ticket')
        .set('x-test-role', role)
        .send({ state: 'RESOLVED', response: 'visible reply' })
        .expect(403);
    },
  );
  it('allows administrator list and a visible response', async () => {
    await request(app.getHttpServer())
      .get('/feedback/admin')
      .set('x-test-role', Role.ADMIN)
      .expect(200);
    await request(app.getHttpServer())
      .patch('/feedback/ticket')
      .set('x-test-role', Role.ADMIN)
      .send({ state: 'RESOLVED', response: 'Visible reply' })
      .expect(200);
    expect(service.triage).toHaveBeenCalledWith(
      'ticket',
      'test-author',
      Role.ADMIN,
      { state: 'RESOLVED', response: 'Visible reply' },
    );
  });
  it('rejects author impersonation fields and credential-bearing context URLs', async () => {
    await request(app.getHttpServer())
      .post('/feedback')
      .set('x-test-role', Role.STUDENT)
      .send({ ...body, authorId: 'someone-else' })
      .expect(400);
    await request(app.getHttpServer())
      .post('/feedback')
      .set('x-test-role', Role.STUDENT)
      .send({ ...body, contextPath: '/app/profile?token=private' })
      .expect(400);
  });
});
