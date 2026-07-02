/* SwingForge service worker — v1
   Strategy: network-first for the app shell (always fresh when online),
   cache fallback so it launches offline at the range. */
const VERSION = "sf-v1";
const SHELL = ["./", "./index.html", "./manifest.json",
               "./apple-touch-icon.png", "./icon-192.png", "./icon-512.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))
  ).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET") return;
  if (url.origin === location.origin) {
    // network-first, cache fallback for our own files
    e.respondWith(
      fetch(e.request).then(res => {
        const copy = res.clone();
        caches.open(VERSION).then(c => c.put(e.request, copy));
        return res;
      }).catch(() => caches.match(e.request, {ignoreSearch:true})
        .then(m => m || caches.match("./index.html")))
    );
  } else {
    // cross-origin (fonts): cache-first so offline launches don't hang
    e.respondWith(
      caches.match(e.request).then(m => m || fetch(e.request).then(res => {
        const copy = res.clone();
        caches.open(VERSION).then(c => c.put(e.request, copy));
        return res;
      }).catch(() => new Response("", {status: 200}))));
  }
});
