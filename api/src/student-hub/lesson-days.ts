import { dateKey, parseDateOnly } from '../common/date';
import { ubDateKey } from '../attendance/board-logic';
import type { PrismaService } from '../prisma/prisma.service';
import {
  dayKey,
  lessonDaysByClass,
  topicOf,
  visibleDay,
  type LessonDayEvidence,
} from './student-hub.logic';

export interface StudentClass {
  classroomId: string;
  classroomName: string;
  /** Ангид орсон өдөр (УБ) */
  joinedKey: string;
}

export interface LessonDaySet {
  classes: StudentClass[];
  /** Анги → хичээлийн БҮХ өдөр (өсөх, ≤ toKey) — D' олоход */
  byClass: Map<string, string[]>;
  /** Өөрийн ирцтэй «анги|огноо» */
  ownAttendance: Set<string>;
  /** «анги|огноо» → сэдэв (LessonRecord.topic → LessonTopic.title → Chapter.title) */
  topics: Map<string, string | null>;
}

/**
 * Сурагчийн ОДООГИЙН (leftAt null, архивлаагүй) ангиудын [fromKey, toKey] хичээлийн өдрүүд:
 * өөрийн Attendance ∪ LessonTopic ∪ ClassTestSession ∪ LessonRecord (цуцлаагүй). Асуулга 5
 * (сэдэвгүй бүлгийн нэр хэрэгтэй үед +1), хоёр давалгаанд (N+1 үгүй). homework-practice
 * (гэрийн даалгаврын зураг, /homework/my) ашиглана.
 */
export async function loadLessonDays(
  prisma: PrismaService,
  studentId: string,
  fromKey: string,
  toKey: string,
  classroomId?: string,
): Promise<LessonDaySet> {
  const range = { gte: parseDateOnly(fromKey), lte: parseDateOnly(toKey) };
  const [enrollments, attendance] = await Promise.all([
    prisma.enrollment.findMany({
      where: {
        studentId,
        leftAt: null,
        ...(classroomId ? { classroomId } : {}),
        classroom: { archived: false },
      },
      select: {
        classroomId: true,
        joinedAt: true,
        classroom: { select: { name: true } },
      },
      orderBy: { joinedAt: 'asc' },
    }),
    // note-ийг ХЭЗЭЭ Ч сонгохгүй
    prisma.attendance.findMany({
      where: {
        studentId,
        date: range,
        ...(classroomId ? { classroomId } : {}),
        classroom: { archived: false },
      },
      select: { classroomId: true, date: true },
    }),
  ]);
  const classes = uniqueClasses(enrollments);
  if (!classes.length)
    return {
      classes,
      byClass: new Map(),
      ownAttendance: new Set(),
      topics: new Map(),
    };
  const ids = classes.map((c) => c.classroomId);
  const [topics, sessions, records] = await Promise.all([
    prisma.lessonTopic.findMany({
      where: { date: range, schedule: { classroomId: { in: ids } } },
      // dismissMode-ийг ХЭЗЭЭ Ч сонгохгүй
      select: {
        date: true,
        title: true,
        chapterId: true,
        schedule: { select: { classroomId: true } },
      },
    }),
    prisma.classTestSession.findMany({
      where: { classroomId: { in: ids }, date: range },
      select: { classroomId: true, date: true },
    }),
    // description-ийг ХЭЗЭЭ Ч сонгохгүй
    prisma.lessonRecord.findMany({
      where: { classroomId: { in: ids }, date: range, cancelledAt: null },
      select: { classroomId: true, date: true, topic: true },
    }),
  ]);
  const current = new Set(ids);
  const own = attendance.filter((a) => current.has(a.classroomId));
  const evidence: LessonDayEvidence[] = [
    ...own.map((a) => ({ classroomId: a.classroomId, date: dateKey(a.date) })),
    ...topics.map((t) => ({
      classroomId: t.schedule.classroomId,
      date: dateKey(t.date),
    })),
    ...sessions.map((s) => ({
      classroomId: s.classroomId,
      date: dateKey(s.date),
    })),
    ...records.map((r) => ({
      classroomId: r.classroomId,
      date: dateKey(r.date),
    })),
  ];
  const blankChapters = [
    ...new Set(
      topics.flatMap((t) =>
        !t.title.trim() && t.chapterId ? [t.chapterId] : [],
      ),
    ),
  ];
  const chapters = blankChapters.length
    ? new Map(
        (
          await prisma.chapter.findMany({
            where: { id: { in: blankChapters } },
            select: { id: true, title: true },
          })
        ).map((c) => [c.id, c.title]),
      )
    : new Map<string, string>();
  const candidates = new Map<
    string,
    { rec: string[]; topic: string[]; chapter: string[] }
  >();
  const at = (k: string) => {
    let c = candidates.get(k);
    if (!c) {
      c = { rec: [], topic: [], chapter: [] };
      candidates.set(k, c);
    }
    return c;
  };
  for (const r of records)
    if (r.topic) at(dayKey(r.classroomId, dateKey(r.date))).rec.push(r.topic);
  for (const t of topics) {
    const c = at(dayKey(t.schedule.classroomId, dateKey(t.date)));
    c.topic.push(t.title);
    const ch = t.chapterId ? chapters.get(t.chapterId) : undefined;
    if (ch) c.chapter.push(ch);
  }
  const topicMap = new Map<string, string | null>();
  for (const [k, c] of candidates)
    topicMap.set(k, topicOf(...c.rec, ...c.topic, ...c.chapter));
  return {
    classes,
    topics: topicMap,
    byClass: lessonDaysByClass(evidence, toKey),
    ownAttendance: new Set(
      own.map((a) => dayKey(a.classroomId, dateKey(a.date))),
    ),
  };
}

/** Сурагчид харагдах хичээлийн өдрүүд (ангид орсноос хойш эсвэл өөрийн ирцтэй) */
export function visibleLessonDays(
  set: LessonDaySet,
  cls: StudentClass,
  fromKey: string,
): string[] {
  return (set.byClass.get(cls.classroomId) ?? []).filter(
    (d) =>
      d >= fromKey &&
      visibleDay(
        d,
        cls.joinedKey,
        set.ownAttendance.has(dayKey(cls.classroomId, d)),
      ),
  );
}

/** Нэг ангид хоёр идэвхтэй бичилт байвал эртнийхийг авна */
export function uniqueClasses(
  rows: { classroomId: string; joinedAt: Date; classroom: { name: string } }[],
): StudentClass[] {
  const out = new Map<string, StudentClass>();
  for (const r of [...rows].sort(
    (a, b) => a.joinedAt.getTime() - b.joinedAt.getTime(),
  ))
    if (!out.has(r.classroomId))
      out.set(r.classroomId, {
        classroomId: r.classroomId,
        classroomName: r.classroom.name,
        joinedKey: ubDateKey(r.joinedAt),
      });
  return [...out.values()];
}
