import { parseDateOnly } from '../common/date';
import type { PrismaService } from '../prisma/prisma.service';
import { addDaysKey } from '../attendance/board-logic';
import { loadPreviousLesson } from '../attendance/lesson-dates';
import {
  assignmentLessonKey,
  buildHomeworkLesson,
  resolveLessonTopic,
  type HomeworkLesson,
} from './homework-lesson.logic';

type Db = Pick<PrismaService, 'lessonTopic' | 'lessonRecord' | 'test'>;

const pairKey = (classroomId: string, date: string) => `${classroomId}|${date}`;

/**
 * (анги, өдөр) хос бүрийн сэдвийг баталгаажсан хичээлийн бичлэг (LessonRecord.topic)
 * болон өдрийн төлөвлөгөөнөөс (LessonTopic: гарчиг эсвэл тест) уншина.
 * Нэг өдөр хоёр хичээлтэй бол сэдвүүдийг давхардалгүй нийлүүлнэ.
 */
export async function loadLessonTopics(
  prisma: Db,
  pairs: { classroomId: string; date: string }[],
): Promise<Map<string, string | null>> {
  const out = new Map<string, string | null>();
  if (!pairs.length) return out;
  const classroomIds = [...new Set(pairs.map((p) => p.classroomId))];
  const dates = [...new Set(pairs.map((p) => p.date))].map(parseDateOnly);
  const [plans, records] = await Promise.all([
    prisma.lessonTopic.findMany({
      where: {
        date: { in: dates },
        schedule: { classroomId: { in: classroomIds } },
      },
      select: {
        date: true,
        title: true,
        testIds: true,
        schedule: { select: { classroomId: true, startMinute: true } },
      },
    }),
    prisma.lessonRecord.findMany({
      where: {
        classroomId: { in: classroomIds },
        date: { in: dates },
        cancelledAt: null,
      },
      select: { classroomId: true, date: true, topic: true, startMinute: true },
    }),
  ]);
  const testIds = [
    ...new Set(plans.filter((p) => !p.title?.trim()).flatMap((p) => p.testIds)),
  ];
  const tests = testIds.length
    ? await prisma.test.findMany({
        where: { id: { in: testIds } },
        select: { id: true, title: true },
      })
    : [];
  const testTitle = new Map(tests.map((t) => [t.id, t.title]));

  const byPair = new Map<string, { minute: number; topic: string | null }[]>();
  const push = (
    classroomId: string,
    date: Date,
    minute: number,
    topic: string | null,
  ) => {
    if (!topic) return;
    const k = pairKey(classroomId, date.toISOString().slice(0, 10));
    const list = byPair.get(k) ?? [];
    list.push({ minute, topic });
    byPair.set(k, list);
  };
  // Баталгаажсан бичлэгийн сэдэв эхэнд (resolveLessonTopic-ийн дараалал); бичлэггүй
  // эсвэл сэдэвгүй өдөрт төлөвлөгөөнөөс
  for (const r of records)
    push(
      r.classroomId,
      r.date,
      r.startMinute,
      resolveLessonTopic({ recordTopic: r.topic }),
    );
  const fromRecord = new Set(byPair.keys());
  for (const p of plans) {
    const k = pairKey(
      p.schedule.classroomId,
      p.date.toISOString().slice(0, 10),
    );
    if (fromRecord.has(k)) continue;
    push(
      p.schedule.classroomId,
      p.date,
      p.schedule.startMinute,
      resolveLessonTopic({
        planTitle: p.title,
        testTitles: p.testIds.map((id) => testTitle.get(id) ?? ''),
      }),
    );
  }
  for (const p of pairs) {
    const k = pairKey(p.classroomId, p.date);
    const list = (byPair.get(k) ?? []).sort((a, b) => a.minute - b.minute);
    const topics = [...new Set(list.map((x) => x.topic as string))];
    out.set(k, topics.length ? topics.join(', ') : null);
  }
  return out;
}

/** Даалгавар бүрт `lesson` шошго залгана (сурагчийн жагсаалт, багшийн шалгах дэлгэц) */
export async function withHomeworkLessons<
  T extends { classroomId: string; lessonDate?: Date | null; createdAt: Date },
>(prisma: Db, list: T[]): Promise<(T & { lesson: HomeworkLesson })[]> {
  const keys = list.map((a) => ({
    classroomId: a.classroomId,
    date: assignmentLessonKey(a),
  }));
  let topics = new Map<string, string | null>();
  try {
    topics = await loadLessonTopics(prisma, keys);
  } catch {
    // Сэдэв уншиж чадахгүй бол огноон шошгоор үргэлжилнэ — илгээлтийг хаахгүй
  }
  return list.map((a, i) => ({
    ...a,
    lesson: buildHomeworkLesson(
      keys[i].date,
      topics.get(pairKey(keys[i].classroomId, keys[i].date)) ?? null,
    ),
  }));
}

/**
 * Шинэ даалгаврын хичээлийн өдөр: `requested` (анхдагч нь өнөөдөр) хичээлтэй өдөр бол
 * тэр, үгүй бол түүнээс өмнөх хамгийн сүүлийн хичээл (ж: Мягмар үүсгэсэн → Даваагийн
 * хичээл). Хуваарьгүй/олдохгүй бол `requested` өөрөө.
 */
export async function resolveAssignmentLessonDate(
  prisma: PrismaService,
  classroomId: string,
  requested: string,
): Promise<string> {
  try {
    const { prev } = await loadPreviousLesson(
      prisma,
      classroomId,
      addDaysKey(requested, 1),
    );
    return prev ?? requested;
  } catch {
    return requested;
  }
}
