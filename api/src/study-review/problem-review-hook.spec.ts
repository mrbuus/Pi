import { StudyReviewService } from './study-review.service';

/** Давтлагын хариу буруу бол хугацаатай давталтад өгнө — хариуны бичлэг, дүн өөрчлөгдөхгүй. */
function harness(correctLetter: string) {
  const item = {
    id: 'item-1',
    problemId: 'problem-1',
    responses: [] as unknown[],
    firstRecordedAt: null,
    gradingVersion: 'v1',
    gradeSnapshot: { id: 'problem-1', format: 'CHOICE', choices: ['A', 'B', 'C', 'D', 'E'], correctAnswer: correctLetter },
  };
  const run = {
    id: 'run-1',
    status: 'OPEN',
    startedAt: new Date(Date.now() - 60_000),
    deadlineAt: new Date(Date.now() + 3_600_000),
    items: [item],
  };
  const tx = {
    $executeRaw: jest.fn(async () => 1),
    studyReviewRun: { findFirst: jest.fn(async () => run), update: jest.fn() },
    learningEvent: { findFirst: jest.fn(async () => null) },
    studyReviewResponse: { create: jest.fn(async (_args: any) => ({})) },
    studyReviewItem: { update: jest.fn(async () => ({})) },
  };
  const prisma = { $transaction: jest.fn(async (fn: (t: typeof tx) => unknown) => fn(tx)) };
  const reviews = { recordWrongInBackground: jest.fn() };
  const service = new StudyReviewService(prisma as never, reviews as never);
  const internals = service as unknown as Record<string, unknown>;
  internals.owned = jest.fn(async () => run);
  internals.officialExposure = jest.fn(async () => new Set<string>());
  internals.get = jest.fn(async () => ({ id: 'run-1' }));
  return { service, reviews, tx };
}

const body = (answer: string) => ({
  clientRequestId: '3f2a1c4e-1b2d-4c3e-8f9a-0b1c2d3e4f5a',
  answer,
  kind: 'FIRST',
});

describe('StudyReviewService.response — хугацаатай давталтын hook', () => {
  it('буруу хариулт → STUDY_REVIEW эх сурвалжтайгаар бүртгэнэ', async () => {
    const h = harness('B');
    await h.service.response('student-1', 'STUDENT' as never, 'run-1', 'item-1', body('A'));
    expect(h.tx.studyReviewResponse.create.mock.calls[0][0].data.correct).toBe(false);
    expect(h.reviews.recordWrongInBackground).toHaveBeenCalledWith([
      {
        studentId: 'student-1',
        problemId: 'problem-1',
        source: 'STUDY_REVIEW',
        occurredAt: expect.any(Date),
        sourceRefId: 'run-1',
      },
    ]);
  });

  it('зөв хариулт → давталтад бүртгэхгүй', async () => {
    const h = harness('B');
    await h.service.response('student-1', 'STUDENT' as never, 'run-1', 'item-1', body('B'));
    expect(h.tx.studyReviewResponse.create.mock.calls[0][0].data.correct).toBe(true);
    expect(h.reviews.recordWrongInBackground).not.toHaveBeenCalled();
  });
});
