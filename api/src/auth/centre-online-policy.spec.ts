import { BadRequestException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { PRIVACY_VERSION } from './dto/consent.dto';
import { RegisterDto } from './dto/register.dto';
import { centreOnlineClassEnabled } from './centre-online-policy';
import { StudentType } from '../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import { EnrollmentWindowsService } from '../enrollment-windows/enrollment-windows.service';
import { AuditService } from '../audit/audit.service';

describe('new centre-led online enrolment policy', () => {
  const prior = process.env.CENTRE_ONLINE_CLASS_ENABLED;
  afterEach(() => {
    if (prior === undefined) delete process.env.CENTRE_ONLINE_CLASS_ENABLED;
    else process.env.CENTRE_ONLINE_CLASS_ENABLED = prior;
  });
  const dto = {
    acceptTerms: true,
    privacyVersion: PRIVACY_VERSION,
    isMinor: false,
    firstName: 'Synthetic',
    lastName: 'Policy',
    phone: '90009999',
    studentType: StudentType.ONLINE,
  } satisfies RegisterDto;
  it.each([undefined, 'false', 'TRUE', '1'])(
    'closed config %s prevents any user write',
    async (value) => {
      if (value === undefined) delete process.env.CENTRE_ONLINE_CLASS_ENABLED;
      else process.env.CENTRE_ONLINE_CLASS_ENABLED = value;
      const user = { findUnique: jest.fn(), create: jest.fn() };
      const service = new AuthService(
        { user } as unknown as PrismaService,
        {} as JwtService,
      );
      await expect(service.register(dto)).rejects.toThrow(BadRequestException);
      expect(user.findUnique).not.toHaveBeenCalled();
      expect(user.create).not.toHaveBeenCalled();
    },
  );
  it('does not close independent buyer registration', async () => {
    delete process.env.CENTRE_ONLINE_CLASS_ENABLED;
    const user = {
      findUnique: jest.fn().mockResolvedValue({ id: 'existing-synthetic' }),
    };
    const service = new AuthService(
      { user } as unknown as PrismaService,
      {} as JwtService,
    );
    await expect(
      service.register({ ...dto, studentType: undefined }),
    ).rejects.toThrow(ConflictException);
    expect(user.findUnique).toHaveBeenCalled();
  });
  it('an explicit future opt-in still runs the normal checks', async () => {
    process.env.CENTRE_ONLINE_CLASS_ENABLED = 'true';
    expect(centreOnlineClassEnabled()).toBe(true);
    const user = {
      findUnique: jest.fn().mockResolvedValue({ id: 'existing-synthetic' }),
    };
    const service = new AuthService(
      { user } as unknown as PrismaService,
      {} as JwtService,
    );
    await expect(service.register(dto)).rejects.toThrow(ConflictException);
  });
  it('public metadata signals closure without changing stored availability', async () => {
    delete process.env.CENTRE_ONLINE_CLASS_ENABLED;
    const window = {
      subject: 'MATH',
      availability: 'BOTH',
      status: 'OPEN',
      note: null,
    };
    const service = new EnrollmentWindowsService(
      {
        enrollmentWindow: {
          findMany: jest.fn().mockResolvedValue([window]),
        },
      } as unknown as PrismaService,
      {} as AuditService,
    );
    await expect(service.findAll()).resolves.toEqual([
      { ...window, centreOnlineClassEnabled: false },
    ]);
    expect(window.availability).toBe('BOTH');
  });
});
