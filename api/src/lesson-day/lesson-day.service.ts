import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { Prisma } from '../generated/prisma/client';
import { Role } from '../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import { addDateDays, dateKey, parseDateOnly, todayUB } from '../common/date';
import { beginRevision, commitRevision } from '../revisions/revision-store';
import { shortName } from '../revisions/revision-snapshot';
import {
  decisionOf,
  decodeDecisionNote,
  encodeDecisionNote,
  isMakeupReason,
  isOpenStatus,
  MAKEUP_REASONS,
  type MakeupAction,
  type MakeupReason,
  type MakeupStatus,
  makeupStatus,
  normalizeVariant,
  photosAccepted,
  type RequiredTest,
  requiredTests,
  testDone,
  type VariantTest,
} from './makeup.logic';
import { staffCovers, staffDays, type StaffActor } from './staff-access';
import { pdfPageCount } from './pdf-pages';
import { inUploadWindow, topicOf } from '../student-hub/student-hub.logic';

/** Сурагчийн «Нөхөх хичээл» жагсаалтын цонх (ангийн самбарын MAKEUP_DAYS-тэй ижил) */
export const MAKEUP_WINDOW_DAYS = 60;
/** Ажилтны ?from&to хүрээний дээд хэмжээ */
const MAX_RANGE_DAYS = 186;
const MAX_KEYS = 12;
/** D13: нэг PDF ≤10 хуудас (хуучин хэлбэрийн ганц зураг ч зөвшөөрөгдөнө) */
export const MAX_PAGES = 10;
const IMAGE_MIME = /^image\/(png|jpe?g|webp|gif|heic|heif)$/;
const PDF_MIME = 'application/pdf';
/** key → хуудасны тоо (StoredFile-ийн агуулга key-тэй хамт өөрчлөгддөггүй) */
const pageCache = new Map<string, number>();
const DAY_MS = 86_400_000;

export type Actor = StaffActor;

export interface MakeupTestView {
  testId: string;
  title: string;
  variant: string | null;
  done: boolean;
  /** Ангид хийсэн тул тооцогдсон (хоцорсон сурагч) */
  inClass: boolean;
  /** Онлайнаар (шалгалтын горимоор) өгөх боломжтой — эс бөгөөс багш дүнг оруулна */
  online: boolean;
}

interface MakeupItem {
  classroomId: string;
  classroomName: string;
  studentId: string;
  studentName: string;
  date: string;
  reason: MakeupReason;
  status: MakeupStatus;
  photos: number;
  imageKeys: string[];
  submittedAt: Date | null;
  photosAccepted: boolean;
  tests: MakeupTestView[];
  decision: 'CONFIRMED' | 'WAIVED' | 'REOPENED' | null;
  decidedAt: Date | null;
  decidedById: string | null;
  note: string | null;
}

interface TestInfo extends VariantTest {
  title: string;
  online: boolean;
}

const TEST_SELECT = {
  id: true,
  title: true,
  groupKey: true,
  variantLabel: true,
  gradingMode: true,
  _count: { select: { problems: true } },
} as const;

function dayStart(key: string): Date {
  return new Date(`${key}T00:00:00+08:00`);
}

/**
 * Хичээлийн өдрийн сурагч-талын үйлдэл: нөхөх хичээл (LessonMakeup) ба онолын
 * зураг (LessonPhoto). Үүрэг ХАДГАЛАГДАХГҮЙ — ирц × ClassTestSession × TestResult-ээс
 * тооцоолно; LessonMakeup-д зөвхөн зураг ба ажилтны шийдвэр.
 * Сурагчид: бусдын нөхөх мэдээлэл, ажилтны тэмдэглэл, dismissMode ХЭЗЭЭ Ч буцахгүй.
 */
/** Багш шийдвэрлэснээс хойш нөхөх тэмдэглэлийн зургийг хадгалах хоног (эзэн 2026-10-22) */
export const MAKEUP_KEEP_DAYS_AFTER_DECISION = 14;

@Injectable()
export class LessonDayService {
  constructor(private readonly prisma: PrismaService) {}

  // ───────────────────────── Туслахууд ─────────────────────────

  private day(text: string | undefined): Date {
    try {
      if (!text) throw new Error('missing');
      return parseDateOnly(text);
    } catch {
      throw new BadRequestException('Огноог ЖЖЖЖ-СС-ӨӨ хэлбэрээр өгнө үү.');
    }
  }

