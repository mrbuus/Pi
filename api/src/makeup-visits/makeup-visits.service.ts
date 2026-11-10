import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { assertMarkAccess } from '../attendance/marking-access';
import { AuditService } from '../audit/audit.service';
import { ClassSessionsService } from '../class-sessions/class-sessions.service';
import { shortTestName } from '../class-sessions/roadmap.logic';
import { dateKey, parseDateOnly, todayUB } from '../common/date';
import { Prisma } from '../generated/prisma/client';
import { AttendanceStatus, Role } from '../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import { shortName } from '../revisions/revision-snapshot';
import { ScheduleService } from '../schedule/schedule.service';
import { CreateMakeupVisitsDto, SetMakeupTestsDto, UpdateMakeupVisitDto } from './makeup-visits.dto';
import {
  ROOM_406,
  diffTests,
  hostLessonCovered,
  isAllowedVisitDate,
  matchStudents,
  pickHomeClassroom,
  placeKeyOf,
  placeLabel,
  planCreate,
  shortClassName,
  type CoveredItem,
  type SkipReason,
} from './makeup-visits.logic';

export type Actor = { userId: string; role: Role };
const STAFF: Role[] = [Role.ADMIN, Role.TEACHER_PLUS, Role.TEACHER];

const LIVE = { deletedAt: null } as const;
const ACTIVE_ENROLLMENT = {
  leftAt: null,
  classroom: { archived: false },
} as const;

type VisitRow = Prisma.MakeupVisitGetPayload<{ include: { tests: true } }>;

/** Нэг тест/сэдэв — сурагчийн хариу (онлайнаар өгсөн бол) */
export interface CoveredTestView extends CoveredItem {
  /** MakeupVisitTest.id (406) — зочилсон ангийнх бол null */
  id: string | null;
  variant: string | null;
  /** TestResult (онлайн/гараар орсон дүн) — байхгүй бол null */
  result: { score: number; max: number } | null;
}

/**
 * GET /students/:id/makeup-visits-ийн мөр — сурагчийн нөхөлтийн түүх. Өөр агент
 * (сурагчийн хөтөлбөр) ЭНЭ хэлбэрийг хэрэглэнэ — талбарыг нэмж болно, хасаж/нэр солихгүй.
 */
export interface MakeupHistoryItem {
  id: string;
  date: string;
  place:
    | { kind: 'CLASS'; classroomId: string; name: string }
    | { kind: 'ROOM_406'; classroomId: null; name: '406' };
  /** «12-6 ангид нөхөж суусан» / «406-д нөхөж хийсэн» */
  label: string;
  /** Нэмэх үеийн өөрийн анги */
  homeClassroom: { id: string; name: string } | null;
  tests: CoveredTestView[];
  comment: string | null;
  attendance: { status: AttendanceStatus | null; lateRange: string | null; note: string | null };
  homework: { status: string | null; note: string | null };
  /** Бүртгэсэн багш (Багш+ бол нэрийн ард «+») */
  teacher: { id: string; name: string };
  createdAt: string;
  updatedAt: string;
}

/** Самбарын мөр (зочилсон анги эсвэл 406) */
export interface VisitView extends MakeupHistoryItem {
  student: { id: string; firstName: string; lastName: string; code: string | null };
  updatedBy: { id: string; name: string } | null;
}

/**
 * Нөхөлт (эзэн 2026-11-08) — өөр ангид суух, 406 өрөөнд нөхөх. Эрх: ажилтан
 * (Админ, Багш+, Багш); зочилсон анги бол тэр ангийн самбарыг тэмдэглэх эрх
 * (attendance/marking-access.ts). Устгал зөөлөн, өөрчлөлт бүр аудитад.
 */
@Injectable()
export class MakeupVisitsService {
  constructor(
    private prisma: PrismaService,
    private schedule: ScheduleService,
    private audit: AuditService,
    private sessions: ClassSessionsService,
  ) {}

  /* ───────── Туслах ───────── */

  private parse(value: string | undefined): { date: Date; key: string } {
    try {
      const date = parseDateOnly(String(value ?? ''));
      return { date, key: dateKey(date) };
    } catch {
      throw new BadRequestException('Огноо буруу байна (YYYY-MM-DD)');
    }
  }

