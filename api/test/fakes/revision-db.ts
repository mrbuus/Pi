/**
 * Unit тестийн Prisma mock-д revisions/revision-store.ts-ийн дууддаг аргуудыг
 * (байхгүй бол л) нэмнэ: мөр түгжих $queryRaw, snapshot унших findMany,
 * ContentRevision бичих, version нэмэх updateMany. Байгаа mock-ийг ДАРЖ БИЧИХГҮЙ;
 * findMany байхгүй бол тухайн mock-ийн findUnique-ээр мөр бүрийг уншина.
 *
 * Бичигдсэн хувилбарууд `revisions` массивт хуримтлагдана — тестэд шалгахад.
 * api/test/ нь nest build-ээс гадуур (tsconfig.build.json) — продакшнд орохгүй.
 */
type AnyRecord = Record<string, any>;

export interface RevisionFakeState {
  revisions: AnyRecord[];
}

export function withRevisionFakes<T extends AnyRecord>(
  db: T,
): T & { __revisionState: RevisionFakeState } {
  const state: RevisionFakeState = { revisions: [] };
  const target = db as AnyRecord;
  target.$queryRaw ??= async () => [];
  target.contentRevision ??= {
    findFirst: async () => null,
    findUnique: async () => null,
    findMany: async () => [],
    count: async () => 0,
    createMany: async ({ data }: { data: AnyRecord[] }) => {
      state.revisions.push(...data);
      return { count: data.length };
    },
  };
  target.user ??= {};
  target.user.findMany ??= async () => [];
  target.user.findUnique ??= async () => null;
  target.classroom ??= {};
  target.classroom.findMany ??= async () => [];
  for (const model of ['problem', 'test']) {
    target[model] ??= {};
    const delegate = target[model];
    delegate.updateMany ??= async () => ({ count: 0 });
    delegate.findMany ??= async ({ where }: { where?: { id?: { in?: string[] } } } = {}) => {
      const ids = where?.id?.in ?? [];
      const rows: AnyRecord[] = [];
      for (const id of ids) {
        const row = delegate.findUnique
          ? await delegate.findUnique({ where: { id } })
          : null;
        rows.push({
          title: '',
          type: 'CUSTOM',
          gradingMode: 'AUTO',
          format: 'CHOICE',
          points: 1,
          statementText: null,
          correctAnswer: null,
          createdById: 'creator',
          createdAt: new Date(0),
          version: 0,
          ...(row ?? {}),
          id,
        });
      }
      return rows;
    };
  }
  target.__revisionState = state;
  return target as T & { __revisionState: RevisionFakeState };
}