  private range(date?: string, from?: string, to?: string): [Date, Date] {
    if (date) {
      const d = this.day(date);
      return [d, d];
    }
    if (!from || !to)
      throw new BadRequestException('Огноо (date) эсвэл хүрээ (from, to) өгнө үү.');
    const a = this.day(from),
      b = this.day(to);
    if (b < a) throw new BadRequestException('Хүрээний эхлэл төгсгөлөөсөө хойно байна.');
    if ((b.getTime() - a.getTime()) / DAY_MS > MAX_RANGE_DAYS)
      throw new BadRequestException('Хүрээ хэт урт байна (6 сараас ихгүй).');
    return [a, b];
  }

  private async staffScope(actor: Actor, classroomId: string, from: Date, to: Date) {
    const days = await staffDays(this.prisma, actor, classroomId, from, to);
    if (!days) throw new NotFoundException('Анги олдсонгүй');
    if (days !== 'ALL' && !days.size)
      throw new ForbiddenException('Энэ ангийн нөхөх хичээлийг харах эрхгүй.');
    return days;
  }

  /** Тухайн өдөр ангид элссэн байсан эсвэл одоо элссэн сурагч */
  private async classMember(classroomId: string, studentId: string, date: Date) {
    const end = new Date(dayStart(dateKey(date)).getTime() + DAY_MS);
    const row = await this.prisma.enrollment.findFirst({
      where: {
        classroomId,
        studentId,
        OR: [
          { leftAt: null, classroom: { archived: false } },
          { joinedAt: { lt: end }, leftAt: { gte: end } },
        ],
      },
      select: { id: true },
    });
    return !!row;
  }

  /** Зургийн түлхүүр бүр илгээгчийнх (StoredFile.ownerId), зураг төрөлтэй байна. */
  private async ownImageKeys(
    keys: string[],
    userId: string,
    retained: string[],
    db: Prisma.TransactionClient | PrismaService = this.prisma,
  ): Promise<string[]> {
    const unique = [...new Set(keys)];
    if (unique.length > MAX_KEYS)
      throw new BadRequestException(`Нэг удаад ${MAX_KEYS} хүртэл зураг хавсаргана.`);
    const fresh = unique.filter((k) => !retained.includes(k));
    if (fresh.length) {
      const files = await db.storedFile.findMany({
        where: { key: { in: fresh }, ownerId: userId },
        select: { key: true, mime: true },
      });
      if (
        files.length !== fresh.length ||
        files.some((f) => !IMAGE_MIME.test(f.mime) && f.mime !== PDF_MIME)
      )
        throw new ForbiddenException('Зөвхөн өөрийн байршуулсан зураг / PDF-ийг хавсаргана.');
    }
    const pages = await this.pageCounts(unique, db);
    const total = unique.reduce((n, k) => n + (pages.get(k) ?? 1), 0);
    if (total > MAX_PAGES)
      throw new BadRequestException(`Нийт ${MAX_PAGES} хүртэл хуудас (зураг) илгээнэ.`);
    return unique;
  }

  /** Хавсралт бүрийн хуудасны тоо: PDF — задалж тоолно, зураг — 1. */
  private async pageCounts(
    keys: string[],
    db: Prisma.TransactionClient | PrismaService = this.prisma,
  ): Promise<Map<string, number>> {
    const out = new Map<string, number>();
    const missing = keys.filter((k) => {
      const hit = pageCache.get(k);
      if (hit !== undefined) out.set(k, hit);
      return hit === undefined;
    });
    if (missing.length) {
      const metas = await db.storedFile.findMany({
        where: { key: { in: missing } },
        select: { key: true, mime: true, pages: true },
      });
      // Шинэ файлд хуудасны тоо байршуулахад тоологдсон (S3-ийн байтыг дахин татахгүй)
      for (const m of metas) if (m.mime === PDF_MIME && m.pages) out.set(m.key, m.pages);
      const pdfs = metas.filter((m) => m.mime === PDF_MIME && !m.pages).map((m) => m.key);
      for (const m of metas) if (m.mime !== PDF_MIME) out.set(m.key, 1);
      for (const key of pdfs) {
        const row = await db.storedFile.findUnique({ where: { key }, select: { bytes: true } });
        out.set(key, (row?.bytes && pdfPageCount(row.bytes)) || 1);
      }
      for (const k of missing) {
        if (!out.has(k)) out.set(k, 1);
        if (pageCache.size > 5000) pageCache.clear();
        pageCache.set(k, out.get(k) as number);
      }
    }
    return out;
  }

  private async testInfo(ids: string[]): Promise<Map<string, TestInfo>> {
    if (!ids.length) return new Map();
    const rows = await this.prisma.test.findMany({
      where: { id: { in: ids } },
      select: TEST_SELECT,
    });
    return new Map(rows.map((t) => [t.id, toInfo(t)]));
  }

