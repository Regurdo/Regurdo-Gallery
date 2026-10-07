/*
 * REGURDO service worker — hand-rolled, zero dependencies.
 *
 * Strategies:
 * - Navigations (HTML)  -> network-first, fall back to cache, then /offline.html.
 * - Immutable assets    -> cache-first (/_next/static/* is content-hashed).
 * - Images              -> stale-while-revalidate (Supabase Storage, next/image
 *                          optimizer, avatars), FIFO-trimmed to IMG_LIMIT.
 * - Everything else     -> network only (never cached).
 *
 * Bump CACHE_VERSION to invalidate every cache on deploy.
 */
const CACHE_VERSION = "v1";
const SHELL_CACHE = `regurdo-shell-${CACHE_VERSION}`;
const IMG_CACHE = `regurdo-img-${CACHE_VERSION}`;
const IMG_LIMIT = 300;

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL_CACHE);
      await cache.add("/offline.html");
      await self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => k !== SHELL_CACHE && k !== IMG_CACHE)
          .map((k) => caches.delete(k))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") return;
  if (request.headers.has("range")) return;

  const url = new URL(request.url);

  // Cross-origin: only cache images (Supabase Storage photos, Google avatars).
  if (url.origin !== self.location.origin) {
    if (request.destination === "image") {
      event.respondWith(staleWhileRevalidate(request, IMG_CACHE));
    }
    return;
  }

  // Navigations (HTML pages).
  if (request.mode === "navigate") {
    event.respondWith(networkFirstPage(request));
    return;
  }

  // Content-hashed build output + app icons: safe to cache forever.
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/")) {
    event.respondWith(cacheFirst(request, SHELL_CACHE));
    return;
  }

  // Same-origin images (next/image optimizer, OG images, logo).
  if (request.destination === "image") {
    event.respondWith(staleWhileRevalidate(request, IMG_CACHE));
  }
});

async function networkFirstPage(request) {
  const cache = await caches.open(SHELL_CACHE);
  try {
    const fresh = await fetch(request);
    // Never keep session-sensitive pages (/admin, /login, /auth) in the cache.
    const path = new URL(request.url).pathname;
    const cacheable =
      fresh.ok && !path.startsWith("/admin") && !path.startsWith("/login") && !path.startsWith("/auth");
    if (cacheable) cache.put(request, fresh.clone());
    return fresh;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    const offline = await cache.match("/offline.html");
    return offline || Response.error();
  }
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;
  const fresh = await fetch(request);
  if (fresh.ok) cache.put(request, fresh.clone());
  return fresh;
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const refresh = fetch(request)
    .then((fresh) => {
      if (fresh && (fresh.ok || fresh.type === "opaque")) {
        cache.put(request, fresh.clone()).then(() => trimCache(cacheName, IMG_LIMIT));
      }
      return fresh;
    })
    .catch(() => null);

  // Offline: return the cached copy; online: still prefer it for instant paint.
  if (cached) {
    refresh.catch(() => {});
    return cached;
  }
  const fresh = await refresh;
  return fresh || Response.error();
}

async function trimCache(cacheName, maxEntries) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  for (let i = 0; i < keys.length - maxEntries; i++) {
    await cache.delete(keys[i]);
  }
}
