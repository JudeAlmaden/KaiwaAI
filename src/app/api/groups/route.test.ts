import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";
import { prisma } from "@/lib/prisma";
import * as authHelpers from "@/lib/auth-helpers";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findFirst: vi.fn() },
    friendship: { findFirst: vi.fn() },
    chat: { findFirst: vi.fn(), create: vi.fn(), count: vi.fn() },
    chatMember: { findFirst: vi.fn() },
  },
}));

vi.mock("@/lib/auth-helpers", () => ({
  getCurrentUser: vi.fn(),
}));

const me = { id: "me", email: "me@example.com", name: "Me", geminiKeyEnc: null };
const them = { id: "them", name: "Hana", email: "hana@example.com" };

function post(body: unknown) {
  return POST(
    new Request("http://localhost/api/groups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
  );
}

describe("/api/groups POST - message requests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(authHelpers.getCurrentUser).mockResolvedValue(me as never);
    vi.mocked(prisma.chat.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.chat.count).mockResolvedValue(0);
  });

  it("matches the email regardless of case and makes a stranger's membership pending", async () => {
    vi.mocked(prisma.user.findFirst).mockResolvedValue(them as never);
    vi.mocked(prisma.friendship.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.chat.create).mockResolvedValue({
      id: "dm1",
      name: "Hana",
      kind: "dm",
    } as never);

    const res = await post({ email: "  HANA@Example.COM " });

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      group: { id: "dm1", name: "Hana", kind: "dm" },
      request: true,
    });
    expect(prisma.user.findFirst).toHaveBeenCalledWith({
      where: { email: { equals: "HANA@Example.COM", mode: "insensitive" } },
    });
    expect(prisma.chat.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        kind: "dm",
        members: {
          create: [
            { kind: "user", userId: "me", status: "accepted" },
            { kind: "user", userId: "them", status: "pending" },
          ],
        },
      }),
    });
  });

  it("adds a friend as an accepted member, so the DM opens without a request", async () => {
    vi.mocked(prisma.user.findFirst).mockResolvedValue(them as never);
    vi.mocked(prisma.friendship.findFirst).mockResolvedValue({ id: "f1" } as never);
    vi.mocked(prisma.chat.create).mockResolvedValue({
      id: "dm2",
      name: "Hana",
      kind: "dm",
    } as never);

    const res = await post({ email: "hana@example.com" });

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      group: { id: "dm2", name: "Hana", kind: "dm" },
      request: false,
    });
    expect(prisma.chat.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        members: {
          create: [
            { kind: "user", userId: "me", status: "accepted" },
            { kind: "user", userId: "them", status: "accepted" },
          ],
        },
      }),
    });
  });

  it("429s once the hourly request cap is reached, without creating a chat", async () => {
    vi.mocked(prisma.user.findFirst).mockResolvedValue(them as never);
    vi.mocked(prisma.friendship.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.chat.count).mockResolvedValue(5);

    const res = await post({ email: "hana@example.com" });

    expect(res.status).toBe(429);
    await expect(res.json()).resolves.toEqual({
      error: "You can send 5 message requests an hour. Try again later.",
    });
    expect(prisma.chat.create).not.toHaveBeenCalled();
  });

  it("does not spend the cap on a friend DM", async () => {
    vi.mocked(prisma.user.findFirst).mockResolvedValue(them as never);
    vi.mocked(prisma.friendship.findFirst).mockResolvedValue({ id: "f1" } as never);
    vi.mocked(prisma.chat.count).mockResolvedValue(99);
    vi.mocked(prisma.chat.create).mockResolvedValue({
      id: "dm3",
      name: "Hana",
      kind: "dm",
    } as never);

    const res = await post({ email: "hana@example.com" });

    expect(res.status).toBe(200);
    expect(prisma.chat.count).not.toHaveBeenCalled();
  });

  it("404s on an address no account uses", async () => {
    vi.mocked(prisma.user.findFirst).mockResolvedValue(null);

    const res = await post({ email: "nobody@example.com" });

    expect(res.status).toBe(404);
    await expect(res.json()).resolves.toEqual({ error: "No account uses that email." });
    expect(prisma.chat.create).not.toHaveBeenCalled();
  });
});
