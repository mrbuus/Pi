import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { Role } from '../generated/prisma/enums';
import { dateKey, parseDateOnly, todayUB } from '../common/date';
import { classTeacherWhere } from '../common/class-teachers';
import { markPlus, teacherPlusIds } from '../common/teacher-plus';
import { PrismaService } from '../prisma/prisma.service';
import { ScheduleService } from '../schedule/schedule.service';
import {
  buildSnapshot,
  cleanText,
  DESCRIPTION_MAX,
  enrolledOn,
  normalizeNote,
  parseProblemNumbers,
  PROBLEM_TEXT_MAX,
  ubDayBounds,
} from './lesson-records.logic';
import {
  cleanCustomTopics,
  compareBookOrder,
  isAutoTitle,
  planTitle,
  storedCustomTopics,
} from '../schedule/lesson-plan.logic';
import { shortTestName } from '../class-sessions/roadmap.logic';
import { LESSON_TOPIC_BLANK } from '../common/soft-delete';
import {
  cleanExcluded,
  isStale,
  planSessionSync,
  recordTestIds,
  sessionVisibleFor,
} from '../schedule/lesson-coherence.logic';

/** Батлахад багшийн бичих нэмэлт (эзэн 2026-10-27). undefined = өмнөхийг хадгална. */
export interface ConfirmDetails {
  /** Хуучин клиент: чөлөөт сэдвүүдийг «, »-оор нэгтгэсэн нэг мөр */
  topic?: string | null;
  /** Бодлогын санд байхгүй сэдвүүд (шинэ клиент) — өгвөл `topic`-ыг үл тооно */
  customTopics?: string[];
  description?: string | null;
  problemNumbers?: string | null;
  /** Цонх нээх үеийн батламжийн confirmedAt (null = батлаагүй байсан); өөр хүн хооронд нь батлавал 409 */
  expectedConfirmedAt?: string | null;
}

export type Actor = { userId: string; role: Role };

const STAFF: Role[] = [Role.ADMIN, Role.TEACHER_PLUS, Role.TEACHER];
/** Батлах/буцаах эрх (эзэн 2026-10-18) */
const CONFIRMERS: Role[] = [Role.ADMIN, Role.TEACHER_PLUS, Role.TEACHER];

/**
 * Батлагдсан хичээлийн түүх (эзэн 2026-10-08).
 *
 * - Батлах/буцаах: зөвхөн ADMIN/TEACHER_PLUS (эзэн 2026-10-18) — батлахдаа
 *   ангийн бодитоор хийсэн тест, хассан бодлогыг хамт бичнэ (ClassTestSession).
 * - Тайлбар: бүх ажилтан бичнэ; сурагч/эцэг эх ХЭЗЭЭ Ч авахгүй (энд л уншина).
 * - Өөрчлөлт бүр AuditLog-д (schedule.service-ийн recordAudit загвар).
 */
@Injectable()
export class LessonRecordsService {
  constructor(
    private prisma: PrismaService,
    private schedule: ScheduleService,
  ) {}

  private parseDate(value: string): { date: Date; key: string } {
    try {
      const date = parseDateOnly(String(value ?? ''));
      return { date, key: dateKey(date) };
    } catch {
      throw new BadRequestException('Огноогоо шалгана уу.');
    }
  }

  private assertStaff(actor: Actor) {
    if (!STAFF.includes(actor.role))
      throw new ForbiddenException('Энэ үйлдэл зөвхөн ажилтанд.');
  }

