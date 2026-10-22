import 'reflect-metadata';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from './auth.service';
import { PRIVACY_VERSION } from './dto/consent.dto';
import { RegisterDto } from './dto/register.dto';
import { signSignupTicket } from './google/signup-ticket';

/* Gmail-ээр бүртгүүлэх: тасалбар шалгагдаж, утас заавал, Gmail бүртгэлийн
   имэйл болж, GoogleIdentity НЭГ create дотор холбогдоно. */

const ticketData = {
  googleSubject: 'google-sub-new',
  email: 'new.parent@gmail.com',
  firstName: 'Сараа',
  lastName: 'Бат',
  picture: 'https://lh3.googleusercontent.com/a/p',
};

function makeService(existing: { phone?: boolean; identity?: boolean } = {}) {
  const prisma = {
    user: {
      findUnique: jest.fn(async ({ where }: any) => (where.phone && existing.phone ? { id: 'other' } : null)),
      findFirst: jest.fn(async () => null),
      create: jest.fn(async ({ data }: any) => ({ id: 'new-user', role: data.role, studentCode: null, teacherCode: null })),
    },
    googleIdentity: {
      findUnique: jest.fn(async () => (existing.identity ? { id: 'gi' } : null)),
    },
  };
  const service = new AuthService(
    prisma as unknown as PrismaService,
    { sign: jest.fn().mockReturnValue('synthetic') } as unknown as JwtService,
  );
  return { service, prisma };
}

const dto = (patch: Partial<RegisterDto>) =>
  Object.assign(new RegisterDto(), {
    acceptTerms: true,
    privacyVersion: PRIVACY_VERSION,
    isMinor: false,
    firstName: 'Сараа',
    lastName: 'Бат',
    asParent: true,
    ...patch,
  });

describe('AuthService.register — Gmail тасалбартай', () => {
  const env = process.env.JWT_SECRET;
  beforeEach(() => {
    process.env.JWT_SECRET = 'synthetic-jwt-secret';
  });
  afterAll(() => {
    process.env.JWT_SECRET = env;
  });

  it('Gmail-ийг имэйл болгож, GoogleIdentity-г нэг create-д холбоно', async () => {
    const { service, prisma } = makeService();
    await service.register(
      dto({ phone: '99001122', email: 'spoofed@evil.example', googleTicket: signSignupTicket(ticketData) }),
    );
    const data = prisma.user.create.mock.calls[0][0].data;
    expect(data.email).toBe('new.parent@gmail.com');
    expect(data.phone).toBe('99001122');
    expect(data.googleIdentity).toEqual({
      create: { googleSubject: 'google-sub-new', email: 'new.parent@gmail.com', pictureUrl: ticketData.picture },
    });
  });

  it('утасгүй бол татгалзана (эзний дүрэм: хэрэглэгч бүр утастай)', async () => {
    const { service, prisma } = makeService();
    await expect(service.register(dto({ googleTicket: signSignupTicket(ticketData) }))).rejects.toThrow(
      BadRequestException,
    );
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it('хуурамч/хугацаа дууссан тасалбар → BadRequest', async () => {
    const { service } = makeService();
    await expect(service.register(dto({ phone: '99001122', googleTicket: 'forged.ticket.value' }))).rejects.toThrow(
      BadRequestException,
    );
  });

  it('Google аль хэдийн холбогдсон бол Conflict', async () => {
    const { service } = makeService({ identity: true });
    await expect(
      service.register(dto({ phone: '99001122', googleTicket: signSignupTicket(ticketData) })),
    ).rejects.toThrow(ConflictException);
  });

  it('утас бүртгэлтэй бол Gmail-ээ профайлаас холбохыг зааварлана', async () => {
    const { service } = makeService({ phone: true });
    await expect(
      service.register(dto({ phone: '99001122', googleTicket: signSignupTicket(ticketData) })),
    ).rejects.toThrow(/Gmail-ээ холбоно уу/);
  });

  it('тасалбаргүй энгийн бүртгэлд GoogleIdentity үүсэхгүй', async () => {
    const { service, prisma } = makeService();
    await service.register(dto({ phone: '99001122' }));
    expect(prisma.user.create.mock.calls[0][0].data.googleIdentity).toBeUndefined();
  });
});
