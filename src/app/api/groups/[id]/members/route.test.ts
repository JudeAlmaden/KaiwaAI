import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";
import { prisma } from "@/lib/prisma";
import * as authHelpers from "@/lib/auth-helpers";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    chat: { findUnique: vi.fn() },
    chatMember: { findFirst: vi.fn(), create: vi.fn() },
    friendship: { findFirst: vi.fn() },
  },
}));

vi.mock("@/lib/auth-helpers", () => ({ getCurrentUser: vi.fn() }));

const me = { id: "user1", email: "me@example.com", name: "Me" };

function post(body: unknown) {
  return POST(
    new Request("http://localhost/api/groups/g1/members", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
    { params: Promise.resolve({ id: "g1" }) }
  );
}

describe("/api/groups/[id]/members POST", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(authHelpers.getCurrentUser).mockResolvedValue(me as never);
    vi.mocked(prisma.chat.findUnique).mockResolvedValue({
      kind: "group",
      ownerId: "user1",
    } as never);
    vi.mocked(prisma.friendship.findFirst).mockResolvedValue({ id: "f1" } as never);
    vi.mocked(prisma.chatMember.findFirst).mockResolvedValue(null as never);
  });

  it("rejects signed-out users", async () => {
    vi.mocked(authHelpers.getCurrentUser).mockResolvedValue(null as never);
    expect((await post({ friendId: "u2" })).status).toBe(401);
  });

  it("rejects non-owners", async () => {
    vi.mocked(prisma.chat.findUnique).mockResolvedValue({
      kind: "group",
      ownerId: "other",
    } as never);
    expect((await post({ friendId: "u2" })).status).toBe(403);
  });

  it("rejects non-friends", async () => {
    vi.mocked(prisma.friendship.findFirst).mockResolvedValue(null as never);
    expect((await post({ friendId: "u2" })).status).toBe(400);
    expect(prisma.chatMember.create).not.toHaveBeenCalled();
  });

  it("rejects someone already in the group", async () => {
    vi.mocked(prisma.chatMember.findFirst).mockResolvedValue({ id: "m2" } as never);
    expect((await post({ friendId: "u2" })).status).toBe(409);
  });

  it("invites a friend as pending", async () => {
    const res = await post({ friendId: "u2" });
    expect(res.status).toBe(200);
    expect(prisma.chatMember.create).toHaveBeenCalledWith({
      data: { chatId: "g1", kind: "user", userId: "u2", status: "pending" },
    });
  });
});
