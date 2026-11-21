/**
 * Opt-in: Нэгдсэн шалгалтын онлайн урсгалыг ЛОКАЛ бодит PostgreSQL дээр (port 5544) TestsService-ээр.
 * Энгийн jest-д ОРОХГҮЙ. Урьдчилан: `npm run build`, импорт `prisma/paper-exam-to-test.cjs --commit`.
 *
 *   node src/tests/paper-exam.local.integration.cjs
 *
 * Зохиомол анги + 4 сурагч үүсгэж (`itest-paper-<uuid>`), A/B-г ангид оноогоод: хувилбарын оноолт,
 * нөгөөгийн 403, нээх/хаах цаг, A–E (холихгүй), бүх зөв хариугаар 100, II хэсгийн хэсэгчилсэн оноо,
 * гаралтын хязгаар, cron ба submit-ийн уралдааныг шалгана. Төгсгөлд ЗӨВХӨН өөрийн үүсгэсэн мөрийг
 * буцааж арилгаж, тестийн тохиргоог анхны байдалд нь сэргээнэ.
 */
require('dotenv').config({ quiet: true });
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { PrismaService } = require('../../dist/src/prisma/prisma.service');
const { TestsService } = require('../../dist/src/tests/tests.service');
const { ExamResultsService } = require('../../dist/src/exams/exam-results.service');
const { fillSlotKeys } = require('../../dist/src/tests/grading');
const { pickAssignedVariant, orderVariants } = require('../../dist/src/tests/variant-assign');

const configured = new URL(process.env.DATABASE_URL ?? '');
assert(
  ['localhost', '127.0.0.1'].includes(configured.hostname) && configured.port === '5544',
  'Refusing a database outside approved local port 5544',
);

const GROUP = 'Нэгдсэн шалгалт 1';
const tag = `itest-paper-${randomUUID().slice(0, 8)}`;

