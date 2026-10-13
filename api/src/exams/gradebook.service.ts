import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { AttemptSource, ItemMarkSource, Role } from '../generated/prisma/enums';
import { assertInternalTeachingStaff } from '../common/access';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  buildExamItems,
  ExamItem,
  ItemStatus,
  manualStatuses,
  totalsOf,
} from '../tests/exam-items';
import {
  manualResultSource,
  overrideError,
  ResultLock,
  resultLock,
} from '../tests/result-policy';
import {
  assertManageableClass,
  findExamTest,
  manageableClassWhere,
  managesAllClasses,
} from './exam-access';
import { GradebookRowDto, SaveGradebookDto } from './exams.dto';
import {
  buildGradeWorkbook,
  loadWorkbook,
  normalizeName,
  ParsedGradeSheet,
  parseGradeSheet,
} from './gradebook-sheet';
import { mergeGradebookRow } from './gradebook-merge';

type ExamTest = Awaited<ReturnType<GradebookService['loadTest']>>;

interface RosterStudent {
  id: string;
  firstName: string;
  lastName: string;
  classroomId: string;
  classroomName: string;
}

export type MatchResult =
  | { status: 'OK'; student: RosterStudent }
  | { status: 'UNMATCHED' | 'AMBIGUOUS' };

/**
 * Excel-ийн «Овог/Нэр»-ийг ангийн сурагчтай тулгана: овог+нэр → сольсон
 * (нэр+овог) → зөвхөн нэр (ангид ганц бол). Хоёрдмол бол AMBIGUOUS.
 */
export function matchStudent(
  roster: RosterStudent[],
  lastName: string,
  firstName: string,
): MatchResult {
  const last = normalizeName(lastName);
  const first = normalizeName(firstName);
  if (!first && !last) return { status: 'UNMATCHED' };
  const pick = (hits: RosterStudent[]): MatchResult | null =>
    hits.length === 1
      ? { status: 'OK', student: hits[0] }
      : hits.length > 1
        ? { status: 'AMBIGUOUS' }
        : null;
  const full = roster.filter(
    (s) =>
      normalizeName(s.firstName) === first &&
      normalizeName(s.lastName) === last,
  );
  const swapped = roster.filter(
    (s) =>
      normalizeName(s.firstName) === last &&
      normalizeName(s.lastName) === first,
  );
  const byFirst = first
    ? roster.filter((s) => normalizeName(s.firstName) === first)
    : [];
  return (
    pick(full) ?? pick(swapped) ?? pick(byFirst) ?? { status: 'UNMATCHED' }
  );
}

function messageOf(error: unknown): string {
  if (error instanceof HttpException) {
    const body = error.getResponse();
    if (typeof body === 'string') return body;
    const msg = (body as { message?: unknown }).message;
    if (Array.isArray(msg)) return msg.join(', ');
    if (typeof msg === 'string') return msg;
  }
  return 'Хадгалж чадсангүй. Дахин оролдоно уу.';
}

