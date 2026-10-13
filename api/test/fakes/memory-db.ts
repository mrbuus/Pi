/**
 * Өөрчлөлтийн түүхийн unit тестэд зориулсан ЖИЖИГ санах ойн Prisma дуураймал.
 * Зөвхөн revisions/*, classification, content, exams, thousand, tests-ийн
 * засварын замуудын дууддаг query-г хэрэгжүүлнэ (select-ийг үл тоож бүх талбар,
 * nested мөрийг буцаана — snapshot нь хэрэгтэйгээ л уншина).
 * $transaction алдаа гарвал бүх хүснэгтийг өмнөх төлөвт нь буцаана (Postgres шиг) —
 * зэрэг засварын зөрчил (409) бичсний ДАРАА commit дээр илэрдэг.
 * api/test/ нь nest build-ээс гадуур.
 */
import { Prisma } from '../../src/generated/prisma/client';

type Row = Record<string, any>;

let seq = 0;
const newId = (prefix: string) => `${prefix}-${++seq}`;

function unwrapJson(v: unknown): unknown {
  if (v === Prisma.DbNull || v === Prisma.JsonNull || v === Prisma.AnyNull) return null;
  return v;
}

function applyData(row: Row, data: Row) {
  for (const [k, v] of Object.entries(data)) {
    if (v && typeof v === 'object' && 'increment' in (v as Row)) row[k] = (row[k] ?? 0) + (v as Row).increment;
    else row[k] = unwrapJson(v);
  }
}

function idIn(where: Row | undefined, id: string): boolean {
  const w = where?.id;
  if (w === undefined) return true;
  if (typeof w === 'string') return w === id;
  if (w && Array.isArray(w.in)) return w.in.includes(id);
  return false;
}

export class MemoryDb {
  users: Row[] = [];
  classrooms: Row[] = [];
  problems: Row[] = [];
  choices: Row[] = [];
  tags: Row[] = [];
  problemTags: Row[] = [];
  analyses: Row[] = [];
  tests: Row[] = [];
  testProblems: Row[] = [];
  accessRows: Row[] = [];
  results: Row[] = [];
  sessions: Row[] = [];
  revisions: Row[] = [];
  audits: Row[] = [];

  // ---------- seed helpers ----------
  addUser(u: Partial<Row> & { id: string; role: string }) {
    this.users.push({ firstName: 'Нэр', lastName: 'Овог', archivedAt: null, externalTeacherProfile: null, ...u });
  }

  addProblem(p: Partial<Row> & { id: string }, choices: Row[] = [], tagNames: { type: string; name: string }[] = []) {
    this.problems.push({
      token: p.id,
      chapterId: 'ch',
      createdById: 'creator',
      createdAt: new Date('2026-01-01T00:00:00Z'),
      deletedAt: null,
      version: 0,
      updatedAt: null,
      updatedById: null,
      statementText: 'Бодлого',
      imageKey: null,
      format: 'CHOICE',
      points: 1,
      choices: null,
      correctAnswer: null,
      scoringGroups: null,
      youtubeUrl: null,
      ...p,
    });
    choices.forEach((c, i) =>
      this.choices.push({ problemId: p.id, mistakeType: c.isCorrect ? 'NONE' : 'OTHER', mistakeNote: null, order: i + 1, ...c }),
    );
    for (const t of tagNames) {
      const tag = this.ensureTag(t.type, t.name);
      this.problemTags.push({ problemId: p.id, tagId: tag.id });
    }
  }

  ensureTag(type: string, name: string): Row {
    let tag = this.tags.find((t) => t.type === type && t.name === name);
    if (!tag) {
      tag = { id: newId('tag'), type, name };
      this.tags.push(tag);
    }
    return tag;
  }

  addTest(t: Partial<Row> & { id: string }, problems: Row[] = [], classIds: string[] = []) {
    this.tests.push({
      title: 'Тест',
      type: 'DAILY',
      gradingMode: 'AUTO',
      chapterId: null,
      timeLimitMin: 40,
      pdfKey: null,
      price: null,
      groupKey: null,
      variantLabel: null,
      createdById: 'creator',
      createdAt: new Date('2026-01-01T00:00:00Z'),
      deletedAt: null,
      isDraft: false,
      version: 0,
      updatedAt: null,
      updatedById: null,
      ...t,
    });
    problems.forEach((p) => this.testProblems.push({ testId: t.id, ...p }));
    classIds.forEach((classroomId) => this.accessRows.push({ testId: t.id, classroomId }));
  }

