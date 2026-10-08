import { ForbiddenException } from '@nestjs/common';
import { Role } from '../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import { StudyReviewService } from './study-review.service';
import { officialProblemIds } from './official-exposure';

describe('official exam exposure boundary', () => {
  it('unions issued order and draft IDs conservatively, never draft answer values', () => {
    expect(
      officialProblemIds({
        problemOrder: ['p', 'p', 42],
        draftAnswers: { q: 'answer-is-not-id' },
      }),
    ).toEqual(['p', 'q']);
    expect(
      officialProblemIds({ problemOrder: null, draftAnswers: [] }),
    ).toEqual([]);
  });
  it('excludes old issued and draft-only problems from candidates', async () => {
    const db = {
      problem: {
        findMany: jest.fn().mockResolvedValue([{ id: 'p' }, { id: 'q' }]),
      },
      attempt: { findMany: jest.fn().mockResolvedValue([]) },
      learningEvent: { findMany: jest.fn().mockResolvedValue([]) },
      studyReviewItem: { findMany: jest.fn().mockResolvedValue([]) },
      testAttemptSession: {
        findMany: jest
          .fn()
          .mockResolvedValue([
            { problemOrder: ['p'], draftAnswers: { q: '0' } },
          ]),
      },
    };
    const service = new StudyReviewService(db as unknown as PrismaService);
    const candidates = await (
      service as unknown as {
        candidates: (u: string, c: string[]) => Promise<unknown[]>;
      }
    ).candidates('u', ['c']);
    expect(candidates).toEqual([]);
  });
  it('closed key and solution are hidden only for live overlap, without changing first evidence', async () => {
    const db = {
      testAttemptSession: {
        findMany: jest
          .fn()
          .mockResolvedValue([{ problemOrder: ['p'], draftAnswers: {} }]),
      },
    };
    const service = new StudyReviewService(db as unknown as PrismaService);
    const run = {
      userId: 'u',
      status: 'SUBMITTED',
      deadlineAt: new Date(),
      items: [
        {
          id: 'i',
          problemId: 'p',
          responses: [],
          gradeSnapshot: {
            correctAnswer: 'PRIVATE',
            solution: 'PRIVATE-SOLUTION',
          },
          immutableFirstCorrect: false,
        },
      ],
    };
    const view = await (
      service as unknown as {
        view: (r: unknown) => Promise<{
          items: Record<string, unknown>[];
          evidence: { firstCorrect: number };
        }>;
      }
    ).view(run);
    expect(view.items[0]).not.toHaveProperty('answerKey');
    expect(view.items[0]).not.toHaveProperty('solution');
    expect(view.evidence.firstCorrect).toBe(0);
    expect(db.testAttemptSession.findMany).toHaveBeenCalledWith({
      where: {
        studentId: 'u',
        status: 'IN_PROGRESS',
        OR: [
          { deadlineAt: null },
          { deadlineAt: { gt: expect.any(Date) as Date } },
        ],
      },
      select: { problemOrder: true, draftAnswers: true },
    });
    db.testAttemptSession.findMany.mockResolvedValue([]);
    const after = await (
      service as unknown as {
        view: (r: unknown) => Promise<{ items: Record<string, unknown>[] }>;
      }
    ).view(run);
    expect(after.items[0].solution).toBe('PRIVATE-SOLUTION');
  });
  it.each(['FIRST', 'CORRECTION'])(
    'rejects live %s inside transaction before any response write',
    async (kind) => {
      const run = {
        id: 'run',
        items: [
          {
            id: 'item',
            problemId: 'p',
            responses: [],
            firstRecordedAt: new Date(),
          },
        ],
      };
      const tx = {
        $executeRaw: jest.fn(),
        studyReviewRun: { findFirst: jest.fn().mockResolvedValue(run) },
        testAttemptSession: {
          findMany: jest
            .fn()
            .mockResolvedValue([{ problemOrder: ['p'], draftAnswers: {} }]),
        },
        studyReviewResponse: { create: jest.fn() },
        studyReviewItem: { update: jest.fn() },
      };
      const db = {
        $transaction: jest.fn((callback: (t: typeof tx) => unknown) =>
          Promise.resolve(callback(tx)),
        ),
      };
      const service = new StudyReviewService(db as unknown as PrismaService);
      (service as unknown as { owned: () => Promise<unknown> }).owned = () =>
        Promise.resolve(run);
      await expect(
        service.response('u', Role.STUDENT, 'run', 'item', {
          clientRequestId: '00000000-0000-4000-8000-000000000000',
          kind,
          answer: '2',
          flags: [],
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(tx.studyReviewResponse.create).not.toHaveBeenCalled();
      expect(tx.studyReviewItem.update).not.toHaveBeenCalled();
    },
  );
});
