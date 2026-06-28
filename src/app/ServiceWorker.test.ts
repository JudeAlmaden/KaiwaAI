import { describe, expect, it, vi } from "vitest";
import { syncServiceWorker } from "./ServiceWorker";

function makeContainer() {
  return {
    register: vi.fn().mockResolvedValue({}),
    getRegistrations: vi.fn().mockResolvedValue([]),
  };
}

describe("syncServiceWorker", () => {
  it("registers /sw.js in production", async () => {
    const container = makeContainer();

    await syncServiceWorker({ isProduction: true, container });

    expect(container.register).toHaveBeenCalledWith("/sw.js");
    expect(container.getRegistrations).not.toHaveBeenCalled();
  });

  it("unregisters existing workers in development", async () => {
    const unregister = vi.fn().mockResolvedValue(true);
    const container = makeContainer();
    container.getRegistrations.mockResolvedValue([{ unregister }, { unregister }]);

    await syncServiceWorker({ isProduction: false, container });

    expect(container.register).not.toHaveBeenCalled();
    expect(unregister).toHaveBeenCalledTimes(2);
  });

  it("purges caches in development when a cache store is available", async () => {
    const container = makeContainer();
    const caches = {
      keys: vi.fn().mockResolvedValue(["kaiwa-shell-v1", "other"]),
      delete: vi.fn().mockResolvedValue(true),
    };

    await syncServiceWorker({ isProduction: false, container, caches });

    expect(caches.delete).toHaveBeenCalledWith("kaiwa-shell-v1");
    expect(caches.delete).toHaveBeenCalledWith("other");
  });

  it("does not throw if registration fails in production", async () => {
    const container = makeContainer();
    container.register.mockRejectedValue(new Error("boom"));

    await expect(
      syncServiceWorker({ isProduction: true, container }),
    ).resolves.toBeUndefined();
  });

  it("does not throw if getRegistrations fails in development", async () => {
    const container = makeContainer();
    container.getRegistrations.mockRejectedValue(new Error("boom"));

    await expect(
      syncServiceWorker({ isProduction: false, container }),
    ).resolves.toBeUndefined();
  });
});
