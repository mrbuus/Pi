import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { addDaysKey, normalizeVariant } from '../attendance/board-logic';
import { isActivatedClassroomStudent } from '../common/access';
import { dateKey, parseDateOnly, todayUB } from '../common/date';
import { markPlus } from '../common/teacher-plus';
import { Role } from '../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import { shortName } from '../revisions/revision-snapshot';
import type {
  ResolvedEntry,
  ResolverException,
  ResolverSchedule,
} from '../schedule/week-resolver';
import { resolveWeek } from '../schedule/week-resolver';
import { uniqueClasses, type StudentClass } from './lesson-days';
import {
  MARK_LOOKAHEAD_DAYS,
  MIN_MONTH,
  THEORY_DEFAULT_DAYS,
  THEORY_MAX_RANGE_DAYS,
  attendanceSummary,
  dayKey,
  exceptionIndex,
  homeworkFor,
  homeworkSummary,
  hubProblem,
  inUploadWindow,
  lessonDateOf,
  lessonDaysByClass,
  matchesWords,
  monthWindow,
  pickToday,
  queryWords,
  resolveRange,
  testOpen,
  testState,
  topicOf,
  ubMinuteOfDay,
  visibleDay,
  type AttendanceStatus,
  type HubProblemRow,
  type LessonDayEvidence,
  type MarkRow,
  type TestClosedReason,
} from './student-hub.logic';
import type {
  HubDay,
  HubDays,
  HubOverview,
  HubTestDetail,
  HubTestRow,
  HubTheoryRow,
  LateRangeValue,
} from './student-hub.types';

const DAY_MS = 86_400_000;
const MIN_DATE = `${MIN_MONTH}-01`;

type Range = { gte: Date; lte: Date };

/** Хичээлийн өдрийн бүх эх сурвалж (сар/онолын жагсаалтад) — 3 давалгаа, N+1 үгүй */
interface DayBundle {
  classes: StudentClass[];
  byClass: Map<string, string[]>;
  attendance: Map<
    string,
    { status: AttendanceStatus; lateRange: LateRangeValue | null }
  >;
  marks: Map<string, MarkRow>;
  topics: Map<
    string,
    { title: string; chapterId: string | null; photoStudentId: string | null }[]
  >;
  staffing: Map<
    string,
    { leadTeacherId: string | null; assistantTeacherId: string | null }[]
  >;
  slots: Map<string, ResolvedEntry[]>;
  sessions: Map<
    string,
    {
      testId: string | null;
      manualTitle: string | null;
      manualProblemCount: number | null;
    }[]
  >;
  records: Map<string, RecordRow[]>;
  photos: Map<string, { studentId: string; imageKeys: string[] }[]>;
}

interface RecordRow {
  scheduleId: string;
  topic: string | null;
  startMinute: number;
  endMinute: number;
  room: string | null;
  leadTeacherId: string | null;
  leadTeacherName: string | null;
  assistantTeacherId: string | null;
  assistantTeacherName: string | null;
  problemNumbersText: string | null;
}

interface TestRow {
  id: string;
  title: string;
  variantLabel: string | null;
  type: string;
  deletedAt: Date | null;
  _count: { problems: number };
}

/** 403 + шалтгааны код (вэб: NOT_OPEN_YET → «маргааш нээгдэнэ», NOT_CLASS_TEST) */
export type TestForbiddenCode = 'NOT_OPEN_YET' | 'NOT_CLASS_TEST';

function testForbidden(code: TestForbiddenCode, message: string) {
  return new ForbiddenException({
    statusCode: 403,
    error: 'Forbidden',
    code,
    message,
  });
}

const notClassTest = () =>
  testForbidden('NOT_CLASS_TEST', 'Энэ тестийг танай анги хийгээгүй байна.');

function push<V>(map: Map<string, V[]>, key: string, value: V) {
  const list = map.get(key);
  if (list) list.push(value);
  else map.set(key, [value]);
}

/**
 * Танхимын сурагчийн V2 самбар (гэрээ docs/v2/SURAGCH-V2-GEREE.md): хичээлийн өдөр бүрийн
 * сэдэв, тест, ирц, даалгаврын тэмдэглэгээ, онолын ба даалгаврын зураг НЭГ дор.
 * Сурагчид Attendance.note, LessonNote, LessonRecord.description, dismissMode ХЭЗЭЭ Ч очихгүй
 * (сонгохгүй). Зөвхөн өөрийн одоогийн (leftAt null, архивлаагүй) ангиуд.
 */
@Injectable()
export class StudentHubService {
  constructor(private readonly prisma: PrismaService) {}

  private parseDay(text: string, field: string): string {
    try {
      return dateKey(parseDateOnly(text));
    } catch {
      throw new BadRequestException(
        `${field} огноог ЖЖЖЖ-СС-ӨӨ хэлбэрээр өгнө үү.`,
      );
    }
  }

  private currentWhere(studentId: string) {
    return { studentId, leftAt: null, classroom: { archived: false } };
  }

  /** testId → тест (нэг асуулга) */
  private async testsById(ids: string[]): Promise<Map<string, TestRow>> {
    if (!ids.length) return new Map();
    const rows = await this.prisma.test.findMany({
      where: { id: { in: ids } },
      select: {
        id: true,
        title: true,
        variantLabel: true,
        type: true,
        deletedAt: true,
        _count: { select: { problems: true } },
      },
    });
    return new Map(rows.map((t) => [t.id, t]));
  }

