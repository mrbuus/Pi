import { Injectable } from '@nestjs/common';
import { dateKey, parseDateOnly, todayUB } from '../common/date';
import { loadPlanned } from '../homework-practice/planned-tests';
import { addDaysKey } from './board-logic';
import { Role } from '../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import { AttendanceService } from './attendance.service';
import { summarizeDay } from './day-summary.logic';

/**
 * GET /attendance/day-summary?date= — «Ангиуд» хуудасны «Өнөөдөр» тойм (эзэн
 * 2026-10-31): тухайн өдөр хичээлтэй анги бүрийн ирц, даалгаврын тоо НЭГ
 * дуудлагаар. Ангиуд, эрх нь ирцийн самбарын жагсаалттай ЯГ ижил (boardClasses).
 */
@Injectable()
export class AttendanceDaySummaryService {
  constructor(
    private prisma: PrismaService,
    private attendance: AttendanceService,
  ) {}

  async daySummary(dateStr: string, userId: string, role: Role) {
    const { date: key, classes } = await this.attendance.boardClasses(dateStr, userId, role);
    if (!classes.length) return { date: key, classes: [] };
    const ids = classes.map((c) => c.id);
    const date = parseDateOnly(key);
    const [enrolled, attendance, homework, records] = await Promise.all([
      this.prisma.enrollment.findMany({
        where: { classroomId: { in: ids }, leftAt: null, student: { archivedAt: null } },
        select: { classroomId: true, studentId: true },
      }),
      this.prisma.attendance.findMany({
        where: { classroomId: { in: ids }, date },
        select: { classroomId: true, studentId: true, status: true },
      }),
      this.prisma.dailyHomeworkMark.findMany({
        where: { classroomId: { in: ids }, date, status: { not: null } },
        select: { classroomId: true, studentId: true, status: true },
      }),
      this.prisma.lessonRecord.findMany({
        where: { classroomId: { in: ids }, date, cancelledAt: null },
        select: { scheduleId: true },
      }),
    ]);
    const [online, theory] = await Promise.all([
      this.onlineByClass(ids, key, enrolled),
      this.theoryByClass(ids, date),
    ]);
    return {
      date: key,
      classes: summarizeDay(
        classes,
        enrolled,
        attendance,
        homework,
        new Set(records.map((r) => r.scheduleId)),
      ).map((c) => ({
        ...c,
        online: online.get(c.id) ?? null,
        theory: theory.get(c.id) ?? { assigned: false, sent: 0 },
      })),
    };
  }

  /** Тухайн өдрийн онолын зураг: томилогдсон сурагч байгаа эсэх, илгээсэн багцын тоо (эзэн 2026-11-03) */
  private async theoryByClass(ids: string[], date: Date) {
    const [topics, photos] = await Promise.all([
      this.prisma.lessonTopic.findMany({
        where: { date, photoStudentId: { not: null }, schedule: { classroomId: { in: ids } } },
        select: { schedule: { select: { classroomId: true } } },
      }),
      this.prisma.lessonPhoto.findMany({
        where: { date, classroomId: { in: ids } },
        select: { classroomId: true, imageKeys: true },
      }),
    ]);
    const out = new Map<string, { assigned: boolean; sent: number }>();
    const at = (id: string) => {
      let v = out.get(id);
      if (!v) out.set(id, (v = { assigned: false, sent: 0 }));
      return v;
    };
    for (const t of topics) at(t.schedule.classroomId).assigned = true;
    for (const p of photos) if (p.imageKeys.length) at(p.classroomId).sent += 1;
    return out;
  }

  /**
   * Анги бүрийн ОНЛАЙН даалгаврын явц (эзэн 2026-11-03): өдрөөс өмнөх хамгийн сүүлийн тесттэй
   * хичээл (батлагдсан эсвэл хуваарьт төлөвлөсөн) — онлайнаар илгээсэн сурагчийн тоо, дэвтрийн
   * зураг илгээсэн тоо, зөв/нийт бодлого. Нийт 4 асуулга (анги тутам биш).
   */
  private async onlineByClass(
    ids: string[],
    key: string,
    enrolled: { classroomId: string; studentId: string }[],
  ) {
    const out = new Map<
      string,
      { date: string; submitted: number; photos: number; correct: number; total: number }
    >();
    const from = addDaysKey(key, -35);
    const before = addDaysKey(key, -1);
    const [real, planned] = await Promise.all([
      this.prisma.classTestSession.findMany({
        where: {
          classroomId: { in: ids },
          testId: { not: null },
          date: { gte: parseDateOnly(from), lte: parseDateOnly(before) },
        },
        select: { classroomId: true, date: true },
      }),
      loadPlanned(this.prisma, ids, from, before, dateKey(todayUB())),
    ]);
    const latest = new Map<string, string>();
    const note = (classroomId: string, date: string) => {
      if (date < from || date > before) return;
      if ((latest.get(classroomId) ?? '') < date) latest.set(classroomId, date);
    };
    for (const r of real) note(r.classroomId, dateKey(r.date));
    for (const s of planned) if (s.testId) note(s.classroomId, s.date);
    if (!latest.size) return out;
    const pairs = [...latest].map(([classroomId, date]) => ({
      classroomId,
      lessonDate: parseDateOnly(date),
    }));
    const [attempts, photos] = await Promise.all([
      this.prisma.homeworkAttempt.findMany({
        where: { status: 'SUBMITTED', OR: pairs },
        select: { classroomId: true, studentId: true, score: true, total: true },
      }),
      this.prisma.homeworkPhoto.findMany({
        where: { deletedAt: null, OR: pairs },
        select: { classroomId: true, studentId: true },
      }),
    ]);
    const current = new Set(enrolled.map((e) => `${e.classroomId}|${e.studentId}`));
    for (const [classroomId, date] of latest) {
      const mine = (r: { classroomId: string; studentId: string }) =>
        r.classroomId === classroomId && current.has(`${r.classroomId}|${r.studentId}`);
      const a = attempts.filter(mine);
      out.set(classroomId, {
        date,
        submitted: new Set(a.map((x) => x.studentId)).size,
        photos: new Set(photos.filter(mine).map((x) => x.studentId)).size,
        correct: a.reduce((t, x) => t + (x.score ?? 0), 0),
        total: a.reduce((t, x) => t + (x.total ?? 0), 0),
      });
    }
    return out;
  }
}
