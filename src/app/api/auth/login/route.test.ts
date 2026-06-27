import { describe, it, expect, beforeEach, vi } from "vitest";
import bcrypt from "bcryptjs";

const findUnique = vi.fn();
const createSession = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: (...args: unknown[]) => findUnique(...args),
    },
  },
}));

vi.mock("@/lib/session", () => ({
  createSession: (...args: unknown[]) => createSession(...args),
}));

import { POST } from "./route";

function req(body: unknown) {
  return new Request("http://localhost/api/auth/login", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

describe("POST /api/auth/login", () => {
  beforeEach(() => {
    findUnique.mockReset();
    createSession.mockReset();
  });

  it("rejects a missing email or password", async () => {
    const res = await POST(req({ email: "a@b.com" }));
    expect(res.status).toBe(400);
  });

  it("returns 401 for an unknown user without starting a session", async () => {
    findUnique.mockResolvedValue(null);
    const res = await POST(req({ email: "ghost@b.com", password: "whatever12" }));
    expect(res.status).toBe(401);
    expect(createSession).not.toHaveBeenCalled();
  });

  it("returns 401 when the password is wrong", async () => {
    const hash = await bcrypt.hash("correct-password", 12);
    findUnique.mockResolvedValue({ id: "u1", email: "a@b.com", password: hash });

    const res = await POST(req({ email: "a@b.com", password: "wrong-password" }));
    expect(res.status).toBe(401);
    expect(createSession).not.toHaveBeenCalled();
  });

  it("logs in with correct credentials and starts a session", async () => {
    const hash = await bcrypt.hash("correct-password", 12);
    findUnique.mockResolvedValue({
      id: "u1",
      email: "a@b.com",
      name: "Kai",
      password: hash,
    });

    const res = await POST(req({ email: " A@B.com ", password: "correct-password" }));
    expect(res.status).toBe(200);

    // Email lookup is normalized.
    expect(findUnique).toHaveBeenCalledWith({ where: { email: "a@b.com" } });
    expect(createSession).toHaveBeenCalledWith({ userId: "u1", email: "a@b.com" });
  });
});