  private assertStaff(actor: Actor) {
    if (!STAFF.includes(actor.role)) throw new ForbiddenException('Зөвхөн багш нарт');
  }

  /** Газрын эрх: 406 — ямар ч ажилтан; анги — тэр ангийн самбарыг тэмдэглэх эрх */
  private async assertPlace(actor: Actor, hostClassroomId: string | null, date: Date) {
    this.assertStaff(actor);
    if (!hostClassroomId) return null;
    return assertMarkAccess(this.prisma, hostClassroomId, actor.userId, actor.role, { date });
  }

  private async findVisit(id: string): Promise<VisitRow> {
    const v = await this.prisma.makeupVisit.findFirst({
      where: { id, ...LIVE },
      include: { tests: { where: LIVE, orderBy: { createdAt: 'asc' } } },
    });
    if (!v) throw new NotFoundException('Нөхөлт олдсонгүй');
    return v;
  }

  /** Тэр өдөр зочилсон ангийн хуваарьт хичээл (амралтын өдөр биш) байгаа эсэх */
  private async hostHasLesson(hostClassroomId: string, key: string): Promise<boolean> {
    const week = await this.schedule.getWeek(key, [hostClassroomId]);
    const day = week.days.find((d) => d.date === key);
    return !!day && !day.isHoliday && day.entries.some((e) => e.classroomId === hostClassroomId);
  }

  /* ───────── Сурагч хайх, ангийн жагсаалт ───────── */

  /** Нэрээр хайх: овог нэр + идэвхтэй анги(ууд) — ижил нэртэйг ангиар нь ялгана */
  async search(actor: Actor, q: string | undefined) {
    this.assertStaff(actor);
    const students = await this.prisma.user.findMany({
      where: { role: Role.STUDENT, archivedAt: null },
      select: { id: true, firstName: true, lastName: true, studentCode: true },
    });
    const hits = matchStudents(
      q ?? '',
      students.map((s) => ({ id: s.id, firstName: s.firstName, lastName: s.lastName, code: s.studentCode })),
    );
    const classes = await this.activeClasses(hits.map((h) => h.id));
    return hits.map((h) => ({ ...h, classes: classes.get(h.id) ?? [] }));
  }

  private async activeClasses(studentIds: string[]) {
    const out = new Map<string, { id: string; name: string }[]>();
    if (!studentIds.length) return out;
    const rows = await this.prisma.enrollment.findMany({
      where: { studentId: { in: studentIds }, ...ACTIVE_ENROLLMENT },
      select: { studentId: true, joinedAt: true, classroom: { select: { id: true, name: true } } },
      orderBy: { joinedAt: 'desc' },
    });
    for (const r of rows) {
      const list = out.get(r.studentId) ?? [];
      if (!list.some((c) => c.id === r.classroom.id)) list.push(r.classroom);
      out.set(r.studentId, list);
    }
    return out;
  }

  /** Төвийн идэвхтэй ангиуд (406-д ангиар нэмэх) */
  async classrooms(actor: Actor) {
    this.assertStaff(actor);
    const rows = await this.prisma.classroom.findMany({
      where: { archived: false },
      select: {
        id: true,
        name: true,
        _count: { select: { enrollments: { where: { leftAt: null, student: { archivedAt: null } } } } },
      },
    });
    return rows
      .map((c) => ({ id: c.id, name: c.name, studentCount: c._count.enrollments }))
      .sort((a, b) => a.name.localeCompare(b.name, 'mn', { numeric: true }));
  }

  /** Нэг ангийн сурагчид — зөвхөн овог, нэр, анги (эзэн: «өөр юу ч биш») */
  async classroomStudents(actor: Actor, classroomId: string) {
    this.assertStaff(actor);
    const cls = await this.prisma.classroom.findFirst({
      where: { id: classroomId, archived: false },
      select: { id: true, name: true },
    });
    if (!cls) throw new NotFoundException('Анги олдсонгүй');
    const rows = await this.prisma.enrollment.findMany({
      where: { classroomId, leftAt: null, student: { archivedAt: null } },
      select: { student: { select: { id: true, firstName: true, lastName: true } } },
    });
    const seen = new Set<string>();
    return rows
      .map((r) => r.student)
      .filter((s) => (seen.has(s.id) ? false : (seen.add(s.id), true)))
      .sort(
        (a, b) =>
          a.firstName.localeCompare(b.firstName, 'mn') || a.lastName.localeCompare(b.lastName, 'mn'),
      )
      .map((s) => ({ id: s.id, firstName: s.firstName, lastName: s.lastName, classroom: cls }));
  }

