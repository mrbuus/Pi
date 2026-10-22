import { ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { applyProblemSnapshot, applyTestSnapshot } from './revision-apply';
import { mergeProblemSnapshots, mergeTestSnapshots } from './revision-merge';
import {
  AnySnapshot,
  changedProblemGroups,
  parseProblemSnapshot,
  parseTestSnapshot,
  problemSnapshotOf,
  ProblemSnapshot,
  RevisionActionName,
  RevisionEntityName,
  shortName,
  snapshotsEqual,
  summarizeProblemChange,
  summarizeTestChange,
  testSnapshotOf,
  TestSnapshot,
} from './revision-snapshot';

/**
 * Буцаах ба өөрчлөлтийн түүх — засварын transaction ДОТОР ашиглах туслахууд.
 *
 *   await prisma.$transaction(async (tx) => {
 *     const rev = await beginRevision(tx, 'PROBLEM', id, { expectedVersion });
 *     … бодлогыг өөрчилнө …
 *     const { version } = await commitRevision(tx, rev, { actor, action: 'UPDATE' });
 *   });
 *
 * beginRevision: мөрийг FOR UPDATE түгжиж, өмнөх төлөвийг уншина. expectedVersion
 *   зөрвөл (тэр хооронд өөр багш хадгалсан) багшийн ачаалсан хувилбарыг түүхээс
 *   уншиж «base» болгоно — шууд 409 биш (docs/v2/ZEREG-ZASVAR-TOLOVLOGOO.md §2).
 * commitRevision: дараах төлөвийг уншина. base байвал 3-way merge: өөр өөр талбар →
 *   бусдын өөрчлөлтийг хадгалж нэгтгэнэ; ижил талбарыг хоёулаа өөрөөр → 409 (талбарын
 *   нэртэй). Өөрчлөгдсөн бол ContentRevision бичиж version-ийг +1 болгоно. Хуучин
 *   мөрийн анхны засварт хувилбар 0-ийг залхуугаар үүсгэнэ. Өөрчлөлтгүй бол юу ч
 *   бичихгүй. Түүх: «Анхны хувилбар» + сүүлийн REVISION_KEEP хувилбар.
 *
 * Nest DI-гүй (цэвэр функц) — DocumentImport `new ContentService(tx)`, импортын
 * скрипт (prisma/import-1000.cjs → dist) хоёулаа ашиглана.
 */

export type RevisionDb = Prisma.TransactionClient;

/** Бодлого/тест бүрт хадгалах сүүлийн хувилбарын тоо («Анхны хувилбар» тусдаа үлдэнэ). */
export const REVISION_KEEP = 30;
/** Цэвэрлэгээг хадгалалт бүрт биш, PRUNE_EVERY хувилбар тутамд нэг (ачаалал бага). */
const PRUNE_EVERY = 10;

export interface RevisionActor {
  id: string;
  role: string;
}

export const PROBLEM_SNAPSHOT_SELECT = {
  id: true,
  version: true,
  createdById: true,
  createdAt: true,
  deletedAt: true,
  statementText: true,
  imageKey: true,
  format: true,
  points: true,
  choices: true,
  correctAnswer: true,
  scoringGroups: true,
  youtubeUrl: true,
  choiceOptions: {
    select: {
      label: true,
      text: true,
      isCorrect: true,
      mistakeType: true,
      mistakeNote: true,
      order: true,
    },
    orderBy: { order: 'asc' },
  },
  tags: { select: { tag: { select: { id: true, type: true, name: true } } } },
  analysis: { select: { solutionOutline: true, answerKeyStatus: true } },
} satisfies Prisma.ProblemSelect;

export const TEST_SNAPSHOT_SELECT = {
  id: true,
  version: true,
  createdById: true,
  createdAt: true,
  deletedAt: true,
  title: true,
  type: true,
  gradingMode: true,
  timeLimitMin: true,
  price: true,
  chapterId: true,
  pdfKey: true,
  groupKey: true,
  variantLabel: true,
  problems: {
    select: { problemId: true, order: true, points: true },
    orderBy: { order: 'asc' },
  },
  access: { select: { classroomId: true } },
} satisfies Prisma.TestSelect;

interface LoadedRow {
  id: string;
  version: number;
  createdById: string;
  createdAt: Date;
  deletedAt: Date | null;
  snapshot: AnySnapshot;
}

export interface RevisionHandle {
  entity: RevisionEntityName;
  id: string;
  /** Засварын өмнөх хувилбарын дугаар */
  version: number;
  /** null — шинээр үүсгэсэн (CREATE/IMPORT) */
  before: AnySnapshot | null;
  createdById: string;
  createdAt: Date;
  deletedAt: Date | null;
  /** Багшийн ачаалсан (хуучирсан) хувилбар — байвал commit дээр нэгтгэнэ */
  base?: { version: number; snapshot: AnySnapshot } | null;
  /** «Миний хувилбарыг хадгалах» — нэгтгэлийн зөрчилд миний утга */
  preferMine?: boolean;
}

export interface CommitOptions {
  actor: RevisionActor;
  action: RevisionActionName;
  reason?: string | null;
  /** Товч тайлбар: мөр — бэлэн, функц — snapshot-оос бодсоныг өөрчилнө */
  summary?: string | ((computed: string, handle: RevisionHandle) => string);
  now?: Date;
}

export interface CommitResult {
  version: number;
  changed: boolean;
  summary: string | null;
  /**
   * Хуучирсан хувилбараас хадгалж, бусдын өөрчлөлттэй автоматаар нэгтгэсэн бол
   * тэдний нэр («Б. Баасанжав»; өөрөө өөр цонхноос бол хоосон). Нэгтгээгүй — null.
   */
  mergedWith: string[] | null;
}

const BASELINE_SUMMARY = 'Анхны хувилбар';

/** PrismaService эсвэл transaction аль алинд нь ажиллана (давхар transaction үүсгэхгүй). */
export function runInTransaction<T>(
  db: unknown,
  fn: (tx: RevisionDb) => Promise<T>,
  options?: { timeout?: number; maxWait?: number },
): Promise<T> {
  const client = db as {
    $transaction?: (
      cb: (tx: RevisionDb) => Promise<T>,
      o?: unknown,
    ) => Promise<T>;
  };
  if (typeof client.$transaction === 'function')
    return client.$transaction(fn, options);
  return fn(db as RevisionDb);
}

function uniq(ids: string[]): string[] {
  return [...new Set(ids)];
}

async function lockRows(
  db: RevisionDb,
  entity: RevisionEntityName,
  ids: string[],
) {
  if (ids.length === 0) return;
  const table =
    entity === 'PROBLEM' ? Prisma.raw('"Problem"') : Prisma.raw('"Test"');
  // Тогтмол дарааллаар түгжинэ — олон мөрийн зэрэг засварт deadlock-оос сэргийлнэ.
  await db.$queryRaw(
    Prisma.sql`SELECT "id" FROM ${table} WHERE "id" IN (${Prisma.join(ids)}) ORDER BY "id" FOR UPDATE`,
  );
}

export async function loadSnapshots(
  db: RevisionDb,
  entity: RevisionEntityName,
  ids: string[],
): Promise<Map<string, LoadedRow>> {
  const out = new Map<string, LoadedRow>();
  if (ids.length === 0) return out;
  if (entity === 'PROBLEM') {
    const rows = await db.problem.findMany({
      where: { id: { in: ids } },
      select: PROBLEM_SNAPSHOT_SELECT,
    });
    for (const row of rows) {
      out.set(row.id, {
        id: row.id,
        version: row.version ?? 0,
        createdById: row.createdById,
        createdAt: row.createdAt,
        deletedAt: row.deletedAt ?? null,
        snapshot: problemSnapshotOf(row),
      });
    }
  } else {
    const rows = await db.test.findMany({
      where: { id: { in: ids } },
      select: TEST_SNAPSHOT_SELECT,
    });
    for (const row of rows) {
      out.set(row.id, {
        id: row.id,
        version: row.version ?? 0,
        createdById: row.createdById,
        createdAt: row.createdAt,
        deletedAt: row.deletedAt ?? null,
        snapshot: testSnapshotOf(row),
      });
    }
  }
  return out;
}

/** «Таныг засаж байх хооронд Б. Баасанжав өөрчилсөн» — 409 хариу. */
export async function versionConflict(
  db: RevisionDb,
  entity: RevisionEntityName,
  id: string,
  currentVersion: number,
  /** Хоёулаа өөрчилсөн талбарууд (нэгтгэж чадаагүй) — хоосон бол ерөнхий зөрөө */
  fields: string[] = [],
): Promise<ConflictException> {
  const last = await db.contentRevision.findFirst({
    where: { entity, entityId: id },
    orderBy: { version: 'desc' },
    select: { actorId: true, createdAt: true },
  });
  const user = last
    ? await db.user.findUnique({
        where: { id: last.actorId },
        select: { firstName: true, lastName: true, role: true },
      })
    : null;
  const name = user ? shortName(user) : null;
  const who = name ?? 'өөр хүн';
  return new ConflictException({
    statusCode: 409,
    code: 'VERSION_CONFLICT',
    message: fields.length
      ? `Таныг засаж байх хооронд ${who} ижил хэсгийг өөрчилсөн: ${fields.join(', ')}`
      : `Таныг засаж байх хооронд ${who} өөрчилсөн`,
    currentVersion,
    changedBy: name,
    changedAt: last?.createdAt ?? null,
    fields,
  });
}

/**
 * Олон мөрийн засварыг эхлүүлнэ (түгжинэ + өмнөх төлөв). Байхгүй мөр → 404.
 * expectedVersion зөвхөн нэг мөртэй үед шалгагдана.
 */
export interface BeginOptions {
  expectedVersion?: number | null;
  /**
   * false — хуучирсан бол нэгтгэхгүй, шууд 409. Хувилбар сэргээх нь «яг k-р
   * хувилбар шиг болго» гэсэн үйлдэл тул тэр хооронд өөрчлөгдсөн бол асууна.
   */
  merge?: boolean;
  /**
   * 409-ийн дараа «Миний хувилбарыг хадгалах»: зөрчилтэй талбарт энэ хадгалалтын
   * утга, бусад талбарт нэгтгэнэ. Суурь түүх цэвэрлэгдсэн бол бүтнээр нь дарна.
   */
  overwrite?: boolean;
}

export async function beginRevisions(
  db: RevisionDb,
  entity: RevisionEntityName,
  ids: string[],
  opts: BeginOptions = {},
): Promise<RevisionHandle[]> {
  const list = uniq(ids);
  await lockRows(db, entity, list);
  const rows = await loadSnapshots(db, entity, list);
  const handles: RevisionHandle[] = [];
  for (const id of list) {
    const row = rows.get(id);
    if (!row)
      throw new NotFoundException(
        entity === 'PROBLEM' ? 'Бодлого олдсонгүй' : 'Тест олдсонгүй',
      );
    handles.push({
      entity,
      id,
      version: row.version,
      before: row.snapshot,
      createdById: row.createdById,
      createdAt: row.createdAt,
      deletedAt: row.deletedAt,
    });
  }
  const expected = opts.expectedVersion;
  if (
    list.length === 1 &&
    expected !== undefined &&
    expected !== null &&
    expected !== handles[0].version
  ) {
    // Хуучирсан: шууд 409 биш — ачаалсан хувилбарыг түүхээс уншиж commit дээр нэгтгэнэ.
    // Түүх цэвэрлэгдсэн (эсвэл ирээдүйн дугаар) бол нэгтгэх суурьгүй тул 409.
    const base =
      opts.merge !== false && expected < handles[0].version
        ? await loadRevisionSnapshot(db, entity, list[0], expected)
        : null;
    if (base) {
      handles[0].base = { version: expected, snapshot: base };
      handles[0].preferMine = opts.overwrite === true;
    } else if (!(opts.overwrite && opts.merge !== false)) {
      throw await versionConflict(db, entity, list[0], handles[0].version);
    }
  }
  return handles;
}

async function loadRevisionSnapshot(
  db: RevisionDb,
  entity: RevisionEntityName,
  id: string,
  version: number,
): Promise<AnySnapshot | null> {
  const row = await db.contentRevision.findUnique({
    where: { entity_entityId_version: { entity, entityId: id, version } },
    select: { snapshot: true },
  });
  if (!row) return null;
  return entity === 'PROBLEM'
    ? parseProblemSnapshot(row.snapshot)
    : parseTestSnapshot(row.snapshot);
}

/** base-аас хойш хадгалсан бусад хүний нэр (нэгтгэлийн мэдэгдэлд). */
async function editorsSince(
  db: RevisionDb,
  entity: RevisionEntityName,
  id: string,
  version: number,
  selfId: string,
): Promise<string[]> {
  const rows = await db.contentRevision.findMany({
    where: {
      entity,
      entityId: id,
      version: { gt: version },
      actorId: { not: selfId },
    },
    select: { actorId: true },
    distinct: ['actorId'],
  });
  if (rows.length === 0) return [];
  const users = await db.user.findMany({
    where: { id: { in: rows.map((r) => r.actorId) } },
    select: { firstName: true, lastName: true, role: true },
  });
  return users.map((u) => shortName(u));
}

/**
 * 3-way merge: base (ачаалсан) · theirs (одоогийн) · mine (энэ хадгалалтын дараах).
 * Зөрчилтэй бол 409 (transaction буцна — юу ч бичигдэхгүй). Нэгтгэсэн төлөв mine-аас
 * ялгаатай бол (энэ багш хуучин утгаа дахин илгээж бусдынхыг дарсан) тэр хэсгийг
 * бусдын утгаар буцааж бичээд шинэ төлөвийг буцаана.
 */
async function mergeStale(
  db: RevisionDb,
  handle: RevisionHandle,
  mine: LoadedRow,
): Promise<LoadedRow> {
  const base = handle.base!.snapshot;
  const theirs = handle.before!;
  const outcome =
    handle.entity === 'PROBLEM'
      ? mergeProblemSnapshots(
          base as ProblemSnapshot,
          mine.snapshot as ProblemSnapshot,
          theirs as ProblemSnapshot,
          { preferMine: handle.preferMine },
        )
      : mergeTestSnapshots(
          base as TestSnapshot,
          mine.snapshot as TestSnapshot,
          theirs as TestSnapshot,
          { preferMine: handle.preferMine },
        );
  // «Миний хувилбарыг хадгалах» — зөрчилтэй талбарт миний утга (pick → mine)
  if (outcome.conflicts.length > 0 && !handle.preferMine)
    throw await versionConflict(
      db,
      handle.entity,
      handle.id,
      handle.version,
      outcome.conflicts,
    );
  if (snapshotsEqual(outcome.merged, mine.snapshot)) return mine;
  if (handle.entity === 'PROBLEM') {
    await applyProblemSnapshot(
      db,
      handle.id,
      outcome.merged as ProblemSnapshot,
      changedProblemGroups(
        mine.snapshot as ProblemSnapshot,
        outcome.merged as ProblemSnapshot,
      ),
    );
  } else {
    await applyTestSnapshot(
      db,
      handle.id,
      mine.snapshot as TestSnapshot,
      outcome.merged as TestSnapshot,
    );
  }
  const reloaded = (await loadSnapshots(db, handle.entity, [handle.id])).get(
    handle.id,
  );
  if (!reloaded)
    throw new NotFoundException(
      handle.entity === 'PROBLEM' ? 'Бодлого олдсонгүй' : 'Тест олдсонгүй',
    );
  return reloaded;
}

export async function beginRevision(
  db: RevisionDb,
  entity: RevisionEntityName,
  id: string,
  opts: BeginOptions = {},
): Promise<RevisionHandle> {
  const [handle] = await beginRevisions(db, entity, [id], opts);
  return handle;
}

/** Шинээр үүсгэсэн мөрийн хувилбар 0-ийг бичих handle. */
export function createdHandle(
  entity: RevisionEntityName,
  id: string,
): RevisionHandle {
  return {
    entity,
    id,
    version: 0,
    before: null,
    createdById: '',
    createdAt: new Date(0),
    deletedAt: null,
  };
}

function toJson(snapshot: AnySnapshot): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(snapshot)) as Prisma.InputJsonValue;
}

