// Včelí deník – offline provoz. Při změně aplikace zvyšte číslo verze.
const CACHE = "vceli-denik-v21";
const FILES = ["./", "./index.html", "./manifest.webmanifest", "./apple-touch-icon.png", "./icon-192.png", "./icon-512.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;
  const fonts = /fonts\.(googleapis|gstatic)\.com$/.test(url.hostname);
  const cdn = url.hostname === "cdn.jsdelivr.net" || url.hostname === "cdnjs.cloudflare.com";
  // data ze serveru (synchronizace) nikdy necachovat
  if (!sameOrigin && !fonts && !cdn) return;
  // stránka: nejdřív internet (ať se projeví nová verze), bez internetu uložená kopie
  if (req.mode === "navigate") {
    e.respondWith(
      fetch(req).then(res => { const cp = res.clone(); caches.open(CACHE).then(c => c.put("./index.html", cp)); return res; })
        .catch(() => caches.match("./index.html"))
    );
    return;
  }
  // ostatní soubory aplikace, knihovny a písmo: nejdřív uložená kopie
  e.respondWith(
    caches.match(req).then(hit => hit || fetch(req).then(res => {
      if (res.ok || res.type === "opaque") { const cp = res.clone(); caches.open(CACHE).then(c => c.put(req, cp)); }
      return res;
    }))
  );
});
