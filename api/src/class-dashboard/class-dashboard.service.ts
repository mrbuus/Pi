import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { Role } from '../generated/prisma/enums';
import { assertInternalTeachingStaff } from '../common/access';
import { classTeacherWhere } from '../common/class-teachers';
import { addDateDays, dateKey, parseDateOnly } from '../common/date';
import { markPlus, teacherPlusIds } from '../common/teacher-plus';
import { withPlus } from '../revisions/revision-snapshot';
import { mean, percentOf } from '../exams/exam-analytics';
import {
  classOverview,
  studentInClass,
  type ClassExamInput,
} from '../exams/class-overview';
import {
  EXAM_TEST_SELECT,
  loadStudentData,
  prepareExam,
  rosterOf,
  type RosterStudent,
} from '../exams/exam-data';
import { PrismaService } from '../prisma/prisma.service';
import { StaffCapabilityService } from '../staff-capabilities/staff-capability.service';
import {
  BEHAVIOR_FLAGS,
  cleanFlagNote,
  isBehaviorFlagKind,
  isConcernFlag,
} from './behavior-flags';
import {
  attendanceCredit,
  attendancePercent,
  homeworkCredit,
  homeworkPercent,
  laggingTopics,
  makeupOwed,
  monthKeyUB,
  paymentState,
  riskFlags,
  schoolYearStartMonth,
  scoreBins,
  weeklyRates,
  type AttendanceStatus,
  type HomeworkStatus,
  type PaymentState,
} from './class-dashboard.logic';
import {
  classMonthStats,
  lessonDaysOf,
  monthExamSummary,
  monthWeeks,
  monthWindow,
  MONTH_RE,
  shiftMonth,
  studentMonthStats,
  ubDay,
  type IndependentDay,
  type StudentMonthStats,
} from './class-month.logic';
import { loadClassCoverage } from './class-coverage.data';
import { ROADMAP_BOOK_CODES } from '../class-sessions/roadmap.logic';
import {
  COMPETENCY_V0,
  competencyTrend,
  computeCompetency,
  trendChange,
  type CompetencyInput,
} from './competency-score';

const DAY = 86_400_000;
/** Ирц/даалгаврын «одоогийн» цонх (хүснэгтийн %) */
const RECENT_DAYS = 30;
/** Чадамжийн хандлага (8 долоо хоног) + гулсах цонх (8 долоо хоног) */
const HISTORY_DAYS = 7 * 8 + COMPETENCY_V0.windowDays;
/** Бие даасан бодлогын «одоогийн» цонх */
const PRACTICE_DAYS = 14;
/** Нөхөх хичээл тооцох батлагдсан хичээлийн цонх */
const MAKEUP_DAYS = 60;
const MAX_EXAMS = 20;
/** Энгийн багш саяхан ахлах/туслахаар орсон бол тэр ангийг харна */
const STAFFING_DAYS = 60;

function daysAgo(days: number): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return new Date(d.getTime() - days * DAY);
}

// role өгсөн бөгөөд Багш+ бол «+» (эзэн 2026-10-23). actorName-ийн snapshot-д role өгөхгүй.
const fullName = (u: { firstName: string; lastName: string; role?: string | null } | null) =>
  u ? withPlus(`${u.lastName} ${u.firstName}`.trim(), u.role) : null;

type Actor = { userId: string; role: Role };

