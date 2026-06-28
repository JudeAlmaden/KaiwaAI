"use client";

import { useEffect } from "react";

type SWContainer = Pick<
  ServiceWorkerContainer,
  "register" | "getRegistrations"
>;

type CacheKeys = Pick<CacheStorage, "keys" | "delete">;

/**
 * Decides what to do with the service worker for a given environment.
 *
 * - Production: register `/sw.js`.
 * - Development: unregister any existing worker and purge its caches. The SW's
 *   cache-first strategy for `/_next/static/` otherwise serves stale dev
 *   bundles, causing client/server hydration mismatches after a rebuild.
 */
export async function syncServiceWorker(opts: {
  isProduction: boolean;
  container: SWContainer;
  caches?: CacheKeys;
}): Promise<void> {
  const { isProduction, container, caches } = opts;

  if (isProduction) {
    await container.register("/sw.js").catch(() => undefined);
    return;
  }

  await container
    .getRegistrations()
    .then((regs) => Promise.all(regs.map((r) => r.unregister())))
    .catch(() => undefined);

  if (caches) {
    await caches
      .keys()
      .then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
      .catch(() => undefined);
  }
}

/** Registers the service worker in production; tears it down in development. */
export default function ServiceWorker() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    const isProduction = process.env.NODE_ENV === "production";
    const run = () =>
      void syncServiceWorker({
        isProduction,
        container: navigator.serviceWorker,
        caches: "caches" in window ? window.caches : undefined,
      });

    // In dev we want to tear down immediately; in prod wait for load so we
    // don't contend with initial page resources.
    if (!isProduction) {
      run();
      return;
    }
    if (document.readyState === "complete") run();
    else window.addEventListener("load", run);
    return () => window.removeEventListener("load", run);
  }, []);

  return null;
}
