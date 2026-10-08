import { Reflector } from '@nestjs/core';
import { BadRequestException } from '@nestjs/common';
import { ROLES_KEY } from '../auth/decorators/roles.decorator';
import { Role } from '../generated/prisma/enums';
import { DocumentImportService } from './document-import.service';
import type { RequestWithUser } from '../auth/request.interface';
import { DocumentImportController } from './document-import.controller';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { ExecutionContext } from '@nestjs/common';
describe('DOCX preview access', () => {
  it('allows only teacher+ and admin on the controller', () => {
    const guard = new RolesGuard(new Reflector());
    expect(Reflect.getMetadata(ROLES_KEY, DocumentImportController)).toEqual([
      Role.ADMIN,
      Role.TEACHER_PLUS,
    ]);
    for (const role of Object.values(Role)) {
      const context = {
        getHandler: () => () => undefined,
        getClass: () => DocumentImportController,
        switchToHttp: () => ({ getRequest: () => ({ user: { role } }) }),
      } as unknown as ExecutionContext;
      expect(guard.canActivate(context)).toBe(
        role === Role.ADMIN || role === Role.TEACHER_PLUS,
      );
    }
  });
  it('returns a controlled bad request for missing or malformed upload', async () => {
    const imports = {
      preview: jest.fn().mockRejectedValue(new Error('Баримт буруу.')),
    } as unknown as DocumentImportService;
    const controller = new DocumentImportController(imports);
    const request = {
      user: { userId: 'teacher', role: Role.TEACHER_PLUS },
    } as RequestWithUser;
    await expect(controller.preview(request)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    await expect(
      controller.preview(request, {
        originalname: 'fake.docx',
        buffer: Buffer.from('bad'),
      } as Express.Multer.File),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
