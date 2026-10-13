import { Injectable, NotFoundException } from '@nestjs/common';
import { assertInternalTeachingStaff } from '../common/access';
import { PrismaService } from '../prisma/prisma.service';
import { assertManageableClass } from './exam-access';
import { mean, percentOf } from './exam-analytics';
import {
  attendanceCounts,
  classOverview,
  homeworkCounts,
  studentInClass,
  type ClassExamInput,
} from './class-overview';
import {
  EXAM_TEST_SELECT,
  loadStudentData,
  prepareExam,
  rosterOf,
  type RosterStudent,
} from './exam-data';

/** Ангид оноосон сүүлийн хэдэн шалгалтыг нэгтгэх */
const MAX_EXAMS = 20;
/** Ирц, даалгаврын цонх */
const WINDOW_DAYS = 30;

function since(days: number): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - days);
  return d;
}

/**
 * «Анги» таб (docs/v2/ANGI-TAB-TOLOVLOGOO.md). Багш — өөрийн анги, Багш+/Админ —
 * бүх анги (assertManageableClass). Тооцоо — class-overview.ts (цэвэр).
 * Шалгалт бүрт 1 тест + 4 query (loadStudentData) — дараалан (холболтын нөөц хэмнэнэ).
 */
@Injectable()
export class ClassOverviewService {
  constructor(private readonly prisma: PrismaService) {}

  private async access(classroomId: string, userId: string) {
    const role = await assertInternalTeachingStaff(this.prisma, userId);
    const classroom = await assertManageableClass(
      this.prisma,
      classroomId,
      userId,
      role,
    );
    const roster = await rosterOf(this.prisma, [classroomId]);
    return { classroom, roster };
  }

  private async loadExams(
    classroomId: string,
    roster: RosterStudent[],
  ): Promise<ClassExamInput[]> {
    const rows = await this.prisma.testAccess.findMany({
      where: { classroomId, test: { deletedAt: null, isDraft: false } },
      orderBy: { assignedAt: 'desc' },
      take: MAX_EXAMS,
      select: { assignedAt: true, test: { select: EXAM_TEST_SELECT } },
    });
    const ids = roster.map((s) => s.id);
    const out: ClassExamInput[] = [];
    for (const row of rows) {
      const exam = prepareExam(row.test);
      const data = await loadStudentData(this.prisma, exam, ids);
      out.push({
        testId: row.test.id,
        title: row.test.title,
        type: row.test.type,
        assignedAt: row.assignedAt,
        items: exam.items,
        topicsOf: exam.topicsOf,
        statementOf: (pid) => exam.rowBy.get(pid)?.problem.statementText ?? null,
        students: new Map(
          ids.map((id) => {
            const d = data.get(id);
            return [
              id,
              {
                result: d?.result
                  ? { total: d.result.totalScore, max: d.result.maxScore }
                  : null,
                absent: !!d?.absent,
                statuses: d?.statuses ?? null,
              },
            ];
          }),
        ),
      });
    }
    return out;
  }

  async overview(classroomId: string, userId: string) {
    const { classroom, roster } = await this.access(classroomId, userId);
    const ids = roster.map((s) => s.id);
    const from = since(WINDOW_DAYS);
    const [exams, attendance, homework] = await Promise.all([
      this.loadExams(classroomId, roster),
      this.prisma.attendance.findMany({
        where: { classroomId, studentId: { in: ids }, date: { gte: from } },
        select: { studentId: true, status: true },
      }),
      this.prisma.dailyHomeworkMark.findMany({
        where: { classroomId, studentId: { in: ids }, date: { gte: from } },
        select: { studentId: true, status: true },
      }),
    ]);
    return {
      classroom: { id: classroom.id, name: classroom.name },
      windowDays: WINDOW_DAYS,
      ...classOverview({ roster, exams, attendance, homework }),
    };
  }

  async student(classroomId: string, studentId: string, userId: string) {
    const { classroom, roster } = await this.access(classroomId, userId);
    const student = roster.find((s) => s.id === studentId);
    if (!student) throw new NotFoundException('Энэ ангид ийм сурагч алга');
    const from = since(WINDOW_DAYS);
    const [exams, attendance, homework] = await Promise.all([
      this.loadExams(classroomId, roster),
      this.prisma.attendance.findMany({
        where: { classroomId, studentId, date: { gte: from } },
        select: { date: true, status: true, note: true },
        orderBy: { date: 'desc' },
      }),
      this.prisma.dailyHomeworkMark.findMany({
        where: { classroomId, studentId, date: { gte: from } },
        select: { status: true },
      }),
    ]);
    const classAvgs = new Map(
      exams.map((exam) => {
        const percents = [...exam.students.values()]
          .map((s) =>
            s.result ? percentOf(s.result.total, s.result.max) : null,
          )
          .filter((v): v is number => v !== null);
        const avg = mean(percents);
        return [exam.testId, avg === null ? null : Math.round(avg)] as const;
      }),
    );
    return {
      classroom: { id: classroom.id, name: classroom.name },
      student: {
        id: student.id,
        firstName: student.firstName,
        lastName: student.lastName,
      },
      windowDays: WINDOW_DAYS,
      ...studentInClass(studentId, exams, classAvgs),
      attendance: {
        ...attendanceCounts(attendance.map((a) => a.status)),
        // Тасалсан/хоцорсон/чөлөөтэй өдрүүд л (ирсэн өдрийг жагсаахгүй)
        recent: attendance
          .filter((a) => a.status !== 'PRESENT')
          .slice(0, 10)
          .map((a) => ({
            date: a.date.toISOString().slice(0, 10),
            status: a.status,
            note: a.note,
          })),
      },
      homework: homeworkCounts(homework.map((h) => h.status)),
    };
  }
}
