const CACHE = "content-shell-v8";
const ASSETS = [
  "./",
  "./index.html",
  "./style.css?v=8",
  "./legacy.js?v=8",
  "./catalog.js?v=8",
  "./growth.js?v=8",
  "./hashtags.js?v=8",
  "./strategy.js?v=8",
  "./app.js?v=8",
  "./player.js?v=8",
  "./player.css?v=8",
  "./manifest.webmanifest",
  "../icons/ritm-192.png",
  "../icons/ritm-512.png",
];
self.addEventListener("install", (e) =>
  e.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.addAll(ASSETS))
      .then(() => self.skipWaiting()),
  ),
);
self.addEventListener("activate", (e) =>
  e.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k.startsWith("content-shell-") && k !== CACHE)
            .map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  ),
);
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (
    e.request.method !== "GET" ||
    url.origin !== location.origin ||
    (!url.pathname.startsWith(new URL("./", location).pathname) &&
      !ASSETS.some((p) => new URL(p, location).pathname === url.pathname))
  )
    return;
  e.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      try {
        const response = await fetch(e.request);
        if (response.ok) await cache.put(e.request, response.clone());
        return response;
      } catch {
        const cached = await cache.match(e.request);
        if (cached) return cached;
        if (e.request.mode === "navigate") return cache.match("./index.html");
        return Response.error();
      }
    })(),
  );
});
