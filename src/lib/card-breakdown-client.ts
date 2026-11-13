// Client-side "Kai's Breakdown" for a card the learner keeps failing.
// Same BYOK model as kanji-mnemonic-client: the user's own Gemini key, called
// from the browser, structured JSON back.

import { hasAnyKey, keysForRequest } from "./api-keys";
import { getModel, getAutoFallback, modelFallbackOrder } from "./model-config";
import type { CardSourceContext } from "./review/card-source";

export type CardBreakdown = {
  /** One fresh, concrete memory hook. */
  mnemonic: string;
  /** Confusable words/kanji and how to tell them apart. */
  lookalikes: { jp: string; note: string }[];
  /** Two very short example sentences with translations. */
  examples: { jp: string; en: string }[];
};

export type CardBreakdownInput = {
  word: string;
  reading?: string | null;
  meaning?: string | null;
  partOfSpeech?: string | null;
  sourceContext?: CardSourceContext | null;
};

const BREAKDOWN_SCHEMA = {
  type: "object",
  properties: {
    mnemonic: { type: "string" },
    lookalikes: {
      type: "array",
      items: {
        type: "object",
        properties: {
          jp: { type: "string" },
          note: { type: "string" },
        },
        required: ["jp", "note"],
      },
    },
    examples: {
      type: "array",
      items: {
        type: "object",
        properties: {
          jp: { type: "string" },
          en: { type: "string" },
        },
        required: ["jp", "en"],
      },
    },
  },
  required: ["mnemonic", "lookalikes", "examples"],
};

function str(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/** Coerce whatever the model returned into a usable breakdown (or null). */
export function normalizeCardBreakdown(raw: unknown): CardBreakdown | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const mnemonic = str(r.mnemonic);
  if (!mnemonic) return null;

  const lookalikes = Array.isArray(r.lookalikes)
    ? r.lookalikes
        .map((item) => {
          if (!item || typeof item !== "object") return null;
          const entry = item as Record<string, unknown>;
          const jp = str(entry.jp);
          const note = str(entry.note);
          return jp && note ? { jp, note } : null;
        })
        .filter((item): item is { jp: string; note: string } => item !== null)
        .slice(0, 2)
    : [];

  const examples = Array.isArray(r.examples)
    ? r.examples
        .map((item) => {
          if (!item || typeof item !== "object") return null;
          const entry = item as Record<string, unknown>;
          const jp = str(entry.jp);
          const en = str(entry.en);
          return jp && en ? { jp, en } : null;
        })
        .filter((item): item is { jp: string; en: string } => item !== null)
        .slice(0, 2)
    : [];

  return { mnemonic, lookalikes, examples };
}

function buildPrompt(input: CardBreakdownInput): string {
  const reading = input.reading ? ` (${input.reading})` : "";
  const meaning = input.meaning ? ` — ${input.meaning}` : "";
  const pos = input.partOfSpeech ? `\nPart of speech: ${input.partOfSpeech}` : "";
  const context = input.sourceContext
    ? `\nThey first met it in this chat exchange:\nKai: ${input.sourceContext.ai}${
        input.sourceContext.user ? `\nLearner: ${input.sourceContext.user}` : ""
      }`
    : "";

  return `A Japanese learner keeps forgetting this card. Give them a fresh way in.

Card: ${input.word}${reading}${meaning}${pos}${context}

Return:
- mnemonic: ONE vivid, concrete memory hook of at most 35 words. Use the sound, the kanji components, or a tiny scene — never a generic "imagine a..." template, and never just restate the meaning.
- lookalikes: 1–2 Japanese words or kanji the learner is likely to confuse with this one. "jp" is the confusable form; "note" explains exactly how to tell them apart (the one differing radical, reading, or usage).
- examples: 2 very short, natural sentences that use this word, at JLPT N5–N4 level, each with a natural English translation.

Japanese must be correct and natural. Respond only with JSON.`;
}

/** Generate Kai's breakdown for a card using the learner's own key (BYOK). */
export async function generateCardBreakdownClient(
  input: CardBreakdownInput
): Promise<CardBreakdown> {
  if (!hasAnyKey()) throw new Error("NO_API_KEY");

  const keys = keysForRequest();
  const models = getAutoFallback() ? modelFallbackOrder() : [getModel()];
  const requestBody = JSON.stringify({
    contents: [{ role: "user", parts: [{ text: buildPrompt(input) }] }],
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: BREAKDOWN_SCHEMA,
      temperature: 0.9,
      maxOutputTokens: 500,
      thinkingConfig: { thinkingBudget: 0 },
    },
  });

  let lastError: Error = new Error("Breakdown generation failed.");

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
        if (!text) throw new Error("Empty response from Gemini.");
        const parsed = normalizeCardBreakdown(JSON.parse(text));
        if (!parsed) throw new Error("Malformed breakdown from Gemini.");
        return parsed;
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

  throw lastError;
}
