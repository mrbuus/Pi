import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { loadCoverageCatalog } from '../class-dashboard/class-coverage.data';
import { bookRank } from '../class-dashboard/class-coverage.logic';
import { shortTestName } from '../class-sessions/roadmap.logic';
import { classTeacherWhere } from '../common/class-teachers';
import { addDateDays, dateKey, parseDateOnly, todayUB } from '../common/date';
import { groupTestNames } from '../common/test-names';
import { ClassroomType, Role } from '../generated/prisma/enums';
import { MakeupVisitsService, type MakeupHistoryItem } from '../makeup-visits/makeup-visits.service';
import { PrismaService } from '../prisma/prisma.service';
import { shortName } from '../revisions/revision-snapshot';
import type { ResolverException, ResolverStaffing } from '../schedule/week-resolver';
import {
  classesInRange,
  currentClassroomOf,
  enrolledOn,
  type EnrollmentSpan,
} from './enrollment-span.logic';
import { buildLessonDays, resolveRange, type LessonDay } from './lesson-days.logic';
import {
  computeSyllabus,
  firstDoneDate,
  itemKey,
  type AttStatus,
  type SyllabusEvent,
  type SyllabusStatus,
} from './syllabus.logic';

export type Actor = { userId: string; role: Role };
const STAFF: Role[] = [Role.ADMIN, Role.TEACHER_PLUS, Role.TEACHER];
/** Нэг хүсэлтийн хамгийн урт муж (хуанли сараар гүйлгэдэг; 3 сар хүртэл) */
export const MAX_RANGE_DAYS = 93;

/** GET /students/:id/lesson-days хариу */
export interface LessonDaysResponse {
  from: string;
  to: string;
  today: string;
  /** Хамгийн эрт бичлэг (элссэн, ирц, нөхөлт) — сарын навигацийн доод хил */
  firstDate: string | null;
  days: (LessonDay & { testsText: string | null })[];
  makeups: MakeupHistoryItem[];
}

/** Сэдэв хөтөлбөрийн үйл явдал (дэлгэцэнд): анги/газрын нэр, багш, тайлбартай */
export type SyllabusEventView = SyllabusEvent & {
  classroomName?: string;
  lead?: string | null;
  description?: string | null;
  teacherNote?: string | null;
};
export interface SyllabusTestView {
  id: string;
  title: string;
  variant: string | null;
  status: SyllabusStatus;
  doneOn: string | null;
  events: SyllabusEventView[];
}
export interface SyllabusResponse {
  student: { id: string; name: string };
  classroom: { id: string; name: string } | null;
  summary: { done: number; missing: number; todo: number; total: number };
  books: {
    id: string;
    code: string;
    title: string;
    chapters: { id: string; order: number; title: string; tests: SyllabusTestView[] }[];
  }[];
  /** Номын каталогт ороогүй (гараар бичсэн, өөр номын) хийсэн/дутуу сэдэв */
  other: SyllabusTestView[];
}

/**
 * Сурагчийн хичээлийн хуанли ба сэдэв хөтөлбөр (эзэн 2026-11-08). Зөвхөн ажилтан; Багш —
 * сурагчийн аль нэг идэвхтэй ангийн үндсэн/туслах багш бол (lesson-records studentHistory-тэй ижил).
 * Бүх уншилт нэг сурагчийнх, тогтмол тооны индекстэй query (өдөр тутмаар query хийхгүй).
 */
@Injectable()
export class StudentCalendarService {
  constructor(
    private prisma: PrismaService,
    private makeups: MakeupVisitsService,
  ) {}

  private async assertCanView(actor: Actor, studentId: string) {
    if (!STAFF.includes(actor.role)) throw new ForbiddenException('Зөвхөн багш нарт');
    const student = await this.prisma.user.findUnique({
      where: { id: studentId },
      select: { id: true, role: true, firstName: true, lastName: true },
    });
    if (!student || student.role !== Role.STUDENT) throw new NotFoundException('Сурагч олдсонгүй');
    if (actor.role === Role.TEACHER) {
      const mine = await this.prisma.enrollment.findFirst({
        where: { studentId, leftAt: null, classroom: classTeacherWhere(actor.userId) },
        select: { id: true },
      });
      if (!mine) throw new ForbiddenException('Зөвхөн өөрийн ангийн сурагчийг харах эрхтэй');
    }
    return student;
  }

