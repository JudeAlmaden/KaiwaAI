import { describe, it, expect, vi, beforeEach } from "vitest";
import { generateKanjiMnemonicClient, type KanjiData } from "./kanji-mnemonic-client";
import * as apiKeys from "./api-keys";
import * as modelConfig from "./model-config";

vi.mock("./api-keys");
vi.mock("./model-config");

describe("kanji-mnemonic-client", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  describe("generateKanjiMnemonicClient", () => {
    const mockKanji: KanjiData = {
      character: "一",
      meanings: ["one"],
      radicals: ["一"],
    };

    it("should throw NO_API_KEY if no keys available", async () => {
      vi.mocked(apiKeys.hasAnyKey).mockReturnValue(false);

      await expect(generateKanjiMnemonicClient(mockKanji)).rejects.toThrow("NO_API_KEY");
    });

    it("should generate mnemonic successfully", async () => {
      vi.mocked(apiKeys.hasAnyKey).mockReturnValue(true);
      vi.mocked(apiKeys.keysForRequest).mockReturnValue(["test-key"]);
      vi.mocked(modelConfig.getModel).mockReturnValue("gemini-2.0-flash-exp");
      vi.mocked(modelConfig.getAutoFallback).mockReturnValue(false);

      const mockResponse = {
        candidates: [
          {
            content: {
              parts: [
                {
                  text: "Imagine a single horizontal line. Like holding up one finger to say 'one', this kanji is just one simple stroke representing the number one.",
                },
              ],
            },
          },
        ],
      };

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      } as Response);

      const result = await generateKanjiMnemonicClient(mockKanji);

      expect(result).toContain("one");
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining("gemini-2.0-flash-exp:generateContent"),
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
        })
      );
    });

    it("should include radicals in prompt when available", async () => {
      vi.mocked(apiKeys.hasAnyKey).mockReturnValue(true);
      vi.mocked(apiKeys.keysForRequest).mockReturnValue(["test-key"]);
      vi.mocked(modelConfig.getModel).mockReturnValue("gemini-2.0-flash-exp");
      vi.mocked(modelConfig.getAutoFallback).mockReturnValue(false);

      const kanjiWithRadicals: KanjiData = {
        character: "木",
        meanings: ["tree", "wood"],
        radicals: ["木"],
      };

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => ({
          candidates: [{ content: { parts: [{ text: "Test mnemonic" }] } }],
        }),
      } as Response);

      await generateKanjiMnemonicClient(kanjiWithRadicals);

      const callArgs = vi.mocked(global.fetch).mock.calls[0];
      const body = JSON.parse(callArgs[1]?.body as string);
      expect(body.contents[0].parts[0].text).toContain("radicals: 木");
    });

    it("should retry with next key on 429 rate limit", async () => {
      vi.mocked(apiKeys.hasAnyKey).mockReturnValue(true);
      vi.mocked(apiKeys.keysForRequest).mockReturnValue(["key1", "key2"]);
      vi.mocked(modelConfig.getModel).mockReturnValue("gemini-2.0-flash-exp");
      vi.mocked(modelConfig.getAutoFallback).mockReturnValue(false);

      vi.mocked(global.fetch)
        .mockResolvedValueOnce({
          ok: false,
          status: 429,
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            candidates: [{ content: { parts: [{ text: "Success with key2" }] } }],
          }),
        } as Response);

      const result = await generateKanjiMnemonicClient(mockKanji);

      expect(result).toBe("Success with key2");
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it("should throw BAD_API_KEY on 403", async () => {
      vi.mocked(apiKeys.hasAnyKey).mockReturnValue(true);
      vi.mocked(apiKeys.keysForRequest).mockReturnValue(["bad-key"]);
      vi.mocked(modelConfig.getModel).mockReturnValue("gemini-2.0-flash-exp");
      vi.mocked(modelConfig.getAutoFallback).mockReturnValue(false);

      vi.mocked(global.fetch).mockResolvedValue({
        ok: false,
        status: 403,
      } as Response);

      await expect(generateKanjiMnemonicClient(mockKanji)).rejects.toThrow("BAD_API_KEY");
    });

    it("should use fallback text when all retries fail", async () => {
      vi.mocked(apiKeys.hasAnyKey).mockReturnValue(true);
      vi.mocked(apiKeys.keysForRequest).mockReturnValue(["key1"]);
      vi.mocked(modelConfig.getModel).mockReturnValue("gemini-2.0-flash-exp");
      vi.mocked(modelConfig.getAutoFallback).mockReturnValue(false);

      vi.mocked(global.fetch).mockResolvedValue({
        ok: false,
        status: 500,
      } as Response);

      const result = await generateKanjiMnemonicClient(mockKanji);

      expect(result).toContain("一");
      expect(result).toContain("one");
      expect(result).toContain("radicals");
    });

    it("should use fallback without radicals when radicals array is empty", async () => {
      vi.mocked(apiKeys.hasAnyKey).mockReturnValue(true);
      vi.mocked(apiKeys.keysForRequest).mockReturnValue(["key1"]);
      vi.mocked(modelConfig.getModel).mockReturnValue("gemini-2.0-flash-exp");
      vi.mocked(modelConfig.getAutoFallback).mockReturnValue(false);

      const kanjiNoRadicals: KanjiData = {
        character: "一",
        meanings: ["one"],
        radicals: [],
      };

      vi.mocked(global.fetch).mockResolvedValue({
        ok: false,
        status: 500,
      } as Response);

      const result = await generateKanjiMnemonicClient(kanjiNoRadicals);

      expect(result).toContain("一");
      expect(result).toContain("one");
      expect(result).not.toContain("radicals");
    });

    it("should try multiple models when auto-fallback is enabled", async () => {
      vi.mocked(apiKeys.hasAnyKey).mockReturnValue(true);
      vi.mocked(apiKeys.keysForRequest).mockReturnValue(["key1"]);
      vi.mocked(modelConfig.getAutoFallback).mockReturnValue(true);
      vi.mocked(modelConfig.modelFallbackOrder).mockReturnValue([
        "gemini-2.0-flash-exp",
        "gemini-1.5-flash",
      ]);

      vi.mocked(global.fetch)
        .mockResolvedValueOnce({
          ok: false,
          status: 404,
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            candidates: [{ content: { parts: [{ text: "Success with fallback model" }] } }],
          }),
        } as Response);

      const result = await generateKanjiMnemonicClient(mockKanji);

      expect(result).toBe("Success with fallback model");
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it("should handle empty response text", async () => {
      vi.mocked(apiKeys.hasAnyKey).mockReturnValue(true);
      vi.mocked(apiKeys.keysForRequest).mockReturnValue(["key1"]);
      vi.mocked(modelConfig.getModel).mockReturnValue("gemini-2.0-flash-exp");
      vi.mocked(modelConfig.getAutoFallback).mockReturnValue(false);

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => ({
          candidates: [{ content: { parts: [{ text: "" }] } }],
        }),
      } as Response);

      const result = await generateKanjiMnemonicClient(mockKanji);

      expect(result).toBe("");
    });

    it("should use temperature 0.8 for creative mnemonics", async () => {
      vi.mocked(apiKeys.hasAnyKey).mockReturnValue(true);
      vi.mocked(apiKeys.keysForRequest).mockReturnValue(["key1"]);
      vi.mocked(modelConfig.getModel).mockReturnValue("gemini-2.0-flash-exp");
      vi.mocked(modelConfig.getAutoFallback).mockReturnValue(false);

      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => ({
          candidates: [{ content: { parts: [{ text: "Test" }] } }],
        }),
      } as Response);

      await generateKanjiMnemonicClient(mockKanji);

      const callArgs = vi.mocked(global.fetch).mock.calls[0];
      const body = JSON.parse(callArgs[1]?.body as string);
      expect(body.generationConfig.temperature).toBe(0.8);
      expect(body.generationConfig.maxOutputTokens).toBe(200);
    });
  });
});
