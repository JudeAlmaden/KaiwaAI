import { describe, it, expect, vi } from "vitest";
import { serializeMessage, resolveReplyFields } from "./message-serialize";

describe("serializeMessage", () => {
  const base = {
    id: "m1",
    senderName: "Kai",
    senderKind: "persona",
    content: "こんにちは",
    english: "Hello",
    tokens: null,
    correction: null,
    userCorrection: null,
    senderUserId: null as string | null,
    createdAt: new Date("2026-09-22T12:00:00Z"),
  };

  it("marks isMe from senderUserId", () => {
    const out = serializeMessage(
      { ...base, senderUserId: "u1", senderName: "Jude", senderKind: "user" },
      "u1"
    );
    expect(out.isMe).toBe(true);
    expect(out.replyTo).toBeNull();
  });

  it("includes replyTo preview when reply fields are present", () => {
    const out = serializeMessage(
      {
        ...base,
        replyToId: "m0",
        replyToSenderName: "Jude",
        replyToContent: "test",
        replyToSenderKind: "user",
        replyToSenderUserId: "u1",
      },
      "u1"
    );
    expect(out.replyTo).toEqual({
      id: "m0",
      senderName: "Jude",
      content: "test",
      senderKind: "user",
      isMe: true,
    });
  });

  it("omits replyTo when content is missing", () => {
    const out = serializeMessage(
      { ...base, replyToId: "m0", replyToContent: null },
      "u1"
    );
    expect(out.replyTo).toBeNull();
  });
});

describe("resolveReplyFields", () => {
  it("returns null when no quote id", async () => {
    const find = vi.fn();
    expect(await resolveReplyFields(find, "c1", null)).toBeNull();
    expect(find).not.toHaveBeenCalled();
  });

  it("returns null when quoted message is in another chat", async () => {
    const find = vi.fn().mockResolvedValue({
      id: "m0",
      chatId: "other",
      senderName: "Kai",
      senderKind: "persona",
      senderUserId: null,
      content: "hi there",
    });
    expect(await resolveReplyFields(find, "c1", "m0")).toBeNull();
  });

  it("denormalizes preview for same-chat quote", async () => {
    const find = vi.fn().mockResolvedValue({
      id: "m0",
      chatId: "c1",
      senderName: "Kai",
      senderKind: "persona",
      senderUserId: null,
      content: "a".repeat(150),
    });
    const fields = await resolveReplyFields(find, "c1", "m0");
    expect(fields?.replyToId).toBe("m0");
    expect(fields?.replyToSenderName).toBe("Kai");
    expect(fields?.replyToContent.endsWith("…")).toBe(true);
    expect(fields?.replyToSenderUserId).toBeNull();
  });
});
