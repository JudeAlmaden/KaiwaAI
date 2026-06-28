import { describe, it, expect, beforeEach, vi } from "vitest";

const getCurrentUser = vi.fn();
const messageCreate = vi.fn();
const messageFindFirst = vi.fn();
const userUpdate = vi.fn();

vi.mock("@/lib/auth-helpers", () => ({
  getCurrentUser: (...a: unknown[]) => getCurrentUser(...a),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    message: {
      create: (...a: unknown[]) => messageCreate(...a),
      findFirst: (...a: unknown[]) => messageFindFirst(...a),
    },
    user: { update: (...a: unknown[]) => userUpdate(...a) },
  },
}));

vi.mock("@/lib/day", () => ({
  dayKeyFor: () => "2026-06-28",
}));

import { POST } from "./route";

function req(body: unknown) {
  return new Request("http://localhost/api/chat/kai-message", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

describe("POST /api/chat/kai-message", () => {
  beforeEach(() => {
    getCurrentUser.mockReset();
    messageCreate.mockReset();
    messageFindFirst.mockReset();
    userUpdate.mockReset();
    getCurrentUser.mockResolvedValue({ id: "u1", timezone: "UTC" });
    messageCreate.mockResolvedValue({ id: "k1", role: "kai" });
    userUpdate.mockResolvedValue({});
  });

  it("rejects an unauthenticated request", async () => {
    getCurrentUser.mockResolvedValue(null);
    const res = await POST(req({ reply: "hi" }));
    expect(res.status).toBe(401);
    expect(messageCreate).not.toHaveBeenCalled();
  });

  it("rejects an empty reply", async () => {
    const res = await POST(req({ reply: "   " }));
    expect(res.status).toBe(400);
    expect(messageCreate).not.toHaveBeenCalled();
  });

  it("persists a proactive Kai message and stamps lastOutreachAt", async () => {
    const res = await POST(req({ reply: "おはよう！", proactive: true }));
    expect(res.status).toBe(200);

    const data = messageCreate.mock.calls[0][0].data;
    expect(data.role).toBe("kai");
    expect(data.proactive).toBe(true);
    expect(data.replyToId).toBeNull();
    expect(userUpdate).toHaveBeenCalled();
    expect(userUpdate.mock.calls[0][0].data.lastOutreachAt).toBeInstanceOf(Date);
  });

  it("keeps a valid quote target that belongs to the user", async () => {
    messageFindFirst.mockResolvedValue({ id: "m9" });
    await POST(req({ reply: "about earlier…", replyToId: "m9" }));
    expect(messageCreate.mock.calls[0][0].data.replyToId).toBe("m9");
  });

  it("drops a quote target that isn't the user's", async () => {
    messageFindFirst.mockResolvedValue(null);
    await POST(req({ reply: "hi", replyToId: "someone-elses" }));
    expect(messageCreate.mock.calls[0][0].data.replyToId).toBeNull();
  });
});
