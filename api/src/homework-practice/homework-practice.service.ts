import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { addDaysKey, ubDateKey } from '../attendance/board-logic';
import { dateKey, parseDateOnly, todayUB } from '../common/date';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  currentClass,
  loadLessonDays,
  loadUpcomingDays,
  visibleLessonDays,
} from '../student-hub/lesson-days';
import {
  dayKey,
  ADVANCE_DAYS,
  inAdvanceWindow,
  inUploadWindow,
  nextLessonDay,
} from '../student-hub/student-hub.logic';
import {
  EXCLUDED_TYPES,
  TIME_GRACE_SEC,
  MAX_CHECKS,
  MAX_DAYS,
  REDO_LESSONS,
  REDO_ROUND,
  buildSlots,
  clampDays,
  correctAnswerView,
  gradeHomework,
  isLate,
  mergeActivity,
  mergeAnswers,
  myAnswerView,
  redoOpen,
  lessonsPassedAfter,
  problemView,
  remainingSec,
  ubDayStart,
  variantOf,
  type ActivityState,
  type CheckResult,
  type HomeworkProblemRow,
  type HomeworkSlot,
} from './homework-logic';
import { youtubeOf } from '../exams/exam-data';
import { loadPlanned } from './planned-tests';

const PDF_MAX_BYTES = 25 * 1024 * 1024;
const MAX_PAGES = 6;
/** loadProblems-ийн процессын санах ой: autosave/шалгах бүрт бодлого дахин уншихгүй */
const PROBLEMS_TTL_MS = 60_000;
const PROBLEMS_CACHE_MAX = 200;

type AttemptRow = {
  id: string;
  studentId: string;
  classroomId: string;
  testId: string;
  lessonDate: Date;
  round: number;
  status: 'IN_PROGRESS' | 'SUBMITTED';
  startedAt: Date;
  deadlineAt: Date | null;
  timeLimitMin: number | null;
  answers: unknown;
  checksUsed: number;
  score: number | null;
  total: number | null;
  submittedAt: Date | null;
  activeSec: number;
  awaySec: number;
  leaveCount: number;
  openCount: number;
};

const activityOf = (a: AttemptRow): ActivityState => ({
  activeSec: a.activeSec ?? 0,
  awaySec: a.awaySec ?? 0,
  leaveCount: a.leaveCount ?? 0,
  openCount: a.openCount ?? 0,
});

type HwReviewPayload = {
  /** Тест ангид бодогдох тул зөв хариу нээгдэхгүй */
  locked: boolean;
  /** Хариулаагүй бодлогын зөв хариу нээгдэх цаг (нууж байгаа үед) */
  opensAt: string | null;
  items: Record<string, HwReviewItem>;
};

type HwReviewItem = {
  correct: ReturnType<typeof correctAnswerView>;
  solution: string | null;
  video: { url: string; embedUrl: string } | null;
};

type RedoItem = {
  testId: string;
  title: string;
  variantLabel: string | null;
  kind: 'CLASS' | 'HOME';
  problemCount: number;
  timeLimitMin: number | null;
  rounds: {
    round: number;
    attemptId: string;
    status: 'IN_PROGRESS' | 'SUBMITTED';
    score: { correct: number; total: number } | null;
    submittedAt: string | null;
  }[];
};

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === 'object' && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : {};
}

/**
 * Танхимын сурагчийн гэрийн даалгавар (эзэн 2026-10-29): ангид хийсэн тестийн нөгөө
 * хувилбарыг гэртээ бодно — «Шалгах» 2 удаа (зөв/буруу л, зөв хариу ХЭЗЭЭ Ч үгүй), «Илгээх».
 * Эрх: сурагч зөвхөн /homework/my жагсаалтад байгаа даалгаврыг л эхлүүлж/үргэлжлүүлж/илгээнэ —
 * дуудлага бүрт сервер дахин шалгана (клиентийн testId/огноонд итгэхгүй).
 */
@Injectable()
export class HomeworkPracticeService {
  constructor(private prisma: PrismaService) {}

  private problemsCache = new Map<
    string,
    { at: number; value: Promise<HomeworkProblemRow[]> }
  >();

  private parseDate(value: unknown): string {
    if (typeof value !== 'string')
      throw new BadRequestException('Огнооны формат буруу байна (YYYY-MM-DD)');
    try {
      return dateKey(parseDateOnly(value));
    } catch {
      throw new BadRequestException('Огнооны формат буруу байна (YYYY-MM-DD)');
    }
  }

