/*
 * Service worker: păstrează o copie a aplicației în telefon, ca să meargă fără internet.
 * Când ai internet, descarcă în fundal versiunea nouă; o vezi la următoarea deschidere.
 */
const CACHE = 'gym-tracker-v1';
const FILES = [
  './', 'index.html', 'manifest.webmanifest', 'css/style.css',
  'js/store.js', 'js/ui.js', 'js/chart.js', 'js/app.js',
  'js/pages/home.js', 'js/pages/exercises.js', 'js/pages/templates.js',
  'js/pages/workout.js', 'js/pages/history.js', 'js/pages/backup.js',
  'icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png', 'icons/icon-180.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const cached = await cache.match(req, { ignoreSearch: true });
      const fresh = fetch(req)
        .then((res) => { if (res.ok) cache.put(req, res.clone()); return res; })
        .catch(() => null);
      if (cached) { e.waitUntil(fresh); return cached; }
      return (await fresh) || (req.mode === 'navigate' ? cache.match('index.html') : Response.error());
    }),
  );
});
