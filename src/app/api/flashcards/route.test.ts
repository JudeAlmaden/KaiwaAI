import { describe, it, expect, beforeEach, vi } from "vitest";

const flashcardFindUnique = vi.fn();
const flashcardUpsert = vi.fn();
const messageFindUnique = vi.fn();
const getCurrentUser = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    flashcard: {
      findUnique: (...a: unknown[]) => flashcardFindUnique(...a),
      upsert: (...a: unknown[]) => flashcardUpsert(...a),
    },
    message: {
      findUnique: (...a: unknown[]) => messageFindUnique(...a),
    },
  },
}));

vi.mock("@/lib/auth-helpers", () => ({
  getCurrentUser: (...a: unknown[]) => getCurrentUser(...a),
}));

import { POST } from "./route";

const token = {
  surface: "楽しい",
  reading: "たのしい",
  romaji: "tanoshii",
  meaning: "fun",
  pos: "adjective",
  dictForm: "楽しい",
};

function req(body: unknown) {
  return new Request("http://localhost/api/flashcards", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

describe("POST /api/flashcards", () => {
  beforeEach(() => {
    flashcardFindUnique.mockReset();
    flashcardUpsert.mockReset();
    messageFindUnique.mockReset();
    getCurrentUser.mockReset();
    getCurrentUser.mockResolvedValue({ id: "u1" });
    flashcardFindUnique.mockResolvedValue(null);
    flashcardUpsert.mockImplementation(({ create }) => Promise.resolve({ id: "c1", ...create }));
  });

  it("saves the tapped token's fields verbatim (popup ↔ vocabulary consistency)", async () => {
    const res = await POST(req({ token }));
    expect(res.status).toBe(200);
    const create = flashcardUpsert.mock.calls[0][0].create;
    expect(create).toMatchObject({
      word: "楽しい", // dictForm, not surface
      reading: "たのしい",
      romaji: "tanoshii",
      meaning: "fun",
      partOfSpeech: "adjective",
      status: "learning",
    });
  });

  it("drops a sourceMessageId that isn't a real Message (group-chat ids)", async () => {
    messageFindUnique.mockResolvedValue(null); // group-message id has no Message row
    const res = await POST(req({ token, sourceMessageId: "groupmsg-123" }));
    expect(res.status).toBe(200);
    expect(flashcardUpsert.mock.calls[0][0].create.sourceMessageId).toBeNull();
  });

  it("keeps a sourceMessageId that points at a real Message", async () => {
    messageFindUnique.mockResolvedValue({ id: "msg-1" });
    const res = await POST(req({ token, sourceMessageId: "msg-1" }));
    expect(res.status).toBe(200);
    expect(flashcardUpsert.mock.calls[0][0].create.sourceMessageId).toBe("msg-1");
  });

  it("reports when the word already existed", async () => {
    flashcardFindUnique.mockResolvedValue({ id: "c1", word: "楽しい" });
    const res = await POST(req({ token }));
    const data = await res.json();
    expect(data.alreadyExisted).toBe(true);
  });

  it("rejects a body with no word", async () => {
    const res = await POST(req({}));
    expect(res.status).toBe(400);
  });

  it("requires authentication", async () => {
    getCurrentUser.mockResolvedValue(null);
    const res = await POST(req({ token }));
    expect(res.status).toBe(401);
  });
});
