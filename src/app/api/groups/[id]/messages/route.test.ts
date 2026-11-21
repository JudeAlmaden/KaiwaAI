import { beforeEach, describe, expect, it, vi } from "vitest";
import { DELETE, POST } from "./route";
import { prisma } from "@/lib/prisma";
import * as authHelpers from "@/lib/auth-helpers";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    chatMember: { findFirst: vi.fn() },
    chat: { findUnique: vi.fn(), update: vi.fn() },
    message: { deleteMany: vi.fn(), create: vi.fn(), findMany: vi.fn() },
    word: { findMany: vi.fn(() => []) },
  },
}));

vi.mock("@/lib/pusher-server", () => ({
  triggerGroupEvent: vi.fn(),
}));

vi.mock("@/lib/dictionary-enrich-db", () => ({
  enrichTokensFromDb: vi.fn(() => []),
}));

vi.mock("@/lib/auth-helpers", () => ({ getCurrentUser: vi.fn() }));
vi.mock("@/lib/gemini-server", () => ({ decodeKeys: vi.fn(() => []) }));
vi.mock("@/lib/group-chat", () => ({
  renderTranscript: vi.fn(() => ""),
  generatePersonaReply: vi.fn(),
  mentionsPersona: (msg: string, name: string) => {
    return msg.toLowerCase().includes(`@${name.toLowerCase()}`);
  },
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

describe("/api/groups/[id]/messages POST", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(authHelpers.getCurrentUser).mockResolvedValue(me as never);
    vi.mocked(prisma.chatMember.findFirst).mockResolvedValue({ id: "m1", nickname: "Me" } as never);
    vi.mocked(prisma.message.findMany).mockResolvedValue([]);
    vi.mocked(prisma.chat.findUnique).mockResolvedValue({
      id: "g1",
      kind: "dm",
      apiKeyEnc: null,
      mood: "neutral",
      moodScore: 0,
      members: [],
    } as never);
    (prisma.message.create as unknown as ReturnType<typeof vi.fn>).mockImplementation(
      async ({ data }: { data: Record<string, unknown> }) => ({
        id: `msg-${Date.now()}-${Math.random()}`,
        createdAt: new Date(),
        ...data,
      })
    );
  });

  function postMsg(body: Record<string, unknown>) {
    return POST(
      new Request("http://localhost/api/groups/g1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
      { params: Promise.resolve({ id: "g1" }) }
    );
  }

  it("saves a normal human DM message without AI when @Kai is not mentioned", async () => {
    const res = await postMsg({
      content: "Hello friend, how are you?",
      aiReply: { reply: "Forged reply" },
    });
    expect(res.status).toBe(200);
    // Only 1 message created (the human one)
    expect(prisma.message.create).toHaveBeenCalledTimes(1);
    expect(prisma.message.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          content: "Hello friend, how are you?",
          senderKind: "user",
        }),
      })
    );
  });

  it("allows Kai assistance in a 1:1 DM when @Kai is explicitly mentioned", async () => {
    const res = await postMsg({
      content: "@Kai what does おはよう mean?",
      aiReply: {
        reply: "おはよう (ohayou) means 'Good morning'!",
        english: "Good morning",
        tokens: [],
      },
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.messages).toHaveLength(2);

    // Human message + Kai message created
    expect(prisma.message.create).toHaveBeenCalledTimes(2);
    expect(prisma.message.create).toHaveBeenLastCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          senderName: "Kai",
          senderKind: "persona",
          content: "おはよう (ohayou) means 'Good morning'!",
        }),
      })
    );
  });

  it("rejects client aiReply in multi-user groups even if @Kai is mentioned", async () => {
    vi.mocked(prisma.chat.findUnique).mockResolvedValue({
      id: "g1",
      kind: "group",
      apiKeyEnc: null,
      mood: "neutral",
      moodScore: 0,
      members: [],
    } as never);

    const res = await postMsg({
      content: "@Kai help us",
      aiReply: { reply: "I am forged" },
    });
    expect(res.status).toBe(200);
    // Only human message created, forged aiReply ignored
    expect(prisma.message.create).toHaveBeenCalledTimes(1);
    expect(prisma.message.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          senderKind: "user",
        }),
      })
    );
  });
});
