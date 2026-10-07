// Offline katmanı: her şeyi önbellekten anında aç, internet varsa arkada güncelle.
// Dosya listesini değiştirirsen VERSION'ı artır.
const VERSION = 'repertuar-v3';
const ASSETS = ['./', 'index.html', 'style.css', 'app.js', 'chords.js', 'songs.js', 'sarkilar.enc.json', 'manifest.webmanifest',
  'icons/icon.svg', 'icons/icon-180.png', 'icons/icon-192.png', 'icons/icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  // Şarkı dosyası: internet varsa hep en yenisi, yoksa önbellek
  if (req.url.includes('sarkilar.enc.json')) {
    e.respondWith(caches.open(VERSION).then(cache => fetch(req, { cache: 'no-store' })
      .then(res => { if (res.ok) cache.put(req, res.clone()); return res; })
      .catch(() => cache.match(req, { ignoreSearch: true }))));
    return;
  }
  e.respondWith(caches.open(VERSION).then(async cache => {
    const cached = await cache.match(req, { ignoreSearch: true })
      || (req.mode === 'navigate' ? await cache.match('index.html') : undefined);
    const fresh = fetch(req).then(res => {
      if (res.ok) cache.put(req, res.clone());
      return res;
    }).catch(() => cached);
    if (cached) { e.waitUntil(fresh); return cached; }
    return fresh;
  }));
});
