import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { Role } from '../generated/prisma/enums';
import {
  addDateDays,
  dateKey,
  parseDateOnly,
  todayUB,
} from '../common/date';
import { markPlus, teacherPlusIds } from '../common/teacher-plus';
import { PrismaService } from '../prisma/prisma.service';
import {
  compareBookOrder,
  planTitle,
  suggestPhotoStudent,
  type DismissMode,
} from './lesson-plan.logic';
import { ScheduleService } from './schedule.service';
import {
  excludedNumbersOf,
  shortTestName,
} from '../class-sessions/roadmap.logic';

type Actor = { userId: string; role: Role };
const STAFF: Role[] = [Role.ADMIN, Role.TEACHER_PLUS, Role.TEACHER];
const PLANNERS: Role[] = [Role.ADMIN, Role.TEACHER_PLUS];
/** «Өмнөх хичээл»-ийг хайх хамгийн хол хугацаа */
const PREVIOUS_WINDOW_DAYS = 60;

export interface TestMeta {
  testId: string;
  title: string;
  short: string;
  variant: string | null;
  bookCode: string | null;
  bookTitle: string | null;
  chapterId: string | null;
  chapterOrder: number | null;
  chapterTitle: string | null;
  problemIds: string[];
  available: boolean;
}

/** Сурагчийн нэр — «Б. Анар» (овгийн эхний үсэг + нэр). */
function studentName(u: { firstName: string; lastName: string }): string {
  const initial = u.lastName.trim().charAt(0);
  return initial ? `${initial}. ${u.firstName.trim()}` : u.firstName.trim();
}

/**
 * Өдрийн хичээлийн ТӨЛӨВЛӨГӨӨ (эзэн 2026-10-18): хийх тестүүд (номын
 * дарааллаар), тарах/үлдэх (зөвхөн ажилтанд), онолын зураг илгээх сурагч.
 * Бичих — Багш+, Админ. dismissMode сурагчийн ямар ч хариунд ОРОХГҮЙ: энэ
 * үйлчилгээний бүх маршрут зөвхөн ажилтных.
 */
@Injectable()
export class LessonPlanService {
  constructor(
    private prisma: PrismaService,
    private schedule: ScheduleService,
  ) {}

  private parse(value: string): { date: Date; key: string } {
    try {
      const date = parseDateOnly(String(value ?? ''));
      return { date, key: dateKey(date) };
    } catch {
      throw new BadRequestException('Огноо буруу байна (YYYY-MM-DD)');
    }
  }

  private assertStaff(actor: Actor) {
    if (!STAFF.includes(actor.role))
      throw new ForbiddenException('Зөвхөн ажилтанд');
  }

  /** Тестүүдийн богино нэр, ном, бодлогын дараалал (дугаар = байр). */
  async testsMeta(ids: string[]): Promise<Map<string, TestMeta>> {
    const unique = [...new Set(ids.filter(Boolean))];
    if (!unique.length) return new Map();
    const rows = await this.prisma.test.findMany({
      where: { id: { in: unique } },
      select: {
        id: true,
        title: true,
        variantLabel: true,
        deletedAt: true,
        isDraft: true,
        chapterId: true,
        chapter: {
          select: {
            order: true,
            title: true,
            book: { select: { code: true, title: true } },
          },
        },
        problems: { orderBy: { order: 'asc' }, select: { problemId: true } },
      },
    });
    return new Map(
      rows.map((t) => [
        t.id,
        {
          testId: t.id,
          title: t.title,
          short: shortTestName(t.title),
          variant: t.variantLabel,
          bookCode: t.chapter?.book?.code ?? null,
          bookTitle: t.chapter?.book?.title ?? null,
          chapterId: t.chapterId,
          chapterOrder: t.chapter?.order ?? null,
          chapterTitle: t.chapter?.title ?? null,
          problemIds: t.problems.map((p) => p.problemId),
          available: !t.deletedAt && !t.isDraft,
        },
      ]),
    );
  }

  /** GET /schedule/plan-tests?ids= — нэмэлт тестийн бодлогын дараалал (хасах дугаар). */
  async planTests(actor: Actor, idsCsv: string) {
    this.assertStaff(actor);
    const ids = String(idsCsv ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 30);
    const meta = await this.testsMeta(ids);
    return [...meta.values()].filter((t) => t.available);
  }

