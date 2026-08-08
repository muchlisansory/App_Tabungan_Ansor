// Service Worker sederhana — hanya meng-cache "app shell" (tampilan),
// BUKAN data transaksi/saldo (supaya data selalu terbaru dari server).

const CACHE_NAME = 'tabungan-ansor-shell-v1';
const SHELL_FILES = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png',
  './favicon-32.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_FILES))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Hanya tangani request GET untuk file shell milik kita sendiri.
  // Request ke Apps Script (POST /exec, data transaksi) dibiarkan lewat
  // langsung ke jaringan, tidak di-cache, supaya data selalu real-time.
  const url = new URL(req.url);
  const isSameOrigin = url.origin === self.location.origin;
  const isShellFile = SHELL_FILES.some((f) => url.pathname.endsWith(f.replace('./', '')));

  if (req.method === 'GET' && isSameOrigin && isShellFile) {
    event.respondWith(
      caches.match(req).then((cached) => {
        const network = fetch(req)
          .then((res) => {
            caches.open(CACHE_NAME).then((cache) => cache.put(req, res.clone()));
            return res;
          })
          .catch(() => cached);
        return cached || network;
      })
    );
  }
  // selain itu: biarkan browser menangani seperti biasa (network langsung)
});
