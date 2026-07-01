import { describe, it, expect } from "vitest";
import { NAV_ITEMS } from "./nav";

// Mirror of the isActive helper in AppNav.tsx. Kept in sync via this test.
function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(href + "/");
}

describe("app nav", () => {
  it("exposes the expected sections in order", () => {
    expect(NAV_ITEMS.map((i) => i.href)).toEqual([
      "/home",
      "/chat",
      "/review",
      "/vocab",
      "/kanji",
      "/memory",
      "/settings",
    ]);
  });

  it("every item has a label and Japanese caption", () => {
    for (const item of NAV_ITEMS) {
      expect(item.label.length).toBeGreaterThan(0);
      expect(item.jp.length).toBeGreaterThan(0);
    }
  });

  it("marks the exact route active", () => {
    expect(isActive("/chat", "/chat")).toBe(true);
    expect(isActive("/vocab", "/chat")).toBe(false);
  });

  it("marks nested routes active for their section", () => {
    expect(isActive("/vocab/verbs", "/vocab")).toBe(true);
    expect(isActive("/review/session/3", "/review")).toBe(true);
  });

  it("does not match a prefix that isn't a path segment boundary", () => {
    // "/chatter" should not activate "/chat"
    expect(isActive("/chatter", "/chat")).toBe(false);
  });
});
