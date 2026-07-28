'use strict';
/**
 * Ачааллын тестийн ФИКСТУР — DB-д шаардлагатай хамгийн бага өгөгдлийг
 * (анги, "бүлэг" (chapter), бодлогын сан, N сурагч, түвшин тус бүрт 1 тест)
 * үүсгэж, ажлын дараа БҮГДИЙГ (зөвхөн бидний үүсгэсэн мөрүүдийг) устгана.
 *
 * ⚠️ ЗӨВХӨН localhost DB дээр дуудагдана болно — дуудагч (index.js)
 * lib/env.js-ийн assertLocalhost-ыг ЭХЭЛЖ ажиллуулсан байх ёстой.
 */
const bcrypt = require('bcryptjs');
const {
  Role,
  StudentType,
  ClassroomType,
  ProblemFormat,
  TestType,
  TestGradingMode,
} = require(
  require('path').join(
    __dirname,
    '..',
    '..',
    'dist',
    'src',
    'generated',
    'prisma',
    'enums',
  ),
);

const PROBLEM_POOL_SIZE = 40; // CLAUDE.md/PERF-AUDIT.md-д дурдсан "40 бодлого" бодит тооны дагуу
const TEST_TIME_LIMIT_MIN = 100; // жинхэнэ 100 минутын шалгалттай тааруулав (deadlineAt хол байлгаж, автомат finalize-д орохгүйн тулд)

function uniqueId(prefix) {
  return `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

async function findOrCreateTeacher(prisma, runId) {
  const existing = await prisma.user.findFirst({
    where: { role: { in: [Role.ADMIN, Role.TEACHER_PLUS, Role.TEACHER] } },
    select: { id: true },
    orderBy: { createdAt: 'asc' },
  });
  if (existing) return { id: existing.id, createdByUs: false };

  const passwordHash = bcrypt.hashSync('loadtest-not-a-real-login', 10);
  const created = await prisma.user.create({
    data: {
      id: uniqueId('ltteacher_'),
      username: `loadtest_teacher_${runId}`,
      firstName: 'LoadTest',
      lastName: 'Teacher',
      passwordHash,
      role: Role.TEACHER,
    },
    select: { id: true },
  });
  return { id: created.id, createdByUs: true };
}

/**
 * @param {object} opts
 * @param {import('../../src/generated/prisma/client').PrismaClient} opts.prisma
 * @param {number[]} opts.levels - concurrency түвшнүүд (ж: [50,200,500,1000])
 */
async function seed({ prisma, levels }) {
  const runId = Date.now().toString(36);
  const maxStudents = Math.max(...levels);

  console.log(`[fixture] seed эхэллээ — runId=${runId}, maxStudents=${maxStudents}, levels=${levels.join(',')}`);

  const teacher = await findOrCreateTeacher(prisma, runId);

  const classroom = await prisma.classroom.create({
    data: {
      id: uniqueId('ltclass_'),
      name: `LOADTEST-${runId}`,
      type: ClassroomType.ONLINE,
      teacherId: teacher.id,
    },
    select: { id: true },
  });

  const chapter = await prisma.chapter.create({
    data: {
      id: uniqueId('ltchap_'),
      title: `LOADTEST-${runId}`,
      order: 999999,
    },
    select: { id: true },
  });

  // Бодлогын сан — FILL_NUMBER (choiceOptions/choices шаардахгүй, хамгийн
  // хямд бичилт) — grading замыг exercise хийхийн тулд бодит correctAnswer-тэй.
  const problemIds = Array.from({ length: PROBLEM_POOL_SIZE }, () => uniqueId('ltprob_'));
  await prisma.problem.createMany({
    data: problemIds.map((id, i) => ({
      id,
      token: `LOADTEST-${runId}-P${i}`,
      chapterId: chapter.id,
      format: ProblemFormat.FILL_NUMBER,
      statementText: `Ачааллын тест — бодлого #${i + 1}: x + 1 = 2, x = ?`,
      correctAnswer: '1',
      createdById: teacher.id,
    })),
  });

  // Сурагчид — createMany-аар багц бичилт (1000 мөр ч гэсэн нэг л round-trip)
  const studentIds = Array.from({ length: maxStudents }, () => uniqueId('ltstu_'));
  const sharedPasswordHash = bcrypt.hashSync('loadtest-not-a-real-login', 10);
  await prisma.user.createMany({
    data: studentIds.map((id, i) => ({
      id,
      username: `loadtest_${runId}_s${i}`,
      firstName: 'LoadTest',
      lastName: `Student${i}`,
      passwordHash: sharedPasswordHash,
      role: Role.STUDENT,
    })),
  });
  await prisma.studentProfile.createMany({
    data: studentIds.map((userId) => ({ userId, type: StudentType.ONLINE })),
  });
  const enrollmentIds = studentIds.map(() => uniqueId('ltenr_'));
  await prisma.enrollment.createMany({
    data: studentIds.map((studentId, i) => ({
      id: enrollmentIds[i],
      studentId,
      classroomId: classroom.id,
    })),
  });

  // Түвшин тус бүрд ТУСДАА Test — учир нь TestAttemptSession нь
  // (testId, studentId) unique тул НЭГ testId-г давхар түвшинд ашиглавал
  // хоёр дахь удаагийн start() аль хэдийн SUBMITTED session-той таарч богино
  // хариу буцаагаад бодит ачааллын замыг алгасна.
  const levelTests = [];
  for (const level of levels) {
    const testId = uniqueId('lttest_');
    await prisma.test.create({
      data: {
        id: testId,
        title: `LOADTEST-${runId}-L${level}`,
        type: TestType.CUSTOM,
        gradingMode: TestGradingMode.AUTO,
        chapterId: chapter.id,
        timeLimitMin: TEST_TIME_LIMIT_MIN,
        createdById: teacher.id,
      },
    });
    await prisma.testProblem.createMany({
      data: problemIds.map((problemId, order) => ({ testId, problemId, order, points: 1 })),
    });
    await prisma.testAccess.create({ data: { testId, classroomId: classroom.id } });
    levelTests.push({ level, testId });
  }

  const manifest = {
    runId,
    createdAt: new Date().toISOString(),
    teacherId: teacher.id,
    teacherCreatedByUs: teacher.createdByUs,
    classroomId: classroom.id,
    chapterId: chapter.id,
    problemIds,
    studentIds,
    levelTests,
  };

  console.log(
    `[fixture] seed дууслаа — сурагч=${studentIds.length}, бодлого=${problemIds.length}, тест=${levelTests.length}`,
  );
  return manifest;
}

