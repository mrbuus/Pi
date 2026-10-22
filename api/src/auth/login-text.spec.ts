import 'reflect-metadata';
import { BadRequestException, ExecutionContext } from '@nestjs/common';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { Reflector } from '@nestjs/core';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { Role } from '../generated/prisma/enums';
import { ROLES_KEY } from './decorators/roles.decorator';
import { LoginTextDto } from './dto/login-text.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { LoginTextController } from './login-text.controller';
import { LoginTextService, normalizeLoginText } from './login-text.service';

const guardsOf = (target: object): unknown[] => Reflect.getMetadata(GUARDS_METADATA, target) ?? [];

describe('Нэвтрэх хуудасны тайлбар — эрх', () => {
  const proto = LoginTextController.prototype;

  it('GET нийтийн (JWT шаардахгүй)', () => {
    expect(guardsOf(proto.get)).not.toContain(JwtAuthGuard);
    expect(guardsOf(LoginTextController)).toEqual([]);
  });

  it('PUT зөвхөн ADMIN — бусад 6 эрх ба нэвтрээгүй хүн 403', () => {
    expect(guardsOf(proto.set)).toEqual([JwtAuthGuard, RolesGuard]);
    expect(Reflect.getMetadata(ROLES_KEY, proto.set)).toEqual([Role.ADMIN]);
    const guard = new RolesGuard(new Reflector());
    for (const role of [undefined, ...Object.values(Role)]) {
      const ctx = {
        getHandler: () => proto.set,
        getClass: () => LoginTextController,
        switchToHttp: () => ({ getRequest: () => ({ user: role ? { userId: 'u', role } : undefined }) }),
      } as unknown as ExecutionContext;
      expect(guard.canActivate(ctx)).toBe(role === Role.ADMIN);
    }
  });
});

describe('Нэвтрэх хуудасны тайлбар — өгөгдөл', () => {
  it('DTO: 1000 тэмдэгт хүртэл, мөр заавал', async () => {
    expect(await validate(plainToInstance(LoginTextDto, { body: 'а'.repeat(1000) }))).toHaveLength(0);
    expect(await validate(plainToInstance(LoginTextDto, { body: 'а'.repeat(1001) }))).not.toHaveLength(0);
    expect(await validate(plainToInstance(LoginTextDto, {}))).not.toHaveLength(0);
  });

  it('normalize: \\r\\n → \\n, хяналтын тэмдэгт хасна, олон хоосон мөрийг шахна', () => {
    expect(normalizeLoginText('  Сайн байна уу\r\n\r\n\r\n\r\nЗарлал\u0007  ')).toBe('Сайн байна уу\n\nЗарлал');
    expect(normalizeLoginText('<b>html</b>')).toBe('<b>html</b>'); // вэб текстээр зурна
  });

  it('set: upsert ганц мөр + аудит; get: мөргүй бол хоосон', async () => {
    const rows: Record<string, any> = {};
    const prisma = {
      loginText: {
        findUnique: jest.fn(async ({ where }: any) => rows[where.id] ?? null),
        upsert: jest.fn(async ({ where, create, update }: any) => {
          rows[where.id] = { ...(rows[where.id] ?? create), ...update, updatedAt: new Date() };
          return { body: rows[where.id].body, updatedAt: rows[where.id].updatedAt };
        }),
      },
    };
    const audit = { record: jest.fn(async () => undefined) };
    const svc = new LoginTextService(prisma as any, audit as any);
    await expect(svc.get()).resolves.toEqual({ body: '', updatedAt: null });
    await svc.set('Шинэ улирал 9-р сарын 1-нд\r\nэхэлнэ', { userId: 'admin-1', role: 'ADMIN' });
    expect(rows.default).toMatchObject({ body: 'Шинэ улирал 9-р сарын 1-нд\nэхэлнэ', updatedById: 'admin-1' });
    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({ action: 'LOGIN_TEXT_UPDATE', actorId: 'admin-1' }));
    await expect(svc.get()).resolves.toMatchObject({ body: 'Шинэ улирал 9-р сарын 1-нд\nэхэлнэ' });
    await expect(svc.set('а'.repeat(1001), { userId: 'admin-1', role: 'ADMIN' })).rejects.toThrow(BadRequestException);
  });
});