  /**
   * `customTitle` — багшийн гараар бичсэн сэдэв (тестүүдийн нэрээс автоматаар
   * үүссэн гарчгаас ялгаатай бол), «Орох тест» талбарт урьдчилан бөглөнө.
   */
  private presentPlan(
    topic: {
      testIds: string[];
      dismissMode: string | null;
      photoStudentId: string | null;
      title: string;
      updatedAt: Date;
    } | null,
    meta: Map<string, TestMeta> = new Map(),
  ) {
    if (!topic) return null;
    const auto = planTitle(topic.testIds.map((id) => meta.get(id)?.short ?? ''));
    return {
      testIds: topic.testIds,
      dismissMode: (topic.dismissMode as DismissMode | null) ?? null,
      photoStudentId: topic.photoStudentId,
      title: topic.title || null,
      customTitle: topic.title && topic.title !== auto ? topic.title : null,
      updatedAt: topic.updatedAt,
    };
  }

  private async roster(classroomId: string) {
    const rows = await this.prisma.enrollment.findMany({
      where: { classroomId, leftAt: null, student: { archivedAt: null } },
      select: {
        studentId: true,
        student: { select: { firstName: true, lastName: true } },
      },
    });
    const seen = new Set<string>();
    return rows
      .filter((r) => !seen.has(r.studentId) && !!seen.add(r.studentId))
      .map((r) => ({ id: r.studentId, name: studentName(r.student) }))
      .sort((a, b) => a.name.localeCompare(b.name, 'mn'));
  }

  /** GET /schedule/:scheduleId/plan?date= — засварын цонхонд: төлөвлөгөө + ангийн жагсаалт + зургийн ээлж. */
  async getPlan(actor: Actor, scheduleId: string, dateStr: string) {
    if (!PLANNERS.includes(actor.role))
      throw new ForbiddenException('Зөвхөн Багш+, Админ');
    const { key } = this.parse(dateStr);
    const { schedule, key: occurrenceDate } =
      await this.schedule.occurrenceKey(scheduleId, key, false);
    const [topic, roster, history] = await Promise.all([
      this.prisma.lessonTopic.findUnique({
        where: {
          scheduleId_date: { scheduleId, date: parseDateOnly(occurrenceDate) },
        },
      }),
      this.roster(schedule.classroomId),
      this.prisma.lessonTopic.findMany({
        where: {
          schedule: { classroomId: schedule.classroomId },
          photoStudentId: { not: null },
          date: { lt: parseDateOnly(occurrenceDate) },
        },
        orderBy: { date: 'desc' },
        take: 120,
        select: { photoStudentId: true, date: true },
      }),
    ]);
    const meta = await this.testsMeta(topic?.testIds ?? []);
    return {
      scheduleId,
      classroomId: schedule.classroomId,
      date: key,
      occurrenceDate,
      plan: this.presentPlan(topic, meta),
      roster,
      photoSuggestion: suggestPhotoStudent(
        roster.map((r) => r.id),
        history.map((h) => ({
          studentId: h.photoStudentId!,
          date: dateKey(h.date),
        })),
      ),
    };
  }