async function main() {
  const prisma = new PrismaService();
  const tests = new TestsService(prisma, { collectAttemptsInBackground: () => undefined });
  const results = new ExamResultsService(prisma);
  const created = { users: [], classroom: null };
  const variants = await prisma.test.findMany({
    where: { groupKey: GROUP, deletedAt: null, paperMode: true },
    select: { id: true, title: true, groupKey: true, createdAt: true, variantLabel: true, isDraft: true, opensAt: true, closesAt: true, leaveLimit: true },
  });
  assert.equal(variants.length, 2, 'Импорт хийгдээгүй: A, B хоёр тест хэрэгтэй');
  const original = variants.map((v) => ({ id: v.id, isDraft: v.isDraft, opensAt: v.opensAt, closesAt: v.closesAt, leaveLimit: v.leaveLimit }));
  const byLabel = Object.fromEntries(variants.map((v) => [v.variantLabel, v]));
  const checks = [];
  const ok = (name) => {
    checks.push(name);
    console.log('  ok ' + name);
  };
  try {
    const classroom = await prisma.classroom.create({ data: { name: tag, type: 'IN_PERSON' } });
    created.classroom = classroom.id;
    for (let i = 0; i < 4; i++) {
      const u = await prisma.user.create({
        data: { firstName: `${tag}-${i}`, lastName: 'Туршилт', passwordHash: 'x', role: 'STUDENT', username: `${tag}-${i}` },
      });
      created.users.push(u.id);
      await prisma.enrollment.create({ data: { studentId: u.id, classroomId: classroom.id } });
    }
    const now = Date.now();
    for (const v of variants) {
      await prisma.testAccess.create({ data: { testId: v.id, classroomId: classroom.id, assignedAt: new Date(now - 3600_000) } });
      await prisma.test.update({ where: { id: v.id }, data: { isDraft: false, opensAt: new Date(now - 60_000), closesAt: new Date(now + 50 * 60_000) } });
    }
    const assigned = (sid) =>
      pickAssignedVariant(orderVariants(variants.map((v) => ({ ...v, hasResult: false, sessionStatus: null }))), sid);

    // 1) Жагсаалтад зөвхөн өөрийн хувилбар, нөгөө нь 403
    const [s0, s1, s2, s3] = created.users;
    console.log('  хувилбар: ' + created.users.map((u, i) => `сурагч ${i} -> ${byLabel.A.id === assigned(u).id ? 'A' : 'B'}`).join(', '));
    const list = await tests.list(s0, 'STUDENT', undefined, true);
    const mine = list.filter((t) => t.groupKey === GROUP);
    assert.equal(mine.length, 1);
    assert.equal(mine[0].id, assigned(s0).id);
    const my = (await results.myExams(s0, 'STUDENT')).exams.filter((t) => t.groupKey === GROUP);
    assert.deepEqual(my.map((t) => t.id), [assigned(s0).id]);
    ok('жагсаалт (/tests, /exam-results/my) зөвхөн оноогдсон хувилбар');
    const other = variants.find((v) => v.id !== assigned(s0).id);
    await assert.rejects(tests.start(other.id, s0), /өөр хувилбар оноогдсон/);
    await assert.rejects(tests.getOne(other.id, s0, 'STUDENT'), /өөр хувилбар оноогдсон/);
    ok('нөгөө хувилбарыг шууд ID-аар эхлүүлэх/үзэх 403');

    // 2) Эхлүүлэх: A–E, холихгүй, deadline = хаах цаг (50 мин < 100 мин)
    const testId = assigned(s0).id;
    const started = await tests.start(testId, s0);
    assert.equal(started.problems.length, 40);
    const choice = started.problems.find((p) => p.format === 'CHOICE');
    assert.deepEqual(choice.choiceLabels, ['A', 'B', 'C', 'D', 'E']);
    assert.ok(choice.choices.every((c) => c.startsWith('$')));
    assert.ok(!JSON.stringify(started).match(/isCorrect|mistakeNote|correctAnswer/));
    assert.ok(started.session.remainingSec <= 50 * 60 && started.session.remainingSec > 49 * 60);
    const sess = await prisma.testAttemptSession.findUnique({ where: { testId_studentId: { testId, studentId: s0 } } });
    assert.deepEqual(sess.choiceOrder, {});
    ok('start: A–E шошго, холихгүй, хариу задрахгүй, deadlineAt = хаах цаг');

    // 3) Бүх зөв хариу → хадгалах → илгээх → 100
    const key = await prisma.testProblem.findMany({
      where: { testId },
      orderBy: { order: 'asc' },
      select: { problemId: true, problem: { select: { format: true, statementText: true, correctAnswer: true, choiceOptions: { select: { order: true, isCorrect: true } } } } },
    });
    const correctOf = (row) =>
      row.problem.format === 'CHOICE'
        ? row.problem.choiceOptions.find((c) => c.isCorrect).order
        : fillSlotKeys(row.problem.statementText).map((k) => row.problem.correctAnswer[k]).join('');
    const perfect = Object.fromEntries(key.map((r) => [r.problemId, correctOf(r)]));
    const saved = await tests.saveSession(testId, s0, { answers: perfect });
    assert.equal(saved.status, 'IN_PROGRESS');
    const sub = await tests.submit(testId, {}, s0);
    assert.deepEqual([sub.result.totalScore, sub.result.maxScore], [100, 100]);
    const marks = await prisma.testItemMark.count({ where: { testId, studentId: s0, status: 'CORRECT' } });
    assert.equal(marks, 36 + 12);
    ok('A/B хувилбарын бүх зөв хариу: 100/100, 48 зүйл CORRECT');
    // Илгээсний дараа хоцорсон autosave хариуг дарж бичихгүй
    const late = await tests.saveSession(testId, s0, { answers: { [key[0].problemId]: 0 } });
    assert.equal(late.status, 'SUBMITTED');
    const after = await prisma.testAttemptSession.findUnique({ where: { id: sess.id } });
    assert.equal(after.draftAnswers[key[0].problemId], perfect[key[0].problemId]);
    ok('илгээсний дараах autosave хариуг өөрчлөхгүй');

    // 4) II хэсгийн хэсэгчилсэн оноо: сурагч 1 — II.1-ийн a буруу, II.4 бүхэлдээ хоосон
    const t1 = assigned(s1).id;
    await tests.start(t1, s1);
    const key1 = await prisma.testProblem.findMany({
      where: { testId: t1 },
      orderBy: { order: 'asc' },
      select: { problemId: true, problem: { select: { format: true, statementText: true, correctAnswer: true, choiceOptions: { select: { order: true, isCorrect: true } } } } },
    });
    const partial = Object.fromEntries(key1.map((r) => [r.problemId, correctOf(r)]));
    const fills = key1.filter((r) => r.problem.format === 'FILL_NUMBER');
    partial[fills[0].problemId] = '9' + partial[fills[0].problemId].slice(1); // II.1 I хэсэг (3 оноо)
    delete partial[fills[3].problemId]; // II.4 (7 оноо)
    await tests.saveSession(t1, s1, { answers: partial });
    const sub1 = await tests.submit(t1, {}, s1);
    assert.deepEqual([sub1.result.totalScore, sub1.result.maxScore], [90, 100]);
    ok('II хэсэг хэсэгчилсэн: 100 - 3 - 7 = 90');

    // 5) Хатуу дүрэм: 2 дахь гаралт autosave-ээр ирвэл сервер өөрөө дүгнэнэ
    const t2 = assigned(s2).id;
    await prisma.test.update({ where: { id: t2 }, data: { leaveLimit: 2 } });
    await tests.start(t2, s2);
    await tests.saveSession(t2, s2, { event: 'LEAVE' });
    const left = await tests.saveSession(t2, s2, { event: 'LEAVE' });
    assert.equal(left.status, 'SUBMITTED');
    assert.equal(left.leftByLeaves, true);
    assert.equal(await prisma.testResult.count({ where: { testId: t2, studentId: s2 } }), 1);
    await prisma.test.update({ where: { id: t2 }, data: { leaveLimit: original.find((o) => o.id === t2).leaveLimit } });
    ok('серверийн гаралтын хязгаар: 2 дахь гаралтад дүгнэв, нэг дүн');

    // 6) Хугацаа дууссан сесс: cron ба submit зэрэг — нэг л дүн
    const t3 = assigned(s3).id;
    await tests.start(t3, s3);
    const s3sess = await prisma.testAttemptSession.findUnique({ where: { testId_studentId: { testId: t3, studentId: s3 } } });
    const k3 = await prisma.testProblem.findMany({ where: { testId: t3 }, orderBy: { order: 'asc' }, take: 1, select: { problemId: true, problem: { select: { choiceOptions: { select: { order: true, isCorrect: true } } } } } });
    await tests.saveSession(t3, s3, { answers: { [k3[0].problemId]: k3[0].problem.choiceOptions.find((c) => c.isCorrect).order } });
    // Хугацааг 10 минутын өмнө дууссан болгоно (зөвхөн энэ зохиомол сесс)
    await prisma.testAttemptSession.update({ where: { id: s3sess.id }, data: { deadlineAt: new Date(Date.now() - 10 * 60_000) } });
    const [sweep, raced] = await Promise.allSettled([tests.sweepExpiredSessions(), tests.submit(t3, {}, s3)]);
    assert.equal(sweep.status, 'fulfilled');
    const resultRows = await prisma.testResult.findMany({ where: { testId: t3, studentId: s3 } });
    assert.equal(resultRows.length, 1);
    const attemptRows = await prisma.attempt.count({ where: { testId: t3, studentId: s3 } });
    assert.equal(attemptRows, 1, 'Attempt давхардсан');
    assert.ok(resultRows[0].totalScore >= 1, 'хадгалсан хариу тооцогдсон');
    console.log(`     (уралдаан: cron ${JSON.stringify(sweep.value)}, submit ${raced.status === 'fulfilled' ? 'түрүүлэв' : 'хоцров: ' + raced.reason.message})`);
    ok('cron ба submit уралдаан: нэг дүн, нэг Attempt, хадгалсан хариу тооцогдсон');

    // 7) Нээгдэхээс өмнө / хаагдсаны дараа шинээр эхлүүлэхгүй
    await prisma.test.update({ where: { id: testId }, data: { opensAt: new Date(Date.now() + 3600_000) } });
    const extra = await prisma.user.create({ data: { firstName: `${tag}-x`, lastName: 'Туршилт', passwordHash: 'x', role: 'STUDENT', username: `${tag}-x` } });
    created.users.push(extra.id);
    await prisma.enrollment.create({ data: { studentId: extra.id, classroomId: classroom.id } });
    const extraVariant = assigned(extra.id).id;
    await prisma.test.updateMany({ where: { id: { in: variants.map((v) => v.id) } }, data: { opensAt: new Date(Date.now() + 3600_000) } });
    await assert.rejects(tests.start(extraVariant, extra.id), /цагт нээгдэнэ/);
    await prisma.test.updateMany({ where: { id: { in: variants.map((v) => v.id) } }, data: { opensAt: null, closesAt: new Date(Date.now() - 1000) } });
    await assert.rejects(tests.start(extraVariant, extra.id), /хаагдсан/);
    ok('нээгдэхээс өмнө, хаагдсаны дараа эхлүүлэхгүй');
    console.log(`\n${checks.length} шалгалт амжилттай`);
  } finally {
    // Зөвхөн энэ скриптийн үүсгэсэн мөрүүд (локал) — бусдад хүрэхгүй
    const ids = created.users;
    if (ids.length) {
      await prisma.attempt.deleteMany({ where: { studentId: { in: ids } } });
      await prisma.mistakeEntry?.deleteMany?.({ where: { studentId: { in: ids } } }).catch(() => undefined);
      await prisma.testItemMark.deleteMany({ where: { studentId: { in: ids } } });
      await prisma.testResult.deleteMany({ where: { studentId: { in: ids } } });
      await prisma.testAttemptSession.deleteMany({ where: { studentId: { in: ids } } });
      await prisma.enrollment.deleteMany({ where: { studentId: { in: ids } } });
    }
    if (created.classroom) await prisma.testAccess.deleteMany({ where: { classroomId: created.classroom } });
    if (created.classroom) await prisma.classroom.delete({ where: { id: created.classroom } }).catch((e) => console.error('classroom', e.message));
    if (ids.length) await prisma.user.deleteMany({ where: { id: { in: ids } } }).catch((e) => console.error('users', e.message));
    for (const o of original) {
      await prisma.test.update({ where: { id: o.id }, data: { isDraft: o.isDraft, opensAt: o.opensAt, closesAt: o.closesAt, leaveLimit: o.leaveLimit } });
    }
    // Бодлогын статистикийг (attemptCount, correctRate) ч буцаана — импортын анхны төлөв 0
    await prisma.problem.updateMany({ where: { token: { startsWith: 'нэгдсэн-шалгалт-1:' } }, data: { attemptCount: 0, correctRate: null } });
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