function classIdsChanged(a: TestSnapshot, b: TestSnapshot): string[] {
  const x = new Set(a.classroomIds);
  const y = new Set(b.classroomIds);
  return [
    ...a.classroomIds.filter((id) => !y.has(id)),
    ...b.classroomIds.filter((id) => !x.has(id)),
  ];
}

/**
 * Засварыг дуусгана: өөрчлөгдсөн мөр бүрд ContentRevision (+ шаардлагатай бол
 * хувилбар 0) бичиж, version-ийг +1 болгоно. Цөөн query (мөрийн тооноос үл хамаарна).
 */
export async function commitRevisions(
  db: RevisionDb,
  handles: RevisionHandle[],
  opts: CommitOptions,
): Promise<Map<string, CommitResult>> {
  const results = new Map<string, CommitResult>();
  const now = opts.now ?? new Date();
  for (const entity of ['PROBLEM', 'TEST'] as RevisionEntityName[]) {
    const group = handles.filter((h) => h.entity === entity);
    if (group.length === 0) continue;
    const after = await loadSnapshots(db, entity, uniq(group.map((h) => h.id)));

    const changed: {
      handle: RevisionHandle;
      row: LoadedRow;
      created: boolean;
    }[] = [];
    const mergedWith = new Map<string, string[]>();
    for (const handle of group) {
      let row = after.get(handle.id);
      if (!row)
        throw new NotFoundException(
          entity === 'PROBLEM' ? 'Бодлого олдсонгүй' : 'Тест олдсонгүй',
        );
      if (handle.base && handle.before) {
        row = await mergeStale(db, handle, row);
        mergedWith.set(
          handle.id,
          await editorsSince(
            db,
            entity,
            handle.id,
            handle.base.version,
            opts.actor.id,
          ),
        );
      }
      if (handle.before && snapshotsEqual(handle.before, row.snapshot)) {
        results.set(handle.id, {
          version: handle.version,
          changed: false,
          summary: null,
          mergedWith: mergedWith.get(handle.id) ?? null,
        });
        continue;
      }
      changed.push({ handle, row, created: handle.before === null });
    }
    if (changed.length === 0) continue;

    // ---- Хувилбар 0 (засварын өмнөх төлөв) — хуучин мөрийн анхны засварт ----
    const needBaseline = changed.filter(
      (c) => !c.created && c.handle.version === 0,
    );
    if (needBaseline.length > 0) {
      const existing = await db.contentRevision.findMany({
        where: {
          entity,
          entityId: { in: needBaseline.map((c) => c.handle.id) },
          version: 0,
        },
        select: { entityId: true },
      });
      const has = new Set(existing.map((r) => r.entityId));
      const missing = needBaseline.filter((c) => !has.has(c.handle.id));
      if (missing.length > 0) {
        const creators = await db.user.findMany({
          where: { id: { in: uniq(missing.map((c) => c.handle.createdById)) } },
          select: { id: true, role: true },
        });
        const roleOf = new Map(creators.map((u) => [u.id, String(u.role)]));
        await db.contentRevision.createMany({
          data: missing.map((c) => ({
            entity,
            entityId: c.handle.id,
            version: 0,
            snapshot: toJson(c.handle.before!),
            summary: BASELINE_SUMMARY,
            action: 'CREATE' as const,
            actorId: c.handle.createdById,
            actorRole: roleOf.get(c.handle.createdById) ?? 'UNKNOWN',
            createdAt: c.handle.createdAt,
          })),
          skipDuplicates: true,
        });
      }
    }

    // ---- Тестийн товч тайлбарт ангийн нэр ----
    let classNames = new Map<string, string>();
    if (entity === 'TEST') {
      const ids = uniq(
        changed.flatMap((c) =>
          c.handle.before
            ? classIdsChanged(
                c.handle.before as TestSnapshot,
                c.row.snapshot as TestSnapshot,
              )
            : [],
        ),
      );
      if (ids.length > 0) {
        const rows = await db.classroom.findMany({
          where: { id: { in: ids } },
          select: { id: true, name: true },
        });
        classNames = new Map(rows.map((r) => [r.id, r.name]));
      }
    }

    const reason = opts.reason?.trim()
      ? opts.reason.trim().slice(0, 500)
      : null;
    const records = changed.map((c) => {
      const computed =
        entity === 'PROBLEM'
          ? summarizeProblemChange(
              c.handle.before as ProblemSnapshot | null,
              c.row.snapshot as ProblemSnapshot,
            )
          : summarizeTestChange(
              c.handle.before as TestSnapshot | null,
              c.row.snapshot as TestSnapshot,
              classNames,
            );
      const summary =
        typeof opts.summary === 'function'
          ? opts.summary(computed, c.handle)
          : (opts.summary ?? computed);
      const version = c.created ? c.row.version : c.handle.version + 1;
      return { ...c, version, summary: summary.slice(0, 300) };
    });

    await db.contentRevision.createMany({
      data: records.map((r) => ({
        entity,
        entityId: r.handle.id,
        version: r.version,
        snapshot: toJson(r.row.snapshot),
        summary: r.summary,
        action: opts.action,
        actorId: opts.actor.id,
        actorRole: opts.actor.role,
        reason,
        createdAt: now,
      })),
    });

    const bumped = records.filter((r) => !r.created).map((r) => r.handle.id);
    const created = records.filter((r) => r.created).map((r) => r.handle.id);
    const stamp = { updatedAt: now, updatedById: opts.actor.id };
    if (entity === 'PROBLEM') {
      if (bumped.length)
        await db.problem.updateMany({
          where: { id: { in: bumped } },
          data: { ...stamp, version: { increment: 1 } },
        });
      if (created.length)
        await db.problem.updateMany({
          where: { id: { in: created } },
          data: stamp,
        });
    } else {
      if (bumped.length)
        await db.test.updateMany({
          where: { id: { in: bumped } },
          data: { ...stamp, version: { increment: 1 } },
        });
      if (created.length)
        await db.test.updateMany({
          where: { id: { in: created } },
          data: stamp,
        });
    }
    for (const r of records)
      results.set(r.handle.id, {
        version: r.version,
        changed: true,
        summary: r.summary,
        mergedWith: mergedWith.get(r.handle.id) ?? null,
      });

    // ---- Түүхийн хязгаар: «Анхны хувилбар» + сүүлийн REVISION_KEEP ----
    for (const r of records) {
      if (
        r.created ||
        r.version <= REVISION_KEEP ||
        r.version % PRUNE_EVERY !== 0
      )
        continue;
      await db.contentRevision.deleteMany({
        where: {
          entity,
          entityId: r.handle.id,
          version: { gt: 0, lte: r.version - REVISION_KEEP },
        },
      });
    }
  }
  return results;
}

export async function commitRevision(
  db: RevisionDb,
  handle: RevisionHandle,
  opts: CommitOptions,
): Promise<CommitResult> {
  const results = await commitRevisions(db, [handle], opts);
  return results.get(handle.id)!;
}

/** Шинэ бодлого/тест — хувилбар 0 (CREATE эсвэл IMPORT). */
export function recordCreated(
  db: RevisionDb,
  entity: RevisionEntityName,
  id: string,
  opts: CommitOptions,
): Promise<CommitResult> {
  return commitRevision(db, createdHandle(entity, id), opts);
}
