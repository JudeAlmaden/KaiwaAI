import { describe, it, expect, beforeEach, vi } from "vitest";

const userFlashcardFindUnique = vi.fn();
const userFlashcardFindFirst = vi.fn();
const userFlashcardCreate = vi.fn();
const userFlashcardCreateMany = vi.fn();
const userFlashcardUpdate = vi.fn();
const wordFindUnique = vi.fn();
const wordCreate = vi.fn();
const wordAggregate = vi.fn();
const wordFormFindFirst = vi.fn();
const wordFormCreate = vi.fn();
const messageFindUnique = vi.fn();
const messageFindFirst = vi.fn();
const getCurrentUser = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    userFlashcard: {
      findUnique: (...a: unknown[]) => userFlashcardFindUnique(...a),
      findFirst: (...a: unknown[]) => userFlashcardFindFirst(...a),
      create: (...a: unknown[]) => userFlashcardCreate(...a),
      createMany: (...a: unknown[]) => userFlashcardCreateMany(...a),
      update: (...a: unknown[]) => userFlashcardUpdate(...a),
    },
    word: {
      findUnique: (...a: unknown[]) => wordFindUnique(...a),
      create: (...a: unknown[]) => wordCreate(...a),
      aggregate: (...a: unknown[]) => wordAggregate(...a),
    },
    wordForm: {
      findFirst: (...a: unknown[]) => wordFormFindFirst(...a),
      create: (...a: unknown[]) => wordFormCreate(...a),
    },
    message: {
      findUnique: (...a: unknown[]) => messageFindUnique(...a),
      findFirst: (...a: unknown[]) => messageFindFirst(...a),
    },
    kanji: {
      findMany: vi.fn(() => []),
    },
    userKanji: {
      findMany: vi.fn(() => []),
      createMany: vi.fn(() => ({ count: 0 })),
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

const mockWord = {
  id: 123,
  dictionary: "楽しい",
  reading: "たのしい",
  meanings: JSON.stringify(["fun"]),
  partOfSpeech: "adjective",
  forms: [],
};

function req(body: unknown) {
  return new Request("http://localhost/api/flashcards", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

describe("POST /api/flashcards", () => {
  beforeEach(() => {
    userFlashcardFindUnique.mockReset();
    userFlashcardFindFirst.mockReset();
    userFlashcardCreate.mockReset();
    userFlashcardCreateMany.mockReset();
    userFlashcardUpdate.mockReset();
    wordFindUnique.mockReset();
    wordCreate.mockReset();
    wordAggregate.mockReset();
    wordFormFindFirst.mockReset();
    wordFormCreate.mockReset();
    messageFindUnique.mockReset();
    messageFindFirst.mockReset();
    getCurrentUser.mockReset();
    getCurrentUser.mockResolvedValue({ id: "u1" });
    userFlashcardFindUnique.mockResolvedValue(null);
    userFlashcardFindFirst.mockResolvedValue(null);
    wordFindUnique.mockResolvedValue(mockWord);
    wordFormFindFirst.mockResolvedValue(null);
    userFlashcardCreate.mockImplementation(({ data }) => Promise.resolve({ id: "c1", ...data }));
  });

  it("saves the tapped token's fields verbatim (popup ↔ vocabulary consistency)", async () => {
    const res = await POST(req({ token }));
    expect(res.status).toBe(200);
    const data = userFlashcardCreate.mock.calls[0][0].data;
    expect(data).toMatchObject({
      userId: "u1",
      wordId: 123,
      wordFormId: null,
      status: "learning",
    });
  });

  it("seeds missing words using token metadata", async () => {
    wordFindUnique.mockResolvedValue(null);
    wordAggregate.mockResolvedValue({ _min: { id: null } });
    wordCreate.mockResolvedValue({
      id: -1,
      dictionary: "楽しい",
      reading: "たのしい",
      meanings: JSON.stringify(["fun"]),
      partOfSpeech: "adjective",
      forms: [],
    });

    const res = await POST(req({ token }));
    expect(res.status).toBe(200);
    expect(wordCreate).toHaveBeenCalled();
  });

  it("drops a sourceMessageId the user cannot see (group-chat ids, foreign chats)", async () => {
    messageFindFirst.mockResolvedValue(null);
    const res = await POST(req({ token, sourceMessageId: "groupmsg-123" }));
    expect(res.status).toBe(200);

    const data = userFlashcardCreate.mock.calls[0][0].data;
    expect(data.sourceContext).toBeUndefined();
    expect(data.sourceMessageId).toBeUndefined();
  });

  it("stores the chat exchange the word was first saved from", async () => {
    messageFindFirst
      .mockResolvedValueOnce({
        id: "msg-1",
        chatId: "chat-1",
        content: "心配しないで。",
        createdAt: new Date("2026-01-01T00:00:00Z"),
      })
      .mockResolvedValueOnce({ content: "テストが心配です。" });

    const res = await POST(req({ token, sourceMessageId: "msg-1" }));
    expect(res.status).toBe(200);

    const data = userFlashcardCreate.mock.calls[0][0].data;
    expect(data.sourceChatId).toBe("chat-1");
    expect(data.sourceMessageId).toBe("msg-1");
    expect(JSON.parse(data.sourceContext)).toEqual({
      ai: "心配しないで。",
      user: "テストが心配です。",
    });
  });

  it("reports when the word already existed", async () => {
    // token has no wordFormId so the route calls findFirst, not findUnique
    userFlashcardFindFirst.mockResolvedValue({ id: "c1", userId: "u1", wordId: 123 });
    const res = await POST(req({ token }));
    const data = await res.json();
    expect(data.alreadyExisted).toBe(true);
  });

  it("does not auto-add every conjugation when saving a base form from chat", async () => {
    const verbToken = {
      ...token,
      surface: "食べる",
      reading: "たべる",
      dictForm: "食べる",
      pos: "verb",
    };
    const verbWord = {
      ...mockWord,
      id: 456,
      dictionary: "食べる",
      verbType: "godan",
      forms: [
        { id: "f1", formType: "dictionary", form: "食べる", reading: "たべる" },
        { id: "f2", formType: "te", form: "食べて", reading: "たべて" },
      ],
    };
    wordFindUnique.mockResolvedValue(verbWord);

    await POST(req({ token: verbToken }));

    expect(userFlashcardCreateMany).not.toHaveBeenCalled();
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
