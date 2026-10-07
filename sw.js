// Offline katmanı: internet varsa her zaman en yeni dosyayı getir (ve önbelleğe yaz),
// internet yoksa ya da çok yavaşsa önbellekten aç.
const VERSION = 'repertuar-v5';
const ASSETS = ['./', 'index.html', 'style.css', 'app.js', 'chords.js', 'songs.js', 'sarkilar.enc.json', 'manifest.webmanifest',
  'icons/icon.svg', 'icons/icon-180.png', 'icons/icon-192.png', 'icons/icon-512.png'];
const TIMEOUT = 3000;

self.addEventListener('install', e => {
  // cache: 'reload' -> tarayıcının HTTP önbelleğini atla, sunucudaki güncel hali al
  e.waitUntil(caches.open(VERSION)
    .then(c => c.addAll(ASSETS.map(u => new Request(u, { cache: 'reload' }))))
    .then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(caches.open(VERSION).then(async cache => {
    const fromCache = () => cache.match(req, { ignoreSearch: true })
      .then(r => r || (req.mode === 'navigate' ? cache.match('index.html') : undefined));
    const net = fetch(req, { cache: 'no-cache' }).then(res => {
      if (res.ok) cache.put(req, res.clone());
      return res;
    });
    const timeout = new Promise(r => setTimeout(r, TIMEOUT));
    try {
      const res = await Promise.race([net, timeout]);
      if (res) return res;
      e.waitUntil(net.catch(() => { })); // yavaş bağlantı: önbellekten aç, arkada güncelle
      return (await fromCache()) || net;
    } catch {
      return (await fromCache()) || Response.error();
    }
  }));
});
