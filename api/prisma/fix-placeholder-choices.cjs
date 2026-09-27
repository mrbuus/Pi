#!/usr/bin/env node
'use strict';

// Safe repair utility for synthetic or owner-approved datasets. It is always a
// dry run unless --commit is supplied. Commit mode requires a backup outside the
// repo and explicit offline-write confirmation. Disable session creation first:
// Serializable isolation cannot block startSession, which does not share this lock.
const fs = require('node:fs');
const path = require('node:path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const REAL_REPO_ROOT = fs.realpathSync(REPO_ROOT);
const BACKUP_REQUIRED =
  'Commit mode needs --backup=/absolute/path outside the repository.';
const LATIN = ['A', 'B', 'C', 'D', 'E'];
const CYRILLIC = ['А', 'Б', 'В', 'Г', 'Д'];
const KEY_TO_INDEX = new Map(
  [...LATIN, ...CYRILLIC].map((letter, index) => [letter, index % 5]),
);

function parseArgs(argv) {
  const options = {
    commit: false,
    maintenanceWindow: false,
    offlineWriteConfirmation: false,
    flagReview: false,
    minConfidence: 0.9,
    backup: null,
    report: path.join(REPO_ROOT, 'docs/qa/choices-extract-report.md'),
  };
  for (const arg of argv) {
    if (arg === '--commit') options.commit = true;
    else if (arg === '--maintenance-window') options.maintenanceWindow = true;
    else if (arg === '--confirm-offline-write')
      options.offlineWriteConfirmation = true;
    else if (arg === '--flag-review') options.flagReview = true;
    else if (arg.startsWith('--min-confidence='))
      options.minConfidence = Number(arg.slice('--min-confidence='.length));
    else if (arg.startsWith('--backup='))
      options.backup = arg.slice('--backup='.length);
    else if (arg.startsWith('--report='))
      options.report = path.resolve(arg.slice('--report='.length));
    else if (arg === '--help') options.help = true;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  if (
    !Number.isFinite(options.minConfidence) ||
    options.minConfidence < 0 ||
    options.minConfidence > 1
  ) {
    throw new Error('--min-confidence must be a number between 0 and 1.');
  }
  if (options.commit) {
    if (!options.maintenanceWindow && !options.offlineWriteConfirmation) {
      throw new Error(
        'Commit requires --maintenance-window or --confirm-offline-write; disable session creation for the entire repair window.',
      );
    }
    if (!options.backup || !path.isAbsolute(options.backup))
      throw new Error(BACKUP_REQUIRED);
    const absoluteBackup = path.resolve(options.backup);
    let realParent;
    try {
      realParent = fs.realpathSync(path.dirname(absoluteBackup));
    } catch {
      throw new Error('Backup parent directory must already exist.');
    }
    options.backup = path.join(realParent, path.basename(absoluteBackup));
    const relative = path.relative(REAL_REPO_ROOT, options.backup);
    if (
      relative === '' ||
      (relative !== '..' && !relative.startsWith(`..${path.sep}`)) ||
      path.isAbsolute(relative)
    ) {
      throw new Error('Backup must be outside the repository.');
    }
    if (fs.existsSync(options.backup))
      throw new Error('Backup already exists; choose a new path.');
  }
  return options;
}

function isPlaceholderChoices(choices) {
  return (
    Array.isArray(choices) &&
    choices.length === 5 &&
    (LATIN.every((label, index) => choices[index] === label) ||
      CYRILLIC.every((label, index) => choices[index] === label))
  );
}

function safeContentWhere(ids) {
  return {
    id: { in: ids },
    format: 'CHOICE',
    OR: [{ choices: { equals: LATIN } }, { choices: { equals: CYRILLIC } }],
    analysis: {
      is: {
        sourceVariant: { in: ['A', 'B'] },
        status: { not: 'VERIFIED' },
      },
    },
    choiceOptions: { none: {} },
  };
}

function sameSnapshot(current, expected) {
  return (
    current &&
    current._count.choiceOptions === 0 &&
    current.format === expected.format &&
    current.statementText === expected.statementText &&
    JSON.stringify(current.choices) === JSON.stringify(expected.choices) &&
    JSON.stringify(current.correctAnswer) ===
      JSON.stringify(expected.correctAnswer) &&
    current.analysis?.sourceVariant === expected.sourceVariant &&
    current.analysis?.status === expected.analysisStatus
  );
}

function sessionProblemIds(sessions) {
  const ids = new Set();
  for (const session of sessions) {
    const order = session.problemOrder;
    if (Array.isArray(order)) {
      for (const id of order) if (typeof id === 'string') ids.add(id);
    }
  }
  return ids;
}

function answerIndex(answer) {
  if (typeof answer !== 'string') return null;
  return KEY_TO_INDEX.get(answer.trim().toUpperCase()) ?? null;
}

function loadKatex() {
  for (const candidate of [
    'katex',
    path.resolve(__dirname, '../../web/node_modules/katex'),
  ]) {
    try {
      return require(candidate);
    } catch {
      // Try the next local installation path; never install dependencies here.
    }
  }
  throw new Error(
    'KaTeX is required for repair validation; install existing web dependencies first.',
  );
}

function mathExpressions(text) {
  const expressions = [];
  let opening = null;
  let contentStart = -1;
  for (let index = 0; index < text.length; index += 1) {
    if (text[index] !== '$' || isEscaped(text, index)) continue;
    const delimiter = text[index + 1] === '$' ? '$$' : '$';
    if (delimiter === '$$') index += 1;
    if (opening === null) {
      opening = delimiter;
      contentStart = index + 1;
    } else if (opening === delimiter) {
      expressions.push(text.slice(contentStart, index + 1 - delimiter.length));
      opening = null;
      contentStart = -1;
    } else {
      throw new Error('Mismatched math delimiters.');
    }
  }
  if (opening !== null) throw new Error('Unclosed math delimiter.');
  return expressions;
}

function validateKatex(katex, result) {
  for (const value of [result.stem, ...result.choices]) {
    for (const expression of mathExpressions(value)) {
      katex.renderToString(expression, {
        throwOnError: true,
        strict: 'error',
        trust: false,
      });
    }
  }
}

function isSafeSourceVariant(value) {
  // This allowlist prevents fetching statementText for C or unidentified data.
  return value === 'A' || value === 'B';
}

function previewLine(row) {
  const detail =
    row.reason ??
    (row.result?.choices?.length === 5
      ? `5 сонголт, stem ${row.result.stem.length} тэмдэгт, сонголтын урт ${row.result.choices.map((choice) => choice.length).join('/')}`
      : (row.result?.issues?.[0]?.code ?? 'Шалгах шаардлагатай'));
  return `- ${row.token}: ${detail}${row.result ? `; итгэлцэл ${row.result.confidence.toFixed(2)}` : ''}`;
}

function buildReport(counts, samples, options, dryRun) {
  const lines = [
    '# Сонголт ялгах засварын тайлан',
    '',
    `Горим: ${dryRun ? 'DRY-RUN (өөрчлөлт хийгдээгүй)' : 'COMMIT'}`,
    `Доод итгэлцэл: ${options.minConfidence}; review flag: ${options.flagReview ? 'тийм' : 'үгүй'}`,
    `Offline write confirmation: ${options.maintenanceWindow || options.offlineWriteConfirmation ? 'тийм' : 'үгүй'}`,
    `Амжилттай: ${counts.success}; эргэлзээтэй: ${counts.uncertain}; алгассан: ${counts.skipped}; бүтэлгүй: ${counts.failed}`,
    '',
    'Жишээнүүд (эх өгүүлбэрийг тайланд оруулахгүй):',
    ...samples.slice(0, 40).map(previewLine),
    '',
    'Зөв хариултын түлхүүрийг өөрчлөөгүй. C/танигдаагүй sourceVariant болон ямар нэг хадгалсан session-тэй бодлогын текстийг уншаагүй/засварлаагүй.',
    'Commit горимд шалгалтын session эхлүүлэхийг засварын туршид унтраана. startSession энэ скриптийн serializable lock-той хуваалцдаггүй тул дан скрипт амьд session эхлэх race-ийг хааж чадахгүй.',
  ];
  return `${lines.join('\n')}\n`;
}

function ensureSchemaEnums() {
  const schema = fs.readFileSync(
    path.resolve(__dirname, '../prisma/schema.prisma'),
    'utf8',
  );
  const enumValues = (name) => {
    const match = schema.match(
      new RegExp(`enum\\s+${name}\\s*\\{([\\s\\S]*?)\\}`),
    );
    if (!match) throw new Error(`Schema enum ${name} not found.`);
    return match[1]
      .split('\n')
      .map((line) => line.trim().split(/\s+/)[0])
      .filter((value) => /^[A-Z][A-Z0-9_]*$/.test(value));
  };
  const required = {
    ProblemFormat: 'CHOICE',
    ProblemAnalysisStatus: 'REVIEW_REQUIRED',
    AttemptSessionStatus: 'IN_PROGRESS',
    MistakeType: 'NONE',
  };
  for (const [name, value] of Object.entries(required)) {
    if (!enumValues(name).includes(value))
      throw new Error(`Expected ${value} in schema enum ${name}.`);
  }
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    console.log(
      'Usage: npm run build && node prisma/fix-placeholder-choices.cjs [--commit --maintenance-window|--confirm-offline-write --backup=/outside/repo/backup.json] [--min-confidence=0.9] [--flag-review] [--report=/path/report.md]',
    );
    return;
  }
  ensureSchemaEnums();
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required.');
  const { PrismaPg } = require('@prisma/adapter-pg');
  const { PrismaClient } = require('../dist/src/generated/prisma/client.js');
  const { extractChoices } = require('../dist/src/content/choice-extract.js');
  const katex = loadKatex();
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });
  const counts = { success: 0, uncertain: 0, skipped: 0, failed: 0 };
  const samples = [];
  const reviewTargets = [];
  let backupRows = [];

  try {
    // First pass only reads non-content metadata. C and unknown source variants
    // are excluded before statementText/correctAnswer are selected.
    const metadataRows = await prisma.problem.findMany({
      where: { format: 'CHOICE' },
      select: {
        id: true,
        token: true,
        choices: true,
        analysis: { select: { sourceVariant: true, status: true } },
        choiceOptions: { select: { id: true } },
      },
    });
    const eligible = [];
    for (const row of metadataRows) {
      if (!isPlaceholderChoices(row.choices)) continue;
      if (!isSafeSourceVariant(row.analysis?.sourceVariant)) {
        counts.skipped += 1;
        samples.push({
          token: row.token,
          reason: 'sourceVariant allowlist-д байхгүй',
        });
        continue;
      }
      if (row.analysis?.status === 'VERIFIED') {
        counts.skipped += 1;
        samples.push({
          token: row.token,
          reason: 'VERIFIED анализыг автоматаар өөрчлөхгүй',
        });
        continue;
      }
      if (row.choiceOptions.length > 0) {
        counts.skipped += 1;
        samples.push({
          token: row.token,
          reason: 'бүтэцтэй сонголт аль хэдийн байна',
        });
        continue;
      }
      eligible.push(row);
    }

    const referencedBySession = sessionProblemIds(
      await prisma.testAttemptSession.findMany({
        select: { problemOrder: true },
      }),
    );
    const candidates = eligible.filter((row) => {
      if (!referencedBySession.has(row.id)) return true;
      counts.skipped += 1;
      samples.push({
        token: row.token,
        reason: 'хадгалсан session байна; хуучин хариуны утгыг хэвээр үлдээнэ',
      });
      return false;
    });

    // Content is fetched only for A/B variants with the exact placeholder shape,
    // no existing choice rows, and no saved session observed above.
    const contentRows =
      candidates.length === 0
        ? []
        : await prisma.problem.findMany({
            where: safeContentWhere(candidates.map((row) => row.id)),
            select: {
              id: true,
              token: true,
              format: true,
              statementText: true,
              correctAnswer: true,
              choices: true,
              analysis: { select: { sourceVariant: true, status: true } },
            },
          });
    const contentIds = new Set(contentRows.map((row) => row.id));
    for (const candidate of candidates) {
      if (contentIds.has(candidate.id)) continue;
      counts.skipped += 1;
      samples.push({
        token: candidate.token,
        reason: 'Контент уншихын өмнөх metadata дахин шалгалтад таараагүй',
      });
    }
    const plans = [];
    for (const row of contentRows) {
      let result;
      try {
        result = extractChoices(row.statementText);
      } catch (error) {
        counts.failed += 1;
        samples.push({
          token: row.token,
          reason: 'Extractor алдаа; мөрийг өөрчлөхгүй үлдээв',
        });
        continue;
      }
      try {
        validateKatex(katex, result);
      } catch {
        counts.uncertain += 1;
        samples.push({
          id: row.id,
          token: row.token,
          result,
          reason: 'LaTeX KaTeX рендерлэлтийн шалгалтад унасан',
        });
        reviewTargets.push({
          id: row.id,
          token: row.token,
          expected: {
            format: row.format,
            statementText: row.statementText,
            choices: row.choices,
            correctAnswer: row.correctAnswer,
            sourceVariant: row.analysis?.sourceVariant,
            analysisStatus: row.analysis?.status,
          },
        });
        continue;
      }
      const keyIndex = answerIndex(row.correctAnswer);
      if (
        result.choices.length !== 5 ||
        result.confidence < options.minConfidence ||
        keyIndex === null
      ) {
        counts.uncertain += 1;
        const reason =
          keyIndex === null
            ? 'correctAnswer нь танигдах A-E үсэг биш'
            : undefined;
        samples.push({ id: row.id, token: row.token, result, reason });
        reviewTargets.push({
          id: row.id,
          token: row.token,
          expected: {
            format: row.format,
            statementText: row.statementText,
            choices: row.choices,
            correctAnswer: row.correctAnswer,
            sourceVariant: row.analysis?.sourceVariant,
            analysisStatus: row.analysis?.status,
          },
        });
        continue;
      }
      plans.push({
        id: row.id,
        token: row.token,
        expected: {
          statementText: row.statementText,
          format: row.format,
          choices: row.choices,
          correctAnswer: row.correctAnswer,
          sourceVariant: row.analysis?.sourceVariant,
          analysisStatus: row.analysis?.status,
        },
        result,
        keyIndex,
      });
      samples.push({ id: row.id, token: row.token, result });
    }

    counts.success = plans.length;
    if (options.commit) {
      backupRows = plans.map((plan) => ({
        id: plan.id,
        token: plan.token,
        statementText: plan.expected.statementText,
        choices: plan.expected.choices,
        correctAnswer: plan.expected.correctAnswer,
        analysisStatus: plan.expected.analysisStatus,
        sourceVariant: plan.expected.sourceVariant,
        newChoices: plan.result.choices,
      }));
      const flagTargets = options.flagReview ? reviewTargets : [];
      const reviewSnapshots = [];
      for (const target of flagTargets) {
        const expectedStatus = target.expected.analysisStatus;
        if (expectedStatus && expectedStatus !== 'VERIFIED') {
          reviewSnapshots.push(target);
          backupRows.push({
            id: target.id,
            token: target.token,
            analysisStatus: expectedStatus,
            reviewOnly: true,
          });
        }
      }
      fs.mkdirSync(path.dirname(options.backup), { recursive: true });
      const descriptor = fs.openSync(options.backup, 'wx', 0o600);
      try {
        fs.writeFileSync(
          descriptor,
          `${JSON.stringify({ createdAt: new Date().toISOString(), rows: backupRows }, null, 2)}\n`,
        );
      } finally {
        fs.closeSync(descriptor);
      }

      try {
        await prisma.$transaction(
          async (tx) => {
            const referencedBySessionNow = sessionProblemIds(
              await tx.testAttemptSession.findMany({
                select: { problemOrder: true },
              }),
            );
            const guarded = [...plans, ...reviewSnapshots];
            for (const item of guarded) {
              if (referencedBySessionNow.has(item.id))
                throw new Error(
                  `Session appeared before commit (${item.token}).`,
                );
            }
            const currentRows = guarded.length
              ? await tx.problem.findMany({
                  where: safeContentWhere(guarded.map((item) => item.id)),
                  select: {
                    id: true,
                    format: true,
                    statementText: true,
                    choices: true,
                    correctAnswer: true,
                    analysis: { select: { sourceVariant: true, status: true } },
                    _count: { select: { choiceOptions: true } },
                  },
                })
              : [];
            const currentById = new Map(
              currentRows.map((row) => [row.id, row]),
            );
            for (const item of guarded) {
              const current = currentById.get(item.id);
              if (!sameSnapshot(current, item.expected)) {
                throw new Error(
                  `Problem changed since planning (${item.token}).`,
                );
              }
            }
            for (const plan of plans) {
              await tx.problemChoice.createMany({
                data: plan.result.choices.map((text, index) => ({
                  problemId: plan.id,
                  label: LATIN[index],
                  text,
                  isCorrect: index === plan.keyIndex,
                  mistakeType: 'NONE',
                  order: index,
                })),
              });
              await tx.problem.update({
                where: { id: plan.id },
                data: {
                  choices: plan.result.choices,
                  statementText: plan.result.stem,
                },
              });
            }
            for (const sample of reviewSnapshots) {
              await tx.problemAnalysis.updateMany({
                where: {
                  problemId: sample.id,
                  status: sample.expected.analysisStatus,
                },
                data: { status: 'REVIEW_REQUIRED' },
              });
            }
          },
          { isolationLevel: 'Serializable', timeout: 120000 },
        );
      } catch (error) {
        throw new Error(
          `Repair transaction failed or its outcome is unknown; backup retained at ${options.backup}. ${error.message || error}`,
        );
      }
    }

    const report = buildReport(counts, samples, options, !options.commit);
    fs.mkdirSync(path.dirname(options.report), { recursive: true });
    fs.writeFileSync(options.report, report, 'utf8');
    console.log(report);
    if (options.commit)
      console.log(`Backup saved outside repository: ${options.backup}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error.message || error);
  process.exitCode = 1;
});