  private async actorName(userId: string) {
    const u = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { firstName: true, lastName: true },
    });
    return u ? `${u.firstName} ${u.lastName}`.trim() : '—';
  }

  private async audit(
    actor: Actor,
    action: string,
    entity: string,
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
        entity,
        entityId,
        before: json(before),
        after: json(after),
      },
    });
  }

  /** Тухайн хуваарийн тухайн өдрийн БОДИТ (зөөгдсөн/цуцлагдсаныг тооцсон) хичээл. */
  async resolveEntry(scheduleId: string, key: string) {
    const schedule = await this.prisma.classSchedule.findUnique({
      where: { id: scheduleId, deletedAt: null },
      select: {
        classroomId: true,
        teacherId: true,
        classroom: { select: { teacherId: true } },
      },
    });
    if (!schedule) throw new NotFoundException('Хуваарь олдсонгүй');
    const week = await this.schedule.getWeek(key, [schedule.classroomId]);
    const entry = week.days
      .find((d) => d.date === key)
      ?.entries.find((e) => e.scheduleId === scheduleId);
    if (!entry)
      throw new NotFoundException('Энэ өдөр энэ хичээл товлогдоогүй байна.');
    return { schedule, entry };
  }

  private assertCanConfirm(actor: Actor) {
    if (!CONFIRMERS.includes(actor.role))
      throw new ForbiddenException('Хичээлийг багш батална.');
  }

  /**
   * Тухайн өдрийн ангийн сангийн тестийн бүртгэлийг `tests`-ээр солино: жагсаалтад
   * байгааг upsert (хассан бодлоготой), байхгүйг хасна. Гараар бичсэн (testId-гүй)
   * бүртгэл, ӨӨР хичээлийн (тэр өдөр мөн хичээлтэй) батламжид орсон тестэд хүрэхгүй.
   *
   * Хассан бүртгэлийн БҮТЭН мөр AuditLog-д (DELETE) үлдэнэ. Сурагчийн оройн тэмдэглэгээ
   * (Attempt), гэрийн даалгавар (HomeworkAttempt) ХЭЗЭЭ Ч устахгүй — тэд бодлого/огноогоор
   * хадгалагддаг тул буцааж нэмэхэд дахин холбогдоно (эзэн 2026-11-08).
   */
  private async syncTests(
    classroomId: string,
    date: Date,
    tests: { testId: string; excludedProblemIds: string[] }[],
    actor: Actor,
    otherLessonsTests: ReadonlySet<string>,
  ) {
    const byId = new Map<string, string[]>();
    for (const t of tests) byId.set(t.testId, [...new Set(t.excludedProblemIds ?? [])]);
    const ids = [...byId.keys()];
    const before = await this.prisma.classTestSession.findMany({
      where: { classroomId, date, testId: { not: null } },
    });
    const recorded = new Set(before.map((b) => b.testId));
    const rows = ids.length
      ? await this.prisma.test.findMany({
          where: { id: { in: ids } },
          select: {
            id: true,
            deletedAt: true,
            problems: { orderBy: { order: 'asc' }, select: { problemId: true } },
          },
        })
      : [];
    // Тэр өдөр аль хэдийн бүртгэгдсэн тест хожим устсан ч батламжийг дахин хадгалж болно
    // (өмнө нь «Сонгосон тест олдсонгүй» гэж гацдаг байсан); ШИНЭЭР нэмэх тест бэлэн байх ёстой
    const usable = rows.filter((r) => !r.deletedAt || recorded.has(r.id));
    if (usable.length !== ids.length) throw new BadRequestException('Сонгосон тест олдсонгүй.');
    for (const r of usable)
      byId.set(r.id, cleanExcluded(byId.get(r.id)!, r.problems.map((p) => p.problemId)));

    const { remove } = planSessionSync(before, ids, otherLessonsTests);
    const removed = before.filter((b) => remove.includes(b.id));
    await this.prisma.$transaction(async (tx) => {
      if (remove.length) await tx.classTestSession.deleteMany({ where: { id: { in: remove } } });
      for (const testId of ids)
        await tx.classTestSession.upsert({
          where: { classroomId_testId_date: { classroomId, testId, date } },
          create: {
            classroomId,
            testId,
            date,
            createdById: actor.userId,
            excludedProblemIds: byId.get(testId)!,
          },
          update: { excludedProblemIds: byId.get(testId)! },
        });
    });
    for (const r of removed)
      await this.audit(actor, 'DELETE', 'ClassTestSession', r.id, r, null);
    await this.audit(actor, 'UPDATE', 'ClassTestSession', `${classroomId}:${dateKey(date)}`, before, {
      tests: ids.map((id) => ({ testId: id, excludedProblemIds: byId.get(id) })),
    });
  }

  /** Тухайн анги тухайн өдөр ӨӨР хичээлийн (батлагдсан) snapshot-д орсон тестүүд. */
  private async otherLessonsTests(classroomId: string, date: Date, scheduleId: string) {
    const others = await this.prisma.lessonRecord.findMany({
      where: { classroomId, date, cancelledAt: null, scheduleId: { not: scheduleId } },
      select: { tests: true },
    });
    return new Set(others.flatMap((r) => recordTestIds(r.tests)));
  }

  // ---------- Батлах ----------

  async confirm(
    actor: Actor,
    scheduleId: string,
    dateStr: string,
    tests?: { testId: string; excludedProblemIds: string[] }[],
    details: ConfirmDetails = {},
  ) {
    this.assertCanConfirm(actor);
    const { date, key } = this.parseDate(dateStr);
    if (date > todayUB())
      throw new BadRequestException('Ирээдүйн хичээлийг батлах боломжгүй.');
    const { entry } = await this.resolveEntry(scheduleId, key);
    // Зэрэг засвар: өөр багш энэ хооронд баталсан/зассан бол дарж бичихгүй
    if (details.expectedConfirmedAt !== undefined) {
      const current = await this.prisma.lessonRecord.findUnique({
        where: { scheduleId_date: { scheduleId, date } },
        select: { confirmedAt: true, cancelledAt: true },
      });
      if (isStale(details.expectedConfirmedAt, current && !current.cancelledAt ? current.confirmedAt : null))
        throw new ConflictException(
          'Энэ хичээлийг өөр хүн дөнгөж баталсан эсвэл зассан байна. Цонхоо хаагаад дахин нээнэ үү.',
        );
    }
    const others = await this.otherLessonsTests(entry.classroomId, date, scheduleId);
    if (tests) await this.syncTests(entry.classroomId, date, tests, actor, others);

    const { start, end } = ubDayBounds(key);
    const [enrollments, attendance, daySessions] = await Promise.all([
      this.prisma.enrollment.findMany({
        where: {
          classroomId: entry.classroomId,
          OR: [{ leftAt: null }, { leftAt: { gte: start } }],
        },
        select: {
          studentId: true,
          joinedAt: true,
          leftAt: true,
          student: { select: { firstName: true, lastName: true } },
        },
      }),
      this.prisma.attendance.findMany({
        where: { classroomId: entry.classroomId, date },
        select: { studentId: true, status: true },
      }),
      this.prisma.classTestSession.findMany({
        where: { classroomId: entry.classroomId, date },
        select: { id: true, testId: true, manualTitle: true },
        orderBy: { createdAt: 'asc' },
      }),
    ]);
    // Энэ хичээлд илгээсэн тест ∪ өөр хичээлийнх биш бүртгэл (ганц хичээлтэй өдөр — бүгд)
    const own = new Set(tests?.map((t) => t.testId) ?? []);
    const sessions = daySessions.filter((s) => sessionVisibleFor(s.testId, own, others));
    const testIds = sessions.flatMap((s) => (s.testId ? [s.testId] : []));
    const testRows = testIds.length
      ? await this.prisma.test.findMany({
          where: { id: { in: testIds } },
          select: {
            id: true,
            title: true,
            chapterId: true,
            variantLabel: true,
            chapter: { select: { order: true, book: { select: { code: true } } } },
          },
        })
      : [];
    const testTitles = new Map(testRows.map((t) => [t.id, t.title]));
    // Өөр ангиас шилжсэн эсэх — тэдэнд л joinedAt мөрдөнө (logic-ийн тайлбар)
    const late = enrollments.filter((e) => e.joinedAt >= end);
    const movedIds = new Set(
      late.length
        ? (
            await this.prisma.enrollment.findMany({
              where: {
                studentId: { in: late.map((e) => e.studentId) },
                classroomId: { not: entry.classroomId },
                leftAt: { not: null },
              },
              select: { studentId: true },
            })
          ).map((r) => r.studentId)
        : [],
    );
    const seen = new Set<string>();
    const students = enrollments
      .filter((e) => enrolledOn({ ...e, movedIn: movedIds.has(e.studentId) }, key))
      .filter((e) => !seen.has(e.studentId) && !!seen.add(e.studentId))
      .map((e) => ({
        id: e.studentId,
        name: `${e.student.firstName} ${e.student.lastName}`.trim(),
      }))
      .sort((a, b) => a.name.localeCompare(b.name, 'mn'));

    const snap = buildSnapshot({
      entry,
      students,
      attendance,
      tests: sessions.map((s) => ({
        id: s.id,
        testId: s.testId,
        title:
          (s.testId ? testTitles.get(s.testId) : s.manualTitle) ??
          s.manualTitle ??
          'Тест',
      })),
    });
    const confirmedByName = await this.actorName(actor.userId);
    // Цуцлагдсан (cancelledAt) мөр ч энд ирнэ — @@unique [scheduleId, date] тул
    // шинээр үүсгэхгүй, тэр мөрийг СЭРГЭЭНЭ. Өмнөх утга (сурагчидтай) AuditLog-д.
    const before = await this.prisma.lessonRecord.findUnique({
      where: { scheduleId_date: { scheduleId, date } },
      include: { students: true },
    });

    // Сэдэв = ХИЙСЭН тестүүд (номын дарааллаар, товчилсон) + бодлогын санд байхгүй сэдвүүд.
    // Өмнө нь төлөвлөгөөний гарчгийг авдаг байсан тул буруу тестийг хассаны дараа ч
    // батламжийн сэдэвт тэр тест үлддэг байв (эзэн 2026-11-08).
    const storedPlan = await this.prisma.lessonTopic.findUnique({
      where: {
        scheduleId_date: {
          scheduleId,
          date: parseDateOnly(entry.exception?.originalDate ?? key),
        },
      },
    });
    // Устсан (deletedAt) төлөвлөгөө = байхгүй
    const plan = storedPlan && !storedPlan.deletedAt ? storedPlan : null;
    const ordered = sortByBook(testRows.filter((t) => testIds.includes(t.id)));
    const shortNames = ordered.map((t) => shortTestName(t.title));
    const customTopics = await this.resolveCustomTopics(details, plan, shortNames);
    const topic = planTitle([...shortNames, ...customTopics]) || null;
    // Тайлбар, бодлогын дугаар — өгөөгүй (undefined) бол өмнөх батламжийнхыг хадгална
    const description =
      details.description === undefined
        ? (before?.description ?? null)
        : cleanText(details.description, DESCRIPTION_MAX);
    const problemNumbersText =
      details.problemNumbers === undefined
        ? (before?.problemNumbersText ?? null)
        : cleanText(details.problemNumbers, PROBLEM_TEXT_MAX);
    const problemNumbers = parseProblemNumbers(problemNumbersText) ?? [];

    const record = await this.prisma.$transaction(async (tx) => {
      const data = {
        ...snap.record,
        topic,
        description,
        problemNumbersText,
        problemNumbers,
        tests: snap.record.tests as Prisma.InputJsonValue,
        confirmedById: actor.userId,
        confirmedByName,
        confirmedAt: new Date(),
      };
      const row = await tx.lessonRecord.upsert({
        where: { scheduleId_date: { scheduleId, date } },
        create: { ...data, date },
        update: { ...data, cancelledAt: null, cancelledById: null },
      });
      await this.syncStudents(tx, row.id, before?.students ?? [], snap.students);
      return row;
    });
    await this.audit(
      actor,
      !before ? 'CONFIRM' : before.cancelledAt ? 'RECONFIRM' : 'UPDATE',
      'LessonRecord',
      record.id,
      before,
      {
        ...snap.record,
        topic,
        description,
        problemNumbersText,
        date: key,
        students: snap.students.length,
      },
    );
    await this.syncLessonTopic(actor, entry, key, plan, ordered, customTopics);
    return this.present(record, await this.plusOf([record]));
  }

  /**
   * Snapshot-ийн сурагчдыг бичнэ — ХЭЗЭЭ Ч устгахгүй (эзэн 2026-10-23): шинийг
   * нэмнэ, байгааг шинэчилнэ (removedAt-ийг цэвэрлэнэ), snapshot-оос гарсныг
   * removedAt-ээр тэмдэглэнэ.
   */
  private async syncStudents(
    tx: Pick<PrismaService, 'lessonRecordStudent'>,
    recordId: string,
    existing: {
      id: string;
      studentId: string;
      studentName: string;
      attendance: string | null;
      removedAt: Date | null;
    }[],
    next: { studentId: string; studentName: string; attendance: string | null }[],
  ) {
    const old = new Map(existing.map((s) => [s.studentId, s]));
    const fresh = next.filter((s) => !old.has(s.studentId));
    if (fresh.length)
      await tx.lessonRecordStudent.createMany({
        data: fresh.map((s) => ({ ...s, recordId })),
      });
    for (const s of next) {
      const o = old.get(s.studentId);
      if (
        o &&
        (o.removedAt ||
          o.studentName !== s.studentName ||
          o.attendance !== s.attendance)
      )
        await tx.lessonRecordStudent.update({
          where: { id: o.id },
          data: {
            studentName: s.studentName,
            attendance: s.attendance,
            removedAt: null,
          },
        });
    }
    const keep = new Set(next.map((s) => s.studentId));
    const gone = existing.filter((s) => !s.removedAt && !keep.has(s.studentId));
    if (gone.length)
      await tx.lessonRecordStudent.updateMany({
        where: { id: { in: gone.map((s) => s.id) } },
        data: { removedAt: new Date() },
      });
  }

  /**
   * Чөлөөт сэдвүүд: шинэ клиент `customTopics` илгээнэ; хуучин клиент нэгтгэсэн `topic`
   * (тестүүдийн автомат нэртэй ижил бол сэдэв биш); юу ч ирээгүй бол төлөвлөгөөнийх хэвээр.
   */
  private async resolveCustomTopics(
    details: ConfirmDetails,
    plan: { customTopics: string[]; title: string; testIds: string[] } | null,
    shortNames: string[],
  ): Promise<string[]> {
    if (details.customTopics !== undefined) return cleanCustomTopics(details.customTopics);
    if (details.topic !== undefined) {
      const typed = cleanText(details.topic, 200);
      return typed && !isAutoTitle(typed, shortNames) ? cleanCustomTopics([typed]) : [];
    }
    if (!plan) return [];
    const rows = plan.testIds.length
      ? await this.prisma.test.findMany({
          where: { id: { in: plan.testIds } },
          select: { id: true, title: true },
        })
      : [];
    const titleOf = new Map(rows.map((t) => [t.id, shortTestName(t.title)]));
    return storedCustomTopics({
      ...plan,
      testNames: plan.testIds.map((id) => titleOf.get(id) ?? ''),
    });
  }

  /**
   * Батлагдсан хичээлийн ТӨЛӨВЛӨГӨӨГ бодит байдалтай тэнцүүлнэ (эзэн 2026-11-08): тест =
   * батласан тестүүд (номын дарааллаар), сэдэв = батласан сэдвүүд, гарчиг үүнээс; «Одоогийн
   * бүлэг» (chapterId) = хамгийн хол тестийн бүлэг. Тарах/үлдэх, зургийн сурагч хөндөгдөхгүй.
   * Ингэснээр замын зураг, өдрийн мөр, батламж гурав НЭГ зүйлийг хэлнэ — буруу баталсан тестийг
   * хасахад «дараагийн тест» дахин зөв болно. `tests` илгээгээгүй (хуучин) дуудлагад ч тэр
   * өдрийн бүртгэлтэй тестээр тэнцүүлнэ. Хуучин утга AuditLog-д.
   */
  private async syncLessonTopic(
    actor: Actor,
    entry: { scheduleId: string; exception?: { originalDate?: string | null } | null },
    key: string,
    existing: {
      id: string;
      title: string;
      testIds: string[];
      customTopics: string[];
      chapterId: string | null;
    } | null,
    ordered: { id: string; title: string; chapterId: string | null }[] | null,
    customTopics: string[],
  ) {
    const date = parseDateOnly(entry.exception?.originalDate ?? key);
    const testIds = ordered ? ordered.map((t) => t.id) : (existing?.testIds ?? []);
    const furthest = ordered?.filter((t) => t.chapterId).at(-1)?.chapterId ?? null;
    const chapterId = furthest ?? existing?.chapterId ?? null;
    if (!existing) {
      if (!testIds.length && !customTopics.length) return;
      // Устсан (deletedAt) мөр түлхүүрийг эзэлдэг — байвал хоосон төлөвөөс СЭРГЭЭНЭ
      const stored = await this.prisma.lessonTopic.findUnique({
        where: { scheduleId_date: { scheduleId: entry.scheduleId, date } },
        select: { id: true },
      });
      const fresh = {
        title: planTitle([...(ordered ?? []).map((t) => shortTestName(t.title)), ...customTopics]),
        testIds,
        customTopics,
        chapterId,
        createdById: actor.userId,
      };
      const row = stored
        ? await this.prisma.lessonTopic.update({
            where: { id: stored.id },
            data: { ...LESSON_TOPIC_BLANK(), ...fresh },
          })
        : await this.prisma.lessonTopic.create({
            data: { scheduleId: entry.scheduleId, date, ...fresh },
          });
      await this.audit(actor, 'CREATE', 'LessonTopic', row.id, null, row);
      return;
    }
    const data: {
      testIds?: string[];
      customTopics?: string[];
      title?: string;
      chapterId?: string | null;
    } = {};
    if (customTopics.join('\n') !== existing.customTopics.join('\n')) data.customTopics = customTopics;
    if (ordered) {
      const title = planTitle([...ordered.map((t) => shortTestName(t.title)), ...customTopics]);
      if (testIds.join() !== existing.testIds.join()) data.testIds = testIds;
      if (title !== existing.title) data.title = title;
    }
    if (chapterId !== existing.chapterId) data.chapterId = chapterId;
    if (!Object.keys(data).length) return;
    const row = await this.prisma.lessonTopic.update({ where: { id: existing.id }, data });
    await this.audit(actor, 'UPDATE', 'LessonTopic', row.id, existing, row);
  }

  /**
   * «Батламж цуцлах» — ЗӨӨЛӨН (эзэн 2026-10-23): мөр, сурагчид DB-д үлдэнэ,
   * cancelledAt бөглөгдөж бүх уншилтаас хасагдана. Дахин батлахад сэргээнэ.
   */
  async unconfirm(actor: Actor, scheduleId: string, dateStr: string) {
    const { date, key } = this.parseDate(dateStr);
    const row = await this.prisma.lessonRecord.findUnique({
      where: { scheduleId_date: { scheduleId, date } },
      include: { students: true },
    });
    if (!row || row.cancelledAt)
      throw new NotFoundException('Батлагдсан бичлэг олдсонгүй.');
    this.assertCanConfirm(actor);
    const cancelledAt = new Date();
    await this.prisma.lessonRecord.update({
      where: { id: row.id },
      data: { cancelledAt, cancelledById: actor.userId },
    });
    await this.audit(actor, 'REVERSE', 'LessonRecord', row.id, row, {
      cancelledAt,
      cancelledById: actor.userId,
    });
    return { scheduleId, date: key, confirmed: false };
  }

  // ---------- Тайлбар (зөвхөн ажилтан) ----------

  async setNote(
    actor: Actor,
    scheduleId: string,
    dateStr: string,
    body: unknown,
  ) {
    this.assertStaff(actor);
    const { date, key } = this.parseDate(dateStr);
    const text = normalizeNote(body);
    const exists = await this.prisma.classSchedule.count({
      where: { id: scheduleId, deletedAt: null },
    });
    if (!exists) throw new NotFoundException('Хуваарь олдсонгүй');
    const where = { scheduleId_date: { scheduleId, date } };
    const before = await this.prisma.lessonNote.findUnique({ where });
    if (!text) {
      // ЗӨӨЛӨН: мөр, хуучин бичвэр DB-д үлдэнэ; уншилтаас хасагдана (эзэн 2026-10-23)
      if (before && !before.deletedAt) {
        const row = await this.prisma.lessonNote.update({
          where: { id: before.id },
          data: { deletedAt: new Date(), deletedById: actor.userId },
        });
        await this.audit(actor, 'DELETE', 'LessonNote', before.id, before, {
          deletedAt: row.deletedAt,
          deletedById: actor.userId,
        });
      }
      return { scheduleId, date: key, note: null };
    }
    const updatedByName = await this.actorName(actor.userId);
    const row = await this.prisma.lessonNote.upsert({
      where,
      create: { scheduleId, date, body: text, updatedById: actor.userId, updatedByName },
      update: {
        body: text,
        updatedById: actor.userId,
        updatedByName,
        deletedAt: null,
        deletedById: null,
      },
    });
    await this.audit(actor, 'UPDATE', 'LessonNote', row.id, before, row);
    return {
      scheduleId,
      date: key,
      note: {
        body: row.body,
        updatedByName: markPlus(
          row.updatedByName,
          row.updatedById,
          await teacherPlusIds(this.prisma, [row.updatedById]),
        ),
        updatedAt: row.updatedAt,
      },
    };
  }

  // ---------- Унших ----------

  /** Өдрийн харагдацад: тухайн өдрийн батламж, тайлбар, тарсан цаг. Зөвхөн ажилтан. */
  async day(actor: Actor, dateStr: string) {
    this.assertStaff(actor);
    const { date, key } = this.parseDate(dateStr);
    const [records, notes, dismissals] = await Promise.all([
      this.prisma.lessonRecord.findMany({ where: { date, cancelledAt: null } }),
      this.prisma.lessonNote.findMany({ where: { date, deletedAt: null } }),
      this.prisma.classDismissal.findMany({
        where: { date },
        select: { classroomId: true, approximateAt: true },
      }),
    ]);
    const plus = await teacherPlusIds(this.prisma, [
      ...records.flatMap((r) => [r.leadTeacherId, r.assistantTeacherId, r.confirmedById]),
      ...notes.map((n) => n.updatedById),
    ]);
    return {
      date: key,
      records: records.map((r) => this.present(r, plus)),
      notes: notes.map((n) => ({
        scheduleId: n.scheduleId,
        body: n.body,
        updatedByName: markPlus(n.updatedByName, n.updatedById, plus),
        updatedAt: n.updatedAt,
      })),
      dismissals: dismissals.map((d) => ({
        classroomId: d.classroomId,
        approximateAt: d.approximateAt,
      })),
    };
  }

  /** Ангийн батлагдсан хичээлийн түүх — ажилтанд. */
  async classroomHistory(actor: Actor, classroomId: string, limit = 60) {
    this.assertStaff(actor);
    const rows = await this.prisma.lessonRecord.findMany({
      where: { classroomId, cancelledAt: null },
      orderBy: [{ date: 'desc' }, { startMinute: 'asc' }],
      take: Math.min(Math.max(1, Number(limit) || 60), 200),
    });
    const plus = await this.plusOf(rows);
    return rows.map((r) => this.present(r, plus));
  }

  /** Сурагч: ЗӨВХӨН өөрийн оролцсон батлагдсан хичээлүүд. Тайлбар, ангийн тоо БАЙХГҮЙ. */
  async mine(actor: Actor, limit = 60) {
    if (actor.role !== Role.STUDENT)
      throw new ForbiddenException('Зөвхөн сурагчид.');
    const rows = await this.prisma.lessonRecordStudent.findMany({
      where: {
        studentId: actor.userId,
        removedAt: null,
        record: { cancelledAt: null },
      },
      include: { record: true },
      orderBy: { record: { date: 'desc' } },
      take: Math.min(Math.max(1, Number(limit) || 60), 200),
    });
    const plus = await this.plusOf(rows.map((x) => x.record));
    return rows.map(({ record: r, attendance }) => ({
      id: r.id,
      date: dateKey(r.date),
      classroomName: r.classroomName,
      startMinute: r.startMinute,
      endMinute: r.endMinute,
      room: r.room,
      topic: r.topic,
      leadTeacherName: markPlus(r.leadTeacherName, r.leadTeacherId, plus),
      assistantTeacherName: markPlus(r.assistantTeacherName, r.assistantTeacherId, plus),
      attendance,
    }));
  }

  /**
   * Нэг сурагчийн батлагдсан хичээлийн түүх — ажилтанд (сурагчийн хуудас,
   * «Хичээлийн түүх» таб). Багш зөвхөн өөрийн ангийн сурагчийг (getUserDetail-тэй
   * ижил дүрэм). Багшийн тайлбар энд ОРОХГҮЙ.
   */
  async studentHistory(actor: Actor, studentId: string, limit = 60) {
    this.assertStaff(actor);
    if (actor.role === Role.TEACHER) {
      // Сурагчийн АЛЬ Ч идэвхтэй ангид үндсэн/туслах багш бол харна (2026-11-05 аудит): өмнө нь
      // зөвхөн эхний элсэлтийн үндсэн багшийг шалгадаг байсан тул хоёр ангид суудаг сурагчийн
      // хоёр дахь ангийн багш, туслах багш нар буруу хориглогддог байв.
      const mine = await this.prisma.enrollment.findFirst({
        where: { studentId, leftAt: null, classroom: classTeacherWhere(actor.userId) },
        select: { id: true },
      });
      if (!mine)
        throw new ForbiddenException(
          'Зөвхөн өөрийн ангийн сурагчийг харах эрхтэй',
        );
    }
    const rows = await this.prisma.lessonRecordStudent.findMany({
      where: { studentId, removedAt: null, record: { cancelledAt: null } },
      include: { record: true },
      orderBy: { record: { date: 'desc' } },
      take: Math.min(Math.max(1, Number(limit) || 60), 200),
    });
    const plus = await this.plusOf(rows.map((x) => x.record));
    return rows.map(({ record: r, attendance }) => ({
      id: r.id,
      date: dateKey(r.date),
      classroomName: r.classroomName,
      startMinute: r.startMinute,
      endMinute: r.endMinute,
      room: r.room,
      topic: r.topic,
      leadTeacherName: markPlus(r.leadTeacherName, r.leadTeacherId, plus),
      assistantTeacherName: markPlus(r.assistantTeacherName, r.assistantTeacherId, plus),
      testCount: r.testCount,
      presentCount: r.presentCount,
      enrolledCount: r.enrolledCount,
      attendance,
    }));
  }

  /** Snapshot нэрсийн Багш+ тэмдэг (ахлах, туслах, баталсан) */
  private plusOf(
    rows: { leadTeacherId: string | null; assistantTeacherId: string | null; confirmedById: string }[],
  ) {
    return teacherPlusIds(
      this.prisma,
      rows.flatMap((r) => [r.leadTeacherId, r.assistantTeacherId, r.confirmedById]),
    );
  }

  private present(r: {
    id: string;
    scheduleId: string;
    classroomId: string;
    date: Date;
    classroomName: string;
    startMinute: number;
    endMinute: number;
    room: string | null;
    topic: string | null;
    leadTeacherId: string | null;
    leadTeacherName: string | null;
    assistantTeacherId: string | null;
    assistantTeacherName: string | null;
    tests: Prisma.JsonValue;
    testCount: number;
    enrolledCount: number;
    presentCount: number;
    absentCount: number;
    attendanceMarked: number;
    confirmedById: string;
    confirmedByName: string;
    confirmedAt: Date;
    description?: string | null;
    problemNumbersText?: string | null;
    problemNumbers?: number[];
  }, plus: Set<string> = new Set()) {
    return {
      id: r.id,
      scheduleId: r.scheduleId,
      classroomId: r.classroomId,
      date: dateKey(r.date),
      classroomName: r.classroomName,
      startMinute: r.startMinute,
      endMinute: r.endMinute,
      room: r.room,
      topic: r.topic,
      leadTeacherName: markPlus(r.leadTeacherName, r.leadTeacherId, plus),
      assistantTeacherName: markPlus(r.assistantTeacherName, r.assistantTeacherId, plus),
      tests: Array.isArray(r.tests) ? r.tests : [],
      testCount: r.testCount,
      enrolledCount: r.enrolledCount,
      presentCount: r.presentCount,
      absentCount: r.absentCount,
      attendanceMarked: r.attendanceMarked,
      confirmedByName: markPlus(r.confirmedByName, r.confirmedById, plus),
      confirmedAt: r.confirmedAt,
      description: r.description ?? null,
      problemNumbersText: r.problemNumbersText ?? null,
      problemNumbers: r.problemNumbers ?? [],
    };
  }
}

/** Номын дарааллаар (100V3 → 200V3, бүлэг, хувилбар) эрэмбэлнэ. */
function sortByBook<
  T extends {
    variantLabel: string | null;
    chapter: { order: number; book: { code: string } | null } | null;
  },
>(rows: T[]): T[] {
  return [...rows].sort((a, b) =>
    compareBookOrder(
      { bookCode: a.chapter?.book?.code ?? null, chapterOrder: a.chapter?.order ?? null, variantLabel: a.variantLabel },
      { bookCode: b.chapter?.book?.code ?? null, chapterOrder: b.chapter?.order ?? null, variantLabel: b.variantLabel },
    ),
  );
}
