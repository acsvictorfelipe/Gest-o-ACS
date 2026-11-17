const CACHE_NAME = 'gestao-acs-v12';
const FONTS_CACHE_NAME = 'gestao-acs-fonts-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/icon-512.png',
  '/icon-192.png',
  '/maskable-icon-512.png',
  '/apple-touch-icon.png'
];

// List of URL patterns that MUST NEVER be cached in CacheStorage for security and freshness
const NEVER_CACHE_PATTERNS = [
  '/api/',
  'supabase.co',
  '/auth/',
  '/rest/v1/',
  'token',
  'login',
  'logout'
];

// Install Event
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      console.log('[Service Worker] Pre-caching offline static shell');
      await Promise.allSettled(
        ASSETS_TO_CACHE.map((url) =>
          cache.add(url).catch((err) => console.warn('[Service Worker] Aviso ao salvar no cache:', url, err))
        )
      );
    }).then(() => self.skipWaiting())
  );
});

// Activate Event
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME && cache !== FONTS_CACHE_NAME) {
            console.log('[Service Worker] Clearing old cache version:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event (Network-First falling back to cache for static assets)
self.addEventListener('fetch', (event) => {
  const url = event.request.url;

  // Cache-First para fontes do Google Fonts (googleapis e gstatic)
  if (url.includes('fonts.googleapis.com') || url.includes('fonts.gstatic.com')) {
    event.respondWith(
      caches.open(FONTS_CACHE_NAME).then((cache) => {
        return cache.match(event.request).then((cached) => {
          if (cached) return cached;
          return fetch(event.request).then((response) => {
            if (response && response.status === 200) {
              cache.put(event.request, response.clone());
            }
            return response;
          }).catch(() => cached || new Response('', { status: 503 }));
        });
      })
    );
    return;
  }

  // Only handle local GET requests
  if (event.request.method !== 'GET' || !event.request.url.startsWith(self.location.origin)) {
    return;
  }

  // Bypass service worker completely for API, database, or authentication routes
  if (NEVER_CACHE_PATTERNS.some(pattern => url.includes(pattern))) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cache valid static responses (JS, CSS, images, shell)
        if (response && response.status === 200 && response.type === 'basic') {
          const contentType = response.headers.get('content-type') || '';
          // If a JS/CSS chunk request returns an HTML 404 fallback page, do NOT cache it and fail fast
          if (url.includes('/assets/') && contentType.includes('text/html')) {
            return new Response('Chunk no longer exists on server due to a new deployment.', {
              status: 404,
              statusText: 'Not Found',
              headers: { 'Content-Type': 'text/plain' }
            });
          }
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      })
      .catch(() => {
        // Offline: Fallback to Cache Storage
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // Navigation fallback to index.html for SPA routes
          if (event.request.mode === 'navigate') {
            return caches.match('/').then((appShell) => {
              if (appShell) return appShell;
              return caches.match('/index.html').then((indexShell) => {
                return indexShell || new Response('Offline - recarregue a página quando houver conexão.', {
                  status: 503,
                  statusText: 'Service Unavailable',
                  headers: { 'Content-Type': 'text/plain; charset=utf-8' }
                });
              });
            });
          }
          return new Response('Recurso não disponível offline.', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: { 'Content-Type': 'text/plain; charset=utf-8' }
          });
        });
      })
  );
});
