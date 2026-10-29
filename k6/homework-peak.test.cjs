// HTTP дуудлагагүй шалгалт: node --test k6/homework-peak.test.cjs
const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');

const targetSrc =
  fs.readFileSync(path.join(__dirname, 'target.js'), 'utf8').replace('export function', 'function') +
  '\nglobalThis.safeTarget=safeTarget;';
const tctx = {};
vm.runInNewContext(targetSrc, tctx);

function script(env = {}, presign = { direct: false }) {
  const requests = [];
  const fixtures = Array.from({ length: 500 }, (_, i) => ({
    token: 'synthetic-' + i,
    testId: 'lttest_hw',
    date: '2026-10-29',
    classroomId: 'ltclass_a',
  }));
  let code = fs
    .readFileSync(path.join(__dirname, 'homework-peak.js'), 'utf8')
    .replace(/^import .*;\n/gm, '')
    .replace('export const options', 'const options')
    .replace('export default function ()', 'function scenario()');
  code += '\nglobalThis.run=scenario;globalThis.options=options;';
  const reply = (url) => {
    const body = url.endsWith('/homework/attempts')
      ? { attemptId: 'att1', problems: [{ id: 'p1' }, { id: 'p2' }] }
      : url.endsWith('/uploads/presign')
        ? presign
        : {};
    return { status: 200, json: () => body };
  };
  const rec = (method) => (url, body, params) => {
    requests.push({ method, url, body, params });
    return reply(url);
  };
  const c = {
    safeTarget: tctx.safeTarget,
    __ENV: env,
    __VU: 1,
    open: () => JSON.stringify(fixtures),
    SharedArray: function (_n, f) {
      return f();
    },
    http: { get: (u, p) => rec('GET')(u, null, p), post: rec('POST'), patch: rec('PATCH'), put: rec('PUT') },
    check: (r, checks) => Object.values(checks).every((f) => f(r)),
    sleep: () => {},
    fail: (m) => {
      throw Error(m);
    },
    Math,
  };
  vm.runInNewContext(code, c);
  return { ...c, requests };
}

test('500 VU, нэг аялал: list → start → autosave → 2 check → submit → presign', () => {
  const s = script();
  assert.equal(s.options.scenarios.homework.vus, 500);
  assert.equal(s.options.scenarios.homework.iterations, 1);
  s.run();
  const names = s.requests.map((r) => `${r.method} ${r.url.replace(/^.*\/api/, '')}`);
  assert.equal(names[0], 'GET /homework/my?days=14');
  assert.equal(names[1], 'POST /homework/attempts');
  assert.equal(names.filter((n) => n.startsWith('PATCH')).length, 24);
  assert.equal(names.filter((n) => n.endsWith('/check')).length, 2);
  assert.equal(names.filter((n) => n.endsWith('/submit')).length, 1);
  assert.equal(names.at(-1), 'POST /uploads/presign');
  assert(s.requests.every((r) => r.params.redirects === 0));
  assert.deepEqual(JSON.parse(s.requests[1].body), { testId: 'lttest_hw', date: '2026-10-29' });
});

test('бодит S3 руу PUT хийхгүй; локал minio үед л complete + photo', () => {
  const remote = script({ LOAD_S3_LOCAL: '1' }, { direct: true, url: 'https://pimath-media.s3.amazonaws.com/x', ticket: 't', headers: {} });
  assert.throws(() => remote.run(), /non-loopback/);
  const local = script({ LOAD_S3_LOCAL: '1' }, { direct: true, url: 'http://127.0.0.1:9000/b/x', ticket: 't', headers: {} });
  local.run();
  assert.deepEqual(local.requests.slice(-3).map((r) => r.method + ' ' + r.url.split('/').slice(-2).join('/')), [
    'PUT b/x',
    'POST uploads/complete',
    'POST homework/photos',
  ]);
});

test('прод/public хаяг ба хэт их VU-г сүлжээнд гарахаас өмнө татгалзана', () => {
  assert.throws(() => script({ LOAD_TARGET: 'https://pimath.mn/api' }));
  assert.throws(() => script({ LOAD_TARGET: 'https://api.pimath.mn/api' }));
  assert.throws(() => script({ LOAD_VUS: '5000' }));
});
