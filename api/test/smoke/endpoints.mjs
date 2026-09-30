/** Local synthetic HTTP smoke: no provider calls, no authorised writes, no real account defaults. */
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { assertConfig } = require('./safety.cjs');
const contracts = require('./night1-contracts.json');
export const intentionallyPublic = new Set([
  'GET /api',
  'GET /api/books',
  'GET /api/chapters',
  'GET /api/catalog/passes',
  'GET /api/enrollment-windows',
  'GET /api/store/products',
  // Existing public catalog metadata/statement previews; no learner records.
  'GET /api/catalog/grades/:grade/chapters',
  'GET /api/catalog/chapters/:id/preview',
  ...contracts
    .filter((c) => !c.roles.length && !c.auth)
    .map((c) => `${c.method} ${c.path}`),
]);
const roles = [
  'STUDENT',
  'TEACHER',
  'TEACHER_PLUS',
  'ADMIN',
  'PARENT',
  'BUYER',
];
const staffPrefixes = [
  '/api/finance',
  '/api/tuition/refund',
  '/api/tuition/refunds',
  '/api/audit',
  '/api/analytics',
  '/api/insights',
  '/api/sms',
  '/api/reconcile',
  '/api/store/admin',
  '/api/payments/outstanding',
  '/api/payments/months',
  '/api/payments/student',
];
export function forbiddenRole(method, path, role) {
  const contract = contracts.find(
    (c) => c.method === method && c.path === path,
  );
  if (contract)
    return contract.roles.length > 0 && !contract.roles.includes(role);
  return (
    ['STUDENT', 'PARENT', 'BUYER'].includes(role) &&
    (['GET /api/payments', 'GET /api/users'].includes(`${method} ${path}`) ||
      staffPrefixes.some((p) => path === p || path.startsWith(p + '/')))
  );
}
export function failureReason(method, path, actor, status) {
  if (status === 0 || status >= 500) return 'server-or-network';
  if (status >= 300 && status < 400) return 'unexpected-redirect';
  if (status === 429) return 'rate-limit-invalidates-smoke';
  const key = `${method} ${path}`;
  // The calendar credential is an opaque query token, never the session JWT.
  if (path === '/api/schedule/my.ics')
    return status === 404 ? null : 'calendar-token-boundary';
  if (
    actor === 'ANON' &&
    !intentionallyPublic.has(key) &&
    status !== 401 &&
    status !== 403
  )
    return 'anonymous-access-boundary';
  if (actor !== 'ANON' && forbiddenRole(method, path, actor) && status !== 403)
    return 'role-boundary';
  if (actor !== 'ANON' && status === 401) return 'invalid-synthetic-session';
  if (intentionallyPublic.has(key) && ![200, 400, 404].includes(status))
    return 'public-contract';
  return null;
}
export async function call(base, method, path, token, fetcher = fetch) {
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
  try {
    const response = await fetcher(
      base + path.replace(/:[A-Za-z0-9_]+/g, 'synthetic_missing_id'),
      {
        method,
        headers,
        redirect: 'manual',
        signal: AbortSignal.timeout(20_000),
        ...(!['GET', 'HEAD', 'DELETE'].includes(method) ? { body: '{}' } : {}),
      },
    );
    // Do not log response bodies: smoke reports must never contain PII or credentials.
    await response.body?.cancel();
    return response.status;
  } catch {
    return 0;
  }
}
export async function run({
  base,
  routes,
  tokens,
  strict = false,
  fetcher = fetch,
  log = console.log,
}) {
  const keys = new Set(routes.map((r) => `${r.method} ${r.path}`));
  const missing = contracts
    .filter((c) => !keys.has(`${c.method} ${c.path}`))
    .map((c) => `${c.gap}: ${c.method} ${c.path}`);
  if (missing.length)
    log(
      `Unmerged/missing Night-1 contracts (${missing.length}):\n${missing.join('\n')}`,
    );
  if (strict && missing.length)
    return {
      checked: 0,
      omittedWrites: 0,
      missing,
      failures: ['missing-required-routes'],
    };
  const failures = [];
  let checked = 0,
    omittedWrites = 0;
  for (const route of routes) {
    // Arbitrary writes may trigger emails/payments even with an empty body. Test only
    // the explicitly enumerated denied-role writes; business success is unit/integration coverage.
    const write = !['GET', 'HEAD'].includes(route.method);
    const contract = contracts.find(
      (c) => c.method === route.method && c.path === route.path,
    );
    if (write && (!contract || !contract.roles.length)) {
      omittedWrites++;
      continue;
    }
    if (route.path.startsWith('/api/auth/')) continue;
    for (const actor of ['ANON', ...roles]) {
      if (
        write &&
        actor !== 'ANON' &&
        !forbiddenRole(route.method, route.path, actor)
      ) {
        omittedWrites++;
        continue;
      }
      const status = await call(
        base,
        route.method,
        route.path,
        tokens[actor],
        fetcher,
      );
      checked++;
      const reason = failureReason(route.method, route.path, actor, status);
      if (reason)
        failures.push({
          method: route.method,
          path: route.path,
          actor,
          status,
          reason,
        });
    }
  }
  return { checked, omittedWrites, missing, failures };
}
export async function main(args = process.argv.slice(2), env = process.env) {
  const value = (flag) => {
    const i = args.indexOf(flag);
    return i < 0 ? undefined : args[i + 1];
  };
  const base = assertConfig(value('--base') || 'http://127.0.0.1:3000', env);
  const tokens = {};
  for (const role of roles) {
    const token = env[`SMOKE_${role}_TOKEN`];
    if (!token) throw Error(`Missing synthetic SMOKE_${role}_TOKEN`);
    tokens[role] = token;
  }
  const raw = fs.readFileSync(new URL('./routes.txt', import.meta.url), 'utf8');
  const routes = raw
    .trim()
    .split('\n')
    .map((line) => {
      const [method, path] = line.trim().split(/\s+/);
      return { method, path };
    })
    .filter(
      (r) =>
        r.method &&
        r.path &&
        (!value('--only') || r.path.startsWith(value('--only'))),
    );
  const result = await run({
    base,
    routes,
    tokens,
    strict: args.includes('--night1-complete'),
  });
  console.log(JSON.stringify(result, null, 2));
  return result.failures.length ? 1 : 0;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href)
  main()
    .then((code) => {
      process.exitCode = code;
    })
    .catch((error) => {
      console.error(error.message);
      process.exitCode = 2;
    });
