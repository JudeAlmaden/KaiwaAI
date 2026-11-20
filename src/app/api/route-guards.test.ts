import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";

const API_ROOT = join(process.cwd(), "src", "app", "api");

/**
 * Routes that must answer without a session, and why. Anything else has to
 * call `getCurrentUser()` — an unauthenticated debug route can't slip in
 * without someone editing this list on purpose.
 */
const PUBLIC_ROUTES: Record<string, string> = {
  "auth/login/route.ts": "signs in; no session exists yet",
  "auth/logout/route.ts": "clears a session that may already be gone",
  "auth/register/route.ts": "creates the account before a session exists",
};

function routeFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return routeFiles(path);
    return entry.name === "route.ts" ? [path] : [];
  });
}

const routes = routeFiles(API_ROOT).map((path) => ({
  id: relative(API_ROOT, path).split("\\").join("/"),
  source: readFileSync(path, "utf8"),
}));

describe("API route session guards", () => {
  it("scans the routes (so a broken walk can't pass silently)", () => {
    expect(routes.length).toBeGreaterThan(20);
  });

  it("keeps every non-public route behind getCurrentUser()", () => {
    const unguarded = routes
      .filter((route) => !(route.id in PUBLIC_ROUTES))
      .filter((route) => !/getCurrentUser\s*\(/.test(route.source))
      .map((route) => route.id);

    expect(
      unguarded,
      `Routes without a session guard: ${unguarded.join(", ")}`
    ).toEqual([]);
  });

  it("keeps the public allowlist honest", () => {
    const ids = new Set(routes.map((route) => route.id));
    for (const [id, reason] of Object.entries(PUBLIC_ROUTES)) {
      expect(ids.has(id), `${id} no longer exists (${reason})`).toBe(true);
    }
  });
});
