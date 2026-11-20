import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";
import { prisma } from "@/lib/prisma";
import * as authHelpers from "@/lib/auth-helpers";

vi.mock("@/lib/prisma", () => {
  const prisma = {
    user: { findFirst: vi.fn() },
    friendship: { findFirst: vi.fn(), findMany: vi.fn() },
    chat: {
      findFirst: vi.fn(),
      create: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    chatMember: { findFirst: vi.fn() },
    persona: { findFirst: vi.fn(), findUnique: vi.fn() },
    $executeRaw: vi.fn(),
    $transaction: vi.fn(),
  };
  // Run interactive transactions against the same mock, so the tx client and
  // the base client share their spies.
  prisma.$transaction.mockImplementation((run: (tx: typeof prisma) => unknown) =>
    Promise.resolve(run(prisma))
  );
  return { prisma };
});

vi.mock("@/lib/auth-helpers", () => ({
  getCurrentUser: vi.fn(),
}));

const me = { id: "me", email: "me@example.com", name: "Me", geminiKeyEnc: null };
const them = { id: "them", name: "Hana", email: "hana@example.com" };

/** A DM row as the cap query selects it: the user ids on the chat. */
const dm = (otherId: string) => ({ members: [{ userId: "me" }, { userId: otherId }] });

function post(body: unknown) {
  return POST(
    new Request("http://localhost/api/groups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
  );
}

describe("/api/groups POST - Kai personalities", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(authHelpers.getCurrentUser).mockResolvedValue(me as never);
    vi.mocked(prisma.chat.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.friendship.findMany).mockResolvedValue([]);
  });

  it("rejects a personality as a chat participant", async () => {
    vi.mocked(prisma.persona.findFirst).mockResolvedValue({
      id: "hana1",
      name: "Hana",
      kind: "kai_mode",
      modeOfId: "kai1",
    } as never);

    const res = await post({ personaId: "hana1" });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/Pick Kai/);
    expect(prisma.chat.create).not.toHaveBeenCalled();
  });

  it("stores a chosen attitude for a group with friends", async () => {
    vi.mocked(prisma.friendship.findMany).mockResolvedValue([
      { requesterId: "me", addresseeId: "them" },
    ] as never);
    vi.mocked(prisma.persona.findFirst)
      // persona lookup
      .mockResolvedValueOnce({
        id: "kai1",
        name: "Kai",
        kind: "kai",
        modeOfId: null,
      } as never)
      // mode lookup
      .mockResolvedValueOnce({ id: "riku1" } as never);
    vi.mocked(prisma.chat.create).mockResolvedValue({
      id: "group1",
      name: "Group chat",
      kind: "group",
    } as never);

    const res = await post({
      friendIds: ["them"],
      personaId: "kai1",
      modeId: "riku1",
    });
    expect(res.status).toBe(200);
    expect(prisma.chat.create).toHaveBeenCalledWith({
      select: { id: true, name: true, kind: true },
      data: expect.objectContaining({
        kind: "group",
        activeModeId: "riku1",
      }),
    });
  });

  it("rejects a personality on a custom persona", async () => {
    vi.mocked(prisma.persona.findFirst).mockResolvedValue({
      id: "mine1",
      name: "Mine",
      kind: "custom",
      modeOfId: null,
    } as never);

    const res = await post({ personaId: "mine1", modeId: "hana1", friendIds: ["them"] });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/Only Kai has attitudes/);
  });
});