  /** [fromKey, toKey] хооронд сурагчийн гэрийн даалгаврын өдрүүд */
  private async loadSlots(
    studentId: string,
    fromKey: string,
    toKey: string,
    classroomId?: string,
  ): Promise<HomeworkSlot[]> {
    const profile = await this.prisma.studentProfile.findUnique({
      where: { userId: studentId },
      select: { type: true, activatedAt: true },
    });
    if (profile?.type !== 'CLASSROOM' || !profile.activatedAt) return [];
    const enrollments = await this.prisma.enrollment.findMany({
      where: {
        studentId,
        leftAt: null,
        ...(classroomId ? { classroomId } : {}),
        classroom: { archived: false, type: 'IN_PERSON' },
      },
      select: {
        classroomId: true,
        joinedAt: true,
        classroom: { select: { name: true } },
      },
    });
    if (!enrollments.length) return [];
    const classroomIds = [...new Set(enrollments.map((e) => e.classroomId))];
    // Хугацаа (дараагийн хичээл) олохын тулд toKey-оос хойш 60 хоног хүртэл уншина
    const sessions = await this.prisma.classTestSession.findMany({
      where: {
        classroomId: { in: classroomIds },
        date: {
          gte: parseDateOnly(fromKey),
          lte: parseDateOnly(addDaysKey(toKey, 60)),
        },
      },
      select: { classroomId: true, date: true, testId: true },
      orderBy: { createdAt: 'asc' },
    });
    // Хуваарьт төлөвлөсөн («Орох тест») тест хичээл тарсны дараа даалгавар болно; хичээлийг
    // батлаад ClassTestSession бүртгэсэн өдөрт батлагдсан нь давамгайлна (эзэн 2026-11-03)
    const planned = await loadPlanned(
      this.prisma,
      classroomIds,
      fromKey,
      toKey,
      dateKey(todayUB()),
    );
    const real = sessions.map((s) => ({
      classroomId: s.classroomId,
      date: dateKey(s.date),
      testId: s.testId,
    }));
    const confirmedDays = new Set(
      real.filter((s) => s.testId).map((s) => `${s.classroomId}|${s.date}`),
    );
    const merged = [
      ...real,
      ...planned.filter(
        (s) => s.testId === null || !confirmedDays.has(`${s.classroomId}|${s.date}`),
      ),
    ];
    const doneIds = [
      ...new Set(
        merged
          .filter((s) => s.testId && s.date <= toKey)
          .map((s) => s.testId as string),
      ),
    ];
    if (!doneIds.length) return [];
    const testWhere = {
      deletedAt: null,
      type: { notIn: [...EXCLUDED_TYPES] },
    } satisfies Prisma.TestWhereInput;
    const done = await this.prisma.test.findMany({
      where: { id: { in: doneIds }, ...testWhere },
      select: { id: true, groupKey: true, variantLabel: true },
    });
    const groups = [
      ...new Set(done.flatMap((t) => (t.groupKey ? [t.groupKey] : []))),
    ];
    if (!groups.length) return [];
    const siblings = await this.prisma.test.findMany({
      where: {
        groupKey: { in: groups },
        ...testWhere,
        isDraft: false,
        gradingMode: 'AUTO',
      },
      select: {
        id: true,
        title: true,
        groupKey: true,
        variantLabel: true,
        timeLimitMin: true,
        _count: { select: { problems: true } },
      },
    });
    // B хувилбарыг анги ДАРАА нь танхимд (эсвэл оноосон шалгалтаар) бодох бол гэрийн
    // даалгавар болгохгүй — урьдчилан харж/хариугаа мэдэж очихгүй (аудит 2026-10-29)
    const siblingIds = siblings.map((t) => t.id);
    const [inClass, futureAccess] = siblingIds.length
      ? await Promise.all([
          this.prisma.classTestSession.findMany({
            where: { classroomId: { in: classroomIds }, testId: { in: siblingIds } },
            select: { classroomId: true, testId: true },
          }),
          this.prisma.testAccess.findMany({
            where: {
              classroomId: { in: classroomIds },
              testId: { in: siblingIds },
              assignedAt: { gt: new Date() },
            },
            select: { classroomId: true, testId: true },
          }),
        ])
      : [[], []];
    const reserved = [
      ...[...inClass, ...futureAccess].flatMap((r) =>
        r.testId ? [{ classroomId: r.classroomId, testId: r.testId }] : [],
      ),
      ...(await this.plannedReserved(classroomIds, siblingIds, confirmedDays)),
    ];
    return buildSlots({
      reserved,
      enrollments: enrollments.map((e) => ({
        classroomId: e.classroomId,
        classroomName: e.classroom.name,
        joinedKey: ubDateKey(e.joinedAt),
      })),
      sessions: merged,
      done,
      siblings: siblings
        .filter((t) => t._count.problems > 0)
        .map((t) => ({
          id: t.id,
          title: t.title,
          groupKey: t.groupKey,
          variantLabel: t.variantLabel,
          timeLimitMin: t.timeLimitMin,
          problemCount: t._count.problems,
        })),
      fromKey,
      toKey,
    });
  }

  /**
   * Хуваарьт (ямар ч өдөр, ирээдүй ч) төлөвлөсөн, ангид бодогдох тест — гэрийн даалгавар болгохгүй
   * (урьдчилан харж/хариугаа мэдэж очихгүй). Хугацааны цонхгүй. Хичээл батлагдаж өөр тест
   * бүртгэгдсэн өдрийн төлөвлөгөө хүчингүй (анхны огноогоор; зөөсөн бол хамгаалах талаар нөөцлөгдөнө).
   */
  private async plannedReserved(
    classroomIds: string[],
    siblingIds: string[],
    confirmedDays: Set<string>,
  ): Promise<{ classroomId: string; testId: string }[]> {
    if (!siblingIds.length) return [];
    const rows = await this.prisma.lessonTopic.findMany({
      where: {
        testIds: { hasSome: siblingIds },
        schedule: { classroomId: { in: classroomIds } },
      },
      select: {
        date: true,
        testIds: true,
        schedule: { select: { classroomId: true } },
      },
    });
    const ids = new Set(siblingIds);
    return rows.flatMap((r) =>
      confirmedDays.has(`${r.schedule.classroomId}|${dateKey(r.date)}`)
        ? []
        : r.testIds
            .filter((id) => ids.has(id))
            .map((testId) => ({ classroomId: r.schedule.classroomId, testId })),
    );
  }

  /** testId + огноо нь энэ сурагчийн жагсаалтад байгаа эсэх — үгүй бол 403 */
  private async slotFor(studentId: string, testId: string, date: string) {
    const today = dateKey(todayUB());
    if (date > today || date < addDaysKey(today, -(MAX_DAYS - 1)))
      throw new ForbiddenException('Энэ гэрийн даалгавар танд нээгдээгүй байна');
    const slots = await this.loadSlots(studentId, date, date);
    for (const slot of slots) {
      const item = slot.items.find((i) => i.id === testId);
      if (item) return { slot, item };
    }
    throw new ForbiddenException('Энэ гэрийн даалгавар танд нээгдээгүй байна');
  }

  /** Тестийн бодлого — процессод 60с хадгална (админ засвар хамгийн ихдээ 1 мин хоцорно) */
  private loadProblems(testId: string): Promise<HomeworkProblemRow[]> {
    const now = Date.now();
    const hit = this.problemsCache.get(testId);
    if (hit && now - hit.at < PROBLEMS_TTL_MS) return hit.value;
    if (this.problemsCache.size >= PROBLEMS_CACHE_MAX)
      for (const [k, v] of this.problemsCache)
        if (now - v.at >= PROBLEMS_TTL_MS) this.problemsCache.delete(k);
    if (this.problemsCache.size >= PROBLEMS_CACHE_MAX) this.problemsCache.clear();
    const value = this.fetchProblems(testId);
    this.problemsCache.set(testId, { at: now, value });
    value.catch(() => this.problemsCache.delete(testId));
    return value;
  }

  private fetchProblems(testId: string): Promise<HomeworkProblemRow[]> {
    return this.prisma.testProblem.findMany({
      where: { testId },
      orderBy: { order: 'asc' },
      select: {
        problemId: true,
        order: true,
        problem: {
          select: {
            id: true,
            format: true,
            statementText: true,
            imageKey: true,
            choices: true,
            correctAnswer: true,
            choiceOptions: {
              select: { order: true, text: true, isCorrect: true, imageKey: true },
            },
          },
        },
      },
    }) as Promise<HomeworkProblemRow[]>;
  }

  /**
   * Autosave/шалгах: зөвхөн хөнгөн шалгалт (1 асуулга) — өөрийнх, IN_PROGRESS, хичээлийн
   * өдөр MAX_DAYS цонхонд. Бүтэн эрхийг (анги, B хувилбар) эхлүүлэх/илгээх үед шалгана.
   */
  private async assertStillHomework(attempt: AttemptRow) {
    if (attempt.round >= REDO_ROUND) return this.assertRedoStillOpen(attempt);
    const [enrolled, inClass, plannedInClass, futureAccess] = await Promise.all([
      this.prisma.enrollment.findFirst({
        where: {
          studentId: attempt.studentId,
          classroomId: attempt.classroomId,
          leftAt: null,
          classroom: { archived: false },
        },
        select: { id: true },
      }),
      this.prisma.classTestSession.findFirst({
        where: { classroomId: attempt.classroomId, testId: attempt.testId },
        select: { id: true },
      }),
      this.prisma.lessonTopic.findFirst({
        where: {
          testIds: { has: attempt.testId },
          schedule: { classroomId: attempt.classroomId },
        },
        select: { id: true },
      }),
      this.prisma.testAccess.findFirst({
        where: {
          classroomId: attempt.classroomId,
          testId: attempt.testId,
          assignedAt: { gt: new Date() },
        },
        select: { testId: true },
      }),
    ]);
    if (!enrolled || inClass || plannedInClass || futureAccess)
      throw new ForbiddenException('Энэ гэрийн даалгавар танд нээгдээгүй байна');
  }

