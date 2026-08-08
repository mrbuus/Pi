import { EmailOtpService } from './email-otp.service';
import { EmailService } from './email.service';
import { PrismaService } from '../prisma/prisma.service';
import { generateCode, hashCode } from '../auth/password-reset.util';

const RESET_TOKEN_SECRET = process.env.RESET_TOKEN_SECRET || 'fallback-secret';

describe('EmailOtpService', () => {
  let service: EmailOtpService;
  let emailService: EmailService;
  let prisma: PrismaService;

  beforeEach(() => {
    const mockEmailService = {
      isConfigured: jest.fn(() => true),
      sendEmail: jest.fn(),
    };

    const mockPrismaService = {
      emailOtp: {
        create: jest.fn(),
        findFirst: jest.fn(),
        update: jest.fn(),
      },
    };

    service = new EmailOtpService(
      mockPrismaService as any,
      mockEmailService as any,
    );
    emailService = mockEmailService as any;
    prisma = mockPrismaService as any;
  });

  it('сайн тодорхойлогдсон байх ёстой', () => {
    expect(service).toBeDefined();
  });

  describe('sendOtp', () => {
    it('имэйл үйлчилгээ идэвхжээгүй бол алдаа өгнө', async () => {
      jest.spyOn(emailService, 'isConfigured').mockReturnValue(false);

      await expect(
        service.sendOtp({
          userId: 'user-1',
          email: 'test@example.com',
          purpose: 'RESULT_ACK',
        }),
      ).rejects.toThrow('Имэйл үйлчилгээ идэвхжээгүй');
    });

    it('оруулах код дээр OTP үүсгэнэ ба имэйл илгээнэ', async () => {
      jest.spyOn(emailService, 'isConfigured').mockReturnValue(true);
      jest.spyOn(emailService, 'sendEmail').mockResolvedValue(undefined);
      jest.spyOn(prisma.emailOtp, 'create').mockResolvedValue({
        id: 'otp-1',
        userId: 'user-1',
        purpose: 'RESULT_ACK',
        codeHash: '...',
        expiresAt: new Date(),
        consumedAt: null,
        attempts: 0,
        createdAt: new Date(),
      } as any);

      await service.sendOtp({
        userId: 'user-1',
        email: 'parent@example.com',
        purpose: 'RESULT_ACK',
      });

      expect(prisma.emailOtp.create).toHaveBeenCalled();
      expect(emailService.sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'parent@example.com',
          subject: expect.stringContaining('нэг удаагийн код'),
        }),
      );
    });
  });

  describe('verifyOtp', () => {
    it('хүчингүй кодыг оролдлогын тоолуур нэмэх', async () => {
      const otp = {
        id: 'otp-1',
        codeHash: hashCode('123456', RESET_TOKEN_SECRET),
        expiresAt: new Date(Date.now() + 600000),
        consumedAt: null,
        attempts: 0,
        userId: 'user-1',
        purpose: 'RESULT_ACK',
        createdAt: new Date(),
      };

      jest
        .spyOn(prisma.emailOtp, 'findFirst')
        .mockResolvedValueOnce(otp);
      jest.spyOn(prisma.emailOtp, 'update').mockResolvedValueOnce(otp);

      await expect(
        service.verifyOtp('user-1', 'RESULT_ACK', '999999'),
      ).rejects.toThrow('Код зөв биш');

      expect(prisma.emailOtp.update).toHaveBeenCalledWith({
        where: { id: 'otp-1' },
        data: { attempts: 1 },
      });
    });

    it('зөв кодыг ашигласан гэж тэмдэглэнэ', async () => {
      const code = '123456';
      const otp = {
        id: 'otp-1',
        codeHash: hashCode(code, RESET_TOKEN_SECRET),
        expiresAt: new Date(Date.now() + 600000),
        consumedAt: null,
        attempts: 0,
        userId: 'user-1',
        purpose: 'RESULT_ACK',
        createdAt: new Date(),
      };

      jest
        .spyOn(prisma.emailOtp, 'findFirst')
        .mockResolvedValueOnce(otp);
      jest.spyOn(prisma.emailOtp, 'update').mockResolvedValueOnce(otp);

      const result = await service.verifyOtp('user-1', 'RESULT_ACK', code);

      expect(result.success).toBe(true);
      expect(prisma.emailOtp.update).toHaveBeenCalledWith({
        where: { id: 'otp-1' },
        data: { consumedAt: expect.any(Date) },
      });
    });

    it('хүчингүй кодыг буцна', async () => {
      jest.spyOn(prisma.emailOtp, 'findFirst').mockResolvedValueOnce(null);

      await expect(
        service.verifyOtp('user-1', 'RESULT_ACK', '123456'),
      ).rejects.toThrow('Код явахгүй');
    });
  });
});