async function cleanup({ prisma, manifest }) {
  if (!manifest) return;
  console.log(`[fixture] cleanup эхэллээ — runId=${manifest.runId}`);

  // Каскадын дараалал: Test → Problem → Chapter → Classroom → User(сурагчид).
  // Schema-д TestProblem/TestAccess/TestResult/TestAttemptSession БҮГД
  // testId/studentId дээр onDelete:Cascade тул эдгээрийг тусад нь устгах
  // шаардлагагүй.
  const testIds = (manifest.levelTests || []).map((lt) => lt.testId);
  if (testIds.length) {
    await prisma.test.deleteMany({ where: { id: { in: testIds } } });
  }
  if (manifest.problemIds?.length) {
    await prisma.problem.deleteMany({ where: { id: { in: manifest.problemIds } } });
  }
  if (manifest.chapterId) {
    await prisma.chapter.deleteMany({ where: { id: manifest.chapterId } });
  }
  if (manifest.classroomId) {
    // Enrollment нь classroomId дээр Cascade тул анги устахад дагаж устана.
    await prisma.classroom.deleteMany({ where: { id: manifest.classroomId } });
  }
  if (manifest.studentIds?.length) {
    // Enrollment/Attempt/TestResult/TestAttemptSession бүгд studentId дээр
    // Cascade тул сурагч устахад аль хэдийн үлдээгүй ямар ч мөр байхгүй.
    await prisma.user.deleteMany({ where: { id: { in: manifest.studentIds } } });
  }
  if (manifest.teacherCreatedByUs && manifest.teacherId) {
    await prisma.user.deleteMany({ where: { id: manifest.teacherId } });
  }

  console.log('[fixture] cleanup дууслаа — бүх ачааллын тестийн мөр устгагдлаа.');
}

module.exports = { seed, cleanup };