  // ───────────────────────── Нөхөх: тооцоолол ─────────────────────────

  private async obligations(filter: {
    classroomId?: string;
    studentId?: string;
    from: Date;
    to: Date;
  }): Promise<MakeupItem[]> {
    const attendance = await this.prisma.attendance.findMany({
      where: {
        ...(filter.classroomId ? { classroomId: filter.classroomId } : {}),
        ...(filter.studentId ? { studentId: filter.studentId } : {}),
        date: { gte: filter.from, lte: filter.to },
        status: { in: MAKEUP_REASONS },
        classroom: { archived: false },
      },
      select: {
        classroomId: true,
        studentId: true,
        date: true,
        status: true,
        student: { select: { firstName: true, lastName: true } },
        classroom: { select: { name: true } },
      },
    });
    if (!attendance.length) return [];
    const classIds = [...new Set(attendance.map((a) => a.classroomId))];
    const studentIds = [...new Set(attendance.map((a) => a.studentId))];
    // Одоо тэр ангид байгаа сурагч л нөхнө (анги сольсон бол хуучин ангийнх нь үүрэг хаагдана)
    const current = await this.prisma.enrollment.findMany({
      where: { leftAt: null, classroomId: { in: classIds }, studentId: { in: studentIds } },
      select: { classroomId: true, studentId: true },
    });
    const enrolled = new Set(current.map((e) => `${e.classroomId}|${e.studentId}`));
    const rows = attendance.filter((a) => enrolled.has(`${a.classroomId}|${a.studentId}`));
    if (!rows.length) return [];

    const sessions = await this.prisma.classTestSession.findMany({
      where: {
        classroomId: { in: classIds },
        date: { gte: filter.from, lte: filter.to },
        testId: { not: null },
      },
      select: { classroomId: true, date: true, testId: true },
    });
    const classTests = await this.prisma.test.findMany({
      where: {
        id: { in: [...new Set(sessions.map((s) => s.testId as string))] },
        deletedAt: null,
      },
      select: TEST_SELECT,
    });
    const groupKeys = [
      ...new Set(classTests.flatMap((t) => (t.groupKey ? [t.groupKey] : []))),
    ];
    const siblings = groupKeys.length
      ? await this.prisma.test.findMany({
          where: { groupKey: { in: groupKeys }, deletedAt: null, isDraft: false },
          select: TEST_SELECT,
        })
      : [];
    const info = new Map<string, TestInfo>();
    for (const t of [...classTests, ...siblings]) info.set(t.id, toInfo(t));

    const byDay = new Map<string, TestInfo[]>();
    for (const s of sessions) {
      const t = s.testId ? info.get(s.testId) : undefined;
      if (!t) continue;
      const k = `${s.classroomId}|${dateKey(s.date)}`;
      byDay.set(k, [...(byDay.get(k) ?? []), t]);
    }
    const siblingList = [...info.values()];
    const required = new Map<MakeupItem, RequiredTest[]>();

    const makeups = await this.prisma.lessonMakeup.findMany({
      where: {
        classroomId: { in: classIds },
        studentId: { in: studentIds },
        date: { gte: filter.from, lte: filter.to },
      },
    });
    const pagesBy = await this.pageCounts([...new Set(makeups.flatMap((m) => m.imageKeys))]);
    const makeupBy = new Map(
      makeups.map((m) => [`${m.classroomId}|${m.studentId}|${dateKey(m.date)}`, m]),
    );

    const items: MakeupItem[] = [];
    for (const a of rows) {
      if (!isMakeupReason(a.status)) continue;
      const key = dateKey(a.date);
      const reqs = requiredTests(a.status, byDay.get(`${a.classroomId}|${key}`) ?? [], siblingList);
      const m = makeupBy.get(`${a.classroomId}|${a.studentId}|${key}`);
      const { decision, text } = decodeDecisionNote(m?.note);
      const item: MakeupItem = {
        classroomId: a.classroomId,
        classroomName: a.classroom.name,
        studentId: a.studentId,
        studentName: shortName(a.student),
        date: key,
        reason: a.status,
        status: 'PENDING',
        photos: (m?.imageKeys ?? []).reduce((n, k) => n + (pagesBy.get(k) ?? 1), 0),
        imageKeys: m?.imageKeys ?? [],
        submittedAt: m?.submittedAt ?? null,
        photosAccepted: false,
        tests: [],
        decision,
        decidedAt: m?.confirmedAt ?? null,
        decidedById: m?.confirmedById ?? null,
        note: text,
      };
      required.set(item, reqs);
      items.push(item);
    }

    const allTestIds = [...new Set([...required.values()].flat().map((r) => r.testId))];
    const results = allTestIds.length
      ? await this.prisma.testResult.findMany({
          where: { studentId: { in: studentIds }, testId: { in: allTestIds } },
          select: { studentId: true, testId: true },
        })
      : [];
    const doneBy = new Map<string, Set<string>>();
    for (const r of results) {
      const set = doneBy.get(r.studentId) ?? new Set<string>();
      set.add(r.testId);
      doneBy.set(r.studentId, set);
    }
    for (const item of items) {
      const reqs = required.get(item) ?? [];
      const done = doneBy.get(item.studentId) ?? new Set<string>();
      item.tests = reqs.map((r) => {
        const t = info.get(r.testId);
        return {
          testId: r.testId,
          title: t?.title ?? 'Тест',
          variant: r.variant,
          done: testDone(r, done),
          inClass: r.inClass,
          online: t?.online ?? false,
        };
      });
      const input = {
        required: reqs,
        doneTestIds: done,
        imageKeys: item.imageKeys,
        submittedAt: item.submittedAt,
        decision: item.decision,
        decidedAt: item.decidedAt,
      };
      item.status = makeupStatus(input);
      item.photosAccepted = photosAccepted(input);
    }
    return items.sort(
      (x, y) =>
        y.date.localeCompare(x.date) ||
        x.classroomName.localeCompare(y.classroomName) ||
        x.studentName.localeCompare(y.studentName),
    );
  }

