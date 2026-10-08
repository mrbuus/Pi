/** Opt-in local synthetic JWT + production service boundary regression. */
require('reflect-metadata');
require('dotenv').config({ quiet: true });
const assert = require('node:assert/strict'),
  path = require('node:path'),
  http = require('node:http'),
  { randomUUID } = require('node:crypto');
const {
    Module,
    Controller,
    Get,
    Post,
    Req,
    UseGuards,
  } = require('@nestjs/common'),
  { NestFactory } = require('@nestjs/core'),
  { JwtService } = require('@nestjs/jwt');
const dir =
  process.env.STUDY_REVIEW_TEST_BUILD_DIR ||
  path.resolve(__dirname, '../../dist');
const load = (file) => require(path.join(dir, 'src', file));
const { PrismaModule } = load('prisma/prisma.module'),
  { PrismaService } = load('prisma/prisma.service'),
  { JwtStrategy } = load('auth/jwt.strategy'),
  { JwtAuthGuard } = load('auth/guards/jwt-auth.guard'),
  { ContentService } = load('content/content.service'),
  { TestsService } = load('tests/tests.service');
const url = new URL(process.env.DATABASE_URL);
assert(
  ['localhost', '127.0.0.1'].includes(url.hostname) && url.port === '5544',
);
let db, content, tests, problem, chapter;
class Probe {
  paid(req) {
    return content.getProblem(problem.id, req.user.userId, req.user.role);
  }
  mutation(req) {
    return content.createProblem({ chapterId: chapter.id }, req.user.userId);
  }
  result(req) {
    return tests.enterResult(
      'unassigned',
      { studentId: 'foreign', totalScore: 1, maxScore: 1 },
      req.user.userId,
      req.user.role,
    );
  }
}
Controller('staff-regression')(Probe);
UseGuards(JwtAuthGuard)(Probe);
for (const [method, decorator] of [
  ['paid', Get],
  ['mutation', Post],
  ['result', Post],
]) {
  decorator(method)(
    Probe.prototype,
    method,
    Object.getOwnPropertyDescriptor(Probe.prototype, method),
  );
  Req()(Probe.prototype, method, 0);
}
class Fixture {}
Module({
  imports: [PrismaModule],
  controllers: [Probe],
  providers: [JwtStrategy, JwtAuthGuard],
})(Fixture);
(async () => {
  const app = await NestFactory.create(Fixture, { logger: false });
  await app.listen(0, '127.0.0.1');
  db = app.get(PrismaService);
  content = new ContentService(db);
  tests = new TestsService(db, {});
  const jwt = new JwtService({ secret: process.env.JWT_SECRET }),
    prefix = 'external-boundary-' + randomUUID();
  let user, book;
  function request(method, route) {
    return new Promise((resolve, reject) => {
      const r = http.request(
        {
          hostname: '127.0.0.1',
          port: app.getHttpServer().address().port,
          path: '/staff-regression/' + route,
          method,
          headers: {
            Authorization:
              'Bearer ' + jwt.sign({ sub: user.id, role: 'ADMIN' }),
          },
        },
        (res) => {
          let data = '';
          res.on('data', (c) => (data += c));
          res.on('end', () =>
            resolve({ status: res.statusCode, body: JSON.parse(data) }),
          );
        },
      );
      r.on('error', reject);
      r.end();
    });
  }
  try {
    user = await db.user.create({
      data: {
        firstName: 'Synthetic',
        lastName: 'External',
        passwordHash: 'disabled',
        role: 'TEACHER',
        externalTeacherProfile: { create: { organization: 'Synthetic only' } },
      },
    });
    book = await db.book.create({ data: { code: prefix, title: prefix } });
    chapter = await db.chapter.create({
      data: { title: prefix, order: 0, bookId: book.id },
    });
    problem = await db.problem.create({
      data: {
        token: prefix,
        createdById: user.id,
        chapterId: chapter.id,
        page: 1,
        number: 1,
        format: 'FILL_NUMBER',
        correctAnswer: 'SECRET',
        statementText: 'synthetic',
      },
    });
    for (const [method, route] of [
      ['GET', 'paid'],
      ['POST', 'mutation'],
      ['POST', 'result'],
    ])
      assert.equal((await request(method, route)).status, 403, route);
    await db.chapter.update({
      where: { id: chapter.id },
      data: { freePreview: true },
    });
    const readable = await request('GET', 'paid');
    assert.equal(readable.status, 200);
    assert.equal('correctAnswer' in readable.body, false);
    assert.equal(
      await db.testResult.count({ where: { enteredById: user.id } }),
      0,
    );
    console.log(
      'PASS actual external JWT: paid key denied, global mutation denied, official result denied, free content hides answer; token ADMIN claim cannot replace current TEACHER identity.',
    );
  } finally {
    if (problem) await db.problem.delete({ where: { id: problem.id } });
    if (chapter) await db.chapter.delete({ where: { id: chapter.id } });
    if (book) await db.book.delete({ where: { id: book.id } });
    if (user) await db.user.delete({ where: { id: user.id } });
    await app.close();
  }
})().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
