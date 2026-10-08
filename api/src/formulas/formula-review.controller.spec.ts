import {
  ExecutionContext,
  INestApplication,
  UnauthorizedException,
  ValidationPipe,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { FormulaReviewController } from './formula-review.controller';
import { FormulaReviewService } from './formula-review.service';
import { FormulasController } from './formulas.controller';
import { FormulasService } from './formulas.service';

describe('formula review HTTP routing and ownership', () => {
  let app: INestApplication;
  const review = {
    due: jest.fn().mockResolvedValue({ dueCount: 0, newCount: 0, cards: [] }),
    stats: jest.fn().mockResolvedValue({ reviewedToday: 0 }),
    submit: jest.fn().mockResolvedValue({ slug: 'synthetic', box: 0 }),
  };
  const formulas = {
    bySlug: jest.fn().mockResolvedValue({ slug: 'synthetic' }),
  };
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [FormulaReviewController, FormulasController],
      providers: [
        { provide: FormulaReviewService, useValue: review },
        { provide: FormulasService, useValue: formulas },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate(context: ExecutionContext) {
          const req = context.switchToHttp().getRequest();
          if (!req.headers['x-role']) throw new UnauthorizedException();
          req.user = { userId: 'self', role: req.headers['x-role'] };
          return true;
        },
      })
      .compile();
    app = module.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({ transform: true, whitelist: true }),
    );
    await app.init();
  });
  afterAll(async () => {
    await app.close();
  });
  beforeEach(() => jest.clearAllMocks());
  it.each(['ADMIN', 'TEACHER_PLUS', 'TEACHER', 'STUDENT', 'PARENT', 'BUYER'])(
    '%s uses only their own review records',
    async (role) => {
      await request(app.getHttpServer())
        .get('/api/formulas/review/due?limit=4&studentId=victim')
        .set('x-role', role)
        .expect(200);
      expect(review.due).toHaveBeenCalledWith('self', 4);
      await request(app.getHttpServer())
        .get('/api/formulas/review/stats?studentId=victim')
        .set('x-role', role)
        .expect(200);
      expect(review.stats).toHaveBeenCalledWith('self');
      await request(app.getHttpServer())
        .post('/api/formulas/review/synthetic')
        .set('x-role', role)
        .send({ result: 'GOOD', userId: 'victim' })
        .expect(201);
      expect(review.submit).toHaveBeenCalledWith('self', 'synthetic', {
        result: 'GOOD',
      });
      expect(formulas.bySlug).not.toHaveBeenCalled();
    },
  );
  it('returns 401/403 before review handlers', async () => {
    await request(app.getHttpServer())
      .get('/api/formulas/review/due')
      .expect(401);
    await request(app.getHttpServer())
      .post('/api/formulas/review/synthetic')
      .set('x-role', 'UNKNOWN')
      .send({ result: 'GOOD' })
      .expect(403);
    expect(review.due).not.toHaveBeenCalled();
    expect(review.submit).not.toHaveBeenCalled();
  });
  it('rejects invalid request fields with 400', async () => {
    await request(app.getHttpServer())
      .get('/api/formulas/review/due?limit=10000')
      .set('x-role', 'STUDENT')
      .expect(400);
    await request(app.getHttpServer())
      .post('/api/formulas/review/synthetic')
      .set('x-role', 'STUDENT')
      .send({ result: 'CORRECT' })
      .expect(400);
    expect(review.due).not.toHaveBeenCalled();
    expect(review.submit).not.toHaveBeenCalled();
  });
});
