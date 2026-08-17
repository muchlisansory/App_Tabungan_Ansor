// Service Worker — meng-cache "app shell" (tampilan) untuk mempercepat buka
// aplikasi & tetap bisa dibuka saat offline, BUKAN untuk data transaksi/saldo
// (supaya data selalu real-time dari server).
//
// Strategi: NETWORK-FIRST untuk index.html — setiap dibuka, coba ambil versi
// TERBARU dulu dari server; fallback ke versi tersimpan hanya kalau HP sedang
// offline. Jadi update otomatis kepakai tanpa anggota perlu hapus cache manual.

const CACHE_NAME = 'tabungan-ansor-shell-v2';
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
  const url = new URL(req.url);
  const isSameOrigin = url.origin === self.location.origin;
  const isShellFile = SHELL_FILES.some((f) => url.pathname.endsWith(f.replace('./', '')));

  if (req.method !== 'GET' || !isSameOrigin || !isShellFile) {
    return;
  }

  const isHtml = url.pathname.endsWith('index.html') || url.pathname === '/' || url.pathname.endsWith('/');

  if (isHtml) {
    event.respondWith(
      fetch(req, { cache: 'no-store' })
        .then((res) => {
          caches.open(CACHE_NAME).then((cache) => cache.put(req, res.clone()));
          return res;
        })
        .catch(() => caches.match(req))
    );
    return;
  }

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
});