  /** PUT /schedule/:scheduleId/plan — гарчиг тестүүдийн богино нэрээс автоматаар. */
  async putPlan(
    actor: Actor,
    scheduleId: string,
    dto: {
      date: string;
      testIds: string[];
      dismissMode?: DismissMode | null;
      photoStudentId?: string | null;
      title?: string | null;
    },
  ) {
    if (!PLANNERS.includes(actor.role))
      throw new ForbiddenException('Зөвхөн Багш+, Админ');
    const { key } = this.parse(dto.date);
    const { schedule, key: occurrenceDate } =
      await this.schedule.occurrenceKey(scheduleId, key, true);
    const date = parseDateOnly(occurrenceDate);
    const where = { scheduleId_date: { scheduleId, date } };
    const existing = await this.prisma.lessonTopic.findUnique({ where });

    const ids = [...new Set((dto.testIds ?? []).filter(Boolean))];
    const meta = await this.testsMeta([...ids, ...(existing?.testIds ?? [])]);
    const tests = ids.map((id) => meta.get(id));
    if (tests.some((t) => !t || !t.available))
      throw new BadRequestException('Сонгосон тест олдсонгүй');
    const sorted = (tests as TestMeta[]).sort((a, b) =>
      compareBookOrder(
        { bookCode: a.bookCode, chapterOrder: a.chapterOrder, variantLabel: a.variant },
        { bookCode: b.bookCode, chapterOrder: b.chapterOrder, variantLabel: b.variant },
      ),
    );

    const photoStudentId = dto.photoStudentId || null;
    if (photoStudentId) {
      const enrolled = await this.prisma.enrollment.findFirst({
        where: {
          classroomId: schedule.classroomId,
          studentId: photoStudentId,
          leftAt: null,
          student: { archivedAt: null },
        },
        select: { id: true },
      });
      if (!enrolled)
        throw new BadRequestException('Сонгосон сурагч энэ ангид алга');
    }
    const dismissMode = dto.dismissMode ?? null;

    // Гараар бичсэн гарчиг (хуучин «Сэдэв») — тестгүй үед хадгалагдана
    const previousAuto = planTitle(
      (existing?.testIds ?? []).map((id) => meta.get(id)?.short ?? ''),
    );
    // «Орох тест» чөлөөт бичвэр (эзэн 2026-10-27): өгсөн бол түүнийг л мөрдөнө
    const explicit = dto.title !== undefined;
    const typed = explicit ? (dto.title ?? '').replace(/\s+/g, ' ').trim().slice(0, 200) : '';
    const manualTitle = explicit
      ? typed || null
      : existing?.title && existing.title !== previousAuto
        ? existing.title
        : null;
    const title =
      explicit && manualTitle
        ? manualTitle
        : sorted.length
          ? planTitle(sorted.map((t) => t.short))
          : (manualTitle ?? '');
    const testIds = sorted.map((t) => t.testId);

    if (!testIds.length && !dismissMode && !photoStudentId && !manualTitle) {
      if (existing) {
        await this.prisma.lessonTopic.delete({ where: { id: existing.id } });
        await this.audit(actor, 'DELETE', existing.id, existing, null);
      }
      return { scheduleId, date: key, occurrenceDate, plan: null };
    }

    const data = {
      title,
      testIds,
      dismissMode,
      photoStudentId,
      // Ангийн «одоогийн бүлэг» (class-dashboard) — хамгийн хол тестийн бүлэг
      chapterId: sorted.length
        ? (sorted[sorted.length - 1].chapterId ?? null)
        : (existing?.chapterId ?? null),
    };
    const row = existing
      ? await this.prisma.lessonTopic.update({ where: { id: existing.id }, data })
      : await this.prisma.lessonTopic.create({
          data: { ...data, scheduleId, date, createdById: actor.userId },
        });
    await this.audit(actor, existing ? 'UPDATE' : 'CREATE', row.id, existing, row);
    return {
      scheduleId,
      date: key,
      occurrenceDate,
      plan: this.presentPlan(row, meta),
    };
  }

  private async audit(
    actor: Actor,
    action: string,
    entityId: string,
    before: unknown,
    after: unknown,
  ) {
    const json = (v: unknown) =>
      v === null || v === undefined
        ? Prisma.JsonNull
        : (JSON.parse(JSON.stringify(v)) as Prisma.InputJsonValue);
    await this.prisma.auditLog.create({
      data: {
        actorId: actor.userId,
        actorRole: actor.role,
        action,
        entity: 'LessonTopic',
        entityId,
        before: json(before),
        after: json(after),
      },
    });
  }

