import { dateKey, parseDateOnly } from '../common/date';
import type { PrismaService } from '../prisma/prisma.service';
import { addDaysKey, previousLessonDate } from './board-logic';

/**
 * Ангийн `key` өдрөөс ӨМНӨХ хичээлийн өдөр (ӨС-ээс уншаад цэвэр previousLessonDate-ээр).
 * Онлайн гэрийн даалгаврын дүн ба «Илгээсэн» тоо хоёулаа ашиглана. `sessions` — тэр
 * хугацааны ClassTestSession (дуудагч дахин хэрэглэх бол).
 */
export async function loadPreviousLesson(
  prisma: PrismaService,
  classroomId: string,
  key: string,
) {
  const date = parseDateOnly(key);
  const lookFrom = parseDateOnly(addDaysKey(key, -35));
  const [patterns, sessions] = await Promise.all([
    prisma.classSchedule.findMany({
      where: {
        classroomId,
        effectiveFrom: { lte: date },
        OR: [{ effectiveTo: null }, { effectiveTo: { gte: lookFrom } }],
      },
      select: { id: true, weekday: true, effectiveFrom: true, effectiveTo: true },
    }),
    prisma.classTestSession.findMany({
      where: { classroomId, date: { gte: lookFrom, lt: date } },
      select: { date: true, testId: true },
    }),
  ]);
  const scheduleIds = patterns.map((p) => p.id);
  const [exceptions, holidays] = await Promise.all([
    scheduleIds.length
      ? prisma.scheduleException.findMany({
          where: { scheduleId: { in: scheduleIds } },
          select: { scheduleId: true, date: true, kind: true, newDate: true },
        })
      : Promise.resolve([]),
    prisma.academicCalendarDay.findMany({
      where: {
        date: { gte: lookFrom, lt: date },
        OR: [
          { classrooms: { none: {} } },
          { classrooms: { some: { classroomId } } },
        ],
      },
      select: { date: true },
    }),
  ]);
  const prev = previousLessonDate({
    date: key,
    patterns: patterns.map((p) => ({
      id: p.id,
      weekday: p.weekday,
      effectiveFrom: dateKey(p.effectiveFrom),
      effectiveTo: p.effectiveTo ? dateKey(p.effectiveTo) : null,
    })),
    exceptions: exceptions.map((e) => ({
      scheduleId: e.scheduleId,
      date: dateKey(e.date),
      kind: e.kind,
      newDate: e.newDate ? dateKey(e.newDate) : null,
    })),
    holidays: holidays.map((h) => dateKey(h.date)),
    sessionDates: [...new Set(sessions.map((s) => dateKey(s.date)))],
  });
  return { prev, sessions };
}
