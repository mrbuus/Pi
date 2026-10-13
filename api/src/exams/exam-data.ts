// «Шалгалт» хэсгийн анализ, сурагч/эцэг эхийн дүнгийн НЭГ ачаалагч: тест
// (бодлого, сэдэв, сонголт) нэг query, сурагчдын дүн/ирээгүй/тэмдэглэгээ/онлайн
// сесс тус бүр нэг query (N+1 байхгүй). Бодолт нь exam-analytics.ts-д (цэвэр).

import { NotFoundException } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import {
  AttemptSessionStatus,
  AttemptSource,
  Role,
  TagType,
  TestType,
} from '../generated/prisma/enums';
import { canAccessChapter, collectContentScope } from '../common/access';
import { PrismaService } from '../prisma/prisma.service';
import { buildExamItems, ExamItem, ItemStatus } from '../tests/exam-items';
import {
  choiceImagesOf,
  choiceModeOf,
  choiceTextsOf,
  GradableProblem,
  hasKnownAnswer,
} from '../tests/grading';
import {
  canonicalYoutubeUrl,
  parseYoutubeId,
  purchaseOnlyLevel,
  ReviewLevelValue,
  youtubeEmbedUrl,
} from '../thousand/review-gate';
import { resolveStudentReview } from '../thousand/thousand.service';
import {
  AnalyticsProblem,
  chosenLetter,
  choiceKeyOf,
  chapterTopicName,
  letterOf,
  problemTopics,
  SessionProblem,
  statusesFromSession,
  TopicRef,
} from './exam-analytics';

export const EXAM_TEST_SELECT = {
  id: true,
  title: true,
  type: true,
  gradingMode: true,
  chapterId: true,
  chapter: { select: { bookId: true } },
  problems: {
    orderBy: { order: 'asc' },
    select: {
      problemId: true,
      order: true,
      points: true,
      problem: {
        select: {
          id: true,
          format: true,
          statementText: true,
          imageKey: true,
          choices: true,
          correctAnswer: true,
          scoringGroups: true,
          youtubeUrl: true,
          choiceOptions: {
            select: {
              order: true,
              text: true,
              isCorrect: true,
              mistakeNote: true,
              imageKey: true,
            },
          },
          analysis: {
            select: {
              status: true,
              answerKeyStatus: true,
              solutionOutline: true,
            },
          },
          chapter: {
            select: {
              id: true,
              title: true,
              topic: { select: { id: true, name: true, deletedAt: true } },
            },
          },
          tags: {
            where: { tag: { type: TagType.SUBTOPIC } },
            select: { tag: { select: { id: true, name: true } } },
          },
        },
      },
    },
  },
} satisfies Prisma.TestSelect;

export type ExamTestRow = Prisma.TestGetPayload<{
  select: typeof EXAM_TEST_SELECT;
}>;
export type ExamProblemRow = ExamTestRow['problems'][number];

export interface PreparedExam {
  test: ExamTestRow;
  items: ExamItem[];
  rowBy: Map<string, ExamProblemRow>;
  meta: Map<string, AnalyticsProblem>;
  gradable: Map<string, SessionProblem>;
  topicsOf: (problemId: string) => TopicRef[];
}

export function gradableOf(row: ExamProblemRow): SessionProblem {
  const p = row.problem;
  return {
    id: p.id,
    format: p.format,
    choices: p.choices,
    correctAnswer: p.correctAnswer,
    choiceOptions: p.choiceOptions,
    statementText: p.statementText,
  };
}

/** Тестийн зүйлс (buildExamItems), бодлого бүрийн сонголтын түлхүүр, сэдэв. */
export function prepareExam(test: ExamTestRow): PreparedExam {
  const items = buildExamItems(test.problems);
  const rowBy = new Map(test.problems.map((r) => [r.problemId, r]));
  const meta = new Map<string, AnalyticsProblem>();
  const gradable = new Map<string, SessionProblem>();
  for (const row of test.problems) {
    const g = gradableOf(row);
    gradable.set(row.problemId, g);
    const topic = row.problem.chapter.topic;
    meta.set(row.problemId, {
      problemId: row.problemId,
      choice: choiceKeyOf({
        ...g,
        choiceOptions: row.problem.choiceOptions,
      }),
      topics: problemTopics({
        tags: row.problem.tags.map((t) => t.tag),
        chapter: {
          title: row.problem.chapter.title,
          topic: topic && !topic.deletedAt ? topic : null,
        },
      }),
    });
  }
  return {
    test,
    items,
    rowBy,
    meta,
    gradable,
    topicsOf: (problemId) => meta.get(problemId)?.topics ?? [],
  };
}

