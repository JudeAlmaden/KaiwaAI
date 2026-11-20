import { beforeEach, describe, expect, it, vi } from "vitest";
import { DELETE, POST } from "./route";
import { prisma } from "@/lib/prisma";
import * as authHelpers from "@/lib/auth-helpers";
import * as personasServer from "@/lib/personas-server";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    chat: { findUnique: vi.fn(), update: vi.fn() },
    chatMember: { create: vi.fn(), delete: vi.fn() },
    persona: { findFirst: vi.fn() },
  },
}));

vi.mock("@/lib/auth-helpers", () => ({ getCurrentUser: vi.fn() }));
vi.mock("@/lib/personas-server", () => ({ resolveKaiId: vi.fn() }));

const me = { id: "user1", email: "me@example.com", name: "Me" };

function chat(overrides: Partial<{ ownerId: string; kind: string; members: unknown[] }> = {}) {
  return {
    ownerId: "user1",
    kind: "group",
    members: [],
    ...overrides,
  };
}

function post(modeId?: unknown) {
  return POST(
    new Request("http://localhost/api/groups/g1/kai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(modeId === undefined ? {} : { modeId }),
    }),
    { params: Promise.resolve({ id: "g1" }) }
  );
}

function del() {
  return DELETE(new Request("http://localhost/api/groups/g1/kai", { method: "DELETE" }), {
    params: Promise.resolve({ id: "g1" }),
  });
}

describe("/api/groups/[id]/kai", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(authHelpers.getCurrentUser).mockResolvedValue(me as never);
    vi.mocked(prisma.chat.findUnique).mockResolvedValue(chat() as never);
    vi.mocked(personasServer.resolveKaiId).mockResolvedValue("kai1");
  });

  it("rejects signed-out users", async () => {
    vi.mocked(authHelpers.getCurrentUser).mockResolvedValue(null as never);
    expect((await post()).status).toBe(401);
  });

  it("rejects a non-owner", async () => {
    vi.mocked(prisma.chat.findUnique).mockResolvedValue(
      chat({ ownerId: "someone-else" }) as never
    );
    expect((await post()).status).toBe(403);
    expect(prisma.chatMember.create).not.toHaveBeenCalled();
  });

  it("rejects non-group chats", async () => {
    vi.mocked(prisma.chat.findUnique).mockResolvedValue(chat({ kind: "persona" }) as never);
    expect((await post()).status).toBe(400);
  });

  it("rejects a group that already has Kai", async () => {
    vi.mocked(prisma.chat.findUnique).mockResolvedValue(
      chat({ members: [{ id: "m1", personaId: "kai1" }] }) as never
    );
    expect((await post()).status).toBe(409);
    expect(prisma.chatMember.create).not.toHaveBeenCalled();
  });

  it("adds Kai", async () => {
    const res = await post();
    expect(res.status).toBe(200);
    expect(prisma.chatMember.create).toHaveBeenCalledWith({
      data: { chatId: "g1", kind: "persona", personaId: "kai1", status: "accepted" },
    });
    expect(prisma.chat.update).not.toHaveBeenCalled();
  });

  it("adds Kai with an attitude", async () => {
    vi.mocked(prisma.persona.findFirst).mockResolvedValue({ id: "hana1" } as never);
    const res = await post("hana1");
    expect(res.status).toBe(200);
    expect(prisma.persona.findFirst).toHaveBeenCalledWith({
      where: { id: "hana1", kind: "kai_mode", modeOfId: "kai1" },
      select: { id: true },
    });
    expect(prisma.chat.update).toHaveBeenCalledWith({
      where: { id: "g1" },
      data: { activeModeId: "hana1" },
    });
  });

  it("rejects an unknown attitude", async () => {
    vi.mocked(prisma.persona.findFirst).mockResolvedValue(null as never);
    expect((await post("nope")).status).toBe(400);
    expect(prisma.chatMember.create).not.toHaveBeenCalled();
  });

  it("removes Kai without touching messages", async () => {
    vi.mocked(prisma.chat.findUnique).mockResolvedValue(
      chat({ members: [{ id: "m1", personaId: "kai1" }] }) as never
    );
    const res = await del();
    expect(res.status).toBe(200);
    expect(prisma.chatMember.delete).toHaveBeenCalledWith({ where: { id: "m1" } });
    expect(prisma.chat.update).toHaveBeenCalledWith({
      where: { id: "g1" },
      data: { activeModeId: null },
    });
  });

  it("rejects removing Kai when the group has no AI", async () => {
    expect((await del()).status).toBe(400);
  });
});
