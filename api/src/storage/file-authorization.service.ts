import { Injectable } from '@nestjs/common';
import { Role } from '../generated/prisma/enums';
import type { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  canAccessChapter,
  canAccessVideoChapter,
  hasCoveringPass,
} from '../common/access';
export interface FileActor {
  id: string;
  role: Role;
}
const staff = (role: Role) =>
  role === Role.TEACHER || role === Role.TEACHER_PLUS;
@Injectable()
export class FileAuthorizationService {
  constructor(private readonly prisma: PrismaService) {}
  private submissionScope(actor: FileActor): Prisma.SubmissionWhereInput {
    const grants: Prisma.SubmissionWhereInput[] = [{ studentId: actor.id }];
    if (actor.role === Role.PARENT)
      grants.push({
        student: {
          childLinks: {
            some: { parentId: actor.id, verifiedAt: { not: null } },
          },
        },
      });
    if (staff(actor.role))
      grants.push({ assignment: { classroom: { teacherId: actor.id } } });
    return { OR: grants };
  }
  async allowed(actor: FileActor, key: string): Promise<boolean> {
    if (actor.role === Role.ADMIN) return true;
    // Түвшин тогтоох шалгалтын бодолтын зураг — төвийн багш нар үзэж түвшин тогтооно
    if (
      staff(actor.role) &&
      (await this.prisma.placementAttempt.count({ where: { photoKeys: { has: key } } })) > 0
    )
      return true;
    const stored = await this.prisma.storedFile.findUnique({
      where: { key },
      select: { ownerId: true },
    });
    if (stored?.ownerId === actor.id) return true; // own draft uploads; ownership is never guessed for legacy rows
    const lessonReceipts = await this.prisma.lessonReceipt.findMany({
      where: { imageKeys: { has: key } },
      select: {
        studentId: true,
        kind: true,
        packet: {
          select: {
            date: true,
            classroomId: true,
            classroom: { select: { teacherId: true } },
          },
        },
      },
    });
    let lessonGrant = false,
      privateLessonGrant = false;
    for (const receipt of lessonReceipts) {
      if (
        receipt.studentId === actor.id ||
        (staff(actor.role) && receipt.packet.classroom.teacherId === actor.id)
      ) {
        lessonGrant = true;
        if (receipt.kind !== 'THEORY') privateLessonGrant = true;
        continue;
      }
      const children =
        actor.role === Role.PARENT
          ? await this.prisma.parentLink.findMany({
              where: { parentId: actor.id, verifiedAt: { not: null } },
              select: { studentId: true },
            })
          : [];
      if (children.some((c) => c.studentId === receipt.studentId)) {
        lessonGrant = true;
        if (receipt.kind !== 'THEORY') privateLessonGrant = true;
        continue;
      }
      if (receipt.kind === 'THEORY') {
        const pupilIds =
          actor.role === Role.STUDENT
            ? [actor.id]
            : children.map((c) => c.studentId);
        const day = receipt.packet.date.toISOString().slice(0, 10),
          end = new Date(`${day}T00:00:00+08:00`);
        end.setTime(end.getTime() + 86400000);
        if (
          pupilIds.length &&
          (await this.prisma.enrollment.findFirst({
            where: {
              classroomId: receipt.packet.classroomId,
              studentId: { in: pupilIds },
              joinedAt: { lt: end },
              OR: [{ leftAt: null }, { leftAt: { gte: end } }],
            },
            select: { id: true },
          }))
        )
          lessonGrant = true;
      }
    }
    const privateLesson = lessonReceipts.some((r) => r.kind !== 'THEORY');
    if (privateLesson && !privateLessonGrant) return false;
    const scope = this.submissionScope(actor);
    const [
      privateSubmission,
      privateRevision,
      privateFeedback,
      ownSubmission,
      ownRevision,
      ownFeedback,
    ] = await Promise.all([
      this.prisma.submission.findFirst({
        where: { imageKeys: { has: key } },
        select: { id: true },
      }),
      this.prisma.submissionRevision.findFirst({
        where: { imageKeys: { has: key } },
        select: { id: true },
      }),
      this.prisma.feedback.findFirst({
        where: { attachmentKeys: { has: key } },
        select: { id: true },
      }),
      this.prisma.submission.findFirst({
        where: { AND: [{ imageKeys: { has: key } }, scope] },
        select: { id: true },
      }),
      this.prisma.submissionRevision.findFirst({
        where: { imageKeys: { has: key }, submission: scope },
        select: { id: true },
      }),
      this.prisma.feedback.findFirst({
        where: { attachmentKeys: { has: key }, authorId: actor.id },
        select: { id: true },
      }),
    ]);
    if (ownSubmission || ownRevision || ownFeedback) return true;
    // A private photo cannot gain public/content access merely by being copied into another reference.
    if (privateSubmission || privateRevision || privateFeedback) return false;
    if (lessonGrant) return true;

    const parentChildren =
      actor.role === Role.PARENT
        ? await this.prisma.parentLink.findMany({
            where: { parentId: actor.id, verifiedAt: { not: null } },
            select: { studentId: true },
          })
        : [];
    const pupils =
      actor.role === Role.STUDENT
        ? [actor.id]
        : parentChildren.map((l) => l.studentId);
    const viewers = [
      { id: actor.id, role: actor.role },
      ...parentChildren.map((l) => ({ id: l.studentId, role: Role.STUDENT })),
    ];
    // Frozen bank images remain references only for their run owner. A client cannot
    // submit sourceSnapshot; StudyReviewService derives it from an eligible bank row.
    // This runs after private attachment precedence, never as a general JWT fallback.
    if (actor.role === Role.STUDENT || actor.role === Role.BUYER) {
      const snapshots = await this.prisma.studyReviewItem.findMany({
        where: {
          run: { userId: actor.id },
          sourceSnapshot: { path: ['imageKey'], equals: key },
          problem: { deletedAt: null, chapter: { book: { deletedAt: null } } },
        },
        select: {
          problem: {
            select: {
              chapter: {
                select: { id: true, bookId: true, freePreview: true },
              },
            },
          },
        },
      });
      for (const snapshot of snapshots)
        if (
          await canAccessChapter(
            this.prisma,
            actor.id,
            actor.role,
            snapshot.problem.chapter,
          )
        )
          return true;
    }
    const [theories, problems, videos, assignments, avatars, covers, tests] =
      await Promise.all([
        this.prisma.theoryBlock.findMany({
          where: { imageKeys: { has: key } },
          select: {
            chapter: { select: { id: true, bookId: true, freePreview: true } },
          },
        }),
        // Бодлогын зураг эсвэл сонголтын зураг (график хариу)
        this.prisma.problem.findMany({
          where: { OR: [{ imageKey: key }, { choiceOptions: { some: { imageKey: key } } }] },
          select: {
            chapter: { select: { id: true, bookId: true, freePreview: true } },
          },
        }),
        this.prisma.video.findMany({
          where: { s3Key: key },
          select: {
            chapter: { select: { id: true, bookId: true, freePreview: true } },
          },
        }),
        this.prisma.assignment.findMany({
          where: { imageKeys: { has: key } },
          select: {
            id: true,
            classroomId: true,
            createdAt: true,
            classroom: { select: { teacherId: true } },
          },
        }),
        this.prisma.user.findMany({
          where: { avatarUrl: key },
          select: { id: true, role: true },
        }),
        this.prisma.book.findMany({
          where: { coverKey: key },
          select: {
            id: true,
            archived: true,
            deletedAt: true,
            chapters: { select: { id: true, bookId: true, freePreview: true } },
          },
        }),
        this.prisma.test.findMany({
          where: { pdfKey: key },
          select: {
            id: true,
            chapterId: true,
            createdById: true,
            isDraft: true,
            chapter: { select: { bookId: true } },
          },
        }),
      ]);
    const chapters = new Map<
      string,
      { id: string; bookId: string | null; freePreview: boolean }
    >();
    for (const ref of [...theories, ...problems])
      if (ref.chapter) chapters.set(ref.chapter.id, ref.chapter);
    for (const cover of covers) {
      if (!cover.archived && !cover.deletedAt) return true; // cover belongs to visible catalogue, not a private upload fallback
      for (const chapter of cover.chapters) chapters.set(chapter.id, chapter);
    }
    for (const chapter of chapters.values())
      for (const viewer of viewers)
        if (
          await canAccessChapter(this.prisma, viewer.id, viewer.role, chapter)
        )
          return true;

    // Шалгалтын зураг: сурагч тухайн бодлоготой тестийг ЭХЛҮҮЛСЭН бол (session
    // зөвхөн эрхтэй үед үүсдэг) зургийг харна — ном худалдаж аваагүй, зөвхөн
    // тест/ангиар хамрагдсан (жиш: 1000 бодлогын шалгалт) сурагчид хэрэгтэй.
    if (
      problems.length > 0 &&
      (actor.role === Role.STUDENT || actor.role === Role.BUYER)
    ) {
      const examSession = await this.prisma.testAttemptSession.findFirst({
        where: {
          studentId: actor.id,
          test: {
            deletedAt: null,
            problems: {
              some: {
                problem: {
                  OR: [{ imageKey: key }, { choiceOptions: { some: { imageKey: key } } }],
                },
              },
            },
          },
        },
        select: { id: true },
      });
      if (examSession) return true;
    }

    for (const ref of videos)
      if (ref.chapter)
        for (const viewer of viewers)
          if (
            await canAccessVideoChapter(
              this.prisma,
              viewer.id,
              viewer.role,
              ref.chapter,
            )
          )
            return true;

    // The teacher's saved historical class-day packet is also a theory reference grant.
    if (pupils.length && theories.length) {
      const packets = await this.prisma.lessonPacket.findMany({
        where: {
          chapterId: {
            in: theories.flatMap((t) => (t.chapter ? [t.chapter.id] : [])),
          },
        },
        select: { date: true, classroomId: true, theoryBlockIds: true },
      });
      const referencedTheories = await this.prisma.theoryBlock.findMany({
        where: { imageKeys: { has: key } },
        select: { id: true },
      });
      for (const packet of packets) {
        if (
          !referencedTheories.some((t) => packet.theoryBlockIds.includes(t.id))
        )
          continue;
        const end = new Date(
          `${packet.date.toISOString().slice(0, 10)}T00:00:00+08:00`,
        );
        end.setTime(end.getTime() + 86400000);
        if (
          await this.prisma.enrollment.findFirst({
            where: {
              classroomId: packet.classroomId,
              studentId: { in: pupils },
              joinedAt: { lt: end },
              OR: [{ leftAt: null }, { leftAt: { gte: end } }],
            },
            select: { id: true },
          })
        )
          return true;
      }
    }
    if (staff(actor.role) && videos.some((v) => !v.chapter)) return true;

    for (const assignment of assignments) {
      if (staff(actor.role) && assignment.classroom.teacherId === actor.id)
        return true;
      if (!pupils.length) continue;
      const [submitted, enrolled] = await Promise.all([
        this.prisma.submission.findFirst({
          where: { assignmentId: assignment.id, studentId: { in: pupils } },
          select: { id: true },
        }),
        this.prisma.enrollment.findFirst({
          where: {
            classroomId: assignment.classroomId,
            studentId: { in: pupils },
            joinedAt: { lte: assignment.createdAt },
            OR: [{ leftAt: null }, { leftAt: { gt: assignment.createdAt } }],
          },
          select: { id: true },
        }),
      ]);
      if (submitted || enrolled) return true; // no deletedAt/current-enrollment filter: authorized historical originals survive
    }
    for (const avatar of avatars) {
      if (avatar.id === actor.id || pupils.includes(avatar.id)) return true;
      if (staff(actor.role)) {
        if (
          ([Role.ADMIN, Role.TEACHER, Role.TEACHER_PLUS] as Role[]).includes(
            avatar.role,
          )
        )
          return true;
        if (
          await this.prisma.enrollment.findFirst({
            where: { studentId: avatar.id, classroom: { teacherId: actor.id } },
            select: { id: true },
          })
        )
          return true;
      }
      if (
        pupils.length &&
        staff(avatar.role) &&
        (await this.prisma.enrollment.findFirst({
          where: {
            studentId: { in: pupils },
            classroom: { teacherId: avatar.id },
          },
          select: { id: true },
        }))
      )
        return true;
    }
    for (const test of tests) {
      if (staff(actor.role) && (!test.isDraft || test.createdById === actor.id))
        return true;
      if (test.isDraft) continue;
      for (const pupil of pupils) {
        if (
          await this.prisma.testResult.findFirst({
            where: { testId: test.id, studentId: pupil },
            select: { id: true },
          })
        )
          return true;
        if (
          await this.prisma.testAccess.findFirst({
            where: {
              testId: test.id,
              classroom: {
                enrollments: { some: { studentId: pupil, leftAt: null } },
              },
            },
            select: { testId: true },
          })
        )
          return true;
      }
      for (const viewer of viewers) {
        if (
          await hasCoveringPass(this.prisma, viewer.id, {
            testId: test.id,
            chapterId: test.chapterId,
            bookId: test.chapter?.bookId,
          })
        )
          return true;
        if (
          await this.prisma.purchase.findFirst({
            where: {
              userId: viewer.id,
              grantedAt: { not: null },
              productItem: { kind: 'TEST', refId: test.id },
            },
            select: { id: true },
          })
        )
          return true;
      }
    }
    return false;
  }
}
