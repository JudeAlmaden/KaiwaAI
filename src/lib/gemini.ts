// Client-side Gemini call (BYOK). The user's key(s) live in localStorage and
// are sent directly to Google from the browser — never to our server.

import type { KaiResponse } from "./types";
import { getModel, getMaxOutputTokens, getAutoFallback, modelFallbackOrder } from "./model-config";
import { keysForRequest, hasAnyKey } from "./api-keys";

export type PromptContext = {
  level: string;
  reinforce: string[];
  newWordBudget: number;
  knownCount: number;
  memories: string[];
  recentTurns: { role: "kai" | "user"; content: string }[];
};

function systemPrompt(ctx: PromptContext): string {
  const memo =
    ctx.memories.length > 0
      ? `\nThings you remember about the user:\n${ctx.memories.map((m) => `- ${m}`).join("\n")}`
      : "";
  const reinforce =
    ctx.reinforce.length > 0
      ? `\nDeliberately reuse these words the user is learning: ${ctx.reinforce.join(", ")}.`
      : "";

  return `You are Kai, a cheerful, playful Japanese tutor and close friend. You are warm, a little bubbly, and genuinely curious about the user — you use the occasional emoji or kaomoji (like (｡•ᴗ•｡), ✨, 〜), gentle exclamations, and a light teasing-but-kind tone. You are fluent in English and Japanese.

Keep the conversation ALIVE: never give a dead-end reply. End most turns with a small follow-up question, a reaction, or an invitation to say more, so the user always has something to respond to. React to what they said before moving on. Be encouraging about their Japanese.

CRITICAL language rule — match the user's language and intent:
- If the user writes in English, reply primarily in ENGLISH. Do not reply in pure Japanese to an English message.
- If the user asks "how do I say X", "what does X mean", "why", or asks for any explanation/help → answer in ENGLISH, then give the Japanese word/phrase as an example (with reading + romaji). Explain it like a friendly tutor.
- Only reply primarily in Japanese when the user is actually writing to you in Japanese.
- Mixing is good: an English explanation plus a Japanese example, or a Japanese sentence followed by a short English note.

Example — user: "how do i say potato" → reply something like: "Ooh, good one! You'd say ジャガイモ (jagaimo) 🥔 — like ジャガイモが好きです (I like potatoes). Do you like them? 😋"

Stay around JLPT ${ctx.level} level for the Japanese you use. The user knows about ${ctx.knownCount} words. Keep replies short and friendly (1-3 sentences). When you introduce Japanese, prefer at most ${ctx.newWordBudget} new word(s) beyond what's needed to answer.${reinforce}${memo}

Respond ONLY with JSON matching this schema:
{
  "reply": "<your reply — match the user's language as described above; keep it playful and end with something that keeps the chat going>",
  "english": "<English translation/gloss of any Japanese in your reply; empty string if the reply is already fully English>",
  "tokens": [{ "surface": "<as written>", "reading": "<kana, or surface if not Japanese>", "romaji": "<romaji, or surface if not Japanese>", "meaning": "<English meaning, or surface if not Japanese>", "pos": "verb|adjective|noun|particle|adverb|pronoun|expression|other", "dictForm": "<dictionary form>" }],
  "newWords": ["<dictForm of any NEW Japanese words you introduced>"]
}
Tokenize your ENTIRE reply into "tokens" in order, including English words, emoji, and punctuation (use pos "other" for non-Japanese). Be accurate with Japanese readings.`;
}

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    reply: { type: "string" },
    english: { type: "string" },
    tokens: {
      type: "array",
      items: {
        type: "object",
        properties: {
          surface: { type: "string" },
          reading: { type: "string" },
          romaji: { type: "string" },
          meaning: { type: "string" },
          pos: { type: "string" },
          dictForm: { type: "string" },
        },
        required: ["surface", "reading", "romaji", "meaning", "pos", "dictForm"],
      },
    },
    newWords: { type: "array", items: { type: "string" } },
  },
  required: ["reply", "english", "tokens", "newWords"],
};

