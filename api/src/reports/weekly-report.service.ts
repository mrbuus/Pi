import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Role } from '../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';

const UB_OFFSET_MS = 8 * 60 * 60 * 1000;
const QUERY_PAGE = 500;
const MAX_TOPIC_ATTEMPTS = 10_000;

export function mondayRange(week: string) {
  const [year, month, day] = week.split('-').map(Number);
  const start = new Date(Date.UTC(year, month - 1, day));
  if (start.toISOString().slice(0, 10) !== week || start.getUTCDay() !== 1) {
    throw new BadRequestException('Долоо хоногийн эхлэл Даваа гараг байх ёстой');
  }
  const end = new Date(start.getTime() + 7 * 86400000);
  return { start, end, instantStart: new Date(start.getTime() - UB_OFFSET_MS), instantEnd: new Date(end.getTime() - UB_OFFSET_MS) };
}
function dateKey(date: Date) { return date.toISOString().slice(0, 10); }
function ubDateKey(date: Date) { return new Date(date.getTime() + UB_OFFSET_MS).toISOString().slice(0, 10); }
function dateInside(date: Date, start: Date, end: Date) { return date >= start && date < end; }

@Injectable()
export class WeeklyReportService {
  constructor(private readonly prisma: PrismaService) {}

  async get(studentId: string, week: string, requester: { userId: string; role: Role }) {
    const { start, end, instantStart, instantEnd } = mondayRange(week);
    if (requester.role === Role.PARENT) {
      const link = await this.prisma.parentLink.findFirst({
        where: { parentId: requester.userId, studentId, verifiedAt: { not: null }, parent: { role: Role.PARENT, archivedAt: null }, student: { archivedAt: null } },
        select: { id: true },
      });
      if (!link) throw new ForbiddenException('Зөвхөн баталгаажсан хүүхдийн тайланг үзнэ');
    } else if (requester.role !== Role.ADMIN) throw new ForbiddenException();

    const student = await this.prisma.user.findFirst({ where: { id: studentId, role: Role.STUDENT, archivedAt: null }, select: { id: true, firstName: true, lastName: true } });
    if (!student) throw new NotFoundException('Сурагч олдсонгүй');
    const nextEnd = new Date(end.getTime() + 7 * 86400000);
    const instantNextEnd = new Date(instantEnd.getTime() + 7 * 86400000);
    const enrollments = await this.prisma.enrollment.findMany({
      where: { studentId, joinedAt: { lt: instantEnd }, OR: [{ leftAt: null }, { leftAt: { gte: instantStart } }], classroom: { archived: false } },
      select: { classroomId: true, joinedAt: true, leftAt: true, classroom: { select: { name: true } } },
    });
    const nextEnrollments = await this.prisma.enrollment.findMany({
      where: { studentId, joinedAt: { lt: instantNextEnd }, OR: [{ leftAt: null }, { leftAt: { gte: instantEnd } }], classroom: { archived: false } },
      select: { classroomId: true, joinedAt: true, leftAt: true, classroom: { select: { name: true } } },
    });
    const classroomIds = [...new Set(enrollments.map((entry) => entry.classroomId))];
    const nextClassroomIds = [...new Set(nextEnrollments.map((entry) => entry.classroomId))];
    const attendanceWhere = { studentId, date: { gte: start, lt: end }, classroomId: { in: classroomIds } };
    const attemptWhere = { studentId, createdAt: { gte: instantStart, lt: instantEnd }, problem: { deletedAt: null } };
    const assignmentWhere = { classroomId: { in: classroomIds }, deletedAt: null, dueDate: { gte: instantStart, lt: instantEnd } };

    const [attendance, results, assignmentCount, marks, classTests, topicAttemptCount, practiceCount, resultCount, classTestCount] = await Promise.all([
      this.prisma.attendance.findMany({ where: attendanceWhere, select: { date: true, status: true } }),
      this.prisma.testResult.findMany({ where: { studentId, createdAt: { gte: instantStart, lt: instantEnd }, test: { deletedAt: null, isDraft: false } }, include: { test: { select: { title: true } } }, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }], take: 500 }),
      this.prisma.assignment.count({ where: assignmentWhere }),
      this.prisma.dailyHomeworkMark.findMany({ where: { studentId, classroomId: { in: classroomIds }, date: { gte: start, lt: end } }, select: { classroomId: true, date: true, status: true } }),
      this.prisma.classTestSession.findMany({ where: { classroomId: { in: classroomIds }, date: { gte: start, lt: end } }, select: { classroomId: true, testId: true, manualTitle: true, date: true }, orderBy: [{ date: 'asc' }, { id: 'asc' }], take: 500 }),
      this.prisma.attempt.count({ where: attemptWhere }),
      this.prisma.attempt.count({ where: { ...attemptWhere, testId: null } }),
      this.prisma.testResult.count({ where: { studentId, createdAt: { gte: instantStart, lt: instantEnd }, test: { deletedAt: null, isDraft: false } } }),
      this.prisma.classTestSession.count({ where: { classroomId: { in: classroomIds }, date: { gte: start, lt: end } } }),
    ]);

    const assignments: Array<{ id: string; title: string; dueDate: Date | null; createdAt: Date; classroomId: string; submissions: Array<{ state: string }> }> = [];
    let assignmentCursor: string | undefined;
    while (assignments.length < assignmentCount) {
      const page = await this.prisma.assignment.findMany({ where: assignmentWhere, select: { id: true, title: true, dueDate: true, createdAt: true, classroomId: true, submissions: { where: { studentId }, select: { state: true } } }, orderBy: { id: 'asc' }, take: Math.min(QUERY_PAGE, assignmentCount - assignments.length), ...(assignmentCursor ? { cursor: { id: assignmentCursor }, skip: 1 } : {}) });
      if (!page.length) break;
      assignments.push(...page);
      assignmentCursor = page[page.length - 1].id;
    }

    const attempts: Array<{ id: string; testId: string | null; autoCorrect: boolean | null; problem: { analysis: { topic: string } | null } }> = [];
    let attemptCursor: string | undefined;
    while (attempts.length < Math.min(topicAttemptCount, MAX_TOPIC_ATTEMPTS)) {
      const page = await this.prisma.attempt.findMany({ where: attemptWhere, select: { id: true, testId: true, autoCorrect: true, problem: { select: { analysis: { select: { topic: true } } } } }, orderBy: { id: 'asc' }, take: Math.min(QUERY_PAGE, MAX_TOPIC_ATTEMPTS - attempts.length), ...(attemptCursor ? { cursor: { id: attemptCursor }, skip: 1 } : {}) });
      if (!page.length) break;
      attempts.push(...page);
      attemptCursor = page[page.length - 1].id;
    }
    const topicComplete = attempts.length >= topicAttemptCount;

    const eligibleClassTests = classTests.filter((session) => enrollments.some((enrollment) => enrollment.classroomId === session.classroomId && ubDateKey(enrollment.joinedAt) <= dateKey(session.date) && (!enrollment.leftAt || ubDateKey(enrollment.leftAt) >= dateKey(session.date))));
    const testIds = [...new Set(eligibleClassTests.map((test) => test.testId).filter((id): id is string => Boolean(id)))];
    const classTestTitles: Array<{ id: string; title: string }> = testIds.length ? await this.prisma.test.findMany({ where: { id: { in: testIds }, deletedAt: null, isDraft: false }, select: { id: true, title: true } }) : [];
    const publishedTestIds = classTestTitles.map((test) => test.id);
    const classTestResultWhere = { studentId, testId: { in: publishedTestIds }, createdAt: { gte: instantStart, lt: instantEnd }, test: { deletedAt: null, isDraft: false } };
    const [classTestResults, classTestResultCount] = publishedTestIds.length ? await Promise.all([
      this.prisma.testResult.findMany({ where: classTestResultWhere, select: { id: true, testId: true, totalScore: true, maxScore: true, createdAt: true }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: 500 }),
      this.prisma.testResult.count({ where: classTestResultWhere }),
    ]) : [[], 0];
    const sessionTestIds = new Set(testIds);
    const reportTests = eligibleClassTests.map((session) => {
      const testId = session.testId;
      const result = testId ? classTestResults.find((item) => item.testId === testId && ubDateKey(item.createdAt) === dateKey(session.date)) : undefined;
      return { title: session.manualTitle ?? classTestTitles.find((item) => item.id === testId)?.title ?? 'Ангийн тест', score: result?.totalScore ?? null, maxScore: result?.maxScore ?? null, createdAt: session.date };
    });
    for (const result of results) if (!sessionTestIds.has(result.testId)) reportTests.push({ title: result.test.title, score: result.totalScore, maxScore: result.maxScore, createdAt: result.createdAt });

    const topicCounts = new Map<string, { total: number; correct: number }>();
    for (const attempt of attempts) {
      const topic = attempt.problem.analysis?.topic;
      if (!topic || attempt.autoCorrect === null) continue;
      const row = topicCounts.get(topic) ?? { total: 0, correct: 0 };
      row.total++;
      if (attempt.autoCorrect) row.correct++;
      topicCounts.set(topic, row);
    }
    const rankedTopics = [...topicCounts].map(([topic, counts]) => ({ topic, ...counts, rate: counts.correct / counts.total })).sort((a, b) => b.rate - a.rate || b.total - a.total);
    const assignmentItems = assignments.filter((assignment) => enrollments.some((enrollment) => enrollment.classroomId === assignment.classroomId && enrollment.joinedAt <= assignment.createdAt && (!enrollment.leftAt || enrollment.leftAt >= assignment.createdAt))).map((assignment) => ({ title: assignment.title, dueDate: assignment.dueDate, done: ['DONE_ONLINE', 'DONE_IN_CLASS'].includes(assignment.submissions[0]?.state ?? '') }));

    const schedules = nextClassroomIds.length ? await this.prisma.classSchedule.findMany({
      where: { classroomId: { in: nextClassroomIds } },
      select: { id: true, classroomId: true, weekday: true, startMinute: true, endMinute: true, effectiveFrom: true, effectiveTo: true, room: true, exceptions: { where: { OR: [{ date: { gte: end, lt: nextEnd } }, { newDate: { gte: end, lt: nextEnd } }] }, select: { date: true, kind: true, newDate: true, newStartMinute: true, newEndMinute: true, newRoom: true } } },
    }) : [];
    const scheduled = new Map<string, { date: string; startMinute: number; endMinute: number; room: string | null; classroom: string }>();
    const scheduleIsEffective = (schedule: (typeof schedules)[number], occurrenceDate: Date) => {
      const occurrenceKey = dateKey(occurrenceDate);
      const effectiveStart = dateKey(schedule.effectiveFrom);
      const effectiveEnd = schedule.effectiveTo ? dateKey(schedule.effectiveTo) : null;
      return occurrenceKey >= effectiveStart && (!effectiveEnd || occurrenceKey <= effectiveEnd);
    };
    const addOccurrence = (schedule: (typeof schedules)[number], occurrenceDate: Date, startMinute: number, endMinute: number, room: string | null, moved = false) => {
      const occurrenceKey = dateKey(occurrenceDate);
      if (!moved && !scheduleIsEffective(schedule, occurrenceDate)) return;
      const enrollment = nextEnrollments.find((entry) => entry.classroomId === schedule.classroomId && ubDateKey(entry.joinedAt) <= occurrenceKey && (!entry.leftAt || ubDateKey(entry.leftAt) >= occurrenceKey));
      if (!enrollment) return;
      const classroom = enrollment.classroom.name;
      const key = `${schedule.classroomId}:${occurrenceKey}:${startMinute}:${endMinute}`;
      scheduled.set(key, { date: occurrenceKey, startMinute, endMinute, room, classroom });
    };
    for (const schedule of schedules) {
      const exceptions = new Map(schedule.exceptions.map((item) => [dateKey(item.date), item]));
      for (let offset = 0; offset < 7; offset++) {
        const day = new Date(end.getTime() + offset * 86400000);
        if (day.getUTCDay() !== schedule.weekday) continue;
        const exception = exceptions.get(dateKey(day));
        if (exception?.kind === 'CANCELLED') continue;
        if (exception?.kind === 'MOVED') {
          if (scheduleIsEffective(schedule, day) && exception.newDate && dateInside(exception.newDate, end, nextEnd)) addOccurrence(schedule, exception.newDate, exception.newStartMinute ?? schedule.startMinute, exception.newEndMinute ?? schedule.endMinute, exception.newRoom ?? schedule.room, true);
          continue;
        }
        addOccurrence(schedule, day, schedule.startMinute, schedule.endMinute, schedule.room);
      }
      for (const exception of schedule.exceptions) {
        if (exception.kind === 'MOVED' && scheduleIsEffective(schedule, exception.date) && exception.newDate && dateInside(exception.newDate, end, nextEnd) && !dateInside(exception.date, end, nextEnd)) {
          addOccurrence(schedule, exception.newDate, exception.newStartMinute ?? schedule.startMinute, exception.newEndMinute ?? schedule.endMinute, exception.newRoom ?? schedule.room, true);
        }
      }
    }
    const scheduleItems = [...scheduled.values()].sort((a, b) => a.date.localeCompare(b.date) || a.startMinute - b.startMinute);
    const dailyMarks = {
      done: marks.filter((item) => item.status === 'DONE' && enrollments.some((enrollment) => enrollment.classroomId === item.classroomId && ubDateKey(enrollment.joinedAt) <= dateKey(item.date) && (!enrollment.leftAt || ubDateKey(enrollment.leftAt) >= dateKey(item.date)))).length,
      partial: marks.filter((item) => item.status === 'PARTIAL' && enrollments.some((enrollment) => enrollment.classroomId === item.classroomId && ubDateKey(enrollment.joinedAt) <= dateKey(item.date) && (!enrollment.leftAt || ubDateKey(enrollment.leftAt) >= dateKey(item.date)))).length,
      notDone: marks.filter((item) => item.status === 'NOT_DONE' && enrollments.some((enrollment) => enrollment.classroomId === item.classroomId && ubDateKey(enrollment.joinedAt) <= dateKey(item.date) && (!enrollment.leftAt || ubDateKey(enrollment.leftAt) >= dateKey(item.date)))).length,
      unmarked: marks.filter((item) => item.status === null && enrollments.some((enrollment) => enrollment.classroomId === item.classroomId && ubDateKey(enrollment.joinedAt) <= dateKey(item.date) && (!enrollment.leftAt || ubDateKey(enrollment.leftAt) >= dateKey(item.date)))).length,
    };
    return {
      student,
      week: { start: week, end: new Date(end.getTime() - 86400000).toISOString().slice(0, 10) },
      attendance: { present: attendance.filter((item) => item.status === 'PRESENT' || item.status === 'LATE').length, absent: attendance.filter((item) => item.status === 'ABSENT').length, excused: attendance.filter((item) => item.status === 'EXCUSED').length },
      tests: reportTests,
      testResultsComplete: resultCount <= 500 && classTestCount <= 500 && classTestResultCount <= 500,
      testResultLimit: resultCount > 500 || classTestCount > 500 || classTestResultCount > 500 ? 500 : null,
      snapshotAt: new Date().toISOString(),
      practiceCount,
      homework: { assignments: { done: assignmentItems.filter((item) => item.done).length, notDone: assignmentItems.filter((item) => !item.done).length, items: assignmentItems }, dailyMarks },
      topics: { best: rankedTopics[0] ?? null, weakest: rankedTopics.length ? rankedTopics[rankedTopics.length - 1] : null, complete: topicComplete, sampleLimit: topicComplete ? null : MAX_TOPIC_ATTEMPTS },
      nextWeekSchedule: scheduleItems,
    };
  }
}