  private async ownOpenAttempt(attemptId: string, studentId: string) {
    const attempt = (await this.prisma.homeworkAttempt.findUnique({
      where: { id: attemptId },
    })) as AttemptRow | null;
    if (!attempt || attempt.studentId !== studentId)
      throw new NotFoundException('Гэрийн даалгавар олдсонгүй');
    if (attempt.status === 'SUBMITTED')
      throw new ConflictException('Гэрийн даалгавар илгээгдсэн байна');
    const today = dateKey(todayUB());
    const date = dateKey(attempt.lessonDate);
    if (date > today || date < addDaysKey(today, -(MAX_DAYS - 1)))
      throw new ForbiddenException('Энэ гэрийн даалгаврын хугацаа дууссан байна');
    return attempt;
  }

  /** Сурагчийн өөрийн оролдлого + эрхийг ДАХИН (бүтнээр) шалгана — илгээх үед */
  private async ownAttempt(attemptId: string, studentId: string) {
    const attempt = (await this.prisma.homeworkAttempt.findUnique({
      where: { id: attemptId },
    })) as AttemptRow | null;
    if (!attempt || attempt.studentId !== studentId)
      throw new NotFoundException('Гэрийн даалгавар олдсонгүй');
    const date = dateKey(attempt.lessonDate);
    // Дахин бодох оролдлого: 2 хичээл өнгөрсөн, багш баталсан эсэхийг илгээхэд бүтнээр шалгана
    const { slot } =
      attempt.round >= REDO_ROUND
        ? await this.redoFor(studentId, attempt.testId, date)
        : await this.slotFor(studentId, attempt.testId, date);
    return { attempt, slot };
  }

  /* ───────── GET /homework/my ───────── */

