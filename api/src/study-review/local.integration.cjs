/** Opt-in: real local Postgres and production JWT/HTTP; synthetic rows removed. */
require('reflect-metadata');
require('dotenv').config({ quiet: true });
const path = require('node:path');
const buildDir =
  process.env.STUDY_REVIEW_TEST_BUILD_DIR ||
  path.resolve(__dirname, '../../dist');
const requireBuild = (file) => require(path.join(buildDir, file));
const assert = require('node:assert/strict'),
  http = require('node:http'),
  { randomUUID } = require('node:crypto');
const {
    Module,
    ValidationPipe,
    Controller,
    Get,
    UseGuards,
  } = require('@nestjs/common'),
  { NestFactory } = require('@nestjs/core'),
  { JwtService } = require('@nestjs/jwt');
const { PrismaModule } = requireBuild('src/prisma/prisma.module'),
  { PrismaService } = requireBuild('src/prisma/prisma.service');
const { StudyReviewModule } = requireBuild(
    'src/study-review/study-review.module',
  ),
  { JwtStrategy } = requireBuild('src/auth/jwt.strategy'),
  { JwtAuthGuard } = requireBuild('src/auth/guards/jwt-auth.guard'),
  { RolesGuard } = requireBuild('src/auth/guards/roles.guard');
