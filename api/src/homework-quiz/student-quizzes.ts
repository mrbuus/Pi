import { dateKey } from '../common/date';
import type { PrismaService } from '../prisma/prisma.service';

/** Сурагч / эцэг эх / тайланд харагдах нэг шалгалтын оноо (эзэн 2026-11-08 19:08) */
export interface StudentQuizRow {
  classroomId: string;
  classroom: string;
  /** YYYY-MM-DD — шалгалт авсан (даалгаврыг шалгасан) өдөр */
  date: string;
  score: number;
  problemCount: number;
}

/**
 * Нэг сурагчийн шалгалтын оноо (устгаагүй шалгалт, устгаагүй оноо), шинэ нь эхэнд. DI-гүй
 * функц — эцэг эх, сурагчийн hub, долоо хоногийн тайлан модулиа өөрчлөхгүйгээр дуудна.
 * ЭРХИЙГ ДУУДАГЧ ШАЛГАНА (эцэг эх — баталгаажсан холбоос, сурагч — өөрөө).
 */
export async function loadStudentQuizzes(
  prisma: PrismaService,
  studentId: string,
  opts: { from?: Date; to?: Date; classroomIds?: string[]; take?: number } = {},
): Promise<StudentQuizRow[]> {
  const date = opts.from || opts.to ? { ...(opts.from ? { gte: opts.from } : {}), ...(opts.to ? { lte: opts.to } : {}) } : undefined;
  const rows = await prisma.homeworkQuizScore.findMany({
    where: {
      studentId,
      deletedAt: null,
      quiz: {
        deletedAt: null,
        ...(date ? { date } : {}),
        ...(opts.classroomIds ? { classroomId: { in: opts.classroomIds } } : {}),
      },
    },
    select: { score: true, quiz: { select: { classroomId: true, date: true, problemCount: true } } },
    orderBy: { quiz: { date: 'desc' } },
    ...(opts.take ? { take: opts.take } : {}),
  });
  if (!rows.length) return [];
  const ids = [...new Set(rows.map((r) => r.quiz.classroomId))];
  const classes = await prisma.classroom.findMany({ where: { id: { in: ids } }, select: { id: true, name: true } });
  const names = new Map(classes.map((c) => [c.id, c.name]));
  return rows.map((r) => ({
    classroomId: r.quiz.classroomId,
    classroom: names.get(r.quiz.classroomId) ?? '',
    date: dateKey(r.quiz.date),
    score: Number(r.score),
    problemCount: r.quiz.problemCount,
  }));
}
