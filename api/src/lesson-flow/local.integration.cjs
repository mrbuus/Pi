/** Opt-in actual local DB + production JWT, role, packet and file authorization. */
require('reflect-metadata');
require('dotenv').config({ quiet: true });
const assert = require('node:assert/strict'),
  http = require('node:http'),
  { randomUUID } = require('node:crypto');
const { Module, Controller, Get, UseGuards } = require('@nestjs/common'),
  { NestFactory } = require('@nestjs/core'),
  { JwtService } = require('@nestjs/jwt');
const { PrismaModule } = require('../../dist/src/prisma/prisma.module'),
  { PrismaService } = require('../../dist/src/prisma/prisma.service');
const { JwtStrategy } = require('../../dist/src/auth/jwt.strategy'),
  { JwtAuthGuard } = require('../../dist/src/auth/guards/jwt-auth.guard'),
  { RolesGuard } = require('../../dist/src/auth/guards/roles.guard');
const {
    LessonFlowService,
  } = require('../../dist/src/lesson-flow/lesson-flow.service'),
  {
    LessonFlowController,
  } = require('../../dist/src/lesson-flow/lesson-flow.controller');
const {
    LearningLabService,
  } = require('../../dist/src/learning-lab/learning-lab.service'),
  {
    LearningLabController,
  } = require('../../dist/src/learning-lab/learning-lab.controller');
const { FilesAuthGuard } = require('../../dist/src/storage/files-auth.guard'),
  {
    FileAuthorizationService,
  } = require('../../dist/src/storage/file-authorization.service');
const {
    RecommendService,
  } = require('../../dist/src/recommend/recommend.service'),
  {
    RecommendController,
  } = require('../../dist/src/recommend/recommend.controller'),
  {
    MistakeCollector,
  } = require('../../dist/src/mistakes/mistake-collector.service');
const { ParentsService } = require('../../dist/src/parents/parents.service'),
  { ParentsController } = require('../../dist/src/parents/parents.controller'),
  {
    EmailOtpService,
  } = require('../../dist/src/notifications/email-otp.service');
