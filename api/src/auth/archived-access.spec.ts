import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { Role } from '../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';

describe('archived student access', () => {
  it('rejects an archived student after password verification at login', async () => {
    const prisma = {
      user: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'student-test',
          role: Role.STUDENT,
          archivedAt: new Date(),
          passwordHash: bcrypt.hashSync('synthetic-password', 4),
        }),
      },
    } as unknown as PrismaService;
    const service = new AuthService(prisma, {} as JwtService);
    await expect(
      service.login({
        identifier: 'archived-test-unique',
        password: 'synthetic-password',
      }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('rejects an already issued token after the student is archived', async () => {
    const prior = process.env.JWT_SECRET;
    process.env.JWT_SECRET = 'synthetic-test-secret';
    try {
      const prisma = {
        user: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'student-test',
            role: Role.STUDENT,
            passwordChangedAt: null,
            archivedAt: new Date(),
          }),
        },
      } as unknown as PrismaService;
      const strategy = new JwtStrategy(prisma);
      await expect(
        strategy.validate({ sub: 'student-test', role: Role.STUDENT }),
      ).rejects.toThrow(UnauthorizedException);
    } finally {
      if (prior === undefined) delete process.env.JWT_SECRET;
      else process.env.JWT_SECRET = prior;
    }
  });
});
