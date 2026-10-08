/** Synthetic local Postgres proof; no external requests or production data. */
require('reflect-metadata');
require('dotenv').config({ quiet: true });
const assert = require('node:assert/strict'),
  path = require('node:path'),
  { randomUUID } = require('node:crypto'),
  { Module } = require('@nestjs/common'),
  { NestFactory } = require('@nestjs/core');
const build =
  process.env.STUDY_REVIEW_TEST_BUILD_DIR ||
  path.resolve(__dirname, '../../dist');
const load = (f) => require(path.join(build, 'src', f));
const { PrismaModule } = load('prisma/prisma.module'),
  { PrismaService } = load('prisma/prisma.service'),
  { LessonsService } = load('lessons/lessons.service');
const url = new URL(process.env.DATABASE_URL);
assert(
  ['localhost', '127.0.0.1'].includes(url.hostname) && url.port === '5544',
);
class Fixture {}
Module({ imports: [PrismaModule] })(Fixture);
(async () => {
  const app = await NestFactory.createApplicationContext(Fixture, {
      logger: false,
    }),
    db = app.get(PrismaService),
    service = new LessonsService(db),
    prefix = 'theory-retention-' + randomUUID();
  let actor, chapter, theory, packet;
  try {
    actor = await db.user.create({
      data: {
        firstName: 'Synthetic',
        lastName: 'Retention',
        passwordHash: 'disabled',
        role: 'ADMIN',
      },
    });
    chapter = await db.chapter.create({
      data: { title: prefix, order: 0, freePreview: true },
    });
    theory = await db.theoryBlock.create({
      data: {
        chapterId: chapter.id,
        createdById: actor.id,
        clientRequestId: randomUUID(),
        title: prefix,
        content: 'unchanged',
        imageKeys: [prefix + '.png'],
        order: 0,
      },
    });
    assert.equal(
      (await service.getLesson(chapter.id, actor.id, 'ADMIN')).theories.length,
      1,
    );
    await service.removeTheory(theory.id, actor.id);
    await service.removeTheory(theory.id, actor.id);
    const archived = await db.theoryBlock.findUnique({
      where: { id: theory.id },
    });
    assert(archived.archivedAt);
    assert.equal(archived.content, theory.content);
    assert.deepEqual(archived.imageKeys, theory.imageKeys);
    assert.equal(
      (await service.getLesson(chapter.id, actor.id, 'ADMIN')).theories.length,
      0,
    );
    assert(
      !(await service.listChaptersWithLessons(actor.id, 'ADMIN')).some(
        (c) => c.id === chapter.id,
      ),
    );
    await assert.rejects(
      () => service.updateTheory(theory.id, { content: 'changed' }, actor.id),
      (e) => e.getStatus() === 404,
    );
    await assert.rejects(
      () =>
        service.createTheory(
          chapter.id,
          {
            title: theory.title,
            content: theory.content,
            imageKeys: theory.imageKeys,
            clientRequestId: theory.clientRequestId,
          },
          actor.id,
        ),
      (e) => e.getStatus() === 409,
    );
    assert.equal(
      await db.auditLog.count({
        where: {
          entity: 'TheoryBlock',
          entityId: theory.id,
          action: 'ARCHIVE',
        },
      }),
      1,
    );
    await service.restoreTheory(theory.id, actor.id);
    await service.restoreTheory(theory.id, actor.id);
    const restored = await db.theoryBlock.findUnique({
      where: { id: theory.id },
    });
    assert.equal(restored.id, theory.id);
    assert.equal(restored.archivedAt, null);
    assert.deepEqual(restored.imageKeys, theory.imageKeys);
    assert.equal(
      (await service.getLesson(chapter.id, actor.id, 'ADMIN')).theories.length,
      1,
    );
    assert.equal(
      await db.auditLog.count({
        where: { entityId: theory.id, action: 'RESTORE' },
      }),
      1,
    );
    console.log(
      'PASS local DB: archive/restore idempotent, row/content/image history retained, active lesson/list excludes archived, archived update404/replay409, audit atomic.',
    );
  } finally {
    if (theory) {
      await db.auditLog.deleteMany({ where: { entityId: theory.id } });
      await db.theoryBlock.delete({ where: { id: theory.id } });
    }
    if (chapter) await db.chapter.delete({ where: { id: chapter.id } });
    if (actor) await db.user.delete({ where: { id: actor.id } });
    await app.close();
  }
})().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
