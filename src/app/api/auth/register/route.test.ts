import { describe, it, expect, beforeEach, vi } from "vitest";
import bcrypt from "bcryptjs";

const findUnique = vi.fn();
const create = vi.fn();
const createSession = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: (...args: unknown[]) => findUnique(...args),
      create: (...args: unknown[]) => create(...args),
    },
  },
}));

vi.mock("@/lib/session", () => ({
  createSession: (...args: unknown[]) => createSession(...args),
}));

import { POST } from "./route";

function req(body: unknown) {
  return new Request("http://localhost/api/auth/register", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

describe("POST /api/auth/register", () => {
  beforeEach(() => {
    findUnique.mockReset();
    create.mockReset();
    createSession.mockReset();
  });

  it("rejects a missing email or password", async () => {
    const res = await POST(req({ email: "a@b.com" }));
    expect(res.status).toBe(400);
  });

  it("rejects an invalid email", async () => {
    const res = await POST(req({ email: "notanemail", password: "longenough1" }));
    expect(res.status).toBe(400);
  });

  it("rejects a short password", async () => {
    const res = await POST(req({ email: "a@b.com", password: "short" }));
    expect(res.status).toBe(400);
  });

  it("rejects a duplicate email", async () => {
    findUnique.mockResolvedValue({ id: "existing", email: "a@b.com" });
    const res = await POST(req({ email: "a@b.com", password: "longenough1" }));
    expect(res.status).toBe(409);
    expect(create).not.toHaveBeenCalled();
  });

  it("creates a user with a hashed password and starts a session", async () => {
    findUnique.mockResolvedValue(null);
    create.mockImplementation(async ({ data }: { data: { password: string; email: string } }) => ({
      id: "new_user",
      email: data.email,
      name: null,
    }));

    const res = await POST(
      req({ email: "New@Example.com ", password: "longenough1", name: "  Kai  " })
    );
    expect(res.status).toBe(200);

    // Email is normalized (trimmed + lowercased).
    const passedData = create.mock.calls[0][0].data;
    expect(passedData.email).toBe("new@example.com");
    expect(passedData.name).toBe("Kai");

    // Password is hashed, not stored in plaintext.
    expect(passedData.password).not.toBe("longenough1");
    expect(await bcrypt.compare("longenough1", passedData.password)).toBe(true);

    expect(createSession).toHaveBeenCalledWith({
      userId: "new_user",
      email: "new@example.com",
    });
  });
});
