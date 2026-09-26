/* Only public build assets. Increment this namespace when cache policy changes. */
const CACHE_PREFIX = 'pi-public-static-';
const CACHE = CACHE_PREFIX + 'v1';
const OFFLINE = '/offline.html';
const MAX_ASSETS = 100;
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.add(OFFLINE)));
  // Do not skipWaiting: an active exam must not switch workers mid-session.
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE).map(key => caches.delete(key)))));
});
function isPublicAsset(url) {
  return /^\/_next\/static\/.+\.(?:js|css|woff2?|ttf|otf)$/.test(url.pathname) ||
    /^\/pwa-icons\/(?:192|512|maskable)$/.test(url.pathname) ||
    ['/favicon.ico','/apple-icon','/logo-mark.png'].includes(url.pathname);
}
async function remember(request, response) {
  try {
    const cache = await caches.open(CACHE);
    await cache.put(request, response);
    const keys = await cache.keys();
    const assets = keys.filter(key => new URL(key.url).pathname !== OFFLINE);
    await Promise.all(assets.slice(0, Math.max(0, assets.length - MAX_ASSETS)).map(key => cache.delete(key)));
  } catch { /* Storage quota/privacy mode cannot break navigation. */ }
}
self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;
  // API, RSC data and all non-allowlisted resources always use the network.
  if (url.pathname === '/api' || url.pathname.startsWith('/api/')) return;
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(async () => (await caches.match(OFFLINE)) || new Response('Холболт алга', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } })));
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
