import { afterEach, describe, expect, it, vi } from "vitest";
import { isAppBlockerSupported } from "./app-blocker-platform";

describe("isAppBlockerSupported", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("keeps Focus Guard hidden on a web production build", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_BLOCKER_DEBUG", "false");
    vi.stubEnv("NODE_ENV", "production");

    expect(isAppBlockerSupported()).toBe(false);
  });

  it("shows it when the debug flag is on", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_BLOCKER_DEBUG", "true");
    vi.stubEnv("NODE_ENV", "production");

    expect(isAppBlockerSupported()).toBe(true);
  });

  it("shows it while developing locally", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_BLOCKER_DEBUG", "false");
    vi.stubEnv("NODE_ENV", "development");

    expect(isAppBlockerSupported()).toBe(true);
  });
});