function fileSafe(text: string): string {
  return text
    .replace(/[·\\/:*?"<>|]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\s/g, '-')
    .slice(0, 80);
}

@Injectable()
export class GradebookService {
  private readonly logger = new Logger(GradebookService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  loadTest(testId: string, userId: string, role: Role) {
    return findExamTest(this.prisma, testId, userId, role, {
      id: true,
      title: true,
      type: true,
      gradingMode: true,
      problems: {
        orderBy: { order: 'asc' },
        select: {
          problemId: true,
          order: true,
          points: true,
          problem: {
            select: { format: true, statementText: true, scoringGroups: true },
          },
        },
      },
    });
  }

  private async roster(classIds: string[]): Promise<RosterStudent[]> {
    if (classIds.length === 0) return [];
    const enrollments = await this.prisma.enrollment.findMany({
      where: {
        classroomId: { in: classIds },
        leftAt: null,
        student: { archivedAt: null },
      },
      select: {
        classroomId: true,
        classroom: { select: { name: true } },
        student: { select: { id: true, firstName: true, lastName: true } },
      },
    });
    const byId = new Map<string, RosterStudent>();
    for (const e of enrollments) {
      if (byId.has(e.student.id)) continue;
      byId.set(e.student.id, {
        ...e.student,
        classroomId: e.classroomId,
        classroomName: e.classroom.name,
      });
    }
    return [...byId.values()].sort(
      (a, b) =>
        a.firstName.localeCompare(b.firstName, 'mn') ||
        a.lastName.localeCompare(b.lastName, 'mn'),
    );
  }

  // ================= Унших =================

  /**
   * Дүнгийн хүснэгт. classroomId — нэг анги (шивэх горим); үгүй/«all» бол
   * ажилтны хүрээний оноосон бүх анги (зөвхөн харах).
   */
  async read(testId: string, userId: string, classroomId?: string) {
    const role = await assertInternalTeachingStaff(this.prisma, userId);
    const test = await this.loadTest(testId, userId, role);
    const items = buildExamItems(test.problems);
    const classes = await this.prisma.classroom.findMany({
      where: manageableClassWhere(role, userId),
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });
    const assigned = new Set(
      (
        await this.prisma.testAccess.findMany({
          where: { testId, classroomId: { in: classes.map((c) => c.id) } },
          select: { classroomId: true },
        })
      ).map((a) => a.classroomId),
    );
    let scope: string[];
    let single: string | null = null;
    if (classroomId && classroomId !== 'all') {
      await assertManageableClass(this.prisma, classroomId, userId, role);
      scope = [classroomId];
      single = classroomId;
    } else {
      scope = classes.filter((c) => assigned.has(c.id)).map((c) => c.id);
    }
    const students = await this.roster(scope);
    const ids = students.map((s) => s.id);
    const where = { testId, studentId: { in: ids } };
    const [results, absences, marks, sessions] = ids.length
      ? await Promise.all([
          this.prisma.testResult.findMany({
            where,
            select: {
              studentId: true,
              totalScore: true,
              maxScore: true,
              source: true,
              version: true,
              updatedAt: true,
            },
          }),
          this.prisma.testAbsence.findMany({
            where,
            select: { studentId: true },
          }),
          this.prisma.testItemMark.findMany({
            where,
            select: {
              studentId: true,
              itemKey: true,
              status: true,
              source: true,
            },
          }),
          this.prisma.testAttemptSession.findMany({
            where,
            select: { studentId: true, status: true },
          }),
        ])
      : [[], [], [], []];
    const resultBy = new Map(results.map((r) => [r.studentId, r]));
    const sessionBy = new Map(sessions.map((s) => [s.studentId, s]));
    const absent = new Set(absences.map((a) => a.studentId));
    const marksBy = new Map<string, typeof marks>();
    for (const m of marks)
      marksBy.set(m.studentId, [...(marksBy.get(m.studentId) ?? []), m]);
    const sum = (part?: 1 | 2) =>
      items
        .filter((i) => !part || i.part === part)
        .reduce((s, i) => s + i.points, 0);

    return {
      test: {
        id: test.id,
        title: test.title,
        type: test.type,
        gradingMode: test.gradingMode,
        maxScore: sum(),
        part1Max: sum(1),
        part2Max: sum(2),
      },
      items: items.map((i) => ({
        key: i.key,
        label: i.label,
        part: i.part,
        points: i.points,
        order: i.order,
      })),
      classes: classes
        .map((c) => ({ ...c, assigned: assigned.has(c.id) }))
        .sort(
          (a, b) =>
            Number(b.assigned) - Number(a.assigned) ||
            a.name.localeCompare(b.name, 'mn'),
        ),
      classroomId: single,
      canOverrideOnline: managesAllClasses(role),
      rows: students.map((s) => {
        const result = resultBy.get(s.id) ?? null;
        const session = sessionBy.get(s.id) ?? null;
        const own = marksBy.get(s.id) ?? [];
        const markMap = own.length
          ? (Object.fromEntries(
              own.map((m) => [m.itemKey, m.status]),
            ) as Record<string, ItemStatus>)
          : null;
        const sources = new Set(own.map((m) => m.source));
        const totals = markMap ? totalsOf(items, markMap) : null;
        return {
          studentId: s.id,
          firstName: s.firstName,
          lastName: s.lastName,
          classroomId: s.classroomId,
          classroomName: s.classroomName,
          absent: absent.has(s.id),
          result: result
            ? {
                totalScore: result.totalScore,
                maxScore: result.maxScore,
                source: result.source,
                version: result.version,
                updatedAt: result.updatedAt,
              }
            : null,
          lock: resultLock(result, session),
          marks: markMap,
          markSource:
            sources.size === 0
              ? null
              : sources.size === 1
                ? [...sources][0]
                : 'MIXED',
          part1: totals ? totals.part1 : null,
          part2: totals ? totals.part2 : null,
        };
      }),
    };
  }

  // ================= Хадгалах (сурагч бүр тусдаа) =================

  async save(testId: string, userId: string, dto: SaveGradebookDto) {
    const role = await assertInternalTeachingStaff(this.prisma, userId);
    const test = await this.loadTest(testId, userId, role);
    await assertManageableClass(this.prisma, dto.classroomId, userId, role);
    const items = buildExamItems(test.problems);
    if (items.length === 0)
      throw new BadRequestException('Энэ тестэд бодлого алга');
    const ids = dto.rows.map((r) => r.studentId);
    if (new Set(ids).size !== ids.length)
      throw new BadRequestException('Нэг сурагч давхар ирлээ');
    const enrolled = new Set(
      (
        await this.prisma.enrollment.findMany({
          where: {
            classroomId: dto.classroomId,
            leftAt: null,
            studentId: { in: ids },
          },
          select: { studentId: true },
        })
      ).map((e) => e.studentId),
    );
    const keys = new Set(items.map((i) => i.key));
    const markSource =
      dto.source === 'EXCEL' ? ItemMarkSource.EXCEL : ItemMarkSource.MANUAL;
    const results: Array<
      | {
          studentId: string;
          ok: true;
          absent: boolean;
          totalScore?: number;
          maxScore?: number;
          version?: number;
          unchanged?: boolean;
          merged?: boolean;
        }
      | { studentId: string; ok: false; error: string }
    > = [];
    for (const row of dto.rows) {
      try {
        if (!enrolled.has(row.studentId)) {
          throw new ForbiddenException('Энэ сурагч тус ангид бүртгэлгүй байна');
        }
        if ((row.wrong ?? []).some((k) => !keys.has(k))) {
          throw new BadRequestException(
            'Шалгалтад байхгүй багана ирлээ — хуудсаа дахин ачаална уу',
          );
        }
        const saved = await this.saveRow(
          test,
          items,
          role,
          userId,
          row,
          markSource,
        );
        results.push({ studentId: row.studentId, ok: true, ...saved });
      } catch (error) {
        if (!(error instanceof HttpException)) {
          this.logger.error(
            `Дүн хадгалах алдаа test=${testId} student=${row.studentId}: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
        results.push({
          studentId: row.studentId,
          ok: false,
          error: messageOf(error),
        });
      }
    }
    return {
      saved: results.filter((r) => r.ok).length,
      failed: results.filter((r) => !r.ok).length,
      results,
    };
  }

  private async saveRow(
    test: ExamTest,
    items: ExamItem[],
    role: Role,
    userId: string,
    row: GradebookRowDto,
    markSource: ItemMarkSource,
  ) {
    const testId = test.id;
    const studentId = row.studentId;
    return this.prisma.$transaction(async (tx) => {
      // Тестийн бодлогын бүрэлдэхүүн засвартай зэрэгцэхгүй (tests.service-тэй ижил түгжээ).
      await tx.$queryRaw(
        Prisma.sql`SELECT "id" FROM "Test" WHERE "id" = ${testId} FOR SHARE`,
      );
      // Нэг сурагчийн мөрийг хоёр багш зэрэг хадгалбал дараалуулна — эс бөгөөс
      // хоёулаа ижил prevMarks уншаад сүүлийнх нь өмнөхийн нүдийг дарна.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${'gradebook:' + testId + ':' + studentId}))`;
      const where = { testId_studentId: { testId, studentId } };
      const [existing, session, absence, prevMarks] = await Promise.all([
        tx.testResult.findUnique({ where }),
        tx.testAttemptSession.findUnique({ where, select: { status: true } }),
        tx.testAbsence.findUnique({ where }),
        tx.testItemMark.findMany({
          where: { testId, studentId },
          select: {
            itemKey: true,
            status: true,
            source: true,
            enteredById: true,
          },
        }),
      ]);
      // Нүдний түвшний нэгтгэл: багш өөрийн өөрчилсөн нүдийг л бичнэ (gradebook-merge.ts)
      const eff = mergeGradebookRow(
        { wrong: row.wrong ?? [], absent: !!row.absent },
        row.base,
        {
          wrong: prevMarks
            .filter((m) => m.status !== 'CORRECT')
            .map((m) => m.itemKey),
          absent: !!absence,
        },
      );
      const lock: ResultLock = resultLock(existing, session);
      const blocked = overrideError(lock, role, row.reason);
      if (blocked) {
        throw lock === 'IN_PROGRESS'
          ? new ConflictException(blocked)
          : new ForbiddenException(blocked);
      }

      if (eff.absent) {
        if (lock) {
          throw new BadRequestException(
            'Онлайнаар өгсөн сурагчийг «Ирээгүй» гэж тэмдэглэх боломжгүй',
          );
        }
        if (existing) {
          await tx.testResult.delete({ where: { id: existing.id } });
          await this.auditIn(
            tx,
            userId,
            role,
            'DELETE',
            existing.id,
            existing,
            null,
            'Ирээгүй гэж тэмдэглэв',
          );
        }
        await tx.testItemMark.deleteMany({ where: { testId, studentId } });
        if (!absence) {
          await tx.testAbsence.create({
            data: { testId, studentId, markedById: userId },
          });
        }
        return {
          absent: true,
          unchanged: !existing && !!absence && prevMarks.length === 0,
          merged: eff.merged,
        };
      }

      // Онлайнаар өгсөн мөрийг засахад онлайнаар дүгнэгдээгүй (хариугүй)
      // зүйлс дүнгээс гадуур хэвээр үлдэнэ.
      const prevBy = new Map(prevMarks.map((m) => [m.itemKey, m]));
      const scopeItems =
        lock === 'ONLINE' && prevMarks.length
          ? items.filter((i) => prevBy.has(i.key))
          : items;
      const statuses = manualStatuses(scopeItems, eff.wrong);
      const data: Prisma.TestItemMarkCreateManyInput[] = scopeItems.map(
        (item) => {
          let status = statuses.get(item.key) as ItemStatus;
          const prev = prevBy.get(item.key);
          // Хариулаагүй (BLANK) ба буруу (WRONG) хоёулаа 0 — хуучин утгыг хадгална.
          if (status === 'WRONG' && prev?.status === 'BLANK') status = 'BLANK';
          const keep = prev && prev.status === status;
          return {
            testId,
            studentId,
            itemKey: item.key,
            status,
            source: keep ? prev.source : markSource,
            enteredById: keep ? prev.enteredById : userId,
          };
        },
      );
      const totals = totalsOf(
        scopeItems,
        new Map(data.map((d) => [d.itemKey, d.status as ItemStatus])),
      );
      const sameMarks =
        prevMarks.length === data.length &&
        data.every((d) => prevBy.get(d.itemKey)?.status === d.status);
      if (
        existing &&
        !absence &&
        sameMarks &&
        existing.totalScore === totals.total &&
        existing.maxScore === totals.max
      ) {
        return {
          absent: false,
          totalScore: existing.totalScore,
          maxScore: existing.maxScore,
          version: existing.version,
          unchanged: true,
          merged: eff.merged,
        };
      }

      const source =
        existing?.source === AttemptSource.ONLINE_TEST
          ? AttemptSource.ONLINE_TEST
          : manualResultSource(test.type);
      const note = lock
        ? 'Онлайн дүнг Багш+ зассан'
        : markSource === ItemMarkSource.EXCEL
          ? 'Excel-ээс оруулсан'
          : 'Гараар зассан';
      const saved = await tx.testResult.upsert({
        where,
        create: {
          testId,
          studentId,
          totalScore: totals.total,
          maxScore: totals.max,
          enteredById: userId,
          source,
        },
        update: {
          totalScore: totals.total,
          maxScore: totals.max,
          enteredById: userId,
          source,
          version: { increment: 1 },
          regradeNote: note,
        },
      });
      await tx.testItemMark.deleteMany({ where: { testId, studentId } });
      await tx.testItemMark.createMany({ data });
      if (absence) await tx.testAbsence.delete({ where });
      if (lock) {
        const wrongOf = (rows: { itemKey: string; status: string }[]) =>
          rows.filter((m) => m.status !== 'CORRECT').map((m) => m.itemKey);
        await this.auditIn(
          tx,
          userId,
          role,
          'OVERRIDE_ONLINE_RESULT',
          saved.id,
          {
            totalScore: existing?.totalScore ?? null,
            maxScore: existing?.maxScore ?? null,
            zero: wrongOf(prevMarks),
          },
          {
            totalScore: saved.totalScore,
            maxScore: saved.maxScore,
            zero: wrongOf(data as { itemKey: string; status: string }[]),
          },
          row.reason,
        );
      }
      return {
        absent: false,
        totalScore: saved.totalScore,
        maxScore: saved.maxScore,
        version: saved.version,
        merged: eff.merged,
      };
    });
  }

  /** Transaction дотор аудит — дүнгийн өөрчлөлттэй хамт commit/rollback болно. */
  private async auditIn(
    tx: Prisma.TransactionClient,
    userId: string,
    role: Role,
    action: string,
    entityId: string,
    before: unknown,
    after: unknown,
    reason?: string,
  ) {
    const json = (v: unknown) =>
      v === null || v === undefined
        ? Prisma.JsonNull
        : (JSON.parse(JSON.stringify(v)) as Prisma.InputJsonValue);
    await tx.auditLog.create({
      data: {
        actorId: userId,
        actorRole: role,
        action,
        entity: 'TestResult',
        entityId,
        before: json(before),
        after: json(after),
        ...(reason ? { reason: reason.trim().slice(0, 500) } : {}),
      },
    });
  }

  // ================= Excel оруулах (урьдчилан харах) =================

  async previewExcel(
    testId: string,
    userId: string,
    classroomId: string,
    buffer: Buffer,
    sheetName?: string,
  ) {
    if (!classroomId) throw new BadRequestException('Анги сонгоно уу');
    const role = await assertInternalTeachingStaff(this.prisma, userId);
    const test = await this.loadTest(testId, userId, role);
    await assertManageableClass(this.prisma, classroomId, userId, role);
    const items = buildExamItems(test.problems);
    const workbook = await loadWorkbook(buffer);
    let parsed: ParsedGradeSheet | null = null;
    if (sheetName) {
      const sheet = workbook.getWorksheet(sheetName);
      if (!sheet)
        throw new BadRequestException(`«${sheetName}» хуудас олдсонгүй`);
      parsed = parseGradeSheet(sheet);
    } else {
      for (const sheet of workbook.worksheets) {
        const candidate = parseGradeSheet(sheet);
        if (candidate && candidate.rows.length > 0) {
          parsed = candidate;
          break;
        }
        parsed ??= candidate;
      }
    }
    if (!parsed) {
      throw new BadRequestException(
        '«№», «Овог», «Нэр» гарчигтай хүснэгт олдсонгүй. «Excel татах»-аар авсан загварыг ашиглана уу.',
      );
    }
    const preview = this.buildPreview(
      parsed,
      items,
      await this.roster([classroomId]),
    );
    const lockBy = await this.locksFor(
      testId,
      preview.rows.flatMap((r) => (r.studentId ? [r.studentId] : [])),
    );
    return {
      sheets: workbook.worksheets.map((s) => s.name),
      sheet: parsed.sheetName,
      maxScore: items.reduce((s, i) => s + i.points, 0),
      ...preview,
      rows: preview.rows.map((r) =>
        r.studentId &&
        lockBy.get(r.studentId) &&
        (r.status === 'READY' || r.status === 'EMPTY' || r.status === 'ABSENT')
          ? { ...r, status: 'LOCKED' as const }
          : r,
      ),
    };
  }

  private async locksFor(testId: string, ids: string[]) {
    if (ids.length === 0) return new Map<string, ResultLock>();
    const [results, sessions] = await Promise.all([
      this.prisma.testResult.findMany({
        where: { testId, studentId: { in: ids } },
        select: { studentId: true, source: true },
      }),
      this.prisma.testAttemptSession.findMany({
        where: { testId, studentId: { in: ids } },
        select: { studentId: true, status: true },
      }),
    ]);
    const resultBy = new Map(results.map((r) => [r.studentId, r]));
    const sessionBy = new Map(sessions.map((s) => [s.studentId, s]));
    return new Map(
      ids.map((id) => [id, resultLock(resultBy.get(id), sessionBy.get(id))]),
    );
  }

  /** Цэвэр: хуудсыг тестийн зүйлс, ангийн сурагчидтай тулгана. */
  buildPreview(
    parsed: ParsedGradeSheet,
    items: ExamItem[],
    roster: RosterStudent[],
  ) {
    const errors: string[] = [];
    const warnings: string[] = [];
    const byLabel = new Map(items.map((i) => [i.label, i]));
    const labels = new Set<string>();
    const ignored: string[] = [];
    for (const column of parsed.columns) {
      if (labels.has(column.label)) {
        errors.push(`«${column.label}» багана давхардсан байна`);
        continue;
      }
      labels.add(column.label);
      const item = byLabel.get(column.label);
      if (!item) {
        if (column.weight !== null && column.weight > 0) {
          errors.push(
            `«${column.label}» багана энэ шалгалтад алга (${column.weight} оноо)`,
          );
        } else {
          ignored.push(column.label);
        }
        continue;
      }
      if (column.weight !== null && column.weight !== item.points) {
        warnings.push(
          `«${column.label}»: Excel-д ${column.weight} оноо, системд ${item.points} — системийн оноогоор бодно`,
        );
      }
    }
    const missing = items
      .filter((i) => !labels.has(i.label))
      .map((i) => i.label);
    if (missing.length) {
      errors.push(
        `Excel-д ${missing.slice(0, 12).join(', ')}${missing.length > 12 ? ` гэх мэт ${missing.length}` : ''} багана алга`,
      );
    }
    if (ignored.length)
      warnings.push(`0 оноотой ${ignored.join(', ')} баганыг тооцохгүй`);

    const seen = new Set<string>();
    const rows = parsed.rows.map((r) => {
      const base = {
        rowNumber: r.rowNumber,
        name: `${r.lastName} ${r.firstName}`.trim(),
        group: r.group,
      };
      const match = matchStudent(roster, r.lastName, r.firstName);
      if (match.status !== 'OK') {
        return {
          ...base,
          status: match.status,
          studentId: null as string | null,
          studentName: null as string | null,
          wrong: [] as string[],
          total: null as number | null,
          odd: [] as string[],
        };
      }
      const student = match.student;
      if (seen.has(student.id)) {
        return {
          ...base,
          status: 'DUPLICATE' as const,
          studentId: student.id,
          studentName: `${student.lastName} ${student.firstName}`,
          wrong: [],
          total: null,
          odd: [],
        };
      }
      seen.add(student.id);
      const wrong = items
        .filter((i) => r.cells.get(i.label) === 'WRONG')
        .map((i) => i.key);
      const total = totalsOf(items, manualStatuses(items, wrong)).total;
      const status = r.absent
        ? ('ABSENT' as const)
        : r.markedCount === 0 && r.totalLiteral !== null
          ? ('TOTAL_ONLY' as const)
          : r.markedCount === 0
            ? ('EMPTY' as const)
            : ('READY' as const);
      return {
        ...base,
        status,
        studentId: student.id,
        studentName: `${student.lastName} ${student.firstName}`,
        wrong,
        total: status === 'READY' || status === 'EMPTY' ? total : null,
        odd: r.odd.map((o) => `${o.label}: ${o.value}`),
      };
    });
    const missingStudents = roster
      .filter((s) => !seen.has(s.id))
      .map((s) => ({ studentId: s.id, name: `${s.lastName} ${s.firstName}` }));
    return { errors, warnings, rows, missingStudents };
  }

  // ================= Excel татах =================

  async exportExcel(testId: string, userId: string, classroomId?: string) {
    if (!classroomId || classroomId === 'all')
      throw new BadRequestException('Анги сонгоно уу');
    const book = await this.read(testId, userId, classroomId);
    const className =
      book.classes.find((c) => c.id === classroomId)?.name ?? 'Анги';
    const labelByKey = new Map(book.items.map((i) => [i.key, i.label]));
    const buffer = await buildGradeWorkbook({
      sheetName: className,
      items: book.items.map((i) => ({
        label: i.label,
        points: i.points,
        part: i.part,
      })),
      rows: book.rows.map((r) => ({
        lastName: r.lastName,
        firstName: r.firstName,
        className: r.classroomName,
        absent: r.absent,
        marks: r.marks
          ? Object.fromEntries(
              Object.entries(r.marks).flatMap(([key, status]) => {
                const label = labelByKey.get(key);
                return label ? [[label, status]] : [];
              }),
            )
          : null,
        totalOnly: r.result && !r.marks ? r.result.totalScore : null,
      })),
    });
    return {
      filename: `${fileSafe(book.test.title)}-${fileSafe(className)}.xlsx`,
      mime: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      base64: buffer.toString('base64'),
    };
  }
}
