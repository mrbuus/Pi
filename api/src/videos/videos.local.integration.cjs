/** Synthetic local DB + real production JWT/roles/controller. Never loads external media. */
require('reflect-metadata');
require('dotenv').config({ quiet: true });
const assert = require('node:assert/strict'),
  http = require('node:http'),
  { randomUUID } = require('node:crypto');
const { Module, ValidationPipe } = require('@nestjs/common'),
  { NestFactory } = require('@nestjs/core'),
  { JwtService } = require('@nestjs/jwt');
const { PrismaModule } = require('../../dist/src/prisma/prisma.module'),
  { PrismaService } = require('../../dist/src/prisma/prisma.service');
const { JwtStrategy } = require('../../dist/src/auth/jwt.strategy'),
  { JwtAuthGuard } = require('../../dist/src/auth/guards/jwt-auth.guard'),
  { RolesGuard } = require('../../dist/src/auth/guards/roles.guard');
const { VideosController } = require('../../dist/src/videos/videos.controller'),
  { VideosService } = require('../../dist/src/videos/videos.service');
const {
    LearningLabController,
  } = require('../../dist/src/learning-lab/learning-lab.controller'),
  {
    LearningLabService,
  } = require('../../dist/src/learning-lab/learning-lab.service');
const {
    LessonsController,
  } = require('../../dist/src/lessons/lessons.controller'),
  { LessonsService } = require('../../dist/src/lessons/lessons.service');
