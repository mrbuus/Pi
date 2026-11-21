import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { TestType } from '../generated/prisma/enums';
import { CreateTestDto } from './dto/create-test.dto';
import { UpdateTestDto } from './dto/update-test.dto';
import {
  DEFAULT_LEAVE_LIMIT,
  normalizeLeaveLimit,
  reachedLeaveLimit,
} from './leave-limit';

describe('leave-limit (аппаас гарах дүрэм)', () => {
  it('анхдагч нь Зөөлөн (3), зөвхөн 2-ыг Хатуу гэж хүлээн авна', () => {
    expect(DEFAULT_LEAVE_LIMIT).toBe(3);
    expect(normalizeLeaveLimit(2)).toBe(2);
    expect(normalizeLeaveLimit(3)).toBe(3);
    expect(normalizeLeaveLimit(undefined)).toBe(3);
    expect(normalizeLeaveLimit(null)).toBe(3);
    expect(normalizeLeaveLimit(1)).toBe(3);
    expect(normalizeLeaveLimit('2')).toBe(3);
  });

  it('гаралтын тоо хязгаарт хүрсэн эсэх — Хатуу 2, Зөөлөн 3', () => {
    expect(reachedLeaveLimit(null, 3)).toBe(false);
    expect(reachedLeaveLimit(0, 2)).toBe(false);
    expect(reachedLeaveLimit(1, 2)).toBe(false);
    expect(reachedLeaveLimit(2, 2)).toBe(true);
    expect(reachedLeaveLimit(2, 3)).toBe(false);
    expect(reachedLeaveLimit(3, 3)).toBe(true);
    // Хуучин мөр (утгагүй) — 3 гэж тооцно
    expect(reachedLeaveLimit(3, undefined)).toBe(true);
    expect(reachedLeaveLimit(2, undefined)).toBe(false);
  });
});

describe('Test DTO — leaveLimit', () => {
  const base = { title: 'Сорил', type: TestType.CHAPTER_EXAM };

  it('үүсгэхэд 2, 3 эсвэл огт өгөхгүйг зөвшөөрнө', async () => {
    for (const leaveLimit of [2, 3, undefined]) {
      const errors = await validate(
        plainToInstance(CreateTestDto, { ...base, leaveLimit }),
      );
      expect(errors).toHaveLength(0);
    }
  });

  it('үүсгэхэд 2, 3-аас өөр утгыг татгалзана', async () => {
    for (const leaveLimit of [0, 1, 4, 5, '2', null, 2.5]) {
      const errors = await validate(
        plainToInstance(CreateTestDto, { ...base, leaveLimit }),
      );
      expect(errors.map((e) => e.property)).toContain('leaveLimit');
    }
  });

  it('засахад 2, 3-ыг зөвшөөрч, бусдыг татгалзана', async () => {
    for (const leaveLimit of [2, 3]) {
      expect(
        await validate(plainToInstance(UpdateTestDto, { leaveLimit })),
      ).toHaveLength(0);
    }
    for (const leaveLimit of [1, 4, '3', null]) {
      const errors = await validate(
        plainToInstance(UpdateTestDto, { leaveLimit }),
      );
      expect(errors.map((e) => e.property)).toContain('leaveLimit');
    }
  });
});