  /** id → «Б. Нэр» (Багш+ бол «+») ба Багш+ id-ууд (нэг асуулга) */
  private async people(ids: (string | null | undefined)[]) {
    const unique = [...new Set(ids.filter((v): v is string => !!v))];
    if (!unique.length)
      return { names: new Map<string, string>(), plus: new Set<string>() };
    const users = await this.prisma.user.findMany({
      where: { id: { in: unique } },
      select: { id: true, firstName: true, lastName: true, role: true },
    });
    return {
      names: new Map(users.map((u) => [u.id, shortName(u)])),
      plus: new Set(
        users.filter((u) => u.role === Role.TEACHER_PLUS).map((u) => u.id),
      ),
    };
  }

  private async chapterTitles(
    ids: (string | null)[],
  ): Promise<Map<string, string>> {
    const unique = [...new Set(ids.filter((v): v is string => !!v))];
    if (!unique.length) return new Map();
    const rows = await this.prisma.chapter.findMany({
      where: { id: { in: unique } },
      select: { id: true, title: true },
    });
    return new Map(rows.map((c) => [c.id, c.title]));
  }

  /** Одоогийн (leftAt null, архивлаагүй) элсэлтүүд — relation-гүй, нэг асуулга */
  private enrollmentRows(studentId: string) {
    return this.prisma.enrollment.findMany({
      where: this.currentWhere(studentId),
      orderBy: { joinedAt: 'asc' },
      select: { classroomId: true, joinedAt: true },
    });
  }

  /** id → ангийн нэр (нэг асуулга) */
  private async classNames(ids: string[]): Promise<Map<string, string>> {
    if (!ids.length) return new Map();
    const rows = await this.prisma.classroom.findMany({
      where: { id: { in: ids } },
      select: { id: true, name: true },
    });
    return new Map(rows.map((c) => [c.id, c.name]));
  }

  private classesOf(
    rows: { classroomId: string; joinedAt: Date }[],
    names: Map<string, string>,
  ): StudentClass[] {
    return uniqueClasses(
      rows.map((r) => ({
        classroomId: r.classroomId,
        joinedAt: r.joinedAt,
        classroom: { name: names.get(r.classroomId) ?? '' },
      })),
    );
  }

