// Client-side kanji mnemonic generation using BYOK (bring your own key)
// Similar to gemini.ts, but specialized for kanji mnemonics

import { hasAnyKey, keysForRequest } from "./api-keys";
import { getModel, getAutoFallback, modelFallbackOrder } from "./model-config";

export type KanjiData = {
  character: string;
  meanings: string[];
  radicals: string[];
};

/**
 * Generate a mnemonic story for a kanji using Gemini AI (client-side with BYOK)
 * @param kanji - Kanji data
 * @returns Generated mnemonic story
 */
export async function generateKanjiMnemonicClient(
  kanji: KanjiData
): Promise<string> {
  if (!hasAnyKey()) throw new Error("NO_API_KEY");
  
  const prompt = `Create a Heisig-style mnemonic for the kanji "${kanji.character}" (keyword: ${kanji.meanings[0]}).

${kanji.radicals.length > 0 ? `Components: ${kanji.radicals.join(", ")}` : ""}

Format your response EXACTLY like this:

**Components:** [Describe what each component looks like or represents]
**Story:** [2-3 sentence vivid story combining the components to create the keyword]

Example format:
**Components:** 禾 (grain/plant) + ム (katakana mu, looks like a fence)
**Story:** A stalk of grain is hidden behind a fence-like shape. You're protecting your grain privately. This represents Private.

Keep it SHORT, VISUAL, and make the connection to "${kanji.meanings[0]}" obvious.`;

  const keys = keysForRequest();
  const models = getAutoFallback() ? modelFallbackOrder() : [getModel()];

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

  // Fallback for API failures
  const fallback = kanji.radicals.length > 0
    ? `The kanji ${kanji.character} means "${kanji.meanings[0]}". It contains the radicals: ${kanji.radicals.join(", ")}.`
    : `The kanji ${kanji.character} means "${kanji.meanings[0]}".`;
  
  console.warn("Mnemonic generation failed, using fallback:", lastError);
  return fallback;
}
