import { beforeEach, describe, expect, it, vi } from "vitest";
import { DELETE, PATCH } from "./route";
import { prisma } from "@/lib/prisma";
import * as authHelpers from "@/lib/auth-helpers";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    chat: { findUnique: vi.fn() },
    chatMember: { findFirst: vi.fn(), delete: vi.fn(), update: vi.fn() },
  },
}));

vi.mock("@/lib/auth-helpers", () => ({ getCurrentUser: vi.fn() }));

const me = { id: "user1", email: "me@example.com", name: "Me" };

function del() {
  return DELETE(new Request("http://localhost/api/groups/g1/members/m2", { method: "DELETE" }), {
    params: Promise.resolve({ id: "g1", memberId: "m2" }),
  });
}

function patch(nickname: unknown) {
  return PATCH(
    new Request("http://localhost/api/groups/g1/members/m2", {
      method: "PATCH",
      body: JSON.stringify({ nickname }),
    }),
    { params: Promise.resolve({ id: "g1", memberId: "m2" }) }
  );
}

describe("/api/groups/[id]/members/[memberId] DELETE", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(authHelpers.getCurrentUser).mockResolvedValue(me as never);
    vi.mocked(prisma.chat.findUnique).mockResolvedValue({
      kind: "group",
      ownerId: "user1",
    } as never);
    vi.mocked(prisma.chatMember.findFirst).mockResolvedValue({
      id: "m2",
      userId: "user2",
      kind: "user",
    } as never);
  });

  it("lets the owner remove a member", async () => {
    const res = await del();
    expect(res.status).toBe(200);
    expect(prisma.chatMember.delete).toHaveBeenCalledWith({ where: { id: "m2" } });
  });

  it("lets a member leave by removing themselves", async () => {
    vi.mocked(prisma.chat.findUnique).mockResolvedValue({
      kind: "group",
      ownerId: "owner1",
    } as never);
    vi.mocked(prisma.chatMember.findFirst).mockResolvedValue({
      id: "m2",
      userId: "user1",
      kind: "user",
    } as never);
    const res = await del();
    expect(res.status).toBe(200);
    expect((await res.json()).left).toBe(true);
  });

  it("refuses to remove the owner", async () => {
    vi.mocked(prisma.chatMember.findFirst).mockResolvedValue({
      id: "m2",
      userId: "user1",
      kind: "user",
    } as never);
    const res = await del();
    expect(res.status).toBe(400);
    expect(prisma.chatMember.delete).not.toHaveBeenCalled();
  });

  it("refuses a stranger removing members", async () => {
    vi.mocked(prisma.chat.findUnique).mockResolvedValue({
      kind: "group",
      ownerId: "owner1",
    } as never);
    const res = await del();
    expect(res.status).toBe(403);
    expect(prisma.chatMember.delete).not.toHaveBeenCalled();
  });

  it("lets the owner set another member's nickname", async () => {
    const res = await patch("  Ken  ");
    expect(res.status).toBe(200);
    expect(prisma.chatMember.update).toHaveBeenCalledWith({
      where: { id: "m2" },
      data: { nickname: "Ken" },
    });
  });

  it("lets a member set their own nickname", async () => {
    vi.mocked(prisma.chat.findUnique).mockResolvedValue({
      kind: "group",
      ownerId: "owner1",
    } as never);
    vi.mocked(prisma.chatMember.findFirst).mockResolvedValue({
      id: "m2",
      userId: "user1",
      kind: "user",
    } as never);
    const res = await patch("JJ");
    expect(res.status).toBe(200);
    expect(prisma.chatMember.update).toHaveBeenCalled();
  });

  it("clears a nickname with an empty value", async () => {
    const res = await patch("   ");
    expect(res.status).toBe(200);
    expect(prisma.chatMember.update).toHaveBeenCalledWith({
      where: { id: "m2" },
      data: { nickname: null },
    });
  });

  it("refuses a member renaming someone else", async () => {
    vi.mocked(prisma.chat.findUnique).mockResolvedValue({
      kind: "group",
      ownerId: "owner1",
    } as never);
    const res = await patch("Nobody");
    expect(res.status).toBe(403);
    expect(prisma.chatMember.update).not.toHaveBeenCalled();
  });
});