type GeminiContent = { role: string; parts: { text: string }[] };

/** Shared request loop: try each model, rotate keys on rate limit, parse the
 *  structured KaiResponse. Used by both reactive and proactive turns. */
async function executeKaiTurn(
  systemText: string,
  contents: GeminiContent[]
): Promise<KaiResponse> {
  if (!hasAnyKey()) throw new Error("NO_API_KEY");
  const keys = keysForRequest();

  const requestBody = JSON.stringify({
    systemInstruction: { parts: [{ text: systemText }] },
    contents,
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: RESPONSE_SCHEMA,
      temperature: 0.7,
      maxOutputTokens: getMaxOutputTokens(),
      // Disable "thinking" so the token budget goes to the answer, not hidden
      // reasoning — otherwise the JSON can get truncated (unterminated string).
      thinkingConfig: { thinkingBudget: 0 },
    },
  });

  // Models to attempt: just the chosen one, or the full fallback chain.
  const models = getAutoFallback() ? modelFallbackOrder() : [getModel()];

  let lastError: Error = new Error("Request failed.");

  // Try each model; within a model, rotate keys on rate limit. Move to the next
  // model when a model is rate-limited (429) or unavailable (404/500/503).
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
        const candidate = data?.candidates?.[0];
        const text = candidate?.content?.parts?.[0]?.text;
        if (!text) {
          if (candidate?.finishReason === "MAX_TOKENS") throw new Error("TRUNCATED");
          throw new Error("Empty response from Gemini.");
        }
        let parsed: KaiResponse;
        try {
          parsed = JSON.parse(text) as KaiResponse;
        } catch {
          throw new Error("TRUNCATED");
        }
        if (!parsed.reply || !Array.isArray(parsed.tokens)) {
          throw new Error("Malformed response from Gemini.");
        }
        parsed.english = parsed.english ?? "";
        parsed.newWords = parsed.newWords ?? [];
        parsed.usedModel = model;
        return parsed;
      }

      const body = await res.text();
      if (res.status === 429) {
        // this key is rate-limited for this model — try the next key
        lastError = new Error("RATE_LIMIT");
        continue;
      }
      if (res.status === 400 || res.status === 403) throw new Error("BAD_API_KEY");
      if (res.status === 404 || res.status === 500 || res.status === 503) {
        // model unavailable on this account/region — skip to the next model
        lastError = new Error(`Gemini error ${res.status}`);
        break;
      }
      lastError = new Error(`Gemini error ${res.status}: ${body.slice(0, 200)}`);
    }
  }

  // every model + key failed
  throw lastError;
}

/** A message being quote-replied to (shown to the model for context). */
export type QuotedMessage = { role: "kai" | "user"; content: string };

function quotedPreamble(quoted: QuotedMessage | undefined): GeminiContent[] {
  if (!quoted) return [];
  const who = quoted.role === "user" ? "the user" : "you (Kai)";
  return [
    {
      role: "user",
      parts: [
        {
          text: `[The user is replying to an earlier message from ${who}: "${quoted.content}". Address that message in your reply.]`,
        },
      ],
    },
  ];
}

export async function chatWithKai(
  userMessage: string,
  ctx: PromptContext,
  quoted?: QuotedMessage
): Promise<KaiResponse> {
  const contents: GeminiContent[] = [
    ...ctx.recentTurns.map((t) => ({
      role: t.role === "user" ? "user" : "model",
      parts: [{ text: t.content }],
    })),
    ...quotedPreamble(quoted),
    { role: "user", parts: [{ text: userMessage }] },
  ];

  return executeKaiTurn(systemPrompt(ctx), contents);
}

/** Reasons Kai might message first while the user is online. */
export type ProactiveKind = "opener" | "followup";

/**
 * Kai messages first (no user turn). `opener` = she starts a fresh thread when
 * the user is idle; `followup` = she adds another line right after her own
 * message. `quoted` optionally has her bring up an earlier message.
 */
