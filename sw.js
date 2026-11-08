/* Service Worker — BITÁCORA PWA
   App shell cache-first; red siempre para Supabase (datos en la nube). */
const CACHE = 'bitacora-v1';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icon.webp'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;                 // POST a Supabase: no tocar
  const url = new URL(req.url);
  if (url.hostname.endsWith('supabase.co')) return; // datos: siempre a la red

  // App shell / mismo origen: cache primero, cae a red y guarda copia.
  if (url.origin === self.location.origin) {
    e.respondWith(
      caches.match(req).then(hit => hit || fetch(req).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
        return res;
      }).catch(() => caches.match('./index.html')))
    );
    return;
  }

  // CDNs (React, ExcelJS, fuentes): red primero, cae a caché si no hay conexión.
  e.respondWith(
    fetch(req).then(res => {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
      return res;
    }).catch(() => caches.match(req))
  );
});
