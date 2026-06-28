// KaiwaAI service worker.
// Phase: PWA shell (offline-friendly navigation + static caching).
// Push handling will be added in a later phase.

// NOTE: bumping this version invalidates all previously cached entries on
// `activate` (see below). Bump it whenever the caching strategy changes so
// stuck clients self-heal on their next navigation.
const CACHE = "kaiwa-shell-v2";
const SHELL = ["/chat", "/offline"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(SHELL)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  // Never cache API calls — always hit the network.
  if (url.pathname.startsWith("/api/")) return;

  // Build artifacts: network-first. In dev, chunk URLs are reused with new
  // content across rebuilds, so cache-first here serves a stale client bundle
  // and breaks hydration. Network-first keeps clients on fresh JS and only
  // falls back to cache when offline. (Prod filenames are content-hashed, so
  // this is still served instantly from the browser's HTTP cache.)
  if (url.pathname.startsWith("/_next/")) {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(request, copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // Navigations: network-first, fall back to cache, then the offline page.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(request, copy)).catch(() => {});
          return res;
        })
        .catch(() =>
          caches.match(request).then((r) => r || caches.match("/offline"))
        )
    );
    return;
  }

  // Stable static assets: cache-first, then network.
  if (
    url.pathname.startsWith("/icons/") ||
    url.pathname.startsWith("/audio/") ||
    url.pathname.startsWith("/images/")
  ) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((res) => {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(request, copy)).catch(() => {});
            return res;
          })
      )
    );
  }
});
