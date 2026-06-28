import { describe, it, expect } from "vitest";
import { extractJsonString, salvageKaiResponse } from "./gemini";

describe("extractJsonString", () => {
  it("reads a complete top-level string field", () => {
    const t = '{"reply":"hello","english":"hi"}';
    expect(extractJsonString(t, "reply")).toBe("hello");
    expect(extractJsonString(t, "english")).toBe("hi");
  });

  it("resolves escape sequences", () => {
    const t = '{"reply":"line\\nbreak and \\"quote\\""}';
    expect(extractJsonString(t, "reply")).toBe('line\nbreak and "quote"');
  });

  it("returns null when the value is truncated (no closing quote)", () => {
    const t = '{"reply":"this got cut off mid sen';
    expect(extractJsonString(t, "reply")).toBeNull();
  });

  it("returns null for a missing key", () => {
    expect(extractJsonString('{"reply":"x"}', "english")).toBeNull();
  });

  it("tolerates whitespace between colon and value", () => {
    expect(extractJsonString('{"reply"  :  "spaced"}', "reply")).toBe("spaced");
  });
});

describe("salvageKaiResponse", () => {
  it("recovers reply + english when tokens[] is truncated", () => {
    // Realistic shape: full reply/english, then the big tokens array cut off.
    const truncated =
      '{"reply":"ジャガイモが好きです","english":"I like potatoes","tokens":[{"surface":"ジャガイモ","reading":"じゃが';
    const r = salvageKaiResponse(truncated);
    expect(r).not.toBeNull();
    expect(r!.reply).toBe("ジャガイモが好きです");
    expect(r!.english).toBe("I like potatoes");
    expect(r!.correction).toBeNull();
    expect(r!.tokens).toEqual([]);
    expect(r!.newWords).toEqual([]);
  });

  it("defaults english to empty string when only reply survives", () => {
    const r = salvageKaiResponse('{"reply":"hi there","tok');
    expect(r).not.toBeNull();
    expect(r!.reply).toBe("hi there");
    expect(r!.english).toBe("");
  });

  it("returns null when even the reply is unrecoverable", () => {
    expect(salvageKaiResponse('{"repl')).toBeNull();
    expect(salvageKaiResponse('{"reply":"unterminated')).toBeNull();
  });
});
