import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { isClassTeacher } from '../common/class-teachers';
import { Role } from '../generated/prisma/enums';
import type { PrismaService } from '../prisma/prisma.service';

/** Багш бүх ангийн ирц/даалгаврыг харж тэмдэглэнэ (эзэн 2026-10-19) */
export const TEACHER_SEES_ALL = true;

/**
 * Ирц/даалгавар тэмдэглэх, самбарыг харах эрх (эзэн 2026-10-18, D9) — ирц ба
 * гэрийн даалгаврын сервис ХОЁУЛАА энийг ашиглана (дүрэм нэг газар):
 *
 * - ADMIN, TEACHER_PLUS — бүх идэвхтэй анги
 * - TEACHER — ангийн үндсэн/туслах багш, ТЭР анги дахь аль нэг хуваарийн багш,
 *   эсвэл ТЭР ӨДӨР (эсвэл [from, to] мужид) тэр ангийн хичээлд ахлах/туслах багшаар
 *   орсон (LessonStaffing) — learning-lab/dismissal.service-ийн дүрэмтэй ижил.
 *
 * DI-гүй функц: HomeworkMarksService модулиа өөрчлөхгүйгээр дуудна.
 */
export async function assertMarkAccess(
  prisma: PrismaService,
  classroomId: string,
  userId: string,
  role: Role,
  when: { date?: Date; from?: Date; to?: Date } = {},
) {
  const classroom = await prisma.classroom.findUnique({
    where: { id: classroomId },
  });
  if (!classroom || classroom.archived) {
    throw new NotFoundException('Анги олдсонгүй');
  }
  if (role === Role.ADMIN || role === Role.TEACHER_PLUS) return classroom;
  if (role !== Role.TEACHER) {
    throw new ForbiddenException('Энэ ангид хандах эрхгүй');
  }
  // Эзэн 2026-10-19: Багш тухайн өдрийн хуваарьт нэр нь бичигдээгүй (орлож орсон
  // гэх мэт) байсан ч БҮХ анги, бүх хичээлийг харж, тэмдэглэж чадна. Хэн тэмдэглэсэн
  // нь аудитад үлдэнэ. Хуваарь засах эрх Багш+-д л хэвээр.
  if (TEACHER_SEES_ALL) return classroom;
  if (isClassTeacher(classroom, userId)) return classroom;

  const ownsSchedule = await prisma.classSchedule.count({
    where: { classroomId, teacherId: userId },
  });
  if (ownsSchedule > 0) return classroom;

  const dateWhere = when.date
    ? { date: when.date }
    : when.from && when.to
      ? { date: { gte: when.from, lte: when.to } }
      : null;
  if (dateWhere) {
    const staffed = await prisma.lessonStaffing.count({
      where: {
        ...dateWhere,
        schedule: { classroomId },
        OR: [{ leadTeacherId: userId }, { assistantTeacherId: userId }],
      },
    });
    if (staffed > 0) return classroom;
  }
  throw new ForbiddenException('Энэ ангид хандах эрхгүй');
}