describe("/api/groups POST - message requests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(authHelpers.getCurrentUser).mockResolvedValue(me as never);
    vi.mocked(prisma.chat.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.chat.findMany).mockResolvedValue([]);
    vi.mocked(prisma.friendship.findMany).mockResolvedValue([]);
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

  it("does not take a lock for a friend DM", async () => {
    vi.mocked(prisma.user.findFirst).mockResolvedValue(them as never);
    vi.mocked(prisma.friendship.findFirst).mockResolvedValue({ id: "f1" } as never);
    vi.mocked(prisma.chat.create).mockResolvedValue({
      id: "dm6",
      name: "Hana",
      kind: "dm",
    } as never);

    const res = await post({ email: "hana@example.com" });

    expect(res.status).toBe(200);
    expect(prisma.$transaction).not.toHaveBeenCalled();
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

  it("429s once five stranger requests exist in the hour, without creating a chat", async () => {
    vi.mocked(prisma.user.findFirst).mockResolvedValue(them as never);
    vi.mocked(prisma.friendship.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.chat.findMany).mockResolvedValue(
      ["u1", "u2", "u3", "u4", "u5"].map(dm) as never
    );

    const res = await post({ email: "hana@example.com" });

    expect(res.status).toBe(429);
    await expect(res.json()).resolves.toEqual({
      error: "You can send 5 message requests an hour. Try again later.",
    });
    expect(prisma.chat.create).not.toHaveBeenCalled();
  });

  it("still counts a request whose membership was declined", async () => {
    vi.mocked(prisma.user.findFirst).mockResolvedValue(them as never);
    vi.mocked(prisma.friendship.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.chat.findMany).mockResolvedValue(
      Array.from({ length: 5 }, () => ({ members: [{ userId: "me" }] })) as never
    );

    const res = await post({ email: "hana@example.com" });

    expect(res.status).toBe(429);
    expect(prisma.chat.create).not.toHaveBeenCalled();
  });

  it("does not spend the cap on DMs with friends", async () => {
    vi.mocked(prisma.user.findFirst).mockResolvedValue(them as never);
    vi.mocked(prisma.friendship.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.chat.findMany).mockResolvedValue(
      ["f1", "f2", "f3", "f4", "f5"].map(dm) as never
    );
    vi.mocked(prisma.friendship.findMany).mockResolvedValue(
      ["f1", "f2", "f3", "f4", "f5"].map((id) => ({
        requesterId: "me",
        addresseeId: id,
      })) as never
    );
    vi.mocked(prisma.chat.create).mockResolvedValue({
      id: "dm3",
      name: "Hana",
      kind: "dm",
    } as never);

    const res = await post({ email: "hana@example.com" });

    expect(res.status).toBe(200);
    expect(prisma.chat.create).toHaveBeenCalled();
  });

  it("does not query the budget when starting a DM with a friend", async () => {
    vi.mocked(prisma.user.findFirst).mockResolvedValue(them as never);
    vi.mocked(prisma.friendship.findFirst).mockResolvedValue({ id: "f1" } as never);
    vi.mocked(prisma.chat.create).mockResolvedValue({
      id: "dm4",
      name: "Hana",
      kind: "dm",
    } as never);

    const res = await post({ email: "hana@example.com" });

    expect(res.status).toBe(200);
    expect(prisma.chat.findMany).not.toHaveBeenCalled();
  });

  it("serializes the budget check and the insert with a per-sender lock", async () => {
    vi.mocked(prisma.user.findFirst).mockResolvedValue(them as never);
    vi.mocked(prisma.friendship.findFirst).mockResolvedValue(null);
    vi.mocked(prisma.chat.create).mockResolvedValue({
      id: "dm5",
      name: "Hana",
      kind: "dm",
    } as never);

    const res = await post({ email: "hana@example.com" });

    expect(res.status).toBe(200);
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.$executeRaw).toHaveBeenCalledTimes(1);
    expect(prisma.chat.create).toHaveBeenCalledTimes(1);
  });

  it("404s on an address no account uses", async () => {
    vi.mocked(prisma.user.findFirst).mockResolvedValue(null);

    const res = await post({ email: "nobody@example.com" });

    expect(res.status).toBe(404);
    await expect(res.json()).resolves.toEqual({ error: "No account uses that email." });
    expect(prisma.chat.create).not.toHaveBeenCalled();
  });
});