  // ---------- views ----------
  private problemView(p: Row): Row {
    return {
      ...p,
      choiceOptions: this.choices
        .filter((c) => c.problemId === p.id)
        .sort((a, b) => a.order - b.order)
        .map((c) => ({ id: `${c.problemId}:${c.label}`, ...c })),
      tags: this.problemTags
        .filter((pt) => pt.problemId === p.id)
        .map((pt) => ({ problemId: p.id, tagId: pt.tagId, tag: this.tags.find((t) => t.id === pt.tagId) })),
      analysis: this.analyses.find((a) => a.problemId === p.id) ?? null,
    };
  }

  private testView(t: Row): Row {
    return {
      ...t,
      problems: this.testProblems
        .filter((tp) => tp.testId === t.id)
        .sort((a, b) => a.order - b.order)
        .map((tp) => ({ ...tp, problem: this.problems.find((p) => p.id === tp.problemId) })),
      access: this.accessRows.filter((a) => a.testId === t.id).map((a) => ({ ...a })),
    };
  }

  private takenWhere(where: Row, rows: Row[]): number {
    return rows.filter((r) => {
      if (where.testId && r.testId !== where.testId) return false;
      if (where.status && r.status !== where.status) return false;
      const pid = where.test?.problems?.some?.problemId;
      if (pid && !this.testProblems.some((tp) => tp.testId === r.testId && tp.problemId === pid)) return false;
      return true;
    }).length;
  }

  // ---------- Prisma subset ----------
  $queryRaw = async () => [];
  private static readonly TABLES = [
    'users', 'classrooms', 'problems', 'choices', 'tags', 'problemTags', 'analyses',
    'tests', 'testProblems', 'accessRows', 'results', 'sessions', 'revisions', 'audits',
  ] as const;
  $transaction = async (fn: unknown) => {
    if (typeof fn !== 'function') return Promise.all(fn as Promise<unknown>[]);
    const saved = MemoryDb.TABLES.map((t) => structuredClone(this[t]));
    try {
      return await (fn as (tx: MemoryDb) => unknown)(this);
    } catch (e) {
      MemoryDb.TABLES.forEach((t, i) => (this[t] = saved[i]));
      throw e;
    }
  };

  user = {
    findUnique: async ({ where }: Row) => this.users.find((u) => u.id === where.id) ?? null,
    findMany: async ({ where }: Row = {}) => this.users.filter((u) => idIn(where, u.id)),
  };

  classroom = {
    findUnique: async ({ where }: Row) => this.classrooms.find((c) => c.id === where.id) ?? null,
    findMany: async ({ where }: Row = {}) =>
      this.classrooms.filter(
        (c) =>
          idIn(where, c.id) &&
          (where?.teacherId === undefined || c.teacherId === where.teacherId) &&
          (where?.archived === undefined || c.archived === where.archived),
      ),
    count: async ({ where }: Row = {}) => (await this.classroom.findMany({ where })).length,
  };

  problem = {
    findUnique: async ({ where }: Row) => {
      const p = this.problems.find((x) => x.id === where.id || (where.token && x.token === where.token));
      return p ? this.problemView(p) : null;
    },
    findUniqueOrThrow: async (args: Row) => {
      const p = await this.problem.findUnique(args);
      if (!p) throw new Error('P2025');
      return p;
    },
    findMany: async ({ where }: Row = {}) =>
      this.problems.filter((p) => idIn(where, p.id)).map((p) => this.problemView(p)),
    create: async ({ data }: Row) => {
      const id = data.id ?? newId('problem');
      const { choiceOptions, tags, formulas, ...rest } = data;
      void formulas;
      this.addProblem({ ...rest, id, createdAt: new Date() });
      for (const c of choiceOptions?.create ?? []) this.choices.push({ problemId: id, mistakeNote: null, ...c });
      for (const t of tags?.create ?? []) {
        const tag = this.ensureTag(t.tag.connectOrCreate.create.type, t.tag.connectOrCreate.create.name);
        this.problemTags.push({ problemId: id, tagId: tag.id });
      }
      return this.problemView(this.problems.find((p) => p.id === id)!);
    },
    update: async ({ where, data }: Row) => {
      const p = this.problems.find((x) => x.id === where.id);
      if (!p) throw new Error('P2025');
      applyData(p, data);
      return this.problemView(p);
    },
    updateMany: async ({ where, data }: Row) => {
      const rows = this.problems.filter((p) => idIn(where, p.id));
      rows.forEach((p) => applyData(p, data));
      return { count: rows.length };
    },
  };

