
const CACHE_NAME = 'wisdom-spin-store-v1';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './index.tsx',
  'https://cdn.tailwindcss.com',
  'https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&family=Tajawal:wght@300;400;500;700;800&display=swap',
  'https://assets.mixkit.co/active_storage/sfx/2013/2013-preview.mp3',
  'https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3',
  'https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3',
  'https://cdn-icons-png.flaticon.com/512/2643/2643506.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.url.includes('generativelanguage.googleapis.com')) return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      const networked = fetch(event.request).then((res) => {
        if (res && res.status === 200) {
          const cacheCopy = res.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, cacheCopy);
          });
        }
        return res;
      }).catch(() => {
        if (event.request.mode === 'navigate') return caches.match('./index.html');
      });

      return cached || networked;
    })
  );
});
