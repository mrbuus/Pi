/** Local synthetic DB fixtures; real JWT/controller/capability checks, no provider calls. */
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
const {
    ScheduleController,
  } = require('../../dist/src/schedule/schedule.controller'),
  { ScheduleService } = require('../../dist/src/schedule/schedule.service'),
  {
    ScheduleAccessService,
  } = require('../../dist/src/schedule/schedule-access.service');
const {
    TeacherHoursController,
  } = require('../../dist/src/schedule/teacher-hours.controller'),
  {
    TeacherHoursService,
  } = require('../../dist/src/schedule/teacher-hours.service');
const {
  StaffCapabilityService,
} = require('../../dist/src/staff-capabilities/staff-capability.service');
const {
  NotificationCenterService,
} = require('../../dist/src/notification-center/notification-center.service');
const url = new URL(process.env.DATABASE_URL || '');
assert(
  ['localhost', '127.0.0.1'].includes(url.hostname) && url.port === '5544',
  'Local 5544 DB required',
);
const jwt = new JwtService({ secret: process.env.JWT_SECRET });
class TestModule {}
Module({
  imports: [PrismaModule],
  controllers: [ScheduleController, TeacherHoursController],
  providers: [
    ScheduleService,
    ScheduleAccessService,
    TeacherHoursService,
    StaffCapabilityService,
    JwtStrategy,
    JwtAuthGuard,
    RolesGuard,
    { provide: JwtService, useValue: jwt },
    {
      provide: NotificationCenterService,
      useValue: {
        notify: async () => {},
        publish: async () => {},
        createMany: async () => {},
        sendToUsers: async () => {},
      },
    },
  ],
})(TestModule);
(async () => {
  const app = await NestFactory.create(TestModule, { logger: false });
  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
  await app.listen(0, '127.0.0.1');
  const db = app.get(PrismaService),
    port = app.getHttpServer().address().port,
    run = 'schedule-fixture-' + randomUUID(),
    users = [],
    classes = [];
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
  async function expectStatus(method, path, u, body, status = 200) {
    const result = await request(method, path, u, body);
    assert.equal(result.status, status, JSON.stringify(result.body));
    return result.body;
  }
  try {
    const admin = await user('ADMIN', 'admin'),
      owner = await user('TEACHER', 'owner'),
      plus = await user('TEACHER_PLUS', 'plus'),
      pupil = await user('STUDENT', 'pupil'),
      parent = await user('PARENT', 'parent'),
      pending = await user('PARENT', 'pending'),
      buyer = await user('BUYER', 'buyer');
    for (const suffix of ['own', 'other']) {
      const c = await db.classroom.create({
        data: {
          name: run + suffix,
          type: 'IN_PERSON',
          teacherId: suffix === 'own' ? owner.id : plus.id,
        },
      });
      classes.push(c.id);
    }
    await db.enrollment.create({
      data: {
        studentId: pupil.id,
        classroomId: classes[0],
        joinedAt: new Date('2026-09-01'),
      },
    });
    await db.parentLink.createMany({
      data: [
        { parentId: parent.id, studentId: pupil.id, verifiedAt: new Date() },
        { parentId: pending.id, studentId: pupil.id },
      ],
    });
    const schedule = await db.classSchedule.create({
      data: {
        classroomId: classes[0],
        weekday: 1,
        startMinute: 540,
        endMinute: 600,
        effectiveFrom: new Date('2026-09-01'),
        teacherId: owner.id,
      },
    });
    const other = await db.classSchedule.create({
      data: {
        classroomId: classes[1],
        weekday: 1,
        startMinute: 610,
        endMinute: 670,
        effectiveFrom: new Date('2026-09-01'),
        teacherId: plus.id,
      },
    });
    const body = {
      classroomId: classes[0],
      weekday: 2,
      startMinute: 540,
      endMinute: 600,
      effectiveFrom: '2026-10-06',
    };
    await expectStatus('POST', '/schedule', plus, body, 403);
    await expectStatus(
      'PATCH',
      '/schedule/' + schedule.id,
      plus,
      { room: 'denied' },
      403,
    );
    await expectStatus(
      'DELETE',
      '/schedule/' + schedule.id,
      plus,
      undefined,
      403,
    );
    await expectStatus(
      'POST',
      '/schedule/' + schedule.id + '/split',
      plus,
      { from: '2026-10-12' },
      403,
    );
    await expectStatus(
      'POST',
      '/schedule/bulk',
      plus,
      { ...body, weekdays: [2] },
      403,
    );
    await expectStatus(
      'POST',
      '/schedule/' + schedule.id + '/exceptions',
      plus,
      { date: '2026-10-05', kind: 'CANCELLED' },
      403,
    );
    await expectStatus(
      'PUT',
      '/schedule/teacher-workdays',
      plus,
      { teacherId: plus.id, weekdays: [1] },
      403,
    );
    await expectStatus(
      'GET',
      '/teacher-hours?month=2026-10',
      plus,
      undefined,
      403,
    );
    await expectStatus('GET', '/teacher-hours/me?month=2026-10', plus);
    await expectStatus('PATCH', '/schedule/' + schedule.id + '/topic', owner, {
      date: '2026-10-05',
      title: 'Synthetic own lesson',
    });
    await expectStatus(
      'PATCH',
      '/schedule/' + schedule.id + '/topic',
      plus,
      { date: '2026-10-05', title: 'Denied random lesson' },
      403,
    );
    for (const u of [pupil, parent]) {
      const rows = await expectStatus('GET', '/schedule', u);
      assert(rows.some((x) => x.id === schedule.id));
      assert(!rows.some((x) => x.id === other.id));
      const week = await expectStatus(
        'GET',
        '/schedule/week?start=2026-10-05',
        u,
      );
      assert(week.teacherRoster.every((d) => d.teachers.length === 0));
      await expectStatus(
        'GET',
        '/schedule/classroom/' + classes[1],
        u,
        undefined,
        403,
      );
      await expectStatus('GET', '/schedule/' + other.id, u, undefined, 403);
      await expectStatus(
        'GET',
        '/schedule/days?from=2026-10-05&to=2026-10-11&classroomId=' +
          classes[1],
        u,
        undefined,
        403,
      );
      await expectStatus(
        'GET',
        '/schedule/teacher-workdays',
        u,
        undefined,
        403,
      );
    }
    for (const u of [buyer, pending])
      assert.deepEqual(await expectStatus('GET', '/schedule', u), []);
    await expectStatus('GET', '/schedule/teachers', plus, undefined, 403);
    await expectStatus('GET', '/schedule/teachers', admin);
    await expectStatus('POST', '/schedule', admin, body, 201);
    const grant = await db.staffCapabilityGrant.create({
      data: {
        userId: plus.id,
        capability: 'schedule.manage',
        scopeKey: classes[0],
        grantedById: admin.id,
        reason: 'Synthetic test only',
      },
    });
    await expectStatus('PATCH', '/schedule/' + schedule.id, plus, {
      room: 'allowed scoped',
    });
    await expectStatus(
      'PATCH',
      '/schedule/' + schedule.id,
      plus,
      { classroomId: classes[1] },
      403,
    );
    await expectStatus(
      'PUT',
      '/schedule/teacher-workdays',
      plus,
      { teacherId: plus.id, weekdays: [1] },
      403,
    );
    await db.staffCapabilityGrant.update({
      where: { id: grant.id },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    await expectStatus(
      'PATCH',
      '/schedule/' + schedule.id,
      plus,
      { room: 'expired' },
      403,
    );
    await db.staffCapabilityGrant.update({
      where: { id: grant.id },
      data: { expiresAt: null, revokedAt: new Date() },
    });
    await expectStatus(
      'PATCH',
      '/schedule/' + schedule.id,
      plus,
      { room: 'revoked' },
      403,
    );
    await db.staffCapabilityGrant.create({
      data: {
        userId: plus.id,
        capability: 'time.review',
        grantedById: admin.id,
        reason: 'Synthetic review',
      },
    });
    await expectStatus('GET', '/teacher-hours?month=2026-10', plus);
    await expectStatus(
      'PATCH',
      '/schedule/' + schedule.id,
      plus,
      { room: 'time grant not schedule' },
      403,
    );
    await db.staffCapabilityGrant.create({
      data: {
        userId: plus.id,
        capability: 'schedule.manage',
        grantedById: admin.id,
        reason: 'Synthetic global schedule',
      },
    });
    await expectStatus('PUT', '/schedule/teacher-workdays', plus, {
      teacherId: plus.id,
      weekdays: [1],
    });
    await db.user.update({ where: { id: plus.id }, data: { role: 'BUYER' } });
    await expectStatus(
      'PATCH',
      '/schedule/' + schedule.id,
      plus,
      { room: 'changed role' },
      403,
    );
    await db.user.update({
      where: { id: plus.id },
      data: { role: 'TEACHER_PLUS', archivedAt: new Date() },
    });
    await expectStatus(
      'GET',
      '/teacher-hours?month=2026-10',
      plus,
      undefined,
      401,
    );
    console.log(
      'PASS: actual local HTTP schedule mutation capability denials, current-role JWT, scoped pupil/verified parent reads, BUYER/pending-parent no roster, own teacher topic and hours.',
    );
  } finally {
    await db.staffCapabilityGrant.deleteMany({
      where: { userId: { in: users } },
    });
    await db.teacherWorkDay.deleteMany({ where: { teacherId: { in: users } } });
    await db.auditLog
      .deleteMany({ where: { actorId: { in: users } } })
      .catch(() => {});
    await db.classSchedule.deleteMany({
      where: { classroomId: { in: classes } },
    });
    await db.classroom.deleteMany({ where: { id: { in: classes } } });
    await db.user.deleteMany({ where: { id: { in: users } } });
    await app.close();
  }
})().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