  private async findOne(classroomId: string, studentId: string, date: Date) {
    const [item] = await this.obligations({ classroomId, studentId, from: date, to: date });
    if (!item) throw new NotFoundException('Энэ өдөр нөхөх хичээл байхгүй.');
    return item;
  }

  // ───────────────────────── Нөхөх: ажилтан ─────────────────────────

  async classroomMakeups(actor: Actor, classroomId: string, q: { date?: string; from?: string; to?: string }) {
    const [from, to] = this.range(q.date, q.from, q.to);
    const scope = await this.staffScope(actor, classroomId, from, to);
    const items = await this.obligations({ classroomId, from, to });
    const visible = items.filter((i) => staffCovers(scope, i.date));
    const deciders = [...new Set(visible.flatMap((i) => (i.decidedById ? [i.decidedById] : [])))];
    const names = deciders.length
      ? new Map(
          (
            await this.prisma.user.findMany({
              where: { id: { in: deciders } },
              select: { id: true, firstName: true, lastName: true, role: true },
            })
          ).map((u) => [u.id, shortName(u)]),
        )
      : new Map<string, string>();
    return visible.map((i) => staffView(i, names));
  }

  async decide(
    actor: Actor,
    classroomId: string,
    studentId: string,
    dateText: string,
    action: MakeupAction,
    note?: string | null,
  ) {
    const date = this.day(dateText);
    const scope = await this.staffScope(actor, classroomId, date, date);
    if (!staffCovers(scope, dateKey(date)))
      throw new ForbiddenException('Энэ өдрийн нөхөх хичээлийг батлах эрхгүй.');
    await this.findOne(classroomId, studentId, date);
    const data = {
      confirmedById: actor.userId,
      confirmedAt: new Date(),
      note: encodeDecisionNote(decisionOf(action), note),
    };
    const saved = await this.prisma.lessonMakeup.upsert({
      where: { studentId_classroomId_date: { studentId, classroomId, date } },
      create: { classroomId, studentId, date, ...data },
      update: data,
      select: { imageKeys: true },
    });
    // Эзэн 2026-10-22: багш баталсан (эсвэл чөлөөлсөн) нөхөх тэмдэглэлийн зураг 14 хоногийн
    // дараа устна; дахин нээвэл хугацааг цуцална (сурагч дахин илгээх боломжтой байна).
    if (saved.imageKeys.length)
      await this.prisma.storedFile.updateMany({
        where: { key: { in: saved.imageKeys }, ownerId: studentId },
        data: {
          expiresAt:
            action === 'REOPEN'
              ? null
              : new Date(data.confirmedAt.getTime() + MAKEUP_KEEP_DAYS_AFTER_DECISION * 86400000),
        },
      });
    const item = await this.findOne(classroomId, studentId, date);
    const name = shortName(
      await this.prisma.user.findUnique({
        where: { id: actor.userId },
        select: { firstName: true, lastName: true, role: true },
      }),
    );
    return staffView(item, new Map([[actor.userId, name]]));
  }

  // ───────────────────────── Нөхөх: сурагч ─────────────────────────

