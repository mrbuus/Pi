import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { call, failureReason, run, main } from './endpoints.mjs';
const require = createRequire(import.meta.url);
const { assertConfig, assertDatabase } = require('./safety.cjs');
test('Nest bootstrap cannot fall back to .env or redirect database hosts', () => {
  assert.throws(() => assertDatabase({}), /explicit loopback/);
  assert.throws(() =>
    assertDatabase({
      DATABASE_URL: 'postgresql://x@localhost/db?host=example.com',
    }),
  );
  assert.equal(
    assertDatabase({
      DATABASE_URL:
        'postgresql://synthetic@127.0.0.1:3367/night1?schema=public',
    }).hostname,
    '127.0.0.1',
  );
});
test('production and ambiguous targets rejected before network', () => {
  for (const base of [
    'https://pimn-api.onrender.com',
    'https://example.com',
    'http://127.0.0.1.evil.com',
    'http://127.0.0.1/api',
    'http://u:p@localhost',
    'http://localhost?redirect=x',
  ])
    assert.throws(() => assertConfig(base, { SMOKE_SYNTHETIC: '1' }));
  assert.throws(() => assertConfig('http://localhost:3000', {}));
  assert.throws(() =>
    assertConfig('http://localhost:3000', {
      SMOKE_SYNTHETIC: '1',
      DATABASE_URL: 'postgresql://x@example.com/db',
    }),
  );
  assert.equal(
    assertConfig('http://127.0.0.1:3000', { SMOKE_SYNTHETIC: '1' }),
    'http://127.0.0.1:3000',
  );
});
test('missing synthetic role credentials fail without login or real defaults', async () => {
  await assert.rejects(
    () => main([], { SMOKE_SYNTHETIC: '1' }),
    /SMOKE_STUDENT_TOKEN/,
  );
});
test('timeout signal is in fetch options and redirects cannot escape loopback', async () => {
  let captured;
  const status = await call(
    'http://localhost:3000',
    'GET',
    '/api/users/:id',
    'synthetic-token',
    async (url, init) => {
      captured = { url, init };
      return new Response('{}', { status: 403 });
    },
  );
  assert.equal(status, 403);
  assert.equal(captured.init.redirect, 'manual');
  assert.ok(captured.init.signal instanceof AbortSignal);
  assert.equal(
    captured.url,
    'http://localhost:3000/api/users/synthetic_missing_id',
  );
});
test('every forbidden role must receive403, anonymous401or403, rate limits fail', () => {
  assert.equal(
    failureReason('GET', '/api/passes', 'STUDENT', 200),
    'role-boundary',
  );
  assert.equal(
    failureReason('GET', '/api/passes', 'STUDENT', 400),
    'role-boundary',
  );
  assert.equal(failureReason('GET', '/api/passes', 'STUDENT', 403), null);
  assert.equal(
    failureReason('GET', '/api/unknown', 'ANON', 204),
    'anonymous-access-boundary',
  );
  assert.equal(
    failureReason('GET', '/api/unknown', 'ANON', 404),
    'anonymous-access-boundary',
  );
  assert.equal(
    failureReason('GET', '/api/passes', 'ADMIN', 429),
    'rate-limit-invalidates-smoke',
  );
  assert.equal(
    failureReason('GET', '/api/passes', 'ADMIN', 302),
    'unexpected-redirect',
  );
  assert.equal(
    failureReason('GET', '/api/passes', 'ADMIN', 401),
    'invalid-synthetic-session',
  );
  assert.equal(
    failureReason('GET', '/api/catalog/preview/books', 'ANON', 200),
    null,
  );
});
test('safe smoke never invokes an authorized mutation or provider operation', async () => {
  const calls = [];
  const result = await run({
    base: 'http://127.0.0.1:3000',
    routes: [
      { method: 'POST', path: '/api/passes/:id/grant' },
      { method: 'POST', path: '/api/sms/send' },
      { method: 'POST', path: '/api/notifications/read-all' },
    ],
    tokens: {
      ADMIN: 'admin',
      TEACHER_PLUS: 'plus',
      STUDENT: 'student',
      TEACHER: 'teacher',
      PARENT: 'parent',
      BUYER: 'buyer',
    },
    log: () => {},
    fetcher: async (url, init) => {
      calls.push({ url, token: init.headers.Authorization });
      return new Response('{}', {
        status: init.headers.Authorization ? 403 : 401,
      });
    },
  });
  assert.equal(result.failures.length, 0);
  assert.ok(calls.length);
  assert.ok(calls.every((c) => !c.url.includes('/sms/send')));
  assert.ok(
    calls.every((c) => !['Bearer admin', 'Bearer plus'].includes(c.token)),
  );
  assert.equal(calls.filter((c) => c.url.includes('/read-all')).length, 1);
});
test('strict coverage cannot quietly pass without sibling routes', async () => {
  const result = await run({
    base: 'http://127.0.0.1:3000',
    routes: [],
    tokens: {},
    strict: true,
    log: () => {},
    fetcher: () => {
      throw Error('must not call');
    },
  });
  assert.deepEqual(result.failures, ['missing-required-routes']);
  assert.ok(result.missing.length);
});
