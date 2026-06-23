import { Injectable, NotFoundException } from '@nestjs/common';
import { Role } from '../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ColorTagsService {
  constructor(private prisma: PrismaService) {}

  // Багш сурагч дээрх ӨӨРИЙН тэмдэглэгээгээ тавина/шинэчилнэ (SPEC §13.1)
  async setTag(
    studentId: string,
    color: string,
    note: string | undefined,
    byUserId: string,
  ) {
    const student = await this.prisma.user.findUnique({
      where: { id: studentId },
    });
    if (!student || student.role !== Role.STUDENT) {
      throw new NotFoundException('Сурагч олдсонгүй');
    }
    return this.prisma.studentColorTag.upsert({
      where: {
        studentId_createdById: { studentId, createdById: byUserId },
      },
      create: { studentId, createdById: byUserId, color, note },
      update: { color, note },
    });
  }

  async removeTag(studentId: string, byUserId: string) {
    await this.prisma.studentColorTag.deleteMany({
      where: { studentId, createdById: byUserId },
    });
    return { removed: true };
  }

  // Нэг сурагчийн бүх багшийн тэмдэглэгээ — зөвхөн багш нар + админ харна
  async tagsForStudent(studentId: string) {
    return this.prisma.studentColorTag.findMany({
      where: { studentId },
      include: {
        // createdById нь User боловч relation тодорхойлоогүй тул нэрийг тусад нь авна
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  // Ангийн бүх сурагчийн тэмдэглэгээ (roster дээр өнгө харуулахад)
  async tagsForClassroom(classroomId: string) {
    const enrollments = await this.prisma.enrollment.findMany({
      where: { classroomId, leftAt: null },
      select: { studentId: true },
    });
    const studentIds = enrollments.map((e) => e.studentId);
    const tags = await this.prisma.studentColorTag.findMany({
      where: { studentId: { in: studentIds } },
    });
    // Багш нарын нэрийг нэг дор авна
    const creatorIds = [...new Set(tags.map((t) => t.createdById))];
    const creators = await this.prisma.user.findMany({
      where: { id: { in: creatorIds } },
      select: { id: true, firstName: true, lastName: true },
    });
    const creatorMap = new Map(creators.map((c) => [c.id, c]));
    return tags.map((t) => ({
      ...t,
      createdBy: creatorMap.get(t.createdById) ?? null,
    }));
  }
}
