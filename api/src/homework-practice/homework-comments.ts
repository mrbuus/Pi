import { BadRequestException } from '@nestjs/common';
import { dateKey } from '../common/date';
import { PrismaService } from '../prisma/prisma.service';
import { withPlus } from '../revisions/revision-snapshot';

/**
 * Гэрийн даалгавар дээрх сурагчид харагдах сэтгэгдэл (эзэн 2026-11-05) — багшийн дотоод
 * тэмдэглэл (DailyHomeworkMark.comment)-ээс тусдаа. Багш, сурагч хоёулаа бичнэ; мөр устгахгүй.
 */
export const COMMENT_MAX = 1000;
export const CAPTION_MAX = 500;

export function cleanText(value: unknown, max: number, field: string): string {
  if (typeof value !== 'string') throw new BadRequestException(`${field} шаардлагатай`);
  const text = value.replace(/\r\n/g, '\n').trim();
  if (!text) throw new BadRequestException(`${field} хоосон байна`);
  if (text.length > max) throw new BadRequestException(`${field} ${max} тэмдэгтээс хэтэрсэн`);
  return text;
}

/** Сонголттой тайлбар: хоосон бол null */
export function cleanCaption(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'string') throw new BadRequestException('Тайлбар буруу байна');
  const text = value.replace(/\r\n/g, '\n').trim();
  if (!text) return null;
  if (text.length > CAPTION_MAX)
    throw new BadRequestException(`Тайлбар ${CAPTION_MAX} тэмдэгтээс хэтэрсэн`);
  return text;
}

export interface HomeworkCommentView {
  id: string;
  kind: string;
  body: string;
  createdAt: string;
  fromTeacher: boolean;
  authorName: string;
  mine: boolean;
}

/** Сурагчийн (эсвэл олон сурагчийн) сэтгэгдлийг зохиогчийн нэртэй нь уншина */
export async function loadHomeworkComments(
  prisma: PrismaService,
  where: { studentId: string; classroomId?: string; lessonDate: Date | { gte: Date } },
  viewerId: string,
) {
  const rows = await prisma.homeworkComment.findMany({
    where: { ...where, deletedAt: null },
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      classroomId: true,
      lessonDate: true,
      authorId: true,
      authorRole: true,
      kind: true,
      body: true,
      createdAt: true,
    },
  });
  const ids = [...new Set(rows.map((r) => r.authorId))];
  const users = ids.length
    ? await prisma.user.findMany({
        where: { id: { in: ids } },
        select: { id: true, firstName: true, lastName: true, role: true },
      })
    : [];
  const byId = new Map(users.map((u) => [u.id, u]));
  return rows.map((r) => {
    const u = byId.get(r.authorId);
    const short = u ? `${u.lastName ? `${u.lastName[0]}. ` : ''}${u.firstName}` : '';
    const fromTeacher = r.authorRole !== 'STUDENT';
    return {
      classroomId: r.classroomId,
      lessonDate: dateKey(r.lessonDate),
      view: {
        id: r.id,
        kind: r.kind,
        body: r.body,
        createdAt: r.createdAt.toISOString(),
        fromTeacher,
        authorName: withPlus(short, u?.role ?? r.authorRole),
        mine: r.authorId === viewerId,
      } satisfies HomeworkCommentView,
    };
  });
}
