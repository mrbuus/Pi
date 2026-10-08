import {
  ExecutionContext,
  INestApplication,
  UnauthorizedException,
  ValidationPipe,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import JSZip from 'jszip';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { DocumentImportModule } from './document-import.module';
import type { Server } from 'node:http';
import { DocumentImportService } from './document-import.service';

describe('DOCX HTTP guards and validation', () => {
  let app: INestApplication;
  const confirms = jest
    .fn()
    .mockResolvedValue({ problemId: 'saved', duplicate: false });
  const service = {
    preview: jest.fn().mockResolvedValue({
      previewToken: 'signed-preview',
      blocks: [],
      canAutoImport: false,
    }),
    confirm: confirms,
  };
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      imports: [DocumentImportModule],
      providers: [{ provide: PrismaService, useValue: {} }],
    })
      .overrideProvider(DocumentImportService)
      .useValue(service)
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate(context: ExecutionContext) {
          const req = context.switchToHttp().getRequest<{
            headers: Record<string, string>;
            user?: { userId: string; role: string };
          }>();
          if (!req.headers['x-test-role']) throw new UnauthorizedException();
          req.user = { userId: 'teacher', role: req.headers['x-test-role'] };
          return true;
        },
      })
      .compile();
    app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });
  afterAll(async () => {
    await app.close();
  });
  it('denies unauthenticated, student and ordinary teacher preview/confirm requests', async () => {
    await request(app.getHttpServer() as Server)
      .post('/document-import/confirm')
      .send({})
      .expect(401);
    for (const role of ['STUDENT', 'TEACHER', 'PARENT', 'BUYER']) {
      await request(app.getHttpServer() as Server)
        .post('/document-import/preview')
        .set('x-test-role', role)
        .attach('file', Buffer.from('docx'), 'x.docx')
        .expect(403);
      await request(app.getHttpServer() as Server)
        .post('/document-import/confirm')
        .set('x-test-role', role)
        .send({})
        .expect(403);
    }
    expect(confirms).not.toHaveBeenCalled();
  });
  it('requires reviewed mapping and strips no extra answer payload silently', async () => {
    const base = {
      previewToken: 'signed-preview',
      chapterId: 'chapter',
      confirmed: true,
      warningsAcknowledged: true,
      mapping: {
        promptId: 'block-1',
        choiceIds: ['block-2', 'block-3'],
        correctChoiceId: 'block-2',
      },
    };
    await request(app.getHttpServer() as Server)
      .post('/document-import/confirm')
      .set('x-test-role', 'TEACHER_PLUS')
      .send({ ...base, correctAnswer: 'injected' })
      .expect(400);
    await request(app.getHttpServer() as Server)
      .post('/document-import/confirm')
      .set('x-test-role', 'TEACHER_PLUS')
      .send({ ...base, confirmed: false })
      .expect(400);
    const response = await request(app.getHttpServer() as Server)
      .post('/document-import/confirm')
      .set('x-test-role', 'ADMIN')
      .send(base)
      .expect(201);
    expect(response.body).toEqual({ problemId: 'saved', duplicate: false });
  });
  it('accepts one multipart preview and bounds upload bytes before parser work', async () => {
    const zip = new JSZip();
    zip.file('word/document.xml', '<document/>');
    await request(app.getHttpServer() as Server)
      .post('/document-import/preview')
      .set('x-test-role', 'TEACHER_PLUS')
      .attach('file', await zip.generateAsync({ type: 'nodebuffer' }), 'x.docx')
      .expect(201);
    await request(app.getHttpServer() as Server)
      .post('/document-import/preview')
      .set('x-test-role', 'TEACHER_PLUS')
      .attach('file', Buffer.alloc(10 * 1024 * 1024 + 1), 'large.docx')
      .expect(413);
  });
});
