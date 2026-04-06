/**
 * sw.js — Service Worker de FinTrack PWA
 *
 * Estrategias de caché implementadas:
 *  - App Shell  → Cache First (recursos estáticos críticos)
 *  - Fonts/CDN  → Stale While Revalidate
 *  - API / datos → Network First con fallback offline
 *
 * Métodos implementados: install, activate, fetch
 */

'use strict';

const CACHE_VERSION  = 'v1.2.0';
const SHELL_CACHE    = `fintrack-shell-${CACHE_VERSION}`;
const DYNAMIC_CACHE  = `fintrack-dynamic-${CACHE_VERSION}`;
const FONT_CACHE     = `fintrack-fonts-${CACHE_VERSION}`;

/* ─── APP SHELL: archivos a cachear en install ── */
const APP_SHELL_FILES = [
  '/',
  '/index.html',
  '/css/styles.css',
  '/js/db.js',
  '/js/categories.js',
  '/js/charts.js',
  '/js/ui.js',
  '/js/app.js',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/offline.html',
];

/* ─── CDN: recursos externos a cachear ─────────── */
const CDN_RESOURCES = [
  'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js',
];

/* ─── FONT HOSTS ─────────────────────────────── */
const FONT_HOSTS = [
  'fonts.googleapis.com',
  'fonts.gstatic.com',
];


self.addEventListener('install', (event) => {
  console.log(`[SW] Install — ${CACHE_VERSION}`);

  event.waitUntil(
    (async () => {
      try {

        const shellCache = await caches.open(SHELL_CACHE);

        await Promise.allSettled(
          APP_SHELL_FILES.map(url =>
            shellCache.add(url).catch(err =>
              console.warn(`[SW] No se pudo cachear ${url}:`, err.message)
            )
          )
        );

        const dynCache = await caches.open(DYNAMIC_CACHE);
        await Promise.allSettled(
          CDN_RESOURCES.map(url =>
            fetch(url, { mode: 'cors' })
              .then(res => {
                if (res.ok) return dynCache.put(url, res);
              })
              .catch(err => console.warn(`[SW] CDN no disponible ${url}:`, err.message))
          )
        );

        console.log('[SW] App Shell cacheado correctamente.');
      } catch (err) {
        console.error('[SW] Error durante install:', err);
      }


      await self.skipWaiting();
    })()
  );
});

/* ═══════════════════════════════════════════════
   EVENTO: ACTIVATE
   Elimina cachés obsoletos de versiones anteriores.
   Reclama todos los clientes abiertos.
═══════════════════════════════════════════════ */
self.addEventListener('activate', (event) => {
  console.log(`[SW] Activate — ${CACHE_VERSION}`);

  event.waitUntil(
    (async () => {
      try {
        const validCaches = [SHELL_CACHE, DYNAMIC_CACHE, FONT_CACHE];
        const allKeys     = await caches.keys();

        await Promise.all(
          allKeys
            .filter(key => !validCaches.includes(key))
            .map(key => {
              console.log(`[SW] Eliminando caché obsoleto: ${key}`);
              return caches.delete(key);
            })
        );
      } catch (err) {
        console.error('[SW] Error limpiando cachés:', err);
      }

      await self.clients.claim();
      console.log('[SW] Activado y controlando todos los clientes.');
    })()
  );
});

/* ═══════════════════════════════════════════════
   EVENTO: FETCH
   Estrategias de caché por tipo de recurso.
═══════════════════════════════════════════════ */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET') return;

  if (FONT_HOSTS.some(h => url.hostname.includes(h))) {
    event.respondWith(staleWhileRevalidate(request, FONT_CACHE));
    return;
  }

  if (CDN_RESOURCES.includes(request.url) || url.hostname.includes('cdnjs.cloudflare.com')) {
    event.respondWith(cacheFirst(request, DYNAMIC_CACHE));
    return;
  }

  if (url.origin === self.location.origin) {

    if (request.headers.get('accept')?.includes('text/html')) {
      event.respondWith(networkFirstWithOfflineFallback(request));
      return;
    }

    event.respondWith(cacheFirst(request, SHELL_CACHE));
    return;
  }
});


async function cacheFirst(request, cacheName) {
  try {
    const cache    = await caches.open(cacheName);
    const cached   = await cache.match(request);
    if (cached) return cached;

    const response = await fetch(request);
    if (response.ok) {

      await cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    console.warn('[SW] cacheFirst falló, sin respuesta para:', request.url);
    return offlineFallback(request);
  }
}

async function networkFirstWithOfflineFallback(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(SHELL_CACHE);
      await cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    const cached = await caches.match(request);
    if (cached) return cached;
    return offlineFallback(request);
  }
}


async function staleWhileRevalidate(request, cacheName) {
  const cache    = await caches.open(cacheName);
  const cached   = await cache.match(request);

  const networkPromise = fetch(request)
    .then(res => {
      if (res.ok) cache.put(request, res.clone());
      return res;
    })
    .catch(() => null);

  return cached || await networkPromise || offlineFallback(request);
}


async function offlineFallback(request) {
  const accept = request.headers.get('accept') || '';
  if (accept.includes('text/html')) {
    const offlinePage = await caches.match('/offline.html');
    if (offlinePage) return offlinePage;
  }
  // Respuesta genérica offline
  return new Response(
    JSON.stringify({ error: 'Sin conexión', offline: true }),
    {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    }
  );
}

/* ═══════════════════════════════════════════════
   MENSAJE DESDE LA PÁGINA
═══════════════════════════════════════════════ */
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data?.type === 'GET_VERSION') {
    event.ports[0]?.postMessage({ version: CACHE_VERSION });
  }
});
