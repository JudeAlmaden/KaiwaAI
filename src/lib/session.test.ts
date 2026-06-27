import { describe, it, expect, beforeEach, vi } from "vitest";

// In-memory cookie store shared across the mocked `next/headers`.
const store = new Map<string, { value: string }>();

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => store.get(name),
    set: (name: string, value: string) => {
      store.set(name, { value });
    },
    delete: (name: string) => {
      store.delete(name);
    },
  }),
}));

// Ensure the secret exists before the module reads it.
process.env.SESSION_SECRET = "test-secret-at-least-32-characters-long!!";

import { createSession, getSession, destroySession } from "./session";

describe("session", () => {
  beforeEach(() => {
    store.clear();
  });

  it("returns null when no session cookie is present", async () => {
    expect(await getSession()).toBeNull();
  });

  it("creates a session and reads it back", async () => {
    await createSession({ userId: "user_1", email: "a@b.com" });

    const session = await getSession();
    expect(session).not.toBeNull();
    expect(session?.userId).toBe("user_1");
    expect(session?.email).toBe("a@b.com");
  });

  it("stores the token as an httpOnly-style signed value, not plaintext", async () => {
    await createSession({ userId: "user_2", email: "secret@b.com" });
    const raw = store.get("kaiwa_session")?.value ?? "";
    // JWT has three dot-separated segments and should not leak the email in plaintext.
    expect(raw.split(".")).toHaveLength(3);
    expect(raw).not.toContain("secret@b.com");
  });

  it("destroys a session", async () => {
    await createSession({ userId: "user_3", email: "c@d.com" });
    expect(await getSession()).not.toBeNull();

    await destroySession();
    expect(await getSession()).toBeNull();
  });

  it("returns null for a tampered/invalid token", async () => {
    store.set("kaiwa_session", { value: "not.a.validtoken" });
    expect(await getSession()).toBeNull();
  });
});
