#!/usr/bin/env node
'use strict';
const { randomInt } = require('node:crypto');

function parseArgs(args) {
  const options = { commit: false, onlyBook: undefined };
  for (const arg of args) {
    if (arg === '--commit') options.commit = true;
    else if (arg === '--help') options.help = true;
    else if (arg.startsWith('--only-book=')) {
      const code = arg.slice('--only-book='.length);
      if (!/^[A-Za-z0-9_-]{1,64}$/.test(code))
        throw new Error('Invalid book code');
      options.onlyBook = code;
    } else throw new Error('Unknown argument; see --help');
  }
  return options;
}
const eligibleWhere = (options) => ({
  deletedAt: null,
  chapter: {
    deletedAt: null,
    ...(options.onlyBook
      ? { book: { deletedAt: null, code: options.onlyBook } }
      : { OR: [{ bookId: null }, { book: { deletedAt: null } }] }),
  },
  // Do not fetch the private C variant or unidentified source content at all.
  analysis: { is: { sourceVariant: { in: ['A', 'B'] } } },
});
const contentSelect = {
  id: true,
  token: true,
  statementText: true,
  choices: true,
  chapter: { select: { title: true } },
  analysis: { select: { topic: true, methods: true, formulas: true } },
  formulas: { select: { formulaId: true } },
};
function planLinks(row, catalog, tagProblem) {
  const current = new Set(row.formulas.map((link) => link.formulaId));
  const suggestions = tagProblem(
    { ...row, chapterTitle: row.chapter.title },
    catalog,
  );
  const ids = new Map(catalog.map((formula) => [formula.slug, formula.id]));
  // All existing/manual associations survive; do not fill past four total.
  const additions = suggestions
    .filter((s) => ids.has(s.slug) && !current.has(ids.get(s.slug)))
    .slice(0, Math.max(0, 4 - current.size));
  return {
    suggestions,
    additions: additions.map((s) => ({ ...s, formulaId: ids.get(s.slug) })),
  };
}
function sampleInto(sample, value, seen, random = randomInt) {
  if (sample.length < 30) sample.push(value);
  else {
    const index = random(seen);
    if (index < 30) sample[index] = value;
  }
}
async function runTagging(prisma, options, tagProblem, random = randomInt) {
  const where = eligibleWhere(options);
  const catalog = await prisma.formula.findMany({
    where: { slug: { not: null } },
    select: {
      id: true,
      slug: true,
      name: true,
      latex: true,
      topicSlugs: true,
      keywords: true,
      level: true,
    },
    orderBy: { slug: 'asc' },
  });
  if (!catalog.length)
    throw new Error('No formula catalog; seed reviewed formulas first');
  const base = { deletedAt: null, chapter: where.chapter };
  const report = {
    mode: options.commit ? 'COMMIT' : 'DRY_RUN',
    onlyBook: options.onlyBook ?? 'ALL',
    formulaCatalogCount: catalog.length,
    excludedSourceCount: await prisma.problem.count({
      where: {
        ...base,
        OR: [
          { analysis: { is: null } },
          { analysis: { is: { sourceVariant: null } } },
          { analysis: { is: { sourceVariant: { notIn: ['A', 'B'] } } } },
        ],
      },
    }),
    eligibleProblems: 0,
    matchedProblems: 0,
    suggestedLinks: 0,
    existingLinks: 0,
    additions: 0,
    insertedLinks: 0,
    unmatchedProblems: 0,
    formulas: {},
    unmatchedByTopic: {},
    samples: [],
  };
  const { problemTopic } = require('../dist/src/formulas/tagger.js');
  function record(row, plan, inserted) {
    report.eligibleProblems++;
    report.existingLinks += row.formulas.length;
    report.suggestedLinks += plan.suggestions.length;
    report.additions += plan.additions.length;
    report.insertedLinks += inserted;
    if (plan.suggestions.length) report.matchedProblems++;
    else {
      report.unmatchedProblems++;
      const topic = problemTopic({ ...row, chapterTitle: row.chapter.title });
      report.unmatchedByTopic[topic] =
        (report.unmatchedByTopic[topic] ?? 0) + 1;
    }
    for (const suggestion of plan.suggestions)
      report.formulas[suggestion.slug] =
        (report.formulas[suggestion.slug] ?? 0) + 1;
    // No statements, answers, contact information or private variant tokens.
    sampleInto(
      report.samples,
      {
        token: row.token,
        suggestions: plan.suggestions,
        additions: plan.additions.map((s) => s.slug),
      },
      report.eligibleProblems,
      random,
    );
  }
  let cursor;
  while (true) {
    const page = await prisma.problem.findMany({
      where,
      select: { id: true },
      orderBy: { id: 'asc' },
      take: 100,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });
    if (!page.length) break;
    for (const item of page) {
      const processRow = async (tx) => {
        if (options.commit) {
          // Serialize repeated tagger runs and content edits. FK inserts also
          // wait on this parent row. Scope is rechecked before fetching text.
          const locked = await tx.$queryRawUnsafe(
            'SELECT p.id FROM "Problem" p JOIN "ProblemAnalysis" a ON a."problemId"=p.id WHERE p.id=$1 AND a."sourceVariant" IN (\'A\',\'B\') FOR UPDATE OF p,a',
            item.id,
          );
          if (!locked.length) return null;
        }
        const row = await tx.problem.findFirst({
          where: { ...where, id: item.id },
          select: contentSelect,
        });
        if (!row) return null;
        const plan = planLinks(row, catalog, tagProblem);
        const inserted =
          options.commit && plan.additions.length
            ? (
                await tx.problemFormula.createMany({
                  data: plan.additions.map((s) => ({
                    problemId: row.id,
                    formulaId: s.formulaId,
                  })),
                  skipDuplicates: true,
                })
              ).count
            : 0;
        return { row, plan, inserted };
      };
      let outcome;
      if (options.commit) {
        // Independent append-only transactions: rerunning after interruption is
        // safe. A failed row aborts the command; earlier commits stay committed.
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            outcome = await prisma.$transaction(processRow, {
              isolationLevel: 'Serializable',
              timeout: 15000,
            });
            break;
          } catch (error) {
            if (error.code !== 'P2034' || attempt === 2) throw error;
          }
        }
      } else outcome = await processRow(prisma);
      if (outcome) record(outcome.row, outcome.plan, outcome.inserted);
    }
    cursor = page.at(-1).id;
  }
  report.formulas = Object.fromEntries(
    Object.entries(report.formulas).sort(([a], [b]) => a.localeCompare(b)),
  );
  report.unmatchedByTopic = Object.fromEntries(
    Object.entries(report.unmatchedByTopic).sort(([a], [b]) =>
      a.localeCompare(b),
    ),
  );
  return report;
}
async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(
      'Usage: npm run build && node prisma/tag-problem-formulas.cjs [--only-book=100V3] [--commit]\nDry-run is the default. Explicit DATABASE_URL required; no .env is loaded. Outputs JSON; no local files are written. Commit only appends links, preserves manual links, and caps total at4. A/B source variants only. Interrupted commit may have completed earlier rows; rerun safely.',
    );
    return;
  }
  if (!process.env.DATABASE_URL)
    throw new Error('DATABASE_URL is required explicitly');
  const { PrismaPg } = require('@prisma/adapter-pg');
  const { PrismaClient } = require('../dist/src/generated/prisma/client.js');
  const { tagProblem } = require('../dist/src/formulas/tagger.js');
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });
  try {
    console.log(
      JSON.stringify(await runTagging(prisma, options, tagProblem), null, 2),
    );
  } finally {
    await prisma.$disconnect();
  }
}
module.exports = {
  parseArgs,
  eligibleWhere,
  planLinks,
  sampleInto,
  runTagging,
};
if (require.main === module)
  main().catch((error) => {
    console.error(
      'Formula tagging failed. No statements or credentials are logged. Earlier committed rows may remain; rerunning is safe.',
    );
    console.error(
      ['P2034', 'P2003', 'P2025'].includes(error.code)
        ? error.code
        : 'Check arguments, explicit DATABASE_URL, compiled build, migrations and seeded formula catalog.',
    );
    process.exitCode = 1;
  });