/** Сурагч/эцэг эхийн замд: устгаагүй, ноорог биш тест. */
export async function loadExamTest(
  prisma: PrismaService,
  testId: string,
): Promise<ExamTestRow> {
  const test = await prisma.test.findUnique({
    where: { id: testId },
    select: { ...EXAM_TEST_SELECT, deletedAt: true, isDraft: true },
  });
  if (!test || test.deletedAt || test.isDraft)
    throw new NotFoundException('Шалгалт олдсонгүй');
  return test;
}

export interface RosterStudent {
  id: string;
  firstName: string;
  lastName: string;
  classroomId: string;
  classroomName: string;
}

/** Ангиудын идэвхтэй сурагчид — нэг сурагч нэг удаа (нэрээр эрэмбэлсэн). */
export async function rosterOf(
  prisma: PrismaService,
  classIds: string[],
): Promise<RosterStudent[]> {
  if (classIds.length === 0) return [];
  const enrollments = await prisma.enrollment.findMany({
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
    orderBy: [{ classroomId: 'asc' }, { joinedAt: 'asc' }],
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

function asRecord(v: unknown): Record<string, unknown> {
  return v && typeof v === 'object' && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : {};
}

export interface StudentExamData {
  result: {
    id: string;
    totalScore: number;
    maxScore: number;
    source: AttemptSource;
    createdAt: Date;
  } | null;
  absent: boolean;
  /** Зүйл бүрийн төлөв: TestItemMark, эс бөгөөс өмнөх онлайн дүнгийн сесс */
  statuses: Map<string, ItemStatus> | null;
  /** Онлайнаар илгээсэн сесс (хариу, холилтын дараалал) */
  session: {
    submittedAt: Date | null;
    answers: Record<string, unknown>;
    choiceOrder: Record<string, number[]>;
  } | null;
  /** Онлайн дүнтэй бол сонгох бодлого бүрийн үсэг ('' = хоосон) */
  choices: Map<string, string> | null;
}

/**
 * Сурагчдын дүн, ирээгүй, тэмдэглэгээ, онлайн сесс — 4 query, зэрэг.
 * Тэмдэглэгээгүй ОНЛАЙН дүн (TestItemMark-аас өмнө илгээсэн) бол сессийн
 * хариуг илгээх үеийн дүрмээр дүгнэнэ. Цаасан дүн давамгайлсан (онлайн сесс
 * байгаа ч дүн нь гар) үед сессийн хариуг ашиглахгүй.
 */
export async function loadStudentData(
  prisma: PrismaService,
  exam: PreparedExam,
  studentIds: string[],
): Promise<Map<string, StudentExamData>> {
  const out = new Map<string, StudentExamData>();
  if (studentIds.length === 0) return out;
  const testId = exam.test.id;
  const where = { testId, studentId: { in: studentIds } };
  const [results, absences, marks, sessions] = await Promise.all([
    prisma.testResult.findMany({
      where,
      select: {
        id: true,
        studentId: true,
        totalScore: true,
        maxScore: true,
        source: true,
        createdAt: true,
      },
    }),
    prisma.testAbsence.findMany({ where, select: { studentId: true } }),
    prisma.testItemMark.findMany({
      where,
      select: { studentId: true, itemKey: true, status: true },
    }),
    prisma.testAttemptSession.findMany({
      where: { ...where, status: AttemptSessionStatus.SUBMITTED },
      select: {
        studentId: true,
        submittedAt: true,
        draftAnswers: true,
        choiceOrder: true,
      },
    }),
  ]);
  const keys = new Set(exam.items.map((i) => i.key));
  const resultBy = new Map(results.map((r) => [r.studentId, r]));
  const absent = new Set(absences.map((a) => a.studentId));
  const sessionBy = new Map(sessions.map((s) => [s.studentId, s]));
  const marksBy = new Map<string, Map<string, ItemStatus>>();
  for (const m of marks) {
    // Бүтэц өөрчлөгдсөнөөс үлдсэн хуучин түлхүүрийг тооцохгүй
    if (!keys.has(m.itemKey)) continue;
    const map = marksBy.get(m.studentId) ?? new Map<string, ItemStatus>();
    map.set(m.itemKey, m.status);
    marksBy.set(m.studentId, map);
  }
  const choiceProblems = [...exam.meta.values()].filter((m) => m.choice);

  for (const studentId of studentIds) {
    const result = resultBy.get(studentId) ?? null;
    const raw = sessionBy.get(studentId);
    const session = raw
      ? {
          submittedAt: raw.submittedAt,
          answers: asRecord(raw.draftAnswers),
          choiceOrder: asRecord(raw.choiceOrder) as Record<string, number[]>,
        }
      : null;
    const online = !!session && result?.source === AttemptSource.ONLINE_TEST;
    let statuses = marksBy.get(studentId) ?? null;
    if (!statuses && online && result) {
      const derived = statusesFromSession(
        exam.items,
        exam.gradable,
        session.answers,
        session.choiceOrder,
        (p) => hasKnownAnswer(p),
      );
      statuses = derived.size ? derived : null;
    }
    let choices: Map<string, string> | null = null;
    if (online && result) {
      choices = new Map(
        choiceProblems.map((m) => [
          m.problemId,
          chosenLetter(
            exam.gradable.get(m.problemId) as GradableProblem,
            session.answers[m.problemId],
            session.choiceOrder[m.problemId],
          ),
        ]),
      );
    }
    out.set(studentId, {
      result,
      absent: absent.has(studentId),
      statuses,
      session,
      choices,
    });
  }
  return out;
}

// ============ Бодлогын агуулга (дэлгэрэнгүй харах) ============

export function youtubeOf(
  url: string | null | undefined,
): { url: string; embedUrl: string } | null {
  const id = url ? parseYoutubeId(url) : null;
  return id
    ? { url: canonicalYoutubeUrl(id), embedUrl: youtubeEmbedUrl(id) }
    : null;
}

/** Бүтэцтэй сонголтууд үсэгтэйгээр (LETTER горимд үсэг бодлогын текстэд). */
export function choiceView(
  row: ExamProblemRow,
): { letter: string; text: string; image: string | null }[] | null {
  const g = gradableOf(row);
  const images = choiceImagesOf(g);
  return choiceModeOf(g) === 'TEXT'
    ? choiceTextsOf(g).map((text, i) => ({ letter: letterOf(i), text, image: images?.[i] ?? null }))
    : null;
}

/** Зөв хариу: сонгох бодлогод канон үсэг, бусдад түлхүүрийн утга. */
export function correctAnswerView(row: ExamProblemRow): unknown {
  const g = gradableOf(row);
  if (!hasKnownAnswer(g)) return null;
  const key = choiceKeyOf({ ...g, choiceOptions: row.problem.choiceOptions });
  return key ? key.correct : row.problem.correctAnswer;
}

// ============ Эргэн харалтын хаалт (сурагч, эцэг эх) ============

const ACCESS_REVIEW_SELECT = {
  classroomId: true,
  assignedAt: true,
  reviewLevel: true,
  reviewAutoAt: true,
  reviewOpenedAt: true,
} as const;

/**
 * 1000 бодлого: багшийн нээсэн/автомат түвшин (thousand/review-gate). Ангиар
 * эсвэл эрхээр хамрагдаагүй цаасан дүн → дүн оруулснаас 7 хоногийн дараа.
 * Бусад шалгалт: эргэн харалтын хаалтгүй (онлайн review-тэй ижил).
 */
export async function studentReviewLevel(
  prisma: PrismaService,
  test: Pick<ExamTestRow, 'id' | 'type' | 'chapterId' | 'chapter'>,
  studentId: string,
  data: Pick<StudentExamData, 'result' | 'session'>,
  now = new Date(),
): Promise<{ level: ReviewLevelValue; opensAt: Date | null }> {
  if (test.type !== TestType.THOUSAND) return { level: 'FULL', opensAt: null };
  const [enrollments, scope] = await Promise.all([
    prisma.enrollment.findMany({
      where: { studentId },
      select: { classroomId: true },
    }),
    collectContentScope(prisma, studentId),
  ]);
  const classIds = [...new Set(enrollments.map((e) => e.classroomId))];
  const classRows = classIds.length
    ? await prisma.testAccess.findMany({
        where: { testId: test.id, classroomId: { in: classIds } },
        select: ACCESS_REVIEW_SELECT,
      })
    : [];
  const purchaseOrPass =
    scope.all ||
    scope.testIds.includes(test.id) ||
    (!!test.chapterId && scope.chapterIds.includes(test.chapterId)) ||
    (!!test.chapter?.bookId && scope.bookIds.includes(test.chapter.bookId));
  const state = resolveStudentReview(
    classRows,
    { purchaseOrPass, submittedAt: data.session?.submittedAt ?? null },
    now,
  );
  if (state.covered) return { level: state.level, opensAt: state.opensAt };
  const fallback = purchaseOnlyLevel(data.result?.createdAt ?? null, now);
  return {
    level: fallback.level,
    opensAt: fallback.level === 'NONE' ? fallback.opensAt : null,
  };
}

// ============ «Ижил сэдвийн бодлого бодох» — давтлагын бүлгүүд ============

export const PRACTICE_CHAPTER_LIMIT = 5;

/**
 * Сэдэвт хамаарах, хариуны түлхүүр нь баталгаажсан (study-review-ийн
 * шалгуур) бөгөөд энэ шалгалтын бус бодлоготой, сурагчийн нэвтрэх эрхтэй
 * бүлгүүд (≤5). Давтлагыг одоо байгаа /study-review хөдөлгүүр эхлүүлнэ.
 */
export async function practiceChapters(
  prisma: PrismaService,
  topic: TopicRef,
  excludeProblemIds: string[],
  userId: string,
  role: Role,
): Promise<string[]> {
  const [kind, ...rest] = topic.key.split(':');
  const ref = rest.join(':');
  // Бүлгийн гарчгаар («Логарифм тэгшитгэл · Тест 3») — 1000 бодлогын сэдвийн
  // нэр (SUBTOPIC tag) бусад номын бүлгийн нэртэй ижил тул тэдгээр рүү холбогдоно.
  const byName = (name: string): Prisma.ChapterWhereInput => ({
    OR: [{ title: name }, { title: { startsWith: `${name} ` } }],
  });
  const topicWhere: Prisma.ChapterWhereInput | null =
    kind === 'tag'
      ? {
          OR: [
            byName(topic.name),
            { problems: { some: { tags: { some: { tagId: ref } } } } },
          ],
        }
      : kind === 'topic'
        ? { topicId: ref }
        : kind === 'ch'
          ? byName(ref)
          : null;
  if (!topicWhere) return [];
  const rows = await prisma.chapter.findMany({
    where: {
      AND: [
        topicWhere,
        {
          deletedAt: null,
          // Шалгалтын (1000 бодлого, ЭЕШ сорил) бүлгийг давтлагад санал
          // болгохгүй — сурагч өгөөгүй шалгалтын бодлогыг урьдчилан харна.
          tests: {
            none: { type: { in: ['THOUSAND', 'EESH_MOCK'] }, deletedAt: null },
          },
          book: { deletedAt: null, archived: false },
          problems: {
            some: {
              deletedAt: null,
              id: { notIn: excludeProblemIds },
              analysis: { answerKeyStatus: 'VERIFIED' },
            },
          },
        },
      ],
    },
    select: { id: true, title: true, bookId: true, freePreview: true },
    orderBy: [{ order: 'asc' }, { id: 'asc' }],
    take: PRACTICE_CHAPTER_LIMIT * 4,
  });
  const out: string[] = [];
  for (const row of rows) {
    if (kind === 'ch' && chapterTopicName(row.title) !== ref) continue;
    if (!(await canAccessChapter(prisma, userId, role, row))) continue;
    out.push(row.id);
    if (out.length >= PRACTICE_CHAPTER_LIMIT) break;
  }
  return out;
}
