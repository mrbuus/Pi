import { ParentsService } from './parents.service';
import { PrismaService } from '../prisma/prisma.service';
import { EmailOtpService } from '../notifications/email-otp.service';
import { StudentType } from '../generated/prisma/enums';
import { canAccessChapter } from '../common/access';
jest.mock('../common/access', () => ({ canAccessChapter: jest.fn() }));
describe('parent pupil authorization', () => {
  let prisma: any, otp: any, service: ParentsService;
  beforeEach(() => {
    const list = () => jest.fn(async () => []);
    prisma = {
      parentLink: {
        findUnique: jest.fn(async () => ({
          id: 'verified',
          verifiedAt: new Date(),
        })),
        findMany: list(),
      },
      user: { findUnique: jest.fn() },
      testResult: {
        findUnique: jest.fn(async () => ({
          id: 'result',
          studentId: 'child',
          student: {
            email: 'pupil@example.test',
            studentProfile: { type: StudentType.CLASSROOM },
          },
        })),
        findMany: list(),
      },
      resultAcknowledgement: { upsert: jest.fn(async () => ({ id: 'ack' })) },
      attempt: { groupBy: list(), findMany: list() },
      learningEvent: { count: jest.fn(async () => 0), findMany: list() },
      dailyHomeworkMark: { findMany: list() },
      submission: { findMany: list() },
      attendance: { findMany: list() },
      enrollment: { findMany: list() },
      classDismissal: { findMany: list() },
      lessonPacket: { findMany: list() },
      chapter: {
        findUnique: jest.fn(async () => ({
          id: 'chapter',
          freePreview: false,
          bookId: 'book',
          title: 'Topic',
        })),
      },
      theoryBlock: { findMany: list() },
    };
    otp = {
      sendOtp: jest.fn(async () => ({ maskedEmail: 'p***@example.test' })),
      verifyOtp: jest.fn(async () => true),
    };
    service = new ParentsService(
      prisma as PrismaService,
      otp as EmailOtpService,
    );
  });
  it.each([null, { id: 'pending', verifiedAt: null }])(
    'unverified/other-child denied before either OTP step',
    async (link) => {
      prisma.parentLink.findUnique.mockResolvedValue(link);
      await expect(
        service.requestAcknowledgement('parent', 'result'),
      ).rejects.toThrow();
      await expect(
        service.verifyAcknowledgement('parent', 'result', '123456'),
      ).rejects.toThrow();
      expect(otp.sendOtp).not.toHaveBeenCalled();
      expect(otp.verifyOtp).not.toHaveBeenCalled();
      expect(prisma.resultAcknowledgement.upsert).not.toHaveBeenCalled();
      expect(
        prisma.parentLink.findUnique.mock.calls[0][0].where.parentId_studentId,
      ).toEqual({ parentId: 'parent', studentId: 'child' });
    },
  );
  it('verified classroom acknowledgement binds OTP to this result', async () => {
    await service.requestAcknowledgement('parent', 'result');
    await service.verifyAcknowledgement('parent', 'result', '123456');
    expect(otp.sendOtp.mock.calls[0][0].purpose).toBe('RESULT_ACK:result');
    expect(otp.verifyOtp).toHaveBeenCalledWith(
      'parent',
      'RESULT_ACK:result',
      '123456',
    );
  });
  it('verification stage also rejects online pupil', async () => {
    prisma.testResult.findUnique.mockResolvedValue({
      studentId: 'child',
      student: { studentProfile: { type: StudentType.ONLINE } },
    });
    await expect(
      service.verifyAcknowledgement('parent', 'result', '123456'),
    ).rejects.toThrow();
    expect(otp.verifyOtp).not.toHaveBeenCalled();
  });
  it('pending links never query pupil activity, payments or results', async () => {
    prisma.parentLink.findMany.mockResolvedValue([
      {
        id: 'pending',
        studentId: 'child',
        verifiedAt: null,
        student: { id: 'child', firstName: 'Test', lastName: 'Child' },
      },
    ]);
    const links = await service.myChildren('parent');
    expect(links[0].verified).toBe(false);
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
    const select =
      prisma.parentLink.findMany.mock.calls[0][0].select.student.select;
    for (const relation of [
      'attendances',
      'testResults',
      'submissions',
      'payments',
      'studentNotes',
    ])
      expect(select).not.toHaveProperty(relation);
  });
  it('verified children select result id and own acknowledgements, no ambiguous/private note', async () => {
    prisma.parentLink.findMany.mockResolvedValue([
      {
        id: 'v',
        studentId: 'child',
        verifiedAt: new Date(),
        student: { id: 'child' },
      },
    ]);
    prisma.user.findUnique.mockResolvedValue({ id: 'child', enrollments: [] });
    await service.myChildren('parent');
    const select = prisma.user.findUnique.mock.calls[0][0].select;
    expect(select.testResults.select.id).toBe(true);
    expect(select.testResults.select.acknowledgements.where).toEqual({
      parentId: 'parent',
    });
    expect(select).not.toHaveProperty('studentNotes');
    expect(select.submissions.select).not.toHaveProperty('note');
    expect(select.dailyHomeworkMarks.select.comment).toBe(true);
  });
  it('annual history rejects unverified link before any history query', async () => {
    prisma.parentLink.findUnique.mockResolvedValue(null);
    await expect(
      service.childHistory('parent', 'other', '2026'),
    ).rejects.toThrow();
    expect(prisma.attempt.groupBy).not.toHaveBeenCalled();
    expect(prisma.submission.findMany).not.toHaveBeenCalled();
  });
  it('annual totals cover whole year, details paginate and raw metadata stays private', async () => {
    prisma.attempt.groupBy.mockResolvedValue(
      Array.from({ length: 300 }, (_, i) => ({
        occurredOn: new Date(Date.UTC(2026, 0, i + 1)),
        _count: { _all: 3 },
      })),
    );
    prisma.attempt.findMany.mockResolvedValue(
      Array.from({ length: 51 }, (_, i) => ({ id: String(i) })),
    );
    prisma.learningEvent.findMany.mockResolvedValue([
      {
        id: 'e',
        problemId: 'p',
        occurredAt: new Date(),
        meta: {
          lab: 'v1',
          kind: 'first',
          answer: '2',
          correct: false,
          staffNote: 'private',
          timing: { focusedMs: 9 },
        },
      },
    ]);
    const result = await service.childHistory('parent', 'child', '2026', '2');
    expect(result.summary.activeDays).toBe(300);
    expect(result.summary.attemptCount).toBe(900);
    expect(result.attempts.rows).toHaveLength(50);
    expect(result.attempts.hasMore).toBe(true);
    expect(prisma.attempt.findMany.mock.calls[0][0].skip).toBe(50);
    expect(prisma.attempt.groupBy.mock.calls[0][0].where.studentId).toBe(
      'child',
    );
    expect(result.learning.rows[0].evidence).not.toHaveProperty('staffNote');
    expect(result.learning.rows[0].evidence).not.toHaveProperty('timing');
  });
  it('theory uses verified child entitlement, never parent entitlement or staff bypass', async () => {
    (canAccessChapter as jest.Mock).mockResolvedValue(false);
    await expect(
      service.childTheory('parent', 'child', 'chapter'),
    ).rejects.toThrow();
    expect(canAccessChapter).toHaveBeenCalledWith(
      prisma,
      'child',
      'STUDENT',
      expect.objectContaining({ id: 'chapter' }),
    );
    expect(prisma.theoryBlock.findMany).not.toHaveBeenCalled();
  });
});
