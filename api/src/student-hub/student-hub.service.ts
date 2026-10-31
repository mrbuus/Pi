import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { addDaysKey, normalizeVariant } from '../attendance/board-logic';
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
  homeworkFor,
  homeworkSummary,
  hubProblem,
  inUploadWindow,
  lessonDaysByClass,
  matchesWords,
  monthWindow,
  pickToday,
  queryWords,
  resolveRange,
  testOpen,
  topicOf,
  ubMinuteOfDay,
  visibleDay,
  type AttendanceStatus,
  type HubProblemRow,
  type LessonDayEvidence,
  type MarkRow,
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

  /**
   * [fromKey, toKey] хичээлийн өдрүүдийн эх сурвалж. 1-р давалгаа: ангиуд + (өөрийн ирц,
   * тэмдэглэгээ, хуваарь/сэдэв/оноолт/exception — relation-оор нэг дуудлагад); 2-р: тест,
   * бүртгэл, онолын зураг.
   */
  private async loadBundle(
    studentId: string,
    fromKey: string,
    toKey: string,
  ): Promise<DayBundle> {
    const range: Range = {
      gte: parseDateOnly(fromKey),
      lte: parseDateOnly(toKey),
    };
    const enrollments = await this.prisma.enrollment.findMany({
      where: this.currentWhere(studentId),
      orderBy: { joinedAt: 'asc' },
      select: {
        classroomId: true,
        joinedAt: true,
        classroom: {
          select: {
            name: true,
            // note-ийг ХЭЗЭЭ Ч сонгохгүй
            attendances: {
              where: { studentId, date: range },
              select: { date: true, status: true, lateRange: true },
            },
            dailyHomeworkMarks: {
              where: { studentId, date: range },
              select: { date: true, status: true, comment: true },
            },
            classSchedules: {
              select: {
                id: true,
                weekday: true,
                startMinute: true,
                endMinute: true,
                room: true,
                teacherId: true,
                effectiveFrom: true,
                effectiveTo: true,
                // dismissMode-ийг ХЭЗЭЭ Ч сонгохгүй
                topics: {
                  where: { date: range },
                  select: {
                    date: true,
                    title: true,
                    chapterId: true,
                    photoStudentId: true,
                  },
                },
                staffing: {
                  where: { date: range },
                  select: {
                    date: true,
                    leadTeacherId: true,
                    assistantTeacherId: true,
                  },
                },
                exceptions: {
                  where: { OR: [{ date: range }, { newDate: range }] },
                  select: {
                    date: true,
                    kind: true,
                    newDate: true,
                    newStartMinute: true,
                    newEndMinute: true,
                    newRoom: true,
                  },
                },
              },
            },
          },
        },
      },
    });
    const classes = uniqueClasses(enrollments);
    const bundle: DayBundle = {
      classes,
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
    if (!classes.length) return bundle;
    const ids = classes.map((c) => c.classroomId);
    const [sessions, records, photos] = await Promise.all([
      this.prisma.classTestSession.findMany({
        where: { classroomId: { in: ids }, date: range },
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
        where: { classroomId: { in: ids }, date: range, cancelledAt: null },
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
        where: { classroomId: { in: ids }, date: range },
        select: {
          classroomId: true,
          date: true,
          studentId: true,
          imageKeys: true,
        },
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    const evidence: LessonDayEvidence[] = [];
    const schedules: ResolverSchedule[] = [];
    const exceptions: ResolverException[] = [];
    const seen = new Set<string>();
    for (const e of enrollments) {
      const cid = e.classroomId;
      if (seen.has(cid)) continue;
      seen.add(cid);
      for (const a of e.classroom.attendances) {
        const date = dateKey(a.date);
        evidence.push({ classroomId: cid, date });
        bundle.attendance.set(dayKey(cid, date), {
          status: a.status,
          lateRange: a.lateRange,
        });
      }
      for (const m of e.classroom.dailyHomeworkMarks)
        bundle.marks.set(dayKey(cid, dateKey(m.date)), {
          status: m.status,
          comment: m.comment,
        });
      for (const s of e.classroom.classSchedules) {
        schedules.push({
          id: s.id,
          classroomId: cid,
          classroomName: e.classroom.name,
          weekday: s.weekday,
          startMinute: s.startMinute,
          endMinute: s.endMinute,
          teacherId: s.teacherId,
          teacherName: null,
          room: s.room,
          subject: null,
          effectiveFrom: dateKey(s.effectiveFrom),
          effectiveTo: s.effectiveTo ? dateKey(s.effectiveTo) : null,
        });
        for (const x of s.exceptions)
          exceptions.push({
            scheduleId: s.id,
            date: dateKey(x.date),
            kind: x.kind,
            newDate: x.newDate ? dateKey(x.newDate) : null,
            newStartMinute: x.newStartMinute,
            newEndMinute: x.newEndMinute,
            newRoom: x.newRoom,
            note: null,
          });
        for (const t of s.topics) {
          const date = dateKey(t.date);
          evidence.push({ classroomId: cid, date });
          push(bundle.topics, dayKey(cid, date), {
            title: t.title,
            chapterId: t.chapterId,
            photoStudentId: t.photoStudentId,
          });
        }
        for (const st of s.staffing)
          push(bundle.staffing, dayKey(cid, dateKey(st.date)), {
            leadTeacherId: st.leadTeacherId,
            assistantTeacherId: st.assistantTeacherId,
          });
      }
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
  ) {
    const out: {
      testId: string | null;
      title: string;
      variant: string | null;
      open: boolean;
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
            open: false,
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
        open: testOpen(date, today, t),
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
    const [enrollments, attendance, homework, latest, holidays] =
      await Promise.all([
        this.prisma.enrollment.findMany({
          where: this.currentWhere(studentId),
          orderBy: { joinedAt: 'asc' },
          select: {
            classroomId: true,
            joinedAt: true,
            classroom: {
              select: {
                name: true,
                classSchedules: {
                  where: {
                    effectiveFrom: { lte: todayDate },
                    OR: [
                      { effectiveTo: null },
                      { effectiveTo: { gte: topicFrom } },
                    ],
                  },
                  select: {
                    id: true,
                    weekday: true,
                    startMinute: true,
                    endMinute: true,
                    room: true,
                    teacherId: true,
                    effectiveFrom: true,
                    effectiveTo: true,
                    exceptions: {
                      where: {
                        OR: [{ date: todayDate }, { newDate: todayDate }],
                      },
                      select: {
                        date: true,
                        kind: true,
                        newDate: true,
                        newStartMinute: true,
                        newEndMinute: true,
                        newRoom: true,
                      },
                    },
                    // Зөөгдөж ирсэн хичээлийн сэдэв анхны огноогоороо байдаг тул ойрын хугацааг уншина
                    topics: {
                      where: { date: { gte: topicFrom, lte: todayDate } },
                      select: { date: true, title: true },
                    },
                  },
                },
              },
            },
          },
        }),
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
          select: { date: true, status: true, comment: true },
        }),
        this.prisma.academicCalendarDay.findMany({
          where: { date: todayDate },
          select: {
            type: true,
            title: true,
            classrooms: { select: { classroomId: true } },
          },
        }),
      ]);
    const classes = uniqueClasses(enrollments);
    const schedules: ResolverSchedule[] = [];
    const exceptions: ResolverException[] = [];
    const topics: { scheduleId: string; date: string; title: string }[] = [];
    const seen = new Set<string>();
    for (const e of enrollments) {
      if (seen.has(e.classroomId)) continue;
      seen.add(e.classroomId);
      for (const s of e.classroom.classSchedules) {
        schedules.push({
          id: s.id,
          classroomId: e.classroomId,
          classroomName: e.classroom.name,
          weekday: s.weekday,
          startMinute: s.startMinute,
          endMinute: s.endMinute,
          teacherId: s.teacherId,
          teacherName: null,
          room: s.room,
          subject: null,
          effectiveFrom: dateKey(s.effectiveFrom),
          effectiveTo: s.effectiveTo ? dateKey(s.effectiveTo) : null,
        });
        for (const x of s.exceptions)
          exceptions.push({
            scheduleId: s.id,
            date: dateKey(x.date),
            kind: x.kind,
            newDate: x.newDate ? dateKey(x.newDate) : null,
            newStartMinute: x.newStartMinute,
            newEndMinute: x.newEndMinute,
            newRoom: x.newRoom,
            note: null,
          });
        for (const t of s.topics)
          topics.push({
            scheduleId: s.id,
            date: dateKey(t.date),
            title: t.title,
          });
      }
    }
    const [day] = resolveWeek({
      weekStart: today,
      schedules,
      exceptions,
      topics,
      holidays: holidays.map((h) => ({
        date: today,
        type: h.type,
        title: h.title,
        classroomIds: h.classrooms.map((c) => c.classroomId),
      })),
    });
    const entry =
      day && !day.isHoliday ? pickToday(day.entries, ubMinuteOfDay()) : null;
    let todayView: HubOverview['today'] = null;
    if (entry) {
      // Багш баталсан бүртгэл байвал түүний сэдэв/цаг давамгайлна
      const record = await this.prisma.lessonRecord.findFirst({
        where: {
          classroomId: entry.classroomId,
          scheduleId: entry.scheduleId,
          date: todayDate,
          cancelledAt: null,
        },
        select: { topic: true, startMinute: true, endMinute: true, room: true },
      });
      todayView = {
        classroomId: entry.classroomId,
        classroomName: entry.classroomName,
        date: today,
        startMinute: record?.startMinute ?? entry.startMinute,
        endMinute: record?.endMinute ?? entry.endMinute,
        room: record?.room ?? entry.room,
        topic: topicOf(record?.topic, entry.topic),
      };
    }
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
            }
          : null,
    };
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
    const [b, hwPhotos] = await Promise.all([
      this.loadBundle(studentId, win.from, extTo),
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
    ]);
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
        tests: this.dayTests(b, key, date, today, tests).map((t) => ({
          testId: t.testId,
          title: t.title,
          variant: t.variant,
          open: t.open,
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
    const enrollments = await this.prisma.enrollment.findMany({
      where: this.currentWhere(studentId),
      orderBy: { joinedAt: 'asc' },
      select: {
        classroomId: true,
        joinedAt: true,
        classroom: {
          select: {
            name: true,
            attendances: {
              where: { studentId, date: range },
              select: { date: true },
            },
          },
        },
      },
    });
    const classes = uniqueClasses(enrollments);
    if (!classes.length) return [];
    const own = this.ownAttendanceKeys(enrollments);
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
            open: false,
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
        open: testOpen(date, today, t),
      });
    }
    return rows.sort(
      (a, b) =>
        b.date.localeCompare(a.date) ||
        a.classroomName.localeCompare(b.classroomName),
    );
  }

  private ownAttendanceKeys(
    enrollments: {
      classroomId: string;
      classroom: { attendances: { date: Date }[] };
    }[],
  ): Set<string> {
    const out = new Set<string>();
    for (const e of enrollments)
      for (const a of e.classroom.attendances)
        out.add(dayKey(e.classroomId, dateKey(a.date)));
    return out;
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
    const enrollments = await this.prisma.enrollment.findMany({
      where: this.currentWhere(studentId),
      orderBy: { joinedAt: 'asc' },
      select: {
        classroomId: true,
        joinedAt: true,
        classroom: {
          select: {
            name: true,
            attendances: {
              where: { studentId, date: range },
              select: { date: true },
            },
          },
        },
      },
    });
    const classes = uniqueClasses(enrollments);
    if (!classes.length)
      throw new ForbiddenException('Энэ тестийг танай анги хийгээгүй байна.');
    const own = this.ownAttendanceKeys(enrollments);
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
    if (!dates.length)
      throw new ForbiddenException('Энэ тестийг танай анги хийгээгүй байна.');
    if (!test || test.deletedAt) throw new NotFoundException('Тест олдсонгүй');
    const open = dates.filter((d) => testOpen(d, today, test));
    if (!open.length)
      throw new ForbiddenException(
        dates.some((d) => d === today)
          ? 'Энэ тест маргааш нээгдэнэ.'
          : 'Энэ тестийг энд нээх боломжгүй.',
      );
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
    let from = fromText
      ? this.parseDay(fromText, 'from')
      : words.length
        ? MIN_DATE
        : addDaysKey(today, -(THEORY_DEFAULT_DAYS - 1));
    if (from < MIN_DATE) from = MIN_DATE;
    if (to < from)
      throw new BadRequestException('Хүрээний эхлэл төгсгөлөөсөө хойно байна.');
    if (
      (parseDateOnly(to).getTime() - parseDateOnly(from).getTime()) / DAY_MS >
      THEORY_MAX_RANGE_DAYS
    )
      throw new BadRequestException('Хүрээ хэт урт байна.');

    const b = await this.loadBundle(studentId, from, to);
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
      const testTitles = this.dayTests(b, key, date, today, tests).map(
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