export async function proactiveKaiMessage(
  ctx: PromptContext,
  opts: { kind: ProactiveKind; quoted?: QuotedMessage } = { kind: "opener" }
): Promise<KaiResponse> {
  const instruction =
    opts.kind === "followup"
      ? `[The user hasn't replied yet. Send ONE short, natural follow-up that adds to what you just said — a little aside, a related thought, or a gentle nudge. Don't repeat yourself or pressure them. Keep it light.]`
      : `[The user is online but quiet. Reach out FIRST with ONE short, friendly opener — react to something you remember about them, a word they're learning, or just say hi. Never naggy. End with something easy to respond to.]`;

  const quote = opts.quoted
    ? ` You're bringing up this earlier message: "${opts.quoted.content}".`
    : "";

  const contents: GeminiContent[] = [
    ...ctx.recentTurns.map((t) => ({
      role: t.role === "user" ? "user" : "model",
      parts: [{ text: t.content }],
    })),
    { role: "user", parts: [{ text: instruction + quote }] },
  ];

  return executeKaiTurn(systemPrompt(ctx), contents);
}

// ── Word lookup ──────────────────────────────────────────────────────────────

export type LookupResult = {
  word: string; // dictionary form (Japanese)
  reading: string;
  romaji: string;
  meaning: string;
  pos: string;
  example: string; // a short N5-ish example sentence in Japanese
  exampleEn: string; // its English translation
};

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

/** Look up any word (Japanese or English query) → dictionary entry. */
export async function lookupWord(query: string): Promise<LookupResult> {
  if (!hasAnyKey()) throw new Error("NO_API_KEY");
  const keys = keysForRequest();
  const models = getAutoFallback() ? modelFallbackOrder() : [getModel()];

  const prompt = `Look up this Japanese word (or the Japanese for this English term): "${query}".
Return the dictionary form, reading (kana), romaji, a concise English meaning, part of speech
(verb|adjective|noun|particle|adverb|pronoun|expression|other), and one short, simple example
sentence in Japanese with its English translation. Respond ONLY as JSON.`;

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

  let lastError: Error = new Error("Lookup failed.");
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
        if (!text) throw new Error("Empty lookup response.");
        try {
          return JSON.parse(text) as LookupResult;
        } catch {
          throw new Error("TRUNCATED");
        }
      }
      const body = await res.text();
      if (res.status === 429) {
        lastError = new Error("RATE_LIMIT");
        continue;
      }
      if (res.status === 400 || res.status === 403) throw new Error("BAD_API_KEY");
      if (res.status === 404 || res.status === 500 || res.status === 503) {
        lastError = new Error(`Gemini error ${res.status}`);
        break;
      }
      lastError = new Error(`Gemini error ${res.status}: ${body.slice(0, 200)}`);
    }
  }
  throw lastError;
}

// ── Conversation summary (for compacting) ────────────────────────────────────

/** Summarize a stretch of conversation into a few sentences Kai can remember. */
export async function summarizeConversation(
  turns: { role: "kai" | "user"; content: string }[]
): Promise<string> {
  if (!hasAnyKey()) throw new Error("NO_API_KEY");
  const keys = keysForRequest();
  const models = getAutoFallback() ? modelFallbackOrder() : [getModel()];

  const transcript = turns
    .map((t) => `${t.role === "user" ? "User" : "Kai"}: ${t.content}`)
    .join("\n");

  const prompt = `Summarize this Japanese-learning conversation in 2-4 short sentences.
Capture what the user talked about, any facts they shared about themselves, and what
they practiced. Write it as a concise recap (plain text, English).\n\n${transcript}`;

  const requestBody = JSON.stringify({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.3,
      maxOutputTokens: 256,
      thinkingConfig: { thinkingBudget: 0 },
    },
  });

  let lastError: Error = new Error("Summary failed.");
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
      if (res.status === 400 || res.status === 403) throw new Error("BAD_API_KEY");
      lastError = new Error(`Gemini error ${res.status}`);
      break;
    }
  }
  throw lastError;
}
