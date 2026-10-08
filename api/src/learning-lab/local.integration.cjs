/** Opt-in local real PostgreSQL + production controllers/guards test. Never runs in normal Jest. */
require('reflect-metadata');
require('dotenv').config({ quiet: true });
const assert = require('node:assert/strict');
const http = require('node:http');
const { randomUUID } = require('node:crypto');
const { Module, ValidationPipe } = require('@nestjs/common');
const { NestFactory } = require('@nestjs/core');
const { JwtService } = require('@nestjs/jwt');
const { PrismaModule } = require('../../dist/src/prisma/prisma.module');
const { PrismaService } = require('../../dist/src/prisma/prisma.service');
const {
  LearningLabService,
} = require('../../dist/src/learning-lab/learning-lab.service');
const {
  LearningLabController,
} = require('../../dist/src/learning-lab/learning-lab.controller');
const {
  DismissalService,
} = require('../../dist/src/learning-lab/dismissal.service');
const {
  DismissalController,
} = require('../../dist/src/learning-lab/dismissal.controller');
const { ParentsService } = require('../../dist/src/parents/parents.service');
const {
  ParentsController,
} = require('../../dist/src/parents/parents.controller');
const {
  EmailOtpService,
} = require('../../dist/src/notifications/email-otp.service');
const { JwtStrategy } = require('../../dist/src/auth/jwt.strategy');
const { JwtAuthGuard } = require('../../dist/src/auth/guards/jwt-auth.guard');
const { RolesGuard } = require('../../dist/src/auth/guards/roles.guard');
const { generate } = require('../../dist/src/learning-lab/generator');
const configured = new URL(process.env.DATABASE_URL ?? '');
assert(
  ['localhost', '127.0.0.1'].includes(configured.hostname) &&
    configured.port === '5544',
  'Refusing a database outside approved local v2 port 5544',
);
assert(process.env.JWT_SECRET, 'Local JWT secret missing');
let providerCalls = 0;
class LocalLearningTestModule {}
Module({
  imports: [PrismaModule],
  controllers: [LearningLabController, DismissalController, ParentsController],
  providers: [
    LearningLabService,
    DismissalService,
    ParentsService,
    JwtStrategy,
    JwtAuthGuard,
    RolesGuard,
    {
      provide: EmailOtpService,
      useValue: {
        sendOtp: async () => {
          providerCalls++;
          throw new Error('No email permitted in local integration');
        },
        verifyOtp: async () => {
          providerCalls++;
          throw new Error('No email permitted in local integration');
        },
      },
    },
  ],
})(LocalLearningTestModule);
(async () => {
  const app = await NestFactory.create(LocalLearningTestModule, {
    logger: false,
  });
  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  await app.listen(0, '127.0.0.1');
  const db = app.get(PrismaService),
    port = app.getHttpServer().address().port,
    run = `v2-integration-${randomUUID()}`,
    ids = [],
    classIds = [];
  const jwt = new JwtService({ secret: process.env.JWT_SECRET });
  async function user(role, suffix) {
    const created = await db.user.create({
      data: {
        id: `${run}-${suffix}`,
        username: `${run}-${suffix}`,
        firstName: 'Integration',
        lastName: 'Fixture',
        passwordHash: 'disabled-test-login',
        role,
      },
    });
    ids.push(created.id);
    return { id: created.id, token: jwt.sign({ sub: created.id, role }) };
  }
  function request(method, path, token, body) {
    return new Promise((resolve, reject) => {
      const data = body === undefined ? null : JSON.stringify(body);
      const req = http.request(
        {
          hostname: '127.0.0.1',
          port,
          path: `/api${path}`,
          method,
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
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
          res.on('end', () => {
            let json;
            try {
              json = JSON.parse(text);
            } catch {
              json = text;
            }
            resolve({ status: res.statusCode, body: json });
          });
        },
      );
      req.on('error', reject);
      if (data) req.write(data);
      req.end();
    });
  }
  try {
    const pupil = await user('STUDENT', 'pupil'),
      other = await user('STUDENT', 'other'),
      teacher = await user('TEACHER', 'teacher'),
      plus = await user('TEACHER_PLUS', 'plus'),
      parent = await user('PARENT', 'parent'),
      pending = await user('PARENT', 'pending'),
      buyer = await user('BUYER', 'buyer');
    const classroom = await db.classroom.create({
      data: {
        id: `${run}-class`,
        name: 'Integration class',
        type: 'IN_PERSON',
        teacherId: teacher.id,
      },
    });
    classIds.push(classroom.id);
    await db.enrollment.create({
      data: {
        studentId: pupil.id,
        classroomId: classroom.id,
        joinedAt: new Date('2026-09-01T00:00Z'),
      },
    });
    await db.assignment.create({
      data: {
        id: `${run}-assignment`,
        classroomId: classroom.id,
        title: 'Integration archived submission',
        imageKeys: [],
        createdById: teacher.id,
        deletedAt: new Date('2026-10-07'),
      },
    });
    const submission = await db.submission.create({
      data: {
        id: `${run}-submission`,
        assignmentId: `${run}-assignment`,
        studentId: pupil.id,
        state: 'DONE_ONLINE',
        imageKeys: [],
        studentNote: 'Pupil visible original',
        reviewNote: 'Pupil visible teacher assessment',
        note: 'Ambiguous legacy must stay private',
        submittedAt: new Date('2026-09-15'),
        checkedAt: new Date('2026-09-16'),
      },
    });
    await db.submissionRevision.createMany({
      data: [
        {
          submissionId: submission.id,
          action: 'SUBMIT',
          actorId: pupil.id,
          state: 'SUBMITTED',
          imageKeys: [],
          studentNote: 'Pupil visible original',
          at: new Date('2026-09-15'),
        },
        {
          submissionId: submission.id,
          action: 'APPROVE',
          actorId: teacher.id,
          state: 'DONE_ONLINE',
          imageKeys: [],
          studentNote: 'Pupil visible original',
          reviewNote: 'Pupil visible teacher assessment',
          legacyNote: 'Ambiguous legacy must stay private',
          at: new Date('2026-09-16'),
        },
      ],
    });
    await db.parentLink.createMany({
      data: [
        { parentId: parent.id, studentId: pupil.id, verifiedAt: new Date() },
        { parentId: pending.id, studentId: pupil.id },
      ],
    });
    for (const family of [
      'vector-dot',
      'derivative-value',
      'integral-definite',
    ]) {
      const exact = generate(family, 4294967295),
        path = `/learning-lab/problem?family=${family}&seed=4294967295`;
      const task = await request('GET', path, buyer.token);
      assert.equal(task.status, 200);
      for (const key of ['answers', 'solution', 'coefficients'])
        assert(!(key in task.body));
      assert.equal((await request('GET', path, teacher.token)).status, 403);
      const saved = await request(
        'POST',
        '/learning-lab/response',
        buyer.token,
        {
          problemId: exact.id,
          answer: exact.answers[0],
          mode: 'independent',
          flags: [],
        },
      );
      assert.equal(saved.status, 201);
      assert.equal(saved.body.correct, true);
      const replay = await request(
        'POST',
        '/learning-lab/response',
        buyer.token,
        { problemId: exact.id, answer: '999', mode: 'probe' },
      );
      assert.equal(replay.body.answer, exact.answers[0]);
      assert.equal(
        (await request('GET', path, buyer.token)).body.first.answer,
        exact.answers[0],
      );
      await request('POST', '/learning-lab/solution', buyer.token, {
        problemId: exact.id,
      });
      const corrected = await request(
        'POST',
        '/learning-lab/correction',
        buyer.token,
        { problemId: exact.id, answer: exact.answers[0] },
      );
      assert.equal(corrected.body.kind, 'solution-assisted-correction');
    }
    const p = generate('quadratic', 42),
      url = '/learning-lab/problem?family=quadratic&seed=42';
    assert.equal((await request('GET', url)).status, 401);
    assert.equal((await request('GET', url, parent.token)).status, 403);
    const before = await request('GET', url, pupil.token);
    assert.equal(before.status, 200);
    assert.equal(before.body.first, null);
    for (const key of ['answers', 'solution', 'coefficients'])
      assert(!(key in before.body));
    assert.equal(
      (
        await request('POST', '/learning-lab/solution', other.token, {
          problemId: p.id,
        })
      ).status,
      403,
    );
    assert.equal(
      (
        await request('POST', '/learning-lab/response', pupil.token, {
          problemId: p.id,
          answer: 'process.exit()',
          autoCorrect: true,
        })
      ).status,
      400,
    );
    assert.equal(
      (
        await request('POST', '/learning-lab/response', pupil.token, {
          problemId: p.id,
          answer: '1',
          timing: { focusedMs: 999999999 },
        })
      ).status,
      400,
    );
    const first = await request('POST', '/learning-lab/response', pupil.token, {
      problemId: p.id,
      answer: '999',
      flags: ['unsure'],
      mode: 'classroom',
    });
    assert.equal(first.status, 201);
    assert.equal(first.body.correct, false);
    const parallel = await Promise.all(
      Array.from({ length: 5 }, () =>
        request('POST', '/learning-lab/response', pupil.token, {
          problemId: p.id,
          answer: p.answers.join(','),
          mode: 'independent',
        }),
      ),
    );
    for (const replay of parallel) assert.equal(replay.body.answer, '999');
    const reopened = await request('GET', url, pupil.token);
    assert.equal(reopened.body.first.answer, '999');
    assert.equal(reopened.body.first.mode, 'classroom');
    assert.equal((await request('GET', url, other.token)).body.first, null);
    const correction = await request(
      'POST',
      '/learning-lab/correction',
      pupil.token,
      { problemId: p.id, answer: p.answers.join(',') },
    );
    assert.equal(correction.body.kind, 'retry-before-solution');
    assert.equal(correction.body.correct, true);
    const solution = await request(
      'POST',
      '/learning-lab/solution',
      pupil.token,
      { problemId: p.id },
    );
    assert.equal(solution.status, 201);
    assert.equal(solution.body.available, true);
    const assisted = await request(
      'POST',
      '/learning-lab/correction',
      pupil.token,
      { problemId: p.id, answer: p.answers.join(',') },
    );
    assert.equal(assisted.body.kind, 'solution-assisted-correction');
    assert.equal(
      await db.learningEvent.count({
        where: { userId: pupil.id, id: { startsWith: 'lab-first-' } },
      }),
      1,
    );
    const dismissalPath = `/learning-lab/classrooms/${classroom.id}/dismissal?date=2026-10-07`;
    assert.equal(
      (
        await request('PUT', dismissalPath, parent.token, {
          approximateTime: '18:30',
        })
      ).status,
      403,
    );
    assert.equal(
      (
        await request('PUT', dismissalPath, plus.token, {
          approximateTime: '18:30',
        })
      ).status,
      403,
    );
    assert.equal(
      (
        await request('PUT', dismissalPath, teacher.token, {
          approximateTime: '24:00',
        })
      ).status,
      400,
    );
    assert.equal(
      (
        await request('PUT', dismissalPath, teacher.token, {
          approximateTime: '18:30',
          staffNote: 'private',
        })
      ).status,
      400,
    );
    const saved = await request('PUT', dismissalPath, teacher.token, {
      approximateTime: '18:30',
      lastLeftTime: '18:45',
      note: 'Pupil-visible class note',
    });
    assert.equal(saved.status, 200);
    assert.equal(saved.body.approximateAt, '2026-10-07T10:30:00.000Z');
    await db.classDismissal.create({
      data: {
        classroomId: classroom.id,
        date: new Date('2026-08-01'),
        approximateAt: new Date('2026-08-01T10:30Z'),
        issuedById: teacher.id,
        note: 'before enrollment',
      },
    });
    const historyPath = `/parent/children/${pupil.id}/history?year=2026`;
    assert.equal(
      (await request('GET', historyPath, pending.token)).status,
      403,
    );
    assert.equal(
      (
        await request(
          'GET',
          `/parent/children/${other.id}/history?year=2026`,
          parent.token,
        )
      ).status,
      403,
    );
    const history = await request('GET', historyPath, parent.token);
    assert.equal(history.status, 200);
    assert.equal(history.body.dismissals.rows.length, 1);
    assert.equal(
      history.body.dismissals.rows[0].note,
      'Pupil-visible class note',
    );
    assert(!('issuedById' in history.body.dismissals.rows[0]));
    assert(
      history.body.learning.rows.some(
        (r) => r.evidence.kind === 'first' && r.evidence.answer === '999',
      ),
    );
    assert(
      history.body.learning.rows.some(
        (r) => r.evidence.kind === 'solution-assisted-correction',
      ),
    );
    assert.equal(history.body.submissions.rows.length, 1);
    assert.equal(history.body.submissions.rows[0].revisions.length, 2);
    assert.equal(
      history.body.submissions.rows[0].studentNote,
      'Pupil visible original',
    );
    assert.equal(
      history.body.submissions.rows[0].reviewNote,
      'Pupil visible teacher assessment',
    );
    assert(
      !JSON.stringify(history.body).includes(
        'Ambiguous legacy must stay private',
      ),
    );
    assert(!('actorId' in history.body.submissions.rows[0].revisions[0]));
    assert.equal(providerCalls, 0);
    console.log(
      'PASS: isolated local PostgreSQL + HTTP JWT/role/ownership, 5 parallel first-answer replays, reload, exact grading, malformed input, correction/exposure, dismissal timezone, parent enrollment windows, archived submission/revision visibility and legacy-note exclusion. No secrets printed or external provider called.',
    );
  } finally {
    await db.submissionRevision.deleteMany({
      where: { submissionId: `${run}-submission` },
    });
    await db.submission.deleteMany({ where: { id: `${run}-submission` } });
    await db.assignment.deleteMany({ where: { id: `${run}-assignment` } });
    await db.classDismissal.deleteMany({
      where: { classroomId: { in: classIds } },
    });
    await db.enrollment.deleteMany({ where: { studentId: { in: ids } } });
    await db.parentLink.deleteMany({
      where: { OR: [{ parentId: { in: ids } }, { studentId: { in: ids } }] },
    });
    await db.learningEvent.deleteMany({ where: { userId: { in: ids } } });
    await db.classroom.deleteMany({ where: { id: { in: classIds } } });
    await db.user.deleteMany({ where: { id: { in: ids } } });
    await app.close();
  }
})().catch((error) => {
  console.error('Local integration failed:', error.message);
  process.exitCode = 1;
});
