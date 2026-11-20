import { describe, it, expect, vi, beforeEach } from "vitest";
import { PATCH } from "./route";
import { prisma } from "@/lib/prisma";
import * as authHelpers from "@/lib/auth-helpers";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    chat: { findUnique: vi.fn(), update: vi.fn() },
    chatMember: { findFirst: vi.fn() },
    persona: { findFirst: vi.fn() },
  },
}));

vi.mock("@/lib/auth-helpers", () => ({
  getCurrentUser: vi.fn(),
}));

const mockUser = { id: "user1", email: "test@example.com", name: "Test User" };

function kaiChat({
  kind = "persona",
  ownerId = "user1",
  personaKind = "kai",
}: {
  kind?: string;
  ownerId?: string;
  personaKind?: string;
} = {}) {
  return {
    kind,
    ownerId,
    members: [
      { persona: { id: "kai1", kind: personaKind, personality: "You are Kai." } },
    ],
  };
}

function call(modeId: unknown) {
  return PATCH(
    new Request("http://localhost/api/groups/chat1/mode", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ modeId }),
    }),
    { params: Promise.resolve({ id: "chat1" }) }
  );
}

describe("/api/groups/[id]/mode PATCH", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(authHelpers.getCurrentUser).mockResolvedValue(mockUser as never);
    vi.mocked(prisma.chatMember.findFirst).mockResolvedValue({ id: "m1" } as never);
  });

  it("rejects signed-out users", async () => {
    vi.mocked(authHelpers.getCurrentUser).mockResolvedValue(null as never);
    const res = await call("hana1");
    expect(res.status).toBe(401);
  });

  it("rejects non-members", async () => {
    vi.mocked(prisma.chatMember.findFirst).mockResolvedValue(null as never);
    const res = await call("hana1");
    expect(res.status).toBe(403);
  });

  it("rejects members who do not own a group", async () => {
    vi.mocked(prisma.chat.findUnique).mockResolvedValue(
      kaiChat({ kind: "group", ownerId: "user2" }) as never
    );
    const res = await call("hana1");
    expect(res.status).toBe(403);
    expect((await res.json()).error).toMatch(/owner/);
    expect(prisma.chat.update).not.toHaveBeenCalled();
  });

  it("rejects chats whose AI is a custom persona", async () => {
    vi.mocked(prisma.chat.findUnique).mockResolvedValue(
      kaiChat({ personaKind: "custom" }) as never
    );
    const res = await call("hana1");
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/Only Kai/);
  });

  it("rejects a mode that is not one of Kai's personalities", async () => {
    vi.mocked(prisma.chat.findUnique).mockResolvedValue(kaiChat() as never);
    vi.mocked(prisma.persona.findFirst).mockResolvedValue(null as never);
    const res = await call("someone-else");
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/Unknown personality/);
    expect(prisma.chat.update).not.toHaveBeenCalled();
  });

  it("sets an approved personality in a 1:1 chat", async () => {
    vi.mocked(prisma.chat.findUnique).mockResolvedValue(kaiChat() as never);
    vi.mocked(prisma.persona.findFirst).mockResolvedValue({
      id: "hana1",
      name: "Hana",
      label: "Calm",
      avatar: "🌸",
      personality: "You are Hana.",
    } as never);
    vi.mocked(prisma.chat.update).mockResolvedValue({
      id: "chat1",
      activeModeId: "hana1",
    } as never);

    const res = await call("hana1");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.activeMode).toEqual({ id: "hana1", label: "Calm", avatar: "🌸" });
    expect(body.personality).toContain("You are Kai.");
    expect(body.personality).toContain("You are Hana.");
    expect(prisma.persona.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "hana1", kind: "kai_mode", modeOfId: "kai1" },
      })
    );
    expect(prisma.chat.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { activeModeId: "hana1" } })
    );
  });

  it("lets a group owner set the attitude everyone hears", async () => {
    vi.mocked(prisma.chat.findUnique).mockResolvedValue(
      kaiChat({ kind: "group" }) as never
    );
    vi.mocked(prisma.persona.findFirst).mockResolvedValue({
      id: "riku1",
      name: "Riku",
      label: "Playful",
      avatar: "⚡",
      personality: "You are Riku.",
    } as never);
    vi.mocked(prisma.chat.update).mockResolvedValue({
      id: "chat1",
      activeModeId: "riku1",
    } as never);

    const res = await call("riku1");
    expect(res.status).toBe(200);
    expect((await res.json()).personality).toContain("You are Riku.");
  });

  it("clears the personality back to Kai's base voice", async () => {
    vi.mocked(prisma.chat.findUnique).mockResolvedValue(kaiChat() as never);
    vi.mocked(prisma.chat.update).mockResolvedValue({
      id: "chat1",
      activeModeId: null,
    } as never);

    const res = await call(null);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.activeMode).toBeNull();
    expect(body.personality).toBe("You are Kai.");
    expect(prisma.persona.findFirst).not.toHaveBeenCalled();
    expect(prisma.chat.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { activeModeId: null } })
    );
  });
});
