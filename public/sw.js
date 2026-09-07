const CACHE_NAME = "lms-static-v2";
const PUBLIC_ASSETS = new Set(["/manifest.json", "/pwa-icon-512.png", "/favicon.ico"]);
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter(name => name.startsWith("lms-") && name !== CACHE_NAME).map(name => caches.delete(name)));
    await self.clients.claim();
  })());
});
self.addEventListener("fetch", event => {
  const request = event.request;
  const url = new URL(request.url);
  // Never intercept documents, RSC, auth, APIs, course content, or third-party requests.
  if (request.method !== "GET" || url.origin !== self.location.origin ||
      request.mode === "navigate" || request.headers.get("rsc") || url.search ||
      !(url.pathname.startsWith("/_next/static/") || PUBLIC_ASSETS.has(url.pathname))) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request);
    if (cached) return cached;
    const response = await fetch(request);
    if (response.ok && !response.redirected && !/private|no-store/i.test(response.headers.get("cache-control") || "")) {
      await cache.put(request, response.clone());
    }
    return response;
  })());
});
