import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
export function rankScores(
  own: { totalScore: number; maxScore: number },
  scores: { totalScore: number; maxScore: number }[],
) {
  const valid = scores.filter(
    (s) =>
      Number.isFinite(s.totalScore) &&
      Number.isFinite(s.maxScore) &&
      s.maxScore > 0,
  );
  if (
    own.maxScore <= 0 ||
    !Number.isFinite(own.maxScore) ||
    !Number.isFinite(own.totalScore)
  )
    return { rank: null, participants: valid.length, tied: 0 };
  const value = own.totalScore / own.maxScore;
  return {
    rank:
      1 + valid.filter((s) => s.totalScore / s.maxScore > value + 1e-9).length,
    participants: valid.length,
    tied: valid.filter(
      (s) => Math.abs(s.totalScore / s.maxScore - value) <= 1e-9,
    ).length,
  };
}
@Injectable()
export class RankingService {
  constructor(private readonly prisma: PrismaService) {}
  async ownRanking(testId: string, studentId: string) {
    const own = await this.prisma.testResult.findFirst({
      where: {
        testId,
        studentId,
        source: { in: ['ONLINE_TEST', 'CHAPTER_EXAM', 'OMR_IMPORT'] },
        test: { deletedAt: null, isDraft: false },
      },
      select: {
        totalScore: true,
        maxScore: true,
        source: true,
        test: { select: { id: true, title: true } },
      },
    });
    if (!own) throw new NotFoundException('Дууссан шалгалтын дүн олдсонгүй');
    const [profile, enrollments] = await Promise.all([
      this.prisma.studentProfile.findUnique({
        where: { userId: studentId },
        select: { school: true },
      }),
      this.prisma.enrollment.findMany({
        where: { studentId, leftAt: null, classroom: { archived: false } },
        select: { classroomId: true, classroom: { select: { name: true } } },
      }),
    ]);
    const scope = async (where: Record<string, unknown>) =>
      rankScores(
        own,
        await this.prisma.testResult.findMany({
          where: {
            testId,
            source: own.source,
            student: { archivedAt: null, ...where },
          },
          select: { totalScore: true, maxScore: true },
        }),
      );
    const classes = await Promise.all(
      enrollments.map(async (e) => ({
        id: e.classroomId,
        label: e.classroom.name,
        ...(await scope({
          enrollments: { some: { classroomId: e.classroomId, leftAt: null } },
        })),
      })),
    );
    const school = profile?.school?.trim()
      ? {
          label: profile.school,
          ...(await scope({ studentProfile: { school: profile.school } })),
        }
      : null;
    return {
      test: own.test,
      totalScore: own.totalScore,
      maxScore: own.maxScore,
      classes,
      school,
      exam: await scope({}),
      rankingMethod: 'COMPETITION_PERCENTAGE',
      identityVisibility: 'PRIVATE',
    };
  }
}
