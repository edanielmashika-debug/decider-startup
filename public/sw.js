// Decider service worker (Step 10). Plain JavaScript on purpose: it lives in /public
// and is served as is. It makes the app open even with no signal.
//
// Rules:
// - Pages (navigation): network first, so you always get the newest version when online.
//   The last good copy is kept and used when you are offline.
// - Files under /_next/static/: these have a hash in their name and never change, so
//   they are cached and served from the cache first.
// - Everything else (other sites, future /api calls): not touched.
// Bump VERSION to throw all old copies away.
const VERSION = "decider-v1";
const PAGES = VERSION + "-pages";
const STATIC = VERSION + "-static";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (req.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(req);
          if (fresh.ok) {
            const cache = await caches.open(PAGES);
            cache.put("/", fresh.clone());
          }
          return fresh;
        } catch {
          const cached = await caches.match("/");
          return cached || new Response("Offline", { status: 503, statusText: "Offline" });
        }
      })(),
    );
    return;
  }

  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/")) {
    event.respondWith(
      (async () => {
        const cached = await caches.match(req);
        if (cached) return cached;
        const fresh = await fetch(req);
        if (fresh.ok) {
          const cache = await caches.open(STATIC);
          cache.put(req, fresh.clone());
        }
        return fresh;
      })(),
    );
  }
});

// Tapping a reminder notification (Step 10b): bring the app to the front, or open it.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    (async () => {
      const all = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const c of all) {
        if ("focus" in c) return c.focus();
      }
      return self.clients.openWindow("/");
    })(),
  );
});