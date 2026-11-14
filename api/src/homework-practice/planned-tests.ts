// Хуваарьт төлөвлөсөн тест = гэрийн даалгаврын эх (эзэн 2026-11-03): өмнө нь даалгавар зөвхөн
// хичээлийг БАТЛАХ (ClassTestSession) үед нээгддэг байв. Одоо хуваарийн «Орох тест»-ээр
// (LessonTopic.testIds) хичээл тарсны дараа шууд нээгдэнэ; батлагдсан бол батлагдсан нь давамгайлна.

import { addDaysKey } from '../attendance/board-logic';
import { dateKey, parseDateOnly } from '../common/date';
import type { PrismaService } from '../prisma/prisma.service';
import { toExceptionLite } from '../student-hub/lesson-days';
import {
  exceptionIndex,
  lessonDateOf,
  type ExceptionLite,
} from '../student-hub/student-hub.logic';

export interface PlannedTopic {
  scheduleId: string;
  classroomId: string;
  /** LessonTopic.date — хуваарийн АНХНЫ огноо */
  date: string;
  endMinute: number;
  testIds: string[];
}

export interface PlannedSession {
  classroomId: string;
  date: string;
  /** null = тэр өдөр төлөвлөсөн хичээл бий, гэхдээ тест одоохондоо нээгдээгүй (дараагийн хичээл олоход л хэрэгтэй) */
  testId: string | null;
}

/** УБ-ын одоогийн минут (шөнө дундаас хойш) */
export function ubMinuteNow(now: Date = new Date()): number {
  const ub = new Date(now.getTime() + 8 * 3600_000);
  return ub.getUTCHours() * 60 + ub.getUTCMinutes();
}

/**
 * Төлөвлөсөн тест даалгавар болох үед: хичээлийн өдөр өнгөрсөн, эсвэл өнөөдөр бөгөөд хичээл
 * тарсан (endMinute өнгөрсөн). Хичээл дуусаагүй байхад B хувилбар нээгдэхгүй (урьдчилан харахгүй).
 */
export function plannedAvailable(
  date: string,
  endMinute: number,
  todayKey: string,
  nowMinute: number,
): boolean {
  return date < todayKey || (date === todayKey && nowMinute >= endMinute);
}

/**
 * ЦЭВЭР: төлөвлөсөн сэдвүүдээс «хичээл болсон өдөр + тест» мөрүүд. Цуцалсан хичээл алгасагдана,
 * зөөсөн нь шинэ өдөр рүү шилжинэ. Нээгдээгүй (ирээдүй/дуусаагүй) өдөр testId=null тэмдэглэгээ.
 * Нөөцлөлт (ирээдүйд ангид бодогдох тестийг даалгавар болгохгүй) энд БИШ — хугацааны цонхгүй,
 * тусдаа асуулгаар (HomeworkPracticeService.plannedReserved).
 */
export function resolvePlanned(
  topics: readonly PlannedTopic[],
  exceptions: readonly ExceptionLite[],
  todayKey: string,
  nowMinute: number,
): PlannedSession[] {
  const index = exceptionIndex(exceptions);
  const sessions: PlannedSession[] = [];
  for (const t of topics) {
    if (!t.testIds.length) continue;
    const date = lessonDateOf(t.scheduleId, t.date, index);
    if (!date) continue;
    if (plannedAvailable(date, t.endMinute, todayKey, nowMinute))
      for (const testId of t.testIds)
        sessions.push({ classroomId: t.classroomId, date, testId });
    else sessions.push({ classroomId: t.classroomId, date, testId: null });
  }
  return sessions;
}

/** Анги бүрийн [fromKey, toKey] хоорондох төлөвлөсөн тестүүд (зөөлт ±14 хоногийг тооцно) */
export async function loadPlanned(
  prisma: Pick<PrismaService, 'lessonTopic' | 'scheduleException'>,
  classroomIds: string[],
  fromKey: string,
  toKey: string,
  todayKey: string,
  nowMinute: number = ubMinuteNow(),
) {
  if (!classroomIds.length) return [] as PlannedSession[];
  const range = {
    gte: parseDateOnly(addDaysKey(fromKey, -14)),
    lte: parseDateOnly(addDaysKey(toKey, 14)),
  };
  const rows = await prisma.lessonTopic.findMany({
    where: {
      deletedAt: null,
      date: range,
      testIds: { isEmpty: false },
      schedule: { deletedAt: null, classroomId: { in: classroomIds } },
    },
    select: {
      scheduleId: true,
      date: true,
      testIds: true,
      schedule: { select: { classroomId: true, endMinute: true } },
    },
  });
  if (!rows.length) return [] as PlannedSession[];
  const exceptions = await prisma.scheduleException.findMany({
    where: {
      deletedAt: null,
      date: range,
      scheduleId: { in: [...new Set(rows.map((r) => r.scheduleId))] },
    },
    select: { scheduleId: true, date: true, kind: true, newDate: true },
  });
  const sessions = resolvePlanned(
    rows.map((r) => ({
      scheduleId: r.scheduleId,
      classroomId: r.schedule.classroomId,
      date: dateKey(r.date),
      endMinute: r.schedule.endMinute,
      testIds: r.testIds,
    })),
    exceptions.map(toExceptionLite),
    todayKey,
    nowMinute,
  );
  return sessions.filter(
    (s) => s.date >= fromKey && s.date <= addDaysKey(toKey, 60),
  );
}
