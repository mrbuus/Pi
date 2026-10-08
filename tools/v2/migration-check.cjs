#!/usr/bin/env node
'use strict';
// Validate the complete migration chain in a newly created, disposable local DB.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '../..'), api = path.join(root, 'api');
const config = require(path.join(api, 'node_modules/dotenv')).parse(fs.readFileSync(path.join(api, '.env')));
const source = new URL(config.DATABASE_URL);
if (source.hostname !== '127.0.0.1' || source.port !== '5544' || source.pathname !== '/pimn_v2' || source.username !== 'pi_v2') throw Error('Only the isolated v2 database is permitted.');
const name = 'pimn_v2_migrations_' + Date.now() + '_' + crypto.randomBytes(3).toString('hex');
const target = new URL(source); target.pathname = '/' + name;
const env = { ...process.env, DATABASE_URL: target.toString(), PGPASSWORD: decodeURIComponent(source.password) };
const base = ['-h', '127.0.0.1', '-p', '5544', '-U', 'pi_v2'];
const pg = process.env.PI_V2_PG_BIN || '/opt/homebrew/opt/postgresql@16/bin';
let created = false;
function run(bin, args, capture = false) {
  const result = spawnSync(bin, args, { cwd: api, env, encoding: 'utf8', stdio: capture ? 'pipe' : 'inherit', timeout: 180000 });
  if (result.error || result.status !== 0) throw Error(path.basename(bin) + ' failed');
  return result.stdout;
}
try {
  run(path.join(pg, 'createdb'), [...base, name]); created = true;
  run(path.join(api, 'node_modules/.bin/prisma'), ['migrate', 'deploy']);
  run(path.join(api, 'node_modules/.bin/prisma'), ['validate']);
  const applied = Number(run(path.join(pg, 'psql'), [...base, '-d', name, '-At', '-c', 'SELECT count(*) FROM "_prisma_migrations" WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL'], true).trim());
  const expected = fs.readdirSync(path.join(api, 'prisma/migrations'), { withFileTypes: true }).filter(e => e.isDirectory() && fs.existsSync(path.join(api, 'prisma/migrations', e.name, 'migration.sql'))).length;
  if (applied !== expected) throw Error('Migration count differs.');
  const report = { observedAt: new Date().toISOString(), isolatedEmptyDatabase: true, migrationsApplied: applied, expectedMigrations: expected, schemaValidated: true, productionMigrationValidated: false };
  fs.writeFileSync(path.join(root, '.runtime/migration-check-report.json'), JSON.stringify(report, null, 2), { mode: 0o600 });
  console.log(JSON.stringify(report));
} finally {
  if (created) run(path.join(pg, 'dropdb'), [...base, name]);
}
