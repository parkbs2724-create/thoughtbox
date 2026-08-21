const CACHE_NAME = 'thoughtbox-v1';
const ASSETS = [
  '/thoughtbox/',
  '/thoughtbox/index.html',
  '/thoughtbox/css/style.css',
  '/thoughtbox/js/app.js',
  '/thoughtbox/js/utils.js',
  '/thoughtbox/js/storage.js',
  '/thoughtbox/js/gpt.js',
  '/thoughtbox/js/mindmap.js',
  '/thoughtbox/js/firebase-init.js',
  '/thoughtbox/icons/icon-192.svg',
  '/thoughtbox/icons/icon-512.svg'
];

// Install: cache core assets
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch: network first, fallback to cache
self.addEventListener('fetch', (e) => {
  // Skip non-GET and external API requests
  if (e.request.method !== 'GET') return;
  if (e.request.url.includes('api.openai.com')) return;
  if (e.request.url.includes('googleapis.com')) return;
  if (e.request.url.includes('gstatic.com')) return;
  if (e.request.url.includes('firebaseapp.com')) return;

  e.respondWith(
    fetch(e.request)
      .then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(e.request, clone));
        return response;
      })
      .catch(() => caches.match(e.request))
  );
});
