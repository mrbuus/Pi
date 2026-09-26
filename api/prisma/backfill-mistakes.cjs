/* Default is read-only. Run with --commit only against an explicitly selected database. */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient } = require('../dist/src/generated/prisma/client');
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required');
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });
const commit = process.argv.includes('--commit');

async function main() {
  const attempts = await prisma.attempt.findMany({
    where: { autoCorrect: false },
    orderBy: { createdAt: 'desc' },
    select: { id: true, studentId: true, problemId: true, source: true, testId: true, givenAnswer: true },
  });
  const latest = new Map();
  for (const row of attempts) {
    const key = `${row.studentId}:${row.problemId}`;
    if (!latest.has(key)) latest.set(key, row);
  }
  console.log(`${commit ? 'COMMIT' : 'DRY-RUN'}: ${latest.size} unique learner/problem entries from ${attempts.length} wrong attempts`);
  if (commit) {
    await prisma.$transaction(async (tx) => {
      for (const row of latest.values()) {
        await tx.mistakeEntry.upsert({
          where: { userId_problemId: { userId: row.studentId, problemId: row.problemId } },
          create: { userId: row.studentId, problemId: row.problemId, source: row.testId ? 'TEST' : 'PRACTICE', sourceRefId: row.testId ?? row.id, givenAnswer: row.givenAnswer ?? undefined },
          update: {},
        });
      }
    }, { timeout: 120_000, maxWait: 10_000 });
  }
}
main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
