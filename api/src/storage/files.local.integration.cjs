require('reflect-metadata');
require('dotenv').config({ quiet: true });
const assert = require('node:assert/strict'),
  http = require('node:http'),
  { randomUUID } = require('node:crypto');
const { Controller, Get, UseGuards, Module } = require('@nestjs/common'),
  { NestFactory } = require('@nestjs/core'),
  { JwtService } = require('@nestjs/jwt');
const { PrismaModule } = require('../../dist/src/prisma/prisma.module'),
  { PrismaService } = require('../../dist/src/prisma/prisma.service');
const { FilesAuthGuard } = require('../../dist/src/storage/files-auth.guard'),
  {
    FileAuthorizationService,
  } = require('../../dist/src/storage/file-authorization.service');
const url = new URL(process.env.DATABASE_URL || '');
assert(
  ['localhost', '127.0.0.1'].includes(url.hostname) && url.port === '5544',
  'Only approved local v2 database',
);
const jwt = new JwtService({ secret: process.env.JWT_SECRET });
class Probe {
  read() {
    return { ok: true };
  }
}
Controller('files')(Probe);
Get(':key')(
  Probe.prototype,
  'read',
  Object.getOwnPropertyDescriptor(Probe.prototype, 'read'),
);
UseGuards(FilesAuthGuard)(
  Probe.prototype,
  'read',
  Object.getOwnPropertyDescriptor(Probe.prototype, 'read'),
);
class TestModule {}
Module({
  imports: [PrismaModule],
  controllers: [Probe],
  providers: [
    FilesAuthGuard,
    FileAuthorizationService,
    { provide: JwtService, useValue: jwt },
  ],
})(TestModule);
(async () => {
  const app = await NestFactory.create(TestModule, { logger: false });
  await app.listen(0, '127.0.0.1');
  const db = app.get(PrismaService),
    port = app.getHttpServer().address().port,
    run = 'file-test-' + randomUUID(),
    ids = [],
    keys = [];
  let classId, assignmentId;
  async function user(role, suffix) {
    const u = await db.user.create({
      data: {
        id: run + '-' + suffix,
        firstName: 'Local',
        lastName: suffix,
        passwordHash: 'not-a-login',
        role,
      },
    });
    ids.push(u.id);
    return u;
  }
  async function get(user, key, extra = {}) {
    const token = jwt.sign({ sub: user.id, role: 'ADMIN', ...extra });
    return new Promise((resolve, reject) => {
      http
        .get(
          {
            host: '127.0.0.1',
            port,
            path: '/files/' + key,
            headers: { Authorization: 'Bearer ' + token },
          },
          (r) => {
            r.resume();
            r.on('end', () =>
              resolve({ status: r.statusCode, headers: r.headers }),
            );
          },
        )
        .on('error', reject);
    });
  }
  try {
    const a = await user('STUDENT', 'a'),
      b = await user('STUDENT', 'b'),
      parent = await user('PARENT', 'parent'),
      pending = await user('PARENT', 'pending'),
      teacher = await user('TEACHER', 'teacher'),
      random = await user('TEACHER_PLUS', 'random'),
      admin = await user('ADMIN', 'admin');
    const classroom = await db.classroom.create({
      data: { name: run, type: 'IN_PERSON', teacherId: teacher.id },
    });
    classId = classroom.id;
    await db.enrollment.create({
      data: {
        classroomId: classId,
        studentId: a.id,
        joinedAt: new Date('2025-01-01'),
        leftAt: new Date('2026-01-01'),
      },
    });
    await db.parentLink.createMany({
      data: [
        { parentId: parent.id, studentId: a.id, verifiedAt: new Date() },
        { parentId: pending.id, studentId: a.id },
      ],
    });
    const assignment = await db.assignment.create({
      data: {
        classroomId: classId,
        title: run,
        createdById: teacher.id,
        imageKeys: [],
        deletedAt: new Date(),
        createdAt: new Date('2025-06-01'),
      },
    });
    assignmentId = assignment.id;
    const draft = run + '-draft.png',
      privateKey = run + '-private.png',
      revisionKey = run + '-revision.png',
      unattached = run + '-legacy.png';
    keys.push(draft, privateKey, revisionKey, unattached);
    await db.storedFile.createMany({
      data: keys.map((key) => ({
        key,
        mime: 'image/png',
        size: 1,
        bytes: Buffer.from([1]),
        ownerId: key === draft ? a.id : null,
      })),
    });
    const submission = await db.submission.create({
      data: { assignmentId, studentId: a.id, imageKeys: [privateKey] },
    });
    await db.submissionRevision.create({
      data: {
        submissionId: submission.id,
        actorId: a.id,
        action: 'SUBMIT',
        state: 'DONE_ONLINE',
        imageKeys: [revisionKey],
      },
    });
    for (const key of [privateKey, revisionKey]) {
      for (const allowed of [a, parent, teacher, admin])
        assert.equal((await get(allowed, key)).status, 200);
      for (const denied of [b, pending, random])
        assert.equal((await get(denied, key)).status, 403);
    }
    assert.equal((await get(a, draft)).status, 200);
    assert.equal((await get(b, draft)).status, 403);
    assert.equal((await get(a, unattached)).status, 403);
    assert.equal((await get(a, privateKey, { exp: 1 })).status, 401);
    await db.user.update({
      where: { id: a.id },
      data: { archivedAt: new Date() },
    });
    assert.equal((await get(a, draft)).status, 401);
    await db.user.update({
      where: { id: a.id },
      data: { archivedAt: null, passwordChangedAt: new Date() },
    });
    assert.equal((await get(a, draft, { iat: 1 })).status, 401);
    const headers = (await get(parent, privateKey)).headers;
    assert.equal(headers['cache-control'], 'private, no-store');
    assert.equal(headers['referrer-policy'], 'no-referrer');
    console.log(
      'Local file HTTP lifecycle/ownership/historical revision/parent/teacher matrix passed.',
    );
  } finally {
    if (assignmentId) {
      await db.submissionRevision.deleteMany({
        where: { submission: { assignmentId } },
      });
      await db.submission.deleteMany({ where: { assignmentId } });
      await db.assignment.delete({ where: { id: assignmentId } });
    }
    if (classId) {
      await db.enrollment.deleteMany({ where: { classroomId: classId } });
      await db.classroom.delete({ where: { id: classId } });
    }
    await db.parentLink.deleteMany({ where: { parentId: { in: ids } } });
    await db.storedFile.deleteMany({ where: { key: { in: keys } } });
    await db.user.deleteMany({ where: { id: { in: ids } } });
    await app.close();
  }
})().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