  private parse(value: string | undefined, label: string): string {
    try {
      return dateKey(parseDateOnly(String(value ?? '')));
    } catch {
      throw new BadRequestException(`${label} огноо буруу байна (YYYY-MM-DD)`);
    }
  }

  private async spans(studentId: string) {
    const rows = await this.prisma.enrollment.findMany({
      where: { studentId },
      select: {
        classroomId: true,
        joinedAt: true,
        leftAt: true,
        classroom: { select: { name: true, type: true, subject: true } },
      },
      orderBy: { joinedAt: 'asc' },
    });
    const spans: EnrollmentSpan[] = rows.map((r) => ({
      classroomId: r.classroomId,
      joined: dateKey(r.joinedAt),
      left: r.leftAt ? dateKey(r.leftAt) : null,
    }));
    return { rows, spans };
  }

  private async userNames(ids: (string | null | undefined)[]) {
    const unique = [...new Set(ids.filter((v): v is string => !!v))];
    if (!unique.length) return new Map<string, string>();
    const users = await this.prisma.user.findMany({
      where: { id: { in: unique } },
      select: { id: true, firstName: true, lastName: true, role: true },
    });
    return new Map(users.map((u) => [u.id, shortName(u)]));
  }

  private async classNames(ids: string[]) {
    const unique = [...new Set(ids)];
    if (!unique.length) return new Map<string, string>();
    const rows = await this.prisma.classroom.findMany({
      where: { id: { in: unique } },
      select: { id: true, name: true },
    });
    return new Map(rows.map((c) => [c.id, c.name]));
  }

  /* ───────── Хуанли ───────── */