  /**
   * [fromKey, toKey] хичээлийн өдрүүдийн эх сурвалж — relation-гүй хавтгай findMany-ууд:
   * 1-р давалгаа: элсэлт, өөрийн ирц, тэмдэглэгээ (studentId-аар); 2-р: classroomId IN (…) +
   * огноогоор ангийн нэр, хуваарь, сэдэв, оноолт, exception, тест, бүртгэл, онолын зураг.
   * LessonTopic/LessonStaffing анхны огноогоороо байдаг тул цуцалсныг хасаж, зөөснийг
   * newDate руу шилжүүлнэ (хуурамч хичээлийн өдөр үүсгэхгүй).
   */
  private async loadBundle(
    studentId: string,
    fromKey: string,
    toKey: string,
    /** true: /days (тэмдэглэгээ, оноолт, хуваарийн цаг); false: /theory */
    opts: { days: boolean },
  ): Promise<DayBundle> {
    const range: Range = {
      gte: parseDateOnly(fromKey),
      lte: parseDateOnly(toKey),
    };
    const [enrollments, attendance, marks] = await Promise.all([
      this.enrollmentRows(studentId),
      // note-ийг ХЭЗЭЭ Ч сонгохгүй
      this.prisma.attendance.findMany({
        where: { studentId, date: range, classroom: { archived: false } },
        select: {
          classroomId: true,
          date: true,
          status: true,
          lateRange: true,
        },
      }),
      opts.days
        ? this.prisma.dailyHomeworkMark.findMany({
            where: { studentId, date: range },
            select: {
              classroomId: true,
              date: true,
              status: true,
              comment: true,
            },
          })
        : Promise.resolve([]),
    ]);
    const bundle: DayBundle = {
      classes: [],
      byClass: new Map(),
      attendance: new Map(),
      marks: new Map(),
      topics: new Map(),
      staffing: new Map(),
      slots: new Map(),
      sessions: new Map(),
      records: new Map(),
      photos: new Map(),
    };
    const ids = [...new Set(enrollments.map((e) => e.classroomId))];
    if (!ids.length) return bundle;
    const inIds = { in: ids };
    const ofClasses = { schedule: { classroomId: inIds } };
    const [
      names,
      scheduleRows,
      topics,
      staffing,
      exRows,
      sessions,
      records,
      photos,
    ] = await Promise.all([
      this.classNames(ids),
      // dismissMode-ийг ХЭЗЭЭ Ч сонгохгүй
      this.prisma.classSchedule.findMany({
        where: { classroomId: inIds },
        select: {
          id: true,
          classroomId: true,
          weekday: true,
          startMinute: true,
          endMinute: true,
          room: true,
          teacherId: true,
          effectiveFrom: true,
          effectiveTo: true,
        },
      }),
      this.prisma.lessonTopic.findMany({
        where: { date: range, ...ofClasses },
        select: {
          scheduleId: true,
          date: true,
          title: true,
          chapterId: true,
          photoStudentId: true,
        },
      }),
      opts.days
        ? this.prisma.lessonStaffing.findMany({
            where: { date: range, ...ofClasses },
            select: {
              scheduleId: true,
              date: true,
              leadTeacherId: true,
              assistantTeacherId: true,
            },
          })
        : Promise.resolve([]),
      this.prisma.scheduleException.findMany({
        where: { ...ofClasses, OR: [{ date: range }, { newDate: range }] },
        select: {
          scheduleId: true,
          date: true,
          kind: true,
          newDate: true,
          newStartMinute: true,
          newEndMinute: true,
          newRoom: true,
        },
      }),
      this.prisma.classTestSession.findMany({
        where: { classroomId: inIds, date: range },
        select: {
          classroomId: true,
          date: true,
          testId: true,
          manualTitle: true,
          manualProblemCount: true,
        },
        orderBy: { createdAt: 'asc' },
      }),
      // description-ийг ХЭЗЭЭ Ч сонгохгүй
      this.prisma.lessonRecord.findMany({
        where: { classroomId: inIds, date: range, cancelledAt: null },
        select: {
          classroomId: true,
          date: true,
          scheduleId: true,
          topic: true,
          startMinute: true,
          endMinute: true,
          room: true,
          leadTeacherId: true,
          leadTeacherName: true,
          assistantTeacherId: true,
          assistantTeacherName: true,
          problemNumbersText: true,
        },
        orderBy: { startMinute: 'asc' },
      }),
      this.prisma.lessonPhoto.findMany({
        where: { classroomId: inIds, date: range },
        select: {
          classroomId: true,
          date: true,
          studentId: true,
          imageKeys: true,
        },
        orderBy: { createdAt: 'asc' },
      }),
    ]);
    bundle.classes = this.classesOf(enrollments, names);
    const current = new Set(ids);
    const classOf = new Map(scheduleRows.map((r) => [r.id, r.classroomId]));
    const schedules: ResolverSchedule[] = scheduleRows.map((r) => ({
      id: r.id,
      classroomId: r.classroomId,
      classroomName: names.get(r.classroomId) ?? '',
      weekday: r.weekday,
      startMinute: r.startMinute,
      endMinute: r.endMinute,
      teacherId: r.teacherId,
      teacherName: null,
      room: r.room,
      subject: null,
      effectiveFrom: dateKey(r.effectiveFrom),
      effectiveTo: r.effectiveTo ? dateKey(r.effectiveTo) : null,
    }));
    const exceptions: ResolverException[] = exRows.map((x) => ({
      scheduleId: x.scheduleId,
      date: dateKey(x.date),
      kind: x.kind,
      newDate: x.newDate ? dateKey(x.newDate) : null,
      newStartMinute: x.newStartMinute,
      newEndMinute: x.newEndMinute,
      newRoom: x.newRoom,
      note: null,
    }));
    const exIndex = exceptionIndex(exceptions);
    /** Анхны огноотой мөр → «анги|бодит огноо» (цуцалсан бол null) */
    const lessonKey = (scheduleId: string, date: Date) => {
      const cid = classOf.get(scheduleId);
      const real = cid
        ? lessonDateOf(scheduleId, dateKey(date), exIndex)
        : null;
      return cid && real ? { cid, date: real } : null;
    };

    const evidence: LessonDayEvidence[] = [];
    for (const a of attendance) {
      if (!current.has(a.classroomId)) continue;
      const date = dateKey(a.date);
      evidence.push({ classroomId: a.classroomId, date });
      bundle.attendance.set(dayKey(a.classroomId, date), {
        status: a.status,
        lateRange: a.lateRange,
      });
    }
    for (const m of marks)
      if (current.has(m.classroomId))
        bundle.marks.set(dayKey(m.classroomId, dateKey(m.date)), {
          status: m.status,
          comment: m.comment,
        });
    for (const t of topics) {
      const at = lessonKey(t.scheduleId, t.date);
      if (!at) continue;
      evidence.push({ classroomId: at.cid, date: at.date });
      push(bundle.topics, dayKey(at.cid, at.date), {
        title: t.title,
        chapterId: t.chapterId,
        photoStudentId: t.photoStudentId,
      });
    }
    for (const st of staffing) {
      const at = lessonKey(st.scheduleId, st.date);
      if (!at) continue;
      push(bundle.staffing, dayKey(at.cid, at.date), {
        leadTeacherId: st.leadTeacherId,
        assistantTeacherId: st.assistantTeacherId,
      });
    }
    for (const s of sessions) {
      const date = dateKey(s.date);
      evidence.push({ classroomId: s.classroomId, date });
      push(bundle.sessions, dayKey(s.classroomId, date), {
        testId: s.testId,
        manualTitle: s.manualTitle,
        manualProblemCount: s.manualProblemCount,
      });
    }
    for (const r of records) {
      const date = dateKey(r.date);
      evidence.push({ classroomId: r.classroomId, date });
      push(bundle.records, dayKey(r.classroomId, date), r);
    }
    for (const p of photos)
      if (p.imageKeys.length)
        push(bundle.photos, dayKey(p.classroomId, dateKey(p.date)), {
          studentId: p.studentId,
          imageKeys: p.imageKeys,
        });
    bundle.byClass = lessonDaysByClass(evidence, toKey);
    if (opts.days)
      bundle.slots = resolveRange(fromKey, toKey, schedules, exceptions);
    return bundle;
  }