const url = new URL(process.env.DATABASE_URL);
assert(
  ['localhost', '127.0.0.1'].includes(url.hostname) && url.port === '5544',
  'Local v2 database only',
);
const { FilesAuthGuard } = requireBuild('src/storage/files-auth.guard');
const { FileAuthorizationService } = requireBuild(
  'src/storage/file-authorization.service',
);
class FileProbe {
  read() {
    return { authorized: true };
  }
}
Controller('study-review/files')(FileProbe);
Get(':key')(
  FileProbe.prototype,
  'read',
  Object.getOwnPropertyDescriptor(FileProbe.prototype, 'read'),
);
UseGuards(FilesAuthGuard)(
  FileProbe.prototype,
  'read',
  Object.getOwnPropertyDescriptor(FileProbe.prototype, 'read'),
);
class Fixture {}
Module({
  imports: [PrismaModule, StudyReviewModule],
  controllers: [FileProbe],
  providers: [
    JwtStrategy,
    JwtAuthGuard,
    RolesGuard,
    FilesAuthGuard,
    FileAuthorizationService,
    {
      provide: JwtService,
      useValue: new JwtService({ secret: process.env.JWT_SECRET }),
    },
  ],
})(Fixture);
(async () => {
  const app = await NestFactory.create(Fixture, { logger: false });
  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  await app.listen(0, '127.0.0.1');
  const db = app.get(PrismaService),
    port = app.getHttpServer().address().port,
    prefix = 'review-local-' + randomUUID(),
    jwt = new JwtService({ secret: process.env.JWT_SECRET }),
    users = [],
    chapters = [],
    problems = [];
  let book, classroom, assignment;
  const imageKey = prefix + '.png';
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
  async function req(method, path, user, body) {
    return new Promise((resolve, reject) => {
      const data = body === undefined ? null : JSON.stringify(body);
      const r = http.request(
        {
          hostname: '127.0.0.1',
          port,
          path: '/api/study-review' + path,
          method,
          headers: {
            ...(user
              ? {
                  Authorization:
                    'Bearer ' + jwt.sign({ sub: user.id, role: 'ADMIN' }),
                }
              : {}),
            ...(data
              ? {
                  'Content-Type': 'application/json',
                  'Content-Length': Buffer.byteLength(data),
                }
              : {}),
          },
        },
        (res) => {
          let out = '';
          res.on('data', (x) => (out += x));
          res.on('end', () => {
            try {
              out = JSON.parse(out);
            } catch {}
            resolve({ status: res.statusCode, body: out });
          });
        },
      );
      r.on('error', reject);
      if (data) r.write(data);
      r.end();
    });
  }
  async function check(method, path, u, body, status = 200) {
    const r = await req(method, path, u, body);
    assert.equal(
      r.status,
      status,
      `${method} ${path} ${JSON.stringify(r.body)}`,
    );
    return r.body;
  }
  try {
    const buyer = await user('BUYER'),
      other = await user('STUDENT'),
      teacher = await user('TEACHER');
    book = await db.book.create({
      data: { code: prefix, title: 'Synthetic review book' },
    });
    for (const freePreview of [true, false]) {
      const c = await db.chapter.create({
        data: { title: prefix, order: 0, freePreview, bookId: book.id },
      });
      chapters.push(c.id);
      for (let i = 0; i < 8; i++) {
        const p = await db.problem.create({
          data: {
            token: prefix + c.id + i,
            chapterId: c.id,
            format: 'FILL_NUMBER',
            statementText: '$1+1$',
            imageKey,
            correctAnswer: i === 7 && freePreview ? ['malformed-key'] : '2',
            createdById: teacher.id,
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
                answerKeyStatus:
                  i === 7 && !freePreview ? 'REVIEW_REQUIRED' : 'VERIFIED',
                solutionOutline: '$1+1=2$',
              },
            },
          },
        });
        problems.push(p.id);
      }
    }
    await db.storedFile.create({
      data: {
        key: imageKey,
        mime: 'image/png',
        size: 1,
        bytes: Buffer.from([1]),
        ownerId: teacher.id,
      },
    });
    await check('GET', '/options', null, undefined, 401);
    await check('GET', '/options', teacher, undefined, 403);
    await check(
      'POST',
      '',
      buyer,
      {
        budgetMinutes: 10,
        chapterIds: [chapters[1]],
        clientRequestId: randomUUID(),
      },
      403,
    );
    await db.learningEvent.create({
      data: {
        userId: buyer.id,
        type: 'PROBLEM_OPENED',
        problemId: problems[6],
        meta: { source: 'synthetic' },
      },
    });
    const options = await check('GET', '/options', buyer);
    assert.equal(
      options.chapters.find((c) => c.id === chapters[0]).freshCount,
      6,
    );
    const input = {
      budgetMinutes: 10,
      chapterIds: [chapters[0]],
      clientRequestId: randomUUID(),
    };
    const parallel = await Promise.all(
      Array.from({ length: 8 }, () => req('POST', '', buyer, input)),
    );
    parallel.forEach((r) => assert.equal(r.status, 201));
    assert.equal(new Set(parallel.map((r) => r.body.id)).size, 1);
    const run = parallel[0].body;
    assert.equal((await check('GET', '/options', buyer)).resumeRunId, run.id);
    assert.equal(run.items.length, 5);
    assert(!JSON.stringify(run).includes('correctAnswer'));
    assert(run.items.every((i) => !('answerKey' in i) && !('solution' in i)));
    await check('POST', '', buyer, { ...input, budgetMinutes: 30 }, 409);
    await check('GET', '/' + run.id, other, undefined, 404);
    // Replace every current bank reference; only the owner's trusted frozen run may grant the old key.
    await db.problem.updateMany({
      where: { id: { in: problems } },
      data: { imageKey: prefix + '-replacement.png' },
    });
    await check('GET', '/files/' + imageKey, buyer);
    await check('GET', '/files/' + imageKey, other, undefined, 403);
    await db.chapter.update({
      where: { id: chapters[0] },
      data: { freePreview: false },
    });
    const product = await db.productItem.create({
      data: { kind: 'BOOK', refId: book.id, price: 1 },
    });
    const purchase = await db.purchase.create({
      data: {
        userId: buyer.id,
        productItemId: product.id,
        price: 1,
        grantedAt: new Date(Date.now() - 10000),
        expiresAt: new Date(Date.now() + 60000),
      },
    });
    await check('GET', '/files/' + imageKey, buyer);
    await db.purchase.update({
      where: { id: purchase.id },
      data: { expiresAt: new Date(Date.now() - 1) },
    });
    await check('GET', '/files/' + imageKey, buyer, undefined, 403);
    await db.chapter.update({
      where: { id: chapters[0] },
      data: { freePreview: true },
    });
    const feedback = await db.feedback.create({
      data: {
        authorId: other.id,
        clientRequestId: randomUUID(),
        kind: 'QUESTION',
        subject: 'Synthetic private precedence',
        body: 'Fixture',
        attachmentKeys: [imageKey],
      },
    });
    await check('GET', '/files/' + imageKey, buyer, undefined, 403);
    await db.feedback.delete({ where: { id: feedback.id } });
    classroom = await db.classroom.create({
      data: { name: prefix, type: 'IN_PERSON', teacherId: teacher.id },
    });
    assignment = await db.assignment.create({
      data: {
        classroomId: classroom.id,
        title: prefix,
        createdById: teacher.id,
        imageKeys: [],
      },
    });
    const submission = await db.submission.create({
      data: { assignmentId: assignment.id, studentId: other.id, imageKeys: [] },
    });
    const revision = await db.submissionRevision.create({
      data: {
        submissionId: submission.id,
        action: 'SUBMIT',
        actorId: other.id,
        state: 'NOT_DONE',
        imageKeys: [imageKey],
      },
    });
    await check('GET', '/files/' + imageKey, buyer, undefined, 403);
    await db.submissionRevision.delete({ where: { id: revision.id } });
    await check('GET', '/files/' + imageKey, buyer);
    const item = run.items[0],
      response = {
        clientRequestId: randomUUID(),
        kind: 'FIRST',
        answer: '0',
        flags: ['unsure'],
      };
    await check(
      'POST',
      `/${run.id}/items/${item.id}/response`,
      buyer,
      {
        clientRequestId: randomUUID(),
        kind: 'FIRST',
        answer: '2+0',
        flags: [],
      },
      400,
    );
    assert.equal(
      await db.studyReviewResponse.count({ where: { itemId: item.id } }),
      0,
    );
    const race = await Promise.all(
      Array.from({ length: 8 }, () =>
        req('POST', `/${run.id}/items/${item.id}/response`, buyer, response),
      ),
    );
    race.forEach((r) => assert.equal(r.status, 201));
    assert.equal(
      await db.studyReviewResponse.count({ where: { itemId: item.id } }),
      1,
    );
    await check(
      'POST',
      `/${run.id}/items/${item.id}/response`,
      buyer,
      { ...response, answer: '2' },
      409,
    );
    await check(
      'POST',
      `/${run.id}/items/${item.id}/response`,
      buyer,
      { ...response, clientRequestId: randomUUID(), answer: '2' },
      409,
    );
    const reload = await check('GET', '/' + run.id, buyer);
    assert.equal(reload.items[0].first.answer, '0');
    assert.equal(reload.items[0].first.correct, false);
    await db.problem.update({
      where: { id: item.problemId },
      data: { correctAnswer: '999', statementText: 'Changed after start' },
    });
    const correction = await check(
      'POST',
      `/${run.id}/items/${item.id}/response`,
      buyer,
      {
        clientRequestId: randomUUID(),
        kind: 'CORRECTION',
        answer: '4/2',
        flags: [],
      },
      201,
    );
    assert.equal(correction.items[0].responses.at(-1).correct, true);
    assert.equal(correction.items[0].source.statement, '$1+1$');
    assert.equal(correction.evidence.firstCorrect, 0);
    const closed = await check(
      'POST',
      `/${run.id}/submit`,
      buyer,
      undefined,
      201,
    );
    assert.equal(closed.status, 'SUBMITTED');
    assert.equal(closed.items[0].answerKey, '2');
    const post = await check(
      'POST',
      `/${run.id}/items/${item.id}/response`,
      buyer,
      {
        clientRequestId: randomUUID(),
        kind: 'CORRECTION',
        answer: '4/2',
        flags: [],
      },
      201,
    );
    assert.equal(post.items[0].responses.at(-1).assistance, true);
    assert.equal(post.items[0].first.answer, '0');
    await check(
      'POST',
      `/${run.id}/items/${run.items[1].id}/response`,
      buyer,
      { clientRequestId: randomUUID(), kind: 'FIRST', answer: '2', flags: [] },
      409,
    );
    const next = await check(
      'POST',
      '',
      buyer,
      { ...input, clientRequestId: randomUUID() },
      201,
    );
    assert.equal(next.items.length, 1);
    assert(
      next.items.every(
        (i) => !run.items.some((old) => old.problemId === i.problemId),
      ),
    );
    await db.studyReviewRun.update({
      where: { id: next.id },
      data: {
        startedAt: new Date(Date.now() - 601000),
        deadlineAt: new Date(Date.now() - 1000),
      },
    });
    await check(
      'POST',
      `/${next.id}/items/${next.items[0].id}/response`,
      buyer,
      { clientRequestId: randomUUID(), kind: 'FIRST', answer: '2', flags: [] },
      409,
    );
    assert.equal((await check('GET', '/' + next.id, buyer)).status, 'EXPIRED');
    assert.equal(
      await db.testResult.count({ where: { studentId: buyer.id } }),
      0,
    );
    const otherRun = await check(
      'POST',
      '',
      other,
      {
        budgetMinutes: 10,
        chapterIds: [chapters[0]],
        clientRequestId: randomUUID(),
        correct: true,
      },
      201,
    );
    await check(
      'POST',
      '',
      buyer,
      {
        budgetMinutes: NaN,
        chapterIds: [chapters[0]],
        clientRequestId: 'not-uuid',
      },
      400,
    );
    await db.learningEvent.create({
      data: {
        userId: other.id,
        type: 'VIDEO_STARTED',
        problemId: otherRun.items[0].problemId,
        meta: { source: 'synthetic' },
      },
    });
    const otherKey = await db.problem.findUnique({
      where: { id: otherRun.items[0].problemId },
      select: { correctAnswer: true },
    });
    const assisted = await check(
      'POST',
      `/${otherRun.id}/items/${otherRun.items[0].id}/response`,
      other,
      {
        clientRequestId: randomUUID(),
        kind: 'FIRST',
        answer: String(otherKey.correctAnswer),
        flags: [],
      },
      201,
    );
    assert.equal(assisted.evidence.firstCorrect, 1);
    assert.equal(assisted.evidence.independentFirstCorrect, 0);
    const choiceChapter = await db.chapter.create({
      data: {
        title: prefix + 'choice',
        order: 0,
        freePreview: true,
        bookId: book.id,
      },
    });
    chapters.push(choiceChapter.id);
    const choiceProblem = await db.problem.create({
      data: {
        token: prefix + '-choice',
        chapterId: choiceChapter.id,
        format: 'CHOICE',
        statementText: 'Choose one',
        correctAnswer: 'B',
        createdById: teacher.id,
        choiceOptions: {
          create: [
            { label: 'A', order: 0, text: '2', isCorrect: false },
            { label: 'B', order: 1, text: '1', isCorrect: true },
          ],
        },
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
          },
        },
      },
    });
    problems.push(choiceProblem.id);
    const choiceRun = await check(
      'POST',
      '',
      buyer,
      {
        budgetMinutes: 10,
        chapterIds: [choiceChapter.id],
        clientRequestId: randomUUID(),
      },
      201,
    );
    assert.equal(choiceRun.items[0].source.choices[1].isCorrect, undefined);
    await check(
      'POST',
      `/${choiceRun.id}/items/${choiceRun.items[0].id}/response`,
      buyer,
      {
        clientRequestId: randomUUID(),
        kind: 'FIRST',
        answer: 'choice:9',
        flags: [],
      },
      400,
    );
    await check(
      'POST',
      `/${choiceRun.id}/items/${choiceRun.items[0].id}/response`,
      buyer,
      {
        clientRequestId: randomUUID(),
        kind: 'FIRST',
        answer: 'abc',
        flags: [],
      },
      400,
    );
    assert.equal(
      await db.studyReviewResponse.count({
        where: { itemId: choiceRun.items[0].id },
      }),
      0,
    );
    const choiceFirst = await check(
      'POST',
      `/${choiceRun.id}/items/${choiceRun.items[0].id}/response`,
      buyer,
      {
        clientRequestId: randomUUID(),
        kind: 'FIRST',
        answer: 'choice:1',
        flags: [],
      },
      201,
    );
    assert.equal(choiceFirst.items[0].first.correct, true);
    const choiceClosed = await check(
      'POST',
      `/${choiceRun.id}/submit`,
      buyer,
      undefined,
      201,
    );
    assert.equal(choiceClosed.items[0].answerKey, '1');
    await db.book.update({
      where: { id: book.id },
      data: { deletedAt: new Date() },
    });
    assert(
      !(await check('GET', '/options', buyer)).chapters.some(
        (c) => c.id === chapters[0],
      ),
    );
    await check('GET', '/' + run.id, buyer, undefined, 403);
    console.log(
      'Study review real PostgreSQL/JWT/HTTP: ownership, entitlement, 8-way create/response concurrency, snapshot, first/replay conflicts, closed correction, deadline and no official result passed.',
    );
  } finally {
    await db.learningEvent.deleteMany({ where: { userId: { in: users } } });
    await db.studyReviewResponse.deleteMany({
      where: { userId: { in: users } },
    });
    await db.studyReviewItem.deleteMany({
      where: { run: { userId: { in: users } } },
    });
    await db.studyReviewRun.deleteMany({ where: { userId: { in: users } } });
    await db.feedback.deleteMany({ where: { authorId: { in: users } } });
    await db.submissionRevision.deleteMany({
      where: { submission: { studentId: { in: users } } },
    });
    if (assignment)
      await db.assignment.delete({ where: { id: assignment.id } });
    if (classroom) await db.classroom.delete({ where: { id: classroom.id } });
    await db.purchase.deleteMany({ where: { userId: { in: users } } });
    if (book) await db.productItem.deleteMany({ where: { refId: book.id } });
    await db.storedFile.deleteMany({ where: { key: imageKey } });
    await db.problem.deleteMany({ where: { id: { in: problems } } });
    await db.chapter.deleteMany({ where: { id: { in: chapters } } });
    if (book) await db.book.delete({ where: { id: book.id } });
    await db.user.deleteMany({ where: { id: { in: users } } });
    await app.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
