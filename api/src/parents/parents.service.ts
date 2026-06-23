import { Injectable, NotFoundException } from '@nestjs/common';
import { Role } from '../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ParentsService {
  constructor(private prisma: PrismaService) {}

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
}
