/* Default is read-only; --commit is required before any MistakeEntry is written. */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { Prisma, PrismaClient } = require('../dist/src/generated/prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});
const commit = process.argv.includes('--commit');
const PAGE_SIZE = 100;
const MAX_PAGES = 100_000;

async function applyEvent(tx, attempt) {
  const source = attempt.testId ? 'TEST' : 'PRACTICE';
  const testTitle = attempt.testId
    ? (await tx.test.findUnique({ where: { id: attempt.testId }, select: { title: true } }))?.title ?? null
    : null;
  const unique = { userId_problemId: { userId: attempt.studentId, problemId: attempt.problemId } };
  const inserted = await tx.mistakeEntry.upsert({
    where: unique,
    create: {
      userId: attempt.studentId,
      problemId: attempt.problemId,
      source,
      sourceRefId: attempt.id,
      sourceOccurredAt: attempt.createdAt,
      testTitle,
      givenAnswer: attempt.givenAnswer ?? undefined,
    },
    update: {},
    select: { id: true },
  });
  await tx.$queryRaw(Prisma.sql`
    SELECT "id" FROM "MistakeEntry" WHERE "id" = ${inserted.id} FOR UPDATE
  `);
  const current = await tx.mistakeEntry.findUniqueOrThrow({
    where: { id: inserted.id },
    select: { sourceRefId: true, sourceOccurredAt: true, lastRetryAt: true },
  });
  if (current.sourceRefId === attempt.id) return;
  const incomingAt = attempt.createdAt.getTime();
  const sourceAt = current.sourceOccurredAt?.getTime() ?? -Infinity;
  const retryAt = current.lastRetryAt?.getTime() ?? -Infinity;
  const newerThanSource = incomingAt > sourceAt || (
    incomingAt === sourceAt && attempt.id > (current.sourceRefId ?? '')
  );
  const incomingIsNewer = incomingAt >= Math.max(sourceAt, retryAt)
    && newerThanSource && incomingAt > retryAt;
  if (!incomingIsNewer) return;

  await tx.mistakeEntry.update({
    where: { id: inserted.id },
    data: {
      source,
      sourceRefId: attempt.id,
      sourceOccurredAt: attempt.createdAt,
      testTitle,
      givenAnswer: attempt.givenAnswer ?? undefined,
      status: 'RETRYING',
      retryCount: 0,
      consecutiveCorrect: 0,
      lastCorrectAt: null,
      nextRetryAt: null,
    },
  });
}

async function main() {
  let cursor;
  let scanned = 0;
  let pages = 0;
  console.log(`${commit ? 'COMMIT' : 'DRY-RUN'}: querying wrong-attempt history in batches of ${PAGE_SIZE}`);

  while (pages < MAX_PAGES) {
    const attempts = await prisma.attempt.findMany({
      where: { autoCorrect: false },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      take: PAGE_SIZE,
      select: {
        id: true,
        studentId: true,
        problemId: true,
        testId: true,
        createdAt: true,
        givenAnswer: true,
      },
    });
    if (attempts.length === 0) break;
    scanned += attempts.length;
    if (commit) {
      await prisma.$transaction(async (tx) => {
        for (const attempt of attempts) await applyEvent(tx, attempt);
      }, { timeout: 30_000, maxWait: 5_000 });
    }
    cursor = attempts[attempts.length - 1].id;
    pages += 1;
    if (attempts.length < PAGE_SIZE) break;
  }
  if (pages === MAX_PAGES) throw new Error(`Stopped at safety cap (${MAX_PAGES} pages)`);
  console.log(`${commit ? 'COMMIT' : 'DRY-RUN'} complete: scanned ${scanned} wrong attempts in ${pages} bounded pages`);
}

main()
  .catch((error) => { console.error(error); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