@Injectable()
export class ClassDashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly caps: StaffCapabilityService,
  ) {}

  // ───────────────────────── Эрх ─────────────────────────

  private async actor(userId: string): Promise<Actor> {
    const role = await assertInternalTeachingStaff(this.prisma, userId);
    return { userId, role };
  }

  private managesAll(role: Role) {
    return role === Role.ADMIN || role === Role.TEACHER_PLUS;
  }

  /**
   * Энгийн багшийн харах ангиуд: ангийн багш эсвэл туслах ангийн багш
   * (Classroom.teacherId / assistantTeacherId), идэвхтэй хуваарийн багш
   * (ClassSchedule.teacherId), сүүлийн 60 хоногт ахлах/туслах (LessonStaffing).
   * Багш+/Админ — бүх анги ('ALL').
   */
  async visibleClassIds(actor: Actor): Promise<string[] | 'ALL'> {
    // Эзэн 2026-10-22: Багш ч бүх ангийг харна (засах эрх managesAll хэвээр)
    if (this.managesAll(actor.role) || actor.role === Role.TEACHER) return 'ALL';
    const today = daysAgo(0);
    const [own, schedules, staffing] = await Promise.all([
      this.prisma.classroom.findMany({
        where: { ...classTeacherWhere(actor.userId), archived: false },
        select: { id: true },
      }),
      this.prisma.classSchedule.findMany({
        where: {
          teacherId: actor.userId,
          OR: [{ effectiveTo: null }, { effectiveTo: { gte: today } }],
        },
        select: { classroomId: true },
      }),
      this.prisma.lessonStaffing.findMany({
        where: {
          date: { gte: daysAgo(STAFFING_DAYS) },
          OR: [
            { leadTeacherId: actor.userId },
            { assistantTeacherId: actor.userId },
          ],
        },
        select: { schedule: { select: { classroomId: true } } },
      }),
    ]);
    return [
      ...new Set([
        ...own.map((c) => c.id),
        ...schedules.map((s) => s.classroomId),
        ...staffing.map((s) => s.schedule.classroomId),
      ]),
    ];
  }

  private async assertClass(classroomId: string, actor: Actor) {
    const classroom = await this.prisma.classroom.findUnique({
      where: { id: classroomId },
      select: {
        id: true,
        name: true,
        type: true,
        grade: true,
        archived: true,
        progressChapterId: true,
        subject: true,
        teacher: {
          select: { id: true, firstName: true, lastName: true, role: true },
        },
        assistantTeacher: {
          select: { id: true, firstName: true, lastName: true, role: true },
        },
      },
    });
    if (!classroom || classroom.archived)
      throw new NotFoundException('Анги олдсонгүй');
    const visible = await this.visibleClassIds(actor);
    if (visible !== 'ALL' && !visible.includes(classroomId))
      throw new ForbiddenException('Энэ ангийн самбарыг харах эрхгүй');
    return classroom;
  }

  private async canSeeMoney(userId: string): Promise<boolean> {
    return this.caps.has(userId, 'finance.manage').catch(() => false);
  }

  // ───────────────────────── Төлбөр ─────────────────────────

  private async paymentStates(
    studentIds: string[],
  ): Promise<Map<string, { state: PaymentState; tuitionAmount: number | null; paidThisMonth: number }>> {
    const out = new Map<
      string,
      { state: PaymentState; tuitionAmount: number | null; paidThisMonth: number }
    >();
    if (studentIds.length === 0) return out;
    const month = monthKeyUB();
    const yearStart = schoolYearStartMonth(month);
    const [profiles, payments] = await Promise.all([
      this.prisma.studentProfile.findMany({
        where: { userId: { in: studentIds } },
        select: { userId: true, tuitionAmount: true, tuitionPlan: true },
      }),
      this.prisma.payment.findMany({
        where: {
          userId: { in: studentIds },
          status: { in: ['CONFIRMED', 'PENDING'] },
          storePurchaseId: null,
          forMonth: { gte: yearStart },
        },
        select: { userId: true, amount: true, status: true, forMonth: true },
      }),
    ]);
    const profileBy = new Map(profiles.map((p) => [p.userId, p]));
    const agg = new Map<string, { month: number; year: number; pending: number }>();
    for (const p of payments) {
      const a = agg.get(p.userId) ?? { month: 0, year: 0, pending: 0 };
      if (p.status === 'CONFIRMED') {
        a.year += p.amount;
        if (p.forMonth === month) a.month += p.amount;
      } else if (p.forMonth === month) a.pending += p.amount;
      agg.set(p.userId, a);
    }
    for (const id of studentIds) {
      const prof = profileBy.get(id);
      const a = agg.get(id) ?? { month: 0, year: 0, pending: 0 };
      out.set(id, {
        state: paymentState({
          plan: prof?.tuitionPlan ?? null,
          tuitionAmount: prof?.tuitionAmount ?? null,
          confirmedThisMonth: a.month,
          confirmedThisYear: a.year,
          pendingThisMonth: a.pending,
        }),
        tuitionAmount: prof?.tuitionAmount ?? null,
        paidThisMonth: a.month,
      });
    }
    return out;
  }

  private static paymentSummary(
    states: Iterable<{ state: PaymentState }>,
  ): Record<PaymentState, number> {
    const s: Record<PaymentState, number> = { PAID: 0, PARTIAL: 0, PENDING: 0, NONE: 0 };
    for (const v of states) s[v.state] += 1;
    return s;
  }

  // ───────────────────────── Жагсаалт ─────────────────────────

  /** Ангийн жагсаалт + карт бүрийн эрүүл мэндийн дохио. Нэг удаагийн ~10 query. */
  async list(userId: string) {
    const actor = await this.actor(userId);
    const visible = await this.visibleClassIds(actor);
    const money = await this.canSeeMoney(userId);
    const classrooms = await this.prisma.classroom.findMany({
      where: {
        archived: false,
        ...(visible === 'ALL' ? {} : { id: { in: visible } }),
      },
      select: {
        id: true,
        name: true,
        type: true,
        grade: true,
        // avatarUrl = багшийн ӨӨРИЙН профайл зураг (нүүрний/маркетингийн зураг биш)
        teacher: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
            role: true,
          },
        },
        assistantTeacher: {
          select: { id: true, firstName: true, lastName: true, role: true },
        },
      },
      orderBy: { name: 'asc' },
    });
    const classIds = classrooms.map((c) => c.id);
    const enrollments = classIds.length
      ? await this.prisma.enrollment.findMany({
          where: {
            classroomId: { in: classIds },
            leftAt: null,
            student: { archivedAt: null },
          },
          select: { classroomId: true, studentId: true },
        })
      : [];
    const studentIds = [...new Set(enrollments.map((e) => e.studentId))];
    const from = daysAgo(RECENT_DAYS);
    const today = daysAgo(0);
    const [att, hw, access, flags, lessons, schedules] = await Promise.all([
      this.prisma.attendance.groupBy({
        by: ['classroomId', 'studentId', 'status'],
        where: { classroomId: { in: classIds }, date: { gte: from } },
        _count: { _all: true },
      }),
      this.prisma.dailyHomeworkMark.groupBy({
        by: ['classroomId', 'studentId', 'status'],
        where: { classroomId: { in: classIds }, date: { gte: from } },
        _count: { _all: true },
      }),
      this.prisma.testAccess.findMany({
        where: {
          classroomId: { in: classIds },
          test: { deletedAt: null, isDraft: false },
        },
        select: { testId: true, classroomId: true, assignedAt: true },
      }),
      this.prisma.studentBehaviorFlag.findMany({
        where: { studentId: { in: studentIds }, removedAt: null },
        select: { studentId: true, kind: true },
      }),
      this.prisma.lessonRecord.findMany({
        where: { classroomId: { in: classIds }, cancelledAt: null },
        orderBy: { date: 'desc' },
        distinct: ['classroomId'],
        select: { classroomId: true, date: true, topic: true },
      }),
      this.prisma.classSchedule.findMany({
        where: {
          classroomId: { in: classIds },
          OR: [{ effectiveTo: null }, { effectiveTo: { gte: today } }],
          teacherId: { not: null },
        },
        select: {
          classroomId: true,
          teacher: { select: { firstName: true, lastName: true, role: true } },
        },
      }),
    ]);
    const results = access.length
      ? await this.prisma.testResult.findMany({
          where: {
            testId: { in: [...new Set(access.map((a) => a.testId))] },
            studentId: { in: studentIds },
          },
          select: { testId: true, studentId: true, totalScore: true, maxScore: true },
        })
      : [];
    const payments = money ? await this.paymentStates(studentIds) : null;

    // Сурагч × анги түвшний түр бүтэц
    const key = (c: string, s: string) => `${c}|${s}`;
    const attBy = new Map<string, { status: string; n: number }[]>();
    for (const r of att) {
      const k = key(r.classroomId, r.studentId);
      attBy.set(k, [...(attBy.get(k) ?? []), { status: r.status, n: r._count._all }]);
    }
    const hwBy = new Map<string, { status: string | null; n: number }[]>();
    for (const r of hw) {
      const k = key(r.classroomId, r.studentId);
      hwBy.set(k, [...(hwBy.get(k) ?? []), { status: r.status, n: r._count._all }]);
    }
    const accessBy = new Map<string, { testId: string; at: number }[]>();
    for (const a of access)
      accessBy.set(a.classroomId, [
        ...(accessBy.get(a.classroomId) ?? []),
        { testId: a.testId, at: a.assignedAt.getTime() },
      ]);
    const resultBy = new Map(
      results.map((r) => [
        `${r.testId}|${r.studentId}`,
        percentOf(r.totalScore, r.maxScore),
      ]),
    );
    const concernBy = new Set(
      flags.filter((f) => isConcernFlag(f.kind)).map((f) => f.studentId),
    );
    const lessonBy = new Map(lessons.map((l) => [l.classroomId, l]));
    const teachersBy = new Map<string, Set<string>>();
    for (const s of schedules) {
      const n = fullName(s.teacher);
      if (!n) continue;
      teachersBy.set(s.classroomId, (teachersBy.get(s.classroomId) ?? new Set()).add(n));
    }
    const rosterBy = new Map<string, string[]>();
    for (const e of enrollments)
      rosterBy.set(e.classroomId, [...(rosterBy.get(e.classroomId) ?? []), e.studentId]);

    const items = classrooms.map((c) => {
      const roster = rosterBy.get(c.id) ?? [];
      const tests = (accessBy.get(c.id) ?? []).sort((a, b) => a.at - b.at);
      let came = 0;
      let attTotal = 0;
      let hwCredit = 0;
      let hwTotal = 0;
      const examAvgs: number[] = [];
      let risk = 0;
      for (const sid of roster) {
        const statuses = (attBy.get(key(c.id, sid)) ?? []).flatMap((r) =>
          Array<string>(r.n).fill(r.status),
        ) as ('PRESENT' | 'LATE' | 'ABSENT' | 'EXCUSED')[];
        const a = attendancePercent(statuses);
        came += a.marked - a.absent;
        attTotal += a.marked;
        const hws = (hwBy.get(key(c.id, sid)) ?? []).flatMap((r) =>
          Array<string | null>(r.n).fill(r.status),
        ) as ('DONE' | 'PARTIAL' | 'NOT_DONE' | null)[];
        const h = homeworkPercent(hws);
        hwTotal += h.marked;
        hwCredit += ((h.rate ?? 0) / 100) * h.marked;
        const trend = tests
          .map((t) => resultBy.get(`${t.testId}|${sid}`))
          .filter((v): v is number => v !== undefined && v !== null);
        const avg = mean(trend);
        if (avg !== null) examAvgs.push(avg);
        const flagsFor = riskFlags({
          attendanceRate: a.rate,
          attendanceMarked: a.marked,
          homeworkRate: h.rate,
          homeworkMarked: h.marked,
          examAvg: avg === null ? null : Math.round(avg),
          examTrend: trend.map((v) => Math.round(v)),
          missedExams: 0,
          competencyChange: null,
        });
        if (flagsFor.length > 0 || concernBy.has(sid)) risk += 1;
      }
      const last = lessonBy.get(c.id);
      const lead = fullName(c.teacher);
      const assistant = fullName(c.assistantTeacher);
      // Ангийн багш нар эхэнд, дараа нь хуваарийн бусад багш
      const teachers = new Set([lead, assistant].filter((n): n is string => !!n));
      for (const n of teachersBy.get(c.id) ?? []) teachers.add(n);
      return {
        id: c.id,
        name: c.name,
        type: c.type,
        grade: c.grade,
        classTeacher: c.teacher ? { id: c.teacher.id, name: lead! } : null,
        /** Ангийн багшийн профайл зураг (файлын түлхүүр) — картын баруун дээд буланд */
        teacherAvatarUrl: c.teacher?.avatarUrl ?? null,
        assistantTeacher: c.assistantTeacher
          ? { id: c.assistantTeacher.id, name: assistant! }
          : null,
        teachers: [...teachers],
        students: roster.length,
        attendanceRate: attTotal ? Math.round((came / attTotal) * 100) : null,
        homeworkRate: hwTotal ? Math.round((hwCredit / hwTotal) * 100) : null,
        examAvg: examAvgs.length ? Math.round(mean(examAvgs)!) : null,
        examCount: tests.length,
        riskCount: risk,
        lastLesson: last
          ? { date: last.date.toISOString().slice(0, 10), topic: last.topic }
          : null,
        payment: payments
          ? ClassDashboardService.paymentSummary(
              roster.map((id) => payments.get(id)!).filter(Boolean),
            )
          : null,
      };
    });
    return {
      windowDays: RECENT_DAYS,
      permissions: {
        money,
        manageClasses: this.managesAll(actor.role),
        isAdmin: actor.role === Role.ADMIN,
      },
      classes: items,
    };
  }

  // ───────────────────────── Нэг анги ─────────────────────────

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
    // Дараалан — холболтын нөөц хэмнэнэ (ClassOverviewService-тэй ижил)
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

  /**
   * Одоогийн бүлэг: гараар тохируулсан → хичээлийн сэдэв → үзсэн сэдвийн хамгийн
   * хол бүлэг (батлагдсан хичээл + «өмнө үзсэн», эзэн 2026-10-27) → сүүлийн шалгалт.
   */
  private async currentChapter(
    classroomId: string,
    progressChapterId: string | null,
    coveredChapterId: string | null = null,
  ) {
    let chapterId = progressChapterId;
    let source: 'MANUAL' | 'LESSON_TOPIC' | 'COVERED' | 'EXAM' | null = chapterId
      ? 'MANUAL'
      : null;
    if (!chapterId) {
      const topic = await this.prisma.lessonTopic.findFirst({
        where: { schedule: { classroomId }, chapterId: { not: null } },
        orderBy: { date: 'desc' },
        select: { chapterId: true },
      });
      if (topic?.chapterId) {
        chapterId = topic.chapterId;
        source = 'LESSON_TOPIC';
      }
    }
    if (!chapterId && coveredChapterId) {
      chapterId = coveredChapterId;
      source = 'COVERED';
    }
    if (!chapterId) {
      const access = await this.prisma.testAccess.findFirst({
        where: {
          classroomId,
          test: { deletedAt: null, isDraft: false, chapterId: { not: null } },
        },
        orderBy: { assignedAt: 'desc' },
        select: { test: { select: { chapterId: true } } },
      });
      if (access?.test.chapterId) {
        chapterId = access.test.chapterId;
        source = 'EXAM';
      }
    }
    if (!chapterId) return null;
    const chapter = await this.prisma.chapter.findUnique({
      where: { id: chapterId },
      select: {
        id: true,
        title: true,
        grade: true,
        bookId: true,
        deletedAt: true,
        book: { select: { title: true } },
        topic: { select: { name: true } },
      },
    });
    if (!chapter || chapter.deletedAt) return null;
    const siblings = chapter.bookId
      ? await this.prisma.chapter.findMany({
          where: {
            bookId: chapter.bookId,
            deletedAt: null,
            ...(chapter.grade == null ? {} : { grade: chapter.grade }),
          },
          orderBy: { order: 'asc' },
          select: { id: true },
        })
      : [];
    const index = siblings.findIndex((s) => s.id === chapter.id);
    return {
      chapterId: chapter.id,
      title: chapter.title,
      book: chapter.book?.title ?? null,
      topic: chapter.topic?.name ?? null,
      position: index >= 0 ? index + 1 : null,
      total: siblings.length || null,
      source,
    };
  }

  // ───────────────────────── Бие даасан ажил ─────────────────────────

  /**
   * Бие даасан бодлого — сурагч × УБ-ын өдөр: «Бодлого бодох» ба оройн
   * тэмдэглэгээ (Attempt, testId=null), Сургалтын лаборатори (LearningEvent
   * lab-first), Давтлага (StudyReviewResponse). Нэг query, давхар тоолохгүй
   * (эх сурвалж бүр өөр хүснэгт).
   */
  private async independentRows(
    ids: string[],
    w: { first: string; last: string; fromUtc: Date; toUtc: Date },
  ): Promise<
    { studentId: string; day: string; n: number; correct: number; judged: number }[]
  > {
    if (ids.length === 0) return [];
    const firstDate = parseDateOnly(w.first);
    const lastDate = parseDateOnly(w.last);
    return this.prisma.$queryRaw(Prisma.sql`
      SELECT "studentId", day, SUM(n)::int AS n, SUM(correct)::int AS correct,
        SUM(judged)::int AS judged
      FROM (
        SELECT a."studentId" AS "studentId", to_char(a."occurredOn", 'YYYY-MM-DD') AS day,
          COUNT(*) AS n,
          COUNT(*) FILTER (WHERE a."selfState" IN ('SOLVED_CLEAN','FIXED_AFTER_ERROR')
            OR (a."selfState" IS NULL AND a."autoCorrect" = true)) AS correct,
          COUNT(*) FILTER (WHERE a."selfState" IS NOT NULL OR a."autoCorrect" IS NOT NULL) AS judged
        FROM "Attempt" a
        WHERE a."studentId" = ANY(${ids}::text[]) AND a."testId" IS NULL
          AND a."occurredOn" >= ${firstDate} AND a."occurredOn" <= ${lastDate}
        GROUP BY 1, 2
        UNION ALL
        SELECT e."userId", to_char(((e."occurredAt" AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Ulaanbaatar')::date, 'YYYY-MM-DD'),
          COUNT(*),
          COUNT(*) FILTER (WHERE e.meta->>'correct' = 'true'),
          COUNT(*) FILTER (WHERE e.meta->>'correct' IN ('true', 'false'))
        FROM "LearningEvent" e
        WHERE e."userId" = ANY(${ids}::text[]) AND e.type = 'ANSWER_SUBMITTED'
          AND e.id LIKE 'lab-first-%'
          AND e."occurredAt" >= ${w.fromUtc} AND e."occurredAt" < ${w.toUtc}
        GROUP BY 1, 2
        UNION ALL
        SELECT r."userId", to_char(((r."occurredAt" AT TIME ZONE 'UTC') AT TIME ZONE 'Asia/Ulaanbaatar')::date, 'YYYY-MM-DD'),
          COUNT(*),
          COUNT(*) FILTER (WHERE r.correct = true),
          COUNT(*) FILTER (WHERE r.correct IS NOT NULL)
        FROM "StudyReviewResponse" r
        WHERE r."userId" = ANY(${ids}::text[])
          AND r."occurredAt" >= ${w.fromUtc} AND r."occurredAt" < ${w.toUtc}
        GROUP BY 1, 2
      ) x
      GROUP BY "studentId", day`);
  }

  /**
   * Бие даасан тест — ангид ОНООГООГҮЙ тестийг сурагч өөрөө өгч илгээсэн
   * (TestAttemptSession SUBMITTED). Дүн нь TestResult-аас.
   */
  private async selfTests(
    classroomId: string,
    ids: string[],
    fromUtc: Date,
    toUtc: Date,
  ) {
    if (ids.length === 0) return [];
    const assigned = await this.prisma.testAccess.findMany({
      where: { classroomId },
      select: { testId: true },
    });
    const sessions = await this.prisma.testAttemptSession.findMany({
      where: {
        studentId: { in: ids },
        status: 'SUBMITTED',
        submittedAt: { gte: fromUtc, lt: toUtc },
        testId: { notIn: assigned.map((a) => a.testId) },
        test: { deletedAt: null },
      },
      select: {
        studentId: true,
        testId: true,
        submittedAt: true,
        test: { select: { title: true } },
      },
      orderBy: { submittedAt: 'asc' },
    });
    const results = sessions.length
      ? await this.prisma.testResult.findMany({
          where: {
            studentId: { in: [...new Set(sessions.map((s) => s.studentId))] },
            testId: { in: [...new Set(sessions.map((s) => s.testId))] },
          },
          select: { studentId: true, testId: true, totalScore: true, maxScore: true },
        })
      : [];
    const pctBy = new Map(
      results.map((r) => [`${r.studentId}|${r.testId}`, percentOf(r.totalScore, r.maxScore)]),
    );
    return sessions.map((s) => {
      const p = pctBy.get(`${s.studentId}|${s.testId}`);
      return {
        studentId: s.studentId,
        testId: s.testId,
        title: s.test.title,
        day: ubDay(s.submittedAt ?? fromUtc),
        percent: p === undefined || p === null ? null : Math.round(p),
      };
    });
  }

  async detail(classroomId: string, userId: string) {
    const actor = await this.actor(userId);
    const classroom = await this.assertClass(classroomId, actor);
    const money = await this.canSeeMoney(userId);
    const roster = await rosterOf(this.prisma, [classroomId]);
    const ids = roster.map((s) => s.id);
    // «Чек» товчны тоо (api/src/class-checks) — нээлттэй чекүүд
    const openChecks = await this.prisma.classCheck.count({
      where: { classroomId, archivedAt: null, deletedAt: null },
    });
    const now = new Date();
    const historyFrom = daysAgo(HISTORY_DAYS);
    const today = daysAgo(0);
    // Үзсэн сэдвийн түүх = батлагдсан хичээл (огноотой) ∪ өмнө үзсэн (огноогүй)
    const coverageP = loadClassCoverage(this.prisma, classroomId, classroom.subject);

    const [
      exams,
      attendance,
      homework,
      practice,
      users,
      flags,
      lessons,
      lessonCount,
      schedules,
      staffing,
      chapter,
      practiceTopics,
      coverage,
    ] = await Promise.all([
      this.loadExams(classroomId, roster),
      this.prisma.attendance.findMany({
        where: { classroomId, studentId: { in: ids }, date: { gte: historyFrom } },
        select: { studentId: true, date: true, status: true },
      }),
      this.prisma.dailyHomeworkMark.findMany({
        where: { classroomId, studentId: { in: ids }, date: { gte: historyFrom } },
        select: { studentId: true, date: true, status: true },
      }),
      this.prisma.attempt.findMany({
        where: {
          studentId: { in: ids },
          testId: null,
          occurredOn: { gte: historyFrom },
        },
        select: {
          studentId: true,
          occurredOn: true,
          autoCorrect: true,
          selfState: true,
        },
      }),
      this.prisma.user.findMany({
        where: { id: { in: ids } },
        select: { id: true, studentCode: true },
      }),
      this.prisma.studentBehaviorFlag.findMany({
        where: { studentId: { in: ids }, removedAt: null },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          studentId: true,
          kind: true,
          note: true,
          createdAt: true,
          createdById: true,
          createdByName: true,
        },
      }),
      this.prisma.lessonRecord.findMany({
        where: {
          classroomId,
          date: { gte: daysAgo(MAKEUP_DAYS) },
          cancelledAt: null,
        },
        orderBy: { date: 'desc' },
        select: {
          id: true,
          date: true,
          topic: true,
          startMinute: true,
          leadTeacherName: true,
          assistantTeacherName: true,
          presentCount: true,
          absentCount: true,
          enrolledCount: true,
          students: {
            where: { removedAt: null },
            select: { studentId: true, attendance: true },
          },
        },
      }),
      this.prisma.lessonRecord.count({
        where: { classroomId, cancelledAt: null },
      }),
      this.prisma.classSchedule.findMany({
        where: {
          classroomId,
          OR: [{ effectiveTo: null }, { effectiveTo: { gte: today } }],
        },
        orderBy: [{ weekday: 'asc' }, { startMinute: 'asc' }],
        select: {
          weekday: true,
          startMinute: true,
          endMinute: true,
          room: true,
          subject: true,
          teacher: {
            select: { id: true, firstName: true, lastName: true, role: true },
          },
        },
      }),
      this.prisma.lessonStaffing.findMany({
        where: { schedule: { classroomId }, date: { gte: daysAgo(STAFFING_DAYS) } },
        select: { leadTeacherId: true, assistantTeacherId: true },
      }),
      coverageP.then((c) =>
        this.currentChapter(classroomId, classroom.progressChapterId, c.furthestChapterId),
      ),
      ids.length
        ? this.prisma.$queryRaw<
            {
              topicId: string;
              name: string;
              attempts: number;
              students: number;
              correct: number;
              guessed: number;
            }[]
          >(Prisma.sql`
            SELECT t.id AS "topicId", t.name AS name,
              COUNT(*)::int AS attempts,
              COUNT(DISTINCT a."studentId")::int AS students,
              COUNT(*) FILTER (WHERE a."selfState" IN ('SOLVED_CLEAN','FIXED_AFTER_ERROR')
                OR (a."selfState" IS NULL AND a."autoCorrect" = true))::int AS correct,
              COUNT(*) FILTER (WHERE a."selfState" = 'GUESSED')::int AS guessed
            FROM "Attempt" a
            JOIN "Problem" p ON p.id = a."problemId" AND p."deletedAt" IS NULL
            JOIN "Chapter" ch ON ch.id = p."chapterId"
            JOIN "Topic" t ON t.id = ch."topicId" AND t."deletedAt" IS NULL
            WHERE a."studentId" = ANY(${ids}::text[])
              AND a."occurredOn" >= ${historyFrom}
            GROUP BY t.id, t.name, t."order"
            ORDER BY t."order", t.name`)
        : Promise.resolve([]),
      coverageP,
    ]);
    const payments = money ? await this.paymentStates(ids) : null;
    // Бие даасан ажил — сүүлийн PRACTICE_DAYS УБ-ын өдөр (бүх эх сурвалж)
    const pFirst = ubDay(new Date(now.getTime() - (PRACTICE_DAYS - 1) * DAY));
    const pWindow = {
      first: pFirst,
      last: ubDay(now),
      fromUtc: new Date(Date.parse(`${pFirst}T00:00:00.000Z`) - 8 * 3_600_000),
      toUtc: new Date(now.getTime() + 60_000),
    };
    const [indRows, selfTestRows] = await Promise.all([
      this.independentRows(ids, pWindow),
      this.selfTests(classroomId, ids, pWindow.fromUtc, pWindow.toUtc),
    ]);
    const indBy = new Map<string, { n: number; correct: number; judged: number }>();
    for (const r of indRows) {
      const a = indBy.get(r.studentId) ?? { n: 0, correct: 0, judged: 0 };
      a.n += r.n;
      a.correct += r.correct;
      a.judged += r.judged;
      indBy.set(r.studentId, a);
    }
    const testsBy = new Map<string, number>();
    for (const t of selfTestRows) testsBy.set(t.studentId, (testsBy.get(t.studentId) ?? 0) + 1);

    // Багш нар: ангийн багш, хуваарийн багш, ахлах/туслах
    const staffIds = new Set<string>();
    for (const s of staffing) {
      if (s.leadTeacherId) staffIds.add(s.leadTeacherId);
      if (s.assistantTeacherId) staffIds.add(s.assistantTeacherId);
    }
    const staffUsers = staffIds.size
      ? await this.prisma.user.findMany({
          where: { id: { in: [...staffIds] } },
          select: { id: true, firstName: true, lastName: true, role: true },
        })
      : [];
    const teacherMap = new Map<string, { id: string; name: string; roles: Set<string> }>();
    const addTeacher = (
      u: { id: string; firstName: string; lastName: string; role?: string | null } | null,
      role: string,
    ) => {
      if (!u) return;
      const t = teacherMap.get(u.id) ?? { id: u.id, name: fullName(u)!, roles: new Set<string>() };
      t.roles.add(role);
      teacherMap.set(u.id, t);
    };
    addTeacher(classroom.teacher, 'CLASS');
    addTeacher(classroom.assistantTeacher, 'CLASS_ASSISTANT');
    for (const s of schedules) addTeacher(s.teacher, 'SCHEDULE');
    const staffById = new Map(staffUsers.map((u) => [u.id, u]));
    for (const s of staffing) {
      if (s.leadTeacherId) addTeacher(staffById.get(s.leadTeacherId) ?? null, 'LEAD');
      if (s.assistantTeacherId)
        addTeacher(staffById.get(s.assistantTeacherId) ?? null, 'ASSISTANT');
    }

    // Шалгалт, сэдэв (exams/class-overview.ts — дахин ашиглав)
    const recentFrom = daysAgo(RECENT_DAYS);
    const overview = classOverview({
      roster,
      exams,
      attendance: attendance
        .filter((a) => a.date >= recentFrom)
        .map((a) => ({ studentId: a.studentId, status: a.status })),
      homework: homework
        .filter((h) => h.date >= recentFrom)
        .map((h) => ({ studentId: h.studentId, status: h.status })),
    });
    const classAvgs = new Map(overview.exams.map((e) => [e.testId, e.avg]));

    const group = <T extends { studentId: string }>(rows: T[]) => {
      const m = new Map<string, T[]>();
      for (const r of rows) m.set(r.studentId, [...(m.get(r.studentId) ?? []), r]);
      return m;
    };
    const attBy = group(attendance);
    const hwBy = group(homework);
    const practiceBy = group(practice);
    const flagsBy = group(flags);
    const flagPlus = await teacherPlusIds(
      this.prisma,
      flags.map((f) => f.createdById),
    );
    const codeBy = new Map(users.map((u) => [u.id, u.studentCode]));
    const lessonStudentsBy = new Map<string, { attendance: string | null }[]>();
    for (const l of lessons)
      for (const s of l.students)
        lessonStudentsBy.set(s.studentId, [
          ...(lessonStudentsBy.get(s.studentId) ?? []),
          { attendance: s.attendance },
        ]);
    const overviewBy = new Map(overview.students.map((s) => [s.id, s]));
    const practiceFrom = daysAgo(PRACTICE_DAYS);

    const students = roster.map((r) => {
      const ov = overviewBy.get(r.id)!;
      const attRows = attBy.get(r.id) ?? [];
      const hwRows = hwBy.get(r.id) ?? [];
      const prRows = practiceBy.get(r.id) ?? [];
      const att = attendancePercent(
        attRows.filter((a) => a.date >= recentFrom).map((a) => a.status),
      );
      const hw = homeworkPercent(
        hwRows.filter((h) => h.date >= recentFrom).map((h) => h.status),
      );
      const recentPractice = prRows.filter((p) => p.occurredOn >= practiceFrom);
      const ind = indBy.get(r.id) ?? { n: 0, correct: 0, judged: 0 };
      const selfMarked = recentPractice.filter((p) => p.selfState !== null);
      const competencyInput: CompetencyInput = {
        exams: exams
          .map((e) => {
            const s = e.students.get(r.id);
            const p = s?.result ? percentOf(s.result.total, s.result.max) : null;
            return p === null ? null : { at: e.assignedAt, percent: p };
          })
          .filter((v): v is { at: Date; percent: number } => v !== null),
        practice: prRows.map((p) => ({
          at: p.occurredOn,
          correct: p.autoCorrect,
          selfState: p.selfState,
        })),
        attendance: attRows.map((a) => ({ at: a.date, status: a.status })),
        homework: hwRows
          .filter((h) => h.status !== null)
          .map((h) => ({ at: h.date, status: h.status! })),
      };
      const comp = computeCompetency(competencyInput, now);
      const trend = competencyTrend(competencyInput, now, 8);
      const change = trendChange(trend);
      const mine = studentInClass(r.id, exams, classAvgs);
      const risk = riskFlags({
        attendanceRate: att.rate,
        attendanceMarked: att.marked,
        homeworkRate: hw.rate,
        homeworkMarked: hw.marked,
        examAvg: ov.avg,
        examTrend: ov.trend,
        missedExams: ov.missed,
        competencyChange: change,
      });
      const pay = payments?.get(r.id);
      return {
        id: r.id,
        firstName: r.firstName,
        lastName: r.lastName,
        studentCode: codeBy.get(r.id) ?? null,
        attendance: { rate: att.rate, marked: att.marked, absent: att.absent },
        homework: { rate: hw.rate, marked: hw.marked },
        exam: {
          avg: ov.avg,
          last: ov.last,
          taken: ov.taken,
          missed: ov.missed,
          trend: ov.trend,
        },
        practice: {
          attempts: ind.n,
          accuracy: ind.judged ? Math.round((ind.correct / ind.judged) * 100) : null,
          guessed: selfMarked.filter((p) => p.selfState === 'GUESSED').length,
          tests: testsBy.get(r.id) ?? 0,
        },
        makeup: makeupOwed(lessonStudentsBy.get(r.id) ?? []),
        lagging: laggingTopics(mine.topics),
        competency: { ...comp, trend, change },
        // Эзний алгоритм ирэх хүртэл таамаг гаргахгүй
        predictedEesh: null as number | null,
        risk,
        flags: (flagsBy.get(r.id) ?? []).map((f) => ({
          id: f.id,
          kind: f.kind,
          note: f.note,
          createdAt: f.createdAt.toISOString(),
          createdByName: markPlus(f.createdByName, f.createdById, flagPlus),
        })),
        payment: pay
          ? { state: pay.state, tuitionAmount: pay.tuitionAmount, paidThisMonth: pay.paidThisMonth }
          : null,
      };
    });

    const attendanceTrend = weeklyRates(
      attendance.map((a) => ({ at: a.date, credit: attendanceCredit(a.status) })),
      now,
      8,
    );
    const homeworkTrend = weeklyRates(
      homework.map((h) => ({ at: h.date, credit: homeworkCredit(h.status) })),
      now,
      8,
    );
    const pick = <T>(xs: (T | null)[]) => xs.filter((v): v is T => v !== null);
    const sumRate = (rows: { rate: number | null; marked: number }[]) => {
      const marked = rows.reduce((s, r) => s + (r.rate === null ? 0 : r.marked), 0);
      if (!marked) return null;
      return Math.round(
        rows.reduce((s, r) => s + (r.rate === null ? 0 : r.rate * r.marked), 0) / marked,
      );
    };
    const comps = pick(students.map((s) => s.competency.score));
    const practiceActive = students.filter(
      (s) => s.practice.attempts + s.practice.tests > 0,
    ).length;
    const practiceTotal = students.reduce((s, x) => s + x.practice.attempts, 0);
    let indCorrect = 0;
    let indJudged = 0;
    for (const v of indBy.values()) {
      indCorrect += v.correct;
      indJudged += v.judged;
    }

    const examList = overview.exams.map((e) => {
      const exam = exams.find((x) => x.testId === e.testId)!;
      const results = pick(
        roster.map((r) => {
          const s = exam.students.get(r.id);
          const p = s?.result ? percentOf(s.result.total, s.result.max) : null;
          return p === null ? null : { studentId: r.id, percent: Math.round(p) };
        }),
      ).sort((a, b) => b.percent - a.percent);
      return { ...e, bins: scoreBins(results.map((x) => x.percent)), results };
    });

    return {
      generatedAt: now.toISOString(),
      windowDays: RECENT_DAYS,
      practiceDays: PRACTICE_DAYS,
      makeupDays: MAKEUP_DAYS,
      openChecks,
      classroom: {
        id: classroom.id,
        name: classroom.name,
        type: classroom.type,
        grade: classroom.grade,
        classTeacher: classroom.teacher
          ? { id: classroom.teacher.id, name: fullName(classroom.teacher)! }
          : null,
        assistantTeacher: classroom.assistantTeacher
          ? {
              id: classroom.assistantTeacher.id,
              name: fullName(classroom.assistantTeacher)!,
            }
          : null,
      },
      permissions: {
        money,
        manageClass: this.managesAll(actor.role),
        isAdmin: actor.role === Role.ADMIN,
      },
      teachers: [...teacherMap.values()].map((t) => ({
        id: t.id,
        name: t.name,
        roles: [...t.roles],
      })),
      schedule: schedules.map((s) => ({
        weekday: s.weekday,
        startMinute: s.startMinute,
        endMinute: s.endMinute,
        room: s.room,
        subject: s.subject,
        teacher: fullName(s.teacher),
      })),
      summary: {
        students: roster.length,
        attendanceRate: sumRate(students.map((s) => s.attendance)),
        homeworkRate: sumRate(students.map((s) => s.homework)),
        examAvg: overview.summary.avg,
        exams: overview.summary.exams,
        riskCount: students.filter(
          (s) => s.risk.length > 0 || s.flags.some((f) => isConcernFlag(f.kind)),
        ).length,
        improvedCount: students.filter(
          (s) =>
            s.flags.some((f) => f.kind === 'IMPROVED') ||
            (s.competency.change !== null && s.competency.change >= 8),
        ).length,
        makeupStudents: students.filter((s) => (s.makeup ?? 0) > 0).length,
        competencyAvg: comps.length ? Math.round(mean(comps)!) : null,
        competencyCovered: comps.length,
      },
      attendanceTrend,
      homeworkTrend,
      practice: {
        activeStudents: practiceActive,
        attempts: practiceTotal,
        accuracy: indJudged ? Math.round((indCorrect / indJudged) * 100) : null,
        tests: selfTestRows.length,
      },
      payment: payments
        ? {
            month: monthKeyUB(),
            ...ClassDashboardService.paymentSummary(payments.values()),
          }
        : null,
      syllabus: {
        current: chapter,
        // Номын явц: үндсэн ном (100V3, 200V3) + үзсэн бүлэгтэй бусад ном
        coverage: {
          pastTests: coverage.books.reduce(
            (n, b) => n + b.chapters.reduce((m, c) => m + c.tests.filter((t) => t.past).length, 0),
            0,
          ),
          books: coverage.books
            .filter(
              (b) =>
                b.coveredChapters > 0 ||
                (ROADMAP_BOOK_CODES as readonly string[]).includes(b.code),
            )
            .map((b) => ({
              code: b.code,
              title: b.title,
              totalChapters: b.totalChapters,
              coveredChapters: b.coveredChapters,
              pastChapters: b.pastChapters,
            })),
        },
        confirmedLessons: lessonCount,
        recentLessons: lessons.slice(0, 12).map((l) => ({
          id: l.id,
          date: l.date.toISOString().slice(0, 10),
          startMinute: l.startMinute,
          topic: l.topic,
          lead: l.leadTeacherName,
          assistant: l.assistantTeacherName,
          present: l.presentCount,
          absent: l.absentCount,
          enrolled: l.enrolledCount,
        })),
      },
      exams: examList,
      topics: {
        exam: overview.topics,
        practice: practiceTopics.map((t) => ({
          ...t,
          accuracy: t.attempts ? Math.round((t.correct / t.attempts) * 100) : null,
        })),
      },
      problems: overview.problems,
      students,
    };
  }

  // ───────────────────────── Сарын харагдац ─────────────────────────

  /**
   * Нэг сарын тор (эзэн 2026-10-13): ирц/даалгавар — сурагч × бодит хичээлийн
   * өдөр (хуваарь + цуцлалт/зөөлт + амралт), шалгалт, бие даасан ажил (өдөр
   * бүрээр), сурагч бүрийн статистик ба ангийн дундаж. Нэг дуудлага.
   */
  async month(classroomId: string, monthParam: string | undefined, userId: string) {
    const actor = await this.actor(userId);
    await this.assertClass(classroomId, actor);
    const current = monthKeyUB();
    if (monthParam && !MONTH_RE.test(monthParam))
      throw new BadRequestException('Сар YYYY-MM хэлбэртэй байх ёстой');
    const month = monthParam || current;
    const w = monthWindow(month);
    const firstDate = parseDateOnly(w.first);
    const lastDate = parseDateOnly(w.last);
    // Сарын сүүлийн 7 хоногийн цонх дараа сар руу гардаг (teacher-hours-тэй ижил)
    const resolveEnd = addDateDays(firstDate, w.days + 6);

    const roster = await rosterOf(this.prisma, [classroomId]);
    const ids = roster.map((s) => s.id);
    const [users, attendance, homework, schedules, holidays, records, access, indRows, selfTestRows] =
      await Promise.all([
        this.prisma.user.findMany({
          where: { id: { in: ids } },
          select: { id: true, studentCode: true },
        }),
        this.prisma.attendance.findMany({
          where: { classroomId, studentId: { in: ids }, date: { gte: firstDate, lte: lastDate } },
          select: { studentId: true, date: true, status: true },
        }),
        this.prisma.dailyHomeworkMark.findMany({
          where: {
            classroomId,
            studentId: { in: ids },
            date: { gte: firstDate, lte: lastDate },
            status: { not: null },
          },
          select: { studentId: true, date: true, status: true },
        }),
        this.prisma.classSchedule.findMany({
          where: {
            classroomId,
            effectiveFrom: { lte: resolveEnd },
            OR: [{ effectiveTo: null }, { effectiveTo: { gte: firstDate } }],
          },
          select: {
            id: true,
            weekday: true,
            startMinute: true,
            endMinute: true,
            room: true,
            subject: true,
            teacherId: true,
            effectiveFrom: true,
            effectiveTo: true,
          },
        }),
        this.prisma.academicCalendarDay.findMany({
          where: { date: { gte: firstDate, lte: resolveEnd } },
          select: {
            date: true,
            type: true,
            title: true,
            classrooms: { select: { classroomId: true } },
          },
        }),
        this.prisma.lessonRecord.findMany({
          where: {
            classroomId,
            date: { gte: firstDate, lte: lastDate },
            cancelledAt: null,
          },
          select: { date: true },
        }),
        this.prisma.testAccess.findMany({
          where: {
            classroomId,
            assignedAt: { gte: w.fromUtc, lt: w.toUtc },
            test: { deletedAt: null, isDraft: false },
          },
          orderBy: { assignedAt: 'asc' },
          take: MAX_EXAMS,
          select: { assignedAt: true, test: { select: { id: true, title: true, type: true } } },
        }),
        this.independentRows(ids, w),
        this.selfTests(classroomId, ids, w.fromUtc, w.toUtc),
      ]);
    const exceptions = schedules.length
      ? await this.prisma.scheduleException.findMany({
          where: { scheduleId: { in: schedules.map((s) => s.id) } },
        })
      : [];
    const testIds = access.map((a) => a.test.id);
    const [results, absences] = testIds.length && ids.length
      ? await Promise.all([
          this.prisma.testResult.findMany({
            where: { testId: { in: testIds }, studentId: { in: ids } },
            select: { testId: true, studentId: true, totalScore: true, maxScore: true },
          }),
          this.prisma.testAbsence.findMany({
            where: { testId: { in: testIds }, studentId: { in: ids } },
            select: { testId: true, studentId: true },
          }),
        ])
      : [[], []];

    // Ирц / даалгавар — сурагч → өдөр → төлөв
    const attendanceGrid: Record<string, Record<string, AttendanceStatus>> = {};
    const homeworkGrid: Record<string, Record<string, HomeworkStatus>> = {};
    const marked = new Set<string>();
    for (const a of attendance) {
      const d = dateKey(a.date);
      marked.add(d);
      (attendanceGrid[a.studentId] ??= {})[d] = a.status;
    }
    for (const h of homework) {
      if (!h.status) continue;
      const d = dateKey(h.date);
      marked.add(d);
      (homeworkGrid[h.studentId] ??= {})[d] = h.status;
    }

    const days = lessonDaysOf(
      month,
      classroomId,
      {
        schedules: schedules.map((s) => ({
          id: s.id,
          classroomId,
          classroomName: '',
          weekday: s.weekday,
          startMinute: s.startMinute,
          endMinute: s.endMinute,
          teacherId: s.teacherId,
          teacherName: null,
          room: s.room,
          subject: s.subject,
          effectiveFrom: dateKey(s.effectiveFrom),
          effectiveTo: s.effectiveTo ? dateKey(s.effectiveTo) : null,
        })),
        exceptions: exceptions.map((e) => ({
          scheduleId: e.scheduleId,
          date: dateKey(e.date),
          kind: e.kind,
          newDate: e.newDate ? dateKey(e.newDate) : null,
          newStartMinute: e.newStartMinute,
          newEndMinute: e.newEndMinute,
          newRoom: e.newRoom,
          note: e.note,
        })),
        topics: [],
        holidays: holidays.map((h) => ({
          date: dateKey(h.date),
          type: h.type,
          title: h.title,
          classroomIds: h.classrooms.map((c) => c.classroomId),
        })),
      },
      marked,
      records.map((r) => dateKey(r.date)),
    );

    // Шалгалт
    const pctBy = new Map<string, Map<string, number>>();
    for (const r of results) {
      const p = percentOf(r.totalScore, r.maxScore);
      if (p === null) continue;
      const m = pctBy.get(r.testId) ?? new Map<string, number>();
      m.set(r.studentId, Math.round(p));
      pctBy.set(r.testId, m);
    }
    const absentBy = new Map<string, Set<string>>();
    for (const a of absences)
      absentBy.set(a.testId, (absentBy.get(a.testId) ?? new Set()).add(a.studentId));
    const exams = access.map((a) => ({
      testId: a.test.id,
      title: a.test.title,
      type: a.test.type,
      assignedAt: a.assignedAt.toISOString(),
      day: ubDay(a.assignedAt),
      ...monthExamSummary(
        ids,
        pctBy.get(a.test.id) ?? new Map(),
        absentBy.get(a.test.id) ?? new Set(),
      ),
    }));

    // Бие даасан ажил — сурагч → өдөр
    const independent: Record<string, Record<string, IndependentDay>> = {};
    const dayOf = (sid: string, d: string) =>
      ((independent[sid] ??= {})[d] ??= { problems: 0, correct: 0, judged: 0, tests: 0 });
    for (const r of indRows) {
      const cell = dayOf(r.studentId, r.day);
      cell.problems += r.n;
      cell.correct += r.correct;
      cell.judged += r.judged;
    }
    const selfTestsBy: Record<string, { testId: string; title: string; day: string; percent: number | null }[]> = {};
    for (const t of selfTestRows) {
      dayOf(t.studentId, t.day).tests += 1;
      (selfTestsBy[t.studentId] ??= []).push({
        testId: t.testId,
        title: t.title,
        day: t.day,
        percent: t.percent,
      });
    }

    const codeBy = new Map(users.map((u) => [u.id, u.studentCode]));
    const statsBy: Record<string, StudentMonthStats> = {};
    for (const id of ids)
      statsBy[id] = studentMonthStats({
        attendance: attendanceGrid[id] ?? {},
        homework: homeworkGrid[id] ?? {},
        exams: exams.map((e) => ({
          percent: e.results[id] ?? null,
          absent: e.absentIds.includes(id),
        })),
        independent: independent[id] ?? {},
        testPercents: (selfTestsBy[id] ?? [])
          .map((t) => t.percent)
          .filter((p): p is number => p !== null),
      });

    return {
      month,
      current,
      prev: shiftMonth(month, -1),
      next: month < current ? shiftMonth(month, 1) : null,
      today: ubDay(new Date()),
      classroom: { id: classroomId },
      students: roster.map((r) => ({
        id: r.id,
        firstName: r.firstName,
        lastName: r.lastName,
        studentCode: codeBy.get(r.id) ?? null,
      })),
      days,
      weeks: monthWeeks(month),
      attendance: attendanceGrid,
      homework: homeworkGrid,
      exams,
      independent,
      selfTests: selfTestsBy,
      stats: { students: statsBy, class: classMonthStats(Object.values(statsBy)) },
    };
  }

  // ───────────────────────── Сурагчийн чадамж (хаб) ─────────────────────────

  async studentCompetency(studentId: string, userId: string) {
    const actor = await this.actor(userId);
    const enrollment = await this.prisma.enrollment.findFirst({
      where: { studentId, leftAt: null, classroom: { archived: false } },
      orderBy: { joinedAt: 'desc' },
      select: { classroomId: true },
    });
    if (!enrollment) return { competency: null, classroomId: null };
    const visible = await this.visibleClassIds(actor);
    if (visible !== 'ALL' && !visible.includes(enrollment.classroomId))
      throw new ForbiddenException('Энэ сурагчийн мэдээлэлд хандах эрхгүй');
    const classroomId = enrollment.classroomId;
    const from = daysAgo(HISTORY_DAYS);
    const [access, attendance, homework, practice] = await Promise.all([
      this.prisma.testAccess.findMany({
        where: { classroomId, test: { deletedAt: null, isDraft: false } },
        orderBy: { assignedAt: 'desc' },
        take: MAX_EXAMS,
        select: { testId: true, assignedAt: true },
      }),
      this.prisma.attendance.findMany({
        where: { classroomId, studentId, date: { gte: from } },
        select: { date: true, status: true },
      }),
      this.prisma.dailyHomeworkMark.findMany({
        where: { classroomId, studentId, date: { gte: from }, status: { not: null } },
        select: { date: true, status: true },
      }),
      this.prisma.attempt.findMany({
        where: { studentId, testId: null, occurredOn: { gte: from } },
        select: { occurredOn: true, autoCorrect: true, selfState: true },
      }),
    ]);
    const results = access.length
      ? await this.prisma.testResult.findMany({
          where: { studentId, testId: { in: access.map((a) => a.testId) } },
          select: { testId: true, totalScore: true, maxScore: true },
        })
      : [];
    const atBy = new Map(access.map((a) => [a.testId, a.assignedAt]));
    const input: CompetencyInput = {
      exams: results
        .map((r) => ({ at: atBy.get(r.testId)!, percent: percentOf(r.totalScore, r.maxScore) }))
        .filter((e): e is { at: Date; percent: number } => e.percent !== null && !!e.at),
      practice: practice.map((p) => ({
        at: p.occurredOn,
        correct: p.autoCorrect,
        selfState: p.selfState,
      })),
      attendance: attendance.map((a) => ({ at: a.date, status: a.status })),
      homework: homework.map((h) => ({ at: h.date, status: h.status! })),
    };
    const now = new Date();
    const comp = computeCompetency(input, now);
    const trend = competencyTrend(input, now, 8);
    return {
      classroomId,
      competency: { ...comp, trend, change: trendChange(trend), updatedAt: now.toISOString() },
    };
  }

  // ───────────────────────── Зан төлөвийн шошго ─────────────────────────

  private async assertStudent(studentId: string) {
    const student = await this.prisma.user.findUnique({
      where: { id: studentId },
      select: { id: true, role: true },
    });
    if (!student || student.role !== Role.STUDENT)
      throw new NotFoundException('Сурагч олдсонгүй');
  }

  /**
   * Эзний зарчим (сурагчийн тэмдэглэлтэй ижил, STATUS §5): төвийн ямар ч багш
   * шошгыг уншиж, нэмж, хасна — нээлттэй, түүх хадгалагдана.
   */
  async flagHistory(studentId: string, userId: string) {
    await this.actor(userId);
    await this.assertStudent(studentId);
    const rows = await this.prisma.studentBehaviorFlag.findMany({
      where: { studentId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    const plus = await teacherPlusIds(
      this.prisma,
      rows.flatMap((f) => [f.createdById, f.removedById]),
    );
    return rows.map((f) => ({
      id: f.id,
      kind: f.kind,
      label: isBehaviorFlagKind(f.kind) ? BEHAVIOR_FLAGS[f.kind].label : f.kind,
      note: f.note,
      classroomId: f.classroomId,
      createdAt: f.createdAt.toISOString(),
      createdByName: markPlus(f.createdByName, f.createdById, plus),
      removedAt: f.removedAt?.toISOString() ?? null,
      removedByName: markPlus(f.removedByName, f.removedById, plus),
      removeNote: f.removeNote,
    }));
  }

  private async actorName(userId: string) {
    const u = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { firstName: true, lastName: true },
    });
    return fullName(u) ?? 'Ажилтан';
  }

  async addFlag(
    studentId: string,
    dto: { kind: string; note?: string | null; classroomId?: string | null },
    userId: string,
  ) {
    await this.actor(userId);
    await this.assertStudent(studentId);
    if (!isBehaviorFlagKind(dto.kind))
      throw new BadRequestException('Шошгоны төрөл буруу');
    const active = await this.prisma.studentBehaviorFlag.findFirst({
      where: { studentId, kind: dto.kind, removedAt: null },
      select: { id: true },
    });
    if (active)
      throw new BadRequestException('Энэ шошго аль хэдийн идэвхтэй байна');
    const row = await this.prisma.studentBehaviorFlag.create({
      data: {
        studentId,
        classroomId: dto.classroomId || null,
        kind: dto.kind,
        note: cleanFlagNote(dto.note),
        createdById: userId,
        createdByName: await this.actorName(userId),
      },
    });
    return {
      id: row.id,
      kind: row.kind,
      note: row.note,
      createdAt: row.createdAt.toISOString(),
      createdByName: markPlus(
        row.createdByName,
        row.createdById,
        await teacherPlusIds(this.prisma, [row.createdById]),
      ),
    };
  }

  async removeFlag(flagId: string, dto: { note?: string | null }, userId: string) {
    await this.actor(userId);
    const flag = await this.prisma.studentBehaviorFlag.findUnique({
      where: { id: flagId },
      select: { id: true, removedAt: true },
    });
    if (!flag) throw new NotFoundException('Шошго олдсонгүй');
    if (flag.removedAt) throw new BadRequestException('Шошгыг аль хэдийн хассан');
    const row = await this.prisma.studentBehaviorFlag.update({
      where: { id: flagId },
      data: {
        removedAt: new Date(),
        removedById: userId,
        removedByName: await this.actorName(userId),
        removeNote: cleanFlagNote(dto.note),
      },
    });
    return { id: row.id, removedAt: row.removedAt!.toISOString() };
  }
}
