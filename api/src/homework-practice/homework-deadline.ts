import { dateKey, parseDateOnly } from '../common/date';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Багшийн гараар тохируулсан гэрийн даалгаврын хугацаа (HomeworkDeadline). Тохируулаагүй бол
 * дуудагч өөрийн анхдагчийг (дараагийн хичээлийн 00:00) хэрэглэнэ.
 */
export interface DeadlineOverride {
  dueAt: Date;
  allowLate: boolean;
}

export const deadlineKey = (classroomId: string, lessonKey: string) =>
  `${classroomId}|${lessonKey}`;

/** Ангиуд × огнооны муж дахь тохиргоонууд: key = `${classroomId}|${lessonDate}` */
export async function loadDeadlineOverrides(
  prisma: PrismaService,
  classroomIds: string[],
  fromKey: string,
  toKey: string,
): Promise<Map<string, DeadlineOverride>> {
  if (!classroomIds.length) return new Map();
  const rows = await prisma.homeworkDeadline.findMany({
    where: {
      classroomId: { in: classroomIds },
      lessonDate: { gte: parseDateOnly(fromKey), lte: parseDateOnly(toKey) },
    },
    select: { classroomId: true, lessonDate: true, dueAt: true, allowLate: true },
  });
  return new Map(
    rows.map((r) => [
      deadlineKey(r.classroomId, dateKey(r.lessonDate)),
      { dueAt: r.dueAt, allowLate: r.allowLate },
    ]),
  );
}

export async function loadDeadlineOverride(
  prisma: PrismaService,
  classroomId: string,
  lessonKey: string,
): Promise<DeadlineOverride | null> {
  const row = await prisma.homeworkDeadline.findUnique({
    where: {
      classroomId_lessonDate: { classroomId, lessonDate: parseDateOnly(lessonKey) },
    },
    select: { dueAt: true, allowLate: true },
  });
  return row ?? null;
}

/** «Хаагдана» сонгосон бөгөөд хугацаа өнгөрсөн */
export function deadlineClosed(o: DeadlineOverride | null, now = Date.now()): boolean {
  return !!o && !o.allowLate && now > o.dueAt.getTime();
}

/** УБ-ын огноо + «HH:MM» (24 цаг) → UTC агшин */
export function ubAt(key: string, hhmm: string): Date {
  return new Date(`${key}T${hhmm}:00+08:00`);
}
