import { describe, it, expect, vi, beforeEach } from "vitest";

const getSessionMock = vi.fn();
const findUniqueMock = vi.fn();

vi.mock("@/lib/session", () => ({
  getSession: () => getSessionMock(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: (...args: unknown[]) => findUniqueMock(...args),
    },
  },
}));

import { getCurrentUser } from "./auth-helpers";

describe("getCurrentUser", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null if no session exists", async () => {
    getSessionMock.mockResolvedValue(null);
    expect(await getCurrentUser()).toBeNull();
  });

  it("returns null if user not found in database", async () => {
    getSessionMock.mockResolvedValue({ userId: "u1", email: "a@b.com", tokenVersion: 1 });
    findUniqueMock.mockResolvedValue(null);
    expect(await getCurrentUser()).toBeNull();
  });

  it("returns user if session tokenVersion matches user tokenVersion", async () => {
    getSessionMock.mockResolvedValue({ userId: "u1", email: "a@b.com", tokenVersion: 2 });
    findUniqueMock.mockResolvedValue({ id: "u1", email: "a@b.com", tokenVersion: 2 });

    const user = await getCurrentUser();
    expect(user).not.toBeNull();
    expect(user?.id).toBe("u1");
  });

  it("returns null if session tokenVersion differs from user tokenVersion (revoked)", async () => {
    getSessionMock.mockResolvedValue({ userId: "u1", email: "a@b.com", tokenVersion: 1 });
    findUniqueMock.mockResolvedValue({ id: "u1", email: "a@b.com", tokenVersion: 2 });

    const user = await getCurrentUser();
    expect(user).toBeNull();
  });

  it("handles legacy sessions without tokenVersion matching default version 1", async () => {
    getSessionMock.mockResolvedValue({ userId: "u1", email: "a@b.com" });
    findUniqueMock.mockResolvedValue({ id: "u1", email: "a@b.com", tokenVersion: 1 });

    const user = await getCurrentUser();
    expect(user).not.toBeNull();
    expect(user?.id).toBe("u1");
  });
});