  problemChoice = {
    findMany: async ({ where }: Row) =>
      this.choices.filter((c) => c.problemId === where.problemId).sort((a, b) => a.order - b.order),
    deleteMany: async ({ where }: Row) => {
      const before = this.choices.length;
      this.choices = this.choices.filter((c) => c.problemId !== where.problemId);
      return { count: before - this.choices.length };
    },
    createMany: async ({ data }: Row) => {
      for (const c of data) this.choices.push({ ...c, mistakeNote: c.mistakeNote ?? null });
      return { count: data.length };
    },
  };

  tag = {
    findMany: async ({ where }: Row = {}) => this.tags.filter((t) => idIn(where, t.id)),
    upsert: async ({ where }: Row) => this.ensureTag(where.type_name.type, where.type_name.name),
  };

  problemTag = {
    findMany: async ({ where }: Row) =>
      this.problemTags
        .filter((pt) => pt.problemId === where.problemId)
        .map((pt) => ({ ...pt, tag: this.tags.find((t) => t.id === pt.tagId) })),
    deleteMany: async ({ where }: Row) => {
      this.problemTags = this.problemTags.filter((pt) => pt.problemId !== where.problemId);
      return { count: 0 };
    },
    createMany: async ({ data }: Row) => {
      for (const pt of data)
        if (!this.problemTags.some((x) => x.problemId === pt.problemId && x.tagId === pt.tagId))
          this.problemTags.push({ ...pt });
      return { count: data.length };
    },
  };

  problemAnalysis = {
    upsert: async ({ where, update, create }: Row) => {
      const row = this.analyses.find((a) => a.problemId === where.problemId);
      if (row) Object.assign(row, update);
      else this.analyses.push({ ...create });
      return row ?? create;
    },
  };

  test = {
    findUnique: async ({ where }: Row) => {
      const t = this.tests.find((x) => x.id === where.id);
      return t ? this.testView(t) : null;
    },
    findUniqueOrThrow: async (args: Row) => {
      const t = await this.test.findUnique(args);
      if (!t) throw new Error('P2025');
      return t;
    },
    findMany: async ({ where }: Row = {}) =>
      this.tests
        .filter((t) => idIn(where, t.id) && (where?.type === undefined || t.type === where.type) && (where?.deletedAt !== null || !t.deletedAt))
        .map((t) => this.testView(t)),
    create: async ({ data }: Row) => {
      const id = data.id ?? newId('test');
      const { problems, access, ...rest } = data;
      this.addTest({ ...rest, id, createdAt: new Date() }, problems?.create ?? [], (access?.create ?? []).map((a: Row) => a.classroomId));
      return this.testView(this.tests.find((t) => t.id === id)!);
    },
    update: async ({ where, data }: Row) => {
      const t = this.tests.find((x) => x.id === where.id);
      if (!t) throw new Error('P2025');
      applyData(t, data);
      return this.testView(t);
    },
    updateMany: async ({ where, data }: Row) => {
      const rows = this.tests.filter((t) => idIn(where, t.id));
      rows.forEach((t) => applyData(t, data));
      return { count: rows.length };
    },
  };

  testProblem = {
    findUnique: async ({ where }: Row) => {
      const k = where.testId_problemId;
      const tp = this.testProblems.find((x) => x.testId === k.testId && x.problemId === k.problemId);
      return tp ? { ...tp, problem: this.problems.find((p) => p.id === tp.problemId) } : null;
    },
    findFirst: async ({ where }: Row) => {
      const tp = this.testProblems.find(
        (x) =>
          x.problemId === where.problemId &&
          (!where.test?.type || this.tests.find((t) => t.id === x.testId)?.type === where.test.type),
      );
      return tp ? { problemId: tp.problemId } : null;
    },
    findMany: async ({ where }: Row) =>
      this.testProblems
        .filter((x) => x.testId === where.testId)
        .map((tp) => ({ ...tp, problem: this.problemView(this.problems.find((p) => p.id === tp.problemId)!) })),
    deleteMany: async ({ where }: Row) => {
      this.testProblems = this.testProblems.filter((x) => x.testId !== where.testId);
      return { count: 0 };
    },
    createMany: async ({ data }: Row) => {
      this.testProblems.push(...data.map((d: Row) => ({ ...d })));
      return { count: data.length };
    },
  };

