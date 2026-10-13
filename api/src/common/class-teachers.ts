import type { Prisma } from '../generated/prisma/client';

/**
 * Ангийн багш (эзэн 2026-10-13): анги дээд тал нь ХОЁР ангийн багштай —
 * үндсэн (`Classroom.teacherId`) ба туслах (`Classroom.assistantTeacherId`).
 * Энгийн Багшийн «өөрийн анги» гэдэг шалгалт хоёуланг нь ижил тооцно — ирц,
 * даалгавар, ангийн самбар, хуваарийн хуанли. Нэг газар тодорхойлсон тул
 * дүрэм өөрчлөгдвөл зөвхөн энд засна.
 */
export function classTeacherWhere(userId: string): Prisma.ClassroomWhereInput {
  return { OR: [{ teacherId: userId }, { assistantTeacherId: userId }] };
}

export function isClassTeacher(
  classroom: { teacherId: string | null; assistantTeacherId?: string | null } | null | undefined,
  userId: string,
): boolean {
  if (!classroom || !userId) return false;
  return classroom.teacherId === userId || classroom.assistantTeacherId === userId;
}
