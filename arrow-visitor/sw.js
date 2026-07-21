/*
 * Arrow Pipes Visitor Management - Service Worker
 *
 * Strategy: network-first with cache fallback
 *   - Every request tries the network first (so Vercel deploys go live immediately)
 *   - If network fails, serves from cache
 *   - HTML shell always freshest when online
 *
 * Bump VERSION to force cache refresh after any breaking change.
 */

const VERSION = 'v1.0.0';
const CACHE_NAME = `arrow-pipes-${VERSION}`;

// Files worth pre-caching so the app opens even with zero connectivity
const SHELL_ASSETS = [
  '/',
  '/index.html',
  '/logo.png',
  '/icon-192.png',
  '/icon-512.png',
  '/apple-touch-icon.png',
  '/manifest.json'
];

/**
 * Install: pre-cache the shell files.
 */
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      // addAll can fail if any single file 404s — use individual adds so one bad
      // asset doesn't tank the whole install.
      return Promise.all(
        SHELL_ASSETS.map(url =>
          cache.add(url).catch(err => console.warn('[SW] Failed to cache', url, err))
        )
      );
    })
  );
  self.skipWaiting();
});

/**
 * Activate: clean up old caches from previous versions.
 */
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

/**
 * Fetch: network-first, cache fallback.
 * Never cache calls to n8n webhooks — they must always hit the live server.
 */
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Never intercept API calls: check-ins must be real-time
  if (url.hostname.includes('n8n.arrowpipes.site') ||
      url.pathname.includes('/webhook/')) {
    return; // let it go straight to the network
  }

  // Only handle GET requests — POST is for check-ins etc.
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then(response => {
        // Only cache successful, same-origin responses
        if (response && response.status === 200 && response.type === 'basic') {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        // Network failed — try cache
        return caches.match(event.request).then(cached => {
          if (cached) return cached;
          // Cache miss too — for navigation requests, fall back to the shell
          if (event.request.mode === 'navigate') {
            return caches.match('/index.html');
          }
        });
      })
  );
});
