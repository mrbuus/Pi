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
  EXCLUDED_TYPES,
  TIME_GRACE_SEC,
  MAX_CHECKS,
  MAX_DAYS,
  buildSlots,
  clampDays,
  gradeHomework,
  isLate,
  mergeAnswers,
  problemView,
  remainingSec,
  variantOf,
  type CheckResult,
  type HomeworkProblemRow,
  type HomeworkSlot,
} from './homework-logic';

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
  status: 'IN_PROGRESS' | 'SUBMITTED';
  startedAt: Date;
  deadlineAt: Date | null;
  timeLimitMin: number | null;
  answers: unknown;
  checksUsed: number;
  score: number | null;
  total: number | null;
  submittedAt: Date | null;
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
    const doneIds = [
      ...new Set(
        sessions
          .filter((s) => s.testId && dateKey(s.date) <= toKey)
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
    const reserved = [...inClass, ...futureAccess].flatMap((r) =>
      r.testId ? [{ classroomId: r.classroomId, testId: r.testId }] : [],
    );
    return buildSlots({
      reserved,
      enrollments: enrollments.map((e) => ({
        classroomId: e.classroomId,
        classroomName: e.classroom.name,
        joinedKey: ubDateKey(e.joinedAt),
      })),
      sessions: sessions.map((s) => ({
        classroomId: s.classroomId,
        date: dateKey(s.date),
        testId: s.testId,
      })),
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
    const [enrolled, inClass, futureAccess] = await Promise.all([
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
      this.prisma.testAccess.findFirst({
        where: {
          classroomId: attempt.classroomId,
          testId: attempt.testId,
          assignedAt: { gt: new Date() },
        },
        select: { testId: true },
      }),
    ]);
    if (!enrolled || inClass || futureAccess)
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
    const { slot } = await this.slotFor(
      studentId,
      attempt.testId,
      dateKey(attempt.lessonDate),
    );
    return { attempt, slot };
  }

  /* ───────── GET /homework/my ───────── */

  async my(studentId: string, daysRaw?: unknown) {
    const days = clampDays(daysRaw);
    const today = dateKey(todayUB());
    const fromKey = addDaysKey(today, -(days - 1));
    const slots = await this.loadSlots(studentId, fromKey, today);
    if (!slots.length) return { days: [] };
    const testIds = [...new Set(slots.flatMap((s) => s.items.map((i) => i.id)))];
    const nextDates = [
      ...new Set(slots.flatMap((s) => (s.nextLessonDate ? [s.nextLessonDate] : []))),
    ];
    const [attempts, photos, marks] = await Promise.all([
      this.prisma.homeworkAttempt.findMany({
        where: {
          studentId,
          testId: { in: testIds },
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
        },
      }),
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
              classroomId: { in: [...new Set(slots.map((s) => s.classroomId))] },
              date: { in: nextDates.map((d) => parseDateOnly(d)) },
            },
            select: { classroomId: true, date: true, status: true },
          })
        : Promise.resolve(
            [] as { classroomId: string; date: Date; status: string | null }[],
          ),
    ]);
    return {
      days: slots.map((slot) => {
        const photo = photos.find(
          (p) =>
            p.classroomId === slot.classroomId &&
            dateKey(p.lessonDate) === slot.date,
        );
        const mark = slot.nextLessonDate
          ? marks.find(
              (m) =>
                m.classroomId === slot.classroomId &&
                dateKey(m.date) === slot.nextLessonDate,
            )
          : undefined;
        return {
          date: slot.date,
          classroomId: slot.classroomId,
          classroomName: slot.classroomName,
          deadlineAt: slot.deadlineAt?.toISOString() ?? null,
          items: slot.items.map((item) => {
            const a = attempts.find(
              (x) => x.testId === item.id && dateKey(x.lessonDate) === slot.date,
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
                a?.status === 'SUBMITTED' && a.score !== null && a.total !== null
                  ? { correct: a.score, total: a.total }
                  : null,
              submittedAt: a?.submittedAt?.toISOString() ?? null,
              late: isLate(a?.submittedAt ?? null, slot.deadlineAt),
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
        };
      }),
    };
  }

  /* ───────── POST /homework/attempts ───────── */

  async start(studentId: string, body: { testId?: unknown; date?: unknown }) {
    if (typeof body?.testId !== 'string' || !body.testId)
      throw new BadRequestException('testId шаардлагатай');
    const date = this.parseDate(body.date);
    const { slot, item } = await this.slotFor(studentId, body.testId, date);
    const where = {
      studentId_testId_lessonDate: {
        studentId,
        testId: item.id,
        lessonDate: parseDateOnly(date),
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
            classroomId: slot.classroomId,
            testId: item.id,
            lessonDate: parseDateOnly(date),
            deadlineAt: slot.deadlineAt,
            timeLimitMin: item.timeLimitMin,
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
    }
    return this.attemptView(attempt, slot.deadlineAt);
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
    };
  }

  /* ───────── PATCH /homework/attempts/:id ───────── */

  /** Хугацааны хязгаар (эхлэх үед хадгалсан) + зай өнгөрсөн эсэх — серверт хэрэгжүүлнэ */
  private timeExpired(attempt: AttemptRow): boolean {
    if (!attempt.timeLimitMin) return false;
    const limitMs = (attempt.timeLimitMin * 60 + TIME_GRACE_SEC) * 1000;
    return Date.now() > new Date(attempt.startedAt).getTime() + limitMs;
  }

  async save(studentId: string, attemptId: string, answers: unknown) {
    const attempt = await this.ownOpenAttempt(attemptId, studentId);
    if (this.timeExpired(attempt))
      throw new ConflictException('Хугацаа дууссан — илгээнэ үү');
    const rows = await this.loadProblems(attempt.testId);
    const merged = mergeAnswers(rows, attempt.answers, answers);
    const res = await this.prisma.homeworkAttempt.updateMany({
      where: { id: attempt.id, status: 'IN_PROGRESS' },
      data: { answers: merged as Prisma.InputJsonValue },
    });
    if (!res.count) throw new ConflictException('Гэрийн даалгавар илгээгдсэн байна');
    return { savedAt: new Date().toISOString() };
  }

  /* ───────── POST /homework/attempts/:id/check ───────── */

  async check(studentId: string, attemptId: string, answers: unknown) {
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

  async submit(studentId: string, attemptId: string, answers: unknown) {
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
    const done = await this.prisma.$transaction(async (tx) => {
      const res = await tx.homeworkAttempt.updateMany({
        where: { id: attempt.id, status: 'IN_PROGRESS' },
        data: {
          answers: merged as Prisma.InputJsonValue,
          status: 'SUBMITTED',
          score: graded.correct,
          total: graded.total,
          submittedAt,
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
    };
  }

  private async submittedView(attempt: AttemptRow) {
    const final = await this.prisma.homeworkCheck.findFirst({
      where: { attemptId: attempt.id, n: 0 },
      select: { results: true },
    });
    return {
      score: { correct: attempt.score ?? 0, total: attempt.total ?? 0 },
      results: asRecord(final?.results) as Record<string, CheckResult>,
      submittedAt: attempt.submittedAt?.toISOString() ?? null,
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
    if (date > today || date < addDaysKey(today, -(MAX_DAYS - 1)))
      throw new ForbiddenException('Энэ өдрийн гэрийн даалгавар нээгдээгүй байна');
    const slots = await this.loadSlots(studentId, date, date, body.classroomId);
    if (!slots.some((s) => s.classroomId === body.classroomId && s.date === date))
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
