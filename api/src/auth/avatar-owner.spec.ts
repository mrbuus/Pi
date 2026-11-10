import { BadRequestException } from '@nestjs/common';
import { AuthService } from './auth.service';

describe('Аватар — зөвхөн өөрийн оруулсан зураг (2026-11-05 аудит)', () => {
  const files = [
    { key: 'mine.jpg', ownerId: 'u1', mime: 'image/jpeg' },
    { key: 'other.jpg', ownerId: 'u2', mime: 'image/jpeg' },
    { key: 'doc.pdf', ownerId: 'u1', mime: 'application/pdf' },
  ];
  const update = jest.fn().mockResolvedValue({});
  const svc = Object.create(AuthService.prototype) as AuthService;
  (svc as unknown as { prisma: unknown }).prisma = {
    storedFile: {
      findFirst: jest.fn(async ({ where }: any) =>
        files.find(
          (f) => f.key === where.key && f.ownerId === where.ownerId && f.mime.startsWith(where.mime.startsWith),
        ) ?? null,
      ),
    },
    user: { update },
  };

  it('өөрийн зураг → хадгална', async () => {
    await expect(svc.setAvatar('u1', 'mine.jpg')).resolves.toEqual({ avatarUrl: 'mine.jpg' });
  });
  it('өөр хүний файл эсвэл зураг биш → 400, бичихгүй', async () => {
    update.mockClear();
    await expect(svc.setAvatar('u1', 'other.jpg')).rejects.toBeInstanceOf(BadRequestException);
    await expect(svc.setAvatar('u1', 'doc.pdf')).rejects.toBeInstanceOf(BadRequestException);
    expect(update).not.toHaveBeenCalled();
  });
});
