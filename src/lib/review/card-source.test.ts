import { describe, expect, it } from "vitest";
import {
  buildCardSourceContext,
  clipSnippet,
  parseCardSource,
  serializeCardSource,
} from "./card-source";

describe("card source context", () => {
  it("collapses whitespace and trims", () => {
    expect(clipSnippet("  今日は\n\nいい 天気 ですね  ")).toBe("今日は いい 天気 ですね");
  });

  it("clips long snippets with an ellipsis", () => {
    const out = clipSnippet("あ".repeat(400), 50);
    expect(out).toHaveLength(50);
    expect(out.endsWith("…")).toBe(true);
  });

  it("builds context from the AI message plus the learner's preceding message", () => {
    expect(buildCardSourceContext("心配しないで。", "テストが心配です。")).toEqual({
      ai: "心配しないで。",
      user: "テストが心配です。",
    });
  });

  it("returns null when there is no AI text to remember", () => {
    expect(buildCardSourceContext("   ", "こんにちは")).toBeNull();
    expect(buildCardSourceContext(null)).toBeNull();
  });

  it("treats a blank learner message as absent", () => {
    expect(buildCardSourceContext("心配しないで。", "   ")).toEqual({
      ai: "心配しないで。",
      user: null,
    });
  });

  it("round-trips through serialize/parse", () => {
    const ctx = { ai: "心配しないで。", user: null };
    expect(parseCardSource(serializeCardSource(ctx))).toEqual(ctx);
  });

  it("defensively ignores malformed stored values", () => {
    expect(parseCardSource(null)).toBeNull();
    expect(parseCardSource("not json")).toBeNull();
    expect(parseCardSource("[]")).toBeNull();
    expect(parseCardSource(JSON.stringify({ user: "だけ" }))).toBeNull();
    expect(parseCardSource(JSON.stringify({ ai: 42 }))).toBeNull();
  });
});
