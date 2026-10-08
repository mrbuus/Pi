/** Local synthetic production controller/JWT history proof. */
require('reflect-metadata');
require('dotenv').config({ quiet: true });
const assert = require('node:assert/strict'),
  http = require('node:http'),
  path = require('node:path'),
  { randomUUID } = require('node:crypto'),
  { Module } = require('@nestjs/common'),
  { NestFactory } = require('@nestjs/core'),
  { JwtService } = require('@nestjs/jwt');
const dir =
    process.env.STUDY_REVIEW_TEST_BUILD_DIR ||
    path.resolve(__dirname, '../../dist'),
  load = (f) => require(path.join(dir, 'src', f));
const { PrismaModule } = load('prisma/prisma.module'),
  { PrismaService } = load('prisma/prisma.service'),
  { StudyReviewModule } = load('study-review/study-review.module'),
  { JwtStrategy } = load('auth/jwt.strategy'),
  { JwtAuthGuard } = load('auth/guards/jwt-auth.guard'),
  { RolesGuard } = load('auth/guards/roles.guard');
const url = new URL(process.env.DATABASE_URL);
assert(
  ['localhost', '127.0.0.1'].includes(url.hostname) && url.port === '5544',
);
class Fixture {}
Module({
  imports: [PrismaModule, StudyReviewModule],
  providers: [JwtStrategy, JwtAuthGuard, RolesGuard],
})(Fixture);
(async () => {
  const app = await NestFactory.create(Fixture, { logger: false });
  await app.listen(0, '127.0.0.1');
  const db = app.get(PrismaService),
    jwt = new JwtService({ secret: process.env.JWT_SECRET }),
    users = [],
    runs = [],
    prefix = 'history-' + randomUUID();
  let chapter, book, problem;
  async function user(role) {
    const u = await db.user.create({
      data: {
        firstName: 'Synthetic',
        lastName: role,
        passwordHash: 'disabled',
        role,
      },
    });
    users.push(u.id);
    return u;
  }
  async function request(route, u) {
    return new Promise((resolve, reject) => {
      const r = http.request(
        {
          hostname: '127.0.0.1',
          port: app.getHttpServer().address().port,
          path: '/study-review/' + route,
          headers: {
            Authorization: 'Bearer ' + jwt.sign({ sub: u.id, role: 'ADMIN' }),
          },
        },
        (res) => {
          let body = '';
          res.on('data', (c) => (body += c));
          res.on('end', () =>
            resolve({ status: res.statusCode, body: JSON.parse(body) }),
          );
        },
      );
      r.on('error', reject);
      r.end();
    });
  }
  try {
    const student = await user('STUDENT'),
      buyer = await user('BUYER'),
      parent = await user('PARENT'),
      foreign = await user('STUDENT');
    book = await db.book.create({ data: { code: prefix, title: prefix } });
    chapter = await db.chapter.create({
      data: { title: prefix, order: 0, bookId: book.id },
    });
    problem = await db.problem.create({
      data: {
        token: prefix,
        chapterId: chapter.id,
        createdById: student.id,
        format: 'FILL_NUMBER',
        correctAnswer: 'SECRET_KEY',
      },
    });
    async function run(u, date) {
      const r = await db.studyReviewRun.create({
        data: {
          userId: u.id,
          clientRequestId: randomUUID(),
          normalizedRequestHash: 'test',
          budgetMinutes: 10,
          requestedChapterIds: [chapter.id],
          status: 'SUBMITTED',
          startedAt: new Date(date),
          deadlineAt: new Date(Date.parse(date) + 600000),
          submittedAt: new Date(Date.parse(date) + 1000),
          selectionVersion: 'test',
          seed: 1,
          items: {
            create: {
              problemId: problem.id,
              order: 0,
              sourceSnapshot: { statementText: 'test' },
              gradeSnapshot: { answer: 'SECRET_KEY' },
              gradingVersion: 'test',
              eligibilityAtStart: 'test',
              firstRecordedAt: new Date(date),
              immutableFirstAnswer: 'WRONG_FIRST_PRIVATE',
              immutableFirstCorrect: false,
              responses: {
                create: {
                  userId: u.id,
                  clientRequestId: randomUUID(),
                  requestHash: 'test',
                  kind: 'CORRECTION',
                  answer: 'PRIVATE_CORRECTION',
                  correct: true,
                  assistance: true,
                },
              },
            },
          },
        },
      });
      runs.push(r.id);
      return r;
    }
    await run(student, '2025-12-31T15:59:59Z');
    await run(student, '2025-12-31T16:00:00Z');
    await run(student, '2026-12-31T15:59:59Z');
    await run(student, '2026-12-31T16:00:00Z');
    const foreignRun = await run(foreign, '2026-01-01T00:00:00Z');
    await run(buyer, '2026-01-01T00:00:00Z');
    const first = await request('history?year=2026&take=1', student);
    assert.equal(first.status, 200);
    assert.equal(first.body.items.length, 1);
    assert(first.body.nextCursor);
    assert.equal(first.body.items[0].startedAt, '2026-12-31T15:59:59.000Z');
    assert.equal(first.body.items[0].evidence.firstCorrect, 0);
    assert.equal(first.body.items[0].evidence.correctedWithAssistance, 1);
    const second = await request(
      'history?year=2026&take=1&cursor=' + first.body.nextCursor,
      student,
    );
    assert.equal(second.status, 200);
    assert.equal(second.body.items[0].startedAt, '2025-12-31T16:00:00.000Z');
    assert.equal(second.body.nextCursor, null);
    assert(
      !JSON.stringify(first.body).match(
        /SECRET_KEY|PRIVATE|answerKey|sourceSnapshot|gradeSnapshot/,
      ),
    );
    assert.equal(
      (
        await request(
          'history?year=2026&cursor=' + first.body.nextCursor,
          foreign,
        )
      ).status,
      400,
    );
    assert.equal(
      (
        await request(
          'history?year=2027&cursor=' + first.body.nextCursor,
          student,
        )
      ).status,
      400,
    );
    assert.equal(
      (await request('history?year=2026&take=51', student)).status,
      400,
    );
    assert.equal(
      (await request('history?year=2026', buyer)).body.items.length,
      1,
    );
    assert.equal(
      (await request('children/' + student.id + '/history?year=2026', parent))
        .status,
      403,
    );
    const link = await db.parentLink.create({
      data: { parentId: parent.id, studentId: student.id },
    });
    assert.equal(
      (await request('children/' + student.id + '/history?year=2026', parent))
        .status,
      403,
    );
    await db.parentLink.update({
      where: { id: link.id },
      data: { verifiedAt: new Date() },
    });
    assert.equal(
      (await request('children/' + student.id + '/history?year=2026', parent))
        .body.items.length,
      2,
    );
    assert.equal(
      (await request('children/' + foreign.id + '/history?year=2026', parent))
        .status,
      403,
    );
    assert.equal((await request('history?year=2026', parent)).status, 403);
    assert.equal((await request(first.body.items[0].id, student)).status, 403);
    assert.equal(
      await db.testResult.count({ where: { studentId: student.id } }),
      0,
    );
    console.log(
      'PASS production JWT/controller history: UB year edges, pagination own/foreign/wrongyear, Student+Buyer, absent/unverified/verified/other-child parent matrix, no entitlement summary but fullrun403, no answer/key leakage, immutablefirst0 vs assistedcorrection1, no ranking TestResult.',
    );
  } finally {
    await db.studyReviewResponse.deleteMany({
      where: { userId: { in: users } },
    });
    await db.studyReviewItem.deleteMany({ where: { runId: { in: runs } } });
    await db.studyReviewRun.deleteMany({ where: { id: { in: runs } } });
    await db.parentLink.deleteMany({ where: { parentId: { in: users } } });
    if (problem) await db.problem.delete({ where: { id: problem.id } });
    if (chapter) await db.chapter.delete({ where: { id: chapter.id } });
    if (book) await db.book.delete({ where: { id: book.id } });
    await db.user.deleteMany({ where: { id: { in: users } } });
    await app.close();
  }
})().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
