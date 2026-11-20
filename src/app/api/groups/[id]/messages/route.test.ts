import { beforeEach, describe, expect, it, vi } from "vitest";
import { DELETE } from "./route";
import { prisma } from "@/lib/prisma";
import * as authHelpers from "@/lib/auth-helpers";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    chatMember: { findFirst: vi.fn() },
    chat: { findUnique: vi.fn() },
    message: { deleteMany: vi.fn() },
  },
}));

vi.mock("@/lib/auth-helpers", () => ({ getCurrentUser: vi.fn() }));
vi.mock("@/lib/gemini-server", () => ({ decodeKeys: vi.fn(() => []) }));
vi.mock("@/lib/group-chat", () => ({
  renderTranscript: vi.fn(() => ""),
  generatePersonaReply: vi.fn(),
}));

const me = { id: "user1", email: "me@example.com", name: "Me" };

function del() {
  return DELETE(
    new Request("http://localhost/api/groups/g1/messages", { method: "DELETE" }),
    { params: Promise.resolve({ id: "g1" }) }
  );
}

describe("/api/groups/[id]/messages DELETE", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(authHelpers.getCurrentUser).mockResolvedValue(me as never);
    vi.mocked(prisma.chatMember.findFirst).mockResolvedValue({ id: "m1" } as never);
    vi.mocked(prisma.chat.findUnique).mockResolvedValue({
      kind: "group",
      ownerId: "user1",
    } as never);
  });

  it("lets the group owner clear the transcript", async () => {
    const res = await del();
    expect(res.status).toBe(200);
    expect(prisma.message.deleteMany).toHaveBeenCalledWith({ where: { chatId: "g1" } });
  });

  it("refuses a group member who is not the owner", async () => {
    vi.mocked(prisma.chat.findUnique).mockResolvedValue({
      kind: "group",
      ownerId: "owner1",
    } as never);
    const res = await del();
    expect(res.status).toBe(403);
    expect(prisma.message.deleteMany).not.toHaveBeenCalled();
  });

  it("still lets a member clear a 1:1 conversation", async () => {
    vi.mocked(prisma.chat.findUnique).mockResolvedValue({
      kind: "persona",
      ownerId: "owner1",
    } as never);
    const res = await del();
    expect(res.status).toBe(200);
    expect(prisma.message.deleteMany).toHaveBeenCalled();
  });

  it("refuses someone who is not a member", async () => {
    vi.mocked(prisma.chatMember.findFirst).mockResolvedValue(null as never);
    const res = await del();
    expect(res.status).toBe(403);
    expect(prisma.message.deleteMany).not.toHaveBeenCalled();
  });
});