  async lessonDays(actor: Actor, studentId: string, fromStr?: string, toStr?: string): Promise<LessonDaysResponse> {
    await this.assertCanView(actor, studentId);
    const today = dateKey(todayUB());
    const from = fromStr ? this.parse(fromStr, 'Эхлэх') : `${today.slice(0, 7)}-01`;
    const to = toStr ? this.parse(toStr, 'Дуусах') : dateKey(addDateDays(parseDateOnly(`${addMonth(from.slice(0, 7))}-01`), -1));
    if (from > to) throw new BadRequestException('Эхлэх огноо дуусахаас хойш байна');
    const spanDays = Math.round((parseDateOnly(to).getTime() - parseDateOnly(from).getTime()) / 86_400_000);
    if (spanDays > MAX_RANGE_DAYS) throw new BadRequestException(`Мужийг ${MAX_RANGE_DAYS} хоногоос ихгүй сонгоно уу`);
    const fromD = parseDateOnly(from);
    const toD = parseDateOnly(to);

    const { rows: enrollRows, spans } = await this.spans(studentId);
    const classIds = classesInRange(spans, from, to);
    const enrolled = (c: string, d: string) => enrolledOn(spans, c, d);
    const dateIn = { gte: fromD, lte: toD };

    const [schedules, holidays, attendance, homework, sessions, records, quiz, makeups, firstAtt] = await Promise.all([
      this.prisma.classSchedule.findMany({
            where: {
              classroomId: { in: classIds },
              deletedAt: null,
              effectiveFrom: { lte: toD },
              OR: [{ effectiveTo: null }, { effectiveTo: { gte: fromD } }],
            },
            include: {
              classroom: { select: { name: true } },
              teacher: { select: { id: true, firstName: true, lastName: true, role: true } },
              exceptions: true,
            },
          }),
      this.prisma.academicCalendarDay.findMany({
        where: { date: dateIn, deletedAt: null },
        include: { classrooms: { select: { classroomId: true } } },
      }),
      this.prisma.attendance.findMany({
        where: { studentId, date: dateIn },
        select: { classroomId: true, date: true, status: true, lateRange: true, note: true, markedById: true },
      }),
      this.prisma.dailyHomeworkMark.findMany({
        where: { studentId, date: dateIn, OR: [{ status: { not: null } }, { comment: { not: null } }] },
        select: { classroomId: true, date: true, status: true, comment: true, markedById: true },
      }),
      this.prisma.classTestSession.findMany({
            where: { classroomId: { in: classIds }, date: dateIn },
            select: { classroomId: true, date: true, testId: true, manualTitle: true },
            orderBy: { createdAt: 'asc' },
          }),
      this.prisma.lessonRecord.findMany({
        where: {
          cancelledAt: null,
          date: dateIn,
          OR: [
            ...(classIds.length ? [{ classroomId: { in: classIds } }] : []),
            { students: { some: { studentId, removedAt: null } } },
          ],
        },
        include: { students: { where: { studentId, removedAt: null }, select: { id: true } } },
      }),
      // Шалгалтын оноо — homework-quiz-ийн хүснэгтээс зөвхөн уншина (оноо бутархай болж магадгүй тул Number())
      this.prisma.homeworkQuizScore.findMany({
        where: { studentId, deletedAt: null, quiz: { deletedAt: null, date: dateIn } },
        select: { score: true, quiz: { select: { classroomId: true, date: true, problemCount: true } } },
      }),
      this.makeups.coveredByStudent(studentId, { from, to }),
      this.prisma.attendance.findFirst({ where: { studentId }, orderBy: { date: 'asc' }, select: { date: true } }),
    ]);

    const scheduleIds = schedules.map((s) => s.id);
    const exceptions: ResolverException[] = schedules.flatMap((s) =>
      s.exceptions.map((e) => ({
        scheduleId: e.scheduleId,
        date: dateKey(e.date),
        kind: e.kind,
        newDate: e.newDate ? dateKey(e.newDate) : null,
        newStartMinute: e.newStartMinute,
        newEndMinute: e.newEndMinute,
        newRoom: e.newRoom,
        note: e.note,
      })),
    );
    // Зөөгдсөн хичээлийн сэдэв/багш анхны огноогоор хадгалагддаг — мужийн гадна эх огноог ч уншина
    const occurrenceDates = [
      ...new Set(exceptions.filter((e) => e.newDate && e.newDate >= from && e.newDate <= to).map((e) => e.date)),
    ].map(parseDateOnly);
    const occurrenceWhere = scheduleIds.length
      ? {
          scheduleId: { in: scheduleIds },
          OR: [{ date: dateIn }, ...(occurrenceDates.length ? [{ date: { in: occurrenceDates } }] : [])],
        }
      : null;
    const [topics, staffing, notes] = occurrenceWhere
      ? await Promise.all([
          this.prisma.lessonTopic.findMany({ where: occurrenceWhere, select: { scheduleId: true, date: true, title: true } }),
          this.prisma.lessonStaffing.findMany({ where: occurrenceWhere }),
          this.prisma.lessonNote.findMany({
            where: { scheduleId: { in: scheduleIds }, date: dateIn, deletedAt: null },
            select: { scheduleId: true, date: true, body: true, updatedById: true },
          }),
        ])
      : [[], [], []];

    const testIds = [...new Set(sessions.map((s) => s.testId).filter((v): v is string => !!v))];
    const [tests, names, classNames] = await Promise.all([
      this.prisma.test.findMany({ where: { id: { in: testIds } }, select: { id: true, title: true, variantLabel: true } }),
      this.userNames([
        ...attendance.map((a) => a.markedById),
        ...homework.map((h) => h.markedById),
        ...staffing.flatMap((s) => [s.leadTeacherId, s.assistantTeacherId]),
        ...notes.map((n) => n.updatedById),
        ...records.flatMap((r) => [r.leadTeacherId, r.assistantTeacherId, r.confirmedById]),
      ]),
      this.classNames([
        ...enrollRows.map((r) => r.classroomId),
        ...attendance.map((a) => a.classroomId),
        ...homework.map((h) => h.classroomId),
        ...records.map((r) => r.classroomId),
        ...quiz.map((q) => q.quiz.classroomId),
      ]),
    ]);
    const testById = new Map(tests.map((t) => [t.id, t]));
    const scheduleClass = new Map(schedules.map((s) => [s.id, s.classroomId]));
    const person = (id: string | null) => (id ? { id, name: names.get(id) ?? 'Багш' } : null);

    const resolved = resolveRange({
      from,
      to,
      schedules: schedules.map((s) => ({
        id: s.id,
        classroomId: s.classroomId,
        classroomName: s.classroom.name,
        weekday: s.weekday,
        startMinute: s.startMinute,
        endMinute: s.endMinute,
        teacherId: s.teacher?.id ?? null,
        teacherName: s.teacher ? shortName(s.teacher) : null,
        teacherRole: s.teacher?.role ?? null,
        room: s.room,
        subject: s.subject,
        effectiveFrom: dateKey(s.effectiveFrom),
        effectiveTo: s.effectiveTo ? dateKey(s.effectiveTo) : null,
      })),
      exceptions,
      topics: topics.map((t) => ({ scheduleId: t.scheduleId, date: dateKey(t.date), title: t.title })),
      staffing: staffing.map(
        (r): ResolverStaffing => ({
          scheduleId: r.scheduleId,
          date: dateKey(r.date),
          lead: person(r.leadTeacherId),
          assistant: person(r.assistantTeacherId),
        }),
      ),
      holidays: holidays.map((h) => ({
        date: dateKey(h.date),
        type: h.type,
        title: h.title,
        classroomIds: h.classrooms.map((c) => c.classroomId),
      })),
    });

    const days = buildLessonDays({
      from,
      to,
      today,
      enrolled,
      classNames,
      resolved,
      attendance: attendance.map((a) => ({
        classroomId: a.classroomId,
        date: dateKey(a.date),
        status: a.status,
        lateRange: a.lateRange,
        note: a.note,
        markedBy: names.get(a.markedById) ?? null,
      })),
      homework: homework.map((h) => ({
        classroomId: h.classroomId,
        date: dateKey(h.date),
        status: h.status,
        comment: h.comment,
        markedBy: names.get(h.markedById) ?? null,
      })),
      sessions: sessions.map((s) => {
        const t = s.testId ? testById.get(s.testId) : undefined;
        return {
          classroomId: s.classroomId,
          date: dateKey(s.date),
          testId: s.testId,
          title: t ? shortTestName(t.title) : (s.manualTitle ?? 'Тест'),
          variant: t?.variantLabel ?? null,
        };
      }),
      records: records.map((r) => ({
        classroomId: r.classroomId,
        date: dateKey(r.date),
        startMinute: r.startMinute,
        endMinute: r.endMinute,
        room: r.room,
        topic: r.topic,
        lead: r.leadTeacherId ? (names.get(r.leadTeacherId) ?? r.leadTeacherName) : r.leadTeacherName,
        assistant: r.assistantTeacherId ? (names.get(r.assistantTeacherId) ?? r.assistantTeacherName) : r.assistantTeacherName,
        description: r.description,
        problemNumbersText: r.problemNumbersText,
        confirmedBy: names.get(r.confirmedById) ?? r.confirmedByName,
        studentListed: r.students.length > 0,
      })),
      quiz: quiz.map((q) => ({
        classroomId: q.quiz.classroomId,
        date: dateKey(q.quiz.date),
        score: Number(q.score),
        problemCount: q.quiz.problemCount,
      })),
      notes: notes.flatMap((n) => {
        const classroomId = scheduleClass.get(n.scheduleId);
        return classroomId
          ? [{ classroomId, date: dateKey(n.date), body: n.body, by: names.get(n.updatedById) ?? 'Багш' }]
          : [];
      }),
    });

    const firstCandidates = [spans[0]?.joined, firstAtt ? dateKey(firstAtt.date) : undefined].filter(
      (v): v is string => !!v,
    );
    const firstMakeup = await this.prisma.makeupVisit.findFirst({
      where: { studentId, deletedAt: null },
      orderBy: { date: 'asc' },
      select: { date: true },
    });
    if (firstMakeup) firstCandidates.push(dateKey(firstMakeup.date));

    return {
      from,
      to,
      today,
      firstDate: firstCandidates.sort()[0] ?? null,
      days: days.map((d) => ({ ...d, testsText: d.tests.length ? groupTestNames(d.tests.map((t) => t.title)) : null })),
      makeups: [...makeups].sort((a, b) => a.date.localeCompare(b.date)),
    };
  }

