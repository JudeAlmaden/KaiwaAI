// Shared tokenization contract + validation for client (gemini.ts) and server
// (group-chat.ts). Japanese-only model tokens; English/punct from the reply.

import type { CachedToken, PartOfSpeech } from "./types";

const JP_CHAR = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]/;
const JP_RUN = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFFー々]+/g;

export const TOKEN_ITEM_SCHEMA = {
  type: "object" as const,
  properties: {
    surface: { type: "string" as const },
    reading: { type: "string" as const },
    romaji: { type: "string" as const },
    meaning: { type: "string" as const },
    pos: { type: "string" as const },
    dictForm: { type: "string" as const },
    words: {
      type: "array" as const,
      items: {
        type: "object" as const,
        properties: {
          surface: { type: "string" as const },
          reading: { type: "string" as const },
          romaji: { type: "string" as const },
          meaning: { type: "string" as const },
          pos: { type: "string" as const },
          dictForm: { type: "string" as const },
        },
        required: ["surface", "reading", "romaji", "meaning", "pos", "dictForm"],
      },
    },
  },
  required: ["surface", "reading", "romaji", "meaning", "pos", "dictForm"],
};

/** Shared Gemini response schema (1:1 + group). */
export const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    reply: { type: "string" },
    correction: {
      type: "object",
      properties: {
        status: { type: "string" },
        explanation: { type: "string" },
        corrected: { type: "string" },
        romaji: { type: "string" },
        natural: { type: "string" },
      },
      required: ["status", "explanation", "corrected", "romaji", "natural"],
    },
    english: { type: "string" },
    tokens: {
      type: "array",
      items: TOKEN_ITEM_SCHEMA,
    },
    newWords: { type: "array", items: { type: "string" } },
    memorySuggestions: {
      type: "array",
      items: {
        type: "object",
        properties: {
          content: { type: "string" },
          category: { type: "string" },
          importance: { type: "number" },
        },
        required: ["content"],
      },
    },
    mood: { type: "string" },
  },
  required: ["reply", "correction", "english", "tokens", "newWords"],
};

/** Group-chat schema: same tokens contract, no newWords/memory required. */
export const GROUP_REPLY_SCHEMA = {
  type: "object",
  properties: {
    reply: { type: "string" },
    correction: RESPONSE_SCHEMA.properties.correction,
    english: { type: "string" },
    tokens: {
      type: "array",
      items: TOKEN_ITEM_SCHEMA,
    },
    mood: { type: "string" },
  },
  required: ["reply", "correction", "english", "tokens"],
};

/** Prompt fragment describing Japanese-only tokenization. */
export function tokenizationPromptFragment(): string {
  return `Tokenize ONLY Japanese spans in "tokens" (in order of appearance). Do NOT tokenize English words, emoji, or punctuation — those are handled locally from "reply".

JAPANESE TOKENIZATION (READ CAREFULLY):
- Each COMPLETE inflected/conjugated Japanese word is ONE SINGLE token
- DO NOT split verb stems from their endings - the conjugated form is the complete word
- DO NOT split adjective stems from their endings - the inflected form is the complete word
- Examples of CORRECT single tokens:
  * "食べたい" = ONE token (not "食べ" + "たい")
  * "食べます" = ONE token (not "食べ" + "ます")
  * "行きます" = ONE token (not "行き" + "ます")
  * "見ている" = ONE token (not "見て" + "いる" or "見" + "ている")
  * "寝たい" = ONE token (not "寝" + "たい")
  * "食べました" = ONE token (not "食べ" + "ました")
  * "高かった" = ONE token (not "高" + "かった")
  * "静かです" = ONE token (not "静か" + "です")
- Noun + particle = SEPARATE tokens (e.g. "猫" then "は")
- Standalone particles are separate tokens (は, が, を, に, etc.)

PHRASES (TWO-LAYER TOKENS):
- Fixed multi-word expressions (e.g. こんにちは, ありがとうございます, という, お願いします, どういたしまして) should be tokenized as ONE phrase token with pos="phrase"
- For each phrase token, populate "words" with the component words: each entry has the SAME structure (surface, reading, romaji, meaning, pos, dictForm, no nested words)
- If the phrase cannot be meaningfully broken down, "words" may be an empty array

Each token: { "surface", "reading", "romaji", "meaning", "pos", "dictForm", "words"? }. Be accurate with readings, dictionary forms, and romaji.`;
}

export type ValidatedTokens = {
  tokens: CachedToken[];
  /** true when we fell back entirely to Intl.Segmenter / JP runs */
  usedFallback: boolean;
};

