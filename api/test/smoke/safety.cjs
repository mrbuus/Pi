'use strict';
function localUrl(raw, protocols) {
  const u = new URL(raw);
  if (
    !protocols.includes(u.protocol) ||
    !['localhost', '127.0.0.1', '[::1]'].includes(u.hostname)
  )
    throw Error('Smoke tests accept loopback targets only');
  return u;
}
function assertConfig(base, env = process.env) {
  if (env.SMOKE_SYNTHETIC !== '1')
    throw Error(
      'Set SMOKE_SYNTHETIC=1 only for an isolated synthetic database',
    );
  const u = localUrl(base, ['http:', 'https:']);
  if (
    u.username ||
    u.password ||
    u.search ||
    u.hash ||
    !['', '/'].includes(u.pathname)
  )
    throw Error('Smoke base must be a plain loopback origin');
  if (env.DATABASE_URL)
    localUrl(env.DATABASE_URL, ['postgres:', 'postgresql:']);
  return u.origin;
}
function assertDatabase(env = process.env) {
  if (!env.DATABASE_URL)
    throw Error(
      'Set an explicit loopback DATABASE_URL before loading Nest; .env fallback is not allowed',
    );
  const u = localUrl(env.DATABASE_URL, ['postgres:', 'postgresql:']);
  // libpq query parameters must not redirect a loopback URL to another host.
  for (const key of u.searchParams.keys()) {
    if (
      !['schema', 'sslmode', 'connection_limit', 'pool_timeout'].includes(key)
    )
      throw Error('Unsupported smoke database URL parameter');
  }
  return u;
}
module.exports = { assertConfig, assertDatabase };
