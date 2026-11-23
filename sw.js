/* OKENA — service worker: funciona offline após a primeira visita. */
const CACHE = 'okena-v1.6.1';
const CORE = [
  './', './index.html', './manifest.webmanifest',
  './assets/logo.svg', './assets/logo-mark.svg', './assets/logo-wordmark.svg', './assets/favicon.svg',
  './assets/favicon-32.png', './assets/apple-touch-icon.png', './assets/icon-192.png', './assets/icon-512.png',
  './assets/icon-maskable-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // App (HTML, manifest, ícones): SEMPRE da rede, ignorando o cache HTTP — fechar e abrir já traz a versão nova.
  // O cache só é usado quando não há internet.
  if (req.mode === 'navigate' || url.origin === location.origin) {
    const key = req.mode === 'navigate' ? './index.html' : req;
    e.respondWith(
      fetch(req.mode === 'navigate' ? req.url : req, { cache: 'no-store' })
        .then((res) => { if (res && res.ok) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(key, copy)); } return res; })
        .catch(() => caches.match(key).then((hit) => hit || caches.match('./index.html')))
    );
    return;
  }
  // Bibliotecas externas (Tailwind e Google Fonts): cache primeiro, atualiza em segundo plano
  const CDN = ['cdn.tailwindcss.com', 'fonts.googleapis.com', 'fonts.gstatic.com'];
  if (CDN.includes(url.hostname)) {
    e.respondWith(
      caches.match(req).then((hit) => {
        const net = fetch(req).then((res) => {
          if (res && (res.ok || res.type === 'opaque')) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
          return res;
        }).catch(() => hit);
        return hit || net;
      })
    );
  }
});
