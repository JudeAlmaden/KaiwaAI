import { describe, it, expect, vi, beforeEach } from "vitest";
import bcrypt from "bcryptjs";
import { PATCH } from "./route";
import { getCurrentUser } from "@/lib/auth-helpers";

vi.mock("@/lib/auth-helpers");
vi.mock("bcryptjs");

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      update: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";

describe("/api/settings/password", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);
    const req = new Request("http://localhost/api/settings/password", {
      method: "PATCH",
      body: JSON.stringify({ currentPassword: "old", newPassword: "new12345" }),
    });
    const res = await PATCH(req);
    expect(res.status).toBe(401);
  });

  it("returns 400 when passwords are missing", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ id: "user1" } as Partial<User> as never);
    const req = new Request("http://localhost/api/settings/password", {
      method: "PATCH",
      body: JSON.stringify({ currentPassword: "old" }),
    });
    const res = await PATCH(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("Both passwords are required");
  });

  it("returns 400 when new password is too short", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ id: "user1" } as Partial<User> as never);
    const req = new Request("http://localhost/api/settings/password", {
      method: "PATCH",
      body: JSON.stringify({ currentPassword: "old123", newPassword: "short" }),
    });
    const res = await PATCH(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("New password must be at least 8 characters");
  });

  it("returns 401 when current password is incorrect", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({
      id: "user1",
      password: "hashedOldPassword",
    } as Partial<User> as never);
    vi.mocked(bcrypt.compare).mockResolvedValue(false as never);

    const req = new Request("http://localhost/api/settings/password", {
      method: "PATCH",
      body: JSON.stringify({ currentPassword: "wrong", newPassword: "new12345" }),
    });
    const res = await PATCH(req);
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe("Current password is incorrect");
  });

  it("updates password successfully", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({
      id: "user1",
      password: "hashedOldPassword",
    } as Partial<User> as never);
    vi.mocked(bcrypt.compare).mockResolvedValue(true as never);
    vi.mocked(bcrypt.hash).mockResolvedValue("hashedNewPassword" as never);
    vi.mocked(prisma.user.update).mockResolvedValue({ id: "user1" } as Partial<User> as never);

    const req = new Request("http://localhost/api/settings/password", {
      method: "PATCH",
      body: JSON.stringify({ currentPassword: "correct", newPassword: "new12345" }),
    });
    const res = await PATCH(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.ok).toBe(true);

    expect(bcrypt.compare).toHaveBeenCalledWith("correct", "hashedOldPassword");
    expect(bcrypt.hash).toHaveBeenCalledWith("new12345", 12);
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: "user1" },
      data: { password: "hashedNewPassword" },
    });
  });
});
