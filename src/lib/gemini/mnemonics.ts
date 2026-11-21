import { hasAnyKey, keysForRequest } from "../api-keys";
import { getAutoFallback, getModel, modelFallbackOrder } from "../model-config";
import type { KanjiMnemonicInput } from "./types";

/** Generate memorable mnemonics for multiple kanji using AI. Returns a map
 *  of character → mnemonic string. */
export async function generateKanjiMnemonics(
  kanjiList: KanjiMnemonicInput[]
): Promise<Record<string, string>> {
  if (!hasAnyKey()) throw new Error("NO_API_KEY");
  const keys = keysForRequest();
  const models = getAutoFallback() ? modelFallbackOrder() : [getModel()];

  const kanjiDescriptions = kanjiList
    .map(
      (k) =>
        `${k.character}: meanings: ${k.meanings.join(", ")}; on-readings: ${k.readingsOn.join(", ")}; kun-readings: ${k.readingsKun.join(", ")}`
    )
    .join("\n");

  const prompt = `You are a creative Japanese teacher helping students remember kanji.

For each kanji below, create ONE short, memorable mnemonic (1-2 sentences) that helps remember:
- What the kanji means
- How its shape relates to the meaning (use vivid imagery)
- Optionally tie in a reading if it helps

Make mnemonics:
- Visual and story-based (easier to remember)
- Fun, quirky, or surprising
- Short and punchy
- Personal when possible

Kanji to create mnemonics for:
${kanjiDescriptions}

Respond with a JSON object where keys are the kanji characters and values are the mnemonics:
{ "猫": "A cat with CLAWS (爪) scratching at a rice FIELD (田). Picture it!", "..." : "..." }`;

  const requestBody = JSON.stringify({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.8,
      maxOutputTokens: 1024,
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
        if (!text) throw new Error("Empty mnemonic response.");
        try {
          return JSON.parse(text) as Record<string, string>;
        } catch {
          throw new Error("Failed to parse mnemonic response");
        }
      }
      if (res.status === 429) {
        lastError = new Error("RATE_LIMIT");
        continue;
      }
      if (res.status === 400 || res.status === 403) throw new Error("BAD_API_KEY");
      if (res.status === 404 || res.status === 500 || res.status === 503) {
        lastError = new Error(`Gemini error ${res.status}`);
        break;
      }
      lastError = new Error(`Gemini error ${res.status}`);
    }
  }
  throw lastError;
}