const url = new URL(process.env.DATABASE_URL || '');
assert(
  ['localhost', '127.0.0.1'].includes(url.hostname) && url.port === '5544',
  'Only approved local database',
);
const jwt = new JwtService({ secret: process.env.JWT_SECRET });
class FilesProbe {
  read() {
    return { ok: true };
  }
}
Controller('files')(FilesProbe);
Get(':key')(
  FilesProbe.prototype,
  'read',
  Object.getOwnPropertyDescriptor(FilesProbe.prototype, 'read'),
);
UseGuards(FilesAuthGuard)(
  FilesProbe.prototype,
  'read',
  Object.getOwnPropertyDescriptor(FilesProbe.prototype, 'read'),
);
class TestModule {}
Module({
  imports: [PrismaModule],
  controllers: [
    LessonFlowController,
    LearningLabController,
    FilesProbe,
    ParentsController,
    RecommendController,
  ],
  providers: [
    RecommendService,
    { provide: MistakeCollector, useValue: { collectAttempt: async () => {} } },
    ParentsService,
    {
      provide: EmailOtpService,
      useValue: {
        sendOtp: async () => {
          throw new Error('External provider prohibited');
        },
        verifyOtp: async () => {
          throw new Error('External provider prohibited');
        },
      },
    },
    LessonFlowService,
    LearningLabService,
    JwtStrategy,
    JwtAuthGuard,
    RolesGuard,
    FilesAuthGuard,
    FileAuthorizationService,
    { provide: JwtService, useValue: jwt },
  ],
})(TestModule);
(async () => {
  const app = await NestFactory.create(TestModule, { logger: false });
  app.setGlobalPrefix('api');
  await app.listen(0, '127.0.0.1');
  const db = app.get(PrismaService),
    port = app.getHttpServer().address().port,
    run = 'lesson-fixture-' + randomUUID(),
    ids = [],
    classIds = [],
    keys = [];
  let chapterId, passId;
  async function user(role, suffix) {
    const u = await db.user.create({
      data: {
        id: run + '-' + suffix,
        firstName: 'Synthetic',
        lastName: suffix,
        passwordHash: 'not-a-login',
        role,
      },
    });
    ids.push(u.id);
    return u;
  }
  function request(method, path, user, body) {
    const text = body === undefined ? undefined : JSON.stringify(body),
      token = jwt.sign({ sub: user.id, role: 'ADMIN' });
    return new Promise((resolve, reject) => {
      const req = http.request(
        {
          hostname: '127.0.0.1',
          port,
          path: '/api' + path,
          method,
          headers: {
            Authorization: 'Bearer ' + token,
            ...(text
              ? {
                  'Content-Type': 'application/json',
                  'Content-Length': Buffer.byteLength(text),
                }
              : {}),
          },
        },
        (res) => {
          let data = '';
          res.on('data', (c) => (data += c));
          res.on('end', () => {
            try {
              data = JSON.parse(data);
            } catch {}
            resolve({ status: res.statusCode, body: data });
          });
        },
      );
      req.on('error', reject);
      if (text) req.write(text);
      req.end();
    });
  }
  async function ok(method, path, user, body) {
    const r = await request(method, path, user, body);
    assert.equal(
      r.status,
      method === 'POST' ? 201 : 200,
      typeof r.body === 'object' ? r.body.message : r.body,
    );
    return r.body;
  }
  try {
    const a = await user('STUDENT', 'a'),
      b = await user('STUDENT', 'b'),
      other = await user('STUDENT', 'other'),
      owner = await user('TEACHER', 'owner'),
      random = await user('TEACHER_PLUS', 'random'),
      parent = await user('PARENT', 'parent'),
      pending = await user('PARENT', 'pending'),
      buyer = await user('BUYER', 'buyer');
    const c = await db.classroom.create({
      data: { name: run, type: 'IN_PERSON', teacherId: owner.id },
    });
    classIds.push(c.id);
    await db.enrollment.createMany({
      data: [a, b].map((u) => ({
        classroomId: c.id,
        studentId: u.id,
        joinedAt: new Date('2026-09-01'),
      })),
    });
    await db.parentLink.createMany({
      data: [
        { parentId: parent.id, studentId: a.id, verifiedAt: new Date() },
        { parentId: pending.id, studentId: a.id },
      ],
    });
    const otherClass = await db.classroom.create({
      data: { name: run + '-other', type: 'IN_PERSON', teacherId: random.id },
    });
    classIds.push(otherClass.id);
    await db.enrollment.create({
      data: {
        classroomId: otherClass.id,
        studentId: other.id,
        joinedAt: new Date('2026-09-01'),
      },
    });
    const ch = await db.chapter.create({
      data: { title: run, order: 0, freePreview: false },
    });
    chapterId = ch.id;
    const theory = await db.theoryBlock.create({
      data: {
        chapterId,
        title: 'Actual fixture theory',
        content: '$x+1$',
        imageKeys: [],
        order: 0,
      },
    });
    const test = await db.test.create({
      data: {
        title: 'A fixture',
        type: 'DAILY',
        chapterId,
        createdById: owner.id,
        variantLabel: 'A',
      },
    });
    const problem = await db.problem.create({
      data: {
        token: run,
        chapterId,
        format: 'OPEN',
        statementText: '$1+1$',
        correctAnswer: '2',
        createdById: owner.id,
      },
    });
    for (const suffix of ['theory', 'private', 'second']) {
      const key = run + '-' + suffix + '.png';
      keys.push(key);
      await db.storedFile.create({
        data: {
          key,
          ownerId: a.id,
          mime: 'image/png',
          size: 1,
          bytes: Buffer.from([1]),
        },
      });
    }
    const legacy = run + '-legacy.png';
    keys.push(legacy);
    await db.storedFile.create({
      data: {
        key: legacy,
        ownerId: null,
        mime: 'image/png',
        size: 1,
        bytes: Buffer.from([1]),
      },
    });
    await db.theoryBlock.update({
      where: { id: theory.id },
      data: { imageKeys: [legacy] },
    });
    const day = '2026-10-06',
      endpoint = `/lesson-flow/classrooms/${c.id}/day?date=${day}`,
      input = {
        chapterId,
        theoryBlockIds: [theory.id],
        testId: test.id,
        makeupTestId: test.id,
        homework: {
          title: 'Teacher adjusted HW',
          description: 'Actual problem IDs',
          imageKeys: [],
          dueDate: '2026-10-08',
        },
      };
    assert.equal((await request('PUT', endpoint, random, input)).status, 403);
    assert.equal((await request('PUT', endpoint, a, input)).status, 403);
    const saves = await Promise.all(
      Array.from({ length: 5 }, () => ok('PUT', endpoint, owner, input)),
    );
    assert.equal(new Set(saves.map((p) => p.id)).size, 1);
    const packet = saves[0];
    assert.equal(
      await db.assignment.count({ where: { classroomId: c.id } }),
      1,
    );
    assert.equal(
      await db.classTestSession.count({ where: { classroomId: c.id } }),
      1,
    );
    await ok('PUT', endpoint, owner, {
      chapterId,
      homework: { ...input.homework, title: 'Retained teacher edit' },
    });
    assert.equal(
      (
        await db.assignment.findUnique({
          where: { id: packet.homeworkAssignmentId },
        })
      ).title,
      'Retained teacher edit',
    );
    await db.attendance.createMany({
      data: [
        {
          classroomId: c.id,
          studentId: a.id,
          date: new Date(day),
          status: 'PRESENT',
          markedById: owner.id,
        },
        {
          classroomId: c.id,
          studentId: b.id,
          date: new Date(day),
          status: 'ABSENT',
          markedById: owner.id,
        },
      ],
    });
    const turns = await Promise.all(
      Array.from({ length: 4 }, () =>
        ok('POST', `/lesson-flow/days/${packet.id}/photo-turn`, owner, {}),
      ),
    );
    assert.equal(new Set(turns.map((t) => t.id)).size, 1);
    assert.equal(turns[0].studentId, a.id);
    assert.equal(
      (await request('GET', `/lesson-flow/days/${packet.id}`, other)).status,
      403,
    );
    assert.equal(
      (await request('GET', `/lesson-flow/days/${packet.id}`, pending)).status,
      403,
    );
    await ok('GET', `/lesson-flow/days/${packet.id}`, parent);
    for (const u of [a, b, parent, owner])
      assert.equal((await request('GET', '/files/' + legacy, u)).status, 200);
    assert.equal((await request('GET', '/files/' + legacy, other)).status, 403);
    const receipt = {
      kind: 'THEORY',
      imageKeys: [keys[0]],
      clientRequestId: 'fixture-request-0001',
    };
    const receipts = await Promise.all(
      Array.from({ length: 5 }, () =>
        ok('POST', `/lesson-flow/days/${packet.id}/receipts`, a, receipt),
      ),
    );
    assert.equal(new Set(receipts.map((r) => r.id)).size, 1);
    assert.equal(
      (
        await request('POST', `/lesson-flow/days/${packet.id}/receipts`, a, {
          ...receipt,
          imageKeys: [keys[1]],
        })
      ).status,
      409,
    );
    await ok('POST', `/lesson-flow/days/${packet.id}/receipts`, a, {
      kind: 'CLASS_TEST',
      imageKeys: [keys[1]],
      clientRequestId: 'fixture-request-0002',
    });
    await ok('POST', `/lesson-flow/days/${packet.id}/receipts`, a, {
      kind: 'HOMEWORK',
      imageKeys: [keys[1]],
      clientRequestId: 'fixture-request-0003',
    });
    await ok('POST', `/lesson-flow/days/${packet.id}/receipts`, a, {
      kind: 'MAKEUP',
      imageKeys: [keys[1]],
      clientRequestId: 'fixture-request-0004',
    });
    await ok('POST', `/lesson-flow/days/${packet.id}/receipts`, a, {
      ...receipt,
      imageKeys: [keys[2]],
      clientRequestId: 'fixture-request-0005',
    });
    assert.equal(
      (
        await request('POST', `/lesson-flow/days/${packet.id}/receipts`, b, {
          ...receipt,
          clientRequestId: 'fixture-request-0006',
        })
      ).status,
      403,
    );
    for (const u of [a, b, parent, owner])
      assert.equal((await request('GET', '/files/' + keys[0], u)).status, 200);
    for (const u of [other, random, pending])
      assert.equal((await request('GET', '/files/' + keys[0], u)).status, 403);
    for (const u of [a, parent, owner])
      assert.equal((await request('GET', '/files/' + keys[1], u)).status, 200);
    for (const u of [b, other, random, pending])
      assert.equal((await request('GET', '/files/' + keys[1], u)).status, 403);
    const preview = await ok(
      'GET',
      `/lesson-flow/classrooms/${c.id}/preview?date=${day}&chapterId=${chapterId}`,
      owner,
    );
    assert.deepEqual(preview.counters, {
      classSize: 2,
      theorySubmitted: 1,
      classTestSubmitted: 1,
      homeworkSubmitted: 1,
    });
    assert.equal(preview.prefill.title, 'Retained teacher edit');
    assert.equal(
      (await ok('GET', `/lesson-flow/days/${packet.id}`, a)).receipts.length,
      5,
    );
    const next = await ok(
      'PUT',
      `/lesson-flow/classrooms/${c.id}/day?date=2026-10-07`,
      owner,
      input,
    );
    await db.attendance.createMany({
      data: [a, b].map((u) => ({
        classroomId: c.id,
        studentId: u.id,
        date: new Date('2026-10-07'),
        status: 'PRESENT',
        markedById: owner.id,
      })),
    });
    const catchup = await ok(
      'POST',
      `/lesson-flow/days/${next.id}/photo-turn`,
      owner,
      {},
    );
    assert.equal(catchup.studentId, b.id);
    assert.equal(catchup.reason, 'MISSED_TURN');
    const override = await ok(
      'POST',
      `/lesson-flow/days/${next.id}/photo-turn`,
      owner,
      { studentId: a.id, reason: 'Teacher selected volunteer' },
    );
    assert.equal(override.id, catchup.id);
    assert.equal(override.studentId, a.id);
    assert.equal(override.reason, 'Teacher selected volunteer');
    assert.equal(
      (
        await request('POST', `/lesson-flow/days/${packet.id}/receipts`, a, {
          ...receipt,
          imageKeys: Array.from({ length: 11 }, () => keys[0]),
          clientRequestId: 'fixture-malicious-001',
        })
      ).status,
      400,
    );
    assert.equal(
      (await request('GET', `/learning-lab/bank/${problem.id}`, buyer)).status,
      403,
    );
    const pass = await db.pass.create({
      data: { name: run, durationDays: 10, scope: { chapterIds: [chapterId] } },
    });
    passId = pass.id;
    await db.userPass.create({
      data: {
        userId: buyer.id,
        passId,
        expiresAt: new Date(Date.now() + 86400000),
      },
    });
    await ok('GET', `/learning-lab/bank/${problem.id}`, buyer);
    assert.equal(
      (
        await ok('POST', '/learning-lab/response', buyer, {
          problemId: problem.id,
          answer: '2',
        })
      ).correct,
      true,
    );
    const problem2 = await db.problem.create({
      data: {
        token: run + '-second',
        chapterId,
        format: 'OPEN',
        statementText: '$2+2$',
        correctAnswer: '4',
        createdById: owner.id,
      },
    });
    await db.testProblem.createMany({
      data: [
        { testId: test.id, problemId: problem.id, order: 0 },
        { testId: test.id, problemId: problem2.id, order: 1 },
      ],
    });
    await db.attempt.create({
      data: {
        studentId: b.id,
        problemId: problem.id,
        classroomId: c.id,
        source: 'EVENING_SELF_REPORT',
        occurredOn: new Date(day),
        selfState: 'GUESSED',
      },
    });
    assert.equal(
      (
        await ok(
          'GET',
          `/lesson-flow/classrooms/${c.id}/preview?date=${day}&chapterId=${chapterId}`,
          owner,
        )
      ).counters.classTestSubmitted,
      1,
    );
    await db.attempt.create({
      data: {
        studentId: b.id,
        problemId: problem2.id,
        classroomId: c.id,
        source: 'EVENING_SELF_REPORT',
        occurredOn: new Date(day),
        selfState: 'FAILED',
      },
    });
    assert.equal(
      (
        await ok(
          'GET',
          `/lesson-flow/classrooms/${c.id}/preview?date=${day}&chapterId=${chapterId}`,
          owner,
        )
      ).counters.classTestSubmitted,
      2,
    );
    const nextRecommendations = await ok(
      'GET',
      '/recommend/next?limit=50',
      buyer,
    );
    assert(
      nextRecommendations.every(
        (r) =>
          r.contract === 'observed-independent-v1' && !('correctAnswer' in r),
      ),
    );
    assert(!nextRecommendations.some((r) => r.problemId === problem.id));
    assert(nextRecommendations.some((r) => r.problemId === problem2.id));
    assert.equal(
      (await request('GET', '/recommend/next?limit=nan', buyer)).status,
      400,
    );
    const unentitled = await ok('GET', '/recommend/next?limit=3', other);
    assert(
      !unentitled.some((r) => [problem.id, problem2.id].includes(r.problemId)),
    );
    assert.equal(
      (
        await request('POST', '/recommend/attempt', other, {
          problemId: problem.id,
          givenAnswer: '2',
          autoCorrect: true,
        })
      ).status,
      403,
    );
    const buyerGrade = await ok('POST', '/recommend/attempt', buyer, {
      problemId: problem2.id,
      givenAnswer: '999',
      autoCorrect: true,
    });
    assert.equal(buyerGrade.correct, false);
    const parentHistory = await ok(
      'GET',
      `/parent/children/${a.id}/history?year=2026`,
      parent,
    );
    assert.equal(parentHistory.lessonPackets.rows.length, 2);
    assert.equal(
      parentHistory.lessonPackets.rows.find((p) => p.id === packet.id).receipts
        .length,
      5,
    );
    assert.equal(
      (
        await request(
          'GET',
          `/parent/children/${b.id}/history?year=2026`,
          parent,
        )
      ).status,
      403,
    );
    console.log(
      'PASS: actual local HTTP packet atomic replay/edit, append receipt conflict/reload/distinct counters, role/cross-class/file privacy, attendance missed-turn cycle, BUYER real-role entitlement.',
    );
  } finally {
    await db.attempt.deleteMany({ where: { studentId: { in: ids } } });
    await db.learningEvent.deleteMany({ where: { userId: { in: ids } } });
    await db.lessonReceipt.deleteMany({
      where: { packet: { classroomId: { in: classIds } } },
    });
    await db.lessonPhotoTurn.deleteMany({
      where: { packet: { classroomId: { in: classIds } } },
    });
    await db.lessonPacket.deleteMany({
      where: { classroomId: { in: classIds } },
    });
    await db.lessonRotation.deleteMany({
      where: { classroomId: { in: classIds } },
    });
    await db.classTestSession.deleteMany({
      where: { classroomId: { in: classIds } },
    });
    await db.assignment.deleteMany({
      where: { classroomId: { in: classIds } },
    });
    await db.attendance.deleteMany({
      where: { classroomId: { in: classIds } },
    });
    await db.enrollment.deleteMany({
      where: { classroomId: { in: classIds } },
    });
    if (chapterId) {
      await db.testAccess.deleteMany({ where: { test: { chapterId } } });
      await db.test.deleteMany({ where: { chapterId } });
      await db.problem.deleteMany({ where: { chapterId } });
      await db.theoryBlock.deleteMany({ where: { chapterId } });
      await db.chapter.delete({ where: { id: chapterId } });
    }
    await db.classroom.deleteMany({ where: { id: { in: classIds } } });
    await db.parentLink.deleteMany({ where: { parentId: { in: ids } } });
    await db.storedFile.deleteMany({ where: { key: { in: keys } } });
    await db.userPass.deleteMany({ where: { userId: { in: ids } } });
    if (passId) await db.pass.delete({ where: { id: passId } });
    await db.user.deleteMany({ where: { id: { in: ids } } });
    await app.close();
  }
})().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
