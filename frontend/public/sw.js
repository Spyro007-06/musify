const CACHE_NAME = 'musify-shell-v2';
const APP_SHELL = ['/home', '/manifest.webmanifest', '/icons/icon-192.png', '/icons/icon-512.png'];
const NETWORK_WAIT_MS = 4000;

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      // Only this worker's own old caches: songs saved in the app (musify-offline-*) must survive updates.
      Promise.all(keys.filter((key) => key.startsWith('musify-shell-') && key !== CACHE_NAME).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

// ponytail: hand-rolled network-first-with-cache-fallback, no workbox — songs
// saved in the app live in their own cache (stores/offline-store.ts); this keeps the shell + last
// pages reachable when the network drops. Upgrade to workbox if offline
// playback/precaching strategies grow more elaborate than this.
self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  // Never intercept API calls or audio/image streams — they need to stay
  // live and Saavn's CDN responses are far too large to cache wholesale.
  if (url.pathname.startsWith('/api/') || url.origin !== self.location.origin) return;

  const network = fetch(request).then((response) => {
    // Only good responses are kept: a cached error page would be what shows offline.
    if (response.ok) {
      const copy = response.clone();
      caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
    }
    return response;
  });
  // On a very slow connection, don't leave the app blank: after a few
  // seconds use the saved copy if there is one (the network reply still
  // refreshes it), otherwise keep waiting.
  const savedAfterWait = new Promise((resolve) => setTimeout(resolve, NETWORK_WAIT_MS)).then(() => caches.match(request));

  event.respondWith(
    Promise.race([network, savedAfterWait])
      .then((response) => response || network)
      .catch(() => caches.match(request).then((cached) => cached || caches.match('/home')))
  );
});
