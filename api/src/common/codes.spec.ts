import { BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  generateStudentCode,
  generateTeacherCode,
  resolveUniqueUsername,
} from './codes';

describe('Code Generation (New Format)', () => {
  let mockPrisma: PrismaService;
  let mockFindMany: jest.Mock;
  let mockFindUnique: jest.Mock;

  beforeEach(() => {
    mockFindMany = jest.fn();
    mockFindUnique = jest.fn();
    mockPrisma = {
      user: {
        findMany: mockFindMany,
        findUnique: mockFindUnique,
      },
    } as unknown as PrismaService;
  });

  describe('generateStudentCode', () => {
    it('should generate code with branch letter B', async () => {
      mockFindMany.mockResolvedValue([]);
      mockFindUnique.mockResolvedValue(null);

      const code = await generateStudentCode(mockPrisma, {
        branch: 'Баруун 4',
        grade: 10,
        registeredAt: new Date('2027-05-15'),
      });

      expect(code).toMatch(/^B27/);
      expect(code).toMatch(/10/);
    });

    it('should generate code with branch letter Z', async () => {
      mockFindMany.mockResolvedValue([]);
      mockFindUnique.mockResolvedValue(null);

      const code = await generateStudentCode(mockPrisma, {
        branch: 'Зүүн 4',
        grade: 11,
        registeredAt: new Date('2027-05-15'),
      });

      expect(code).toMatch(/^Z27/);
      expect(code).toMatch(/11/);
    });

    it('should generate code with branch letter O for null', async () => {
      mockFindMany.mockResolvedValue([]);
      mockFindUnique.mockResolvedValue(null);

      const code = await generateStudentCode(mockPrisma, {
        branch: null,
        grade: 9,
        registeredAt: new Date('2027-05-15'),
      });

      expect(code).toMatch(/^O27/);
      expect(code).toMatch(/09/);
    });

    it('should default to grade 12', async () => {
      mockFindMany.mockResolvedValue([]);
      mockFindUnique.mockResolvedValue(null);

      const code = await generateStudentCode(mockPrisma, {
        branch: 'Баруун 4',
        registeredAt: new Date('2027-05-15'),
      });

      expect(code).toMatch(/12/);
    });

    it('should start sequence at 0001', async () => {
      mockFindMany.mockResolvedValue([]);
      mockFindUnique.mockResolvedValue(null);

      const code = await generateStudentCode(mockPrisma, {
        branch: 'Баруун 4',
        grade: 12,
        registeredAt: new Date('2027-05-15'),
      });

      expect(code).toMatch(/0001$/);
    });

    it('should format sequence correctly', async () => {
      mockFindMany.mockResolvedValue([
        { studentCode: 'B27120005' },
      ]);
      mockFindUnique.mockResolvedValue(null);

      const code = await generateStudentCode(mockPrisma, {
        branch: 'Баруун 4',
        grade: 12,
        registeredAt: new Date('2027-05-15'),
      });

      // Should be 0006 formatted
      expect(code).toMatch(/0006$/);
    });

    it('should handle year conversion to 2-digit format', async () => {
      mockFindMany.mockResolvedValue([]);
      mockFindUnique.mockResolvedValue(null);

      const code2026 = await generateStudentCode(mockPrisma, {
        branch: 'Баруун 4',
        grade: 12,
        registeredAt: new Date('2026-05-15'),
      });

      expect(code2026).toMatch(/^B26/);
    });

    it('should retry on duplicate', async () => {
      mockFindMany.mockResolvedValue([
        { studentCode: 'B27120001' },
      ]);
      mockFindUnique
        .mockResolvedValueOnce({ id: 'exists' })
        .mockResolvedValueOnce(null);

      const code = await generateStudentCode(mockPrisma, {
        branch: 'Баруун 4',
        grade: 12,
        registeredAt: new Date('2027-05-15'),
      });

      expect(code).toBe('B27120003');
      expect(mockFindUnique).toHaveBeenCalledTimes(2);
    });

    it('should throw on MAX_RETRIES exceeded', async () => {
      mockFindMany.mockResolvedValue([
        { studentCode: 'B27120001' },
      ]);
      mockFindUnique.mockResolvedValue({ id: 'always-exists' });

      await expect(
        generateStudentCode(mockPrisma, {
          branch: 'Баруун 4',
          grade: 12,
          registeredAt: new Date('2027-05-15'),
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('generateTeacherCode', () => {
    it('should generate teacher code with A prefix', async () => {
      mockFindMany.mockResolvedValue([]);
      mockFindUnique.mockResolvedValue(null);

      const code = await generateTeacherCode(mockPrisma, {
        registeredAt: new Date('2027-05-15'),
      });

      expect(code).toMatch(/^A27/);
      expect(code).toMatch(/12/); // Teachers always 12
      expect(code).toMatch(/0001$/);
    });

    it('should throw on sequence overflow for teachers', async () => {
      mockFindMany.mockResolvedValue([
        { teacherCode: 'A27129999' },
      ]);

      await expect(
        generateTeacherCode(mockPrisma, {
          registeredAt: new Date('2027-05-15'),
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('resolveUniqueUsername', () => {
    it('should return lastname.firstname', async () => {
      mockPrisma.user.findUnique = jest.fn().mockResolvedValue(null);

      const username = await resolveUniqueUsername(
        mockPrisma,
        'Батор',
        'Төөрөрт',
      );

      expect(username).toBe('Төөрөрт.Батор');
    });

    it('should add number on conflict', async () => {
      mockPrisma.user.findUnique = jest
        .fn()
        .mockResolvedValueOnce({ id: 'exists' })
        .mockResolvedValueOnce({ id: 'exists' })
        .mockResolvedValueOnce(null);

      const username = await resolveUniqueUsername(
        mockPrisma,
        'Батор',
        'Төөрөрт',
      );

      expect(username).toBe('Төөрөрт.Батор3');
    });

    it('should use desired username', async () => {
      mockPrisma.user.findUnique = jest.fn().mockResolvedValue(null);

      const username = await resolveUniqueUsername(
        mockPrisma,
        'Батор',
        'Төөрөрт',
        'myname',
      );

      expect(username).toBe('myname');
    });
  });
});
