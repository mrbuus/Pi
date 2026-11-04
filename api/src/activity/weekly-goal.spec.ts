import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { WeeklyGoalDto } from './weekly-goal.dto';
import { WeeklyGoalService } from './weekly-goal.service';

describe('WeeklyGoalDto', () => {
  it.each([1, 4, 7, null])('%p зөвшөөрнө', async (daysPerWeek) => {
    expect(await validate(plainToInstance(WeeklyGoalDto, { daysPerWeek }))).toHaveLength(0);
  });
  it.each([0, 8, 2.5, '3', undefined])('%p татгалзана', async (daysPerWeek) => {
    expect(await validate(plainToInstance(WeeklyGoalDto, { daysPerWeek }))).not.toHaveLength(0);
  });
});

describe('WeeklyGoalService', () => {
  const updatedAt = new Date('2026-11-04T02:00:00Z');
  function harness(row: Record<string, unknown> | null) {
    const db = {
      studyWeeklyGoal: {
        findUnique: jest.fn(async () => row),
        upsert: jest.fn(async ({ create }: { create: { daysPerWeek: number } }) => ({
          daysPerWeek: create.daysPerWeek,
          updatedAt,
        })),
        updateMany: jest.fn(async () => ({ count: 1 })),
      },
    };
    return { db, service: new WeeklyGoalService(db as never) };
  }

  it('зорилгогүй бол null', async () => {
    await expect(harness(null).service.get('s1')).resolves.toEqual({ daysPerWeek: null, updatedAt: null });
  });

  it('зөөлөн устгасан зорилго null гэж харагдана', async () => {
    const h = harness({ daysPerWeek: 4, deletedAt: updatedAt, updatedAt });
    await expect(h.service.get('s1')).resolves.toEqual({ daysPerWeek: null, updatedAt });
  });

  it('тавих: өөрийн studentId-аар upsert, устгасныг сэргээнэ', async () => {
    const h = harness(null);
    await expect(h.service.set('s1', 5)).resolves.toEqual({ daysPerWeek: 5, updatedAt });
    expect(h.db.studyWeeklyGoal.upsert).toHaveBeenCalledWith({
      where: { studentId: 's1' },
      create: { studentId: 's1', daysPerWeek: 5 },
      update: { daysPerWeek: 5, deletedAt: null },
      select: { daysPerWeek: true, updatedAt: true },
    });
  });

  it('арилгах нь зөөлөн (deletedAt), мөр устгахгүй', async () => {
    const h = harness({ daysPerWeek: 4, deletedAt: updatedAt, updatedAt });
    await expect(h.service.set('s1', null)).resolves.toMatchObject({ daysPerWeek: null });
    expect(h.db.studyWeeklyGoal.updateMany).toHaveBeenCalledWith({
      where: { studentId: 's1', deletedAt: null },
      data: { deletedAt: expect.any(Date) },
    });
    expect(h.db.studyWeeklyGoal).not.toHaveProperty('delete');
  });
});
