/* Only public assets and a whitelisted, user-independent math projection. */
const CACHE_PREFIX = 'pi-public-static-';
const CACHE = CACHE_PREFIX + 'v2';
const FORMULAS = 'pi-public-formulas-v1';
const OFFLINE = '/offline';
const MAX_ASSETS = 160;
const MAX_FORMULAS = 500;
const FORMULA_KEY = '/offline/formula/';
const apiBase = (() => {
  try {
    const url = new URL(new URL(self.location.href).searchParams.get('api'));
    return url.protocol === 'https:' || (url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname)) ? url : null;
  } catch { return null; }
})();
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(async cache => {
    // Both fallbacks are generic public pages, never an authenticated app shell.
    await cache.add('/offline.html');
    try {
      const response = await fetch(OFFLINE, { credentials: 'omit' });
      if (!response.ok || response.redirected) throw new Error('offline shell unavailable');
      await cache.put(OFFLINE, response.clone());
      const html = await response.text();
      const urls = [...html.matchAll(/(?:src|href)="([^"]+)"/g)].map(match => new URL(match[1].replace(/&amp;/g, '&'), self.location.origin));
      for (const url of urls.filter(url => url.origin === self.location.origin && isPublicAsset(url)).slice(0, MAX_ASSETS)) {
        const asset = await fetch(url.href, { credentials: 'omit' });
        if (!asset.ok || asset.redirected) continue;
        await cache.put(url.href, asset.clone());
        if (url.pathname.endsWith('.css')) {
          const css = await asset.text();
          for (const match of css.matchAll(/url\(["']?([^"')]+)["']?\)/g)) {
            const font = new URL(match[1], url.href);
            if (font.origin !== self.location.origin || !isPublicAsset(font)) continue;
            try { await cache.add(font.href); } catch { /* optional font */ }
          }
        }
      }
      await trim(cache, MAX_ASSETS, [OFFLINE, '/offline.html']);
    } catch { /* old deployments keep the static fallback */ }
  }));
  // Never interrupt an active examination with automatic skipWaiting.
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE).map(key => caches.delete(key)))));
});
self.addEventListener('message', event => {
  if (event.data?.type === 'PI_ACTIVATE_UPDATE') event.waitUntil(self.skipWaiting());
});
function isPublicAsset(url) {
  return /^\/_next\/static\/.+\.(?:js|css|woff2?|ttf|otf)$/.test(url.pathname) ||
    /^\/(?:fonts|icons)\/[^/]+\.(?:woff2?|ttf|png)$/.test(url.pathname) ||
    /^\/pwa-icons\/(?:192|512|maskable)$/.test(url.pathname) ||
    ['/favicon.ico', '/apple-icon', '/logo-mark.png'].includes(url.pathname);
}
function isFormulaCatalog(url) {
  if (!apiBase || url.origin !== apiBase.origin) return false;
  const prefix = apiBase.pathname.replace(/\/$/, '') + '/formulas';
  const suffix = url.pathname.slice(prefix.length);
  if (!url.pathname.startsWith(prefix) || !/^(?:|\/sections|\/[a-z0-9]+(?:-[a-z0-9]+)*)$/.test(suffix)) return false;
  if (['/my', '/review', '/stats', '/due', '/readiness'].includes(suffix)) return false;
  return [...url.searchParams.keys()].every(key => ['section', 'q', 'level', 'page', 'limit'].includes(key));
}
function text(value, limit = 16000) { return typeof value === 'string' ? value.slice(0, limit) : ''; }
function strings(value) { return Array.isArray(value) ? value.slice(0, 20).filter(x => typeof x === 'string').map(x => text(x)) : []; }
function publicFormula(value) {
  if (!value || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value.slug) || !text(value.title) || !text(value.latex)) return null;
  // Never persist headers/tokens, original responses, student IDs, quiz or practice.
  const projected = { slug: value.slug, title: text(value.title, 250), latex: text(value.latex), general: text(value.general), explanation: text(value.explanation), conditions: strings(value.conditions), derivation: strings(value.derivation), mnemonic: text(value.mnemonic), commonMistakes: strings(value.commonMistakes), eeshTip: text(value.eeshTip), savedAt: new Date().toISOString() };
  projected.examples = Array.isArray(value.examples) ? value.examples.slice(0, 10).map(example => ({ problem: text(example?.problem), steps: strings(example?.steps), answer: text(example?.answer) })) : [];
  return projected;
}
async function trim(cache, limit, keep = []) {
  const keys = await cache.keys();
  const removable = keys.filter(key => !keep.includes(new URL(key.url).pathname));
  await Promise.all(removable.slice(0, Math.max(0, removable.length - limit)).map(key => cache.delete(key)));
}
async function saveFormulas(response) {
  if (!response.ok || response.redirected || !['basic', 'cors', 'default'].includes(response.type) || !response.headers.get('content-type')?.includes('application/json')) return;
  const declaredSize = Number(response.headers.get('content-length') || 0);
  if (declaredSize > 2_000_000) return;
  try {
    const raw = await response.text();
    if (raw.length > 2_000_000) return;
    const body = JSON.parse(raw);
    const values = Array.isArray(body) ? body : Array.isArray(body.items) ? body.items : [body];
    const cache = await caches.open(FORMULAS);
    for (const value of values.slice(0, 100)) {
      const safe = publicFormula(value);
      if (!safe) continue;
      const key = new URL(FORMULA_KEY + safe.slug + '.json', self.location.origin).href;
      const old = await cache.match(key);
      // A list refresh must not erase an already visited detail's explanation.
      if (old && !safe.explanation) continue;
      await cache.delete(key);
      await cache.put(key, new Response(JSON.stringify(safe), { headers: { 'Content-Type': 'application/json' } }));
    }
    await trim(cache, MAX_FORMULAS);
  } catch { /* quota, malformed payload and privacy mode cannot break online use */ }
}
async function remember(request, response) {
  try {
    const cache = await caches.open(CACHE);
    await cache.put(request, response);
    await trim(cache, MAX_ASSETS, [OFFLINE, '/offline.html']);
  } catch { /* best-effort public asset caching */ }
}
self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET') return;
  if (isFormulaCatalog(url)) {
    // Keep authentication/error/status semantics online. The offline reader uses
    // only the public projection, never replays a prior authenticated response.
    const network = fetch(request);
    event.waitUntil(network.then(response => saveFormulas(response.clone())).catch(() => {}));
    event.respondWith(network);
    return;
  }
  if (url.origin !== self.location.origin || url.pathname === '/api' || url.pathname.startsWith('/api/')) return;
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(async () => (await caches.match(OFFLINE, { cacheName: CACHE })) || (await caches.match('/offline.html', { cacheName: CACHE })) || new Response('Холболт алга', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } })));
    return;
  }
  if (!isPublicAsset(url)) return;
  event.respondWith((async () => {
    const cached = await caches.match(request, { cacheName: CACHE });
    if (cached) return cached;
    const response = await fetch(request);
    if (response.ok && response.type === 'basic' && !response.redirected) event.waitUntil(remember(request, response.clone()));
    return response;
  })());
});
