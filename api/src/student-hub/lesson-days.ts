import { dateKey, parseDateOnly } from '../common/date';
import { ubDateKey } from '../attendance/board-logic';
import type { PrismaService } from '../prisma/prisma.service';
import type {
  ResolverException,
  ResolverSchedule,
} from '../schedule/week-resolver';
import {
  dayKey,
  lessonDaysByClass,
  resolveRange,
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

/**
 * Ирээдүйн [fromKey, toKey] хичээлийн өдрүүд — хуваарь (цуцалсан/зөөсөн exception-тэй)
 * ∪ төлөвлөсөн LessonTopic. Гэрийн даалгаврын зургийг урьдчилан илгээхэд (эзэн 2026-10-31).
 * Асуулга 2, нэг давалгаанд.
 */
export async function loadUpcomingDays(
  prisma: PrismaService,
  classes: StudentClass[],
  fromKey: string,
  toKey: string,
): Promise<Map<string, string[]>> {
  const out = new Map<string, string[]>();
  if (!classes.length || fromKey > toKey) return out;
  const ids = classes.map((c) => c.classroomId);
  const names = new Map(classes.map((c) => [c.classroomId, c.classroomName]));
  const from = parseDateOnly(fromKey);
  const to = parseDateOnly(toKey);
  const [rows, topics] = await Promise.all([
    prisma.classSchedule.findMany({
      where: {
        classroomId: { in: ids },
        effectiveFrom: { lte: to },
        OR: [{ effectiveTo: null }, { effectiveTo: { gte: from } }],
      },
      select: {
        id: true,
        classroomId: true,
        weekday: true,
        startMinute: true,
        endMinute: true,
        room: true,
        effectiveFrom: true,
        effectiveTo: true,
        exceptions: {
          where: {
            OR: [
              { date: { gte: from, lte: to } },
              { newDate: { gte: from, lte: to } },
            ],
          },
          select: { date: true, kind: true, newDate: true },
        },
      },
    }),
    prisma.lessonTopic.findMany({
      where: { date: { gte: from, lte: to }, schedule: { classroomId: { in: ids } } },
      select: { date: true, schedule: { select: { classroomId: true } } },
    }),
  ]);
  const schedules: ResolverSchedule[] = [];
  const exceptions: ResolverException[] = [];
  for (const r of rows) {
    schedules.push({
      id: r.id,
      classroomId: r.classroomId,
      classroomName: names.get(r.classroomId) ?? '',
      weekday: r.weekday,
      startMinute: r.startMinute,
      endMinute: r.endMinute,
      teacherId: null,
      teacherName: null,
      room: r.room,
      subject: null,
      effectiveFrom: dateKey(r.effectiveFrom),
      effectiveTo: r.effectiveTo ? dateKey(r.effectiveTo) : null,
    });
    for (const x of r.exceptions)
      exceptions.push({
        scheduleId: r.id,
        date: dateKey(x.date),
        kind: x.kind,
        newDate: x.newDate ? dateKey(x.newDate) : null,
        newStartMinute: null,
        newEndMinute: null,
        newRoom: null,
        note: null,
      });
  }
  const add = (classroomId: string, date: string) => {
    if (date < fromKey || date > toKey) return;
    const list = out.get(classroomId) ?? [];
    if (!list.includes(date)) list.push(date);
    out.set(classroomId, list);
  };
  for (const k of resolveRange(fromKey, toKey, schedules, exceptions).keys()) {
    const i = k.lastIndexOf('|');
    add(k.slice(0, i), k.slice(i + 1));
  }
  for (const t of topics) add(t.schedule.classroomId, dateKey(t.date));
  for (const list of out.values()) list.sort();
  return out;
}
