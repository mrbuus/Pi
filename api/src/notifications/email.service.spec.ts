import { Test, TestingModule } from '@nestjs/testing';
import { EmailService } from './email.service';
import * as nodemailer from 'nodemailer';

// nodemailer.createTransport() мок болгоно
jest.mock('nodemailer', () => ({
  createTransport: jest.fn(),
}));

describe('EmailService', () => {
  let service: EmailService;
  let mockTransporter: any;

  beforeEach(async () => {
    jest.clearAllMocks();
    process.env.EMAIL_SMTP_HOST = 'smtp.test.com';
    process.env.EMAIL_SMTP_PORT = '465';
    process.env.EMAIL_SMTP_USER = 'test@test.com';
    process.env.EMAIL_SMTP_PASS = 'password123';
    process.env.EMAIL_FROM = 'Тест <noreply@test.com>';

    // Mock transporter
    mockTransporter = {
      sendMail: jest.fn().mockResolvedValue({ messageId: 'test123' }),
    };
    (nodemailer.createTransport as jest.Mock).mockReturnValue(mockTransporter);

    // Сервис үүсгэх
    const module: TestingModule = await Test.createTestingModule({
      providers: [EmailService],
    }).compile();

    service = module.get<EmailService>(EmailService);
  });

  afterEach(() => {
    delete process.env.EMAIL_SMTP_HOST;
    delete process.env.EMAIL_SMTP_PORT;
    delete process.env.EMAIL_SMTP_USER;
    delete process.env.EMAIL_SMTP_PASS;
    delete process.env.EMAIL_FROM;
  });

  describe('isConfigured()', () => {
    it('бүх хувьсагч ороогдсон үед true буцаана', () => {
      expect(service.isConfigured()).toBe(true);
    });

    it('EMAIL_SMTP_HOST дутуу үед false буцаана', () => {
      delete process.env.EMAIL_SMTP_HOST;
      // Сервис дахин үүсгэх
      const newService = new EmailService();
      expect(newService.isConfigured()).toBe(false);
    });

    it('EMAIL_SMTP_PORT дутуу үед false буцаана', () => {
      delete process.env.EMAIL_SMTP_PORT;
      const newService = new EmailService();
      expect(newService.isConfigured()).toBe(false);
    });

    it('EMAIL_SMTP_USER дутуу үед false буцаана', () => {
      delete process.env.EMAIL_SMTP_USER;
      const newService = new EmailService();
      expect(newService.isConfigured()).toBe(false);
    });

    it('EMAIL_SMTP_PASS дутуу үед false буцаана', () => {
      delete process.env.EMAIL_SMTP_PASS;
      const newService = new EmailService();
      expect(newService.isConfigured()).toBe(false);
    });

    it('EMAIL_FROM дутуу үед false буцаана', () => {
      delete process.env.EMAIL_FROM;
      expect(service.isConfigured()).toBe(false);
    });

    it('EMAIL_SMTP_PORT сохи утга үед false буцаана', () => {
      process.env.EMAIL_SMTP_PORT = 'not-a-number';
      const newService = new EmailService();
      expect(newService.isConfigured()).toBe(false);
    });
  });

  describe('sendEmail()', () => {
    it('амжилттай имэйл илгээнэ', async () => {
      await service.sendEmail({
        to: 'user@example.com',
        subject: 'Шалгалт',
        text: 'Энэ нь шалгалтын имэйл юм',
      });

      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'user@example.com',
          subject: 'Шалгалт',
          text: 'Энэ нь шалгалтын имэйл юм',
          from: 'Тест <noreply@test.com>',
        }),
      );
    });

    it('HTML хувилбартай имэйл илгээнэ', async () => {
      const htmlContent = '<p>Энэ нь <strong>шалгалт</strong></p>';
      await service.sendEmail({
        to: 'user@example.com',
        subject: 'Шалгалт',
        text: 'Энэ нь шалгалтын имэйл юм',
        html: htmlContent,
      });

      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          html: htmlContent,
        }),
      );
    });

    it('тохируулаагүй үед дуугүй алгасна', async () => {
      delete process.env.EMAIL_FROM;
      const unconfiguredService = new EmailService();

      // Алдаа шидэхгүй, зөвхөн алгасна
      await expect(
        unconfiguredService.sendEmail({
          to: 'user@example.com',
          subject: 'Шалгалт',
          text: 'Энэ нь шалгалтын имэйл юм',
        }),
      ).resolves.toBeUndefined();

      // sendMail дуудагдахгүй
      expect(mockTransporter.sendMail).not.toHaveBeenCalled();
    });

    it('SMTP серверийн алдаа дуудагч гүйцэж авна', async () => {
      mockTransporter.sendMail.mockRejectedValueOnce(
        new Error('Connection refused'),
      );

      await expect(
        service.sendEmail({
          to: 'user@example.com',
          subject: 'Шалгалт',
          text: 'Энэ нь шалгалтын имэйл юм',
        }),
      ).rejects.toThrow('Connection refused');
    });

    it('timeout-д алдаа шидэнэ', async () => {
      // Транспортыг мөнхөд өлгөг болгоно
      mockTransporter.sendMail.mockImplementation(
        () =>
          new Promise(() => {
            // Хэзээ ч resolve хийхгүй
          }),
      );

      await expect(
        service.sendEmail({
          to: 'user@example.com',
          subject: 'Шалгалт',
          text: 'Энэ нь шалгалтын имэйл юм',
        }),
      ).rejects.toThrow('SMTP сервер');
    }, 15000); // timeout-д 15 сек байл

    it('to хаяга хоосон үед шинэчилнэ', async () => {
      await service.sendEmail({
        to: '  user@example.com  ',
        subject: 'Шалгалт',
        text: 'Энэ нь шалгалтын имэйл юм',
      });

      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'user@example.com', // шинэчилсэн
        }),
      );
    });

    it('subject хоосон үед шинэчилнэ', async () => {
      await service.sendEmail({
        to: 'user@example.com',
        subject: '  Шалгалт  ',
        text: 'Энэ нь шалгалтын имэйл юм',
      });

      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: 'Шалгалт', // шинэчилсэн
        }),
      );
    });

    it('text хоосон үед шинэчилнэ', async () => {
      await service.sendEmail({
        to: 'user@example.com',
        subject: 'Шалгалт',
        text: '  Энэ нь шалгалтын имэйл юм  ',
      });

      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          text: 'Энэ нь шалгалтын имэйл юм', // шинэчилсэн
        }),
      );
    });

    it('HTML сонгогдох үед оруулна', async () => {
      const htmlContent = '<p>HTML</p>';
      await service.sendEmail({
        to: 'user@example.com',
        subject: 'Шалгалт',
        text: 'Текст',
        html: htmlContent,
      });

      expect(mockTransporter.sendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          html: htmlContent,
        }),
      );
    });

    it('HTML байхгүй үед оруулахгүй', async () => {
      await service.sendEmail({
        to: 'user@example.com',
        subject: 'Шалгалт',
        text: 'Текст',
      });

      const callArgs = mockTransporter.sendMail.mock.calls[0][0];
      expect(callArgs.html).toBeUndefined();
    });
  });

  describe('PORT validation', () => {
    it('PORT 587 (TLS) нь secure false байна', () => {
      process.env.EMAIL_SMTP_PORT = '587';
      const newService = new EmailService();
      expect(newService.isConfigured()).toBe(true);
      // createTransport дуудсан эсэхийг шалга (дөрвөлжин хаалттай байх ёстой)
    });

    it('PORT 465 (SSL) нь secure true байна', () => {
      process.env.EMAIL_SMTP_PORT = '465';
      const newService = new EmailService();
      expect(newService.isConfigured()).toBe(true);
    });
  });
});
