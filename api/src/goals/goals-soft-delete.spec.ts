import { NotFoundException } from '@nestjs/common';
import { GoalsService } from './goals.service';

/** Эзний хатуу дүрэм (2026-10-23): устгах = deletedAt, мөр үлдэнэ. */
function setup(goal: Record<string, unknown> | null) {
  const db = {
    studentGoal: {
      findUnique: jest.fn().mockResolvedValue(goal),
      findMany: jest.fn().mockResolvedValue([]),
      update: jest.fn().mockResolvedValue({}),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
  };
  return { db, service: new GoalsService(db as never) };
}

describe('Сурагчийн зорилго — зөөлөн устгал', () => {
  it('remove нь deletedAt тавина, hard delete хийхгүй', async () => {
    const { db, service } = setup({ id: 'g1', studentId: 's1', deletedAt: null });
    await expect(service.remove('g1', 's1')).resolves.toEqual({ ok: true });
    expect(db.studentGoal.delete).not.toHaveBeenCalled();
    expect(db.studentGoal.deleteMany).not.toHaveBeenCalled();
    expect(db.studentGoal.update).toHaveBeenCalledWith({
      where: { id: 'g1' },
      data: { deletedAt: expect.any(Date) },
    });
  });

  it('жагсаалт deletedAt: null-оор шүүнэ', async () => {
    const { db, service } = setup(null);
    await service.findAllForStudent('s1');
    expect(db.studentGoal.findMany.mock.calls[0][0].where).toEqual({ studentId: 's1', deletedAt: null });
  });

  it('устгасан зорилгыг засах/дахин устгах — 404', async () => {
    const { db, service } = setup({ id: 'g1', studentId: 's1', deletedAt: new Date() });
    await expect(service.update('g1', 's1', { title: 'x' } as never)).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.remove('g1', 's1')).rejects.toBeInstanceOf(NotFoundException);
    expect(db.studentGoal.update).not.toHaveBeenCalled();
  });
});
