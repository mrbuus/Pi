import {
  ExecutionContext,
  INestApplication,
  UnauthorizedException,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import type { Server } from 'node:http';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ROLES_KEY } from '../auth/decorators/roles.decorator';
import { Role } from '../generated/prisma/enums';
import { ClassroomsController } from './classrooms.controller';
import { ClassroomsService } from './classrooms.service';

describe('GET /classrooms/registry — маршрутын дараалал', () => {
  let app: INestApplication;
  const service = {
    registry: jest.fn().mockResolvedValue([{ id: 'enrollment-1' }]),
    get: jest.fn().mockResolvedValue({ classroom: { id: 'class-1' } }),
  };

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [ClassroomsController],
      providers: [{ provide: ClassroomsService, useValue: service }],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate(context: ExecutionContext) {
          const req = context.switchToHttp().getRequest<{
            headers: Record<string, string>;
            user?: { userId: string; role: string };
          }>();
          if (!req.headers['x-test-role']) throw new UnauthorizedException();
          req.user = { userId: 'actor', role: req.headers['x-test-role'] };
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
  beforeEach(() => jest.clearAllMocks());

  it('/:id-д баригдахгүй — registry() дуудагдана (өмнө нь 404 «Анги олдсонгүй»)', async () => {
    const res = await request(app.getHttpServer() as Server)
      .get('/classrooms/registry')
      .set('x-test-role', Role.ADMIN)
      .expect(200);
    expect(res.body).toEqual([{ id: 'enrollment-1' }]);
    expect(service.registry).toHaveBeenCalledTimes(1);
    expect(service.get).not.toHaveBeenCalled();
  });

  it('/:id хэвээр ажиллана', async () => {
    await request(app.getHttpServer() as Server)
      .get('/classrooms/class-1')
      .set('x-test-role', Role.TEACHER)
      .expect(200);
    expect(service.get).toHaveBeenCalledWith('class-1', 'actor', Role.TEACHER);
  });

  it('эрх: Админ, Багш+ л (вэбийн RequireRole, unassigned-students-тэй ижил)', async () => {
    expect(
      Reflect.getMetadata(ROLES_KEY, ClassroomsController.prototype.registry),
    ).toEqual([Role.ADMIN, Role.TEACHER_PLUS]);
    await request(app.getHttpServer() as Server)
      .get('/classrooms/registry')
      .set('x-test-role', Role.TEACHER_PLUS)
      .expect(200);
    for (const role of [Role.TEACHER, Role.STUDENT, Role.PARENT, Role.BUYER])
      await request(app.getHttpServer() as Server)
        .get('/classrooms/registry')
        .set('x-test-role', role)
        .expect(403);
    expect(service.registry).toHaveBeenCalledTimes(1);
  });
});

describe('ClassroomsService.registry — вэбийн RegistryEntry хэлбэр', () => {
  it('архивлаагүй сурагчийн БҮХ элсэлт (идэвхтэй + түүх), утасгүй', async () => {
    const rows = [
      {
        id: 'e2',
        joinedAt: new Date('2026-10-01'),
        leftAt: null,
        movedById: 'admin',
        student: {
          id: 's1',
          firstName: 'Тэмүүлэн',
          lastName: 'Б',
          studentCode: 'B27120001',
          studentProfile: { grade: 12, branch: 'Баруун 4', school: '1-р сургууль' },
        },
        classroom: { id: 'c2', name: '12-Б', grade: 12, type: 'IN_PERSON' },
      },
    ];
    const prisma = { enrollment: { findMany: jest.fn().mockResolvedValue(rows) } };
    const service = new ClassroomsService(prisma as any, { record: jest.fn() } as any);

    await expect(service.registry()).resolves.toBe(rows);
    const args = prisma.enrollment.findMany.mock.calls[0][0];
    expect(args.where).toEqual({
      student: { role: Role.STUDENT, archivedAt: null },
    });
    // leftAt-тай мөрийг шүүхгүй — ангийн түүх вэбд хэрэгтэй
    expect(JSON.stringify(args.where)).not.toContain('leftAt');
    expect(args.select).toMatchObject({
      id: true,
      joinedAt: true,
      leftAt: true,
      movedById: true,
      student: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          studentCode: true,
          studentProfile: { select: { grade: true, branch: true, school: true } },
        },
      },
      classroom: { select: { id: true, name: true, grade: true, type: true } },
    });
    expect(JSON.stringify(args.select)).not.toContain('phone');
  });
});

describe('GET /classrooms/:id — subject (хичээл)', () => {
  const classroom = (subject: 'SOCIAL_STUDIES' | null) => ({
    id: 'class-1',
    name: 'Нийгэм 11',
    type: 'IN_PERSON',
    grade: 11,
    subject,
    teacherId: null,
    teacher: null,
    assistantTeacherId: null,
    assistantTeacher: null,
    archived: false,
    enrollments: [],
  });

  it.each([
    ['SOCIAL_STUDIES', 'SOCIAL_STUDIES'],
    [null, null],
  ] as const)('subject=%s хариунд орно (засах маягт Математик гэж андуурахгүй)', async (stored, expected) => {
    const prisma = {
      classroom: { findUnique: jest.fn().mockResolvedValue(classroom(stored)) },
      teacherProfile: { findUnique: jest.fn() },
    };
    const service = new ClassroomsService(prisma as any, { record: jest.fn() } as any);
    const result = await service.get('class-1', 'admin', Role.ADMIN);
    expect(result.classroom).toHaveProperty('subject', expected);
  });
});
