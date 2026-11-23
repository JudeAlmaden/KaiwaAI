import { describe, it, expect } from "vitest";
import { buildMnemonicPrompt } from "./prompt";
import type { KanjiContext } from "./types";

const context = (over: Partial<KanjiContext> = {}): KanjiContext => ({
  character: "六",
  keyword: "Six",
  meanings: ["six"],
  heisigNumber: 6,
  primitives: ["亠", "八"],
  components: [],
  ...over,
});

describe("buildMnemonicPrompt", () => {
  it("names the kanji, its keyword, and its RTK frame", () => {
    const prompt = buildMnemonicPrompt(context());

    expect(prompt).toContain('"六"');
    expect(prompt).toContain("keyword: Six");
    expect(prompt).toContain("#6");
  });

  it("gives the model a locked keyword for every resolved component", () => {
    const prompt = buildMnemonicPrompt(
      context({
        components: [
          {
            glyph: "亠",
            keyword: null,
            meanings: [],
            heisigNumber: null,
            inDictionary: false,
          },
          {
            glyph: "八",
            keyword: "eight",
            meanings: ["eight"],
            heisigNumber: 42,
            inDictionary: true,
          },
        ],
      })
    );

    expect(prompt).toContain("亠");
    expect(prompt).toContain('"eight"');
    expect(prompt).toContain("#42");
    expect(prompt).toContain("never invent");
  });

  it("includes the learner's own story for a component", () => {
    const prompt = buildMnemonicPrompt(
      context({
        components: [
          {
            glyph: "八",
            keyword: "eight",
            meanings: ["eight"],
            heisigNumber: 42,
            inDictionary: true,
            userMnemonic: "Two legs spread apart.",
          },
        ],
      })
    );

    expect(prompt).toContain("Two legs spread apart.");
  });

  it("falls back to bare glyphs when no component could be resolved", () => {
    const prompt = buildMnemonicPrompt(
      context({
        components: [],
        primitives: ["亠", "八"],
      })
    );

    expect(prompt).toContain("亠 + 八");
    expect(prompt).toContain("do not name a meaning");
  });

  it("tells the model to work from the shape when there are no components at all", () => {
    const prompt = buildMnemonicPrompt(context({ components: [], primitives: [] }));

    expect(prompt).toContain("No components are recorded");
  });

  it("asks for a plain story instead of saved markdown headings", () => {
    const prompt = buildMnemonicPrompt(context());

    expect(prompt).not.toContain("**Components:**");
    expect(prompt).toContain("story only");
  });

  it("no longer references dictionary radical names", () => {
    const prompt = buildMnemonicPrompt(context());

    expect(prompt.toLowerCase()).not.toContain("radicals");
  });
});
