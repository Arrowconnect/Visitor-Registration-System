/*
 * Arrow Pipes Visitor Management - Service Worker
 *
 * Strategy: network-first with cache fallback
 *   - Every request tries the network first (so Vercel deploys go live immediately)
 *   - If network fails, serves from cache
 *   - HTML shell always freshest when online
 *
 * VERSION bump forces old caches to be discarded and index.html to be re-fetched.
 * Bump this whenever a hotfix must invalidate stale caches (e.g. API key rotation).
 */

const VERSION = 'v1.0.1';
const CACHE_NAME = `arrow-pipes-${VERSION}`;

const SHELL_ASSETS = [
  '/',
  '/index.html',
  '/logo.png',
  '/icon-192.png',
  '/icon-512.png',
  '/apple-touch-icon.png',
  '/manifest.json'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return Promise.all(
        SHELL_ASSETS.map(url =>
          cache.add(url).catch(err => console.warn('[SW] Failed to cache', url, err))
        )
      );
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys
          .filter(key => key.startsWith('arrow-pipes-') && key !== CACHE_NAME)
          .map(key => {
            console.log('[SW] Deleting old cache:', key);
            return caches.delete(key);
          })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Never intercept API calls: check-ins must be real-time
  if (url.hostname.includes('n8n.arrowpipes.site') ||
      url.pathname.includes('/webhook/')) {
    return;
  }

  if (event.request.method !== 'GET') {
    return;
  }

  // For HTML/root navigation, always try network first without falling back to cache
  // for stale copies unless truly offline. This ensures API-key hotfixes propagate.
  const isNavigation = event.request.mode === 'navigate' ||
                       event.request.destination === 'document';

  event.respondWith(
    fetch(event.request)
      .then(response => {
        if (response && response.status === 200 && response.type === 'basic') {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        return caches.match(event.request).then(cached => {
          if (cached) return cached;
          if (isNavigation) {
            return caches.match('/index.html');
          }
        });
      })
  );
});
