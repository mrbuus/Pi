#!/usr/bin/env node
'use strict';
// Content-only diagnostic. No corrective SQL, no ORM hooks, no learner records.
const fs = require('node:fs');
const path = require('node:path');
const katex = require('../../web/node_modules/katex');
const katexVersion = require('../../web/node_modules/katex/package.json').version;
const categories = {
  ESCAPED_BRACES: 'Экранилсан хаалтыг бүлэглэх хаалттай андуурсан байж болно',
  MISSING_RIGHT_DOT: 'Баруун үл үзэгдэх хаалтын цэг алдагдсан байж болно',
  SPLIT_LEFT_RIGHT: 'left/right хос нэг талбар/сонголт дотор бүрэн биш',
  GLUED_COMMAND: 'LaTeX тушаал хувьсагчтай наалдсан',
  TRAILING_BACKSLASH: 'Төгсгөлийн ганц backslash',
  GOOD_LUCK_SUFFIX: 'Амжилт хүсье бичвэр агуулгад наалдсан',
  ARROW_GLYPH: 'Дэмжигдээгүй суман тэмдэг',
  SPLIT_NEGATIVE: 'Сөрөг тоо зайгаар салсан байж болно',
};

function strings(value, field, out = []) {
  if (typeof value === 'string') out.push({ field, text: value });
  else if (Array.isArray(value)) value.forEach((v, i) => strings(v, `${field}[${i}]`, out));
  else if (value && typeof value === 'object') Object.entries(value).forEach(([k, v]) => strings(v, `${field}.${k}`, out));
  return out;
}

// Audit stored expressions as written. Unlike display-time MathText heuristics,
// this never normalizes, repairs, or writes the source back.
function expressions(text) {
  const result = [];
  const re = /\$\$([\s\S]*?)\$\$|(?<!\\)\$([^$]*?)(?<!\\)\$|\\\[([\s\S]*?)\\\]|\\\(([\s\S]*?)\\\)/g;
  let match;
  while ((match = re.exec(text))) result.push({ text: match[1] ?? match[2] ?? match[3] ?? match[4], display: match[1] !== undefined || match[3] !== undefined });
  if (!result.length && /\\[A-Za-z]+|[_^{}]/.test(text)) result.push({ text, display: false });
  return result;
}

