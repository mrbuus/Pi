import { Role } from '../generated/prisma/enums';
import { isClassTeacher } from '../common/class-teachers';
import { dateKey } from '../common/date';
import type { PrismaService } from '../prisma/prisma.service';

/**
 * Нөхөх хичээл, онолын зургийн АЖИЛТНЫ эрх (эзэн 2026-10-18) — нэг газар:
 * - ADMIN, TEACHER_PLUS: бүх анги
 * - TEACHER: ангийн үндсэн/туслах багш, долоо хоногийн хуваарийн багш → бүх өдөр;
 *   эс бөгөөс тухайн өдрийн ахлах/туслах багш (LessonStaffing) → зөвхөн тэр өдрүүд
 * - бусад роль: эрхгүй
 * file-authorization.service.ts ч ЭНИЙГ ашиглана (API ба файлын эрх зөрөхгүй).
 */
export type StaffDays = 'ALL' | Set<string>;

export interface StaffActor {
  userId: string;
  role: Role | string;
}

type Db = Pick<PrismaService, 'classroom' | 'classSchedule' | 'lessonStaffing'>;

export function isStaffRole(role: Role | string): boolean {
  return role === Role.ADMIN || role === Role.TEACHER_PLUS || role === Role.TEACHER;
}

/** null — анги олдсонгүй; хоосон Set — эрхгүй. */
export async function staffDays(
  db: Db,
  actor: StaffActor,
  classroomId: string,
  from: Date,
  to: Date,
): Promise<StaffDays | null> {
  const classroom = await db.classroom.findUnique({
    where: { id: classroomId },
    select: { id: true, teacherId: true, assistantTeacherId: true },
  });
  if (!classroom) return null;
  if (actor.role === Role.ADMIN || actor.role === Role.TEACHER_PLUS) return 'ALL';
  if (actor.role !== Role.TEACHER) return new Set();
  if (isClassTeacher(classroom, actor.userId)) return 'ALL';
  if (
    (await db.classSchedule.count({
      where: { classroomId, teacherId: actor.userId },
    })) > 0
  )
    return 'ALL';
  const rows = await db.lessonStaffing.findMany({
    where: {
      date: { gte: from, lte: to },
      schedule: { classroomId },
      OR: [{ leadTeacherId: actor.userId }, { assistantTeacherId: actor.userId }],
    },
    select: { date: true },
  });
  return new Set(rows.map((r) => dateKey(r.date)));
}

export function staffCovers(days: StaffDays | null, key: string): boolean {
  if (!days) return false;
  return days === 'ALL' || days.has(key);
}

/** Нэг өдрийн шалгалт (файлын эрх, нэг мөрийн үйлдэл). */
export async function canStaffClassDay(
  db: Db,
  actor: StaffActor,
  classroomId: string,
  date: Date,
): Promise<boolean> {
  if (!isStaffRole(actor.role)) return false;
  const days = await staffDays(db, actor, classroomId, date, date);
  return staffCovers(days, dateKey(date));
}
