#!/usr/bin/env node
'use strict';
// A new disposable DB in the isolated cluster; never drop/overwrite a source DB.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '../..'), api = path.join(root, 'api');
const runtime = path.join(root, '.runtime');
const config = require(path.join(api, 'node_modules/dotenv')).parse(fs.readFileSync(path.join(api, '.env')));
const url = new URL(config.DATABASE_URL);
if (url.hostname !== '127.0.0.1' || url.port !== '5544' || url.pathname !== '/pimn_v2' || url.username !== 'pi_v2') throw Error('Only the isolated v2 database is permitted.');
const env = { ...process.env, PGPASSWORD: decodeURIComponent(url.password) };
const base = ['-h', '127.0.0.1', '-p', '5544', '-U', 'pi_v2'];
const bin = process.env.PI_V2_PG_BIN || '/opt/homebrew/opt/postgresql@16/bin';
const target = 'pimn_v2_restore_' + Date.now() + '_' + crypto.randomBytes(3).toString('hex');
const dump = path.join(runtime, 'restore-check.dump');
let created = false;
function run(name, args, capture = false) {
  const result = spawnSync(path.join(bin, name), args, { env, encoding: 'utf8', stdio: capture ? 'pipe' : 'inherit', timeout: 120000 });
  if (result.error || result.status !== 0) throw Error(name + ' failed');
  return result.stdout;
}
function summary(database) {
  const tables = ['_prisma_migrations', 'User', 'Problem', 'StoredFile', 'SubmissionRevision', 'LearningEvent', 'StudyReviewRun', 'StudyReviewItem', 'StudyReviewResponse', 'LessonPacket', 'StaffCapabilityGrant', 'Payment', 'Purchase', 'UserPass'];
  const query = tables.map(table => "SELECT '" + table + "' AS table_name, count(*)::text AS row_count FROM \"" + table + "\"").join(' UNION ALL ');
  return run('psql', [...base, '-d', database, '-At', '-c', query], true).trim();
}
try {
  const before = summary('pimn_v2');
  fs.mkdirSync(runtime, { recursive: true, mode: 0o700 });
  run('pg_dump', [...base, '-d', 'pimn_v2', '--format=custom', '--no-owner', '--no-acl', '--file=' + dump]);
  fs.chmodSync(dump, 0o600);
  run('createdb', [...base, target]); created = true;
  run('pg_restore', [...base, '-d', target, '--exit-on-error', '--no-owner', '--no-acl', dump]);
  const after = summary(target);
  if (before !== after) throw Error('Restored row counts differ from the captured source. Run while fixtures are idle.');
  const hashSql = 'SELECT key, md5(encode(bytes, \'hex\')) FROM "StoredFile" ORDER BY key';
  const hashes = name => run('psql', [...base, '-d', name, '-At', '-c', hashSql], true);
  if (hashes('pimn_v2') !== hashes(target)) throw Error('Restored attachment bytes differ.');
  const report = { observedAt: new Date().toISOString(), isolatedSource: true, syntheticFixturesOnly: true, restoredSuccessfully: true, criticalTableCountsMatched: true, attachmentByteHashesMatched: true, tableCounts: Object.fromEntries(before.split('\n').map(line => line.split('|'))), cloudRestoreValidated: false };
  fs.writeFileSync(path.join(runtime, 'restore-check-report.json'), JSON.stringify(report, null, 2), { mode: 0o600 });
  console.log(JSON.stringify({ restoredSuccessfully: true, criticalTables: 14, attachmentByteHashesMatched: true, cloudRestoreValidated: false }));
} finally {
  if (created) run('dropdb', [...base, target]);
}