  testAccess = {
    findUnique: async ({ where }: Row) => {
      const k = where.testId_classroomId;
      return this.accessRows.find((a) => a.testId === k.testId && a.classroomId === k.classroomId) ?? null;
    },
    create: async ({ data }: Row) => {
      this.accessRows.push({ ...data });
      return data;
    },
    createMany: async ({ data }: Row) => {
      for (const d of data)
        if (!this.accessRows.some((a) => a.testId === d.testId && a.classroomId === d.classroomId)) this.accessRows.push({ ...d });
      return { count: data.length };
    },
    deleteMany: async ({ where }: Row) => {
      const ids: string[] | undefined = typeof where.classroomId === 'string' ? [where.classroomId] : where.classroomId?.in;
      this.accessRows = this.accessRows.filter((a) => !(a.testId === where.testId && (!ids || ids.includes(a.classroomId))));
      return { count: 0 };
    },
    upsert: async ({ where, create }: Row) => {
      const k = where.testId_classroomId;
      const row = this.accessRows.find((a) => a.testId === k.testId && a.classroomId === k.classroomId);
      if (!row) this.accessRows.push({ ...create });
      return row ?? create;
    },
  };

  testResult = { count: async ({ where }: Row = {}) => this.takenWhere(where ?? {}, this.results) };
  testAttemptSession = { count: async ({ where }: Row = {}) => this.takenWhere(where ?? {}, this.sessions) };

  enrollment = { findMany: async () => [] };

  chapter = {
    findUnique: async ({ where }: Row) => ({ id: where.id, title: 'Бүлэг', deletedAt: null, book: { code: 'B', deletedAt: null } }),
    findMany: async ({ where }: Row = {}) =>
      ((where?.id?.in as string[]) ?? []).map((id) => ({ id, title: `Бүлэг ${id}` })),
  };

  contentRevision = {
    findFirst: async ({ where, orderBy }: Row) => {
      const rows = this.matchRevisions(where);
      if (orderBy?.version === 'desc') rows.sort((a, b) => b.version - a.version);
      return rows[0] ?? null;
    },
    findMany: async ({ where, orderBy, skip = 0, take, distinct }: Row) => {
      let rows = this.matchRevisions(where);
      if (orderBy?.version === 'desc') rows.sort((a, b) => b.version - a.version);
      if (Array.isArray(distinct)) {
        const seen = new Set<string>();
        rows = rows.filter((r) => {
          const key = distinct.map((f: string) => String(r[f])).join('|');
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
      }
      return rows.slice(skip, take === undefined ? undefined : skip + take);
    },
    deleteMany: async ({ where }: Row) => {
      const drop = new Set(this.matchRevisions(where));
      this.revisions = this.revisions.filter((r) => !drop.has(r));
      return { count: drop.size };
    },
    findUnique: async ({ where }: Row) => {
      const k = where.entity_entityId_version;
      return this.revisions.find((r) => r.entity === k.entity && r.entityId === k.entityId && r.version === k.version) ?? null;
    },
    count: async ({ where }: Row) => this.matchRevisions(where).length,
    createMany: async ({ data, skipDuplicates }: Row) => {
      let count = 0;
      for (const d of data) {
        const dup = this.revisions.some((r) => r.entity === d.entity && r.entityId === d.entityId && r.version === d.version);
        if (dup) {
          if (skipDuplicates) continue;
          throw new Error(`Unique constraint failed: ${d.entity}/${d.entityId}/${d.version}`);
        }
        const row: Row = { id: newId('rev'), reason: null, ...JSON.parse(JSON.stringify(d)) };
        row.createdAt = d.createdAt ?? new Date();
        this.revisions.push(row);
        count += 1;
      }
      return { count };
    },
  };

  private matchRevisions(where: Row): Row[] {
    return this.revisions.filter((r) => {
      if (where.entity && r.entity !== where.entity) return false;
      if (typeof where.entityId === 'string' && r.entityId !== where.entityId) return false;
      if (where.entityId?.in && !where.entityId.in.includes(r.entityId)) return false;
      if (typeof where.actorId === 'string' && r.actorId !== where.actorId) return false;
      if (where.actorId?.not !== undefined && r.actorId === where.actorId.not) return false;
      if (typeof where.version === 'number' && r.version !== where.version) return false;
      if (where.version?.lt !== undefined && !(r.version < where.version.lt)) return false;
      if (where.version?.gt !== undefined && !(r.version > where.version.gt)) return false;
      if (where.version?.lte !== undefined && !(r.version <= where.version.lte)) return false;
      return true;
    });
  }

  auditLog = {
    create: async ({ data }: Row) => {
      this.audits.push(data);
      return data;
    },
  };

  revisionsOf(entity: string, entityId: string): Row[] {
    return this.revisions
      .filter((r) => r.entity === entity && r.entityId === entityId)
      .sort((a, b) => a.version - b.version);
  }
}