  /**
   * 406-д тест сонгох: сурагчийн ангийн номын дарааллын замын зураг (хийсэн тест
   * «Хийсэн» гэж). Ямар ч багш (ангийн багш биш ч) — зөвхөн унших.
   */
  async roadmap(actor: Actor, classroomId: string | undefined, dateStr?: string) {
    this.assertStaff(actor);
    if (!classroomId) throw new BadRequestException('Анги заавал');
    const cls = await this.prisma.classroom.findFirst({ where: { id: classroomId, archived: false }, select: { id: true } });
    if (!cls) throw new NotFoundException('Анги олдсонгүй');
    return this.sessions.roadmapData(classroomId, dateStr);
  }

  /* ───────── Самбар: жагсаалт ───────── */

  /** Тэр өдөр тэр газарт нөхсөн сурагчид. `place` = ангийн id эсвэл «406» */
  async list(actor: Actor, dateStr: string | undefined, place: string | undefined): Promise<VisitView[]> {
    const { date } = this.parse(dateStr);
    if (!place) throw new BadRequestException('Газар (анги эсвэл 406) заавал');
    const host = place === ROOM_406 ? null : place;
    await this.assertPlace(actor, host, date);
    const rows = await this.prisma.makeupVisit.findMany({
      where: { placeKey: placeKeyOf(host), date, ...LIVE },
      include: { tests: { where: LIVE, orderBy: { createdAt: 'asc' } } },
      orderBy: { createdAt: 'asc' },
    });
    return this.views(rows);
  }

  /**
   * Өөрийн ангийн самбарт: тэр өдөр өөр газарт нөхсөн сурагчид (холбоос = ИЖИЛ ОГНОО —
   * сурагч тэр өдрийн хичээлээ өөр ангид/406-д нөхсөн). Өөр өдөр нөхсөн бол энд
   * гарахгүй, сурагчийн түүхэнд л харагдана.
   */
  async homeBadges(actor: Actor, classroomId: string, dateStr: string | undefined) {
    const { date } = this.parse(dateStr);
    this.assertStaff(actor);
    await assertMarkAccess(this.prisma, classroomId, actor.userId, actor.role, { date });
    const rows = await this.prisma.makeupVisit.findMany({
      where: { homeClassroomId: classroomId, date, ...LIVE },
      select: { id: true, studentId: true, hostClassroomId: true },
      orderBy: { createdAt: 'asc' },
    });
    const names = await this.classNames(rows.map((r) => r.hostClassroomId));
    return rows.map((r) => {
      const hostName = r.hostClassroomId ? (names.get(r.hostClassroomId) ?? 'Өөр') : null;
      return {
        visitId: r.id,
        studentId: r.studentId,
        hostClassroomId: r.hostClassroomId,
        hostName: hostName ? shortClassName(hostName) : '406',
        label: placeLabel(hostName),
      };
    });
  }

  private async classNames(ids: (string | null)[]) {
    const unique = [...new Set(ids.filter((v): v is string => !!v))];
    if (!unique.length) return new Map<string, string>();
    const rows = await this.prisma.classroom.findMany({
      where: { id: { in: unique } },
      select: { id: true, name: true },
    });
    return new Map(rows.map((r) => [r.id, r.name]));
  }

  /* ───────── Нэмэх ───────── */