function normalizeWs(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

function asToken(raw: unknown): CachedToken | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const surface = typeof r.surface === "string" ? r.surface : "";
  if (!surface) return null;
  const pos = (typeof r.pos === "string" ? r.pos : "other") as PartOfSpeech;
  const words = Array.isArray(r.words)
    ? (r.words.map(asToken).filter(Boolean) as CachedToken[])
    : undefined;
  return {
    surface,
    reading: typeof r.reading === "string" ? r.reading : surface,
    romaji: typeof r.romaji === "string" ? r.romaji : surface,
    meaning: typeof r.meaning === "string" ? r.meaning : surface,
    pos,
    dictForm: typeof r.dictForm === "string" ? r.dictForm : surface,
    ...(words && words.length ? { words } : {}),
  };
}

/** Plain (non-tappable) token for English/punct spans. */
function plainToken(surface: string): CachedToken {
  return {
    surface,
    reading: surface,
    romaji: surface,
    meaning: surface,
    pos: "other",
    dictForm: surface,
  };
}

/** Segment Japanese with Intl.Segmenter when available. */
export function segmentJapanese(content: string): CachedToken[] {
  const Seg = (
    Intl as unknown as {
      Segmenter?: new (
        loc?: string,
        opts?: { granularity?: string }
      ) => { segment: (s: string) => Iterable<{ segment: string }> };
    }
  ).Segmenter;

  if (Seg) {
    try {
      const seg = new Seg("ja", { granularity: "word" });
      const out: CachedToken[] = [];
      for (const { segment } of seg.segment(content)) {
        if (!segment) continue;
        if (JP_CHAR.test(segment)) {
          out.push({
            surface: segment,
            reading: segment,
            romaji: segment,
            meaning: segment,
            pos: "other",
            dictForm: segment,
          });
        } else {
          const prev = out[out.length - 1];
          if (prev && !JP_CHAR.test(prev.surface)) prev.surface += segment;
          else out.push(plainToken(segment));
        }
      }
      return out;
    } catch {
      // fall through
    }
  }

  const out: CachedToken[] = [];
  let last = 0;
  for (const m of content.matchAll(JP_RUN)) {
    const start = m.index ?? 0;
    if (start > last) out.push(plainToken(content.slice(last, start)));
    out.push({
      surface: m[0],
      reading: m[0],
      romaji: m[0],
      meaning: m[0],
      pos: "other",
      dictForm: m[0],
    });
    last = start + m[0].length;
  }
  if (last < content.length) out.push(plainToken(content.slice(last)));
  return out;
}

/**
 * Align model Japanese tokens to `reply`. Uncovered spans become plain text
 * tokens (from the reply string). Gross misalignment → full Segmenter fallback.
 */
export function validateTokens(
  reply: string,
  rawTokens: unknown
): ValidatedTokens {
  const list = Array.isArray(rawTokens)
    ? (rawTokens.map(asToken).filter(Boolean) as CachedToken[])
    : [];

  // Keep only Japanese-bearing tokens from the model.
  const jpTokens = list.filter((t) => JP_CHAR.test(t.surface));

  if (!reply) {
    return { tokens: [], usedFallback: false };
  }

  if (jpTokens.length === 0) {
    // No JP tokens from model — if reply has Japanese, segment locally.
    if (JP_CHAR.test(reply)) {
      return { tokens: segmentJapanese(reply), usedFallback: true };
    }
    return { tokens: [plainToken(reply)], usedFallback: false };
  }

  // Greedy left-to-right alignment of each JP token surface inside reply.
  const aligned: CachedToken[] = [];
  let cursor = 0;
  let matched = 0;

  for (const tok of jpTokens) {
    const idx = reply.indexOf(tok.surface, cursor);
    if (idx === -1) continue;
    if (idx > cursor) {
      aligned.push(plainToken(reply.slice(cursor, idx)));
    }
    aligned.push(tok);
    cursor = idx + tok.surface.length;
    matched++;
  }

  if (cursor < reply.length) {
    aligned.push(plainToken(reply.slice(cursor)));
  }

  // Coverage: joined surfaces of matched JP tokens vs JP chars in reply.
  const replyJp = (reply.match(JP_RUN) || []).join("");
  const coveredJp = jpTokens
    .slice(0, matched)
    .map((t) => t.surface)
    .join("");
  const coverage =
    replyJp.length === 0
      ? 1
      : coveredJp.length / Math.max(1, normalizeWs(replyJp).length);

  if (matched === 0 || coverage < 0.4) {
    return { tokens: segmentJapanese(reply), usedFallback: true };
  }

  return { tokens: aligned, usedFallback: false };
}

/** Whether a rendered token should be tappable (has Japanese). */
export function isJapaneseSurface(surface: string): boolean {
  return JP_CHAR.test(surface);
}
