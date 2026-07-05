import { describe, it, expect, vi, beforeEach } from "vitest";
import { PATCH } from "./route";
import { getCurrentUser } from "@/lib/auth-helpers";

vi.mock("@/lib/auth-helpers");

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      update: vi.fn(),
    },
  },
}));

import { prisma } from "@/lib/prisma";

describe("/api/settings/name", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue(null);
    const req = new Request("http://localhost/api/settings/name", {
      method: "PATCH",
      body: JSON.stringify({ name: "Test" }),
    });
    const res = await PATCH(req);
    expect(res.status).toBe(401);
  });

  it("returns 400 when name is missing", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ id: "user1" } as never);
    const req = new Request("http://localhost/api/settings/name", {
      method: "PATCH",
      body: JSON.stringify({ name: "" }),
    });
    const res = await PATCH(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("Name is required");
  });

  it("returns 400 when name is too long", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ id: "user1" } as never);
    const req = new Request("http://localhost/api/settings/name", {
      method: "PATCH",
      body: JSON.stringify({ name: "a".repeat(51) }),
    });
    const res = await PATCH(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("Name must be 50 characters or less");
  });

  it("updates name successfully", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ id: "user1" } as never);
    vi.mocked(prisma.user.update).mockResolvedValue({ id: "user1", name: "New Name" } as never);

    const req = new Request("http://localhost/api/settings/name", {
      method: "PATCH",
      body: JSON.stringify({ name: "New Name" }),
    });
    const res = await PATCH(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.name).toBe("New Name");

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: "user1" },
      data: { name: "New Name" },
    });
  });

  it("trims whitespace from name", async () => {
    vi.mocked(getCurrentUser).mockResolvedValue({ id: "user1" } as never);
    vi.mocked(prisma.user.update).mockResolvedValue({ id: "user1", name: "Trimmed" } as never);

    const req = new Request("http://localhost/api/settings/name", {
      method: "PATCH",
      body: JSON.stringify({ name: "  Trimmed  " }),
    });
    const res = await PATCH(req);
    expect(res.status).toBe(200);

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: "user1" },
      data: { name: "Trimmed" },
    });
  });
});
