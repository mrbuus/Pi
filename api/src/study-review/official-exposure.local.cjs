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
    prefix = 'official-overlap-' + randomUUID();
  let u, book, chapter, test, run;
  const problems = [];
  async function request(method, route, body) {
    return new Promise((resolve, reject) => {
      const data = body ? JSON.stringify(body) : null;
      const r = http.request(
        {
          hostname: '127.0.0.1',
          port: app.getHttpServer().address().port,
          path: '/study-review' + route,
          method,
          headers: {
            Authorization: 'Bearer ' + jwt.sign({ sub: u.id }),
            ...(data
              ? {
                  'Content-Type': 'application/json',
                  'Content-Length': Buffer.byteLength(data),
                }
              : {}),
          },
        },
        (res) => {
          let text = '';
          res.on('data', (c) => (text += c));
          res.on('end', () =>
            resolve({ status: res.statusCode, body: JSON.parse(text) }),
          );
        },
      );
      r.on('error', reject);
      r.end(data);
    });
  }
  try {
    u = await db.user.create({
      data: {
        firstName: 'Synthetic',
        lastName: 'Overlap',
        passwordHash: 'disabled',
        role: 'STUDENT',
      },
    });
    book = await db.book.create({ data: { code: prefix, title: prefix } });
    chapter = await db.chapter.create({
      data: { title: prefix, order: 0, freePreview: true, bookId: book.id },
    });
    for (let i = 0; i < 3; i++) {
      const p = await db.problem.create({
        data: {
          token: prefix + i,
          chapterId: chapter.id,
          createdById: u.id,
          format: 'FILL_NUMBER',
          correctAnswer: '2',
          statementText: 'synthetic',
          analysis: {
            create: {
              topic: 'synthetic',
              skills: [],
              methods: [],
              formulas: [],
              domainNotes: [],
              signRules: [],
              commonMistakes: [],
              auditNotes: [],
              answerKeyStatus: 'VERIFIED',
              status: 'VERIFIED',
              solutionOutline: 'PRIVATE-SOLUTION',
            },
          },
        },
      });
      problems.push(p.id);
    }
    test = await db.test.create({
      data: {
        title: prefix,
        type: 'CHAPTER_EXAM',
        createdById: u.id,
        chapterId: chapter.id,
      },
    });
    const session = await db.testAttemptSession.create({
      data: {
        testId: test.id,
        studentId: u.id,
        seed: 1,
        problemOrder: [problems[0]],
        choiceOrder: {},
        draftAnswers: { [problems[1]]: '0' },
        status: 'SUBMITTED',
      },
    });
    const options = await request('GET', '/options');
    assert.equal(
      options.body.chapters.find((c) => c.id === chapter.id).freshCount,
      1,
    );
    const created = await request('POST', '', {
      clientRequestId: randomUUID(),
      budgetMinutes: 10,
      chapterIds: [chapter.id],
    });
    assert.equal(created.status, 201);
    run = created.body.id;
    assert.equal(created.body.items.length, 1);
    assert.equal(created.body.items[0].problemId, problems[2]);
    const item = created.body.items[0].id;
    // Official exam issued after private review start: this persisted ordering is the race being guarded.
    await db.testAttemptSession.update({
      where: { id: session.id },
      data: {
        status: 'IN_PROGRESS',
        problemOrder: [problems[2]],
        draftAnswers: {},
        startedAt: new Date(),
        deadlineAt: new Date(Date.now() + 600000),
      },
    });
    const firstBody = {
      clientRequestId: randomUUID(),
      kind: 'FIRST',
      answer: '2',
      flags: [],
    };
    const deniedFirst = await request(
      'POST',
      `/${run}/items/${item}/response`,
      firstBody,
    );
    assert.equal(deniedFirst.status, 403);
    assert.equal(
      await db.studyReviewResponse.count({ where: { userId: u.id } }),
      0,
    );
    await db.testAttemptSession.update({
      where: { id: session.id },
      data: { deadlineAt: new Date(Date.now() - 1) },
    });
    const first = await request(
      'POST',
      `/${run}/items/${item}/response`,
      firstBody,
    );
    assert.equal(first.status, 201);
    assert.equal(first.body.evidence.firstCorrect, 1);
    assert.equal(first.body.evidence.independentFirstCorrect, 0);
    assert.equal(first.body.items[0].responses[0].assistance, true);
    await db.testAttemptSession.update({
      where: { id: session.id },
      data: { deadlineAt: new Date(Date.now() + 600000) },
    });
    const correctionBody = {
      clientRequestId: randomUUID(),
      kind: 'CORRECTION',
      answer: '2',
      flags: [],
    };
    assert.equal(
      (await request('POST', `/${run}/items/${item}/response`, correctionBody))
        .status,
      403,
    );
    assert.equal(
      await db.studyReviewResponse.count({ where: { userId: u.id } }),
      1,
    );
    const closed = await request('POST', `/${run}/submit`);
    assert.equal(closed.status, 201);
    assert(!('answerKey' in closed.body.items[0]));
    assert(!('solution' in closed.body.items[0]));
    assert(!JSON.stringify(closed.body).includes('PRIVATE-SOLUTION'));
    assert.equal((await request('GET', '/history')).status, 200);
    await db.testAttemptSession.update({
      where: { id: session.id },
      data: { deadlineAt: new Date(Date.now() - 1) },
    });
    const correction = await request(
      'POST',
      `/${run}/items/${item}/response`,
      correctionBody,
    );
    assert.equal(correction.status, 201);
    assert.equal(correction.body.evidence.firstCorrect, 1);
    const expired = await request('GET', `/${run}`);
    assert.equal(expired.body.items[0].answerKey, '2');
    assert.equal(expired.body.items[0].solution, 'PRIVATE-SOLUTION');
    assert.equal(await db.testResult.count({ where: { studentId: u.id } }), 0);
    console.log(
      'PASS actual HTTP: issued/draft-only prior sessions excluded, after-start live official issue rejects FIRST/CORRECTION403 without write, same UUID after expiration accepted and assisted, live official deadline blocks closed key/solution, expired deadline releases key, history accessible, no official result mutation.',
    );
  } finally {
    if (u) {
      await db.testAttemptSession.deleteMany({ where: { studentId: u.id } });
      await db.studyReviewResponse.deleteMany({ where: { userId: u.id } });
      await db.studyReviewItem.deleteMany({ where: { run: { userId: u.id } } });
      await db.studyReviewRun.deleteMany({ where: { userId: u.id } });
    }
    if (test) await db.test.delete({ where: { id: test.id } });
    await db.problemAnalysis.deleteMany({
      where: { problemId: { in: problems } },
    });
    await db.problem.deleteMany({ where: { id: { in: problems } } });
    if (chapter) await db.chapter.delete({ where: { id: chapter.id } });
    if (book) await db.book.delete({ where: { id: book.id } });
    if (u) await db.user.delete({ where: { id: u.id } });
    await app.close();
  }
})().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