const dburl = new URL(process.env.DATABASE_URL || '');
assert(
  ['localhost', '127.0.0.1'].includes(dburl.hostname) && dburl.port === '5544',
  'Only local DB5544',
);
const jwt = new JwtService({ secret: process.env.JWT_SECRET });
class TestModule {}
Module({
  imports: [PrismaModule],
  controllers: [VideosController, LearningLabController, LessonsController],
  providers: [
    VideosService,
    LearningLabService,
    LessonsService,
    JwtStrategy,
    JwtAuthGuard,
    RolesGuard,
    { provide: JwtService, useValue: jwt },
  ],
})(TestModule);
(async () => {
  const app = await NestFactory.create(TestModule, { logger: false });
  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
  await app.listen(0, '127.0.0.1');
  const db = app.get(PrismaService),
    port = app.getHttpServer().address().port,
    run = 'video-fixture-' + randomUUID(),
    users = [],
    chapters = [],
    problems = [];
  let passId, bookId;
  async function user(role, suffix) {
    const u = await db.user.create({
      data: {
        id: run + suffix,
        firstName: 'Synthetic',
        lastName: suffix,
        passwordHash: 'not-a-login',
        role,
      },
    });
    users.push(u.id);
    return u;
  }
  function request(method, path, u, body) {
    const data = body === undefined ? undefined : JSON.stringify(body);
    return new Promise((resolve, reject) => {
      const r = http.request(
        {
          hostname: '127.0.0.1',
          port,
          path: '/api' + path,
          method,
          headers: {
            Authorization: 'Bearer ' + jwt.sign({ sub: u.id, role: 'ADMIN' }),
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
    const r = await request(method, path, u, body);
    assert.equal(r.status, status, JSON.stringify(r.body));
    return r.body;
  }
  try {
    const owner = await user('TEACHER', 'owner'),
      other = await user('TEACHER', 'other'),
      plus = await user('TEACHER_PLUS', 'plus'),
      admin = await user('ADMIN', 'admin'),
      buyer = await user('BUYER', 'buyer'),
      pupil = await user('STUDENT', 'pupil');
    for (const freePreview of [true, false]) {
      const c = await db.chapter.create({
        data: { title: run, order: 0, freePreview },
      });
      chapters.push(c.id);
      const p = await db.problem.create({
        data: {
          token: run + c.id,
          chapterId: c.id,
          format: 'OPEN',
          statementText: '$1+1$',
          correctAnswer: '2',
          createdById: owner.id,
        },
      });
      problems.push(p.id);
    }
    const book = await db.book.create({ data: { code: run, title: run } });
    bookId = book.id;
    await db.chapter.update({ where: { id: chapters[1] }, data: { bookId } });
    const base = {
      title: 'Synthetic explanation',
      url: 'https://youtu.be/AbCdEfGhI_1',
      chapterId: chapters[0],
    };
    const owned = await check('POST', '/videos', owner, base, 201);
    assert.equal(owned.createdById, owner.id);
    await check('PATCH', '/videos/' + owned.id, owner, {
      title: 'Author correction',
    });
    await check(
      'PATCH',
      '/videos/' + owned.id,
      other,
      { title: 'Cross author' },
      403,
    );
    const legacy = await db.video.create({
      data: {
        title: 'Legacy ownerless',
        chapterId: chapters[0],
        s3Key: base.url,
      },
    });
    await check(
      'PATCH',
      '/videos/' + legacy.id,
      owner,
      { title: 'Claim legacy' },
      403,
    );
    await check(
      'POST',
      '/videos',
      owner,
      { ...base, problemId: problems[0] },
      403,
    );
    await check(
      'PATCH',
      '/videos/' + owned.id,
      owner,
      { problemId: problems[0] },
      403,
    );
    await check(
      'PATCH',
      '/videos/' + owned.id,
      plus,
      { problemId: problems[1] },
      400,
    );
    await check('PATCH', '/videos/' + owned.id, plus, {
      problemId: problems[0],
    });
    const metadata = await check(
      'GET',
      '/videos/problem?problemId=' + problems[0],
      pupil,
    );
    assert.equal(metadata.length, 1);
    assert.equal(metadata[0].id, owned.id);
    assert(
      !('s3Key' in metadata[0]) &&
        !('media' in metadata[0]) &&
        !('correctAnswer' in metadata[0]),
    );
    assert.equal(
      await db.learningEvent.count({
        where: { userId: pupil.id, videoId: owned.id },
      }),
      0,
    );
    const open = await check(
      'POST',
      '/videos/' + owned.id + '/open',
      pupil,
      { problemId: problems[0] },
      201,
    );
    assert.equal(
      open.media.embedUrl,
      'https://www.youtube-nocookie.com/embed/AbCdEfGhI_1?autoplay=0&playsinline=1',
    );
    assert.equal(
      await db.learningEvent.count({
        where: { userId: pupil.id, videoId: owned.id, type: 'HINT_USED' },
      }),
      1,
    );
    await check(
      'POST',
      '/videos/' + owned.id + '/open',
      pupil,
      { problemId: problems[1] },
      403,
    );
    await check(
      'POST',
      '/videos/' + owned.id + '/open',
      pupil,
      { problemId: 23 },
      400,
    );
    await check(
      'GET',
      '/videos/problem?problemId=' + problems[1],
      buyer,
      undefined,
      403,
    );
    const paid = await check(
      'POST',
      '/videos',
      plus,
      { ...base, chapterId: chapters[1], problemId: problems[1] },
      201,
    );
    await db.theoryBlock.create({
      data: {
        chapterId: chapters[1],
        title: 'Synthetic paid theory',
        content: '$x+1$',
        order: 0,
        imageKeys: [],
      },
    });
    const bookBuyer = await user('BUYER', 'book-buyer');
    const item = await db.productItem.create({
      data: { kind: 'BOOK', refId: bookId, includesVideo: false, price: 1 },
    });
    const purchase = await db.purchase.create({
      data: {
        userId: bookBuyer.id,
        productItemId: item.id,
        price: 1,
        grantedAt: new Date(Date.now() - 1000),
      },
    });
    await check('GET', '/learning-lab/bank/' + problems[1], bookBuyer);
    assert(
      (await check('GET', '/lessons/chapters', bookBuyer)).some(
        (c) => c.id === chapters[1],
      ),
    );
    const lesson = await check('GET', '/lessons/' + chapters[1], bookBuyer);
    assert.equal(lesson.theories.length, 1);
    assert.equal(lesson.videos.length, 0);
    await check(
      'GET',
      '/videos/problem?problemId=' + problems[1],
      bookBuyer,
      undefined,
      403,
    );
    await db.productItem.update({
      where: { id: item.id },
      data: { includesVideo: true },
    });
    assert.equal(
      (
        await check(
          'GET',
          '/videos/problem?problemId=' + problems[1],
          bookBuyer,
        )
      )[0].id,
      paid.id,
    );
    await check(
      'POST',
      '/learning-lab/response',
      bookBuyer,
      { problemId: problems[1], answer: '999', mode: 'independent', flags: [] },
      201,
    );
    await check(
      'POST',
      '/videos/' + paid.id + '/open',
      bookBuyer,
      { problemId: problems[1] },
      201,
    );
    const legacyExposure = await db.learningEvent.findFirst({
      where: { userId: bookBuyer.id, videoId: paid.id, type: 'HINT_USED' },
    });
    await db.learningEvent.update({
      where: { id: legacyExposure.id },
      data: {
        meta: {
          kind: 'video-solution-open',
          source: 'VIDEOS',
          solutionExposure: true,
        },
      },
    });
    assert.equal(
      (
        await check(
          'POST',
          '/learning-lab/correction',
          bookBuyer,
          { problemId: problems[1], answer: '2' },
          201,
        )
      ).kind,
      'solution-assisted-correction',
    );
    assert.equal(
      (await check('GET', '/learning-lab/bank/' + problems[1], bookBuyer)).first
        .answer,
      '999',
    );
    const recordedHistory = await check(
      'GET',
      '/learning-lab/history',
      bookBuyer,
    );
    assert(recordedHistory.some((row) => row.kind === 'video-solution-open'));
    assert(
      recordedHistory.some(
        (row) => row.kind === 'solution-assisted-correction',
      ),
    );
    await db.purchase.update({
      where: { id: purchase.id },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    await check(
      'GET',
      '/learning-lab/bank/' + problems[1],
      bookBuyer,
      undefined,
      403,
    );
    await check(
      'GET',
      '/videos/problem?problemId=' + problems[1],
      bookBuyer,
      undefined,
      403,
    );
    await db.purchase.update({
      where: { id: purchase.id },
      data: { expiresAt: null, grantedAt: null },
    });
    await check(
      'GET',
      '/learning-lab/bank/' + problems[1],
      bookBuyer,
      undefined,
      403,
    );
    await check(
      'GET',
      '/videos/problem?problemId=' + problems[1],
      bookBuyer,
      undefined,
      403,
    );
    const pass = await db.pass.create({
      data: {
        name: run,
        durationDays: 1,
        price: 1,
        scope: { chapterIds: [chapters[1]] },
      },
    });
    passId = pass.id;
    const futurePass = await db.userPass.create({
      data: {
        userId: buyer.id,
        passId,
        startsAt: new Date(Date.now() + 60000),
        expiresAt: new Date(Date.now() + 86400000),
      },
    });
    await check(
      'GET',
      '/videos/problem?problemId=' + problems[1],
      buyer,
      undefined,
      403,
    );
    await db.userPass.update({
      where: { id: futurePass.id },
      data: { startsAt: new Date(Date.now() - 1000) },
    });
    const paidrows = await check(
      'GET',
      '/videos/problem?problemId=' + problems[1],
      buyer,
    );
    assert.equal(paidrows[0].id, paid.id);
    await check(
      'POST',
      '/videos/' + paid.id + '/open',
      buyer,
      { problemId: problems[1] },
      201,
    );
    assert(
      (await check('GET', '/videos?chapterId=' + chapters[0], pupil)).every(
        (v) => !v.problemId,
      ),
    );
    await check(
      'PATCH',
      '/videos/' + owned.id,
      plus,
      { chapterId: chapters[1] },
      400,
    );
    await check('PATCH', '/videos/' + owned.id, plus, { problemId: null });
    assert.equal(
      (await check('GET', '/videos/problem?problemId=' + problems[0], pupil))
        .length,
      0,
    );
    for (const url of [
      'https://evil-youtube.com/watch?v=AbCdEfGhI_1',
      'http://youtube.com/watch?v=AbCdEfGhI_1',
      'https://evil.test/iframe',
    ])
      await check('POST', '/videos', plus, { ...base, url }, 400);
    await check('DELETE', '/videos/' + paid.id, owner, undefined, 403);
    await check('DELETE', '/videos/' + paid.id, admin);
    const retained = await db.video.findUnique({ where: { id: paid.id } });
    assert(retained?.deletedAt);
    assert.equal(retained.problemId, problems[1]);
    assert.equal(
      (await check('GET', '/videos/problem?problemId=' + problems[1], buyer))
        .length,
      0,
    );
    assert(
      (await db.auditLog.count({
        where: { actorId: { in: users }, entity: 'Video' },
      })) >= 6,
    );
    console.log(
      'PASS: actual local HTTP video exact mapping/detach, author/legacy ownership, same-chapter rejection, paid BUYER entitlement, metadata privacy, explicit exposure, safe media validation, transactional audit and retained soft deletion.',
    );
  } finally {
    await db.purchase.deleteMany({ where: { userId: { in: users } } });
    if (bookId) await db.productItem.deleteMany({ where: { refId: bookId } });
    await db.learningEvent.deleteMany({ where: { userId: { in: users } } });
    await db.auditLog.deleteMany({ where: { actorId: { in: users } } });
    await db.userPass.deleteMany({ where: { userId: { in: users } } });
    if (passId) await db.pass.delete({ where: { id: passId } });
    await db.video.deleteMany({ where: { chapterId: { in: chapters } } });
    await db.problem.deleteMany({ where: { id: { in: problems } } });
    await db.theoryBlock.deleteMany({ where: { chapterId: { in: chapters } } });
    await db.chapter.deleteMany({ where: { id: { in: chapters } } });
    if (bookId) await db.book.delete({ where: { id: bookId } });
    await db.user.deleteMany({ where: { id: { in: users } } });
    await app.close();
  }
})().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