  /** [fromKey, toKey] доторх, сурагчид харагдах (анги, өдөр) — огноогоор буурах */
  private visibleDays(b: DayBundle, fromKey: string, toKey: string) {
    const out: { cls: StudentClass; date: string; key: string }[] = [];
    for (const cls of b.classes)
      for (const date of b.byClass.get(cls.classroomId) ?? []) {
        if (date < fromKey || date > toKey) continue;
        const key = dayKey(cls.classroomId, date);
        if (!visibleDay(date, cls.joinedKey, b.attendance.has(key))) continue;
        out.push({ cls, date, key });
      }
    return out.sort(
      (x, y) =>
        y.date.localeCompare(x.date) ||
        x.cls.classroomName.localeCompare(y.cls.classroomName),
    );
  }

  /** Өдрийн тестүүд ангид хийсэн дарааллаар, давхардалгүй; устгасан тест харагдахгүй */
  private dayTests(
    b: DayBundle,
    key: string,
    date: string,
    today: string,
    tests: Map<string, TestRow>,
    active: boolean,
  ) {
    const out: {
      testId: string | null;
      title: string;
      variant: string | null;
      open: boolean;
      closedReason: TestClosedReason | null;
      problemCount: number;
    }[] = [];
    const seen = new Set<string>();
    for (const s of b.sessions.get(key) ?? []) {
      if (!s.testId) {
        const title = s.manualTitle?.trim();
        if (title)
          out.push({
            testId: null,
            title,
            variant: null,
            ...testState(date, today, null, active),
            problemCount: s.manualProblemCount ?? 0,
          });
        continue;
      }
      if (seen.has(s.testId)) continue;
      seen.add(s.testId);
      const t = tests.get(s.testId);
      if (!t || t.deletedAt) continue;
      out.push({
        testId: t.id,
        title: t.title,
        variant: normalizeVariant(t.variantLabel),
        ...testState(date, today, t, active),
        problemCount: t._count.problems,
      });
    }
    return out;
  }

  private sessionTestIds(b: DayBundle): string[] {
    const ids = new Set<string>();
    for (const list of b.sessions.values())
      for (const s of list) if (s.testId) ids.add(s.testId);
    return [...ids];
  }

  /* ───────── GET /student-hub/overview ───────── */

  async overview(studentId: string): Promise<HubOverview> {
    const todayDate = todayUB();
    const today = dateKey(todayDate);
    const topicFrom = parseDateOnly(addDaysKey(today, -MARK_LOOKAHEAD_DAYS));
    // 1-р давалгаа: studentId / өнөөдрөөр (relation-гүй)
    const [
      enrollments,
      attendance,
      homework,
      latest,
      calendar,
      calendarClasses,
    ] = await Promise.all([
      this.enrollmentRows(studentId),
      this.prisma.attendance.groupBy({
        by: ['status'],
        where: { studentId },
        _count: { _all: true },
      }),
      this.prisma.dailyHomeworkMark.groupBy({
        by: ['status'],
        where: { studentId, status: { not: null } },
        _count: { _all: true },
      }),
      this.prisma.dailyHomeworkMark.findFirst({
        where: { studentId, status: { not: null } },
        orderBy: [{ date: 'desc' }, { updatedAt: 'desc' }],
        select: {
          classroomId: true,
          date: true,
          status: true,
          comment: true,
        },
      }),
      this.prisma.academicCalendarDay.findMany({
        where: { date: todayDate },
        select: { id: true, type: true, title: true },
      }),
      this.prisma.academicCalendarDayClassroom.findMany({
        where: { calendarDay: { date: todayDate } },
        select: { calendarDayId: true, classroomId: true },
      }),
    ]);
    const ids = [...new Set(enrollments.map((e) => e.classroomId))];
    const inIds = { in: ids };
    const ofClasses = { schedule: { classroomId: inIds } };
    const markKey = latest?.status ? dateKey(latest.date) : null;
    // 2-р давалгаа: classroomId IN (…) — хуваарь, exception, сэдэв, өнөөдрийн бүртгэл,
    // сүүлийн тэмдэглэгээний D (нэг жижиг асуулга)
    const [names, scheduleRows, exRows, topicRows, records, lessonDate] =
      ids.length
        ? await Promise.all([
            this.classNames(ids),
            this.prisma.classSchedule.findMany({
              where: {
                classroomId: inIds,
                effectiveFrom: { lte: todayDate },
                OR: [
                  { effectiveTo: null },
                  { effectiveTo: { gte: topicFrom } },
                ],
              },
              select: {
                id: true,
                classroomId: true,
                weekday: true,
                startMinute: true,
                endMinute: true,
                room: true,
                teacherId: true,
                effectiveFrom: true,
                effectiveTo: true,
              },
            }),
            this.prisma.scheduleException.findMany({
              where: {
                ...ofClasses,
                OR: [{ date: todayDate }, { newDate: todayDate }],
              },
              select: {
                scheduleId: true,
                date: true,
                kind: true,
                newDate: true,
                newStartMinute: true,
                newEndMinute: true,
                newRoom: true,
              },
            }),
            // Зөөгдөж ирсэн хичээлийн сэдэв анхны огноогоороо байдаг тул ойрын хугацааг уншина
            this.prisma.lessonTopic.findMany({
              where: { ...ofClasses, date: { gte: topicFrom, lte: todayDate } },
              select: { scheduleId: true, date: true, title: true },
            }),
            // Багш баталсан бүртгэл байвал түүний сэдэв/цаг давамгайлна (description-гүй)
            this.prisma.lessonRecord.findMany({
              where: { classroomId: inIds, date: todayDate, cancelledAt: null },
              select: {
                classroomId: true,
                scheduleId: true,
                topic: true,
                startMinute: true,
                endMinute: true,
                room: true,
              },
            }),
            latest && markKey && ids.includes(latest.classroomId)
              ? this.lastLessonDayBefore(studentId, latest.classroomId, markKey)
              : Promise.resolve(null),
          ])
        : [new Map<string, string>(), [], [], [], [], null];
    const classes = this.classesOf(enrollments, names);
    const schedules: ResolverSchedule[] = scheduleRows.map((r) => ({
      id: r.id,
      classroomId: r.classroomId,
      classroomName: names.get(r.classroomId) ?? '',
      weekday: r.weekday,
      startMinute: r.startMinute,
      endMinute: r.endMinute,
      teacherId: r.teacherId,
      teacherName: null,
      room: r.room,
      subject: null,
      effectiveFrom: dateKey(r.effectiveFrom),
      effectiveTo: r.effectiveTo ? dateKey(r.effectiveTo) : null,
    }));
    const exceptions: ResolverException[] = exRows.map((x) => ({
      scheduleId: x.scheduleId,
      date: dateKey(x.date),
      kind: x.kind,
      newDate: x.newDate ? dateKey(x.newDate) : null,
      newStartMinute: x.newStartMinute,
      newEndMinute: x.newEndMinute,
      newRoom: x.newRoom,
      note: null,
    }));
    const [day] = resolveWeek({
      weekStart: today,
      schedules,
      exceptions,
      topics: topicRows.map((t) => ({
        scheduleId: t.scheduleId,
        date: dateKey(t.date),
        title: t.title,
      })),
      holidays: calendar.map((h) => ({
        date: today,
        type: h.type,
        title: h.title,
        classroomIds: calendarClasses
          .filter((c) => c.calendarDayId === h.id)
          .map((c) => c.classroomId),
      })),
    });
    const entry =
      day && !day.isHoliday ? pickToday(day.entries, ubMinuteOfDay()) : null;
    const record = entry
      ? records.find(
          (r) =>
            r.classroomId === entry.classroomId &&
            r.scheduleId === entry.scheduleId,
        )
      : undefined;
    const todayView: HubOverview['today'] = entry
      ? {
          classroomId: entry.classroomId,
          classroomName: entry.classroomName,
          date: today,
          startMinute: record?.startMinute ?? entry.startMinute,
          endMinute: record?.endMinute ?? entry.endMinute,
          room: record?.room ?? entry.room,
          topic: topicOf(record?.topic, entry.topic),
        }
      : null;
    return {
      classrooms: classes.map((c) => ({
        id: c.classroomId,
        name: c.classroomName,
      })),
      attendance: attendanceSummary(
        attendance.map((a) => ({ status: a.status, count: a._count._all })),
      ),
      homework: homeworkSummary(
        homework.map((h) => ({ status: h.status, count: h._count._all })),
      ),
      today: todayView,
      latestMark:
        latest && latest.status
          ? {
              date: dateKey(latest.date),
              status: latest.status,
              comment: latest.comment,
              classroomId: latest.classroomId,
              lessonDate,
            }
          : null,
    };
  }