  async create(actor: Actor, dto: CreateMakeupVisitsDto) {
    const { date, key } = this.parse(dto.date);
    if (!isAllowedVisitDate(key, dateKey(todayUB())))
      throw new BadRequestException('Ирээгүй өдөрт нөхөлт бүртгэхгүй');
    const host = dto.hostClassroomId || null;
    await this.assertPlace(actor, host, date);
    if (host && !(await this.hostHasLesson(host, key)))
      throw new BadRequestException('Энэ анги тэр өдөр хичээлгүй');

    const placeKey = placeKeyOf(host);
    const ids = [...new Set(dto.studentIds.filter(Boolean))];
    const [students, existing, enrollments] = await Promise.all([
      this.prisma.user.findMany({
        where: { id: { in: ids }, role: Role.STUDENT, archivedAt: null },
        select: { id: true },
      }),
      this.prisma.makeupVisit.findMany({
        where: { studentId: { in: ids }, date, placeKey, ...LIVE },
        select: { studentId: true },
      }),
      this.prisma.enrollment.findMany({
        where: { studentId: { in: ids }, ...ACTIVE_ENROLLMENT },
        select: { studentId: true, classroomId: true, joinedAt: true, classroom: { select: { type: true } } },
      }),
    ]);
    const valid = new Set(students.map((s) => s.id));
    const plan = planCreate(ids, new Set(existing.map((e) => e.studentId)));
    const skipped: { studentId: string; reason: SkipReason }[] = [...plan.skipped];
    const created: VisitRow[] = [];

    for (const studentId of plan.create) {
      if (!valid.has(studentId)) {
        skipped.push({ studentId, reason: 'NOT_STUDENT' });
        continue;
      }
      const home = pickHomeClassroom(
        enrollments
          .filter((e) => e.studentId === studentId)
          .map((e) => ({ classroomId: e.classroomId, classroomType: e.classroom.type, joinedAt: e.joinedAt })),
        host,
      );
      if (!home.ok) {
        skipped.push({ studentId, reason: home.reason });
        continue;
      }
      try {
        const row = await this.prisma.makeupVisit.create({
          data: {
            studentId,
            date,
            hostClassroomId: host,
            placeKey,
            homeClassroomId: home.homeClassroomId,
            // Ангид сууж буй сурагчийг л нэмдэг тул «Ирсэн» гэж эхэлнэ (багш сольж болно)
            attStatus: host ? AttendanceStatus.PRESENT : null,
            createdById: actor.userId,
          },
          include: { tests: true },
        });
        created.push(row);
      } catch (e) {
        // Хоёр багш зэрэг нэмсэн — идэвхтэй давтагдашгүй индекс (P2002)
        if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
          skipped.push({ studentId, reason: 'DUPLICATE' });
          continue;
        }
        throw e;
      }
    }

