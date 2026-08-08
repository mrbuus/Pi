import { Test, TestingModule } from '@nestjs/testing';
import { InsightsService } from './insights.service';
import { PrismaService } from '../prisma/prisma.service';

describe('InsightsService', () => {
  let service: InsightsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InsightsService,
        {
          provide: PrismaService,
          useValue: {
            $queryRawUnsafe: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<InsightsService>(InsightsService);
  });

  describe('calculateDiscrimination', () => {
    it('should return 0 for empty arrays', () => {
      const result = service.calculateDiscrimination([], []);
      expect(result).toBe(0);
    });

    it('should return 0 for identical scores (no variation)', () => {
      const correctScores = [5, 5, 5];
      const allScores = [5, 5, 5];
      const result = service.calculateDiscrimination(correctScores, allScores);
      expect(result).toBe(0);
    });

    it('should return positive value when correct students score higher', () => {
      // Сайн сурагчид бодлогод зөв, муу сурагчид буруу
      const correctScores = [9, 8, 10]; // сайн сурагчдын нийт оноо
      const allScores = [9, 8, 10, 3, 2, 4]; // бүхэл ангийн оноо
      const result = service.calculateDiscrimination(correctScores, allScores);
      expect(result).toBeGreaterThan(0);
    });

    it('should return negative value when correct students score lower (defective)', () => {
      // Эвдэрсэн бодлого: сайн сурагч буруу, муу сурагч зөв
      const correctScores = [2, 1, 3]; // зөв хариулсан сурагчдын нийт оноо (үнэнлэгүй сайн)
      const allScores = [9, 8, 10, 2, 1, 3]; // бүхэл ангийн оноо
      const result = service.calculateDiscrimination(correctScores, allScores);
      expect(result).toBeLessThan(0);
    });

    it('should calculate discrimination correctly for normal distribution', () => {
      // Заримдаа сайн сурагчдын дундаж оноо
      const correctScores = [7, 8, 9];
      const allScores = [3, 4, 5, 7, 8, 9];
      const result = service.calculateDiscrimination(correctScores, allScores);
      // mean(correct) = 8, mean(all) = 6, should be positive
      expect(result).toBeGreaterThan(0);
      expect(typeof result).toBe('number');
    });
  });

  describe('getMLExportCount', () => {
    it('should return total attempt count', async () => {
      const mockPrisma = service['prisma'];
      (mockPrisma.$queryRawUnsafe as jest.Mock).mockResolvedValue([
        { count: 2200000 },
      ]);

      const result = await service.getMLExportCount();
      expect(result).toBe(2200000);
    });

    it('should return 0 for empty database', async () => {
      const mockPrisma = service['prisma'];
      (mockPrisma.$queryRawUnsafe as jest.Mock).mockResolvedValue([
        { count: 0 },
      ]);

      const result = await service.getMLExportCount();
      expect(result).toBe(0);
    });
  });

  describe('getMLExportData', () => {
    it('should enforce limit constraints', async () => {
      const mockPrisma = service['prisma'];
      (mockPrisma.$queryRawUnsafe as jest.Mock).mockResolvedValue([]);

      // Limit too high should be capped at 50000
      await service.getMLExportData(0, 100000);
      const callArgs = (mockPrisma.$queryRawUnsafe as jest.Mock).mock
        .calls[0];
      expect(callArgs[2]).toBeLessThanOrEqual(50000);
    });

    it('should hash studentId consistently', async () => {
      const mockPrisma = service['prisma'];
      (mockPrisma.$queryRawUnsafe as jest.Mock).mockResolvedValue([
        {
          studentId: 'student-1',
          problemId: 'prob-1',
          problemToken: '100-01-01',
          topicId: 'topic-1',
          correct: true,
          givenAnswer: 'A',
          timeSpentSec: 60,
          occurredOn: new Date('2026-08-08'),
        },
      ]);

      const result1 = await service.getMLExportData(0, 100);
      const result2 = await service.getMLExportData(0, 100);

      expect(result1[0].studentIdHash).toBe(result2[0].studentIdHash);
      expect(result1[0].studentIdHash).toMatch(/^[a-f0-9]{16}$/);
    });

    it('should not expose student names or phone', async () => {
      const mockPrisma = service['prisma'];
      (mockPrisma.$queryRawUnsafe as jest.Mock).mockResolvedValue([
        {
          studentId: 'student-1',
          problemId: 'prob-1',
          problemToken: '100-01-01',
          topicId: 'topic-1',
          correct: true,
          givenAnswer: 'A',
          timeSpentSec: 60,
          occurredOn: new Date('2026-08-08'),
        },
      ]);

      const result = await service.getMLExportData(0, 100);
      const keys = Object.keys(result[0]);

      expect(keys).not.toContain('studentName');
      expect(keys).not.toContain('phone');
      expect(keys).not.toContain('studentId');
      expect(keys).toContain('studentIdHash');
    });
  });
});