  /**
   * Сүүлийн тэмдэглэгээний D = D'-ээс өмнөх ангийн сүүлийн хичээлийн өдөр (MARK_LOOKAHEAD_DAYS
   * дотор) — хичээлийн өдрийн нэгдлийг (өөрийн ирц ∪ тест ∪ бүртгэл (цуцлаагүй) ∪ сэдэв,
   * цуцалсан сэдвийг хасаж, зөөснийг newDate-ээр) НЭГ асуулгаар (loadLessonDays-ийн оронд).
   */
  private async lastLessonDayBefore(
    studentId: string,
    classroomId: string,
    markKey: string,
  ): Promise<string | null> {
    const from = addDaysKey(markKey, -MARK_LOOKAHEAD_DAYS);
    const to = addDaysKey(markKey, -1);
    const rows = await this.prisma.$queryRaw<{ d: string | null }[]>`
      SELECT to_char(max(u.d), 'YYYY-MM-DD') AS d FROM (
        SELECT a."date" AS d FROM "Attendance" a
          WHERE a."studentId" = ${studentId} AND a."classroomId" = ${classroomId}
            AND a."date" BETWEEN ${from}::date AND ${to}::date
        UNION ALL
        SELECT s."date" FROM "ClassTestSession" s
          WHERE s."classroomId" = ${classroomId}
            AND s."date" BETWEEN ${from}::date AND ${to}::date
        UNION ALL
        SELECT r."date" FROM "LessonRecord" r
          WHERE r."classroomId" = ${classroomId} AND r."cancelledAt" IS NULL
            AND r."date" BETWEEN ${from}::date AND ${to}::date
        UNION ALL
        SELECT COALESCE(x."newDate", t."date") FROM "LessonTopic" t
          JOIN "ClassSchedule" cs ON cs."id" = t."scheduleId"
          LEFT JOIN "ScheduleException" x
            ON x."scheduleId" = t."scheduleId" AND x."date" = t."date"
          WHERE cs."classroomId" = ${classroomId}
            AND t."date" BETWEEN ${from}::date AND ${to}::date
            AND (x."kind" IS NULL OR x."kind" <> 'CANCELLED')
      ) u WHERE u.d BETWEEN ${from}::date AND ${to}::date`;
    return rows[0]?.d ?? null;
  }

