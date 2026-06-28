import { describe, it, expect } from "vitest";
import { renderTranscript, mentionsPersona, type ConvTurn } from "./group-chat";

describe("renderTranscript", () => {
  it("labels each line with the sender", () => {
    const turns: ConvTurn[] = [
      { senderName: "You", senderKind: "user", content: "hi" },
      { senderName: "Kai", senderKind: "persona", content: "やあ！" },
    ];
    expect(renderTranscript(turns)).toBe("You: hi\nKai: やあ！");
  });

  it("handles an empty transcript", () => {
    expect(renderTranscript([])).toBe("");
  });
});

describe("mentionsPersona", () => {
  it("matches an exact @name (case-insensitive)", () => {
    expect(mentionsPersona("hey @Hana what's up", "Hana")).toBe(true);
    expect(mentionsPersona("hey @hana", "Hana")).toBe(true);
  });

  it("matches a name with spaces removed", () => {
    expect(mentionsPersona("@SenseiBot help", "Sensei Bot")).toBe(true);
  });

  it("does not match when there is no @mention", () => {
    expect(mentionsPersona("Hana is nice", "Hana")).toBe(false);
  });

  it("does not match a different @handle", () => {
    expect(mentionsPersona("@Riku hi", "Hana")).toBe(false);
  });

  it("returns false for an empty persona name", () => {
    expect(mentionsPersona("@anyone", "")).toBe(false);
  });
});