  /**
   * GET /schedule/day-plan?date= — өдрийн хуваарийн мөр бүрт хэрэгтэй БҮХ зүйл
   * НЭГ дуудлагаар: хичээл (зөөгдсөн/цуцлагдсаныг тооцсон), төлөвлөгөө, өмнөх
   * хичээлийн тест, тэр өдөр хийсэн тест (хассан дугаар), тэмдэглэл, батламж,
   * тарсан цаг. Зөвхөн ажилтан.
   */
  async dayPlan(actor: Actor, dateStr: string) {
    this.assertStaff(actor);
    const { date, key } = this.parse(dateStr);
    const week = await this.schedule.getWeek(key);
    const day = week.days[0];
    const entries = day?.entries ?? [];
    const scheduleIds = [...new Set(entries.map((e) => e.scheduleId))];
    const classIds = [...new Set(entries.map((e) => e.classroomId))];
    const occurrenceOf = (e: (typeof entries)[number]) =>
      e.exception?.originalDate ?? key;

    const none = <T>() => Promise.resolve([] as T[]);
    const [
      topics,
      notes,
      records,
      dismissals,
      todaySessions,
      prevSessions,
      enrollments,
      classrooms,
    ] = await Promise.all([
      entries.length
        ? this.prisma.lessonTopic.findMany({
            where: {
              OR: entries.map((e) => ({
                scheduleId: e.scheduleId,
                date: parseDateOnly(occurrenceOf(e)),
              })),
            },
          })
        : none<Prisma.LessonTopicGetPayload<object>>(),
      this.prisma.lessonNote.findMany({
        where: { date, scheduleId: { in: scheduleIds } },
      }),
      this.prisma.lessonRecord.findMany({
        where: { date, scheduleId: { in: scheduleIds } },
      }),
      this.prisma.classDismissal.findMany({
        where: { date, classroomId: { in: classIds } },
        select: { classroomId: true, approximateAt: true },
      }),
      this.prisma.classTestSession.findMany({
        where: { date, classroomId: { in: classIds } },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.classTestSession.findMany({
        where: {
          classroomId: { in: classIds },
          testId: { not: null },
          date: { lt: date, gte: addDateDays(date, -PREVIOUS_WINDOW_DAYS) },
        },
        orderBy: { date: 'desc' },
      }),
      this.prisma.enrollment.findMany({
        where: {
          classroomId: { in: classIds },
          leftAt: null,
          student: { archivedAt: null },
        },
        select: { classroomId: true, studentId: true },
      }),
      this.prisma.classroom.findMany({
        where: { id: { in: classIds } },
        select: { id: true, teacherId: true, assistantTeacherId: true },
      }),
    ]);
    // Snapshot нэрэнд Багш+ тэмдэг (эзэн 2026-10-23)
    const plusIds = await teacherPlusIds(this.prisma, [
      ...notes.map((n) => n.updatedById),
      ...records.map((r) => r.confirmedById),
    ]);

    const staffIds = [
      ...new Set(
        entries.flatMap((e) =>
          [e.leadTeacher?.id, e.assistantTeacher?.id].filter(
            (v): v is string => !!v,
          ),
        ),
      ),
    ];
    const photoIds = [
      ...new Set(topics.flatMap((t) => (t.photoStudentId ? [t.photoStudentId] : []))),
    ];
    const people = staffIds.length || photoIds.length
      ? await this.prisma.user.findMany({
          where: { id: { in: [...staffIds, ...photoIds] } },
          select: { id: true, role: true, firstName: true, lastName: true },
        })
      : [];
    const personById = new Map(people.map((p) => [p.id, p]));

    // Анги бүрийн өмнөх хичээл = тухайн өдрөөс өмнөх хамгийн сүүлийн ClassTestSession-ий өдөр
    const previousByClass = new Map<string, { date: string; sessions: typeof prevSessions }>();
    for (const s of prevSessions) {
      const k = dateKey(s.date);
      const cur = previousByClass.get(s.classroomId);
      if (!cur) previousByClass.set(s.classroomId, { date: k, sessions: [s] });
      else if (cur.date === k) cur.sessions.push(s);
    }
    const topicByKey = new Map(
      topics.map((t) => [`${t.scheduleId}|${dateKey(t.date)}`, t]),
    );
    const meta = await this.testsMeta([
      ...topics.flatMap((t) => t.testIds),
      ...todaySessions.flatMap((s) => (s.testId ? [s.testId] : [])),
      ...[...previousByClass.values()].flatMap((p) =>
        p.sessions.flatMap((s) => (s.testId ? [s.testId] : [])),
      ),
    ]);
    const nums = (testId: string | null, excluded: string[]) =>
      testId ? excludedNumbersOf(meta.get(testId)?.problemIds ?? [], excluded) : [];
    const countByClass = new Map<string, Set<string>>();
    for (const e of enrollments) {
      const set = countByClass.get(e.classroomId) ?? new Set<string>();
      set.add(e.studentId);
      countByClass.set(e.classroomId, set);
    }
    const classById = new Map(classrooms.map((c) => [c.id, c]));
    const withRole = (p: { id: string; name: string } | null | undefined) =>
      p ? { ...p, role: personById.get(p.id)?.role ?? null } : null;

    // «Багшийн ажлын өдөр» табтай ЯГ ижил эх сурвалж (resolveTeacherRoster) —
    // тухайн огнооны мөрийг огноогоор нь олно (индексээр биш)
    const rosterDay = week.teacherRoster.find((r) => r.date === key) ?? null;
    return {
      date: key,
      today: dateKey(todayUB()),
      roster: rosterDay
        ? {
            parity: rosterDay.parity,
            mode: rosterDay.mode,
            inRange: rosterDay.inRange,
            teachers: rosterDay.teachers.map((t) => ({
              id: t.id,
              name: t.name,
              role: t.role ?? null,
            })),
          }
        : null,
      isHoliday: day?.isHoliday ?? false,
      holiday: day?.holiday ?? null,
      restingClasses: day?.restingClasses ?? [],
      viewer: {
        role: actor.role,
        canPlan: PLANNERS.includes(actor.role),
        canConfirm: PLANNERS.includes(actor.role),
      },
      entries: entries.map((e) => {
        const occurrenceDate = occurrenceOf(e);
        const topic = topicByKey.get(`${e.scheduleId}|${occurrenceDate}`) ?? null;
        const photo = topic?.photoStudentId
          ? personById.get(topic.photoStudentId)
          : null;
        const prev = previousByClass.get(e.classroomId);
        const note = notes.find((n) => n.scheduleId === e.scheduleId);
        const record = records.find((r) => r.scheduleId === e.scheduleId);
        const cls = classById.get(e.classroomId);
        return {
          ...e,
          leadTeacher: withRole(e.leadTeacher),
          assistantTeacher: withRole(e.assistantTeacher),
          occurrenceDate,
          students: countByClass.get(e.classroomId)?.size ?? 0,
          mine: [
            e.leadTeacher?.id,
            e.assistantTeacher?.id,
            e.teacherId,
            cls?.teacherId,
            cls?.assistantTeacherId,
          ].includes(actor.userId),
          plan: topic
            ? {
                testIds: topic.testIds,
                dismissMode: (topic.dismissMode as DismissMode | null) ?? null,
                photoStudent: photo
                  ? { id: photo.id, name: studentName(photo) }
                  : null,
              }
            : null,
          previous: prev
            ? {
                date: prev.date,
                tests: prev.sessions.map((s) => ({
                  testId: s.testId!,
                  excludedNumbers: nums(s.testId, s.excludedProblemIds),
                })),
              }
            : null,
          done: todaySessions
            .filter((s) => s.classroomId === e.classroomId)
            .map((s) => ({
              sessionId: s.id,
              testId: s.testId,
              manualTitle: s.manualTitle,
              excludedNumbers: nums(s.testId, s.excludedProblemIds),
              excludedProblemIds: s.excludedProblemIds,
            })),
          note: note
            ? {
                body: note.body,
                updatedByName: markPlus(note.updatedByName, note.updatedById, plusIds),
                updatedAt: note.updatedAt,
              }
            : null,
          record: record
            ? {
                confirmedByName: markPlus(record.confirmedByName, record.confirmedById, plusIds),
                confirmedAt: record.confirmedAt,
                testCount: record.testCount,
                enrolledCount: record.enrolledCount,
                presentCount: record.presentCount,
                absentCount: record.absentCount,
                attendanceMarked: record.attendanceMarked,
                // Батлахад бичсэн сэдэв, тайлбар, бодлогын дугаар (эзэн 2026-10-27)
                topic: record.topic,
                description: record.description,
                problemNumbersText: record.problemNumbersText,
                problemNumbers: record.problemNumbers,
              }
            : null,
          dismissalAt:
            dismissals.find((d) => d.classroomId === e.classroomId)
              ?.approximateAt ?? null,
        };
      }),
      tests: Object.fromEntries(
        [...meta.values()].map((t) => [
          t.testId,
          {
            testId: t.testId,
            title: t.title,
            short: t.short,
            variant: t.variant,
            bookTitle: t.bookTitle,
            chapterTitle: t.chapterTitle,
            problemIds: t.problemIds,
          },
        ]),
      ),
    };
  }
}