  /* ───────── GET /student-hub/days?month=YYYY-MM ───────── */

  async days(studentId: string, monthRaw?: string): Promise<HubDays> {
    const today = dateKey(todayUB());
    const win = monthWindow(monthRaw, today);
    if (!win)
      throw new BadRequestException(
        `Сарыг ЖЖЖЖ-СС хэлбэрээр, ${MIN_MONTH}-өөс одоогийн сар хүртэл өгнө үү.`,
      );
    // D' (дараагийн хичээл) сарын гадна байж болох тул цааш уншина (өнөөдрөөс хэтрэхгүй)
    const ext = addDaysKey(win.to, MARK_LOOKAHEAD_DAYS);
    const extTo = ext < today ? ext : today;
    const [b, hwPhotos, activated] = await Promise.all([
      this.loadBundle(studentId, win.from, extTo, { days: true }),
      this.prisma.homeworkPhoto.findMany({
        where: {
          studentId,
          deletedAt: null,
          lessonDate: {
            gte: parseDateOnly(win.from),
            lte: parseDateOnly(win.to),
          },
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
      isActivatedClassroomStudent(this.prisma, studentId),
    ]);
    // hasActiveClassroomEnrollment: идэвхжсэн профайл + одоогийн анги (b.classes)
    const active = activated && b.classes.length > 0;
    const list = this.visibleDays(b, win.from, win.to);
    const base = {
      month: win.month,
      prevMonth: win.prevMonth,
      nextMonth: win.nextMonth,
    };
    if (!list.length) return { ...base, days: [] };

    const keys = new Set(list.map((d) => d.key));
    const personIds: (string | null)[] = [];
    const chapterIds: (string | null)[] = [];
    for (const k of keys) {
      const recs = b.records.get(k) ?? [];
      for (const r of recs)
        personIds.push(r.leadTeacherId, r.assistantTeacherId);
      if (!recs.length) {
        const staff = b.staffing.get(k) ?? [];
        for (const s of staff)
          personIds.push(s.leadTeacherId, s.assistantTeacherId);
        if (!staff.some((s) => s.leadTeacherId || s.assistantTeacherId))
          for (const e of b.slots.get(k) ?? []) personIds.push(e.teacherId);
      }
      for (const t of b.topics.get(k) ?? [])
        if (!t.title.trim()) chapterIds.push(t.chapterId);
    }
    const [tests, people, chapters] = await Promise.all([
      this.testsById(this.sessionTestIds(b)),
      this.people(personIds),
      this.chapterTitles(chapterIds),
    ]);
    const photoBy = new Map<string, (typeof hwPhotos)[number]>();
    for (const p of hwPhotos) {
      const k = dayKey(p.classroomId, dateKey(p.lessonDate));
      if (!photoBy.has(k)) photoBy.set(k, p); // хамгийн сүүлийнх (createdAt desc)
    }

    const days: HubDay[] = list.map(({ cls, date, key }) => {
      const recs = b.records.get(key) ?? [];
      const rec = recs[0];
      const slot = (b.slots.get(key) ?? [])[0];
      const topicRows = b.topics.get(key) ?? [];
      const att = b.attendance.get(key);
      const photos = b.photos.get(key) ?? [];
      const hw = photoBy.get(key);
      return {
        date,
        classroomId: cls.classroomId,
        classroomName: cls.classroomName,
        startMinute: rec?.startMinute ?? slot?.startMinute ?? null,
        endMinute: rec?.endMinute ?? slot?.endMinute ?? null,
        room: rec?.room ?? slot?.room ?? null,
        topic: topicOf(
          ...recs.map((r) => r.topic),
          ...topicRows.map((t) => t.title),
          ...topicRows.map((t) =>
            t.chapterId ? chapters.get(t.chapterId) : null,
          ),
        ),
        teachers: this.teachersOf(key, b, people),
        problemNumbers:
          recs
            .map((r) => r.problemNumbersText?.trim())
            .filter((v): v is string => !!v)
            .join('; ') || null,
        tests: this.dayTests(b, key, date, today, tests, active).map((t) => ({
          testId: t.testId,
          title: t.title,
          variant: t.variant,
          open: t.open,
          closedReason: t.closedReason,
        })),
        attendance: att
          ? { status: att.status, lateRange: att.lateRange }
          : null,
        homework: homeworkFor(
          cls.classroomId,
          date,
          b.byClass.get(cls.classroomId) ?? [],
          b.marks,
        ),
        theory: {
          count: photos.reduce((n, p) => n + p.imageKeys.length, 0),
          mine: photos.some((p) => p.studentId === studentId),
          canUpload: inUploadWindow(date, today),
          assignedToMe: topicRows.some((t) => t.photoStudentId === studentId),
        },
        homeworkPhoto: hw
          ? {
              id: hw.id,
              fileKey: hw.fileKey,
              pages: hw.pages,
              uploadedAt: hw.createdAt.toISOString(),
            }
          : null,
        canSendHomework: inUploadWindow(date, today),
      };
    });
    return { ...base, days };
  }

  /** Бүртгэлийн нэр (Багш+ «+») → өдрийн оноолт → хуваарийн багш */
  private teachersOf(
    key: string,
    b: DayBundle,
    people: { names: Map<string, string>; plus: Set<string> },
  ): string[] {
    const out: string[] = [];
    const add = (name: string | null | undefined) => {
      if (name && !out.includes(name)) out.push(name);
    };
    const recs = b.records.get(key) ?? [];
    if (recs.length) {
      for (const r of recs) {
        add(markPlus(r.leadTeacherName, r.leadTeacherId, people.plus));
        add(
          markPlus(r.assistantTeacherName, r.assistantTeacherId, people.plus),
        );
      }
      return out;
    }
    for (const s of b.staffing.get(key) ?? []) {
      if (s.leadTeacherId) add(people.names.get(s.leadTeacherId));
      if (s.assistantTeacherId) add(people.names.get(s.assistantTeacherId));
    }
    if (out.length) return out;
    for (const e of b.slots.get(key) ?? [])
      if (e.teacherId) add(people.names.get(e.teacherId));
    return out;
  }

  /* ───────── GET /student-hub/tests?q= ───────── */

  async tests(studentId: string, q?: string): Promise<HubTestRow[]> {
    const today = dateKey(todayUB());
    const range: Range = {
      gte: parseDateOnly(MIN_DATE),
      lte: parseDateOnly(today),
    };
    const { classes, own, active } = await this.classAccess(studentId, range);
    // homework-practice loadSlots-той ижил: идэвхжээгүй сурагчид ангийн тест ХООСОН
    if (!active) return [];
    const sessions = await this.prisma.classTestSession.findMany({
      where: {
        classroomId: { in: classes.map((c) => c.classroomId) },
        date: range,
      },
      select: {
        classroomId: true,
        date: true,
        testId: true,
        manualTitle: true,
        manualProblemCount: true,
      },
      orderBy: { createdAt: 'asc' },
    });
    const byId = new Map(classes.map((c) => [c.classroomId, c]));
    const visible = sessions.filter((s) => {
      const cls = byId.get(s.classroomId);
      const date = dateKey(s.date);
      return (
        !!cls &&
        visibleDay(date, cls.joinedKey, own.has(dayKey(s.classroomId, date)))
      );
    });
    const tests = await this.testsById([
      ...new Set(visible.flatMap((s) => (s.testId ? [s.testId] : []))),
    ]);
    const words = queryWords(q);
    const seen = new Set<string>();
    const rows: HubTestRow[] = [];
    for (const s of visible) {
      const date = dateKey(s.date);
      const classroomName = byId.get(s.classroomId)?.classroomName ?? '';
      if (!s.testId) {
        const title = s.manualTitle?.trim();
        if (title && matchesWords(words, [title]))
          rows.push({
            testId: null,
            title,
            variant: null,
            date,
            classroomName,
            problemCount: s.manualProblemCount ?? 0,
            ...testState(date, today, null, active),
          });
        continue;
      }
      const k = `${s.classroomId}|${date}|${s.testId}`;
      if (seen.has(k)) continue;
      seen.add(k);
      const t = tests.get(s.testId);
      if (!t || t.deletedAt || !matchesWords(words, [t.title])) continue;
      rows.push({
        testId: t.id,
        title: t.title,
        variant: normalizeVariant(t.variantLabel),
        date,
        classroomName,
        problemCount: t._count.problems,
        ...testState(date, today, t, active),
      });
    }
    return rows.sort(
      (a, b) =>
        b.date.localeCompare(a.date) ||
        a.classroomName.localeCompare(b.classroomName),
    );
  }

  /**
   * Тестийн эрхийн суурь — нэг давалгаа: одоогийн элсэлт, өөрийн ирцтэй өдрүүд (элсэхээс
   * өмнөх өдрийг харуулах), идэвхжсэн танхимын профайл; 2-р: ангийн нэр (names=true үед).
   * active = hasActiveClassroomEnrollment-ийн дүрэм (идэвхжсэн CLASSROOM профайл + одоогийн анги).
   */
  private async classAccess(
    studentId: string,
    range: Range,
    names = true,
  ): Promise<{ classes: StudentClass[]; own: Set<string>; active: boolean }> {
    const [enrollments, attendance, activated] = await Promise.all([
      this.enrollmentRows(studentId),
      this.prisma.attendance.findMany({
        where: { studentId, date: range, classroom: { archived: false } },
        select: { classroomId: true, date: true },
      }),
      isActivatedClassroomStudent(this.prisma, studentId),
    ]);
    const ids = [...new Set(enrollments.map((e) => e.classroomId))];
    const active = activated && ids.length > 0;
    const classes = this.classesOf(
      enrollments,
      active && names ? await this.classNames(ids) : new Map<string, string>(),
    );
    const current = new Set(ids);
    const own = new Set(
      attendance
        .filter((a) => current.has(a.classroomId))
        .map((a) => dayKey(a.classroomId, dateKey(a.date))),
    );
    return { classes, own, active };
  }

  /* ───────── GET /student-hub/tests/:testId ───────── */

  async testDetail(studentId: string, testId: string): Promise<HubTestDetail> {
    if (typeof testId !== 'string' || !testId || testId.length > 64)
      throw new BadRequestException('testId буруу байна.');
    const today = dateKey(todayUB());
    const range: Range = {
      gte: parseDateOnly(MIN_DATE),
      lte: parseDateOnly(today),
    };
    const { classes, own, active } = await this.classAccess(
      studentId,
      range,
      false,
    );
    // hasActiveClassroomEnrollment (classroomRelease-ийн дүрэм): идэвхжээгүй бол зөв хариу үгүй
    if (!active) throw notClassTest();
    const [sessions, test] = await Promise.all([
      this.prisma.classTestSession.findMany({
        where: {
          classroomId: { in: classes.map((c) => c.classroomId) },
          testId,
          date: range,
        },
        select: { classroomId: true, date: true },
      }),
      this.prisma.test.findUnique({
        where: { id: testId },
        select: {
          id: true,
          title: true,
          variantLabel: true,
          type: true,
          deletedAt: true,
        },
      }),
    ]);
    const byId = new Map(classes.map((c) => [c.classroomId, c]));
    const dates = sessions
      .filter((s) => {
        const cls = byId.get(s.classroomId);
        const date = dateKey(s.date);
        return (
          !!cls &&
          visibleDay(date, cls.joinedKey, own.has(dayKey(s.classroomId, date)))
        );
      })
      .map((s) => dateKey(s.date))
      .sort();
    if (!dates.length) throw notClassTest();
    if (!test || test.deletedAt) throw new NotFoundException('Тест олдсонгүй');
    const open = dates.filter((d) => testOpen(d, today, test));
    if (!open.length)
      throw dates.some((d) => d === today) &&
        testOpen(addDaysKey(today, -1), today, test)
        ? testForbidden('NOT_OPEN_YET', 'Энэ тест маргааш нээгдэнэ.')
        : notClassTest();
    const rows = await this.prisma.testProblem.findMany({
      where: { testId, problem: { deletedAt: null } },
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
            youtubeUrl: true,
            choiceOptions: {
              select: {
                order: true,
                text: true,
                isCorrect: true,
                imageKey: true,
              },
            },
          },
        },
      },
    });
    return {
      testId: test.id,
      title: test.title,
      variant: normalizeVariant(test.variantLabel),
      date: open[open.length - 1],
      problems: (rows as HubProblemRow[]).map(hubProblem),
    };
  }

