import { Prisma } from '../generated/prisma/client';
import {
  AnswerKeyStatus,
  MistakeType,
  ProblemFormat,
  TestGradingMode,
  TestType,
} from '../generated/prisma/enums';
import type { RevisionDb } from './revision-store';
import {
  ProblemFieldGroup,
  ProblemSnapshot,
  sameJson,
  TestSnapshot,
} from './revision-snapshot';

/**
 * Snapshot-ыг мөрөнд буцааж бичих туслахууд (transaction дотор): хувилбар сэргээх
 * (revisions.service) ба зэрэг засварын нэгтгэл (revision-store commitRevisions).
 */

export function jsonOrDbNull(
  value: unknown,
): Prisma.InputJsonValue | typeof Prisma.DbNull {
  return value === null || value === undefined
    ? Prisma.DbNull
    : (JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue);
}

/** Snapshot-ын сонгосон хэсгүүдийг бодлогод буцааж бичнэ (transaction дотор). */
export async function applyProblemSnapshot(
  tx: RevisionDb,
  problemId: string,
  snap: ProblemSnapshot,
  groups: ProblemFieldGroup[],
) {
  const has = (g: ProblemFieldGroup) => groups.includes(g);
  const data: Prisma.ProblemUpdateInput = {};
  if (has('content')) {
    data.statementText = snap.statementText;
    data.imageKey = snap.imageKey;
    data.format = snap.format as ProblemFormat;
    data.points = snap.points;
    data.choices = jsonOrDbNull(snap.choices);
    data.correctAnswer =
      snap.correctAnswer === null || snap.correctAnswer === undefined
        ? Prisma.JsonNull
        : (JSON.parse(
            JSON.stringify(snap.correctAnswer),
          ) as Prisma.InputJsonValue);
  }
  if (has('scoringGroups'))
    data.scoringGroups = jsonOrDbNull(snap.scoringGroups);
  if (has('youtubeUrl')) data.youtubeUrl = snap.youtubeUrl;
  if (Object.keys(data).length > 0)
    await tx.problem.update({ where: { id: problemId }, data });

  if (has('choices')) {
    await tx.problemChoice.deleteMany({ where: { problemId } });
    if (snap.choiceOptions.length > 0)
      await tx.problemChoice.createMany({
        data: snap.choiceOptions.map((c) => ({
          problemId,
          label: c.label,
          text: c.text,
          isCorrect: c.isCorrect,
          mistakeType: (c.mistakeType as MistakeType) ?? MistakeType.NONE,
          mistakeNote: c.mistakeNote,
          imageKey: c.imageKey ?? null,
          order: c.order,
        })),
      });
  }

  if (has('tags')) {
    const wanted = snap.tags;
    const existing = wanted.length
      ? await tx.tag.findMany({
          where: { id: { in: wanted.map((t) => t.id).filter(Boolean) } },
          select: { id: true },
        })
      : [];
    const known = new Set(existing.map((t) => t.id));
    const tagIds: string[] = [];
    for (const t of wanted) {
      if (t.id && known.has(t.id)) {
        tagIds.push(t.id);
        continue;
      }
      // Ангилал устсан/шинээр нэрлэгдсэн бол төрөл+нэрээр сэргээнэ
      const tag = await tx.tag.upsert({
        where: { type_name: { type: t.type as never, name: t.name } },
        create: { type: t.type as never, name: t.name },
        update: {},
        select: { id: true },
      });
      tagIds.push(tag.id);
    }
    await tx.problemTag.deleteMany({ where: { problemId } });
    if (tagIds.length > 0)
      await tx.problemTag.createMany({
        data: [...new Set(tagIds)].map((tagId) => ({ problemId, tagId })),
        skipDuplicates: true,
      });
  }

  if (has('analysis') && snap.analysis) {
    const status = snap.analysis.answerKeyStatus as AnswerKeyStatus;
    await tx.problemAnalysis.upsert({
      where: { problemId },
      update: {
        solutionOutline: snap.analysis.solutionOutline,
        answerKeyStatus: status,
      },
      create: {
        problemId,
        topic: '',
        skills: [],
        methods: [],
        formulas: [],
        domainNotes: [],
        signRules: [],
        commonMistakes: [],
        auditNotes: [],
        solutionOutline: snap.analysis.solutionOutline,
        answerKeyStatus: status,
      },
    });
  }
}

const TEST_SCALARS = [
  'title',
  'type',
  'gradingMode',
  'timeLimitMin',
  'price',
  'chapterId',
  'pdfKey',
  'groupKey',
  'variantLabel',
] as const;

/**
 * Тестийг `from` төлвөөс `to` руу шилжүүлнэ: зөвхөн ялгаатай талбар, бодлогын
 * жагсаалт, анги (нэмэх/хасах — үлдэх ангийн эргэн харалтын тохиргоо хэвээр).
 * Эрх/түгжээг дуудагч шалгана.
 */
export async function applyTestSnapshot(
  tx: RevisionDb,
  testId: string,
  from: TestSnapshot,
  to: TestSnapshot,
) {
  const data: Prisma.TestUncheckedUpdateInput = {};
  for (const key of TEST_SCALARS) {
    if (from[key] !== to[key]) (data as Record<string, unknown>)[key] = to[key];
  }
  if (data.type !== undefined) data.type = to.type as TestType;
  if (data.gradingMode !== undefined)
    data.gradingMode = to.gradingMode as TestGradingMode;
  if (!sameJson(from.problems, to.problems)) {
    await tx.testProblem.deleteMany({ where: { testId } });
    if (to.problems.length > 0)
      await tx.testProblem.createMany({
        data: to.problems.map((p) => ({
          testId,
          problemId: p.problemId,
          order: p.order,
          points: p.points,
        })),
      });
  }
  const before = new Set(from.classroomIds);
  const after = new Set(to.classroomIds);
  const remove = from.classroomIds.filter((id) => !after.has(id));
  const add = to.classroomIds.filter((id) => !before.has(id));
  if (remove.length > 0)
    await tx.testAccess.deleteMany({
      where: { testId, classroomId: { in: remove } },
    });
  if (add.length > 0) {
    await tx.testAccess.createMany({
      data: add.map((classroomId) => ({ testId, classroomId })),
      skipDuplicates: true,
    });
    data.isDraft = false;
  }
  if (Object.keys(data).length > 0)
    await tx.test.update({ where: { id: testId }, data });
}
