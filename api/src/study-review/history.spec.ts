import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '../generated/prisma/client';
import { Role } from '../generated/prisma/enums';
import { StudyReviewService } from './study-review.service';
function fixture() {
  const db = {
    parentLink: { findFirst: jest.fn().mockResolvedValue(null) },
    studyReviewRun: {
      findFirst: jest.fn().mockResolvedValue(null),
      findMany: jest.fn().mockResolvedValue([]),
    },
  };
  return {
    db,
    service: new StudyReviewService(db as unknown as PrismaService),
  };
}
describe('bounded review history privacy', () => {
  it('uses UB calendar half-open boundaries and bounded minimal select, not full run keys', async () => {
    const { db, service } = fixture();
    await service.history('owner', Role.BUYER, { year: '2026', take: '20' });
    const q = (
      db.studyReviewRun.findMany.mock.calls as unknown as [
        Prisma.StudyReviewRunFindManyArgs,
      ][]
    )[0][0];
    expect(q.where).toEqual({
      userId: 'owner',
      startedAt: {
        gte: new Date('2025-12-31T16:00:00Z'),
        lt: new Date('2026-12-31T16:00:00Z'),
      },
    });
    expect(q.take).toBe(21);
    expect(JSON.stringify(q.select)).not.toMatch(
      /sourceSnapshot|gradeSnapshot|immutableFirstAnswer|correctAnswer|answerKey/,
    );
  });
  it.each([
    { year: '2026.0' },
    { year: '1999' },
    { take: '0' },
    { take: '51' },
    { take: '2.5' },
    { cursor: '../other' },
    {
      cursor: Buffer.from(
        JSON.stringify({ id: 'foreign', year: 2026 }),
      ).toString('base64url'),
      year: '2026',
    },
  ])('rejects malformed or foreign scope query %j', async (query) => {
    const { service } = fixture();
    await expect(
      service.history('owner', Role.STUDENT, query),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
  it('verified parent only, own cursor and no entitlement prerequisite', async () => {
    const { db, service } = fixture();
    await expect(
      service.childHistory('parent', 'other', Role.PARENT, {}),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(db.studyReviewRun.findMany).not.toHaveBeenCalled();
    db.parentLink.findFirst.mockResolvedValue({ id: 'verified' });
    await service.childHistory('parent', 'child', Role.PARENT, {
      year: '2026',
    });
    const parentQuery = (
      db.parentLink.findFirst.mock.calls as unknown as [
        Prisma.ParentLinkFindFirstArgs,
      ][]
    )[1][0];
    expect(parentQuery.where).toMatchObject({
      parentId: 'parent',
      studentId: 'child',
      verifiedAt: { not: null },
    });
    const runQuery = (
      db.studyReviewRun.findMany.mock.calls as unknown as [
        Prisma.StudyReviewRunFindManyArgs,
      ][]
    )[0][0];
    expect(runQuery.where).toMatchObject({ userId: 'child' });
  });
  it('preserves false first result separately from assisted correct correction and projects expiry', async () => {
    const { db, service } = fixture();
    db.studyReviewRun.findMany.mockResolvedValue([
      {
        id: 'run',
        status: 'OPEN',
        budgetMinutes: 10,
        startedAt: new Date('2026-01-01'),
        deadlineAt: new Date('2026-01-02'),
        submittedAt: null,
        items: [
          {
            firstRecordedAt: new Date(),
            immutableFirstCorrect: false,
            immutableFirstFlags: [],
            exposureBeforeFirst: false,
            responses: [{ id: 'correction' }],
          },
          {
            firstRecordedAt: null,
            immutableFirstCorrect: null,
            immutableFirstFlags: [],
            exposureBeforeFirst: false,
            responses: [],
          },
        ],
      },
    ]);
    const result = await service.history('owner', Role.STUDENT, {
      year: '2026',
    });
    expect(result.items[0]).toMatchObject({
      state: 'EXPIRED',
      evidence: {
        assigned: 2,
        answered: 1,
        firstCorrect: 0,
        independentFirstCorrect: 0,
        correctedWithAssistance: 1,
        unknown: 1,
      },
    });
  });
});
