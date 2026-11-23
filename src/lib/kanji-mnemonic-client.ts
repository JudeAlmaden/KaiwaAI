// Client-side kanji mnemonic generation using BYOK (bring your own key)
// Similar to gemini.ts, but specialized for kanji mnemonics

import { hasAnyKey, keysForRequest } from "./api-keys";
import { getMnemonicModel, getAutoFallback, modelFallbackOrder } from "./model-config";
import { buildMnemonicPrompt } from "./kanji-mnemonic/prompt";
import type { ComponentContext } from "./kanji-mnemonic/types";

export type KanjiData = {
  character: string;
  meanings: string[];
  heisigKeyword?: string | null;
  heisigNumber?: number | null;
  /** Authored RTK buildup, e.g. ["亠", "八"]. */
  primitives?: string[];
  /** Primitive glyphs resolved to the keywords the learner already knows. */
  components?: ComponentContext[];
};

function fallbackStory(kanji: KanjiData): string {
  const meaning = kanji.meanings[0] || "this meaning";
  const named = (kanji.components ?? []).filter((component) => component.keyword);
  if (named.length > 0) {
    const buildup = named
      .map((component) => `${component.glyph} (${component.keyword})`)
      .join(" + ");
    return `The kanji ${kanji.character} means "${meaning}". It is built from ${buildup}.`;
  }
  if (kanji.primitives && kanji.primitives.length > 0) {
    return `The kanji ${kanji.character} means "${meaning}". Its components are ${kanji.primitives.join(" + ")}.`;
  }
  return `The kanji ${kanji.character} means "${meaning}".`;
}

/**
 * Generate a mnemonic story for a kanji using Gemini AI (client-side with BYOK).
 * The story builds on the keyword of every component, so later kanji reuse
 * the meanings the learner already studied instead of inventing new ones.
 */
export async function generateKanjiMnemonicClient(
  kanji: KanjiData
): Promise<string> {
  if (!hasAnyKey()) throw new Error("NO_API_KEY");

  const keyword = kanji.heisigKeyword?.trim() || kanji.meanings[0] || "Meaning";
  const components = kanji.components ?? [];
  const primitives =
    kanji.primitives && kanji.primitives.length > 0
      ? kanji.primitives
      : components.map((component) => component.glyph);

  const prompt = buildMnemonicPrompt({
    character: kanji.character,
    keyword,
    meanings: kanji.meanings,
    heisigNumber: kanji.heisigNumber ?? null,
    primitives,
    components,
  });

  const keys = keysForRequest();
  const chosenModel = getMnemonicModel();
  const models = getAutoFallback() ? modelFallbackOrder(chosenModel) : [chosenModel];

  const requestBody = JSON.stringify({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.8, // More creative for mnemonics
      maxOutputTokens: 200,
      thinkingConfig: { thinkingBudget: 0 },
    },
  });

  let lastError: Error = new Error("Mnemonic generation failed.");

  for (const model of models) {
    for (const key of keys) {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: requestBody,
        }
      );

      if (res.ok) {
        const data = await res.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        return (text ?? "").trim();
      }

      if (res.status === 429) {
        lastError = new Error("RATE_LIMIT");
        continue;
      }
      if (res.status === 400 || res.status === 403) {
        throw new Error("BAD_API_KEY");
      }
      lastError = new Error(`Gemini error ${res.status}`);
      break;
    }
  }

  console.warn("Mnemonic generation failed, using fallback:", lastError);
  return fallbackStory(kanji);
}