  async my(studentId: string, daysRaw?: unknown) {
    const days = clampDays(daysRaw);
    const today = dateKey(todayUB());
    const fromKey = addDaysKey(today, -(days - 1));
    // B хувилбартай өдрүүд (онлайн бодолт — эрхийн дүрэм өөрчлөгдөөгүй) + одоогийн ангийн
    // ХИЧЭЭЛИЙН ӨДӨР БҮР (СУРАГЧ V2, эзэн 2026-10-31): B-гүй өдөр items: [] — зураг илгээнэ.
    const [slots, lessons] = await Promise.all([
      this.loadSlots(studentId, fromKey, today),
      loadLessonDays(this.prisma, studentId, fromKey, today),
    ]);
    type DayRow = {
      date: string;
      classroomId: string;
      classroomName: string;
      slot: HomeworkSlot | null;
      upcoming?: boolean;
    };
    const rows = new Map<string, DayRow>();
    for (const cls of lessons.classes)
      for (const date of visibleLessonDays(lessons, cls, fromKey))
        rows.set(dayKey(cls.classroomId, date), {
          date,
          classroomId: cls.classroomId,
          classroomName: cls.classroomName,
          slot: null,
        });
    // Ирэх 7 хоногийн хичээл — зургаа урьдчилан илгээнэ (эзэн 2026-10-31)
    const upcoming = await loadUpcomingDays(
      this.prisma,
      lessons.classes,
      addDaysKey(today, 1),
      addDaysKey(today, ADVANCE_DAYS),
    );
    for (const cls of lessons.classes)
      for (const date of upcoming.get(cls.classroomId) ?? [])
        rows.set(dayKey(cls.classroomId, date), {
          date,
          classroomId: cls.classroomId,
          classroomName: cls.classroomName,
          slot: null,
          upcoming: true,
        });
    for (const slot of slots) {
      const k = dayKey(slot.classroomId, slot.date);
      const row = rows.get(k);
      if (row) row.slot = slot;
      else
        rows.set(k, {
          date: slot.date,
          classroomId: slot.classroomId,
          classroomName: slot.classroomName,
          slot,
        });
    }
    if (!rows.size) return { days: [] };
    const list = [...rows.values()].sort(
      (a, b) =>
        b.date.localeCompare(a.date) ||
        a.classroomName.localeCompare(b.classroomName),
    );
    // D өдрийн тэмдэглэгээ D' (дараагийн хичээлийн өдөр) дээр: хичээлийн өдрийн нэгдлээс,
    // олдохгүй бол (ирээдүйд) B хувилбарын тестийн хуваарийн дараагийн өдөр
    const nextOf = (r: DayRow) =>
      nextLessonDay(lessons.byClass.get(r.classroomId) ?? [], r.date) ??
      // Өнөөдрийн дараах хичээл (хуваарьт) — хамгийн сүүлийн даалгаврын хугацаа
      nextLessonDay(
        [...(upcoming.get(r.classroomId) ?? [])].sort(),
        r.date,
      ) ??
      r.slot?.nextLessonDate ??
      null;
    const testIds = [
      ...new Set(slots.flatMap((s) => s.items.map((i) => i.id))),
    ];
    const nextDates = [...new Set(list.flatMap((r) => nextOf(r) ?? []))];
    const attemptsQuery = () =>
      this.prisma.homeworkAttempt.findMany({
        where: {
          studentId,
          testId: { in: testIds },
          round: 1,
          lessonDate: { gte: parseDateOnly(fromKey) },
        },
        select: {
          id: true,
          testId: true,
          lessonDate: true,
          status: true,
          checksUsed: true,
          score: true,
          total: true,
          submittedAt: true,
          deadlineAt: true,
        },
      });
    const [attempts, photos, marks] = await Promise.all([
      testIds.length
        ? attemptsQuery()
        : Promise.resolve([] as Awaited<ReturnType<typeof attemptsQuery>>),
      this.prisma.homeworkPhoto.findMany({
        where: {
          studentId,
          deletedAt: null,
          lessonDate: { gte: parseDateOnly(fromKey) },
        },
        select: {
          id: true,
          classroomId: true,
          lessonDate: true,
          fileKey: true,
          pages: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      nextDates.length
        ? this.prisma.dailyHomeworkMark.findMany({
            where: {
              studentId,
              classroomId: { in: [...new Set(list.map((r) => r.classroomId))] },
              date: { in: nextDates.map((d) => parseDateOnly(d)) },
            },
            select: {
              classroomId: true,
              date: true,
              status: true,
              comment: true,
            },
          })
        : Promise.resolve(
            [] as {
              classroomId: string;
              date: Date;
              status: string | null;
              comment: string | null;
            }[],
          ),
    ]);
    return {
      days: list.map((row) => {
        const slot = row.slot;
        const photo = photos.find(
          (p) =>
            p.classroomId === row.classroomId &&
            dateKey(p.lessonDate) === row.date,
        );
        const next = nextOf(row);
        const mark = next
          ? marks.find(
              (m) =>
                m.classroomId === row.classroomId && dateKey(m.date) === next,
            )
          : undefined;
        const deadlineAt = slot?.deadlineAt ?? (next ? ubDayStart(next) : null);
        return {
          date: row.date,
          classroomId: row.classroomId,
          classroomName: row.classroomName,
          deadlineAt: deadlineAt?.toISOString() ?? null,
          items: (slot?.items ?? []).map((item) => {
            const a = attempts.find(
              (x) => x.testId === item.id && dateKey(x.lessonDate) === row.date,
            );
            return {
              testId: item.id,
              title: item.title,
              variantLabel: variantOf(item),
              problemCount: item.problemCount,
              timeLimitMin: item.timeLimitMin,
              status: a ? a.status : 'NOT_STARTED',
              attemptId: a?.id ?? null,
              checksUsed: a?.checksUsed ?? 0,
              maxChecks: MAX_CHECKS,
              score:
                a?.status === 'SUBMITTED' &&
                a.score !== null &&
                a.total !== null
                  ? { correct: a.score, total: a.total }
                  : null,
              submittedAt: a?.submittedAt?.toISOString() ?? null,
              late: isLate(a?.submittedAt ?? null, a?.deadlineAt ?? deadlineAt),
            };
          }),
          photo: photo
            ? {
                id: photo.id,
                fileKey: photo.fileKey,
                pages: photo.pages,
                uploadedAt: photo.createdAt.toISOString(),
              }
            : null,
          mark: mark?.status ?? null,
          markComment: mark?.comment ?? null,
          upcoming: !!row.upcoming,
          topic: lessons.topics.get(dayKey(row.classroomId, row.date)) ?? null,
        };
      }),
    };
  }

  /**
   * Гэрийн даалгаврын зураг илгээх өдөр мөн эсэх: (1) одоогийн ангийн хичээлийн өдөр, сүүлийн
   * 14 хоногт (B хувилбар шаардахгүй — СУРАГЧ V2), эсвэл (2) өмнөх дүрмээр B хувилбартай өдөр.
   */
  private async photoDayAllowed(
    studentId: string,
    classroomId: string,
    date: string,
    today: string,
  ): Promise<boolean> {
    if (inAdvanceWindow(date, today)) {
      // Одоогийн анги (нэг асуулга); ирээдүйн өдөр тул өөрийн ирц байхгүй — элссэн өдрөөс хойш л
      const cls = await currentClass(this.prisma, studentId, classroomId);
      if (!cls || date < cls.joinedKey) return false;
      const upcoming = await loadUpcomingDays(this.prisma, [cls], date, date);
      return (upcoming.get(classroomId) ?? []).includes(date);
    }
    if (inUploadWindow(date, today)) {
      const set = await loadLessonDays(
        this.prisma,
        studentId,
        date,
        date,
        classroomId,
      );
      const cls = set.classes.find((c) => c.classroomId === classroomId);
      if (cls && visibleLessonDays(set, cls, date).includes(date)) return true;
    }
    const slots = await this.loadSlots(studentId, date, date, classroomId);
    return slots.some((s) => s.classroomId === classroomId && s.date === date);
  }

  /* ───────── POST /homework/attempts ───────── */

  async start(studentId: string, body: { testId?: unknown; date?: unknown }) {
    if (typeof body?.testId !== 'string' || !body.testId)
      throw new BadRequestException('testId шаардлагатай');
    const date = this.parseDate(body.date);
    const { slot, item } = await this.slotFor(studentId, body.testId, date);
    const attempt = await this.openAttempt(studentId, {
      classroomId: slot.classroomId,
      testId: item.id,
      date,
      round: 1,
      timeLimitMin: item.timeLimitMin,
      deadlineAt: () => this.deadlineFor(studentId, slot, date),
    });
    return this.attemptView(attempt, attempt.deadlineAt ?? slot.deadlineAt);
  }

  /** Оролдлого олох/үүсгэх; байгаа IN_PROGRESS-ийг нээх бүрт openCount +1 */
  private async openAttempt(
    studentId: string,
    o: {
      classroomId: string;
      testId: string;
      date: string;
      round: number;
      timeLimitMin: number | null;
      deadlineAt: () => Promise<Date | null>;
    },
  ): Promise<AttemptRow> {
    const where = {
      studentId_testId_lessonDate_round: {
        studentId,
        testId: o.testId,
        lessonDate: parseDateOnly(o.date),
        round: o.round,
      },
    };
    let attempt = (await this.prisma.homeworkAttempt.findUnique({
      where,
    })) as AttemptRow | null;
    if (!attempt) {
      try {
        attempt = (await this.prisma.homeworkAttempt.create({
          data: {
            studentId,
            classroomId: o.classroomId,
            testId: o.testId,
            lessonDate: parseDateOnly(o.date),
            round: o.round,
            deadlineAt: await o.deadlineAt(),
            timeLimitMin: o.timeLimitMin,
            openCount: 1,
          },
        })) as AttemptRow;
      } catch (e) {
        // Өөр төхөөрөмж зэрэг эхлүүлсэн — байгааг нь буцаана
        if ((e as { code?: string })?.code !== 'P2002') throw e;
        attempt = (await this.prisma.homeworkAttempt.findUnique({
          where,
        })) as AttemptRow | null;
        if (!attempt) throw e;
      }
    } else if (attempt.status === 'IN_PROGRESS') {
      // Нээх бүрт +1 (дахин ачаалах, өөр төхөөрөмж) — багш «хэдэн удаа орсон»-ыг харна
      const before = attempt.openCount ?? 0;
      const res = await this.prisma.homeworkAttempt.updateMany({
        where: { id: attempt.id, status: 'IN_PROGRESS' },
        data: { openCount: { increment: 1 } },
      });
      if (res.count) attempt = { ...attempt, openCount: before + 1 };
    }
    return attempt;
  }

  /* ───────── Дахин бодох (эзэн 2026-11-03) ───────── */

  /**
   * Хичээл `date`-ийн А (ангид бодсон) эсвэл Б (гэртээ) тестийг дахин бодох эрх: багш хичээлийг
   * баталсан (ClassTestSession), тэр ангид хичээлээс хойш REDO_LESSONS хичээл өнгөрсөн, тест
   * ирээдүйд тэр ангид дахин бодогдохоор төлөвлөгдөөгүй. Дуудлага бүрт сервер дахин шалгана.
   */
  private async redoFor(studentId: string, testId: string, date: string) {
    const denied = () =>
      new ForbiddenException('Энэ тестийг дахин бодох боломж танд нээгдээгүй байна');
    const today = dateKey(todayUB());
    if (date >= today || date < addDaysKey(today, -(MAX_DAYS - 1))) throw denied();
    const slots = await this.loadSlots(studentId, date, date);
    for (const slot of slots) {
      if (slot.date !== date) continue;
      const item = slot.items.find((i) => i.id === testId || i.fromTestId === testId);
      if (!item) continue;
      const lessons = await loadLessonDays(
        this.prisma,
        studentId,
        date,
        today,
        slot.classroomId,
      );
      if (!redoOpen(lessons.byClass.get(slot.classroomId) ?? [], date, today))
        throw denied();
      const confirmed = await this.prisma.classTestSession.findFirst({
        where: {
          classroomId: slot.classroomId,
          date: parseDateOnly(date),
          testId: item.fromTestId,
        },
        select: { id: true },
      });
      if (!confirmed) throw denied();
      if (testId === item.id) {
        return {
          slot,
          test: {
            id: item.id,
            title: item.title,
            variantLabel: variantOf(item),
            timeLimitMin: item.timeLimitMin,
            problemCount: item.problemCount,
          },
        };
      }
      const a = await this.prisma.test.findFirst({
        where: {
          id: item.fromTestId,
          deletedAt: null,
          isDraft: false,
          gradingMode: 'AUTO',
          type: { notIn: [...EXCLUDED_TYPES] },
        },
        select: {
          id: true,
          title: true,
          variantLabel: true,
          timeLimitMin: true,
          _count: { select: { problems: true } },
        },
      });
      if (!a || a._count.problems === 0) throw denied();
      if (await this.reservedForClass(slot.classroomId, a.id, today)) throw denied();
      return {
        slot,
        test: {
          id: a.id,
          title: a.title,
          variantLabel: variantOf({ variantLabel: a.variantLabel }),
          timeLimitMin: a.timeLimitMin,
          problemCount: a._count.problems,
        },
      };
    }
    throw denied();
  }

  /** Тест тэр ангид ирээдүйд (өнөөдрөөс хойш) бодогдохоор хуваарьлагдсан эсвэл оноогдсон уу */
  private async reservedForClass(
    classroomId: string,
    testId: string,
    today: string,
  ): Promise<boolean> {
    const [session, topic, access] = await Promise.all([
      this.prisma.classTestSession.findFirst({
        where: { classroomId, testId, date: { gt: parseDateOnly(today) } },
        select: { id: true },
      }),
      this.prisma.lessonTopic.findFirst({
        where: {
          testIds: { has: testId },
          date: { gt: parseDateOnly(today) },
          schedule: { classroomId },
        },
        select: { id: true },
      }),
      this.prisma.testAccess.findFirst({
        where: { classroomId, testId, assignedAt: { gt: new Date() } },
        select: { testId: true },
      }),
    ]);
    return !!(session || topic || access);
  }

  /** «Шалгах» хөнгөн шалгалт: анги идэвхтэй, тест тэр ангид ирээдүйд бодогдохоор болоогүй */
  private async assertRedoStillOpen(attempt: AttemptRow) {
    const enrolled = await this.prisma.enrollment.findFirst({
      where: {
        studentId: attempt.studentId,
        classroomId: attempt.classroomId,
        leftAt: null,
        classroom: { archived: false },
      },
      select: { id: true },
    });
    if (
      !enrolled ||
      (await this.reservedForClass(
        attempt.classroomId,
        attempt.testId,
        dateKey(todayUB()),
      ))
    )
      throw new ForbiddenException('Энэ тестийг дахин бодох боломж танд нээгдээгүй байна');
  }

  /** POST /homework/redo/attempts — дахин бодлогыг эхлүүлэх/үргэлжлүүлэх (нэг тест нэг удаа) */
  async startRedo(studentId: string, body: { testId?: unknown; date?: unknown }) {
    if (typeof body?.testId !== 'string' || !body.testId)
      throw new BadRequestException('testId шаардлагатай');
    const date = this.parseDate(body.date);
    const { slot, test } = await this.redoFor(studentId, body.testId, date);
    const attempt = await this.openAttempt(studentId, {
      classroomId: slot.classroomId,
      testId: test.id,
      date,
      round: REDO_ROUND,
      timeLimitMin: test.timeLimitMin,
      // Дахин бодолтод хугацаа тогтоохгүй — өөрийн цагаар (сорилын хугацаа л үйлчилнэ)
      deadlineAt: () => Promise.resolve(null),
    });
    return this.attemptView(attempt, null);
  }

  /**
   * GET /homework/redo — сүүлийн MAX_DAYS хоногийн баталгаажсан хичээл бүрийн А, Б тест:
   * нээгдсэн эсэх, анхны ба дахин бодсон оролдлогын дүн.
   */
  async redoList(studentId: string) {
    const today = dateKey(todayUB());
    const fromKey = addDaysKey(today, -(MAX_DAYS - 1));
    const slots = await this.loadSlots(studentId, fromKey, today);
    if (!slots.length) return { lessonsToOpen: REDO_LESSONS, days: [] };
    const classroomIds = [...new Set(slots.map((s) => s.classroomId))];
    const aIds = [
      ...new Set(slots.flatMap((s) => s.items.map((i) => i.fromTestId))),
    ];
    const bIds = slots.flatMap((s) => s.items.map((i) => i.id));
    const dates = [...new Set(slots.map((s) => parseDateOnly(s.date)))];
    const [lessons, confirmed, aTests, future, attempts] = await Promise.all([
      loadLessonDays(this.prisma, studentId, fromKey, today),
      this.prisma.classTestSession.findMany({
        where: {
          classroomId: { in: classroomIds },
          testId: { in: aIds },
          date: { in: dates },
        },
        select: { classroomId: true, testId: true, date: true },
      }),
      this.prisma.test.findMany({
        where: {
          id: { in: aIds },
          deletedAt: null,
          isDraft: false,
          gradingMode: 'AUTO',
          type: { notIn: [...EXCLUDED_TYPES] },
        },
        select: {
          id: true,
          title: true,
          variantLabel: true,
          timeLimitMin: true,
          _count: { select: { problems: true } },
        },
      }),
      Promise.all([
        this.prisma.classTestSession.findMany({
          where: {
            classroomId: { in: classroomIds },
            testId: { in: aIds },
            date: { gt: parseDateOnly(today) },
          },
          select: { classroomId: true, testId: true },
        }),
        this.prisma.lessonTopic.findMany({
          where: {
            testIds: { hasSome: aIds },
            date: { gt: parseDateOnly(today) },
            schedule: { classroomId: { in: classroomIds } },
          },
          select: { testIds: true, schedule: { select: { classroomId: true } } },
        }),
        this.prisma.testAccess.findMany({
          where: {
            classroomId: { in: classroomIds },
            testId: { in: aIds },
            assignedAt: { gt: new Date() },
          },
          select: { classroomId: true, testId: true },
        }),
      ]),
      this.prisma.homeworkAttempt.findMany({
        where: {
          studentId,
          testId: { in: [...aIds, ...bIds] },
          lessonDate: { in: dates },
        },
        select: {
          id: true,
          testId: true,
          lessonDate: true,
          round: true,
          status: true,
          score: true,
          total: true,
          submittedAt: true,
        },
        orderBy: { round: 'asc' },
      }),
    ]);
    const confirmedKeys = new Set(
      confirmed.map((c) => `${c.classroomId}|${dateKey(c.date)}|${c.testId}`),
    );
    const aById = new Map(aTests.map((t) => [t.id, t]));
    const [fSessions, fTopics, fAccess] = future;
    const reserved = new Set([
      ...fSessions.flatMap((r) => (r.testId ? [`${r.classroomId}|${r.testId}`] : [])),
      ...fTopics.flatMap((r) =>
        r.testIds.map((id) => `${r.schedule.classroomId}|${id}`),
      ),
      ...fAccess.map((r) => `${r.classroomId}|${r.testId}`),
    ]);
    const roundsOf = (testId: string, date: string) =>
      attempts
        .filter((a) => a.testId === testId && dateKey(a.lessonDate) === date)
        .map((a) => ({
          round: a.round,
          attemptId: a.id,
          status: a.status,
          score:
            a.status === 'SUBMITTED' && a.score !== null && a.total !== null
              ? { correct: a.score, total: a.total }
              : null,
          submittedAt: a.submittedAt?.toISOString() ?? null,
        }));
    const days = slots.flatMap((slot) => {
      const passed = lessonsPassedAfter(
        lessons.byClass.get(slot.classroomId) ?? [],
        slot.date,
        today,
      );
      const opened = passed >= REDO_LESSONS;
      const items = slot.items.flatMap((item) => {
        const out: RedoItem[] = [];
        const a = aById.get(item.fromTestId);
        if (
          a &&
          a._count.problems > 0 &&
          confirmedKeys.has(`${slot.classroomId}|${slot.date}|${a.id}`) &&
          !reserved.has(`${slot.classroomId}|${a.id}`)
        )
          out.push({
            testId: a.id,
            title: a.title,
            variantLabel: variantOf({ variantLabel: a.variantLabel }),
            kind: 'CLASS' as const,
            problemCount: a._count.problems,
            timeLimitMin: a.timeLimitMin,
            rounds: roundsOf(a.id, slot.date),
          });
        if (confirmedKeys.has(`${slot.classroomId}|${slot.date}|${item.fromTestId}`))
          out.push({
            testId: item.id,
            title: item.title,
            variantLabel: variantOf(item),
            kind: 'HOME' as const,
            problemCount: item.problemCount,
            timeLimitMin: item.timeLimitMin,
            rounds: roundsOf(item.id, slot.date),
          });
        return out;
      });
      if (!items.length) return [];
      return [
        {
          date: slot.date,
          classroomId: slot.classroomId,
          classroomName: slot.classroomName,
          topic: lessons.topics.get(dayKey(slot.classroomId, slot.date)) ?? null,
          opened,
          lessonsLeft: Math.max(0, REDO_LESSONS - passed),
          items,
        },
      ];
    });
    days.sort(
      (x, y) =>
        y.date.localeCompare(x.date) || x.classroomName.localeCompare(y.classroomName),
    );
    return { lessonsToOpen: REDO_LESSONS, days };
  }

  /**
   * Даалгаврын хугацаа = дараагийн хичээлийн өдрийн 00:00 (УБ). Батлагдсан хичээлийн дараагийнх
   * олдохгүй (төлөвлөсөн тестээр нээгдсэн, дараагийнх нь ClassTestSession-гүй) үед хуваарь/сэдвийн
   * хичээлийн өдрүүдээс олно.
   */
  private async deadlineFor(
    studentId: string,
    slot: HomeworkSlot,
    date: string,
  ): Promise<Date | null> {
    if (slot.deadlineAt) return slot.deadlineAt;
    const lessons = await loadLessonDays(
      this.prisma,
      studentId,
      date,
      addDaysKey(date, 60),
      slot.classroomId,
    );
    const next = nextLessonDay(lessons.byClass.get(slot.classroomId) ?? [], date);
    return next ? ubDayStart(next) : null;
  }

  private async attemptView(attempt: AttemptRow, deadlineAt: Date | null) {
    const [rows, last] = await Promise.all([
      this.loadProblems(attempt.testId),
      this.prisma.homeworkCheck.findFirst({
        where: {
          attemptId: attempt.id,
          ...(attempt.status === 'SUBMITTED' ? {} : { n: { gt: 0 } }),
        },
        // Илгээсэн бол эцсийн (n=0), үгүй бол сүүлийн «Шалгах»
        orderBy: { n: attempt.status === 'SUBMITTED' ? 'asc' : 'desc' },
        select: { results: true },
      }),
    ]);
    return {
      attemptId: attempt.id,
      round: attempt.round,
      status: attempt.status,
      startedAt: attempt.startedAt.toISOString(),
      deadlineAt: deadlineAt?.toISOString() ?? null,
      remainingSec:
        attempt.status === 'SUBMITTED'
          ? null
          : remainingSec(attempt.timeLimitMin, attempt.startedAt),
      checksUsed: attempt.checksUsed,
      score:
        attempt.status === 'SUBMITTED' &&
        attempt.score !== null &&
        attempt.total !== null
          ? { correct: attempt.score, total: attempt.total }
          : null,
      maxChecks: MAX_CHECKS,
      problems: rows.map(problemView),
      answers: asRecord(attempt.answers),
      lastCheck: last
        ? (asRecord(last.results) as Record<string, CheckResult>)
        : null,
      activity: activityOf(attempt),
      // Илгээсний дараа л зөв хариу, бодолт нээгдэнэ (эзэн 2026-11-03)
      review:
        attempt.status === 'SUBMITTED'
          ? await this.reviewOf(
              attempt.testId,
              attempt.deadlineAt,
              attempt.submittedAt,
              rows,
              last ? asRecord(last.results) : {},
            )
          : null,
    };
  }

  /**
   * Тест ангийн хуваарьт (өнөөдөр/ирээдүйд) ямар ч ангид бодогдох, эсвэл ирээдүйд оноогдох уу —
   * тэгвэл зөв хариуг ХЭЗЭЭ Ч нээхгүй (хариу бусад ангид дамжих эрсдэл; аюулгүй байдлын шалгалт).
   */
  private async reservedAnywhere(testId: string): Promise<boolean> {
    const today = todayUB();
    const [session, topic, access] = await Promise.all([
      this.prisma.classTestSession.findFirst({
        where: { testId, date: { gte: today } },
        select: { id: true },
      }),
      this.prisma.lessonTopic.findFirst({
        // Анхны огноо 14 хоногийн өмнөөс — хичээл ирээдүй рүү ЗӨӨГДСӨН (ScheduleException.newDate)
        // байж болно; зөөлтийг тусад нь тайлахгүй, хамгаалах талаар барина
        where: {
          testIds: { has: testId },
          date: { gte: new Date(today.getTime() - 14 * 86_400_000) },
        },
        select: { id: true },
      }),
      this.prisma.testAccess.findFirst({
        where: { testId, assignedAt: { gt: new Date() } },
        select: { testId: true },
      }),
    ]);
    return !!(session || topic || access);
  }

  /**
   * Илгээсэн даалгаврын алдсан бодлого бүрийн зөв хариу + баталгаажсан бодолт (байвал) + бичлэг.
   * ЗӨВХӨН илгээсний дараа. Хоосон (хариулаагүй) бодлогын хариуг даалгаврын хугацаа (дараагийн
   * хичээл) өнгөрсний дараа л нээнэ — хоосон илгээгээд хариуны түлхүүр авч бусдад дамжуулахаас
   * сэргийлнэ. Ангид бодогдох тест (reservedAnywhere) бол юу ч нээхгүй (`locked`).
   */
  private async reviewOf(
    testId: string,
    deadlineAt: Date | null,
    submittedAt: Date | null,
    rows: HomeworkProblemRow[],
    results: Record<string, unknown>,
  ): Promise<HwReviewPayload> {
    const missed = rows.filter((r) => {
      const res = results[r.problemId];
      return res === 'WRONG' || res === 'BLANK';
    });
    if (!missed.length) return { locked: false, opensAt: null, items: {} };
    if (await this.reservedAnywhere(testId))
      return { locked: true, opensAt: null, items: {} };
    const opensAt =
      deadlineAt ??
      (submittedAt ? new Date(submittedAt.getTime() + 72 * 3600_000) : null);
    const blankOpen = !!opensAt && Date.now() >= opensAt.getTime();
    const shown = missed.filter(
      (r) => results[r.problemId] === 'WRONG' || blankOpen,
    );
    const hasHiddenBlank = shown.length < missed.length;
    const extra = shown.length
      ? await this.prisma.problem.findMany({
          where: { id: { in: shown.map((r) => r.problemId) } },
          select: {
            id: true,
            youtubeUrl: true,
            analysis: { select: { status: true, solutionOutline: true } },
          },
        })
      : [];
    const byId = new Map(extra.map((x) => [x.id, x]));
    const items: Record<string, HwReviewItem> = {};
    for (const r of shown) {
      const x = byId.get(r.problemId);
      const a = x?.analysis;
      items[r.problemId] = {
        correct: correctAnswerView(r),
        // Бодолт зөвхөн VERIFIED үед (шалгалтын дүнтэй ижил дүрэм) — AI/авто ноорог задрахгүй
        solution:
          a?.status === 'VERIFIED' && a.solutionOutline ? a.solutionOutline : null,
        video: youtubeOf(x?.youtubeUrl),
      };
    }
    return {
      locked: false,
      opensAt: hasHiddenBlank ? (opensAt?.toISOString() ?? null) : null,
      items,
    };
  }

  /* ───────── PATCH /homework/attempts/:id ───────── */

  /** Хугацааны хязгаар (эхлэх үед хадгалсан) + зай өнгөрсөн эсэх — серверт хэрэгжүүлнэ */
  private timeExpired(attempt: AttemptRow): boolean {
    if (!attempt.timeLimitMin) return false;
    const limitMs = (attempt.timeLimitMin * 60 + TIME_GRACE_SEC) * 1000;
    return Date.now() > new Date(attempt.startedAt).getTime() + limitMs;
  }

  async save(
    studentId: string,
    attemptId: string,
    answers: unknown,
    activity?: unknown,
  ) {
    const attempt = await this.ownOpenAttempt(attemptId, studentId);
    if (this.timeExpired(attempt))
      throw new ConflictException('Хугацаа дууссан — илгээнэ үү');
    const rows = await this.loadProblems(attempt.testId);
    const merged = mergeAnswers(rows, attempt.answers, answers);
    const act = mergeActivity(activityOf(attempt), activity, attempt.startedAt);
    const res = await this.prisma.homeworkAttempt.updateMany({
      where: { id: attempt.id, status: 'IN_PROGRESS' },
      data: {
        answers: merged as Prisma.InputJsonValue,
        activeSec: act.activeSec,
        awaySec: act.awaySec,
        leaveCount: act.leaveCount,
      },
    });
    if (!res.count) throw new ConflictException('Гэрийн даалгавар илгээгдсэн байна');
    return { savedAt: new Date().toISOString() };
  }

  /* ───────── POST /homework/attempts/:id/check ───────── */

  async check(
    studentId: string,
    attemptId: string,
    answers: unknown,
    activity?: unknown,
  ) {
    const attempt = await this.ownOpenAttempt(attemptId, studentId);
    if (attempt.checksUsed >= MAX_CHECKS)
      throw new ConflictException('Шалгах эрх дууссан — одоо илгээнэ үү');
    if (this.timeExpired(attempt))
      throw new ConflictException('Хугацаа дууссан — илгээнэ үү');
    // «Шалгах» зөв/бурууг хэлдэг тул эрхийг дахин баталгаажуулна (дээд тал 2 удаа —
    // хямд): анги идэвхтэй хэвээр, тэр тестийг ангид хийх/оноох хуваарь гараагүй.
    await this.assertStillHomework(attempt);
    const rows = await this.loadProblems(attempt.testId);
    const merged = mergeAnswers(rows, attempt.answers, answers);
    const graded = gradeHomework(rows, merged);
    const act = mergeActivity(activityOf(attempt), activity, attempt.startedAt);
    const n = attempt.checksUsed + 1;
    await this.prisma.$transaction(async (tx) => {
      // Зэрэг хоёр «Шалгах» нэг эрхийг хоёр удаа хэрэглэхгүй (checksUsed-ээр түгжинэ)
      const res = await tx.homeworkAttempt.updateMany({
        where: {
          id: attempt.id,
          status: 'IN_PROGRESS',
          checksUsed: attempt.checksUsed,
        },
        data: {
          answers: merged as Prisma.InputJsonValue,
          activeSec: act.activeSec,
          awaySec: act.awaySec,
          leaveCount: act.leaveCount,
          checksUsed: n,
          ...(attempt.checksUsed === 0
            ? { firstAnswers: merged as Prisma.InputJsonValue }
            : {}),
        },
      });
      if (!res.count)
        throw new ConflictException('Шалгах эрх дууссан — одоо илгээнэ үү');
      await tx.homeworkCheck.create({
        data: {
          attemptId: attempt.id,
          n,
          answers: merged as Prisma.InputJsonValue,
          results: graded.results as Prisma.InputJsonValue,
        },
      });
    });
    return {
      checksUsed: n,
      results: graded.results,
      correct: graded.correct,
      total: graded.total,
    };
  }

  /* ───────── POST /homework/attempts/:id/submit ───────── */

  async submit(
    studentId: string,
    attemptId: string,
    answers: unknown,
    activity?: unknown,
  ) {
    const { attempt } = await this.ownAttempt(attemptId, studentId);
    if (attempt.status === 'SUBMITTED') return this.submittedView(attempt);
    const rows = await this.loadProblems(attempt.testId);
    // Хугацаа дууссаны дараах шинэ хариуг авахгүй — хадгалсан хариугаар дүгнэнэ
    const late = this.timeExpired(attempt);
    const merged = late
      ? mergeAnswers(rows, attempt.answers, {})
      : mergeAnswers(rows, attempt.answers, answers);
    const graded = gradeHomework(rows, merged);
    const submittedAt = new Date();
    const act = mergeActivity(
      activityOf(attempt),
      activity,
      attempt.startedAt,
      submittedAt,
    );
    const done = await this.prisma.$transaction(async (tx) => {
      const res = await tx.homeworkAttempt.updateMany({
        where: { id: attempt.id, status: 'IN_PROGRESS' },
        data: {
          answers: merged as Prisma.InputJsonValue,
          status: 'SUBMITTED',
          score: graded.correct,
          total: graded.total,
          submittedAt,
          activeSec: act.activeSec,
          awaySec: act.awaySec,
          leaveCount: act.leaveCount,
          ...(attempt.checksUsed === 0
            ? { firstAnswers: merged as Prisma.InputJsonValue }
            : {}),
        },
      });
      if (!res.count) return false;
      await tx.homeworkCheck.create({
        data: {
          attemptId: attempt.id,
          n: 0,
          answers: merged as Prisma.InputJsonValue,
          results: graded.results as Prisma.InputJsonValue,
        },
      });
      return true;
    });
    if (!done) {
      // Зэрэг илгээсэн — анхны илгээлтийг буцаана (давтан дуудалт аюулгүй)
      const fresh = (await this.prisma.homeworkAttempt.findUnique({
        where: { id: attempt.id },
      })) as AttemptRow | null;
      if (fresh?.status === 'SUBMITTED') return this.submittedView(fresh);
      throw new ConflictException('Гэрийн даалгаврыг илгээж чадсангүй');
    }
    return {
      score: { correct: graded.correct, total: graded.total },
      results: graded.results,
      submittedAt: submittedAt.toISOString(),
      review: await this.reviewOf(
        attempt.testId,
        attempt.deadlineAt,
        submittedAt,
        rows,
        graded.results,
      ),
    };
  }

  private async submittedView(attempt: AttemptRow) {
    const [final, rows] = await Promise.all([
      this.prisma.homeworkCheck.findFirst({
        where: { attemptId: attempt.id, n: 0 },
        select: { results: true },
      }),
      this.loadProblems(attempt.testId),
    ]);
    const results = asRecord(final?.results) as Record<string, CheckResult>;
    return {
      score: { correct: attempt.score ?? 0, total: attempt.total ?? 0 },
      results,
      submittedAt: attempt.submittedAt?.toISOString() ?? null,
      review: await this.reviewOf(
        attempt.testId,
        attempt.deadlineAt,
        attempt.submittedAt,
        rows,
        results,
      ),
    };
  }

  /* ───────── Зураг ───────── */

  async addPhoto(
    studentId: string,
    body: { classroomId?: unknown; date?: unknown; fileKey?: unknown; pages?: unknown },
  ) {
    if (typeof body?.classroomId !== 'string' || !body.classroomId)
      throw new BadRequestException('classroomId шаардлагатай');
    if (typeof body.fileKey !== 'string' || !body.fileKey)
      throw new BadRequestException('fileKey шаардлагатай');
    const pages = Number(body.pages);
    if (!Number.isInteger(pages) || pages < 1 || pages > MAX_PAGES)
      throw new BadRequestException(`1–${MAX_PAGES} хуудас илгээнэ үү`);
    const date = this.parseDate(body.date);
    const today = dateKey(todayUB());
    if (
      date > addDaysKey(today, ADVANCE_DAYS) ||
      date < addDaysKey(today, -(MAX_DAYS - 1))
    )
      throw new ForbiddenException('Энэ өдрийн гэрийн даалгавар нээгдээгүй байна');
    if (!(await this.photoDayAllowed(studentId, body.classroomId, date, today)))
      throw new ForbiddenException('Энэ өдрийн гэрийн даалгавар нээгдээгүй байна');

    // Файл: өөрийн байршуулсан, «homework» зорилготой (7 хоног хадгалах), PDF
    const file = await this.prisma.storedFile.findUnique({
      where: { key: body.fileKey },
      select: { ownerId: true, mime: true, size: true, pages: true, expiresAt: true },
    });
    if (!file || file.ownerId !== studentId)
      throw new ForbiddenException('Зөвхөн өөрийн байршуулсан файлыг илгээнэ үү');
    if (file.mime !== 'application/pdf' || file.size > PDF_MAX_BYTES || !file.expiresAt)
      throw new BadRequestException('Гэрийн даалгаврын PDF файл илгээнэ үү');
    // Хуудасны тоог зөвхөн серверт тоолсон StoredFile.pages-ээс авна (клиентийнхэд итгэхгүй)
    if (file.pages === null || file.pages === undefined)
      throw new BadRequestException('PDF файлын хуудсыг уншиж чадсангүй — дахин илгээнэ үү');
    const realPages = file.pages;
    if (realPages < 1 || realPages > MAX_PAGES)
      throw new BadRequestException(`1–${MAX_PAGES} хуудас илгээнэ үү`);

    const lessonDate = parseDateOnly(date);
    const photo = await this.prisma.$transaction(async (tx) => {
      const current = await tx.homeworkPhoto.findFirst({
        where: { studentId, classroomId: body.classroomId as string, lessonDate, deletedAt: null },
        orderBy: { createdAt: 'desc' },
      });
      if (current && current.fileKey === body.fileKey) return current; // давтан дуудалт
      await tx.homeworkPhoto.updateMany({
        where: { studentId, classroomId: body.classroomId as string, lessonDate, deletedAt: null },
        data: { deletedAt: new Date() },
      });
      return tx.homeworkPhoto.create({
        data: {
          studentId,
          classroomId: body.classroomId as string,
          lessonDate,
          fileKey: body.fileKey as string,
          pages: realPages,
        },
      });
    });
    return {
      id: photo.id,
      fileKey: photo.fileKey,
      pages: photo.pages,
      uploadedAt: photo.createdAt.toISOString(),
    };
  }

  async deletePhoto(studentId: string, id: string) {
    const photo = await this.prisma.homeworkPhoto.findUnique({
      where: { id },
      select: { studentId: true, deletedAt: true },
    });
    if (!photo || photo.studentId !== studentId)
      throw new NotFoundException('Зураг олдсонгүй');
    if (!photo.deletedAt)
      await this.prisma.homeworkPhoto.updateMany({
        where: { id, deletedAt: null },
        data: { deletedAt: new Date() },
      });
    return { deleted: true };
  }
}
