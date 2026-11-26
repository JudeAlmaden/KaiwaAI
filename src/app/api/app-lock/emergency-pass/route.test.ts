import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";
import { prisma } from "@/lib/prisma";
import * as authHelpers from "@/lib/auth-helpers";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      update: vi.fn(),
    },
  },
}));

vi.mock("@/lib/auth-helpers", () => ({
  getCurrentUser: vi.fn(),
}));

describe("POST /api/app-lock/emergency-pass", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-26T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(authHelpers.getCurrentUser).mockResolvedValue(null);

    const res = await POST();
    expect(res.status).toBe(401);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it("grants pass on first use and updates lastEmergencyPassAt", async () => {
    vi.mocked(authHelpers.getCurrentUser).mockResolvedValue({
      id: "user1",
      lastEmergencyPassAt: null,
    } as never);
    vi.mocked(prisma.user.update).mockResolvedValue({} as never);

    const res = await POST();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ granted: true });
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: "user1" },
      data: { lastEmergencyPassAt: new Date("2026-11-26T12:00:00.000Z") },
    });
  });

  it("denies pass within 24 hours and returns nextAvailableAt", async () => {
    const usedAt = new Date("2026-11-26T04:00:00.000Z"); // 8 hours ago
    vi.mocked(authHelpers.getCurrentUser).mockResolvedValue({
      id: "user1",
      lastEmergencyPassAt: usedAt,
    } as never);

    const res = await POST();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({
      granted: false,
      nextAvailableAt: "2026-11-27T04:00:00.000Z",
    });
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it("grants pass again after 24 hours have elapsed", async () => {
    const usedAt = new Date("2026-11-25T11:59:59.000Z"); // >24 hours ago
    vi.mocked(authHelpers.getCurrentUser).mockResolvedValue({
      id: "user1",
      lastEmergencyPassAt: usedAt,
    } as never);
    vi.mocked(prisma.user.update).mockResolvedValue({} as never);

    const res = await POST();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ granted: true });
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: "user1" },
      data: { lastEmergencyPassAt: new Date("2026-11-26T12:00:00.000Z") },
    });
  });
});
