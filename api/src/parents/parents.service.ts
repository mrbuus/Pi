import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Role, StudentType } from '../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
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
        studentProfile: { select: { grade: true, school: true } },
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
            studentProfile: { select: { grade: true, school: true } },
          },
        },
      },
    });
  }

  async myChildren(parentId: string) {
    const links = await this.prisma.parentLink.findMany({
      where: { parentId },
      include: {
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            studentProfile: { select: { grade: true, school: true } },
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
            submissions: {
              select: {
                state: true,
                note: true,
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
                totalScore: true,
                maxScore: true,
                source: true,
                createdAt: true,
                test: { select: { title: true, type: true } },
              },
              orderBy: { createdAt: 'desc' },
              take: 8,
            },
            payments: {
              select: {
                id: true,
                status: true,
                amount: true,
                createdAt: true,
              },
              orderBy: { createdAt: 'desc' },
              take: 12,
            },
          },
        },
      },
      orderBy: { id: 'asc' },
    });

    return links.map((link) => {
      const { student, ...rest } = link;
      if (!link.verifiedAt) {
        return {
          ...rest,
          verified: false,
          student: {
            id: student.id,
            firstName: student.firstName,
            lastName: student.lastName,
            phone: student.phone,
            studentProfile: student.studentProfile,
          },
        };
      }
      return {
        ...rest,
        verified: true,
        student: {
          ...student,
          classroom: student.enrollments[0]?.classroom ?? null,
          joinedAt: student.enrollments[0]?.joinedAt ?? null,
        },
      };
    });
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
    const link = await this.prisma.parentLink.findUnique({
      where: { parentId_studentId: { parentId, studentId: result.studentId } },
    });
    if (!link) {
      throw new BadRequestException('Та энэ сурагчийн эцэг эх биш байна');
    }

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
      purpose: 'RESULT_ACK',
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
    const link = await this.prisma.parentLink.findUnique({
      where: { parentId_studentId: { parentId, studentId: result.studentId } },
    });
    if (!link) {
      throw new BadRequestException('Та энэ сурагчийн эцэг эх биш байна');
    }

    // Код шалгана
    await this.emailOtp.verifyOtp(parentId, 'RESULT_ACK', code);

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
        acknowledgedAt: r.acknowledgements.find((a) => a.parentId === link.parent.id)
          ?.verifiedAt,
        channel: r.acknowledgements.find((a) => a.parentId === link.parent.id)
          ?.channel,
      })),
    }));
  }
}
