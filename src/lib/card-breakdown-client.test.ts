import { describe, expect, it, vi, beforeEach } from "vitest";
import { normalizeCardBreakdown } from "./card-breakdown-client";
import { generateCardBreakdownClient } from "./card-breakdown-client";
import * as apiKeys from "./api-keys";
import * as modelConfig from "./model-config";

vi.mock("./api-keys");
vi.mock("./model-config");

function okResponse(): Response {
  return {
    ok: true,
    json: async () => ({
      candidates: [
        {
          content: {
            parts: [
              {
                text: JSON.stringify({
                  mnemonic: "hook",
                  lookalikes: [],
                  examples: [],
                }),
              },
            ],
          },
        },
      ],
    }),
  } as Response;
}

describe("normalizeCardBreakdown", () => {
  const valid = {
    mnemonic: "心配 = your heart (心) wearing a worried hat",
    lookalikes: [{ jp: "心配 vs 心拍", note: "拍 is a beat, 配 is a share" }],
    examples: [{ jp: "心配しないで。", en: "Don't worry." }],
  };

  it("keeps a well-formed breakdown", () => {
    expect(normalizeCardBreakdown(valid)).toEqual(valid);
  });

  it("requires a mnemonic", () => {
    expect(normalizeCardBreakdown({ ...valid, mnemonic: "   " })).toBeNull();
    expect(normalizeCardBreakdown(null)).toBeNull();
    expect(normalizeCardBreakdown("nope")).toBeNull();
  });

  it("drops unusable lookalikes and examples", () => {
    const out = normalizeCardBreakdown({
      mnemonic: "hook",
      lookalikes: [{ jp: "待", note: "" }, null, { jp: "持", note: "hand radical" }],
      examples: [{ jp: "持つ", en: "" }, { jp: "待つ", en: "to wait" }],
    });
    expect(out).toEqual({
      mnemonic: "hook",
      lookalikes: [{ jp: "持", note: "hand radical" }],
      examples: [{ jp: "待つ", en: "to wait" }],
    });
  });

  it("caps the lists at two entries", () => {
    const out = normalizeCardBreakdown({
      mnemonic: "hook",
      lookalikes: [
        { jp: "a", note: "1" },
        { jp: "b", note: "2" },
        { jp: "c", note: "3" },
      ],
      examples: [
        { jp: "a", en: "1" },
        { jp: "b", en: "2" },
        { jp: "c", en: "3" },
      ],
    });
    expect(out?.lookalikes).toHaveLength(2);
    expect(out?.examples).toHaveLength(2);
  });

  it("treats non-array collections as empty", () => {
    const out = normalizeCardBreakdown({ mnemonic: "hook", lookalikes: "x", examples: 5 });
    expect(out).toEqual({ mnemonic: "hook", lookalikes: [], examples: [] });
  });
});

describe("generateCardBreakdownClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
    vi.mocked(apiKeys.hasAnyKey).mockReturnValue(true);
    vi.mocked(apiKeys.keysForRequest).mockReturnValue(["test-key"]);
    vi.mocked(modelConfig.getMnemonicModel).mockReturnValue("gemini-2.5-flash-lite");
    vi.mocked(modelConfig.getAutoFallback).mockReturnValue(false);
  });

  it("uses the mnemonic model for the request", async () => {
    vi.mocked(global.fetch).mockResolvedValue(okResponse());

    await generateCardBreakdownClient({ word: "今週", meaning: "this week" });

    expect(vi.mocked(global.fetch).mock.calls[0][0]).toContain(
      "models/gemini-2.5-flash-lite:generateContent"
    );
  });

  it("locks in the keywords of the kanji the word is built from", async () => {
    vi.mocked(global.fetch).mockResolvedValue(okResponse());

    await generateCardBreakdownClient({
      word: "今週",
      meaning: "this week",
      wordKanji: [
        {
          glyph: "今",
          keyword: "now",
          meanings: ["now"],
          heisigNumber: 12,
          inDictionary: true,
        },
        {
          glyph: "週",
          keyword: "week",
          meanings: ["week"],
          heisigNumber: null,
          inDictionary: true,
        },
      ],
    });

    const body = JSON.parse(vi.mocked(global.fetch).mock.calls[0][1]?.body as string);
    const prompt = body.contents[0].parts[0].text as string;
    expect(prompt).toContain('keyword "now"');
    expect(prompt).toContain('keyword "week"');
    expect(prompt).toContain("never invent");
  });
});
