/* After build + migrate deploy, run only with an explicit synthetic local DB. */
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const database = new URL(process.env.DATABASE_URL || 'invalid:');
if (
  !['127.0.0.1', 'localhost', '[::1]'].includes(database.hostname) ||
  !database.pathname.startsWith('/pi_s2_t10')
)
  throw new Error('Synthetic localhost pi_s2_t10 database required');
if (
  process.env.DOTENV_CONFIG_PATH !== '/dev/null' ||
  !process.env.JWT_SECRET?.startsWith('synthetic-')
)
  throw new Error('Synthetic JWT secret and disabled dotenv required');
const { NestFactory } = require('@nestjs/core');
const { ValidationPipe } = require('@nestjs/common');
const { JwtService } = require('@nestjs/jwt');
const request = require('supertest');
const { AppModule } = require('../../dist/src/app.module.js');
const { PrismaService } = require('../../dist/src/prisma/prisma.service.js');
const {
  FormulaReviewService,
} = require('../../dist/src/formulas/formula-review.service.js');
const runId = `t10-${randomUUID()}`;
async function main() {
  const app = await NestFactory.create(AppModule, { logger: false });
  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
  await app.init();
  const db = app.get(PrismaService),
    service = app.get(FormulaReviewService);
  const roles = [
    'ADMIN',
    'TEACHER_PLUS',
    'TEACHER',
    'STUDENT',
    'PARENT',
    'BUYER',
  ];
  const users = roles.map((role) => ({ id: `${runId}-${role}`, role }));
  const section = `${runId}-section`;
  try {
    await db.user.createMany({
      data: users.map((user) => ({
        ...user,
        firstName: 'Туршилт',
        lastName: 'Зохиомол',
        passwordHash: 'synthetic-unusable-password',
      })),
    });
    await db.formulaSection.create({
      data: { slug: section, title: 'Зохиомол бүлэг', order: 999 },
    });
    await db.formula.createMany({
      data: Array.from({ length: 10 }, (_, i) => ({
        id: `${runId}-f${i}`,
        slug: `${runId}-f${i}`,
        name: `Зохиомол томьёо ${runId} ${i}`,
        sectionSlug: section,
        order: i,
        latex: `${i}+1=${i + 1}`,
        general: `${i}+1=${i + 1}`,
        quiz: [
          {
            type: 'blank',
            prompt: `${i}+1=\\square`,
            answer: `$${i + 1}$`,
            distractors: [`$${i + 2}$`, `$${i + 3}$`, `$${i + 4}$`],
          },
          {
            type: 'truefalse',
            prompt: `${i}+1=${i + 2}`,
            answer: 'false',
            why: `$${i}+1=${i + 1}$`,
          },
        ],
      })),
    });
    const userId = users[3].id;
    const due = await service.due(userId, 10);
    assert.equal(due.cards.length, 10);
    const card = due.cards.find((card) => card.exercise.mode === 'blank');
    const body = {
      exerciseToken: card.exercise.token,
      answer: card.exercise.options[0].id,
    };
    const responses = await Promise.all([
      service.submit(userId, card.slug, body),
      service.submit(userId, card.slug, body),
    ]);
    assert.deepEqual(responses[0], responses[1]);
    assert.equal(
      (
        await db.formulaReview.findUnique({
          where: { userId_formulaId: { userId, formulaId: card.slug } },
        })
      ).reviewCount,
      1,
    );
    assert.equal((await service.stats(userId)).reviewedToday, 1);
    await assert.rejects(
      service.submit(userId, card.slug, {
        ...body,
        answer: card.exercise.options[1].id,
      }),
      (error) => error.getStatus?.() === 409,
    );
    assert.equal((await service.stats(users[0].id)).reviewedToday, 0);
    assert.equal((await service.due(userId, 10)).newCount, 9);
    const jwt = new JwtService({ secret: process.env.JWT_SECRET });
    let httpChecks = 0;
    for (const user of users) {
      const headers = {
        Authorization: `Bearer ${jwt.sign({ sub: user.id, role: user.role }, { expiresIn: '5m' })}`,
      };
      const dueRes = await request(app.getHttpServer())
        .get('/api/formulas/review/due?limit=10&studentId=someone-else')
        .set(headers)
        .expect(200);
      httpChecks++;
      assert.ok(dueRes.body.cards.length);
      await request(app.getHttpServer())
        .get('/api/formulas/review/stats')
        .set(headers)
        .expect(200);
      httpChecks++;
      const flash = dueRes.body.cards.find(
        (card) => card.exercise.mode === 'flashcard',
      );
      const result = await request(app.getHttpServer())
        .post(`/api/formulas/review/${flash.slug}`)
        .set(headers)
        .send({
          exerciseToken: flash.exercise.token,
          result: 'GOOD',
          userId: 'someone-else',
        })
        .expect(201);
      httpChecks++;
      assert.equal(result.body.source, 'SELF_ASSESSMENT');
      await request(app.getHttpServer())
        .get('/api/formulas/review/due?limit=0')
        .set(headers)
        .expect(400);
      httpChecks++;
    }
    await request(app.getHttpServer())
      .get('/api/formulas/review/due')
      .expect(401);
    httpChecks++;
    await request(app.getHttpServer())
      .post(`/api/formulas/review/${card.slug}`)
      .send({ result: 'GOOD' })
      .expect(401);
    httpChecks++;
    console.log(
      JSON.stringify({
        synthetic: true,
        concurrentRetryCountedOnce: true,
        ownStatsIsolated: true,
        fullAppHttpChecks: httpChecks,
        roles: roles.length,
      }),
    );
  } finally {
    await db.user.deleteMany({
      where: { id: { in: users.map((user) => user.id) } },
    });
    await db.formula.deleteMany({ where: { sectionSlug: section } });
    await db.formulaSection.deleteMany({ where: { slug: section } });
    await app.close();
  }
}
main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
