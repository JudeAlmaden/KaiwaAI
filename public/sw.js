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

// Push Event Handler: Receive push messages sent by the server and display them
self.addEventListener("push", (event) => {
  if (!event.data) return;

  try {
    const data = event.data.json();
    const title = data.title || "KaiwaAI";
    const options = {
      body: data.body || "",
      icon: data.icon || "/icons/icon-192x192.png",
      badge: data.badge || "/icons/icon-192x192.png",
      data: {
        url: data.url || "/"
      }
    };

    event.waitUntil(
      self.registration.showNotification(title, options)
    );
  } catch (err) {
    console.error("Failed to parse or display push notification:", err);
  }
});

// Notification Click Handler: Open the relevant chat or app screen when tapped
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const urlToOpen = new URL(event.notification.data?.url || "/", self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      // If there's an open window matching the origin, navigate and focus it
      for (const client of windowClients) {
        if ("focus" in client) {
          // If already on the destination URL, just focus, otherwise navigate
          if (client.url === urlToOpen) {
            return client.focus();
          } else if (client.navigate) {
            client.navigate(urlToOpen);
            return client.focus();
          }
        }
      }
      // Otherwise, open a new window
      if (self.clients.openWindow) {
        return self.clients.openWindow(urlToOpen);
      }
    })
  );
});

