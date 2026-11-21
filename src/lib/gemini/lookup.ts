import { hasAnyKey, keysForRequest } from "../api-keys";
import { getAutoFallback, getModel, modelFallbackOrder } from "../model-config";
import type { LookupResult } from "./types";

const LOOKUP_SCHEMA = {
  type: "object",
  properties: {
    word: { type: "string" },
    reading: { type: "string" },
    romaji: { type: "string" },
    meaning: { type: "string" },
    pos: { type: "string" },
    example: { type: "string" },
    exampleEn: { type: "string" },
  },
  required: ["word", "reading", "romaji", "meaning", "pos", "example", "exampleEn"],
};

export async function lookupWord(
  query: string,
  context?: string,
  mode: "word" | "phrase" = "word",
): Promise<LookupResult> {
  if (!hasAnyKey()) throw new Error("NO_API_KEY");
  const keys = keysForRequest();
  const models = getAutoFallback() ? modelFallbackOrder() : [getModel()];

  const contextHint = context 
    ? `\n\nContext: "${context}"` 
    : '';

  const prompt =
    mode === "phrase"
      ? `You are translating a SELECTED JAPANESE SPAN from a chat message.

Selected text: "${query}"${contextHint}

CRITICAL instructions — do NOT just look up the first word:
1. Treat the entire selected text as ONE expression / sentence / phrase.
2. "word" field     — return the ORIGINAL full selected Japanese text exactly as given
                      (do NOT reduce it to one headword or dictionary form).
3. "reading" field  — full hiragana reading of the ENTIRE selected text.
4. "romaji" field   — romaji for the entire selected text.
5. "meaning" field  — NATURAL English translation of the WHOLE selected span
                      (capture the full meaning of the whole thing, not just one word).
6. "pos" field      — "phrase" or "sentence" or "expression".
7. "example" + "exampleEn" — a short related example sentence pair (or reuse
                      the selected text itself with its meaning if you prefer).

Return ONLY valid JSON matching the schema.`
      : `Look up or translate this Japanese word, phrase, or sentence (or English term): "${query}".${contextHint}
Return the main dictionary form/word, reading in kana, romaji, concise English meaning/translation, part of speech
(verb|adjective|noun|particle|adverb|pronoun|expression|phrase|other), and one short, simple example
sentence in Japanese with its English translation. Respond ONLY as valid JSON.`;

  const requestBody = JSON.stringify({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: LOOKUP_SCHEMA,
      temperature: 0.3,
      maxOutputTokens: 512,
      thinkingConfig: { thinkingBudget: 0 },
    },
  });

  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
  const MAX_RETRIES_429 = 3;

  let lastError: Error = new Error("Lookup failed.");
  for (const model of models) {
    for (const key of keys) {
      let retries = 0;
      while (retries <= MAX_RETRIES_429) {
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
          if (!text) throw new Error("Empty lookup response.");
          try {
            return JSON.parse(text) as LookupResult;
          } catch {
            throw new Error("TRUNCATED");
          }
        }
        const body = await res.text();
        if (res.status === 429) {
          if (retries < MAX_RETRIES_429) {
            const retryAfterHeader = res.headers.get("Retry-After");
            const retryAfter = retryAfterHeader ? parseInt(retryAfterHeader, 10) : NaN;
            const delaySec = Number.isFinite(retryAfter) && retryAfter > 0
              ? retryAfter
              : Math.pow(2, retries) + Math.random();
            await sleep(delaySec * 1000);
            retries += 1;
            continue;
          }
          lastError = new Error("RATE_LIMIT");
          break;
        }
        if (res.status === 400 || res.status === 403) throw new Error("BAD_API_KEY");
        if (res.status === 404 || res.status === 500 || res.status === 503) {
          lastError = new Error(`Gemini error ${res.status}`);
          break;
        }
        lastError = new Error(`Gemini error ${res.status}: ${body.slice(0, 200)}`);
        break;
      }
    }
  }
  throw lastError;
}

export async function mergeMeanings(
  word: string,
  existingMeaning: string,
  newMeaning: string
): Promise<string> {
  if (!hasAnyKey()) throw new Error("NO_API_KEY");
  const keys = keysForRequest();
  const models = getAutoFallback() ? modelFallbackOrder() : [getModel()];

  const prompt = `You are a Japanese dictionary editor. The word "${word}" has these two meanings:

Existing: ${existingMeaning}
New: ${newMeaning}

Task: Merge these meanings into ONE concise definition that captures both nuances without redundancy.
- If they're essentially the same, keep one version
- If they're different contexts/uses, combine them clearly (use semicolons or "also:")
- Keep it brief and natural
- Output ONLY the merged meaning, nothing else

Example:
Existing: "to take"
New: "to steal"
Output: "to take; to steal"

Example:
Existing: "fun, enjoyable"
New: "fun"
Output: "fun, enjoyable"`;

  const requestBody = JSON.stringify({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.3,
      maxOutputTokens: 128,
      thinkingConfig: { thinkingBudget: 0 },
    },
  });

  let lastError: Error = new Error("Merge failed.");
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
        return (text ?? existingMeaning).trim();
      }
      if (res.status === 429) {
        lastError = new Error("RATE_LIMIT");
        continue;
      }
      if (res.status === 400 || res.status === 403) throw new Error("BAD_API_KEY");
      lastError = new Error(`Gemini error ${res.status}`);
      break;
    }
  }
  throw lastError;
}
