import { describe, it, expect, vi } from "vitest";

const destroySession = vi.fn();

vi.mock("@/lib/session", () => ({
  destroySession: (...args: unknown[]) => destroySession(...args),
}));

import { POST } from "./route";

describe("POST /api/auth/logout", () => {
  it("destroys the session and returns ok", async () => {
    const res = await POST();
    expect(res.status).toBe(200);
    expect(destroySession).toHaveBeenCalledOnce();
    await expect(res.json()).resolves.toEqual({ ok: true });
  });
});
