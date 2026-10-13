import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { Role } from '../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';

// «Шалгалт» хэсгийн эрх (SHALGALT-TOLOVLOGOO §8.4):
//   Багш        — зөвхөн өөрийн анги (оноох, дүн шивэх, харах)
//   Багш+/Админ — бүх анги
// Контент (алхмын багц) — Багш+/Админ; үнэ — зөвхөн Админ.

export function managesAllClasses(role: Role): boolean {
  return role === Role.ADMIN || role === Role.TEACHER_PLUS;
}

export function manageableClassWhere(
  role: Role,
  userId: string,
): Prisma.ClassroomWhereInput {
  return {
    archived: false,
    ...(managesAllClasses(role) ? {} : { teacherId: userId }),
  };
}

/** Анги нь энэ ажилтны удирдах хүрээнд байгаа эсэх — үгүй бол 403/404. */
export async function assertManageableClass(
  prisma: PrismaService,
  classroomId: string,
  userId: string,
  role: Role,
) {
  const classroom = await prisma.classroom.findUnique({
    where: { id: classroomId },
    select: { id: true, name: true, teacherId: true, archived: true },
  });
  if (!classroom || classroom.archived)
    throw new NotFoundException('Анги олдсонгүй');
  if (!managesAllClasses(role) && classroom.teacherId !== userId) {
    throw new ForbiddenException('Зөвхөн өөрийн ангийн шалгалтыг удирдана');
  }
  return classroom;
}

/** Тест (устгаагүй); багш бусдын нооргийг харахгүй. */
export async function findExamTest<T extends Prisma.TestSelect>(
  prisma: PrismaService,
  testId: string,
  userId: string,
  role: Role,
  select: T,
): Promise<
  Prisma.TestGetPayload<{ select: T }> & {
    isDraft: boolean;
    createdById: string;
  }
> {
  const fullSelect: Prisma.TestSelect = {
    ...select,
    deletedAt: true,
    isDraft: true,
    createdById: true,
  };
  const test = (await prisma.test.findUnique({
    where: { id: testId },
    select: fullSelect,
  })) as unknown as
    | (Prisma.TestGetPayload<{ select: T }> & {
        deletedAt: Date | null;
        isDraft: boolean;
        createdById: string;
      })
    | null;
  if (!test || test.deletedAt) throw new NotFoundException('Шалгалт олдсонгүй');
  if (role === Role.TEACHER && test.isDraft && test.createdById !== userId) {
    throw new NotFoundException('Шалгалт олдсонгүй');
  }
  return test;
}
