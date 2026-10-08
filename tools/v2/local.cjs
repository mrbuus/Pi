#!/usr/bin/env node
'use strict';
// Isolated local v2 only: no production data or provider credentials.
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), net = require('node:net');
const { spawn, spawnSync } = require('node:child_process');
const root = path.resolve(__dirname, '../..'), api = path.join(root, 'api'), web = path.join(root, 'web');
const runtime = path.join(root, '.runtime'), cluster = path.join(runtime, 'postgres');
const envPath = path.join(api, '.env'), passwordPath = path.join(runtime, 'pg-password');
const command = process.argv[2] || 'status';
const [nodeMajor, nodeMinor] = process.versions.node.split('.').map(Number);
if (!((nodeMajor === 22 && nodeMinor >= 12) || nodeMajor >= 24)) throw Error('Prisma7-д Node.js22.12+ эсвэл24+ шаардлагатай.');
if (!['setup', 'seed', 'start', 'status'].includes(command)) throw Error('Хэрэглээ: setup|seed|start|status');
fs.mkdirSync(runtime, { recursive: true, mode: 0o700 });
function run(bin, args, options = {}) {
  const result = spawnSync(bin, args, { cwd: api, stdio: 'inherit', ...options });
  if (result.error || result.status !== 0) throw Error('Команд амжилтгүй: ' + path.basename(bin));
}
function config() {
  const values = require(path.join(api, 'node_modules/dotenv')).parse(fs.readFileSync(envPath));
  const url = new URL(values.DATABASE_URL);
  if (url.hostname !== '127.0.0.1' || url.port !== '5544' || url.pathname !== '/pimn_v2' || url.username !== 'pi_v2') throw Error('Зөвхөн pi_v2@127.0.0.1:5544/pimn_v2 сан зөвшөөрнө.');
  if (values.PORT !== '3380' || values.WEB_ORIGIN !== 'http://localhost:3381') throw Error('v2 API3380 / вэб3381 тохиргоо шаардлагатай.');
  if (!values.JWT_SECRET || values.JWT_SECRET.length < 32) throw Error('JWT тохиргоо дутуу.');
  for (const key of ['QPAY_CLIENT_ID', 'QPAY_CLIENT_SECRET', 'EMAIL_SMTP_PASS', 'GOOGLE_CLIENT_SECRET']) if (values[key]) throw Error('Локал launcher гаднын үйлчилгээний credential ашиглахгүй.');
  return { values, dbEnv: { ...process.env, PGPASSWORD: decodeURIComponent(url.password) } };
}
function pg(name) {
  for (const dir of [process.env.PI_V2_PG_BIN, '/opt/homebrew/opt/postgresql@16/bin', '/usr/local/opt/postgresql@16/bin'].filter(Boolean)) if (fs.existsSync(path.join(dir, name))) return path.join(dir, name);
  throw Error('PostgreSQL16 хэрэгслийн замыг PI_V2_PG_BIN-д тохируулна уу.');
}
function portOpen(port) {
  return new Promise(resolve => {
    const socket = net.createConnection({ host: '127.0.0.1', port });
    socket.setTimeout(600);
    const done = value => { socket.destroy(); resolve(value); };
    socket.once('connect', () => done(true)); socket.once('error', () => done(false)); socket.once('timeout', () => done(false));
  });
}
async function setup() {
  if (!fs.existsSync(path.join(api, 'node_modules/dotenv'))) throw Error('Эхлээд api болон web дотор npm ci ажиллуулна уу.');
  if (!fs.existsSync(envPath)) {
    if (!fs.existsSync(passwordPath)) fs.writeFileSync(passwordPath, crypto.randomBytes(24).toString('hex'), { mode: 0o600 });
    const password = fs.readFileSync(passwordPath, 'utf8').trim();
    fs.writeFileSync(envPath, ['DATABASE_URL=postgresql://pi_v2:' + encodeURIComponent(password) + '@127.0.0.1:5544/pimn_v2', 'JWT_SECRET=' + crypto.randomBytes(48).toString('hex'), 'PORT=3380', 'HOST=127.0.0.1', 'WEB_ORIGIN=http://localhost:3381', 'UPLOAD_DIR=' + JSON.stringify(path.join(runtime, 'uploads')), 'DB_POOL_MAX=10', 'DB_STATEMENT_TIMEOUT_MS=10000', ''].join('\n'), { mode: 0o600 });
  }
  const { dbEnv } = config(), webEnv = path.join(web, '.env.local');
  if (!fs.existsSync(webEnv)) fs.writeFileSync(webEnv, 'NEXT_PUBLIC_API_URL=http://localhost:3380/api\n', { mode: 0o600 });
  else if (!/^NEXT_PUBLIC_API_URL=http:\/\/localhost:3380\/api$/m.test(fs.readFileSync(webEnv, 'utf8'))) throw Error('Өөр API тохиргоог дарж бичихгүй.');
  if (!fs.existsSync(path.join(cluster, 'PG_VERSION'))) {
    if (!fs.existsSync(passwordPath)) throw Error('Шинэ cluster үүсгэх password файл дутуу.');
    run(pg('initdb'), ['-D', cluster, '-U', 'pi_v2', '--pwfile=' + passwordPath, '--auth-host=scram-sha-256', '--auth-local=trust', '-E', 'UTF8', '--locale=C']);
    fs.appendFileSync(path.join(cluster, 'postgresql.conf'), "\nlisten_addresses='127.0.0.1'\nport=5544\nunix_socket_directories='" + runtime.replaceAll("'", "''") + "'\n");
  }
  const status = spawnSync(pg('pg_ctl'), ['-D', cluster, 'status'], { stdio: 'ignore' });
  if (status.status !== 0) {
    if (await portOpen(5544)) throw Error('5544 порт өөр процесс ашиглаж байна; зогсоохгүй.');
    run(pg('pg_ctl'), ['-D', cluster, '-l', path.join(runtime, 'postgres.log'), 'start']);
  }
  const args = ['-h', '127.0.0.1', '-p', '5544', '-U', 'pi_v2'];
  const query = spawnSync(pg('psql'), [...args, '-d', 'postgres', '-At', '-c', "SELECT 1 FROM pg_database WHERE datname='pimn_v2'"], { env: dbEnv, encoding: 'utf8' });
  if (query.status !== 0) throw Error('v2 cluster-ийн эзэмшил/холболт баталгаажаагүй.');
  if (query.stdout.trim() !== '1') run(pg('createdb'), [...args, 'pimn_v2'], { env: dbEnv });
  run(path.join(api, 'node_modules/.bin/prisma'), ['migrate', 'deploy']);
  run(path.join(api, 'node_modules/.bin/prisma'), ['generate']);
  console.log('v2 setup бэлэн. Зохиомол жишээ: node tools/v2/local.cjs seed');
}
async function main() {
  if (command === 'setup') return setup();
  if (command === 'status') {
    const ports = await Promise.all([5544, 3380, 3381].map(portOpen));
    console.log(JSON.stringify({ root, ports: { postgres5544: ports[0], api3380: ports[1], web3381: ports[2] }, privateAccountsFile: fs.existsSync(path.join(runtime, 'accounts.json')) ? '.runtime/accounts.json' : null })); return;
  }
  const { values } = config();
  if (command === 'seed') return run(process.execPath, [path.join(__dirname, 'seed-local.cjs')]);
  if (!fs.existsSync(path.join(api, 'dist/src/main.js'))) throw Error('Эхлээд api дотор npm run build ажиллуулна уу.');
  if (await portOpen(3380) || await portOpen(3381)) throw Error('3380/3381 дээр сервер ажиллаж байна; өөрийн серверээ Ctrl+C-ээр зогсооно уу.');
  if (!(await portOpen(5544))) throw Error('Сан ажиллахгүй байна. setup ажиллуулна уу.');
  const children = [], apiLog = fs.openSync(path.join(runtime, 'api-server.log'), 'a', 0o600);
  const apiChild = spawn(process.execPath, ['dist/src/main.js'], { cwd: api, env: { ...process.env, ...values, HOST: '127.0.0.1' }, stdio: ['ignore', apiLog, apiLog] });
  children.push(apiChild);
  let stopping = false;
  const cleanup = () => { if (!stopping) { stopping = true; children.forEach(c => c.kill('SIGTERM')); } };
  process.on('SIGINT', cleanup); process.on('SIGTERM', cleanup); apiChild.once('error', cleanup);
  let ready = false;
  for (let i = 0; i < 30; i++) {
    if (stopping) return;
    if (apiChild.exitCode !== null) { cleanup(); throw Error('API асахгүй байна. .runtime/api-server.log-ийг шалгана уу.'); }
    try {
      const response = await fetch('http://127.0.0.1:3380/api/health/ready', { signal: AbortSignal.timeout(600) });
      if (response.ok) { ready = true; break; }
    } catch { /* A listening socket alone does not confirm DB readiness. */ }
    await new Promise(resolve => setTimeout(resolve, 300));
  }
  if (stopping) return;
  if (!ready) { cleanup(); throw Error('API / database бэлэн болох хугацаа дууссан.'); }
  const webChild = spawn(process.execPath, [path.join(web, 'node_modules/next/dist/bin/next'), process.argv.includes('--production') ? 'start' : 'dev', '-p', '3381', '-H', '127.0.0.1'], { cwd: web, stdio: 'inherit' });
  children.push(webChild);
  webChild.once('error', error => { console.error('Вэб асахгүй байна: ' + error.message); cleanup(); });
  console.log('Pi.mn v2: http://localhost:3381 — зогсоох: Ctrl+C.');
  await new Promise(resolve => { webChild.once('exit', resolve); apiChild.once('exit', resolve); }); cleanup();
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
