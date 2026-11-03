// Only public branding and the connection fallback are cached.
// Authenticated pages, API responses and Server Actions always use the network.
const CACHE_NAME = 'dimsum-waled-public-v2.0.0';
const PUBLIC_ASSETS = ['/offline.html', '/logo.svg', '/assets/icons/waled-180.png', '/assets/icons/waled-192.png', '/assets/icons/waled-512.png'];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PUBLIC_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(key => key.startsWith('dimsum-waled-public-') && key !== CACHE_NAME).map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;
  if (url.pathname === '/api' || url.pathname.startsWith('/api/')) return;

  if (PUBLIC_ASSETS.includes(url.pathname)) {
    event.respondWith(
      caches.open(CACHE_NAME)
        .then(cache => cache.match(url.pathname))
        .then(cached => cached || fetch(request))
    );
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() =>
        caches.open(CACHE_NAME)
          .then(cache => cache.match('/offline.html'))
          .then(cached => cached || new Response('Aplikasi sedang offline.', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } }))
      )
    );
  }
});
