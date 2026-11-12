// Хүчингүй болсон токен (хугацаа дууссан / нууц үг өөр газар солигдсон) — 401 ирэхэд
// хуучин токеныг цэвэрлэж /app доторх хуудаснаас нэвтрэх хуудас руу шилжүүлнэ.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function harness(pathname) {
  const calls = [], storage = new Map(), redirects = [];
  const compiled = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/lib/api.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const context = {
    exports: {}, process: { env: {} }, navigator: { onLine: true }, AbortSignal, FormData, console,
    window: { location: { pathname, search: '?tab=info', replace: (u) => redirects.push(u) } },
    localStorage: { getItem: (k) => storage.get(k) ?? null, setItem: (k, v) => storage.set(k, v), removeItem: (k) => storage.delete(k) },
    fetch: (_url, init) => new Promise((resolve) => calls.push({ init, finish: (status, value) => resolve({ ok: status < 400, status, json: async () => value, text: async () => '' }) })),
  };
  vm.runInNewContext(compiled, context);
  return { api: context.exports, calls, storage, redirects };
}

test('401 inside /app clears the stale token and sends the user to login', async () => {
  const h = harness('/app/my-class');
  h.api.setAuth('synthetic-old', 'STUDENT', true);
  const req = h.api.api('/auth/me');
  h.calls[0].finish(401, { message: 'Unauthorized' });
  await assert.rejects(req, (e) => e.status === 401);
  assert.equal(h.storage.get('pi_token'), undefined);
  assert.deepEqual(h.redirects, ['/login?expired=1&next=%2Fapp%2Fmy-class%3Ftab%3Dinfo']);
});

test('401 on a public page clears the token without redirecting', async () => {
  const h = harness('/');
  h.api.setAuth('synthetic-old', 'STUDENT', true);
  const req = h.api.api('/auth/me');
  h.calls[0].finish(401, {});
  await assert.rejects(req);
  assert.equal(h.storage.get('pi_token'), undefined);
  assert.deepEqual(h.redirects, []);
});

test('wrong password on login keeps the stored session untouched', async () => {
  const h = harness('/app/profile');
  h.api.setAuth('synthetic-current', 'STUDENT', true);
  const req = h.api.api('/auth/login', { method: 'POST', body: { identifier: 'x', password: 'y' } });
  h.calls[0].finish(401, { message: 'Нэвтрэх мэдээлэл буруу байна' });
  await assert.rejects(req, (e) => e.status === 401);
  assert.equal(h.storage.get('pi_token'), 'synthetic-current');
  assert.deepEqual(h.redirects, []);
});

test('a 401 for an older token does not log out the newer session', async () => {
  const h = harness('/app/profile');
  h.api.setAuth('synthetic-old', 'STUDENT', true);
  const req = h.api.api('/own');
  h.api.setAuth('synthetic-new', 'STUDENT', true);
  h.calls[0].finish(401, {});
  await assert.rejects(req);
  assert.equal(h.storage.get('pi_token'), 'synthetic-new');
  assert.deepEqual(h.redirects, []);
});

test('403 (no permission) does not log the user out', async () => {
  const h = harness('/app/students');
  h.api.setAuth('synthetic-current', 'TEACHER', true);
  const req = h.api.api('/users');
  h.calls[0].finish(403, {});
  await assert.rejects(req, (e) => e.status === 403);
  assert.equal(h.storage.get('pi_token'), 'synthetic-current');
});