  async myMakeups(studentId: string) {
    const to = todayUB();
    const from = addDateDays(to, -MAKEUP_WINDOW_DAYS);
    const items = await this.obligations({ studentId, from, to });
    const testIds = [...new Set(items.flatMap((i) => i.tests.map((t) => t.testId)))];
    const access = testIds.length
      ? await this.prisma.testAccess.findMany({
          where: {
            testId: { in: testIds },
            classroom: {
              archived: false,
              enrollments: { some: { studentId, leftAt: null } },
            },
          },
          select: { testId: true },
        })
      : [];
    const open = new Set(access.map((a) => a.testId));
    return items.map((i) => studentView(i, open));
  }

  private async myOpenItem(studentId: string, classroomId: string, dateText: string) {
    const date = this.day(dateText);
    const item = await this.findOne(classroomId, studentId, date);
    return { date, item };
  }

  async submitMakeupPhotos(studentId: string, classroomId: string, dateText: string, keys: string[]) {
    const { date, item } = await this.myOpenItem(studentId, classroomId, dateText);
    if (item.decision === 'CONFIRMED' || item.decision === 'WAIVED')
      throw new ConflictException('Багш энэ хичээлийг аль хэдийн шийдвэрлэсэн.');
    await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${`makeup:${studentId}:${classroomId}:${dateKey(date)}`}))::text`;
      const existing = await tx.lessonMakeup.findUnique({
        where: { studentId_classroomId_date: { studentId, classroomId, date } },
        select: { imageKeys: true },
      });
      const imageKeys = await this.ownImageKeys(keys, studentId, existing?.imageKeys ?? [], tx);
      const data = { imageKeys, submittedAt: imageKeys.length ? new Date() : null };
      await tx.lessonMakeup.upsert({
        where: { studentId_classroomId_date: { studentId, classroomId, date } },
        create: { classroomId, studentId, date, ...data },
        update: data,
      });
      // Солигдсон хуучин тэмдэглэл (дахин нээгээд шинээр илгээсэн) хаанаас ч ашиглагдахгүй —
      // байнга хадгалахгүй, ижил 14 хоногийн дараа устгана.
      const replaced = (existing?.imageKeys ?? []).filter((k) => !imageKeys.includes(k));
      if (replaced.length)
        await tx.storedFile.updateMany({
          where: { key: { in: replaced }, ownerId: studentId, expiresAt: null },
          data: { expiresAt: new Date(Date.now() + MAKEUP_KEEP_DAYS_AFTER_DECISION * 86400000) },
        });
    });
    const items = await this.myMakeups(studentId);
    const updated = items.find((i) => i.classroomId === classroomId && i.date === dateKey(date));
    if (!updated) throw new NotFoundException('Энэ өдөр нөхөх хичээл байхгүй.');
    return updated;
  }

  /**
   * Нөхөх тестийг шалгалтын горимоор нээх: тест ангид оноогдоогүй бол (TestAccess)
   * ангид онооно — зөвхөн сурагчийн жинхэнэ, хаагдаагүй үүргийн тест. Тестийн
   * түүхэнд шалтгаантай бичигдэнэ.
   */
  async openMakeupTest(actor: Actor, classroomId: string, dateText: string, testId: string) {
    const { item } = await this.myOpenItem(actor.userId, classroomId, dateText);
    if (!isOpenStatus(item.status))
      throw new ConflictException('Энэ нөхөх хичээл хаагдсан.');
    const test = item.tests.find((t) => t.testId === testId);
    if (!test || test.inClass) throw new NotFoundException('Энэ тест нөхөх хичээлд хамаарахгүй.');
    if (!test.online)
      throw new BadRequestException('Энэ тестийн дүнг багш оруулна — онлайнаар өгөхгүй.');
    if (!test.done) {
      await this.prisma.$transaction(async (tx) => {
        const exists = await tx.testAccess.findUnique({
          where: { testId_classroomId: { testId, classroomId } },
          select: { testId: true },
        });
        if (exists) return;
        const rev = await beginRevision(tx, 'TEST', testId);
        await tx.testAccess.upsert({
          where: { testId_classroomId: { testId, classroomId } },
          create: { testId, classroomId },
          update: {},
        });
        await commitRevision(tx, rev, {
          actor: { id: actor.userId, role: actor.role },
          action: 'UPDATE',
          reason: `Нөхөх хичээл ${item.date}: сурагч шалгалтын горимоор нээв`,
        });
      });
    }
    return { testId, href: `/app/tests/${testId}` };
  }

  // ───────────────────────── Онолын зураг ─────────────────────────

  private async dayContext(classroomId: string, date: Date) {
    const [classroom, topics, sessions, photos, records] = await Promise.all([
      this.prisma.classroom.findUnique({
        where: { id: classroomId },
        select: { id: true, name: true },
      }),
      // dismissMode-ийг ХЭЗЭЭ Ч сонгохгүй (зөвхөн багшид)
      this.prisma.lessonTopic.findMany({
        where: { date, schedule: { classroomId } },
        select: { testIds: true, photoStudentId: true, title: true, chapterId: true },
      }),
      this.prisma.classTestSession.findMany({
        where: { classroomId, date, testId: { not: null } },
        select: { testId: true },
      }),
      this.prisma.lessonPhoto.findMany({
        where: { classroomId, date },
        orderBy: { createdAt: 'asc' },
      }),
      // description-ийг ХЭЗЭЭ Ч сонгохгүй — зөвхөн сэдэв
      this.prisma.lessonRecord.findMany({
        where: { classroomId, date, cancelledAt: null },
        select: { topic: true },
        orderBy: { startMinute: 'asc' },
      }),
    ]);
    if (!classroom) throw new NotFoundException('Анги олдсонгүй');
    const testIds = [
      ...new Set([
        ...sessions.map((s) => s.testId as string),
        ...topics.flatMap((t) => t.testIds),
        ...photos.flatMap((p) => p.testIds),
      ]),
    ];
    const assignedId = topics.find((t) => t.photoStudentId)?.photoStudentId ?? null;
    // Сэдэв: LessonRecord.topic → LessonTopic.title → Chapter.title (хоосон гарчигтай үед л)
    let topic = topicOf(...(records ?? []).map((r) => r.topic), ...topics.map((t) => t.title));
    if (!topic) {
      const chapterIds = topics.flatMap((t) => (t.chapterId ? [t.chapterId] : []));
      if (chapterIds.length) {
        const chapters = await this.prisma.chapter.findMany({
          where: { id: { in: chapterIds } },
          select: { title: true },
        });
        topic = topicOf(...chapters.map((c) => c.title));
      }
    }
    return { classroom, testIds, assignedId, photos, topic };
  }

  private async names(ids: string[]) {
    const unique = [...new Set(ids.filter(Boolean))];
    if (!unique.length) return new Map<string, string>();
    const users = await this.prisma.user.findMany({
      where: { id: { in: unique } },
      select: { id: true, firstName: true, lastName: true, role: true },
    });
    return new Map(users.map((u) => [u.id, shortName(u)]));
  }

  private async photoAccess(actor: Actor, classroomId: string, date: Date) {
    if (actor.role === Role.STUDENT) {
      if (!(await this.classMember(classroomId, actor.userId, date)))
        throw new ForbiddenException('Энэ ангийн онолын зургийг харах эрхгүй.');
      return 'STUDENT' as const;
    }
    const scope = await this.staffScope(actor, classroomId, date, date);
    if (!staffCovers(scope, dateKey(date)))
      throw new ForbiddenException('Энэ өдрийн онолын зургийг харах эрхгүй.');
    return 'STAFF' as const;
  }

  async dayPhotos(actor: Actor, classroomId: string, dateText: string) {
    const date = this.day(dateText);
    const kind = await this.photoAccess(actor, classroomId, date);
    const ctx = await this.dayContext(classroomId, date);
    const [tests, pages, names] = await Promise.all([
      this.testInfo(ctx.testIds),
      this.pageCounts(ctx.photos.flatMap((p) => p.imageKeys)),
      this.names([...(ctx.assignedId ? [ctx.assignedId] : []), ...ctx.photos.map((p) => p.studentId)]),
    ]);
    const key = dateKey(date);
    const todayKey = dateKey(todayUB());
    const upcoming = key > todayKey;
    return {
      classroomId,
      classroomName: ctx.classroom.name,
      date: key,
      upcoming,
      topic: ctx.topic,
      tests: ctx.testIds.flatMap((id) => {
        const t = tests.get(id);
        return t ? [{ testId: id, title: t.title, variant: normalizeVariant(t.variantLabel) }] : [];
      }),
      uploader: ctx.assignedId
        ? {
            ...(kind === 'STAFF' ? { studentId: ctx.assignedId } : {}),
            name: names.get(ctx.assignedId) ?? 'Сурагч',
            isMe: ctx.assignedId === actor.userId,
          }
        : null,
      // Эзэн 2026-10-31 (СУРАГЧ V2): тухайн өдөр ангид элссэн АЛЬ Ч сурагч өнөөдөр ба өмнөх
      // 13 хоногт илгээнэ; томилогдсон эсэх нь зөвхөн «Томилогдсон» тэмдэг.
      canUpload: !upcoming && (kind === 'STAFF' || inUploadWindow(key, todayKey)),
      assignedToMe: !!ctx.assignedId && ctx.assignedId === actor.userId,
      photos: ctx.photos
        .filter((p) => p.imageKeys.length)
        .map((p) => ({
          id: p.id,
          uploaderName: names.get(p.studentId) ?? 'Сурагч',
          isMine: p.studentId === actor.userId,
          // Томилогдсон сурагчийн зураг эсэх (сурагчид id ХЭЗЭЭ Ч очихгүй)
          isAssigned: !!ctx.assignedId && p.studentId === ctx.assignedId,
          imageKeys: p.imageKeys,
          pages: p.imageKeys.reduce((n, k) => n + (pages.get(k) ?? 1), 0),
          createdAt: p.createdAt,
        })),
    };
  }

  async uploadDayPhotos(actor: Actor, classroomId: string, dateText: string, keys: string[]) {
    const date = this.day(dateText);
    const key = dateKey(date);
    const todayKey = dateKey(todayUB());
    if (key > todayKey)
      throw new BadRequestException('Хичээл болсны дараа онолын зургаа илгээнэ.');
    const kind = await this.photoAccess(actor, classroomId, date);
    // Сурагч: тухайн өдөр ангид элссэн (photoAccess) + өнөөдөр ба өмнөх 13 хоног
    if (kind === 'STUDENT' && !inUploadWindow(key, todayKey))
      throw new ForbiddenException('Онолын зургийг хичээл болсноос хойш 14 хоногийн дотор илгээнэ.');
    const ctx = await this.dayContext(classroomId, date);
    await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${`photo:${classroomId}:${key}:${actor.userId}`}))::text`;
      const mine = await tx.lessonPhoto.findFirst({
        where: { classroomId, date, studentId: actor.userId },
        orderBy: { createdAt: 'asc' },
      });
      const imageKeys = await this.ownImageKeys(keys, actor.userId, mine?.imageKeys ?? [], tx);
      if (!imageKeys.length) {
        if (mine) await tx.lessonPhoto.delete({ where: { id: mine.id } });
        return;
      }
      if (mine)
        await tx.lessonPhoto.update({
          where: { id: mine.id },
          data: { imageKeys, testIds: ctx.testIds },
        });
      else
        await tx.lessonPhoto.create({
          data: { classroomId, date, studentId: actor.userId, imageKeys, testIds: ctx.testIds },
        });
    });
    return this.dayPhotos(actor, classroomId, key);
  }

  /** Сурагчийн бүх (одоогийн) ангийн онолын зургийн өдрүүд + ирээдүйн томилолт */
  async myPhotos(studentId: string, fromText?: string, toText?: string) {
    const today = todayUB();
    const from = fromText ? this.day(fromText) : addDateDays(today, -MAKEUP_WINDOW_DAYS);
    const to = toText ? this.day(toText) : addDateDays(today, 14);
    if (to < from) throw new BadRequestException('Хүрээний эхлэл төгсгөлөөсөө хойно байна.');
    if ((to.getTime() - from.getTime()) / DAY_MS > 400)
      throw new BadRequestException('Хүрээ хэт урт байна.');
    const enrollments = await this.prisma.enrollment.findMany({
      where: { studentId, leftAt: null, classroom: { archived: false } },
      select: { classroomId: true, classroom: { select: { name: true } } },
    });
    if (!enrollments.length) return [];
    const classIds = enrollments.map((e) => e.classroomId);
    const className = new Map(enrollments.map((e) => [e.classroomId, e.classroom.name]));
    const [topics, photos, sessions] = await Promise.all([
      this.prisma.lessonTopic.findMany({
        where: { date: { gte: from, lte: to }, schedule: { classroomId: { in: classIds } } },
        select: { date: true, testIds: true, photoStudentId: true, schedule: { select: { classroomId: true } } },
      }),
      this.prisma.lessonPhoto.findMany({
        where: { classroomId: { in: classIds }, date: { gte: from, lte: to } },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.classTestSession.findMany({
        where: { classroomId: { in: classIds }, date: { gte: from, lte: to }, testId: { not: null } },
        select: { classroomId: true, date: true, testId: true },
      }),
    ]);
    type Day = { classroomId: string; date: string; testIds: Set<string>; assignedId: string | null; photos: typeof photos };
    const days = new Map<string, Day>();
    const at = (classroomId: string, date: Date) => {
      const k = `${classroomId}|${dateKey(date)}`;
      let d = days.get(k);
      if (!d) {
        d = { classroomId, date: dateKey(date), testIds: new Set(), assignedId: null, photos: [] };
        days.set(k, d);
      }
      return d;
    };
    for (const t of topics) {
      if (!t.photoStudentId) continue;
      const d = at(t.schedule.classroomId, t.date);
      d.assignedId = d.assignedId ?? t.photoStudentId;
      t.testIds.forEach((id) => d.testIds.add(id));
    }
    for (const p of photos) {
      if (!p.imageKeys.length) continue;
      const d = at(p.classroomId, p.date);
      d.photos.push(p);
      p.testIds.forEach((id) => d.testIds.add(id));
    }
    for (const s of sessions) {
      const d = days.get(`${s.classroomId}|${dateKey(s.date)}`);
      if (d && s.testId) d.testIds.add(s.testId);
    }
    for (const t of topics) {
      const d = days.get(`${t.schedule.classroomId}|${dateKey(t.date)}`);
      if (d) t.testIds.forEach((id) => d.testIds.add(id));
    }
    const list = [...days.values()];
    const [tests, pages, names] = await Promise.all([
      this.testInfo([...new Set(list.flatMap((d) => [...d.testIds]))]),
      this.pageCounts(list.flatMap((d) => d.photos.flatMap((p) => p.imageKeys))),
      this.names(list.flatMap((d) => [d.assignedId ?? '', ...d.photos.map((p) => p.studentId)])),
    ]);
    const todayKey = dateKey(today);
    return list
      .map((d) => ({
        classroomId: d.classroomId,
        classroomName: className.get(d.classroomId) ?? '',
        date: d.date,
        upcoming: d.date > todayKey,
        tests: [...d.testIds].flatMap((id) => {
          const t = tests.get(id);
          return t ? [{ testId: id, title: t.title, variant: normalizeVariant(t.variantLabel) }] : [];
        }),
        uploader: d.assignedId
          ? { name: names.get(d.assignedId) ?? 'Сурагч', isMe: d.assignedId === studentId }
          : null,
        canUpload: inUploadWindow(d.date, todayKey),
        assignedToMe: d.assignedId === studentId,
        photos: d.photos.map((p) => ({
          id: p.id,
          uploaderName: names.get(p.studentId) ?? 'Сурагч',
          isMine: p.studentId === studentId,
          isAssigned: !!d.assignedId && p.studentId === d.assignedId,
          imageKeys: p.imageKeys,
          pages: p.imageKeys.reduce((n, k) => n + (pages.get(k) ?? 1), 0),
          createdAt: p.createdAt,
        })),
      }))
      .sort((a, b) => b.date.localeCompare(a.date) || a.classroomName.localeCompare(b.classroomName));
  }
}

function toInfo(t: {
  id: string;
  title: string;
  groupKey: string | null;
  variantLabel: string | null;
  gradingMode: string;
  _count: { problems: number };
}): TestInfo {
  return {
    id: t.id,
    title: t.title,
    groupKey: t.groupKey,
    variantLabel: t.variantLabel,
    online: t.gradingMode === 'AUTO' && t._count.problems > 0,
  };
}

/** Ажилтанд: гэрээний талбарууд + зураг, шийдвэр, тэмдэглэл */
function staffView(i: MakeupItem, names: Map<string, string>) {
  return {
    studentId: i.studentId,
    studentName: i.studentName,
    date: i.date,
    reason: i.reason,
    status: i.status,
    photos: i.photos,
    tests: i.tests.map((t) => ({ testId: t.testId, title: t.title, variant: t.variant, done: t.done, inClass: t.inClass })),
    classroomId: i.classroomId,
    imageKeys: i.imageKeys,
    submittedAt: i.submittedAt,
    photosAccepted: i.photosAccepted,
    decision: i.decision,
    decidedAt: i.decidedAt,
    decidedByName: i.decidedById ? (names.get(i.decidedById) ?? null) : null,
    note: i.note,
  };
}

/** Сурагчид: өөрийн мөр л; ажилтны тэмдэглэл, шийдвэр гаргагч ХЭЗЭЭ Ч үгүй */
function studentView(i: MakeupItem, open: Set<string>) {
  return {
    classroomId: i.classroomId,
    classroomName: i.classroomName,
    date: i.date,
    reason: i.reason,
    status: i.status,
    photos: i.photos,
    imageKeys: i.imageKeys,
    submittedAt: i.submittedAt,
    /** Багш дахин илгээхийг хүссэн — өмнөх зураг тооцогдохгүй */
    resubmit: i.decision === 'REOPENED' && i.photos > 0 && !i.photosAccepted,
    photosAccepted: i.photosAccepted,
    tests: i.tests.map((t) => ({ ...t, open: open.has(t.testId) })),
  };
}