function classify(text) {
  const found = [];
  if (/\\[{}]/.test(text)) found.push('ESCAPED_BRACES');
  if (/\\right(?:\s*$|\s*(?=[A-Za-zА-Яа-яӨөҮү0-9]))/.test(text)) found.push('MISSING_RIGHT_DOT');
  if ((text.match(/\\left\b/g) || []).length !== (text.match(/\\right\b/g) || []).length) found.push('SPLIT_LEFT_RIGHT');
  if (/\\(?:leq|geq|neq|times|cdot|sqrt)[xyzabc](?![A-Za-z])/.test(text)) found.push('GLUED_COMMAND');
  const tail = text.match(/(\\+)\s*$/);
  if (tail && tail[1].length % 2 === 1) found.push('TRAILING_BACKSLASH');
  if (/Амжилт\s+хүсье\s*!?/i.test(text)) found.push('GOOD_LUCK_SUFFIX');
  if (/\u2907/.test(text)) found.push('ARROW_GLYPH');
  if (/(?:^|[=([{,:;]|\$)\s*-\s+\d/.test(text)) found.push('SPLIT_NEGATIVE');
  return found;
}

function auditProblem(problem) {
  const fields = [];
  for (const key of ['statementText', 'choices', 'correctAnswer', 'choiceOptions', 'analysis']) strings(problem[key], key, fields);
  const issues = [];
  for (const { field, text } of fields) {
    for (const category of classify(text)) issues.push({ id: problem.id, token: problem.token, field, category, severity: 'REVIEW', message: categories[category] });
    for (const [index, expression] of expressions(text).entries()) {
      try {
        katex.renderToString(expression.text, { throwOnError: true, displayMode: expression.display, trust: false, strict: 'ignore', maxSize: 50, maxExpand: 1000 });
      } catch {
        issues.push({ id: problem.id, token: problem.token, field, category: 'KATEX_PARSE_ERROR', severity: 'ERROR', message: `Томьёо ${index + 1} KaTeX-д задлагдсангүй` });
      }
    }
  }
  return issues;
}

const QUERY = `SELECT p.id, p.token, p."statementText", p.choices, p."correctAnswer",
  (SELECT jsonb_agg(jsonb_build_object('text', c.text, 'mistakeNote', c."mistakeNote") ORDER BY c."order") FROM "ProblemChoice" c WHERE c."problemId" = p.id) AS "choiceOptions",
  (SELECT jsonb_build_object('formulas', a.formulas, 'solutionOutline', a."solutionOutline") FROM "ProblemAnalysis" a WHERE a."problemId" = p.id) AS analysis
FROM "Problem" p WHERE ($1::text IS NULL OR p.id > $1) ORDER BY p.id LIMIT $2`;

async function readOnlyAudit(client, batchSize = 200) {
  if (!Number.isInteger(batchSize) || batchSize < 1 || batchSize > 1000) throw Error('batchSize must be 1..1000');
  const report = { katexVersion, checkedProblems: 0, affectedProblems: 0, counts: Object.fromEntries([...Object.keys(categories), 'KATEX_PARSE_ERROR'].map(k => [k, 0])), issues: [] };
  await client.query('BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY');
  try {
    await client.query("SET LOCAL statement_timeout = '30s'");
    await client.query("SET LOCAL lock_timeout = '5s'");
    let cursor = null;
    while (true) {
      const { rows } = await client.query(QUERY, [cursor, batchSize]);
      if (!rows.length) break;
      for (const row of rows) {
        report.checkedProblems++;
        const issues = auditProblem(row);
        if (issues.length) report.affectedProblems++;
        for (const issue of issues) report.counts[issue.category]++;
        report.issues.push(...issues);
      }
      cursor = rows.at(-1).id;
    }
    return report;
  } finally { await client.query('ROLLBACK'); }
}

function csvCell(value) {
  let text = String(value ?? '');
  if (/^[=+@\-\t\r]/.test(text)) text = "'" + text;
  return '"' + text.replaceAll('"', '""') + '"';
}
function asCsv(report) {
  const keys = ['id', 'token', 'field', 'category', 'severity', 'message'];
  return '\uFEFF' + [keys, ...report.issues.map(issue => keys.map(k => issue[k]))].map(row => row.map(csvCell).join(',')).join('\r\n') + '\r\n';
}
async function main(args = process.argv.slice(2)) {
  if (args.includes('--help')) { console.log('DATABASE_URL=... node prisma/audit-latex.cjs [--format json|csv] [--output /path/report] [--batch-size 200]\nREAD ONLY. Does not load .env. Prefer a DB account with SELECT-only permissions.'); return; }
  const options = { format: 'json', output: null, batchSize: 200 };
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i], value = args[i + 1];
    if (!value) throw Error('Missing option value');
    if (key === '--format') options.format = value;
    else if (key === '--output') options.output = path.resolve(value);
    else if (key === '--batch-size') options.batchSize = Number(value);
    else throw Error('Unknown option');
  }
  if (!['json', 'csv'].includes(options.format)) throw Error('format must be json or csv');
  if (!process.env.DATABASE_URL) throw Error('DATABASE_URL is required explicitly; .env is not loaded');
  const { Client } = require('pg');
  const client = new Client({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 10000, application_name: 'pi_latex_readonly_audit' });
  try {
    await client.connect();
    const report = await readOnlyAudit(client, options.batchSize);
    const output = options.format === 'json' ? JSON.stringify(report, null, 2) + '\n' : asCsv(report);
    if (options.output) fs.writeFileSync(options.output, output, { flag: 'wx', mode: 0o600 });
    else process.stdout.write(output);
    // Keep stdout machine-readable. Diagnostics have no database credentials/content.
    process.stderr.write(`Checked ${report.checkedProblems}; affected ${report.affectedProblems}; KaTeX ${katexVersion}\n`);
  } finally { await client.end(); }
}
module.exports = { classify, expressions, auditProblem, readOnlyAudit, asCsv, main };
if (require.main === module) main().catch(() => { console.error('LaTeX audit failed; check explicit DB access/options. No corrective writes were attempted.'); process.exitCode = 1; });