    await this.audit.recordMany(
      created.map((row) => ({
        actorId: actor.userId,
        actorRole: actor.role,
        action: 'CREATE',
        entity: 'MakeupVisit',
        entityId: row.id,
        before: null,
        after: row as unknown as Record<string, unknown>,
      })),
    );
    return { created: await this.views(created), skipped };
  }

  /* ───────── Засах: ирц, даалгавар, тайлбар ───────── */

  async update(actor: Actor, id: string, dto: UpdateMakeupVisitDto) {
    const before = await this.findVisit(id);
    await this.assertPlace(actor, before.hostClassroomId, before.date);
    const clean = (v: string | null | undefined) =>
      v === undefined ? undefined : v === null || v.trim() === '' ? null : v.trim();

    const data: Prisma.MakeupVisitUpdateInput = { updatedById: actor.userId };
    if (dto.attStatus !== undefined) {
      data.attStatus = dto.attStatus;
      if (dto.attStatus === null) {
        // Ирцийг арилгавал хугацаа, тэмдэглэл хамт (самбарын ирцтэй ижил)
        data.lateRange = null;
        data.attNote = null;
      } else if (dto.attStatus !== AttendanceStatus.LATE) data.lateRange = null;
      else if (dto.lateRange !== undefined) data.lateRange = dto.lateRange;
    } else if (dto.lateRange !== undefined && before.attStatus === AttendanceStatus.LATE) {
      data.lateRange = dto.lateRange;
    }
    // Ирцгүй үед ирцийн тэмдэглэл бичихгүй (самбарын дүрэм)
    const attNote = clean(dto.attNote);
    const nextAtt = dto.attStatus !== undefined ? dto.attStatus : before.attStatus;
    if (attNote !== undefined && nextAtt !== null) data.attNote = attNote;
    if (dto.hwStatus !== undefined) data.hwStatus = dto.hwStatus;
    const hwNote = clean(dto.hwNote);
    if (hwNote !== undefined) data.hwNote = hwNote;
    const comment = clean(dto.comment);
    if (comment !== undefined) data.comment = comment;

    const after = await this.prisma.makeupVisit.update({
      where: { id },
      data,
      include: { tests: { where: LIVE, orderBy: { createdAt: 'asc' } } },
    });
    await this.audit.record({
      actorId: actor.userId,
      actorRole: actor.role,
      action: 'UPDATE',
      entity: 'MakeupVisit',
      entityId: id,
      before: before as unknown as Record<string, unknown>,
      after: after as unknown as Record<string, unknown>,
    });
    return (await this.views([after]))[0];
  }

  /* ───────── 406: тест/сэдэв (нэг эсвэл олон сурагчид ижил) ───────── */

  async setTests(actor: Actor, dto: SetMakeupTestsDto) {
    this.assertStaff(actor);
    const ids = [...new Set(dto.visitIds)];
    const visits = await this.prisma.makeupVisit.findMany({
      where: { id: { in: ids }, ...LIVE },
      include: { tests: { where: LIVE } },
    });
    if (visits.length !== ids.length) throw new NotFoundException('Нөхөлт олдсонгүй');
    if (visits.some((v) => v.hostClassroomId))
      throw new BadRequestException('Өөр ангид суусан бол тэр хичээлийн тест өөрөө тооцогдоно');

    // Тестийн нэрийг серверээс (клиентийн бичсэн нэрэнд итгэхгүй); байхгүй тест — алдаа
    const testIds = [...new Set(dto.tests.map((t) => t.testId).filter((v): v is string => !!v))];
    const tests = testIds.length
      ? await this.prisma.test.findMany({
          where: { id: { in: testIds }, deletedAt: null },
          select: { id: true, title: true, variantLabel: true },
        })
      : [];
    if (tests.length !== testIds.length) throw new BadRequestException('Тест олдсонгүй');
    const titleById = new Map(tests.map((t) => [t.id, shortTestName(t.title)]));
    const wanted = dto.tests.map((t) =>
      t.testId ? { testId: t.testId, title: titleById.get(t.testId)! } : { testId: null, title: t.title ?? '' },
    );

    const now = new Date();
    const changes = await this.prisma.$transaction(async (tx) => {
      const out: { visitId: string; added: number; removed: string[] }[] = [];
      for (const v of visits) {
        const diff = diffTests(
          v.tests.map((t) => ({ id: t.id, testId: t.testId, title: t.title })),
          wanted,
        );
        if (diff.remove.length)
          await tx.makeupVisitTest.updateMany({
            where: { id: { in: diff.remove }, visitId: v.id, deletedAt: null },
            data: { deletedAt: now, deletedById: actor.userId },
          });
        if (diff.add.length)
          await tx.makeupVisitTest.createMany({
            data: diff.add.map((t) => ({ visitId: v.id, testId: t.testId, title: t.title, createdById: actor.userId })),
          });
        if (diff.add.length || diff.remove.length) {
          await tx.makeupVisit.update({ where: { id: v.id }, data: { updatedById: actor.userId } });
          out.push({ visitId: v.id, added: diff.add.length, removed: diff.remove });
        }
      }
      return out;
    });
    await this.audit.recordMany(
      changes.map((c) => ({
        actorId: actor.userId,
        actorRole: actor.role,
        action: 'UPDATE',
        entity: 'MakeupVisitTest',
        entityId: c.visitId,
        before: { removedTestRowIds: c.removed },
        after: { tests: wanted, added: c.added },
      })),
    );
    const rows = await this.prisma.makeupVisit.findMany({
      where: { id: { in: ids } },
      include: { tests: { where: LIVE, orderBy: { createdAt: 'asc' } } },
    });
    return this.views(rows);
  }

  /* ───────── Хасах (зөөлөн) ───────── */

  async remove(actor: Actor, id: string) {
    const before = await this.findVisit(id);
    await this.assertPlace(actor, before.hostClassroomId, before.date);
    const after = await this.prisma.makeupVisit.update({
      where: { id },
      data: { deletedAt: new Date(), deletedById: actor.userId },
    });
    await this.audit.record({
      actorId: actor.userId,
      actorRole: actor.role,
      action: 'DELETE',
      entity: 'MakeupVisit',
      entityId: id,
      before: before as unknown as Record<string, unknown>,
      after: after as unknown as Record<string, unknown>,
    });
    return { ok: true, id };
  }

  /* ───────── Сурагчийн түүх / хийсэн сэдэв ───────── */

  /** GET /students/:id/makeup-visits — ажилтан бүгдийг, сурагч өөрийнхийг */
  async studentHistory(actor: Actor, studentId: string, from?: string, to?: string) {
    if (actor.role === Role.STUDENT) {
      if (actor.userId !== studentId) throw new ForbiddenException('Зөвхөн өөрийн бүртгэл');
    } else this.assertStaff(actor);
    return this.coveredByStudent(studentId, { from, to });
  }

  /**
   * Сурагчийн нөхөлтөөр хийсэн тест/сэдэв (огноо, газар, багш, тайлбартай) — шинэ нь
   * эхэнд. Сурагчийн хөтөлбөр (өөр агент) ЭНИЙГ шууд дуудна: эрх шалгахгүй.
   */
  async coveredByStudent(studentId: string, range: { from?: string; to?: string } = {}): Promise<MakeupHistoryItem[]> {
    const dateWhere: Prisma.DateTimeFilter = {};
    if (range.from) dateWhere.gte = this.parse(range.from).date;
    if (range.to) dateWhere.lte = this.parse(range.to).date;
    const rows = await this.prisma.makeupVisit.findMany({
      where: { studentId, ...LIVE, ...(range.from || range.to ? { date: dateWhere } : {}) },
      include: { tests: { where: LIVE, orderBy: { createdAt: 'asc' } } },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
    });
    const views = await this.views(rows);
    return views.map(({ student: _s, updatedBy: _u, ...item }) => item);
  }

  /** Мөрүүдийг харагдац болгоно: газар, анги, багш, тест (зочилсон ангийнх тооцоолж), дүн */
  private async views(rows: VisitRow[]): Promise<VisitView[]> {
    if (!rows.length) return [];
    const hostPairs = rows.filter((r) => r.hostClassroomId);
    const people = [...new Set(rows.flatMap((r) => [r.createdById, r.updatedById, r.studentId]).filter((v): v is string => !!v))];
    const [users, classNames, sessions, topics] = await Promise.all([
      this.prisma.user.findMany({
        where: { id: { in: people } },
        select: { id: true, firstName: true, lastName: true, role: true, studentCode: true },
      }),
      this.classNames(rows.flatMap((r) => [r.hostClassroomId, r.homeClassroomId])),
      hostPairs.length
        ? this.prisma.classTestSession.findMany({
            where: { OR: hostPairs.map((r) => ({ classroomId: r.hostClassroomId!, date: r.date })) },
            select: { classroomId: true, date: true, testId: true, manualTitle: true },
            orderBy: { createdAt: 'asc' },
          })
        : Promise.resolve([] as { classroomId: string; date: Date; testId: string | null; manualTitle: string | null }[]),
      // Төлөвлөгөө: тэр ангийн хуваарийн тэр өдрийн LessonTopic. Зөөгдсөн хичээлийн
      // төлөвлөгөө анхны огноонд хадгалагддаг тул энд гарахгүй — батлагдмагц
      // ClassTestSession-оор зөв тооцогдоно.
      hostPairs.length
        ? this.prisma.lessonTopic.findMany({
            where: {
              OR: hostPairs.map((r) => ({
                date: r.date,
                schedule: { classroomId: r.hostClassroomId!, deletedAt: null },
              })),
            },
            select: { date: true, testIds: true, customTopics: true, schedule: { select: { classroomId: true } } },
          })
        : Promise.resolve(
            [] as { date: Date; testIds: string[]; customTopics: string[]; schedule: { classroomId: string } }[],
          ),
    ]);
    const userById = new Map(users.map((u) => [u.id, u]));
    const pairKey = (cid: string, d: Date) => `${cid}|${dateKey(d)}`;

    // Тестийн нэр, хувилбар
    const allTestIds = new Set<string>();
    for (const r of rows) for (const t of r.tests) if (t.testId) allTestIds.add(t.testId);
    for (const s of sessions) if (s.testId) allTestIds.add(s.testId);
    for (const t of topics) for (const id of t.testIds) allTestIds.add(id);
    const testRows = allTestIds.size
      ? await this.prisma.test.findMany({
          where: { id: { in: [...allTestIds] } },
          select: { id: true, title: true, variantLabel: true },
        })
      : [];
    const testById = new Map(testRows.map((t) => [t.id, t]));
    const titleOf = (id: string) => {
      const t = testById.get(id);
      return t ? shortTestName(t.title) : undefined;
    };

    const coveredByPair = new Map<string, CoveredItem[]>();
    for (const r of hostPairs) {
      const k = pairKey(r.hostClassroomId!, r.date);
      if (coveredByPair.has(k)) continue;
      coveredByPair.set(
        k,
        hostLessonCovered({
          sessions: sessions.filter((s) => pairKey(s.classroomId, s.date) === k),
          planned: topics.filter((t) => pairKey(t.schedule.classroomId, t.date) === k),
          titleOf,
        }),
      );
    }

    // Сурагч бүрийн дүн (онлайнаар өгсөн/гараар орсон) — хариуг харах холбоос
    const resultPairs = new Map<string, Set<string>>();
    const items = rows.map((r) => {
      const covered: (CoveredItem & { id: string | null })[] = r.hostClassroomId
        ? (coveredByPair.get(pairKey(r.hostClassroomId, r.date)) ?? []).map((c) => ({ ...c, id: null }))
        : r.tests.map((t) => ({ id: t.id, testId: t.testId, title: t.title, source: 'RECORDED' as const }));
      for (const c of covered)
        if (c.testId) resultPairs.set(r.studentId, (resultPairs.get(r.studentId) ?? new Set()).add(c.testId));
      return { r, covered };
    });
    const results = resultPairs.size
      ? await this.prisma.testResult.findMany({
          where: {
            OR: [...resultPairs.entries()].map(([studentId, ids]) => ({ studentId, testId: { in: [...ids] } })),
          },
          select: { studentId: true, testId: true, totalScore: true, maxScore: true },
        })
      : [];
    const resultOf = new Map(results.map((x) => [`${x.studentId}|${x.testId}`, { score: x.totalScore, max: x.maxScore }]));

    const person = (id: string | null) => {
      if (!id) return null;
      const u = userById.get(id);
      return { id, name: u ? shortName(u) : 'Тодорхойгүй' };
    };
    return items.map(({ r, covered }) => {
      const hostName = r.hostClassroomId ? (classNames.get(r.hostClassroomId) ?? 'Өөр анги') : null;
      const stu = userById.get(r.studentId);
      return {
        id: r.id,
        date: dateKey(r.date),
        place: r.hostClassroomId
          ? { kind: 'CLASS' as const, classroomId: r.hostClassroomId, name: shortClassName(hostName!) }
          : { kind: 'ROOM_406' as const, classroomId: null, name: '406' as const },
        label: placeLabel(hostName),
        homeClassroom: r.homeClassroomId
          ? { id: r.homeClassroomId, name: classNames.get(r.homeClassroomId) ?? 'Анги' }
          : null,
        tests: covered.map((c) => ({
          ...c,
          variant: c.testId ? (testById.get(c.testId)?.variantLabel ?? null) : null,
          result: c.testId ? (resultOf.get(`${r.studentId}|${c.testId}`) ?? null) : null,
        })),
        comment: r.comment,
        attendance: { status: r.attStatus, lateRange: r.lateRange, note: r.attNote },
        homework: { status: r.hwStatus, note: r.hwNote },
        teacher: person(r.createdById)!,
        createdAt: r.createdAt.toISOString(),
        updatedAt: r.updatedAt.toISOString(),
        student: {
          id: r.studentId,
          firstName: stu?.firstName ?? '',
          lastName: stu?.lastName ?? '',
          code: stu?.studentCode ?? null,
        },
        updatedBy: r.updatedById ? person(r.updatedById) : null,
      };
    });
  }
}
