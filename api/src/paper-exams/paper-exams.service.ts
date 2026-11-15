import { createHash } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { Role } from '../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import { managesAllClasses } from '../exams/exam-access';
import { loadWorkbook, normalizeName } from '../exams/gradebook-sheet';
import {
  areaScores,
  classifyBy,
  PAPER_TOPICS,
  competitionRanks,
  CONTENT_AREAS,
  gradeSheet,
  itemStats,
  pct,
  rankLabels,
  keyFor,
  weakAreas,
  type ItemStatus,
  type PaperItem,
  type SheetAnswer,
} from './paper-exam-logic';
import { parsePaperWorkbook, type ParsedPaperRow } from './paper-exam-sheet';
import {
  checkGuide,
  guideStage,
  isMissed,
  publicGuide,
  type GuideRow,
} from './paper-exam-student';
import { readStoredBytes } from '../storage/file-store';
import type {
  CreatePaperExamDto,
  SavePaperItemsDto,
  UpdatePaperExamDto,
} from './paper-exams.dto';

interface StudentLite {
  id: string;
  firstName: string;
  lastName: string;
  studentCode: string | null;
}

export interface Actor {
  userId: string;
  role: Role;
}

/** Нүдний төлөвийг 1 тэмдэгтээр (600 × 48 хүснэгт хөнгөн байна) */
const STATUS_CHAR: Record<ItemStatus, string> = {
  CORRECT: 'C',
  WRONG: 'W',
  BLANK: 'B',
  MULTI: 'M',
  UNGRADED: 'U',
};

function toDate(day: string): Date {
  const d = new Date(`${day}T00:00:00.000Z`);
  if (Number.isNaN(d.getTime()) || d.toISOString().slice(0, 10) !== day) {
    throw new BadRequestException('Огноо буруу байна');
  }
  return d;
}

const dayOf = (d: Date) => d.toISOString().slice(0, 10);

function answersOf(value: Prisma.JsonValue): SheetAnswer[] {
  return Array.isArray(value)
    ? value.map((v) => (typeof v === 'string' ? v : ''))
    : [];
}

function json(v: unknown): Prisma.InputJsonValue | typeof Prisma.JsonNull {
  return v === null || v === undefined
    ? Prisma.JsonNull
    : (JSON.parse(JSON.stringify(v)) as Prisma.InputJsonValue);
}