  /* ───────── Сэдэв хөтөлбөр ───────── */

  async syllabus(actor: Actor, studentId: string): Promise<SyllabusResponse> {
    const student = await this.assertCanView(actor, studentId);
    const today = dateKey(todayUB());
    const { rows: enrollRows, spans } = await this.spans(studentId);
    const inPerson = new Set(enrollRows.filter((r) => r.classroom.type === ClassroomType.IN_PERSON).map((r) => r.classroomId));
    const currentId = currentClassroomOf(spans, inPerson);
    const current = enrollRows.find((r) => r.classroomId === currentId) ?? null;
    const classIds = [...new Set(spans.map((s) => s.classroomId))];
    const enrolled = (c: string, d: string) => enrolledOn(spans, c, d);

    const [catalog, sessions, past, attendance, makeups, schedules] = await Promise.all([
      loadCoverageCatalog(this.prisma, current?.classroom.subject ?? null),
      this.prisma.classTestSession.findMany({
            where: { classroomId: { in: classIds } },
            select: { classroomId: true, date: true, testId: true, manualTitle: true },
          }),
      this.prisma.classCoveredTest.findMany({
            where: { classroomId: { in: classIds }, removedAt: null },
            select: { classroomId: true, testId: true, createdAt: true },
          }),
      this.prisma.attendance.findMany({
        where: { studentId },
        select: { classroomId: true, date: true, status: true },
      }),
      this.makeups.coveredByStudent(studentId),
      this.prisma.classSchedule.findMany({ where: { classroomId: { in: classIds } }, select: { id: true, classroomId: true } })
    ]);

    // Ангийн хичээлийн дэлгэрэнгүй (батламжийн тайлбар, ахлах багш, багшийн тэмдэглэл) — тест хийсэн өдрүүдээр
    const sessionDates = [...new Set(sessions.map((s) => dateKey(s.date)))].map(parseDateOnly);
    const scheduleClass = new Map(schedules.map((s) => [s.id, s.classroomId]));
    const [records, notes] = sessionDates.length
      ? await Promise.all([
          this.prisma.lessonRecord.findMany({
            where: { classroomId: { in: classIds }, date: { in: sessionDates }, cancelledAt: null },
            select: { classroomId: true, date: true, leadTeacherId: true, leadTeacherName: true, description: true },
          }),
          this.prisma.lessonNote.findMany({
                where: { scheduleId: { in: schedules.map((s) => s.id) }, date: { in: sessionDates }, deletedAt: null },
                select: { scheduleId: true, date: true, body: true },
              }),
        ])
      : [[], []];

    const state = computeSyllabus({
      today,
      currentClassroomId: currentId,
      enrolled,
      attendance: new Map(attendance.map((a) => [`${a.classroomId}|${dateKey(a.date)}`, a.status as AttStatus])),
      sessions: sessions.map((s) => ({
        classroomId: s.classroomId,
        date: dateKey(s.date),
        testId: s.testId,
        title: s.manualTitle ?? '',
      })),
      past: past.map((p) => ({ classroomId: p.classroomId, testId: p.testId, markedOn: dateKey(p.createdAt) })),
      makeups: makeups.map((m) => ({
        visitId: m.id,
        date: m.date,
        place: m.place,
        attStatus: m.attendance.status,
        teacher: m.teacher.name,
        comment: m.comment,
        tests: m.tests.map((t) => ({ testId: t.testId, title: t.title, source: t.source })),
      })),
    });

    const [names, classNames] = await Promise.all([
      this.userNames(records.map((r) => r.leadTeacherId)),
      this.classNames(classIds),
    ]);
    const detail = new Map<string, { lead: string | null; description: string | null; teacherNote: string | null }>();
    const slot = (k: string) => {
      let d = detail.get(k);
      if (!d) detail.set(k, (d = { lead: null, description: null, teacherNote: null }));
      return d;
    };
    for (const r of records) {
      const d = slot(`${r.classroomId}|${dateKey(r.date)}`);
      d.lead = r.leadTeacherId ? (names.get(r.leadTeacherId) ?? r.leadTeacherName) : r.leadTeacherName;
      d.description = r.description;
    }
    for (const n of notes) {
      const c = scheduleClass.get(n.scheduleId);
      if (c) {
        const d = slot(`${c}|${dateKey(n.date)}`);
        d.teacherNote = d.teacherNote ? `${d.teacherNote}\n${n.body}` : n.body;
      }
    }
    const viewEvents = (events: SyllabusEvent[]): SyllabusEventView[] =>
      events.map((e) => {
        if (e.kind === 'MAKEUP') return e;
        const base = { ...e, classroomName: classNames.get(e.classroomId) ?? 'Анги' };
        if (e.kind !== 'CLASS') return base;
        const d = detail.get(`${e.classroomId}|${e.date}`);
        return { ...base, lead: d?.lead ?? null, description: d?.description ?? null, teacherNote: d?.teacherNote ?? null };
      });
    const view = (id: string, key: string, title: string, variant: string | null): SyllabusTestView => {
      const s = state.get(key);
      return {
        id,
        title,
        variant,
        status: s?.status ?? 'TODO',
        doneOn: firstDoneDate(s),
        events: s ? viewEvents(s.events) : [],
      };
    };

    // Ном → бүлэг → тест (ангийн «Өмнө үзсэн сэдэв»-ийн каталогтой ижил дараалал)
    const usedKeys = new Set<string>();
    const testsByChapter = new Map<string, typeof catalog.tests>();
    for (const t of catalog.tests) {
      const list = testsByChapter.get(t.chapterId ?? '') ?? [];
      list.push(t);
      testsByChapter.set(t.chapterId ?? '', list);
    }
    const variantRank = (v: string | null) => (v ? v.toUpperCase() : '~');
    const books = [...catalog.books]
      .sort((a, b) => bookRank(a.code) - bookRank(b.code) || a.code.localeCompare(b.code))
      .map((b) => ({
        id: b.id,
        code: b.code,
        title: b.title,
        chapters: catalog.chapters
          .filter((c) => c.bookId === b.id && testsByChapter.has(c.id))
          .sort((x, y) => x.order - y.order || x.title.localeCompare(y.title))
          .map((c) => ({
            id: c.id,
            order: c.order,
            title: c.title,
            tests: [...(testsByChapter.get(c.id) ?? [])]
              .sort(
                (x, y) =>
                  variantRank(x.variantLabel).localeCompare(variantRank(y.variantLabel)) || x.title.localeCompare(y.title),
              )
              .map((t) => {
                const key = itemKey(t.id, '');
                usedKeys.add(key);
                return view(t.id, key, shortTestName(t.title), t.variantLabel);
              }),
          })),
      }))
      .filter((b) => b.chapters.length > 0);

    // Каталогт ороогүй: өөр номын/ноорог тест эсвэл гараар бичсэн сэдэв
    const leftover = [...state.keys()].filter((k) => !usedKeys.has(k));
    const otherTestIds = leftover.filter((k) => k.startsWith('t:')).map((k) => k.slice(2));
    const otherTests = otherTestIds.length
      ? await this.prisma.test.findMany({
          where: { id: { in: otherTestIds } },
          select: { id: true, title: true, variantLabel: true },
        })
      : [];
    const otherTitle = new Map(otherTests.map((t) => [t.id, t]));
    const manualTitle = new Map<string, string>();
    for (const s of sessions) if (!s.testId && s.manualTitle) manualTitle.set(itemKey(null, s.manualTitle), s.manualTitle.trim());
    for (const m of makeups) for (const t of m.tests) if (!t.testId) manualTitle.set(itemKey(null, t.title), t.title.trim());
    const other = leftover
      .map((k) => {
        if (k.startsWith('t:')) {
          const t = otherTitle.get(k.slice(2));
          return view(k.slice(2), k, t ? shortTestName(t.title) : 'Тест', t?.variantLabel ?? null);
        }
        return view(k, k, manualTitle.get(k) ?? k.slice(2), null);
      })
      .sort((a, b) => (a.doneOn ?? a.events[0]?.date ?? '').localeCompare(b.doneOn ?? b.events[0]?.date ?? ''));

    const all = [...books.flatMap((b) => b.chapters.flatMap((c) => c.tests)), ...other];
    const count = (s: SyllabusStatus) => all.filter((t) => t.status === s).length;
    return {
      student: { id: student.id, name: `${student.lastName} ${student.firstName}`.trim() },
      classroom: current ? { id: current.classroomId, name: current.classroom.name } : null,
      summary: { done: count('DONE'), missing: count('MISSING'), todo: count('TODO'), total: all.length },
      books,
      other,
    };
  }
}

function addMonth(month: string): string {
  const [y, m] = month.split('-').map(Number);
  const d = new Date(Date.UTC(y, m, 1));
  return d.toISOString().slice(0, 7);
}