  /* ───────── GET /student-hub/theory?q=&from=&to= ───────── */

  async theory(
    studentId: string,
    q?: string,
    fromText?: string,
    toText?: string,
  ): Promise<HubTheoryRow[]> {
    const today = dateKey(todayUB());
    const words = queryWords(q);
    let to = toText ? this.parseDay(toText, 'to') : today;
    if (to > today) to = today;
    // Өгөгдмөл эхлэл `to`-оос тоологдоно: q-тэй бол хамгийн урт зөвшөөрөгдөх хүрээ (MIN_DATE-ээс
    // эрт биш), q-гүй бол сүүлийн 60 хоног. «Хэт урт» 400 зөвхөн ИЛ өгсөн хүрээнд.
    let from = fromText
      ? this.parseDay(fromText, 'from')
      : addDaysKey(
          to,
          words.length ? -THEORY_MAX_RANGE_DAYS : -(THEORY_DEFAULT_DAYS - 1),
        );
    if (from < MIN_DATE) from = MIN_DATE;
    if (to < from)
      throw new BadRequestException('Хүрээний эхлэл төгсгөлөөсөө хойно байна.');
    if (
      fromText &&
      (parseDateOnly(to).getTime() - parseDateOnly(from).getTime()) / DAY_MS >
        THEORY_MAX_RANGE_DAYS
    )
      throw new BadRequestException('Хүрээ хэт урт байна.');

    const b = await this.loadBundle(studentId, from, to, { days: false });
    const list = this.visibleDays(b, from, to);
    if (!list.length) return [];
    const uploaderIds: string[] = [];
    const chapterIds: (string | null)[] = [];
    for (const { key } of list) {
      for (const p of b.photos.get(key) ?? []) uploaderIds.push(p.studentId);
      for (const t of b.topics.get(key) ?? [])
        if (words.length || !t.title.trim()) chapterIds.push(t.chapterId);
    }
    const [tests, people, chapters] = await Promise.all([
      this.testsById(this.sessionTestIds(b)),
      this.people(uploaderIds),
      this.chapterTitles(chapterIds),
    ]);
    const out: HubTheoryRow[] = [];
    for (const { cls, date, key } of list) {
      const recs = b.records.get(key) ?? [];
      const topicRows = b.topics.get(key) ?? [];
      const chapterNames = topicRows.map((t) =>
        t.chapterId ? (chapters.get(t.chapterId) ?? null) : null,
      );
      // Зөвхөн нэрс (хайлт, жагсаалт) — нээх эрх энд хамаагүй
      const testTitles = this.dayTests(b, key, date, today, tests, true).map(
        (t) => t.title,
      );
      if (
        !matchesWords(words, [
          ...recs.map((r) => r.topic),
          ...topicRows.map((t) => t.title),
          ...chapterNames,
          ...testTitles,
        ])
      )
        continue;
      const photos = b.photos.get(key) ?? [];
      out.push({
        classroomId: cls.classroomId,
        classroomName: cls.classroomName,
        date,
        topic: topicOf(
          ...recs.map((r) => r.topic),
          ...topicRows.map((t) => t.title),
          ...chapterNames,
        ),
        tests: testTitles,
        count: photos.reduce((n, p) => n + p.imageKeys.length, 0),
        uploaders: [
          ...new Set(
            photos.map((p) => people.names.get(p.studentId) ?? 'Сурагч'),
          ),
        ],
        canUpload: inUploadWindow(date, today),
      });
    }
    return out;
  }
}
