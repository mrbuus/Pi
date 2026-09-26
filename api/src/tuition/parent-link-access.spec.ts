import { PrismaService } from '../prisma/prisma.service';
import { TuitionService } from './tuition.service';

describe('verified parent-link lookup', () => {
  it('queries only a verified link for the requested parent and child', async () => {
    const findFirst = jest.fn().mockResolvedValue({ id: 'link-1' });
    const service = new TuitionService(
      { parentLink: { findFirst } } as unknown as PrismaService,
      {} as never,
    );
    await expect(
      service.hasVerifiedParentLink('parent-1', 'student-1'),
    ).resolves.toBe(true);
    expect(findFirst).toHaveBeenCalledWith({
      where: {
        parentId: 'parent-1',
        studentId: 'student-1',
        verifiedAt: { not: null },
      },
      select: { id: true },
    });
  });

  it('returns false for an unverified link or no link', async () => {
    const findFirst = jest.fn().mockResolvedValue(null);
    const service = new TuitionService(
      { parentLink: { findFirst } } as unknown as PrismaService,
      {} as never,
    );
    await expect(
      service.hasVerifiedParentLink('parent-1', 'student-1'),
    ).resolves.toBe(false);
  });
});
