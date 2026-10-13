import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { Role, StudentType } from '../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import { canAccessChapter } from '../common/access';
import {
  historyWindow,
  historyPage,
  parentLearningMeta,
  enrollmentDayScopes,
} from './parent-history';
import { EmailOtpService } from '../notifications/email-otp.service';

@Injectable()
export class ParentsService {
  constructor(
    private prisma: PrismaService,
    private emailOtp: EmailOtpService,
  ) {}

  async requestLink(parentId: string, studentPhone: string) {
    const student = await this.prisma.user.findUnique({
      where: { phone: studentPhone },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phone: true,
        role: true,
      },
    });
    if (!student || student.role !== Role.STUDENT) {
      throw new NotFoundException('Ийм утасны дугаартай сурагч олдсонгүй');
    }

    return this.prisma.parentLink.upsert({
      where: { parentId_studentId: { parentId, studentId: student.id } },
      create: { parentId, studentId: student.id },
      update: {},
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
          },
        },
      },
    });
  }

  private async assertVerifiedChild(parentId: string, studentId: string) {
    const link = await this.prisma.parentLink.findUnique({
      where: { parentId_studentId: { parentId, studentId } },
      select: { id: true, verifiedAt: true },
    });
    if (!link?.verifiedAt)
      throw new ForbiddenException('Хүүхэдтэй холболт баталгаажаагүй байна.');
    return link;
  }

  async myChildren(parentId: string) {
    // First read only identity + verification. Pending links never query pupil records.
    const links = await this.prisma.parentLink.findMany({
      where: { parentId },
      select: {
        id: true,
        verifiedAt: true,
        studentId: true,
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
          },
        },
      },
      orderBy: { id: 'asc' },
    });
    return Promise.all(
      links.map(async (link) => {
        if (!link.verifiedAt) return { ...link, verified: false };
        const student = await this.prisma.user.findUnique({
          where: { id: link.studentId },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            studentProfile: {
              select: { grade: true, school: true, type: true },
            },
            enrollments: {
              where: { leftAt: null },
              select: {
                joinedAt: true,
                classroom: { select: { id: true, name: true, grade: true } },
              },
              take: 1,
            },
            attendances: {
              select: {
                date: true,
                status: true,
                classroom: { select: { name: true } },
              },
              orderBy: { date: 'desc' },
              take: 12,
            },
            dailyHomeworkMarks: {
              where: { status: { not: null } },
              select: {
                date: true,
                status: true,
                comment: true,
                classroom: { select: { name: true } },
              },
              orderBy: { date: 'desc' },
              take: 14,
            },
            submissions: {
              select: {
                id: true,
                state: true,
                imageKeys: true,
                submittedAt: true,
                checkedAt: true,
                assignment: {
                  select: {
                    title: true,
                    dueDate: true,
                    classroom: { select: { name: true } },
                  },
                },
              },
              orderBy: { updatedAt: 'desc' },
              take: 8,
            },
            testResults: {
              select: {
                id: true,
                totalScore: true,
                maxScore: true,
                source: true,
                createdAt: true,
                test: { select: { title: true, type: true } },
                acknowledgements: {
                  where: { parentId },
                  select: { verifiedAt: true },
                },
              },
              orderBy: { createdAt: 'desc' },
              take: 8,
            },
            payments: {
              select: { id: true, status: true, amount: true, createdAt: true },
              orderBy: { createdAt: 'desc' },
              take: 12,
            },
          },
        });
        if (!student) throw new NotFoundException('Сурагч олдсонгүй.');
        return {
          id: link.id,
          verifiedAt: link.verifiedAt,
          verified: true,
          student: {
            ...student,
            classroom: student.enrollments[0]?.classroom ?? null,
            joinedAt: student.enrollments[0]?.joinedAt ?? null,
          },
        };
      }),
    );
  }

  async childHistory(
    parentId: string,
    studentId: string,
    year?: string,
    page?: string,
  ) {
    await this.assertVerifiedChild(parentId, studentId);
    const window = historyWindow(year, page);
    const dates = { gte: window.start, lt: window.end };
    const paging = { skip: window.skip, take: window.take };
    const enrollments = await this.prisma.enrollment.findMany({
      where: { studentId },
      select: { classroomId: true, joinedAt: true, leftAt: true },
    });
    const scopes = enrollmentDayScopes(enrollments, window.start, window.end);
    const [
      days,
      eventCount,
      attempts,
      events,
      homework,
      submissions,
      results,
      attendance,
      dismissals,
      lessonPackets,
    ] = await Promise.all([
      this.prisma.attempt.groupBy({
        by: ['occurredOn'],
        where: { studentId, occurredOn: dates },
        _count: { _all: true },
        orderBy: { occurredOn: 'asc' },
      }),
      this.prisma.learningEvent.count({
        where: {
          userId: studentId,
          occurredAt: dates,
          OR: [
            { id: { startsWith: 'lab-first-' } },
            { id: { startsWith: 'lab-event-' } },
          ],
          meta: { path: ['lab'], equals: 'v1' },
        },
      }),
      this.prisma.attempt.findMany({
        where: { studentId, occurredOn: dates },
        select: {
          id: true,
          problemId: true,
          testId: true,
          source: true,
          occurredOn: true,
          createdAt: true,
          autoCorrect: true,
          selfState: true,
          givenAnswer: true,
          problem: {
            // бодлогын код эцэг эхэд харагдахгүй (эзний дүрэм 2026-10-08)
            select: {
              chapterId: true,
              chapter: { select: { title: true } },
            },
          },
        },
        orderBy: [{ occurredOn: 'desc' }, { id: 'desc' }],
        ...paging,
      }),
      this.prisma.learningEvent.findMany({
        where: {
          userId: studentId,
          occurredAt: dates,
          OR: [
            { id: { startsWith: 'lab-first-' } },
            { id: { startsWith: 'lab-event-' } },
          ],
          meta: { path: ['lab'], equals: 'v1' },
        },
        select: {
          id: true,
          problemId: true,
          chapterId: true,
          occurredAt: true,
          meta: true,
        },
        orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }],
        ...paging,
      }),
      this.prisma.dailyHomeworkMark.findMany({
        where: { studentId, date: dates, status: { not: null } },
        select: {
          id: true,
          date: true,
          status: true,
          comment: true,
          classroom: { select: { name: true } },
        },
        orderBy: [{ date: 'desc' }, { id: 'desc' }],
        ...paging,
      }),
      this.prisma.submission.findMany({
        where: {
          studentId,
          OR: [
            { submittedAt: dates },
            { checkedAt: dates },
            { updatedAt: dates },
            { revisions: { some: { at: dates } } },
          ],
        },
        select: {
          id: true,
          state: true,
          studentNote: true,
          reviewNote: true,
          revisions: {
            where: { at: dates },
            select: {
              id: true,
              action: true,
              state: true,
              studentNote: true,
              reviewNote: true,
              imageKeys: true,
              at: true,
            },
            orderBy: { at: 'asc' },
          },
          imageKeys: true,
          submittedAt: true,
          checkedAt: true,
          assignment: {
            select: {
              title: true,
              dueDate: true,
              classroom: { select: { name: true } },
            },
          },
        },
        orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
        ...paging,
      }),
      this.prisma.testResult.findMany({
        where: { studentId, createdAt: dates },
        select: {
          id: true,
          testId: true,
          totalScore: true,
          maxScore: true,
          source: true,
          createdAt: true,
          test: { select: { title: true, type: true } },
          acknowledgements: {
            where: { parentId },
            select: { verifiedAt: true },
          },
        },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        ...paging,
      }),
      this.prisma.attendance.findMany({
        where: { studentId, date: dates },
        select: {
          id: true,
          date: true,
          status: true,
          classroom: { select: { name: true } },
        },
        orderBy: [{ date: 'desc' }, { id: 'desc' }],
        ...paging,
      }),
      this.prisma.classDismissal.findMany({
        where: scopes.length ? { OR: scopes } : { id: { in: [] } },
        select: {
          id: true,
          date: true,
          approximateAt: true,
          lastLeftAt: true,
          note: true,
          classroom: { select: { name: true } },
        },
        orderBy: [{ date: 'desc' }, { id: 'desc' }],
        ...paging,
      }),
      this.prisma.lessonPacket.findMany({
        where: scopes.length ? { OR: scopes } : { id: { in: [] } },
        select: {
          id: true,
          date: true,
          chapter: { select: { title: true } },
          receipts: {
            where: { studentId },
            select: {
              id: true,
              kind: true,
              imageKeys: true,
              submittedAt: true,
            },
          },
        },
        orderBy: [{ date: 'desc' }, { id: 'desc' }],
        ...paging,
      }),
    ]);
    return {
      year: window.year,
      page: window.page,
      pageSize: 50,
      summary: {
        activeDays: days.length,
        attemptCount: days.reduce((sum, d) => sum + d._count._all, 0),
        learningEventCount: eventCount,
        days: days.map((d) => ({
          date: d.occurredOn,
          attempts: d._count._all,
        })),
      },
      attempts: historyPage(attempts),
      learning: historyPage(
        events.map((e) => ({
          id: e.id,
          problemId: e.problemId,
          chapterId: e.chapterId,
          at: e.occurredAt,
          evidence: parentLearningMeta(e.meta),
        })),
      ),
      homework: historyPage(homework),
      submissions: historyPage(submissions),
      results: historyPage(results),
      attendance: historyPage(attendance),
      dismissals: historyPage(dismissals),
      lessonPackets: historyPage(lessonPackets),
    };
  }

  async childTheory(parentId: string, studentId: string, chapterId: string) {
    await this.assertVerifiedChild(parentId, studentId);
    const chapter = await this.prisma.chapter.findUnique({
      where: { id: chapterId },
      select: { id: true, bookId: true, freePreview: true, title: true },
    });
    if (!chapter) throw new NotFoundException('Хичээл олдсонгүй.');
    if (
      !(await canAccessChapter(this.prisma, studentId, Role.STUDENT, chapter))
    )
      throw new ForbiddenException('Энэ хичээлийг үзэх эрхгүй.');
    const theories = await this.prisma.theoryBlock.findMany({
      where: { chapterId },
      select: { id: true, title: true, content: true, imageKeys: true },
      orderBy: { order: 'asc' },
    });
    return { chapter: { id: chapter.id, title: chapter.title }, theories };
  }

  pendingLinks() {
    return this.prisma.parentLink.findMany({
      where: { verifiedAt: null },
      include: {
        parent: {
          select: { id: true, firstName: true, lastName: true, phone: true },
        },
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            studentProfile: { select: { grade: true, school: true } },
          },
        },
      },
      orderBy: { id: 'asc' },
    });
  }

  async verify(linkId: string, byUserId: string) {
    const link = await this.prisma.parentLink.findUnique({
      where: { id: linkId },
    });
    if (!link) throw new NotFoundException('Холболтын хүсэлт олдсонгүй');
    return this.prisma.parentLink.update({
      where: { id: linkId },
      data: { verifiedAt: new Date(), verifiedById: byUserId },
    });
  }

  async reject(linkId: string) {
    const link = await this.prisma.parentLink.findUnique({
      where: { id: linkId },
    });
    if (!link) throw new NotFoundException('Холболтын хүсэлт олдсонгүй');
    await this.prisma.parentLink.delete({ where: { id: linkId } });
    return { rejected: true };
  }

  /**
   * Эцэг эхийн дүнтэй танилцлаа эхлүүлэх хүсэлт. Хүүхдийн имэйл эсвэл
   * төлөвлөгөө эцэг эхийн имэйлээр илгээнэ.
   *
   * Хязгаар:
   * - Өөрийн холбоотой хүүхдийн дүн мөн эсэхийг шалгана
   * - StudentProfile.type == CLASSROOM л оролцоно (онлайн сурагчид эцэг эх холбохгүй)
   * - Хүүхэд имэйлтэй байх ёстой
   */
  async requestAcknowledgement(
    parentId: string,
    testResultId: string,
  ): Promise<{ maskedEmail: string }> {
    // Дүнг олно
    const result = await this.prisma.testResult.findUnique({
      where: { id: testResultId },
      include: {
        student: {
          select: {
            id: true,
            email: true,
            studentProfile: { select: { type: true } },
          },
        },
      },
    });

    if (!result) {
      throw new NotFoundException('Шалгалтын дүн олдсонгүй');
    }

    // Хүүхэд олдох ба холбоотой байх ба CLASSROOM-д эргүүлэх
    await this.assertVerifiedChild(parentId, result.studentId);

    if (result.student.studentProfile?.type !== StudentType.CLASSROOM) {
      throw new BadRequestException(
        'Танхимын сурагчидын дүн л танилцуулах боломжтой',
      );
    }

    // Хүүхдийн имэйл байх ёстой
    if (!result.student.email) {
      throw new BadRequestException(
        'Сурагчийн имэйл бүртгэлгүй байна. Эхлээд регистр хийнэ үү.',
      );
    }

    // OTP илгээнэ
    const maskEmail = await this.emailOtp.sendOtp({
      userId: parentId,
      email: result.student.email,
      purpose: `RESULT_ACK:${testResultId}`,
    });

    return maskEmail;
  }

  /**
   * Код оруулж танилцалтыг батлах. Амжилттай бол
   * ResultAcknowledgement үүсгэнэ эсвэл байгаа бичлэгээ буцаана.
   */
  async verifyAcknowledgement(
    parentId: string,
    testResultId: string,
    code: string,
    ip?: string,
  ) {
    // Дүнг олно
    const result = await this.prisma.testResult.findUnique({
      where: { id: testResultId },
      include: {
        student: {
          select: {
            id: true,
            studentProfile: { select: { type: true } },
          },
        },
      },
    });

    if (!result) {
      throw new NotFoundException('Шалгалтын дүн олдсонгүй');
    }

    // Холбоотой байх
    await this.assertVerifiedChild(parentId, result.studentId);

    // Код шалгана
    if (result.student.studentProfile?.type !== StudentType.CLASSROOM)
      throw new BadRequestException(
        'Танхимын сурагчийн дүнтэй танилцах боломжтой.',
      );
    await this.emailOtp.verifyOtp(parentId, `RESULT_ACK:${testResultId}`, code);

    // Баталгаажуулалт үүсгэнэ (давтан оруулахад байгаа бичлэгээ буцаана)
    const ack = await this.prisma.resultAcknowledgement.upsert({
      where: { testResultId_parentId: { testResultId, parentId } },
      create: {
        testResultId,
        parentId,
        channel: 'EMAIL_OTP',
        ip,
      },
      update: {
        // байгаа бичлэгээ дахин буцаана (timestamp үл өөрчлөнө)
      },
    });

    return ack;
  }

  /**
   * Тухайн шалгалтын сурагч бүрд эцэг эх холбоотой юу, танилцсан уу.
   * Админ/багш л уг шалгалтыг үзэж болдог бол энд л өмнөө авна.
   */
  async getAcknowledgementStatus(testId: string) {
    const test = await this.prisma.test.findUnique({
      where: { id: testId },
    });
    if (!test) {
      throw new NotFoundException('Шалгалт олдсонгүй');
    }

    // Бүх дүнгүүдийг авна
    const results = await this.prisma.testResult.findMany({
      where: { testId },
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            studentProfile: { select: { type: true } },
            parentLinks: {
              select: {
                id: true,
                verifiedAt: true,
                parent: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    email: true,
                  },
                },
              },
            },
          },
        },
        acknowledgements: {
          select: {
            parentId: true,
            verifiedAt: true,
            channel: true,
          },
        },
      },
    });

    // Гүйцээлтийг өөрчилнө
    return results.map((r) => ({
      studentId: r.student.id,
      studentName: `${r.student.lastName} ${r.student.firstName}`,
      studentEmail: r.student.email,
      studentType: r.student.studentProfile?.type || 'UNKNOWN',
      parentLinks: r.student.parentLinks.map((link) => ({
        parentId: link.parent.id,
        parentName: `${link.parent.lastName} ${link.parent.firstName}`,
        parentEmail: link.parent.email,
        isVerified: link.verifiedAt !== null,
        acknowledgedAt: r.acknowledgements.find(
          (a) => a.parentId === link.parent.id,
        )?.verifiedAt,
        channel: r.acknowledgements.find((a) => a.parentId === link.parent.id)
          ?.channel,
      })),
    }));
  }
}
