import 'reflect-metadata';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { validate } from 'class-validator';
import request from 'supertest';
import { ConsentDto, PRIVACY_VERSION } from './dto/consent.dto';
import { ConsentService, consentData } from './consent.service';
import { ConsentController } from './consent.controller';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { PrismaService } from '../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
const valid = {
  acceptTerms: true,
  privacyVersion: PRIVACY_VERSION,
  isMinor: false,
};
const dto = (patch: object = {}) =>
  Object.assign(new ConsentDto(), valid, patch);
describe('Consent validation and persistence', () => {
  it.each([
    { acceptTerms: false },
    { acceptTerms: undefined },
    { privacyVersion: 'old' },
    { privacyVersion: undefined },
    { isMinor: undefined },
    { isMinor: 'false' },
    { isMinor: true },
    { isMinor: true, guardianConsent: false },
  ])('rejects invalid consent %p', async (patch) => {
    expect((await validate(dto(patch))).length).toBeGreaterThan(0);
    expect(() => consentData(dto(patch))).toThrow();
  });
  it.each([{}, { isMinor: true, guardianConsent: true }])(
    'accepts explicit selection %p',
    async (patch) => {
      expect(await validate(dto(patch))).toHaveLength(0);
      const now = new Date('2026-09-26T00:00:00Z');
      expect(consentData(dto(patch), now)).toEqual({
        termsAcceptedAt: now,
        privacyVersion: PRIVACY_VERSION,
        guardianConsentAt: 'isMinor' in patch ? now : null,
      });
    },
  );
  it('register DTO inherits required consent validation', async () => {
    const errors = await validate(
      Object.assign(new RegisterDto(), {
        firstName: 'Demo',
        lastName: 'Synthetic',
        phone: '99000000',
      }),
    );
    expect(errors.map((e) => e.property)).toEqual(
      expect.arrayContaining(['acceptTerms', 'privacyVersion', 'isMinor']),
    );
  });
  it('register persists consent in the same create operation', async () => {
    const prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: 'own', role: 'BUYER' }),
      },
    };
    const jwt = { sign: jest.fn().mockReturnValue('synthetic') };
    const service = new AuthService(
      prisma as unknown as PrismaService,
      jwt as unknown as JwtService,
    );
    await service.register(
      Object.assign(new RegisterDto(), valid, {
        firstName: 'Demo',
        lastName: 'Synthetic',
        phone: '99000000',
        username: 'synthetic',
      }),
    );
    expect(prisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          privacyVersion: PRIVACY_VERSION,
          termsAcceptedAt: expect.any(Date),
          guardianConsentAt: null,
        }),
      }),
    );
  });
  it('repeated acceptance preserves original timestamp without writes', async () => {
    const stored = consentData(dto());
    const user = {
      findUnique: jest.fn().mockResolvedValue(stored),
      updateMany: jest.fn(),
    };
    const service = new ConsentService({ user } as unknown as PrismaService);
    expect(await service.accept('own', dto())).toMatchObject(stored);
    expect(user.updateMany).not.toHaveBeenCalled();
  });
  it('new acceptance is conditional and scoped to the authenticated user', async () => {
    const user = {
      findUnique: jest
        .fn()
        .mockResolvedValueOnce({
          privacyVersion: null,
          termsAcceptedAt: null,
          guardianConsentAt: null,
        })
        .mockResolvedValue(consentData(dto())),
      updateMany: jest.fn(),
    };
    const service = new ConsentService({ user } as unknown as PrismaService);
    await service.accept('own', dto());
    expect(user.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: 'own', OR: expect.any(Array) }),
      }),
    );
  });
});
describe('Consent HTTP authorization', () => {
  let app: INestApplication;
  const service = {
    status: jest.fn().mockResolvedValue({ needsConsent: true }),
    accept: jest.fn().mockResolvedValue({ needsConsent: false }),
  };
  beforeAll(async () => {
    const mod = await Test.createTestingModule({
      controllers: [ConsentController],
      providers: [{ provide: ConsentService, useValue: service }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate(ctx) {
          const req = ctx.switchToHttp().getRequest();
          if (req.headers['x-role'])
            req.user = { userId: 'own', role: req.headers['x-role'] };
          return true;
        },
      })
      .compile();
    app = mod.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();
  });
  afterAll(async () => {
    await app.close();
  });
  it.each(['ADMIN', 'TEACHER_PLUS', 'TEACHER', 'STUDENT', 'PARENT', 'BUYER'])(
    '%s reads only own consent',
    async (role) => {
      await request(app.getHttpServer())
        .get('/api/consent/my')
        .set('x-role', role)
        .expect(200);
      expect(service.status).toHaveBeenLastCalledWith('own');
    },
  );
  it.each(['GET', 'POST'])(
    '%s rejects absent role with 403',
    async (method) => {
      const req =
        method === 'GET'
          ? request(app.getHttpServer()).get('/api/consent/my')
          : request(app.getHttpServer()).post('/api/consent/my').send(valid);
      await req.expect(403);
    },
  );
  it('cannot select another account in body', async () => {
    await request(app.getHttpServer())
      .post('/api/consent/my')
      .set('x-role', 'STUDENT')
      .send({ ...valid, userId: 'someone-else' })
      .expect(201);
    expect(service.accept).toHaveBeenLastCalledWith(
      'own',
      expect.not.objectContaining({ userId: 'someone-else' }),
    );
  });
  it('rejects missing consent before calling service', async () => {
    await request(app.getHttpServer())
      .post('/api/consent/my')
      .set('x-role', 'STUDENT')
      .send({})
      .expect(400);
  });
});
