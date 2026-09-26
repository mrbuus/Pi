import 'reflect-metadata';
import { Body, Controller, INestApplication, Post } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { validate } from 'class-validator';
import request from 'supertest';
import { setupSwagger } from './swagger';
import { RegisterDto } from './auth/dto/register.dto';
import { CreateTestDto } from './tests/dto/create-test.dto';
@Controller('synthetic')
class DocsFixtureController {
  @Post('register') register(@Body() dto: RegisterDto) {
    return dto;
  }
  @Post('test') test(@Body() dto: CreateTestDto) {
    return dto;
  }
}
async function application(env: NodeJS.ProcessEnv) {
  const mod = await Test.createTestingModule({
    controllers: [DocsFixtureController],
  }).compile();
  const app = mod.createNestApplication();
  app.setGlobalPrefix('api');
  const enabled = setupSwagger(app, env);
  await app.init();
  return { app, enabled };
}
describe('OpenAPI opt-in and production boundary', () => {
  it.each([
    { NODE_ENV: 'production', ENABLE_SWAGGER: '1' },
    { NODE_ENV: 'development', ENABLE_SWAGGER: '0' },
    { NODE_ENV: 'test' },
  ])('docs and raw specs unavailable: %p', async (env) => {
    const { app, enabled } = await application(env);
    try {
      expect(enabled).toBe(false);
      for (const route of ['/api/docs', '/api/docs-json', '/api/docs-yaml'])
        await request(app.getHttpServer()).get(route).expect(404);
    } finally {
      await app.close();
    }
  });
  it('enabled nonproduction serves local UI assets and DTO contracts without double prefix', async () => {
    const { app, enabled } = await application({
      NODE_ENV: 'development',
      ENABLE_SWAGGER: '1',
    });
    try {
      expect(enabled).toBe(true);
      const ui = await request(app.getHttpServer())
        .get('/api/docs')
        .expect(200);
      expect(ui.text).not.toMatch(/src="https?:/);
      await request(app.getHttpServer())
        .get('/api/docs/swagger-ui-bundle.js')
        .expect(200);
      const { body } = await request(app.getHttpServer())
        .get('/api/docs-json')
        .expect(200);
      expect(body.info.title).toBe('Pi.mn API');
      expect(body.paths['/api/synthetic/register']).toBeDefined();
      expect(Object.keys(body.paths).some((p) => p.includes('/api/api/'))).toBe(
        false,
      );
      const schema = body.components.schemas.RegisterDto;
      expect(schema.required).toEqual(
        expect.arrayContaining(['firstName', 'lastName']),
      );
      expect(schema.required).not.toContain('phone');
      expect(schema.properties.phone.type).toBe('string');
      expect(schema.properties.grade.maximum).toBe(12);
      expect(schema.properties.password.writeOnly).toBe(true);
      expect(body.components.schemas.CreateTestDto.properties).toHaveProperty(
        'problems',
      );
    } finally {
      await app.close();
    }
  });
  it('documentation decorators preserve class-validator behavior', async () => {
    const invalid = Object.assign(new RegisterDto(), {
      firstName: 'Demo',
      lastName: 'Synthetic',
      phone: 'x',
      grade: 99,
    });
    expect((await validate(invalid)).map((e) => e.property)).toEqual(
      expect.arrayContaining(['phone', 'grade']),
    );
    const valid = Object.assign(new RegisterDto(), {
      firstName: 'Demo',
      lastName: 'Synthetic',
      phone: '99000000',
      grade: 12,
      acceptTerms: true,
      privacyVersion: '2026-09-26-draft',
      isMinor: false,
    });
    expect(await validate(valid)).toHaveLength(0);
  });
});
