/* Офлайн-кэш листа Эннио. Обновил файлы — поменяй номер версии. */
const CACHE = "ennio-sheet-v1";
const CORE = ["./","index.html","app.js","data.js","style.css","manifest.webmanifest","icon-192.png","icon-512.png","icon-maskable-512.png","apple-touch-icon.png","img/portrait.webp","img/face.webp","fonts/alegreya-cyrillic-400-italic.woff2","fonts/alegreya-cyrillic-400-normal.woff2","fonts/alegreya-cyrillic-700-normal.woff2","fonts/alegreya-latin-400-italic.woff2","fonts/alegreya-latin-400-normal.woff2","fonts/alegreya-latin-700-normal.woff2","fonts/alegreya-sc-cyrillic-500-normal.woff2","fonts/alegreya-sc-cyrillic-800-normal.woff2","fonts/alegreya-sc-latin-500-normal.woff2","fonts/alegreya-sc-latin-800-normal.woff2","fonts/caveat-cyrillic-600-normal.woff2","fonts/caveat-latin-600-normal.woff2","fonts/oranienbaum-cyrillic-400-normal.woff2","fonts/oranienbaum-latin-400-normal.woff2"];
self.addEventListener("install", e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting())); });
/* чистим только свои старые кэши — листы других героев на том же сайте не трогаем */
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.indexOf("ennio-sheet-")===0 && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", e => {
  const req = e.request; if (req.method !== "GET") return;
  const url = new URL(req.url); if (url.origin !== location.origin) return;
  if (!url.pathname.startsWith(new URL(self.registration.scope).pathname)) return;
  if (url.pathname.includes("/fonts/") || url.pathname.includes("/img/")) { e.respondWith(caches.match(req).then(r => r || fetch(req))); return; }
  /* сеть первой, чтобы обновления доходили; без сети — из кэша */
  e.respondWith(fetch(req).then(r => { if (r.ok) { const cp = r.clone(); caches.open(CACHE).then(c => c.put(req, cp)); } return r; })
    .catch(() => caches.match(req, {ignoreSearch:true}).then(r => r || caches.match("index.html"))));
});
