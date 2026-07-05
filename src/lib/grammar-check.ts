// Client-side Japanese grammar checking using Gemini (BYOK)

import { hasAnyKey, keysForRequest } from "./api-keys";
import { getModel, getAutoFallback, modelFallbackOrder } from "./model-config";

export type GrammarCorrection = {
  status: "correct" | "unnatural" | "incorrect" | "none";
  explanation: string;
  corrected: string;
  romaji: string;
  natural: string;
};

const KANA_KANJI = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]/;

/**
 * Check if a message contains Japanese text worth correcting
 */
export function hasJapanese(text: string): boolean {
  return KANA_KANJI.test(text);
}

/**
 * Check Japanese grammar and provide corrections using AI
 * @param userMessage - The user's message to check
 * @returns Grammar correction result
 */
export async function checkJapaneseGrammar(
  userMessage: string
): Promise<GrammarCorrection> {
  if (!hasAnyKey()) throw new Error("NO_API_KEY");
  if (!hasJapanese(userMessage)) {
    return {
      status: "none",
      explanation: "",
      corrected: "",
      romaji: "",
      natural: "",
    };
  }

  const keys = keysForRequest();
  const models = getAutoFallback() ? modelFallbackOrder() : [getModel()];

  const prompt = `You are a Japanese language tutor. Check this Japanese text for grammar, particle usage, conjugation, and naturalness:

"${userMessage}"

Analyze it and respond with JSON:
{
  "status": "correct|unnatural|incorrect|none",
  "explanation": "Brief explanation in English of any issues (empty if correct)",
  "corrected": "Corrected Japanese text (empty if correct)",
  "romaji": "Romaji of corrected version (empty if correct)",
  "natural": "More natural version if unnatural (empty if already natural or if none)"
}

Rules:
- If it's grammatically perfect and natural, set status "correct" and leave other fields empty
- If it's understandable but unnatural (awkward phrasing, uncommon word order), set status "unnatural"
- If it has clear errors (wrong particles, wrong conjugation, wrong word choice), set status "incorrect"
- Explanation should be concise and helpful (1-2 sentences)
- Be strict but fair - don't pass off incorrect Japanese as correct just because it's understandable

Output ONLY valid JSON, no other text.`;

  const requestBody = JSON.stringify({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.3, // Lower temperature for consistent corrections
      maxOutputTokens: 300,
      thinkingConfig: { thinkingBudget: 0 },
    },
  });

  let lastError: Error = new Error("Grammar check failed.");

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
        if (!text) {
          return {
            status: "none",
            explanation: "",
            corrected: "",
            romaji: "",
            natural: "",
          };
        }

        try {
          const parsed = JSON.parse(text) as GrammarCorrection;
          return {
            status: parsed.status ?? "none",
            explanation: parsed.explanation ?? "",
            corrected: parsed.corrected ?? "",
            romaji: parsed.romaji ?? "",
            natural: parsed.natural ?? "",
          };
        } catch {
          // Invalid JSON, treat as no correction needed
          return {
            status: "none",
            explanation: "",
            corrected: "",
            romaji: "",
            natural: "",
          };
        }
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

  // On failure, return no correction rather than throwing
  console.warn("Grammar check failed:", lastError);
  return {
    status: "none",
    explanation: "",
    corrected: "",
    romaji: "",
    natural: "",
  };
}
