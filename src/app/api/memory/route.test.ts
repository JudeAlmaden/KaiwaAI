import { beforeEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "./route";
import { prisma } from "@/lib/prisma";
import * as authHelpers from "@/lib/auth-helpers";
import { resolvePersonaId } from "@/lib/personas-server";
import { upsertMemory } from "@/lib/memory-upsert";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    chatMember: { findFirst: vi.fn() },
    memory: { findMany: vi.fn() },
    persona: { findFirst: vi.fn() },
  },
}));

vi.mock("@/lib/auth-helpers", () => ({ getCurrentUser: vi.fn() }));

vi.mock("@/lib/personas-server", () => ({ resolvePersonaId: vi.fn() }));

vi.mock("@/lib/memory-upsert", () => ({
  MEMORY_CATEGORIES: ["profile", "preference", "fact", "goal", "relationship"],
  upsertMemory: vi.fn(),
}));

const me = { id: "u1", email: "me@example.com", name: "Me" };

function get(qs: string) {
  return GET(new Request(`http://localhost/api/memory?${qs}`));
}

function post(body: Record<string, unknown>) {
  return POST(
    new Request("http://localhost/api/memory", {
      method: "POST",
      body: JSON.stringify(body),
    })
  );
}

describe("/api/memory", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(authHelpers.getCurrentUser).mockResolvedValue(me as never);
    vi.mocked(resolvePersonaId).mockImplementation(async (v) => v ?? null);
    vi.mocked(prisma.chatMember.findFirst).mockResolvedValue({ id: "m1" } as never);
    vi.mocked(prisma.memory.findMany).mockResolvedValue([] as never);
    vi.mocked(prisma.persona.findFirst).mockResolvedValue({ id: "p1" } as never);
    vi.mocked(upsertMemory).mockResolvedValue({
      memory: { id: "mem1" },
      deduped: false,
    } as never);
  });

  it("reads only the caller's notes for a chat they belong to", async () => {
    const res = await get("chatId=c1");
    expect(res.status).toBe(200);
    expect(prisma.chatMember.findFirst).toHaveBeenCalledWith({
      where: { chatId: "c1", userId: "u1", kind: "user", status: "accepted" },
      select: { id: true },
    });
    expect(prisma.memory.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: "u1", chatId: "c1", supersededById: null },
      })
    );
  });

  it("refuses chat memory for a non-member", async () => {
    vi.mocked(prisma.chatMember.findFirst).mockResolvedValue(null as never);
    const res = await get("chatId=c1");
    expect(res.status).toBe(403);
    expect(prisma.memory.findMany).not.toHaveBeenCalled();
  });

  it("keeps conversation notes out of the persona diary", async () => {
    await get("personaId=p1");
    expect(prisma.memory.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: "u1", personaId: "p1", chatId: null, supersededById: null },
      })
    );
  });

  it("writes a chat-scoped note without a persona", async () => {
    const res = await post({ content: "Likes the tea shop", chatId: "c1" });
    expect(res.status).toBe(200);
    expect(upsertMemory).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "u1",
        personaId: null,
        chatId: "c1",
        content: "Likes the tea shop",
      })
    );
    expect(prisma.persona.findFirst).not.toHaveBeenCalled();
  });

  it("refuses to write chat memory for a non-member", async () => {
    vi.mocked(prisma.chatMember.findFirst).mockResolvedValue(null as never);
    const res = await post({ content: "Hello", chatId: "c1" });
    expect(res.status).toBe(403);
    expect(upsertMemory).not.toHaveBeenCalled();
  });

  it("still writes persona memory with a null chat scope", async () => {
    const res = await post({ content: "Has a cat", personaId: "p1" });
    expect(res.status).toBe(200);
    expect(prisma.persona.findFirst).toHaveBeenCalled();
    expect(upsertMemory).toHaveBeenCalledWith(
      expect.objectContaining({ personaId: "p1", chatId: null })
    );
  });
});