/** Нэг шалгалтын бичилтүүдийг цувуулна (импорт, холболт, буцаалт зэрэг явахгүй). */
async function lockExam(tx: Prisma.TransactionClient, examId: string) {
  await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${'paper-exam:' + examId}))::text AS locked`;
}

/** Хуудас хэнийх вэ: сурагч, эсвэл (холбогдоогүй бол) файлын шифр + нэр + баг. */
function sheetTarget(
  studentId: string | null,
  raw: {
    code: string;
    lastName: string;
    firstName: string;
    groupLabel: string;
  },
): string {
  if (studentId) return `s:${studentId}`;
  return `raw:${raw.code}|${normalizeName(raw.lastName)}|${normalizeName(raw.firstName)}|${raw.groupLabel}`;
}

/** «Баг 27» → 27 (багуудыг дугаараар эрэмбэлнэ) */
function groupOrder(label: string): number {
  const m = label.match(/\d+/);
  return m ? Number(m[0]) : Number.MAX_SAFE_INTEGER;
}

const ITEM_SELECT = {
  number: true,
  answerKey: true,
  points: true,
  area: true,
  topic: true,
  formulaSlugs: true,
  voided: true,
  answerKeys: true,
  label: true,
  cells: true,
} as const;

@Injectable()
export class PaperExamsService {
  constructor(private readonly prisma: PrismaService) {}

  // ======================= Удирдлага =======================

  private async activeExam(id: string) {
    const exam = await this.prisma.paperExam.findUnique({
      where: { id },
      include: { items: { select: ITEM_SELECT, orderBy: { number: 'asc' } } },
    });
    if (!exam || exam.deletedAt)
      throw new NotFoundException('Шалгалт олдсонгүй');
    return exam;
  }

  private async audit(
    tx: Prisma.TransactionClient,
    actor: Actor,
    action: string,
    entityId: string,
    before: unknown,
    after: unknown,
  ) {
    await tx.auditLog.create({
      data: {
        actorId: actor.userId,
        actorRole: actor.role,
        action,
        entity: 'PaperExam',
        entityId,
        before: json(before),
        after: json(after),
      },
    });
  }

  async list(actor: Actor) {
    const exams = await this.prisma.paperExam.findMany({
      where: { deletedAt: null },
      orderBy: [{ heldOn: 'desc' }, { createdAt: 'desc' }],
      select: {
        id: true,
        title: true,
        heldOn: true,
        itemCount: true,
        published: true,
        items: { select: { answerKey: true, area: true, voided: true } },
      },
    });
    const ids = exams.map((e) => e.id);
    const stats = ids.length
      ? await this.prisma.paperExamSheet.groupBy({
          by: ['examId'],
          where: {
            examId: { in: ids },
            supersededAt: null,
            studentId: { not: null },
          },
          _count: { _all: true },
          _sum: { totalScore: true, maxScore: true },
        })
      : [];
    const unmatched = ids.length
      ? await this.prisma.paperExamSheet.groupBy({
          by: ['examId'],
          where: { examId: { in: ids }, supersededAt: null, studentId: null },
          _count: { _all: true },
        })
      : [];
    const statBy = new Map(stats.map((s) => [s.examId, s]));
    const unmatchedBy = new Map(
      unmatched.map((s) => [s.examId, s._count._all]),
    );
    return exams.map((e) => {
      const s = statBy.get(e.id);
      return {
        id: e.id,
        title: e.title,
        heldOn: dayOf(e.heldOn),
        itemCount: e.itemCount,
        published: e.published,
        keyedCount: e.items.filter((i) => i.answerKey).length,
        areaCount: e.items.filter((i) => i.area).length,
        voidedCount: e.items.filter((i) => i.voided).length,
        sheetCount: s?._count._all ?? 0,
        // Холбогдоогүй хуудас — холбох эрхтэй хүнд л
        unmatchedCount: managesAllClasses(actor.role)
          ? (unmatchedBy.get(e.id) ?? 0)
          : 0,
        avgPct: s ? pct(s._sum.totalScore ?? 0, s._sum.maxScore ?? 0) : null,
      };
    });
  }

  async create(dto: CreatePaperExamDto, actor: Actor) {
    const heldOn = toDate(dto.heldOn);
    return this.prisma.$transaction(async (tx) => {
      const exam = await tx.paperExam.create({
        data: {
          title: dto.title,
          heldOn,
          itemCount: dto.itemCount,
          createdById: actor.userId,
          items: {
            create: Array.from({ length: dto.itemCount }, (_, i) => ({
              number: i + 1,
            })),
          },
        },
        select: { id: true },
      });
      await this.audit(tx, actor, 'CREATE', exam.id, null, dto);
      return exam;
    });
  }

  async update(id: string, dto: UpdatePaperExamDto, actor: Actor) {
    const exam = await this.activeExam(id);
    const data: Prisma.PaperExamUpdateInput = {};
    if (dto.title !== undefined) data.title = dto.title;
    if (dto.heldOn !== undefined) data.heldOn = toDate(dto.heldOn);
    if (dto.published !== undefined) data.published = dto.published;
    if (dto.published === true && !exam.published) {
      const linked = await this.prisma.paperExamSheet.count({
        where: { examId: id, supersededAt: null, studentId: { not: null } },
      });
      if (linked === 0)
        throw new BadRequestException(
          'Дүн оруулаагүй шалгалтыг сурагчдад нээхгүй',
        );
      // Холбогдоогүй (давхар) хуудас сурагчид харагдахгүй тул нээхэд саад болохгүй (эзэн 2026-11-15)
    }
    const resize =
      dto.itemCount !== undefined && dto.itemCount !== exam.itemCount;
    if (resize) {
      const sheets = await this.prisma.paperExamSheet.count({
        where: { examId: id },
      });
      if (sheets > 0) {
        throw new BadRequestException(
          'Дүн оруулсан шалгалтын бодлогын тоог өөрчлөхгүй. Шинэ шалгалт үүсгэнэ үү.',
        );
      }
      data.itemCount = dto.itemCount;
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.paperExam.update({ where: { id }, data });
      if (resize) {
        const n = dto.itemCount!;
        // Дүнгүй шалгалтын тохиргоо — сурагчийн өгөгдөл биш
        await tx.paperExamItem.deleteMany({
          where: { examId: id, number: { gt: n } },
        });
        if (n > exam.itemCount) {
          await tx.paperExamItem.createMany({
            data: Array.from({ length: n - exam.itemCount }, (_, i) => ({
              examId: id,
              number: exam.itemCount + i + 1,
            })),
            skipDuplicates: true,
          });
        }
      }
      await this.audit(
        tx,
        actor,
        'UPDATE',
        id,
        {
          title: exam.title,
          heldOn: dayOf(exam.heldOn),
          itemCount: exam.itemCount,
          published: exam.published,
        },
        dto,
      );
    });
    return { ok: true };
  }

  async remove(id: string, actor: Actor) {
    const exam = await this.activeExam(id);
    await this.prisma.$transaction(async (tx) => {
      await tx.paperExam.update({
        where: { id },
        data: { deletedAt: new Date(), published: false },
      });
      await this.audit(tx, actor, 'DELETE', id, { title: exam.title }, null);
    });
    return { ok: true };
  }

  async saveItems(id: string, dto: SavePaperItemsDto, actor: Actor) {
    const exam = await this.activeExam(id);
    const seen = new Set<number>();
    for (const item of dto.items) {
      if (item.number > exam.itemCount) {
        throw new BadRequestException(
          `${item.number}-р бодлого энэ шалгалтад алга (${exam.itemCount} бодлоготой)`,
        );
      }
      if (seen.has(item.number))
        throw new BadRequestException(`${item.number}-р бодлого давхардсан`);
      seen.add(item.number);
    }
    const slugs = [...new Set(dto.items.flatMap((i) => i.formulaSlugs ?? []))];
    if (slugs.length) {
      const found = await this.prisma.formula.findMany({
        where: { slug: { in: slugs } },
        select: { slug: true },
      });
      const have = new Set(found.map((f) => f.slug));
      const missing = slugs.filter((x) => !have.has(x));
      if (missing.length)
        throw new BadRequestException(
          `Томьёоны санд алга: ${missing.slice(0, 5).join(', ')}`,
        );
    }
    const before = exam.items;
    await this.prisma.$transaction(
      async (tx) => {
        for (const item of dto.items) {
          // Илгээсэн талбарыг л өөрчилнө (undefined = хэвээр, null = арилгах)
          const data = {
            points: item.points,
            ...(item.answerKey !== undefined
              ? { answerKey: item.answerKey }
              : {}),
            ...(item.area !== undefined ? { area: item.area } : {}),
            ...(item.topic !== undefined ? { topic: item.topic } : {}),
            ...(item.formulaSlugs !== undefined
              ? { formulaSlugs: [...new Set(item.formulaSlugs)] }
              : {}),
            ...(item.voided !== undefined ? { voided: item.voided } : {}),
          };
          await tx.paperExamItem.upsert({
            where: { examId_number: { examId: id, number: item.number } },
            create: { examId: id, number: item.number, ...data },
            update: data,
          });
        }
        await this.regrade(tx, id);
        await this.audit(tx, actor, 'UPDATE_ITEMS', id, before, dto.items);
      },
      { timeout: 30_000 },
    );
    return { ok: true };
  }

  /** Түлхүүр/оноо өөрчлөгдсөний дараа бүх хуудасны оноог нэг SQL-ээр шинэчилнэ. */
  private async regrade(tx: Prisma.TransactionClient, examId: string) {
    const items = await tx.paperExamItem.findMany({
      where: { examId },
      select: ITEM_SELECT,
      orderBy: { number: 'asc' },
    });
    const sheets = await tx.paperExamSheet.findMany({
      where: { examId },
      select: {
        id: true,
        answers: true,
        variant: true,
        totalScore: true,
        maxScore: true,
      },
    });
    const changed = sheets
      .map((s) => ({
        id: s.id,
        old: s,
        g: gradeSheet(answersOf(s.answers), items, s.variant),
      }))
      .filter(
        (x) =>
          x.g.totalScore !== x.old.totalScore ||
          x.g.maxScore !== x.old.maxScore,
      );
    for (let i = 0; i < changed.length; i += 500) {
      const part = changed.slice(i, i + 500);
      const values = Prisma.join(
        part.map(
          (x) =>
            Prisma.sql`(${x.id}, ${x.g.totalScore}::float8, ${x.g.maxScore}::float8)`,
        ),
      );
      await tx.$executeRaw`
        UPDATE "PaperExamSheet" AS s
        SET "totalScore" = v.t, "maxScore" = v.m
        FROM (VALUES ${values}) AS v(id, t, m)
        WHERE s.id = v.id`;
    }
  }

  // ======================= Импорт =======================

  async importFile(
    id: string,
    buffer: Buffer,
    fileName: string,
    opts: { confirm: boolean; replace: boolean },
    actor: Actor,
  ) {
    const exam = await this.activeExam(id);
    const parsed = parsePaperWorkbook(await loadWorkbook(buffer));
    if (parsed.rows.length === 0) {
      const why = parsed.skipped
        .map((s) => `«${s.name}»: ${s.reason}`)
        .join('; ');
      throw new BadRequestException(
        `Файлаас сурагчийн мөр олдсонгүй.${why ? ` ${why}` : ''}`,
      );
    }
    // V2 файлд бодлого бүрийн нэр, оноо, хувилбар бүрийн түлхүүр «Түлхүүр» шийтэд бий —
    // тэрээр дүгнэж, хадгалахдаа шалгалтын бодлогуудад тавина (машины key.ini = эх сурвалж)
    const v2 = parsed.v2Items ?? null;
    const fileItem = (idx: number) => {
      const it = v2?.[idx];
      if (!it) return null;
      // Файлд байхгүй хувилбарын түлхүүрийг ХАДГАЛНА: нэг ангийн (зөвхөн A) файл оруулахад
      // B-гийн түлхүүр алга болж B сурагчид A түлхүүрээр дүгнэгдсэн алдаа (2026-11-15)
      const prev = exam.items[idx]?.answerKeys;
      const keys: Record<string, string> = {
        ...(prev && typeof prev === 'object' && !Array.isArray(prev)
          ? (prev as Record<string, string>)
          : {}),
        ...it.keys,
      };
      return {
        points: it.points,
        answerKeys: keys,
        answerKey: keys[Object.keys(keys).sort()[0]] ?? null,
        label: it.label.includes('.') ? it.label : null,
        cells: it.cols.length > 1 ? it.cols.length : null,
      };
    };
    const gradeItems: PaperItem[] = v2
      ? exam.items.map((i, idx) => ({ ...i, ...(fileItem(idx) ?? {}) }))
      : exam.items;
    const pointsChange =
      !!v2 &&
      v2.length === exam.items.length &&
      exam.items.some((i, idx) => {
        const f = fileItem(idx)!;
        return (
          i.points !== f.points ||
          (i.label ?? null) !== f.label ||
          (i.cells ?? null) !== f.cells ||
          JSON.stringify(i.answerKeys ?? null) !== JSON.stringify(f.answerKeys)
        );
      });
    const wrongSize = parsed.sheets.filter(
      (s) => s.itemCount !== exam.itemCount,
    );
    const blocking = wrongSize.length
      ? `Шалгалт ${exam.itemCount} бодлоготой, харин ${wrongSize
          .map((s) => `«${s.name}» шийтэд ${s.itemCount}`)
          .join(', ')} бодлого байна.`
      : null;

    const sha = createHash('sha256').update(buffer).digest('hex');
    const sameFile = await this.prisma.paperExamImport.findFirst({
      where: { examId: id, fileSha256: sha, status: 'CONFIRMED' },
      select: { createdAt: true },
    });

    const matched = await this.matchRows(parsed.rows);
    // Файлд анги бичигдээгүй мөр — сурагчийн одоогийн ангиар (эзэн 2026-11-15: анги бүрээр эрэмбэлнэ)
    const noClass = matched.filter(
      (m) => m.student && m.classroomId && m.row.groupLabel === 'Ангигүй',
    );
    if (noClass.length) {
      const rooms = await this.prisma.classroom.findMany({
        where: { id: { in: [...new Set(noClass.map((m) => m.classroomId!))] } },
        select: { id: true, name: true },
      });
      const nameBy = new Map(
        rooms.map((c) => [c.id, c.name.replace(/\s*\(.*\)\s*$/, '').trim()]),
      );
      for (const m of noClass) {
        const name = nameBy.get(m.classroomId!);
        if (name) m.row = { ...m.row, groupLabel: name };
      }
    }

    // Файлд нэг сурагч давхар таарвал эхнийх нь тухайн сурагчийнх, бусад нь
    // холбогдоогүй хуудас болж хадгалагдана (хариу нь алдагдахгүй, гараар холбоно).
    const seenStudent = new Set<string>();
    const resolved = matched.map((m) => {
      if (!m.student) return { ...m, duplicate: false };
      if (seenStudent.has(m.student.id)) {
        return {
          ...m,
          student: null,
          how: null,
          duplicateOf: m.student,
          duplicate: true,
        };
      }
      seenStudent.add(m.student.id);
      return { ...m, duplicate: false };
    });

    const existing = await this.activeSheetsFor(this.prisma, id);
    const rows = resolved.map((m, index) => {
      const g = gradeSheet(m.row.answers, gradeItems, m.row.variant ?? null);
      const target = sheetTarget(m.student?.id ?? null, m.row);
      const replaces = existing.has(target);
      const allBinary = m.row.answers.every((a) => a === '+' || a === '-');
      const scoreMismatch =
        !parsed.format &&
        m.row.fileScore !== null &&
        allBinary &&
        exam.items.every((i) => i.points === 1 && !i.voided) &&
        m.row.fileScore !== g.totalScore;
      // Алдаатай дүн (машины онооноос зөрсөн г.м.) хэзээ ч хадгалагдахгүй
      const rejected = m.row.error ?? null;
      const warnings: string[] = [];
      if (rejected) warnings.push(`ХАДГАЛАХГҮЙ: ${rejected}`);
      for (const note of m.row.notes ?? []) warnings.push(note);
      if ('duplicateOf' in m && m.duplicateOf)
        warnings.push(
          `«${m.duplicateOf.lastName} ${m.duplicateOf.firstName}» файлд давхар таарсан — энэ мөрийг холбогдоогүй хуудас болгож хадгална`,
        );
      if (m.nameMismatch) warnings.push('Файлын нэр бүртгэлийнхээс өөр');
      if (m.row.oddCells)
        warnings.push(
          `${m.row.oddCells} нүдний утга танигдсангүй (буруу гэж авна)`,
        );
      if (scoreMismatch)
        warnings.push(`Файлын оноо ${m.row.fileScore}, бодсон ${g.totalScore}`);
      if (replaces && !opts.replace)
        warnings.push('Өмнө оруулсан дүн байгаа тул алгасна');
      return {
        key: index,
        sheetName: m.row.sheetName,
        rowNumber: m.row.rowNumber,
        code: m.row.code,
        lastName: m.row.lastName,
        firstName: m.row.firstName,
        groupLabel: m.row.groupLabel,
        match: m.how,
        student: m.student
          ? {
              id: m.student.id,
              name: `${m.student.lastName} ${m.student.firstName}`.trim(),
              code: m.student.studentCode,
            }
          : null,
        totalScore: g.totalScore,
        maxScore: g.maxScore,
        duplicate: m.duplicate,
        replaces,
        warnings,
        rejected,
        target,
        classroomId: m.student ? m.classroomId : null,
        parsed: m.row,
      };
    });

    const planned = rows.filter(
      (r) => !r.rejected && !(r.replaces && !opts.replace),
    );
    const summary = {
      fileName,
      examItemCount: exam.itemCount,
      sheets: parsed.sheets,
      skipped: parsed.skipped,
      blocking,
      sameFileImportedAt: sameFile?.createdAt ?? null,
      totals: {
        rows: rows.length,
        matched: rows.filter((r) => r.student).length,
        unmatched: rows.filter((r) => !r.student).length,
        duplicates: rows.filter((r) => r.duplicate).length,
        replaces: rows.filter((r) => r.replaces).length,
        warnings: rows.filter((r) => r.warnings.length > 0).length,
        rejected: rows.filter((r) => r.rejected).length,
        droppedDuplicates: parsed.droppedDuplicates ?? 0,
        willWrite: planned.length,
      },
      format: parsed.format ?? null,
      pointsChange,
      noKeyLetters:
        parsed.sheets.some((s) => s.mode === 'LETTERS') &&
        exam.items.every((i) => !i.answerKey),
      rows: rows.map((r) => ({
        key: r.key,
        sheetName: r.sheetName,
        rowNumber: r.rowNumber,
        code: r.code,
        lastName: r.lastName,
        firstName: r.firstName,
        groupLabel: r.groupLabel,
        match: r.match,
        student: r.student,
        totalScore: r.totalScore,
        maxScore: r.maxScore,
        duplicate: r.duplicate,
        replaces: r.replaces,
        warnings: r.warnings,
      })),
    };
    if (!opts.confirm) return { ...summary, saved: false as const };
    if (blocking) throw new BadRequestException(blocking);

    const now = new Date();
    const result = await this.prisma.$transaction(
      async (tx) => {
        await lockExam(tx, id);
        // Түгжээний дараа дахин уншина — зэрэг хоёр импорт давхар бичихгүй
        const current = await this.activeSheetsFor(tx, id);
        const write = rows.filter(
          (r) => !r.rejected && (opts.replace || !current.has(r.target)),
        );
        // V2 файлын бодлогын нэр, оноо, хувилбар бүрийн түлхүүрийг шалгалтад тавина
        if (pointsChange && v2) {
          for (const [idx, item] of exam.items.entries()) {
            const f = fileItem(idx)!;
            await tx.paperExamItem.update({
              where: { examId_number: { examId: id, number: item.number } },
              data: {
                points: f.points,
                answerKeys: json(f.answerKeys),
                answerKey: f.answerKey,
                label: f.label,
                cells: f.cells,
              },
            });
          }
        }
        const imp = await tx.paperExamImport.create({
          data: {
            examId: id,
            fileName: fileName.slice(0, 200),
            fileSha256: sha,
            sheetCount: write.length,
            matchedCount: write.filter((r) => r.student).length,
            createdById: actor.userId,
          },
          select: { id: true },
        });
        if (opts.replace) {
          const old = write.flatMap((r) => current.get(r.target) ?? []);
          if (old.length) {
            await tx.paperExamSheet.updateMany({
              where: { id: { in: old }, supersededAt: null },
              data: { supersededAt: now, supersededByImportId: imp.id },
            });
          }
        }
        await tx.paperExamSheet.createMany({
          data: write.map((r) => ({
            examId: id,
            importId: imp.id,
            studentId: r.student?.id ?? null,
            rawCode: r.parsed.code,
            rawLastName: r.parsed.lastName,
            rawFirstName: r.parsed.firstName,
            groupLabel: r.parsed.groupLabel,
            groupTeacher: r.parsed.groupTeacher,
            classroomId: r.classroomId,
            answers: r.parsed.answers,
            variant: r.parsed.variant ?? null,
            totalScore: r.totalScore,
            maxScore: r.maxScore,
          })),
        });
        // Оноо өөрчлөгдсөн бол өмнөх хуудсуудыг шинэ оноогоор дахин дүгнэнэ
        if (pointsChange) await this.regrade(tx, id);
        await this.audit(tx, actor, 'IMPORT', id, null, {
          importId: imp.id,
          keysFromFile: pointsChange ? v2?.map((it) => it.label) : undefined,
          fileName,
          sha,
          ...summary.totals,
          written: write.length,
        });
        return { importId: imp.id, written: write.length };
      },
      { timeout: 30_000 },
    );
    return {
      ...summary,
      totals: { ...summary.totals, willWrite: result.written },
      saved: true as const,
      importId: result.importId,
    };
  }

  /**
   * Шалгалтын идэвхтэй хуудсууд «зорилт»-оор: холбогдсон бол сурагч, үгүй бол
   * файлын шифр + нэр + баг (дахин оруулахад холбогдоогүй хуудас давхардахгүй).
   */
  private async activeSheetsFor(
    db: Prisma.TransactionClient | PrismaService,
    examId: string,
  ): Promise<Map<string, string[]>> {
    const sheets = await db.paperExamSheet.findMany({
      where: { examId, supersededAt: null },
      select: {
        id: true,
        studentId: true,
        rawCode: true,
        rawLastName: true,
        rawFirstName: true,
        groupLabel: true,
      },
    });
    const map = new Map<string, string[]>();
    for (const s of sheets) {
      const k = sheetTarget(s.studentId, {
        code: s.rawCode,
        lastName: s.rawLastName,
        firstName: s.rawFirstName,
        groupLabel: s.groupLabel,
      });
      map.set(k, [...(map.get(k) ?? []), s.id]);
    }
    return map;
  }

  /** Шифр → сурагч: studentCode, дараа нь хуучин код, эцэст нь (давхардалгүй) овог нэр. */
  private async matchRows(rows: ParsedPaperRow[]) {
    const codes = [...new Set(rows.map((r) => r.code).filter(Boolean))];
    const select = {
      id: true,
      firstName: true,
      lastName: true,
      studentCode: true,
    } as const;
    const byCode = new Map<string, StudentLite>();
    if (codes.length) {
      const users = await this.prisma.user.findMany({
        where: { role: Role.STUDENT, studentCode: { in: codes } },
        select,
      });
      for (const u of users) byCode.set(u.studentCode!.toUpperCase(), u);
      const rest = codes.filter((c) => !byCode.has(c));
      if (rest.length) {
        const legacy = await this.prisma.studentCodeLegacy.findMany({
          where: { oldCode: { in: rest } },
          select: { userId: true, oldCode: true },
        });
        const legacyUsers = legacy.length
          ? await this.prisma.user.findMany({
              where: {
                id: { in: legacy.map((l) => l.userId) },
                role: Role.STUDENT,
              },
              select,
            })
          : [];
        const uBy = new Map(legacyUsers.map((u) => [u.id, u]));
        for (const l of legacy) {
          const u = uBy.get(l.userId);
          if (u) byCode.set(`legacy:${l.oldCode.toUpperCase()}`, u);
        }
      }
    }

    // Код таараагүй мөрийг нэрээр (зөвхөн ганц таарсан үед)
    const needName = rows.filter(
      (r) =>
        !(r.code && (byCode.has(r.code) || byCode.has(`legacy:${r.code}`))) &&
        r.firstName,
    );
    const nameIndex = new Map<string, StudentLite[]>();
    if (needName.length) {
      const firsts = [...new Set(needName.map((r) => r.firstName.trim()))];
      const candidates = await this.prisma.user.findMany({
        where: {
          role: Role.STUDENT,
          archivedAt: null,
          firstName: { in: firsts, mode: 'insensitive' },
        },
        select,
      });
      for (const c of candidates) {
        const k = normalizeName(c.firstName);
        nameIndex.set(k, [...(nameIndex.get(k) ?? []), c]);
      }
    }
    const byName = (r: ParsedPaperRow) => {
      const list = nameIndex.get(normalizeName(r.firstName)) ?? [];
      const last = normalizeName(r.lastName);
      const hits = list.filter((c) => {
        const cl = normalizeName(c.lastName);
        if (!last) return false;
        return last.length <= 2 ? cl.startsWith(last.slice(0, 1)) : cl === last;
      });
      return hits.length === 1 ? hits[0] : null;
    };

    const result = rows.map((row) => {
      let how: 'CODE' | 'LEGACY' | 'NAME' | null = null;
      let student = row.code ? byCode.get(row.code) : undefined;
      if (student) how = 'CODE';
      else if (row.code && (student = byCode.get(`legacy:${row.code}`)))
        how = 'LEGACY';
      else {
        const s = byName(row);
        if (s) {
          student = s;
          how = 'NAME';
        }
      }
      const nameMismatch =
        !!student &&
        how !== 'NAME' &&
        !!row.firstName &&
        normalizeName(row.firstName) !== normalizeName(student.firstName);
      return {
        row,
        student: student ?? null,
        how,
        nameMismatch,
        classroomId: null as string | null,
      };
    });

    const ids = [
      ...new Set(result.flatMap((r) => (r.student ? [r.student.id] : []))),
    ];
    if (ids.length) {
      const enrollments = await this.prisma.enrollment.findMany({
        where: {
          studentId: { in: ids },
          leftAt: null,
          classroom: { archived: false },
        },
        select: { studentId: true, classroomId: true },
        orderBy: { joinedAt: 'desc' },
      });
      const classBy = new Map<string, string>();
      for (const e of enrollments)
        if (!classBy.has(e.studentId)) classBy.set(e.studentId, e.classroomId);
      for (const r of result)
        if (r.student) r.classroomId = classBy.get(r.student.id) ?? null;
    }
    return result;
  }

  async revertImport(importId: string, actor: Actor) {
    const imp = await this.prisma.paperExamImport.findUnique({
      where: { id: importId },
      select: {
        id: true,
        examId: true,
        status: true,
        exam: { select: { deletedAt: true } },
      },
    });
    if (!imp || imp.exam.deletedAt)
      throw new NotFoundException('Импорт олдсонгүй');
    if (imp.status !== 'CONFIRMED')
      throw new BadRequestException('Энэ импортыг аль хэдийн буцаасан');
    const now = new Date();
    const restored = await this.prisma.$transaction(
      async (tx) => {
        await lockExam(tx, imp.examId);
        const fresh = await tx.paperExamImport.findUnique({
          where: { id: importId },
          select: { status: true },
        });
        if (fresh?.status !== 'CONFIRMED')
          throw new BadRequestException('Энэ импортыг аль хэдийн буцаасан');
        await tx.paperExamSheet.updateMany({
          where: { importId, supersededAt: null },
          data: { supersededAt: now },
        });
        // Энэ импортоор орлогдсон хуучин хуудсыг сэргээнэ — зөвхөн өөрийн импорт нь
        // хүчинтэй (буцаагаагүй), тэр хүнд идэвхтэй хуудас байхгүй бол
        const replaced = await tx.paperExamSheet.findMany({
          where: {
            supersededByImportId: importId,
            import: { status: 'CONFIRMED' },
          },
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            studentId: true,
            rawCode: true,
            rawLastName: true,
            rawFirstName: true,
            groupLabel: true,
          },
        });
        const busy = new Set(
          (await this.activeSheetsFor(tx, imp.examId)).keys(),
        );
        const back: string[] = [];
        for (const r of replaced) {
          const k = sheetTarget(r.studentId, {
            code: r.rawCode,
            lastName: r.rawLastName,
            firstName: r.rawFirstName,
            groupLabel: r.groupLabel,
          });
          if (busy.has(k)) continue;
          busy.add(k);
          back.push(r.id);
        }
        if (back.length) {
          await tx.paperExamSheet.updateMany({
            where: { id: { in: back } },
            data: { supersededAt: null, supersededByImportId: null },
          });
        }
        await tx.paperExamImport.update({
          where: { id: importId },
          data: {
            status: 'REVERTED',
            revertedAt: now,
            revertedById: actor.userId,
          },
        });
        await this.regrade(tx, imp.examId);
        await this.audit(
          tx,
          actor,
          'REVERT_IMPORT',
          imp.examId,
          { importId },
          { restored: back.length },
        );
        return back.length;
      },
      { timeout: 30_000 },
    );
    return { ok: true, restored };
  }

  async imports(examId: string) {
    await this.activeExam(examId);
    const rows = await this.prisma.paperExamImport.findMany({
      where: { examId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        fileName: true,
        sheetCount: true,
        matchedCount: true,
        status: true,
        createdAt: true,
        revertedAt: true,
        createdById: true,
      },
    });
    const users = await this.prisma.user.findMany({
      where: { id: { in: [...new Set(rows.map((r) => r.createdById))] } },
      select: { id: true, firstName: true, lastName: true },
    });
    const uBy = new Map(
      users.map((u) => [u.id, `${u.lastName.charAt(0)}. ${u.firstName}`]),
    );
    return rows.map(({ createdById, ...r }) => ({
      ...r,
      createdBy: uBy.get(createdById) ?? null,
    }));
  }

  async linkSheet(sheetId: string, studentId: string | null, actor: Actor) {
    const sheet = await this.prisma.paperExamSheet.findUnique({
      where: { id: sheetId },
      select: {
        id: true,
        examId: true,
        studentId: true,
        supersededAt: true,
        exam: { select: { deletedAt: true } },
      },
    });
    if (!sheet || sheet.supersededAt || sheet.exam.deletedAt)
      throw new NotFoundException('Хуудас олдсонгүй');
    let classroomId: string | null = null;
    if (studentId) {
      const student = await this.prisma.user.findFirst({
        where: { id: studentId, role: Role.STUDENT },
        select: { id: true },
      });
      if (!student) throw new NotFoundException('Сурагч олдсонгүй');
      const enr = await this.prisma.enrollment.findFirst({
        where: { studentId, leftAt: null, classroom: { archived: false } },
        orderBy: { joinedAt: 'desc' },
        select: { classroomId: true },
      });
      classroomId = enr?.classroomId ?? null;
    }
    await this.prisma.$transaction(async (tx) => {
      await lockExam(tx, sheet.examId);
      const still = await tx.paperExamSheet.findUnique({
        where: { id: sheetId },
        select: { supersededAt: true },
      });
      if (!still || still.supersededAt)
        throw new NotFoundException('Хуудас олдсонгүй');
      if (studentId) {
        const other = await tx.paperExamSheet.findFirst({
          where: {
            examId: sheet.examId,
            studentId,
            supersededAt: null,
            NOT: { id: sheetId },
          },
          select: { id: true },
        });
        if (other)
          throw new ConflictException(
            'Энэ сурагчид энэ шалгалтын өөр хуудас холбогдсон байна',
          );
      }
      await tx.paperExamSheet.update({
        where: { id: sheetId },
        data: { studentId, classroomId },
      });
      await this.audit(
        tx,
        actor,
        'LINK_SHEET',
        sheet.examId,
        { sheetId, studentId: sheet.studentId },
        { sheetId, studentId },
      );
    });
    return { ok: true };
  }

  /**
   * Багшийн гараар засвар (эзэн 2026-11-15): машин уншиж чадаагүй сурагчийн дүнг оруулах,
   * эсвэл буруу уншсаныг засах. Хуучин мөрийг ДАРЖ БИЧИХГҮЙ — хүчингүй болгоод шинэ мөр
   * (тусдаа «Гараар засвар» импорт) үүсгэнэ, тэр импортыг буцаавал хуучин нь сэргэнэ.
   */
  async editSheet(
    examId: string,
    dto: { sheetId?: string; studentId?: string; variant: string; answers: string[] },
    actor: Actor,
  ) {
    const exam = await this.activeExam(examId);
    const items: PaperItem[] = exam.items;
    if (dto.answers.length !== items.length)
      throw new BadRequestException(`${items.length} бодлогын хариу өгнө үү`);
    const variant = dto.variant.trim().toUpperCase();
    const answers = dto.answers.map((raw, i) => {
      const a = raw.trim().toUpperCase();
      const cells = items[i].cells ?? 1;
      const ok =
        a === '' || a === '+' || a === '-' ||
        (cells > 1 ? new RegExp(`^[0-9_*-]{${cells}}$`).test(a) : /^[A-E*]$/.test(a));
      if (!ok)
        throw new BadRequestException(
          `${items[i].label ?? items[i].number}: «${raw}» хариу буруу хэлбэртэй`,
        );
      return a;
    });
    const g = gradeSheet(answers, items, variant);

    const old = dto.sheetId
      ? await this.prisma.paperExamSheet.findFirst({
          where: { id: dto.sheetId, examId, supersededAt: null },
        })
      : null;
    if (dto.sheetId && !old) throw new NotFoundException('Хуудас олдсонгүй');
    const studentId = old ? old.studentId : (dto.studentId ?? null);
    if (!old && !studentId) throw new BadRequestException('Сурагчаа сонгоно уу');
    const student = studentId
      ? await this.prisma.user.findFirst({
          where: { id: studentId, role: Role.STUDENT },
          select: {
            id: true,
            studentCode: true,
            lastName: true,
            firstName: true,
            enrollments: {
              where: { leftAt: null, classroom: { archived: false } },
              orderBy: { joinedAt: 'desc' },
              take: 1,
              select: { classroomId: true, classroom: { select: { name: true } } },
            },
          },
        })
      : null;
    if (studentId && !student) throw new NotFoundException('Сурагч олдсонгүй');
    const enr = student?.enrollments[0];

    return this.prisma.$transaction(async (tx) => {
      await lockExam(tx, examId);
      if (studentId) {
        const other = await tx.paperExamSheet.findFirst({
          where: { examId, studentId, supersededAt: null, ...(old ? { NOT: { id: old.id } } : {}) },
          select: { id: true },
        });
        if (other)
          throw new ConflictException('Энэ сурагчид дүн байна — тэр мөрийг засна уу');
      }
      const imp = await tx.paperExamImport.create({
        data: {
          examId,
          fileName: 'Гараар засвар',
          fileSha256: 'manual',
          sheetCount: 1,
          matchedCount: studentId ? 1 : 0,
          createdById: actor.userId,
        },
        select: { id: true },
      });
      if (old) {
        // Түгжээний дараа дахин шалгана — зэрэг засвар нэг мөрийг хоёр удаа орлохгүй
        const done = await tx.paperExamSheet.updateMany({
          where: { id: old.id, supersededAt: null },
          data: { supersededAt: new Date(), supersededByImportId: imp.id },
        });
        if (done.count !== 1)
          throw new ConflictException('Энэ хуудсыг өөр хүн дөнгөж засчээ — дахин ачаална уу');
      }
      const sheet = await tx.paperExamSheet.create({
        data: {
          examId,
          importId: imp.id,
          studentId,
          rawCode: old?.rawCode ?? student?.studentCode ?? '',
          rawLastName: old?.rawLastName ?? student?.lastName ?? '',
          rawFirstName: old?.rawFirstName ?? student?.firstName ?? '',
          groupLabel:
            old?.groupLabel ??
            (enr?.classroom.name.replace(/\s*\(.*\)\s*$/, '').trim() || 'Ангигүй'),
          groupTeacher: old?.groupTeacher ?? null,
          classroomId: old?.classroomId ?? enr?.classroomId ?? null,
          answers,
          variant,
          totalScore: g.totalScore,
          maxScore: g.maxScore,
        },
        select: { id: true, totalScore: true, maxScore: true },
      });
      await this.audit(
        tx,
        actor,
        'EDIT_SHEET',
        examId,
        old ? { sheetId: old.id, answers: old.answers, variant: old.variant, totalScore: old.totalScore } : null,
        { sheetId: sheet.id, answers, variant, totalScore: g.totalScore },
      );
      return sheet;
    });
  }

  async searchStudents(q: string) {
    const users = await this.prisma.user.findMany({
      where: {
        role: Role.STUDENT,
        archivedAt: null,
        OR: [
          { firstName: { contains: q, mode: 'insensitive' } },
          { lastName: { contains: q, mode: 'insensitive' } },
          { studentCode: { contains: q, mode: 'insensitive' } },
        ],
      },
      take: 15,
      orderBy: [{ firstName: 'asc' }],
      select: {
        id: true,
        firstName: true,
        lastName: true,
        studentCode: true,
        enrollments: {
          where: { leftAt: null, classroom: { archived: false } },
          select: { classroom: { select: { name: true } } },
        },
      },
    });
    return users.map((u) => ({
      id: u.id,
      name: `${u.lastName} ${u.firstName}`.trim(),
      code: u.studentCode,
      classes: u.enrollments.map((e) => e.classroom.name),
    }));
  }

  /** Бодлогуудад оноосон томьёонууд (нэр + LaTeX) — Томьёоны сангаас. */
  private async formulasFor(items: PaperItem[]) {
    const slugs = [...new Set(items.flatMap((i) => i.formulaSlugs ?? []))];
    if (slugs.length === 0) return [];
    const rows = await this.prisma.formula.findMany({
      where: { slug: { in: slugs } },
      select: { slug: true, name: true, latex: true, general: true },
    });
    return rows.map((f) => ({
      slug: f.slug!,
      title: f.name,
      latex: f.latex ?? f.general ?? null,
    }));
  }

  // ======================= Багшийн хүснэгт =======================

  /** Багш (TEACHER) өөрийн ангийнхаа мөрийг; Багш+/Админ бүгдийг. */
  async board(id: string, actor: Actor) {
    const exam = await this.activeExam(id);
    const all = managesAllClasses(actor.role);
    const sheets = await this.prisma.paperExamSheet.findMany({
      where: { examId: id, supersededAt: null },
      select: {
        id: true,
        studentId: true,
        rawCode: true,
        rawLastName: true,
        rawFirstName: true,
        groupLabel: true,
        groupTeacher: true,
        classroomId: true,
        answers: true,
        variant: true,
        student: {
          select: {
            firstName: true,
            lastName: true,
            studentCode: true,
            enrollments: {
              where: { leftAt: null, classroom: { archived: false } },
              orderBy: { joinedAt: 'desc' },
              take: 1,
              select: { classroom: { select: { name: true } } },
            },
          },
        },
      },
    });
    // Анги = сурагчийн санд хамгийн сүүлд бүртгэгдсэн анги (файлд бичсэн биш, эзэн 2026-11-15)
    for (const s of sheets) {
      const cur = s.student?.enrollments[0]?.classroom.name;
      if (cur) s.groupLabel = cur.replace(/\s*\(.*\)\s*$/, '').trim();
    }
    const items: PaperItem[] = exam.items;
    const graded = sheets.map((s) => {
      const answers = answersOf(s.answers);
      return { s, answers, g: gradeSheet(answers, items, s.variant) };
    });
    // Төвийн эрэмбэ — холбогдсон бүх сурагчаар (багшийн шүүлтээс өмнө)
    const ranked = graded.filter((x) => x.s.studentId);
    const ranks = competitionRanks(ranked.map((x) => x.g.totalScore));
    const rankBy = new Map(ranked.map((x, i) => [x.s.id, ranks[i]]));

    // Багш ч бүх сурагчийн задаргааг харна (эзэн 2026-11-15) — ангиар нь «Багаар» табд эрэмбэлнэ
    const visible = graded;

    const by = classifyBy(items);
    const row = (x: (typeof graded)[number]) => {
      const areas = areaScores([x.g.statuses], items);
      const topics = areaScores([x.g.statuses], items, 'topic');
      return {
        sheetId: x.s.id,
        studentId: x.s.studentId,
        variant: x.s.variant ?? null,
        code: x.s.student?.studentCode ?? x.s.rawCode,
        lastName: x.s.student?.lastName ?? x.s.rawLastName,
        firstName: x.s.student?.firstName ?? x.s.rawFirstName,
        totalScore: x.g.totalScore,
        maxScore: x.g.maxScore,
        pct: pct(x.g.totalScore, x.g.maxScore),
        rank: rankBy.get(x.s.id) ?? null,
        weak: weakAreas(by === 'topic' ? topics : areas),
        areas: areas.map((a) => ({
          area: a.area,
          pct: a.pct,
          earned: a.earned,
          possible: a.possible,
        })),
        topics: topics.map((a) => ({
          area: a.area,
          pct: a.pct,
          earned: a.earned,
          possible: a.possible,
        })),
        statuses: x.g.statuses.map((st) => STATUS_CHAR[st]).join(''),
        answers: x.answers,
      };
    };

    const byGroup = new Map<string, (typeof graded)[number][]>();
    for (const x of visible.filter((v) => v.s.studentId)) {
      byGroup.set(x.s.groupLabel, [...(byGroup.get(x.s.groupLabel) ?? []), x]);
    }
    const groups = [...byGroup.entries()]
      .sort(
        (a, b) =>
          groupOrder(a[0]) - groupOrder(b[0]) ||
          a[0].localeCompare(b[0], 'mn', { numeric: true }),
      )
      .map(([label, list]) => {
        list.sort(
          (a, b) =>
            b.g.totalScore - a.g.totalScore ||
            (a.s.student?.firstName ?? '').localeCompare(
              b.s.student?.firstName ?? '',
              'mn',
            ),
        );
        const statuses = list.map((x) => x.g.statuses);
        const total = list.reduce((t, x) => t + x.g.totalScore, 0);
        const max = list.reduce((t, x) => t + x.g.maxScore, 0);
        return {
          label,
          teacher: list.find((x) => x.s.groupTeacher)?.s.groupTeacher ?? null,
          count: list.length,
          avgScore: list.length
            ? Math.round((total / list.length) * 10) / 10
            : null,
          avgPct: pct(total, max),
          items: itemStats(
            list.map((x) => ({ statuses: x.g.statuses, answers: x.answers })),
            items,
          ),
          areas: areaScores(statuses, items),
          topics: areaScores(statuses, items, 'topic'),
          rows: list.map(row),
        };
      });

    const counted = visible.filter((v) => v.s.studentId);
    const scores = counted.map((x) => x.g.totalScore).sort((a, b) => a - b);
    const sumTotal = scores.reduce((a, b) => a + b, 0);
    const sumMax = counted.reduce((t, x) => t + x.g.maxScore, 0);
    return {
      exam: {
        id: exam.id,
        title: exam.title,
        heldOn: dayOf(exam.heldOn),
        itemCount: exam.itemCount,
        published: exam.published,
      },
      scope: 'ALL' as const,
      guideVariants: await this.guideVariants(id),
      areasList: CONTENT_AREAS,
      topicsList: PAPER_TOPICS,
      classifyBy: by,
      formulas: await this.formulasFor(items),
      items,
      overall: {
        count: counted.length,
        avgScore: counted.length
          ? Math.round((sumTotal / counted.length) * 10) / 10
          : null,
        avgPct: pct(sumTotal, sumMax),
        maxScore: scores.length ? scores[scores.length - 1] : null,
        minScore: scores.length ? scores[0] : null,
        medianScore: scores.length
          ? scores.length % 2
            ? scores[(scores.length - 1) / 2]
            : (scores[scores.length / 2 - 1] + scores[scores.length / 2]) / 2
          : null,
        items: itemStats(
          counted.map((x) => ({ statuses: x.g.statuses, answers: x.answers })),
          items,
        ),
        areas: areaScores(
          counted.map((x) => x.g.statuses),
          items,
        ),
        topics: areaScores(
          counted.map((x) => x.g.statuses),
          items,
          'topic',
        ),
      },
      groups,
      // Холбогдоогүй хуудас — зөвхөн Багш+/Админ (холбох эрхтэй)
      unmatched: all ? graded.filter((x) => !x.s.studentId).map(row) : [],
    };
  }

  // ======================= Сурагч =======================

  async my(studentId: string) {
    const own = await this.prisma.paperExamSheet.findMany({
      where: {
        studentId,
        supersededAt: null,
        exam: { published: true, deletedAt: null },
      },
      select: {
        examId: true,
        totalScore: true,
        maxScore: true,
        exam: { select: { title: true, heldOn: true } },
      },
      orderBy: { exam: { heldOn: 'desc' } },
    });
    if (own.length === 0) return [];
    const others = await this.prisma.paperExamSheet.findMany({
      where: {
        examId: { in: own.map((o) => o.examId) },
        supersededAt: null,
        studentId: { not: null },
      },
      select: { examId: true, totalScore: true },
    });
    return own.map((o) => {
      const scores = others
        .filter((x) => x.examId === o.examId)
        .map((x) => x.totalScore);
      return {
        id: o.examId,
        title: o.exam.title,
        heldOn: dayOf(o.exam.heldOn),
        totalScore: o.totalScore,
        maxScore: o.maxScore,
        pct: pct(o.totalScore, o.maxScore),
        rank: 1 + scores.filter((s) => s > o.totalScore + 1e-9).length,
        participants: scores.length,
      };
    });
  }

  /** Өөрийн дэлгэрэнгүй + төвийн жагсаалт (зөвхөн нэр, баг, нийт оноо). */
  async myDetail(examId: string, studentId: string) {
    const exam = await this.prisma.paperExam.findFirst({
      where: { id: examId, published: true, deletedAt: null },
      include: { items: { select: ITEM_SELECT, orderBy: { number: 'asc' } } },
    });
    if (!exam) throw new NotFoundException('Шалгалт олдсонгүй');
    const sheets = await this.prisma.paperExamSheet.findMany({
      where: { examId, supersededAt: null, studentId: { not: null } },
      select: {
        id: true,
        studentId: true,
        groupLabel: true,
        answers: true,
        variant: true,
        student: { select: { studentCode: true } },
      },
    });
    const mine = sheets.find((s) => s.studentId === studentId);
    if (!mine) throw new NotFoundException('Энэ шалгалтад таны дүн алга');
    const items: PaperItem[] = exam.items;
    const graded = sheets.map((s) => ({
      s,
      answers: answersOf(s.answers),
      g: gradeSheet(answersOf(s.answers), items, s.variant),
    }));
    const ranks = competitionRanks(graded.map((x) => x.g.totalScore));
    const me = graded.find((x) => x.s.id === mine.id)!;
    const myRank = ranks[graded.indexOf(me)];
    const myAreas = areaScores([me.g.statuses], items);
    const myTopics = areaScores([me.g.statuses], items, 'topic');
    const by = classifyBy(items);
    const allStatuses = graded.map((x) => x.g.statuses);
    const centerItems = itemStats(
      graded.map((x) => ({ statuses: x.g.statuses, answers: [] })),
      items,
    );

    const rankText = rankLabels(graded.map((x) => x.g.totalScore));
    const ranking = graded
      .map((x, i) => ({
        rank: ranks[i],
        // «1-2» — ижил оноотой сурагчид байр хуваана
        rankLabel: rankText[i],
        // Жагсаалтад зөвхөн сурагчийн код (нэр харуулахгүй — эзэн 2026-11-15)
        name: x.s.student?.studentCode ?? '',
        group: x.s.groupLabel,
        totalScore: x.g.totalScore,
        maxScore: x.g.maxScore,
        isMe: x.s.id === mine.id,
      }))
      .sort((a, b) => a.rank - b.rank || a.name.localeCompare(b.name, 'mn'));

    return {
      exam: {
        id: exam.id,
        title: exam.title,
        heldOn: dayOf(exam.heldOn),
        itemCount: exam.itemCount,
      },
      me: {
        totalScore: me.g.totalScore,
        maxScore: me.g.maxScore,
        pct: pct(me.g.totalScore, me.g.maxScore),
        rank: myRank,
        participants: graded.length,
        group: mine.groupLabel,
        weak: weakAreas(by === 'topic' ? myTopics : myAreas),
        areas: myAreas,
        topics: myTopics,
        items: items.map((item, i) => {
          const answer = me.answers[i] ?? '';
          // Үсэг (A–E) эсвэл 2-р хэсгийн цифрүүд «2122» («_» хоосон) — сурагчийн бичсэн яг хариу
          const written =
            /^[A-E]$/.test(answer) ||
            ((item.cells ?? 1) > 1 && /[0-9*-]/.test(answer))
              ? answer
              : null;
          const status = me.g.statuses[i];
          return {
            number: item.number,
            label: item.label ?? null,
            cells: item.cells ?? null,
            earned: status === 'CORRECT' ? item.points : 0,
            area: item.area,
            topic: item.topic ?? null,
            formulaSlugs: item.formulaSlugs ?? [],
            // Төвийн сурагчдын хэдэн хувь зөв бодсон (нэгтгэсэн тоо)
            centerPct: centerItems[i]?.pct ?? null,
            points: item.points,
            status: me.g.statuses[i],
            answer: written,
            // Өөрийн хувилбарын зөв хариу (зөв/буруугаар л ирсэн дүнд харуулахгүй)
            key:
              written !== null ||
              answer === '' ||
              answer === '*' ||
              /^_+$/.test(answer)
                ? keyFor(item, mine.variant)
                : null,
          };
        }),
      },
      center: {
        avgPct: pct(
          graded.reduce((t, x) => t + x.g.totalScore, 0),
          graded.reduce((t, x) => t + x.g.maxScore, 0),
        ),
        areas: areaScores(allStatuses, items).map((a) => ({
          area: a.area,
          pct: a.pct,
        })),
        topics: areaScores(allStatuses, items, 'topic').map((a) => ({
          area: a.area,
          pct: a.pct,
        })),
      },
      classifyBy: by,
      formulas: await this.formulasFor(items),
      ranking,
    };
  }

  /** Ачаалсан тайлбарын хувилбарууд («A», «B»); хоосон бол тайлбаргүй. */
  private async guideVariants(examId: string): Promise<string[]> {
    const rows = await this.prisma.paperExamGuide.findMany({
      where: { examId },
      distinct: ['variant'],
      select: { variant: true },
      orderBy: { variant: 'asc' },
    });
    return rows.map((g) => g.variant);
  }

  /**
   * Бодлого бүрийн тайлбар (чанар, санамж, бодолт) — одоохондоо зөвхөн ажилтан
   * (эзэн 2026-11-14: сурагчдад нээхгүй, багш нар үзнэ).
   */
  async guide(examId: string, variant: string) {
    await this.activeExam(examId);
    const entries = await this.prisma.paperExamGuide.findMany({
      where: { examId, variant },
      select: { label: true, number: true, content: true },
      orderBy: { order: 'asc' },
    });
    if (entries.length === 0) throw new NotFoundException('Тайлбар олдсонгүй');
    return { variant, entries };
  }

  // ======================= Сурагчийн тайлбар, материал =======================

  /** Сурагчийн нийтэлсэн шалгалтын хуудас (хувилбар, хариу) — байхгүй бол 404 */
  private async mySheet(examId: string, studentId: string) {
    const sheet = await this.prisma.paperExamSheet.findFirst({
      where: {
        examId,
        studentId,
        supersededAt: null,
        exam: { published: true, deletedAt: null },
      },
      select: { variant: true, answers: true },
    });
    if (!sheet) throw new NotFoundException('Энэ шалгалтад таны дүн алга');
    return sheet;
  }

  /** Сурагчийн АЛДСАН бодлогын тайлбарын мөрүүд — өөрийн хувилбараас л */
  private async myMissedGuides(examId: string, studentId: string) {
    const sheet = await this.mySheet(examId, studentId);
    const variant = sheet.variant ?? '';
    const [exam, rows] = await Promise.all([
      this.activeExam(examId),
      this.prisma.paperExamGuide.findMany({
        where: { examId, variant },
        select: { label: true, number: true, content: true },
        orderBy: { order: 'asc' },
      }),
    ]);
    const items: PaperItem[] = exam.items;
    const { statuses } = gradeSheet(answersOf(sheet.answers), items, sheet.variant);
    const guides = (rows as unknown as GuideRow[]).filter((r) =>
      isMissed(r, items, statuses),
    );
    return { variant, guides };
  }

  /** Алдсан бодлогууд: нөхцөл, сонголт л (бодолт, хариугүй) */
  async myGuide(examId: string, studentId: string) {
    const { variant, guides } = await this.myMissedGuides(examId, studentId);
    return { variant, entries: guides.map(publicGuide) };
  }

  /** Нэг бодлогын санамжийн шат (1 чанар … 3+k бодолтын алхам, сүүлд хариу) */
  async myGuideStage(
    examId: string,
    studentId: string,
    label: string,
    stage: number,
  ) {
    const { guides } = await this.myMissedGuides(examId, studentId);
    const row = guides.find((g) => g.label === label);
    if (!row) throw new NotFoundException('Бодлого олдсонгүй');
    return guideStage(row, stage);
  }

  /** Дахин оролдлого — зөв хариуг клиент рүү илгээхгүйгээр шалгана */
  async myGuideCheck(
    examId: string,
    studentId: string,
    label: string,
    answer: unknown,
  ) {
    const { guides } = await this.myMissedGuides(examId, studentId);
    const row = guides.find((g) => g.label === label);
    if (!row) throw new NotFoundException('Бодлого олдсонгүй');
    return checkGuide(row, answer);
  }

  /**
   * Шалгалтын материалын хуудсууд (лого усан тэмдэгтэй JPEG) — StoredFile
   * `paperexam-<examId>-<хувилбар>-<n>.jpg`. Харах л зориулалттай (татах товчгүй).
   */
  private async materialPages(examId: string, variant: string) {
    const prefix = `paperexam-${examId}-${variant}-`;
    const files = await this.prisma.storedFile.findMany({
      where: { key: { startsWith: prefix } },
      select: { key: true },
    });
    const keys = files
      .map((f) => ({ key: f.key, n: Number(f.key.slice(prefix.length).split('.')[0]) }))
      .filter((f) => Number.isInteger(f.n))
      .sort((a, b) => a.n - b.n);
    const pages: string[] = [];
    for (const { key } of keys) {
      const file = await readStoredBytes(this.prisma, key);
      if (file) pages.push(`data:${file.mime};base64,${file.bytes.toString('base64')}`);
    }
    return { variant, pages };
  }

  /** Сурагч — зөвхөн өөрийн хувилбарын материал */
  async myMaterial(examId: string, studentId: string) {
    const sheet = await this.mySheet(examId, studentId);
    return this.materialPages(examId, sheet.variant ?? '');
  }

  /** Ажилтан — дурын хувилбар */
  async material(examId: string, variant: string) {
    await this.activeExam(examId);
    return this.materialPages(examId, variant);
  }

  /**
   * Дүнгийн жагсаалт: Дүн | Сурагчийн код | Байр («1-2» — ижил оноотой хуваана).
   * Нэр, хариу буцаахгүй. Сурагч зөвхөн нийтэлсэн шалгалтынхыг харна; ажилтан үргэлж.
   * Сурагчтай холбогдоогүй хуудас жагсаалтад орохгүй.
   */
  async ranking(examId: string, actor: Actor) {
    const isStudent = actor.role === Role.STUDENT;
    const exam = await this.prisma.paperExam.findFirst({
      where: {
        id: examId,
        deletedAt: null,
        ...(isStudent ? { published: true } : {}),
      },
      select: { id: true, title: true, heldOn: true, published: true },
    });
    if (!exam) throw new NotFoundException('Шалгалт олдсонгүй');
    const sheets = await this.prisma.paperExamSheet.findMany({
      where: { examId, supersededAt: null, studentId: { not: null } },
      select: {
        totalScore: true,
        maxScore: true,
        rawCode: true,
        student: { select: { studentCode: true } },
      },
    });
    const labels = rankLabels(sheets.map((s) => s.totalScore));
    const rows = sheets
      .map((s, i) => ({
        score: s.totalScore,
        maxScore: s.maxScore,
        code: s.student?.studentCode ?? s.rawCode,
        rank: labels[i],
      }))
      .sort((a, b) => b.score - a.score || a.code.localeCompare(b.code));
    return {
      exam: {
        id: exam.id,
        title: exam.title,
        heldOn: dayOf(exam.heldOn),
        published: exam.published,
      },
      rows,
    };
  }
}
