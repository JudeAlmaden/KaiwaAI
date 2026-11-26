import { beforeEach, describe, expect, it, vi } from "vitest";
import { DELETE } from "./route";
import { prisma } from "@/lib/prisma";
import * as authHelpers from "@/lib/auth-helpers";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    chat: { findUnique: vi.fn(), update: vi.fn(), delete: vi.fn() },
    chatMember: { delete: vi.fn() },
    $transaction: vi.fn(async (ops: unknown[]) => ops),
  },
}));

vi.mock("@/lib/auth-helpers", () => ({ getCurrentUser: vi.fn() }));

const me = { id: "user1", email: "me@example.com", name: "Me" };
const at = (day: number) => new Date(2026, 10, day);
const myMember = {
  id: "m1",
  userId: "user1",
  kind: "user",
  status: "accepted",
  createdAt: at(1),
};
const otherMember = {
  id: "m2",
  userId: "user2",
  kind: "user",
  status: "accepted",
  createdAt: at(2),
};
const personaMember = {
  id: "p1",
  userId: null,
  kind: "persona",
  status: "accepted",
  createdAt: at(1),
};

function del() {
  return DELETE(
    new Request("http://localhost/api/groups/g1/leave", { method: "DELETE" }),
    { params: Promise.resolve({ id: "g1" }) }
  );
}

function chat(members: unknown[], ownerId = "user2") {
  vi.mocked(prisma.chat.findUnique).mockResolvedValue({
    ownerId,
    members,
  } as never);
}

describe("/api/groups/[id]/leave DELETE", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(authHelpers.getCurrentUser).mockResolvedValue(me as never);
  });

  it("deletes a persona chat once its only human is gone", async () => {
    chat([myMember, personaMember], "user1");
    const res = await del();
    expect(res.status).toBe(200);
    expect((await res.json()).scope).toBe("chat");
    expect(prisma.chat.delete).toHaveBeenCalledWith({ where: { id: "g1" } });
    expect(prisma.chatMember.delete).not.toHaveBeenCalled();
  });

  it("lets a member leave a group they don't own", async () => {
    chat([myMember, otherMember]);
    const res = await del();
    expect(res.status).toBe(200);
    expect((await res.json()).scope).toBe("membership");
    expect(prisma.chatMember.delete).toHaveBeenCalledWith({ where: { id: "m1" } });
    expect(prisma.chat.delete).not.toHaveBeenCalled();
  });

  it("hands an owned group to the longest-standing member and leaves", async () => {
    const later = { ...otherMember, id: "m3", userId: "user3", createdAt: at(5) };
    chat([myMember, later, otherMember], "user1");
    const res = await del();
    expect(res.status).toBe(200);
    expect((await res.json()).scope).toBe("handover");
    expect(prisma.chat.update).toHaveBeenCalledWith({
      where: { id: "g1" },
      // The departing owner's API key is not handed to the new owner.
      data: { ownerId: "user2", apiKeyEnc: null },
    });
    expect(prisma.chatMember.delete).toHaveBeenCalledWith({ where: { id: "m1" } });
    expect(prisma.chat.delete).not.toHaveBeenCalled();
  });

  it("ignores pending invites when counting the people left", async () => {
    chat([myMember, { ...otherMember, status: "pending" }], "user1");
    const res = await del();
    expect(res.status).toBe(200);
    expect(prisma.chat.delete).toHaveBeenCalled();
    expect(prisma.chat.update).not.toHaveBeenCalled();
  });

  it("refuses a non-member", async () => {
    chat([otherMember]);
    const res = await del();
    expect(res.status).toBe(403);
    expect(prisma.chatMember.delete).not.toHaveBeenCalled();
  });

  it("404s an unknown chat", async () => {
    vi.mocked(prisma.chat.findUnique).mockResolvedValue(null);
    const res = await del();
    expect(res.status).toBe(404);
  });

  it("401s signed-out requests", async () => {
    vi.mocked(authHelpers.getCurrentUser).mockResolvedValue(null as never);
    const res = await del();
    expect(res.status).toBe(401);
  });
});
